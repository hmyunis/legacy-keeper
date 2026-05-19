from django.db.models import Q
from vaults.serializers import MemorySerializer
from rest_framework import views, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from .models import Person, KinshipEdge, PersonFaceEmbedding
from core.models import VaultMember, get_accessible_vault_ids
from .serializers import PersonSerializer, KinshipEdgeSerializer
from tasks.story_weaver import generate_chronicle_task

class LineageGraphView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, vault_id):
        get_object_or_404(VaultMember, vault_id=vault_id, user=request.user)
        vault_ids = get_accessible_vault_ids(vault_id)

        nodes = Person.objects.filter(vault_id__in=vault_ids)
        edges = KinshipEdge.objects.filter(vault_id__in=vault_ids)

        return Response({
            "nodes": PersonSerializer(nodes, many=True, context={'request': request}).data,
            "edges": [{"from": str(e.from_person.id), "to": str(e.to_person.id), "type": e.relationship_type} for e in edges]
        })

class GraftBranchView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, vault_id):
        get_object_or_404(VaultMember, vault_id=vault_id, user=request.user, role__in=['ADMIN', 'CONTRIBUTOR'])

        parent_id = request.data.get('parentId')
        name = request.data.get('name')
        relationship_type = request.data.get('role', 'CHILD')
        birth_year = request.data.get('birthYear', '')
        death_year = request.data.get('deathYear', '')

        new_person = Person.objects.create(
            vault_id=vault_id,
            name=name,
            birth_year=birth_year,
            death_year=death_year
        )

        if parent_id:
            vault_ids = get_accessible_vault_ids(vault_id)
            parent = get_object_or_404(Person, id=parent_id, vault_id__in=vault_ids)

            KinshipEdge.objects.create(
                vault_id=vault_id,
                from_person=parent,
                to_person=new_person,
                relationship_type=relationship_type
            )

            if relationship_type == 'SPOUSE':
                KinshipEdge.objects.create(
                    vault_id=vault_id,
                    from_person=new_person,
                    to_person=parent,
                    relationship_type='SPOUSE'
                )

        return Response({"personId": str(new_person.id)}, status=status.HTTP_201_CREATED)

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
        get_object_or_404(VaultMember, vault_id=vault_id, user=request.user)
        person = get_object_or_404(Person, id=id, vault_id=vault_id)

        from vaults.models import Memory
        memories = Memory.objects.filter(detected_faces__person=person).distinct()
        memories_data = MemorySerializer(memories, many=True, context={'request': request}).data

        edges = KinshipEdge.objects.filter(Q(from_person=person) | Q(to_person=person))
        relatives = []
        for edge in edges:
            rel = edge.to_person if edge.from_person == person else edge.from_person
            relatives.append({
                "id": str(rel.id),
                "name": rel.name,
                "role": rel.role,
                "avatar": rel.avatar_url or f"https://ui-avatars.com/api/?name={rel.name.replace(' ', '+')}&background=B88F5B&color=fff"
            })

        return Response({
            "id": str(person.id),
            "name": person.name,
            "biography": person.biography,
            "role": person.role,
            "birthYear": person.birth_year,
            "deathYear": person.death_year,
            "memoryCount": memories.count(),
            "memories": memories_data,
            "kinship": relatives,
            "active_story_task_id": person.active_story_task_id
        })

class PersonDetailView(views.APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, vault_id, id):
        get_object_or_404(VaultMember, vault_id=vault_id, user=request.user, role__in=['ADMIN', 'CONTRIBUTOR'])
        person = get_object_or_404(Person, id=id, vault_id=vault_id)

        if 'biography' in request.data:
            person.biography = request.data.get('biography') or ''
        if 'role' in request.data:
            person.role = request.data.get('role') or person.role
        if 'birthYear' in request.data:
            person.birth_year = request.data.get('birthYear') or ''
        if 'deathYear' in request.data:
            person.death_year = request.data.get('deathYear') or ''

        person.save()
        return Response(PersonSerializer(person, context={'request': request}).data)

    def delete(self, request, vault_id, id):
        get_object_or_404(VaultMember, vault_id=vault_id, user=request.user, role__in=['ADMIN', 'CONTRIBUTOR'])
        person = get_object_or_404(Person, id=id, vault_id=vault_id)

        ActionLog.objects.create(
            vault_id=vault_id, user=request.user, action_type='delete',
            description=f"Removed relative '{person.name}' from the lineage tree."
        )

        person.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class IdentifyFaceView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, vault_id):
        get_object_or_404(VaultMember, vault_id=vault_id, user=request.user, role__in=['ADMIN', 'CONTRIBUTOR'])

        face_embedding_id = request.data.get('face_embedding_id')
        target_person_id = request.data.get('target_person_id')

        embedding = get_object_or_404(PersonFaceEmbedding, id=face_embedding_id, memory__vault_id=vault_id)
        vault_ids = get_accessible_vault_ids(vault_id)
        target_person = get_object_or_404(Person, id=target_person_id, vault_id__in=vault_ids)

        old_person = embedding.person
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
