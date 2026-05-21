import datetime
import random
from rest_framework import generics, views, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from django.utils import timezone
from pgvector.django import CosineDistance

from .models import Memory, Capsule, MemoryCollection
from core.models import VaultMember, ActionLog, get_accessible_vault_ids
from lineage.models import Person
from .serializers import MemorySerializer, CapsuleSerializer, MemoryCollectionSerializer
from django.db.models import Q, Count, F
from sentence_transformers import SentenceTransformer

_clip_model = None

def get_clip_model():
    global _clip_model
    if _clip_model is None:
        _clip_model = SentenceTransformer('clip-ViT-B-32')
    return _clip_model

def get_vault_access_level(user, vault_id):
    if VaultMember.objects.filter(user=user, vault_id=vault_id).exists():
        return 'MEMBER'

    from core.models import LineagePact
    is_pact_active = LineagePact.objects.filter(
        (Q(requester_vault_id=vault_id, target_vault__members__user=user) |
         Q(target_vault_id=vault_id, requester_vault__members__user=user)),
        status='ACCEPTED'
    ).exists()

    return 'FEDERATED' if is_pact_active else None

def has_vault_access(user, vault_id):
    return get_vault_access_level(user, vault_id) is not None

class MemoryListCreateView(generics.ListCreateAPIView):
    serializer_class = MemorySerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        vault_id = self.kwargs['vault_id']
        if not has_vault_access(self.request.user, vault_id):
            raise PermissionDenied("You do not have access to this vault.")
        qs = Memory.objects.visible_to_vault(vault_id).prefetch_related('detected_faces__person').order_by('-created_at')

        q = self.request.query_params.get('q')
        if q:
            qs = qs.filter(
                Q(title__icontains=q) |
                Q(ai_caption__icontains=q) |
                Q(human_caption__icontains=q) |
                Q(location__icontains=q) |
                Q(tags__icontains=q)
            )

        cluster = self.request.query_params.get('cluster')
        if cluster:
            qs = qs.filter(cluster_name=cluster)

        decade = self.request.query_params.get('decade')
        if decade:
            decade_start = decade.replace('s', '')
            qs = qs.filter(year__startswith=decade_start)

        reviewed = self.request.query_params.get('reviewed')
        if reviewed is not None:
            qs = qs.filter(is_reviewed=reviewed.lower() == 'true')
            
        is_favorite = self.request.query_params.get('is_favorite')
        if is_favorite is not None:
            qs = qs.filter(is_favorite=is_favorite.lower() == 'true')

        return qs

    def create(self, request, *args, **kwargs):
        vault_id = self.kwargs['vault_id']
        if not VaultMember.objects.filter(user=request.user, vault_id=vault_id, role__in=['ADMIN', 'CONTRIBUTOR']).exists():
            raise PermissionDenied("You lack contribution rights to this vault.")

        file = request.FILES.get('file')
        if not file:
            return Response({"file": ["No file was uploaded."]}, status=status.HTTP_400_BAD_REQUEST)

        title = request.data.get('title', '')

        memory = Memory.objects.create(vault_id=vault_id, original_file=file, title=title)

        ActionLog.objects.create(
            vault_id=vault_id, user=request.user, action_type='upload',
            description=f"Curated new artifact: '{title or 'Untitled'}'.",
            target_id=memory.id,
            target_type='MEMORY'
        )

        task_id = None
        try:
            from tasks.ai_pipeline import process_memory_task
            task = process_memory_task.delay(str(memory.id))
            task_id = task.id
        except Exception as exc:
            # Keep the upload usable when the local worker/broker is down. The
            # review dialog can still open for manual verification.
            memory.exif_json = {**(memory.exif_json or {}), "processing_error": str(exc)}
            memory.save(update_fields=['exif_json'])

        return Response({"task_id": task_id, "status": "PROCESSING" if task_id else "PENDING_REVIEW", "memory_id": str(memory.id)}, status=status.HTTP_202_ACCEPTED)

class VaultClustersView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, vault_id):
        if not has_vault_access(request.user, vault_id):
            raise PermissionDenied("You do not have access to this vault.")
        memories = Memory.objects.visible_to_vault(vault_id).filter(is_reviewed=True)

        clusters = {}
        for mem in memories:
            if mem.cluster_name and mem.cluster_name != 'Unsorted':
                name = mem.cluster_name
            elif mem.year:
                name = f"{mem.year[:3]}0s Era"
            else:
                name = "The Archive"

            if name not in clusters:
                clusters[name] = []
            clusters[name].append(MemorySerializer(mem, context={'request': request}).data)

        result = []
        angle_step = 3.14 * 0.4
        for i, (name, items) in enumerate(clusters.items()):
            result.append({
                "name": name,
                "angle": i * angle_step,
                "memories": items
            })

        return Response(result)

class VibeSearchView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, vault_id):
        if not has_vault_access(request.user, vault_id):
            raise PermissionDenied("You do not have access to this vault.")
        query = request.query_params.get('q')

        if not query:
            return Response([])

        text_vector = get_clip_model().encode(query).tolist()

        memories = Memory.objects.visible_to_vault(vault_id).exclude(clip_embedding__isnull=True)\
                                 .order_by(CosineDistance('clip_embedding', text_vector))[:10]

        return Response(MemorySerializer(memories, many=True, context={'request': request}).data)

class VaultTagCloudView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, vault_id):
        if not has_vault_access(request.user, vault_id):
            raise PermissionDenied("You do not have access to this vault.")

        from collections import Counter
        memories = Memory.objects.visible_to_vault(vault_id)
        all_tags = []
        for m in memories:
            all_tags.extend(m.tags or [])

        top_tags = [tag for tag, count in Counter(all_tags).most_common(5)]
        return Response(top_tags)

class MemoryFiltersView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, vault_id):
        if not has_vault_access(request.user, vault_id):
            raise PermissionDenied("You do not have access to this vault.")

        memories = Memory.objects.visible_to_vault(vault_id)

        clusters = list(memories.exclude(cluster_name='Unsorted').order_by('cluster_name').values_list('cluster_name', flat=True).distinct())

        years = list(memories.exclude(year='').order_by('year').values_list('year', flat=True).distinct())
        decades = sorted(set(f"{y[:3]}0s" for y in years if y and len(y) == 4))

        return Response({
            "clusters": clusters,
            "decades": decades,
        })

class MemoryCollectionListCreateView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, vault_id):
        if not has_vault_access(request.user, vault_id):
            raise PermissionDenied("You do not have access to this vault.")

        explicit = MemoryCollection.objects.filter(vault_id=vault_id).annotate(
            memory_count=Count('vault__memories', filter=Q(vault__memories__cluster_name=F('name')))
        )
        explicit_names = set(explicit.values_list('name', flat=True))

        memory_names = Memory.objects.visible_to_vault(vault_id).exclude(cluster_name='').exclude(cluster_name='Unsorted')\
            .values('cluster_name').annotate(memory_count=Count('id')).order_by('cluster_name')

        items = MemoryCollectionSerializer(explicit, many=True).data
        for row in memory_names:
            if row['cluster_name'] in explicit_names:
                continue
            items.append({
                "id": None,
                "name": row['cluster_name'],
                "memory_count": row['memory_count'],
                "created_at": None,
            })

        items.sort(key=lambda item: item['name'].lower())
        return Response(items)

    def post(self, request, vault_id):
        member = VaultMember.objects.filter(user=request.user, vault_id=vault_id).first()
        if not member or member.role == 'VIEWER':
            raise PermissionDenied("You lack contribution rights to create collections.")

        name = (request.data.get('name') or '').strip()
        if not name:
            return Response({"name": ["Collection name is required."]}, status=status.HTTP_400_BAD_REQUEST)
        if len(name) > 100:
            return Response({"name": ["Collection name must be 100 characters or fewer."]}, status=status.HTTP_400_BAD_REQUEST)
        if name.lower() == 'unsorted':
            return Response({"name": ["Unsorted is reserved for uncategorized memories."]}, status=status.HTTP_400_BAD_REQUEST)

        collection, created = MemoryCollection.objects.get_or_create(vault_id=vault_id, name=name)
        if created:
            ActionLog.objects.create(
                vault_id=vault_id,
                user=request.user,
                action_type='edit',
                description=f"Created memory collection '{name}'.",
                target_id=collection.id,
                target_type='COLLECTION'
            )

        collection.memory_count = Memory.objects.visible_to_vault(vault_id).filter(cluster_name=name).count()
        return Response(MemoryCollectionSerializer(collection).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

class MemoryCollectionDetailView(views.APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, vault_id, collection_id):
        member = VaultMember.objects.filter(user=request.user, vault_id=vault_id).first()
        if not member or member.role == 'VIEWER':
            raise PermissionDenied("You lack contribution rights to delete collections.")

        collection = get_object_or_404(MemoryCollection, id=collection_id, vault_id=vault_id)
        linked_count = Memory.objects.filter(vault_id=vault_id, cluster_name=collection.name).count()
        if linked_count > 0:
            return Response({
                "error": "Collection still contains memories. Unlink those memories before deleting it.",
                "memory_count": linked_count,
            }, status=status.HTTP_409_CONFLICT)

        collection_name = collection.name
        collection.delete()
        ActionLog.objects.create(
            vault_id=vault_id,
            user=request.user,
            action_type='delete',
            description=f"Deleted empty memory collection '{collection_name}'.",
            target_type='COLLECTION'
        )
        return Response(status=status.HTTP_204_NO_CONTENT)

class MemoryRestoreView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, vault_id, id):
        member = VaultMember.objects.filter(user=request.user, vault_id=vault_id).first()
        if not member or member.role == 'VIEWER':
            raise PermissionDenied("You lack contribution rights to trigger AI restoration.")

        memory = get_object_or_404(Memory, id=id, vault_id=vault_id)
        from tasks.restoration import restore_memory_task
        task = restore_memory_task.delay(str(memory.id))
        return Response({"task_id": task.id}, status=status.HTTP_202_ACCEPTED)

class CapsuleListCreateView(generics.ListCreateAPIView):
    serializer_class = CapsuleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        vault_id = self.kwargs['vault_id']
        get_object_or_404(VaultMember, vault_id=vault_id, user=self.request.user)
        return Capsule.objects.filter(vault_id=vault_id).order_by('unlock_date')

    def perform_create(self, serializer):
        vault_id = self.kwargs['vault_id']
        member = VaultMember.objects.filter(user=self.request.user, vault_id=vault_id).first()
        if not member or member.role == 'VIEWER':
            raise PermissionDenied("You lack contribution rights to seal a capsule.")

        memory_ids = self.request.data.get('memory_ids', [])
        if memory_ids:
            valid_mems = Memory.objects.filter(id__in=memory_ids, vault_id=vault_id).count()
            if valid_mems != len(memory_ids):
                raise PermissionDenied("One or more artifacts do not belong to this vault.")

        capsule = serializer.save(vault_id=vault_id, sealed_by=self.request.user, status='LOCKED')
        if memory_ids:
            capsule.memories.add(*memory_ids)

        ActionLog.objects.create(
            vault_id=vault_id,
            user=self.request.user,
            action_type='security',
            description=f"Sealed a new Time Capsule: '{capsule.title}' until {capsule.unlock_date.strftime('%Y-%m-%d')}."
        )

class CapsuleOpenView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, vault_id, pk):
        get_object_or_404(VaultMember, vault_id=vault_id, user=request.user)
        capsule = get_object_or_404(Capsule, id=pk, vault_id=vault_id)

        if capsule.status == 'LOCKED' and capsule.unlock_date > timezone.now():
            return Response({"error": "Temporal lock still active. Capsule cannot be opened."}, status=status.HTTP_400_BAD_REQUEST)

        capsule.status = 'OPENED'
        capsule.save()
        return Response({"status": "OPENED"})

class DashboardSummaryView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, vault_id):
        member = get_object_or_404(VaultMember, vault_id=vault_id, user=request.user)
        vault = member.vault

        today = timezone.now()
        memories_today = Memory.objects.visible_to_vault(vault_id).filter(
            date__month=today.month,
            date__day=today.day
        )

        on_this_day = None
        if memories_today.exists():
            on_this_day = MemorySerializer(random.choice(memories_today), context={'request': request}).data

        upcoming = Capsule.objects.filter(
            vault_id=vault_id,
            status='LOCKED',
            unlock_date__gt=today
        ).order_by('unlock_date').first()

        unreviewed_count = Memory.objects.visible_to_vault(vault_id).filter(is_reviewed=False).count()

        recent_exhibits = Memory.objects.visible_to_vault(vault_id).order_by('-created_at')[:4]
        hero_images = [request.build_absolute_uri(m.original_file.url) for m in recent_exhibits]

        return Response({
            "vaultName": vault.name,
            "curatorName": request.user.full_name.split(' ')[0],
            "memoryCount": Memory.objects.visible_to_vault(vault_id).count(),
            "unreviewedCount": unreviewed_count,
            "kinCount": Person.objects.filter(vault_id=vault_id).count(),
            "heroImages": hero_images,
            "onThisDay": on_this_day,
            "upcomingCapsule": {
                "title": upcoming.title,
                "unlockDate": upcoming.unlock_date,
            } if upcoming else None,
            "theme": {
                "primaryHue": vault.primary_hue,
                "grainEnabled": vault.grain_enabled
            }
        })

class VaultSettingsView(views.APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, vault_id):
        member = get_object_or_404(VaultMember, vault_id=vault_id, user=request.user, role='ADMIN')
        vault = member.vault
        vault.primary_hue = request.data.get('primary_hue', vault.primary_hue)
        vault.grain_enabled = request.data.get('grain_enabled', vault.grain_enabled)
        vault.save()
        return Response({"status": "SUCCESS", "message": "Settings updated."})

class SmartPurgeView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, vault_id):
        get_object_or_404(VaultMember, vault_id=vault_id, user=request.user, role='ADMIN')

        duplicates = Memory.objects.filter(vault_id=vault_id) \
            .exclude(phash='') \
            .values('phash') \
            .annotate(count=Count('id')) \
            .filter(count__gt=1)

        purged_count = 0
        bytes_saved = 0

        for dup in duplicates:
            mems = list(Memory.objects.filter(vault_id=vault_id, phash=dup['phash']).exclude(capsules__status='LOCKED'))

            if len(mems) < 2:
                continue

            mems.sort(key=lambda m: (
                int(m.exif_json.get('width', 0)) * int(m.exif_json.get('height', 0)),
                int(m.exif_json.get('filesize', 0))
            ), reverse=True)

            for redundant in mems[1:]:
                bytes_saved += int(redundant.exif_json.get('filesize', 0))
                redundant.delete()
                purged_count += 1

        if purged_count > 0:
            ActionLog.objects.create(
                vault_id=vault_id,
                user=request.user,
                action_type='security',
                description=f"Smart Purge complete. Reclaimed {purged_count} visual duplicates (~{round(bytes_saved/1024/1024, 2)} MB saved)."
            )

        return Response({
            "status": "SUCCESS",
            "purged": purged_count,
            "mb_saved": round(bytes_saved / (1024 * 1024), 2)
        })

class MemoryReprocessView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, vault_id, id):
        member = VaultMember.objects.filter(user=request.user, vault_id=vault_id).first()
        if not member or member.role == 'VIEWER':
            raise PermissionDenied("You lack contribution rights to trigger AI reprocessing.")

        memory = get_object_or_404(Memory, id=id, vault_id=vault_id)
        try:
            from tasks.ai_pipeline import process_memory_task
            task = process_memory_task.delay(str(id))
        except Exception as exc:
            return Response({"error": f"AI queue unavailable: {exc}"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        return Response({"task_id": task.id, "status": "REPROCESSING"})

class MemorySuggestionDecisionView(views.APIView):
    permission_classes = [IsAuthenticated]

    allowed_fields = {'title', 'description', 'tags'}

    def post(self, request, vault_id, id, field):
        member = VaultMember.objects.filter(user=request.user, vault_id=vault_id).first()
        if not member or member.role == 'VIEWER':
            raise PermissionDenied("You lack contribution rights to review AI suggestions.")
        if field not in self.allowed_fields:
            return Response({"field": ["Unsupported suggestion field."]}, status=status.HTTP_400_BAD_REQUEST)

        action = request.data.get('action')
        if action not in {'accept', 'reject'}:
            return Response({"action": ["Use 'accept' or 'reject'."]}, status=status.HTTP_400_BAD_REQUEST)

        memory = get_object_or_404(Memory, id=id, vault_id=vault_id)
        suggestions = dict(memory.ai_suggestions or {})
        suggestion = dict(suggestions.get(field) or {})
        if not suggestion.get('value'):
            return Response({"error": "No AI suggestion is available for this field."}, status=status.HTTP_404_NOT_FOUND)

        exif_json = memory.exif_json or {}
        suggestion['status'] = 'accepted' if action == 'accept' else 'rejected'
        suggestion['decided_at'] = timezone.now().isoformat()
        suggestion['decided_by'] = str(request.user.id)
        suggestions[field] = suggestion
        memory.ai_suggestions = suggestions

        if action == 'accept':
            value = suggestion.get('value')
            if field == 'title':
                memory.title = str(value or '')[:255]
                exif_json['ai_generated_title'] = True
            elif field == 'description':
                memory.ai_caption = str(value or '')
                exif_json['ai_generated_description'] = True
            elif field == 'tags':
                suggested_tags = value if isinstance(value, list) else []
                current_tags = list(memory.tags or [])
                current_lookup = {str(tag).strip().lower() for tag in current_tags}
                for tag in suggested_tags:
                    clean = str(tag or '').strip()
                    if clean and clean.lower() not in current_lookup:
                        current_tags.append(clean[:50])
                        current_lookup.add(clean.lower())
                memory.tags = current_tags

                previous_ai_tags = exif_json.get('ai_generated_tags') or []
                ai_lookup = {str(tag).strip().lower() for tag in previous_ai_tags}
                accepted_ai_tags = list(previous_ai_tags)
                for tag in suggested_tags:
                    clean = str(tag or '').strip()
                    if clean and clean.lower() not in ai_lookup:
                        accepted_ai_tags.append(clean[:50])
                        ai_lookup.add(clean.lower())
                exif_json['ai_generated_tags'] = accepted_ai_tags

        memory.exif_json = exif_json
        memory.save()

        ActionLog.objects.create(
            vault_id=vault_id,
            user=request.user,
            action_type='edit',
            description=f"{action.title()}ed AI suggestion for {field} on '{memory.title or 'Untitled'}'.",
            target_id=memory.id,
            target_type='MEMORY'
        )

        return Response(MemorySerializer(memory, context={'request': request}).data)

class MemoryIdentifiedKinView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, vault_id, id):
        member = VaultMember.objects.filter(user=request.user, vault_id=vault_id).first()
        if not member or member.role == 'VIEWER':
            raise PermissionDenied("You lack contribution rights to identify kin.")

        person_id = request.data.get('person_id')
        if not person_id:
            return Response({"person_id": ["A person id is required."]}, status=status.HTTP_400_BAD_REQUEST)

        memory = get_object_or_404(Memory, id=id, vault_id=vault_id)
        vault_ids = get_accessible_vault_ids(vault_id)
        person = get_object_or_404(Person, id=person_id, vault_id__in=vault_ids)
        memory.identified_people.add(person)

        ActionLog.objects.create(
            vault_id=vault_id,
            user=request.user,
            action_type='edit',
            description=f"Manually identified {person.name} in '{memory.title or 'Untitled'}'.",
            target_id=memory.id,
            target_type='MEMORY'
        )

        return Response(MemorySerializer(memory, context={'request': request}).data)

    def delete(self, request, vault_id, id):
        member = VaultMember.objects.filter(user=request.user, vault_id=vault_id).first()
        if not member or member.role == 'VIEWER':
            raise PermissionDenied("You lack contribution rights to update identified kin.")

        person_id = request.data.get('person_id')
        if not person_id:
            return Response({"person_id": ["A person id is required."]}, status=status.HTTP_400_BAD_REQUEST)

        memory = get_object_or_404(Memory, id=id, vault_id=vault_id)
        person = get_object_or_404(Person, id=person_id)
        memory.identified_people.remove(person)

        ActionLog.objects.create(
            vault_id=vault_id,
            user=request.user,
            action_type='edit',
            description=f"Removed manual kin identification for {person.name} from '{memory.title or 'Untitled'}'.",
            target_id=memory.id,
            target_type='MEMORY'
        )

        return Response(MemorySerializer(memory, context={'request': request}).data)

class MemoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = MemorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        vault_id = self.kwargs['vault_id']
        if not has_vault_access(self.request.user, vault_id):
            raise PermissionDenied("You do not have access to this vault.")
        return Memory.objects.filter(vault_id=vault_id)

    def perform_update(self, serializer):
        vault_id = self.kwargs['vault_id']
        member = VaultMember.objects.filter(user=self.request.user, vault_id=vault_id).first()
        if not member or member.role == 'VIEWER':
            raise PermissionDenied("You lack contribution rights to edit this artifact.")

        previous_title = serializer.instance.title or ''
        previous_exif = serializer.instance.exif_json or {}
        previous_ai_tags = previous_exif.get('ai_generated_tags') or previous_exif.get('ai_visual_tags') or []
        instance = serializer.save()

        exif_json = instance.exif_json or {}
        exif_changed = False

        if 'title' in self.request.data and (instance.title or '') != previous_title:
            exif_json.pop('ai_generated_title', None)
            exif_json.pop('ai_suggested_title', None)
            exif_changed = True

        if 'tags' in self.request.data:
            current_tags = {str(tag).strip().lower() for tag in (instance.tags or [])}
            kept_ai_tags = [
                tag for tag in previous_ai_tags
                if str(tag).strip().lower() in current_tags
            ]
            exif_json['ai_generated_tags'] = kept_ai_tags
            exif_changed = True

        if exif_changed:
            instance.exif_json = exif_json
            instance.save(update_fields=['exif_json'])

        ActionLog.objects.create(
            vault_id=vault_id,
            user=self.request.user,
            action_type='edit',
            description=f"Updated details for artifact '{instance.title or 'Untitled'}.'",
            target_id=instance.id,
            target_type='MEMORY'
        )

    def perform_destroy(self, instance):
        vault_id = self.kwargs['vault_id']
        member = VaultMember.objects.filter(user=self.request.user, vault_id=vault_id).first()
        if not member or member.role == 'VIEWER':
            raise PermissionDenied("You lack contribution rights to expunge this artifact.")

        if instance.capsules.filter(status='LOCKED').exists():
            raise PermissionDenied("This artifact is sealed inside a Time Capsule and cannot be expunged.")

        ActionLog.objects.create(
            vault_id=vault_id,
            user=self.request.user,
            action_type='delete',
            description=f"Artifact '{instance.title or 'Untitled'}' was expunged."
        )
        instance.delete()
