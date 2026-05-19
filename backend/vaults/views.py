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

from .models import Memory, Capsule
from core.models import VaultMember, ActionLog, get_accessible_vault_ids
from lineage.models import Person
from .serializers import MemorySerializer, CapsuleSerializer
from django.db.models import Q, Count
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
        title = request.data.get('title', '')

        memory = Memory.objects.create(vault_id=vault_id, original_file=file, title=title)

        ActionLog.objects.create(
            vault_id=vault_id, user=request.user, action_type='upload',
            description=f"Curated new artifact: '{title or 'Untitled'}'.",
            target_id=memory.id,
            target_type='MEMORY'
        )

        from tasks.ai_pipeline import process_memory_task
        task = process_memory_task.delay(str(memory.id))

        return Response({"task_id": task.id, "status": "PROCESSING", "memory_id": str(memory.id)}, status=status.HTTP_202_ACCEPTED)

class VaultClustersView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, vault_id):
        if not has_vault_access(request.user, vault_id):
            raise PermissionDenied("You do not have access to this vault.")
        memories = Memory.objects.visible_to_vault(vault_id)

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
        from tasks.ai_pipeline import process_memory_task
        task = process_memory_task.delay(str(id))
        return Response({"task_id": task.id, "status": "REPROCESSING"})

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

        serializer.save()

        ActionLog.objects.create(
            vault_id=vault_id,
            user=self.request.user,
            action_type='edit',
            description=f"Updated details for artifact '{serializer.instance.title or 'Untitled'}.'",
            target_id=serializer.instance.id,
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
