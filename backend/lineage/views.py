from django.db.models import Q
from collections import deque
from vaults.serializers import MemorySerializer
from vaults.models import Memory
from rest_framework import views, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.shortcuts import get_object_or_404

from .models import Person, KinshipEdge, PersonFaceEmbedding
from core.models import VaultMember, get_accessible_vault_ids, ActionLog
from .serializers import PersonSerializer, KinshipEdgeSerializer
from .avatar_utils import save_person_avatar_from_memory_face
from tasks.story_weaver import generate_chronicle_task


def _would_create_lineage_cycle(vault_ids, parent_id, child_id):
    if str(parent_id) == str(child_id):
        return True

    edges = KinshipEdge.objects.filter(vault_id__in=vault_ids, relationship_type="PARENT_OF").values_list(
        "from_person_id", "to_person_id"
    )
    adjacency = {}
    for from_id, to_id in edges:
        adjacency.setdefault(str(from_id), set()).add(str(to_id))

    target = str(parent_id)
    start = str(child_id)
    queue = deque([start])
    visited = {start}

    while queue:
        current = queue.popleft()
        if current == target:
            return True
        for next_id in adjacency.get(current, set()):
            if next_id in visited:
                continue
            visited.add(next_id)
            queue.append(next_id)

    return False

class LineageGraphView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, vault_id):
        get_object_or_404(VaultMember, vault_id=vault_id, user=request.user)
        vault_ids = get_accessible_vault_ids(vault_id)

        nodes = Person.objects.filter(vault_id__in=vault_ids).select_related("vault")
        edges = KinshipEdge.objects.filter(vault_id__in=vault_ids)

        return Response({
            "nodes": PersonSerializer(nodes, many=True, context={'request': request}).data,
            "edges": [{"from": str(e.from_person.id), "to": str(e.to_person.id), "type": e.relationship_type} for e in edges]
        })

class GraftBranchView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, vault_id):
        get_object_or_404(VaultMember, vault_id=vault_id, user=request.user, role__in=['ADMIN', 'CONTRIBUTOR'])

        target_id = request.data.get("targetId")  # Pivot Node ID
        existing_person_id = request.data.get("existingPersonId")
        name = request.data.get('name')
        role = request.data.get("role", "")  # Person's curator identity role
        relationship_type = request.data.get(
            "relationshipType", "CHILD_OF"
        )  # Edge type: 'PARENT_OF', 'CHILD_OF', 'SPOUSE_OF'
        birth_year = request.data.get('birthYear', '')
        death_year = request.data.get('deathYear', '')
        vault_ids = get_accessible_vault_ids(vault_id)

        linked_person = None

        if existing_person_id:
            linked_person = get_object_or_404(Person, id=existing_person_id, vault_id__in=vault_ids)
        else:
            linked_person = Person.objects.create(
                vault_id=vault_id,
                name=name,
                role=role,
                birth_year=birth_year,
                death_year=death_year
            )

        if target_id:
            target = get_object_or_404(Person, id=target_id, vault_id__in=vault_ids)

            if target.id == linked_person.id:
                return Response(
                    {"detail": "Cannot link a person to themselves."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if relationship_type == "CHILD_OF":
                parent_candidate = target
                child_candidate = linked_person
            elif relationship_type == "PARENT_OF":
                parent_candidate = linked_person
                child_candidate = target
            else:
                parent_candidate = child_candidate = None

            if relationship_type in {"CHILD_OF", "PARENT_OF"} and _would_create_lineage_cycle(
                vault_ids,
                parent_candidate.id,
                child_candidate.id,
            ):
                return Response(
                    {"detail": "That relationship would create a loop in the lineage tree."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if relationship_type == "CHILD_OF":
                KinshipEdge.objects.get_or_create(
                    vault_id=vault_id,
                    from_person=target,
                    to_person=linked_person,
                    relationship_type="PARENT_OF",
                )
            elif relationship_type == "PARENT_OF":
                KinshipEdge.objects.get_or_create(
                    vault_id=vault_id,
                    from_person=linked_person,
                    to_person=target,
                    relationship_type="PARENT_OF",
                )
            elif relationship_type == "SPOUSE_OF":
                KinshipEdge.objects.get_or_create(
                    vault_id=vault_id,
                    from_person=target,
                    to_person=linked_person,
                    relationship_type="SPOUSE_OF",
                )
                KinshipEdge.objects.get_or_create(
                    vault_id=vault_id,
                    from_person=linked_person,
                    to_person=target,
                    relationship_type="SPOUSE_OF",
                )

        return Response({"personId": str(linked_person.id)}, status=status.HTTP_201_CREATED)


class RelationshipDetailView(views.APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, vault_id):
        get_object_or_404(VaultMember, vault_id=vault_id, user=request.user, role__in=['ADMIN', 'CONTRIBUTOR'])

        from_person_id = request.data.get('fromPersonId')
        to_person_id = request.data.get('toPersonId')
        relationship_type = request.data.get('type')

        if not from_person_id or not to_person_id or not relationship_type:
            return Response(
                {"error": "fromPersonId, toPersonId, and type are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from_person = get_object_or_404(Person, id=from_person_id, vault_id=vault_id)
        to_person = get_object_or_404(Person, id=to_person_id, vault_id=vault_id)

        if relationship_type == 'SPOUSE_OF':
            deleted_count, _ = KinshipEdge.objects.filter(
                vault_id=vault_id,
                relationship_type='SPOUSE_OF',
            ).filter(
                Q(from_person=from_person, to_person=to_person) |
                Q(from_person=to_person, to_person=from_person)
            ).delete()

            if deleted_count == 0:
                return Response({"error": "That spouse relationship does not exist."}, status=status.HTTP_404_NOT_FOUND)

            ActionLog.objects.create(
                vault_id=vault_id,
                user=request.user,
                action_type='edit',
                description=f"Detached spouse relationship between '{from_person.name}' and '{to_person.name}'."
            )
            return Response({"status": "UNLINKED"})

        if relationship_type != 'PARENT_OF':
            return Response({"error": "Unsupported relationship type."}, status=status.HTTP_400_BAD_REQUEST)

        deleted_count, _ = KinshipEdge.objects.filter(
            vault_id=vault_id,
            relationship_type='PARENT_OF',
            from_person=from_person,
            to_person=to_person,
        ).delete()

        if deleted_count == 0:
            deleted_count, _ = KinshipEdge.objects.filter(
                vault_id=vault_id,
                relationship_type='PARENT_OF',
                from_person=to_person,
                to_person=from_person,
            ).delete()

        if deleted_count == 0:
            return Response({"error": "That parent relationship does not exist."}, status=status.HTTP_404_NOT_FOUND)

        ActionLog.objects.create(
            vault_id=vault_id,
            user=request.user,
            action_type='edit',
            description=f"Detached lineage relationship between '{from_person.name}' and '{to_person.name}'."
        )
        return Response({"status": "UNLINKED"})

class GenerateChronicleView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, vault_id, id):
        get_object_or_404(VaultMember, vault_id=vault_id, user=request.user)
        person = get_object_or_404(Person, id=id, vault_id=vault_id)

        if person.active_story_task_id:
            return Response({"task_id": person.active_story_task_id, "status": "ALREADY_RUNNING"})

        task = generate_chronicle_task.delay(str(person.id))
        person.active_story_task_id = task.id
        person.save()

        return Response({"task_id": task.id, "status": "STARTED"}, status=status.HTTP_202_ACCEPTED)

class PersonProfileView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, vault_id, id):
        member = VaultMember.objects.filter(vault_id=vault_id, user=request.user).first()
        base_vault_id = vault_id
        if not member:
            from core.models import LineagePact
            pact = LineagePact.objects.filter(
                (
                    Q(requester_vault_id=vault_id, target_vault__members__user=request.user) |
                    Q(target_vault_id=vault_id, requester_vault__members__user=request.user)
                ),
                status__in=['ACCEPTED', 'UNLINK_PENDING'],
            ).first()
            if not pact:
                raise PermissionDenied("You do not have access to this lineage profile.")
            base_vault_id = pact.target_vault_id if str(pact.requester_vault_id) == str(vault_id) else pact.requester_vault_id

        vault_ids = get_accessible_vault_ids(base_vault_id)
        person = get_object_or_404(Person, id=id, vault_id__in=vault_ids)

        memories = Memory.objects.filter(
            Q(detected_faces__person=person) | Q(identified_people=person)
        ).distinct()
        memories_data = MemorySerializer(memories, many=True, context={'request': request}).data

        edges = KinshipEdge.objects.filter(Q(from_person=person) | Q(to_person=person))
        relatives = []
        seen_relative_ids = set()
        for edge in edges:
            rel = edge.to_person if edge.from_person == person else edge.from_person
            rel_type = edge.relationship_type
            if edge.to_person == person and edge.relationship_type == "PARENT_OF":
                rel_type = "CHILD_OF"
            rel_id = str(rel.id)
            if rel_id in seen_relative_ids:
                continue
            seen_relative_ids.add(rel_id)
            rel_photo = PersonSerializer(rel, context={"request": request}).data.get("photo")
            relatives.append({
                "id": rel_id,
                "name": rel.name,
                "role": rel.role,
                "relationship": rel_type,
                "avatar": rel_photo,
            })

        return Response({
            "id": str(person.id),
            "name": person.name,
            "photo": PersonSerializer(person, context={"request": request}).data.get("photo"),
            "vaultId": str(person.vault_id),
            "vaultName": person.vault.name,
            "biography": person.biography,
            "role": person.role,
            "birthYear": person.birth_year,
            "deathYear": person.death_year,
            "memoryCount": memories.count(),
            "memories": memories_data,
            "kinship": relatives,
            "active_story_task_id": person.active_story_task_id
        })


class PersonMemoryLinkView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, vault_id, id):
        get_object_or_404(VaultMember, vault_id=vault_id, user=request.user, role__in=['ADMIN', 'CONTRIBUTOR'])
        person = get_object_or_404(Person, id=id, vault_id=vault_id)
        memory_id = request.data.get('memory_id')

        memory = get_object_or_404(Memory, id=memory_id, vault_id=vault_id)
        memory.identified_people.add(person)

        ActionLog.objects.create(
            vault_id=vault_id, user=request.user, action_type='edit',
            description=f"Manually tagged {person.name} in memory '{memory.title or 'Untitled'}'."
        )
        return Response({"status": "LINKED"})

    def delete(self, request, vault_id, id):
        get_object_or_404(VaultMember, vault_id=vault_id, user=request.user, role__in=['ADMIN', 'CONTRIBUTOR'])
        person = get_object_or_404(Person, id=id, vault_id=vault_id)
        memory_id = request.data.get('memory_id')

        memory = get_object_or_404(Memory, id=memory_id, vault_id=vault_id)
        memory.identified_people.remove(person)

        ActionLog.objects.create(
            vault_id=vault_id, user=request.user, action_type='edit',
            description=f"Removed manual tag of {person.name} from memory '{memory.title or 'Untitled'}'."
        )
        return Response({"status": "UNLINKED"})

class PersonDetailView(views.APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def patch(self, request, vault_id, id):
        get_object_or_404(VaultMember, vault_id=vault_id, user=request.user, role__in=['ADMIN', 'CONTRIBUTOR'])
        person = get_object_or_404(Person, id=id, vault_id=vault_id)

        if 'name' in request.data:
            person.name = request.data.get('name') or person.name
        if 'biography' in request.data:
            person.biography = request.data.get('biography') or ''
        if 'role' in request.data:
            person.role = request.data.get('role') or ''
        if 'birthYear' in request.data:
            person.birth_year = request.data.get('birthYear') or ''
        if 'deathYear' in request.data:
            person.death_year = request.data.get('deathYear') or ''
        if request.data.get("avatarRemove") == "true" and person.avatar:
            person.avatar.delete(save=False)
            person.avatar = None
        if "avatar" in request.FILES:
            person.avatar = request.FILES["avatar"]

        person.save()
        return Response(PersonSerializer(person, context={'request': request}).data)

    def delete(self, request, vault_id, id):
        get_object_or_404(VaultMember, vault_id=vault_id, user=request.user, role__in=['ADMIN', 'CONTRIBUTOR'])
        person = get_object_or_404(Person, id=id, vault_id=vault_id)

        reparent_id = request.data.get("reparentId")  # Safe delegation on lineage gaps
        outgoing_edges = KinshipEdge.objects.filter(from_person=person, relationship_type="PARENT_OF")

        if reparent_id:
            reparent_to = get_object_or_404(Person, id=reparent_id, vault_id=vault_id)
            for edge in outgoing_edges:
                KinshipEdge.objects.get_or_create(
                    vault_id=vault_id,
                    from_person=reparent_to,
                    to_person=edge.to_person,
                    relationship_type="PARENT_OF",
                )

        ActionLog.objects.create(
            vault_id=vault_id, user=request.user, action_type='delete',
            description=f"Removed relative '{person.name}' from the lineage tree. Children delegated safely."
        )

        person.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class IdentifyFaceView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, vault_id):
        get_object_or_404(VaultMember, vault_id=vault_id, user=request.user, role__in=['ADMIN', 'CONTRIBUTOR'])

        face_embedding_id = request.data.get('face_embedding_id')
        target_person_id = request.data.get('target_person_id')
        action = request.data.get('action')

        embedding = get_object_or_404(PersonFaceEmbedding, id=face_embedding_id, memory__vault_id=vault_id)
        old_person = embedding.person

        if action == 'unlink':
            embedding.delete()
            if old_person.name.startswith("Unknown Kin") and old_person.face_embeddings.count() == 0:
                old_person.delete()
            return Response({"status": "UNLINKED"})

        if target_person_id:
            target_person = get_object_or_404(Person, id=target_person_id, vault_id=vault_id)
        else:
            target_person = Person.objects.create(
                vault_id=vault_id,
                name=f"Unknown Kin {str(embedding.id)[:6]}",
                role="Unidentified"
            )
            save_person_avatar_from_memory_face(target_person, embedding.memory, embedding.bounding_box)

        embedding.person = target_person
        embedding.save()

        if old_person.name.startswith("Unknown Kin") and old_person.face_embeddings.count() == 0:
            old_person.delete()

        return Response({"status": "SUCCESS"})

class MergeIdentityView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, vault_id):
        get_object_or_404(VaultMember, vault_id=vault_id, user=request.user, role__in=['ADMIN', 'CONTRIBUTOR'])

        source_id = request.data.get('source_person_id')
        target_id = request.data.get('target_person_id')

        source_person = get_object_or_404(Person, id=source_id, vault_id=vault_id)
        target_person = get_object_or_404(Person, id=target_id, vault_id=vault_id)

        PersonFaceEmbedding.objects.filter(person=source_person).update(person=target_person)

        ActionLog.objects.create(
            vault_id=vault_id, user=request.user, action_type='edit',
            description=f"Merged duplicate identity '{source_person.name}' into '{target_person.name}'."
        )

        source_person.delete()

        return Response({"status": "MERGED"})
