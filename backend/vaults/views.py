import datetime
import random
from rest_framework import generics, views, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from django.utils import timezone
from pgvector.django import CosineDistance

from .models import Memory, Capsule
from core.models import VaultMember, ActionLog
from lineage.models import Person
from .serializers import MemorySerializer, CapsuleSerializer
from tasks.ai_pipeline import process_memory_task
from tasks.restoration import restore_memory_task

class MemoryListCreateView(generics.ListCreateAPIView):
    serializer_class = MemorySerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        vault_id = self.kwargs['vault_id']
        get_object_or_404(VaultMember, vault_id=vault_id, user=self.request.user)
        return Memory.objects.prefetch_related('detected_faces__person').filter(vault_id=vault_id).order_by('-created_at')

    def create(self, request, *args, **kwargs):
        vault_id = self.kwargs['vault_id']
        get_object_or_404(VaultMember, vault_id=vault_id, user=request.user)

        file = request.FILES.get('file')
        title = request.data.get('title', '')

        memory = Memory.objects.create(vault_id=vault_id, original_file=file, title=title)

        task = process_memory_task.delay(str(memory.id))

        return Response({"task_id": task.id, "status": "PROCESSING"}, status=status.HTTP_202_ACCEPTED)

class VaultClustersView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, vault_id):
        get_object_or_404(VaultMember, vault_id=vault_id, user=request.user)
        memories = Memory.objects.filter(vault_id=vault_id)

        clusters = {}
        for mem in memories:
            if mem.cluster_name not in clusters:
                clusters[mem.cluster_name] = []
            clusters[mem.cluster_name].append(MemorySerializer(mem).data)

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
        get_object_or_404(VaultMember, vault_id=vault_id, user=request.user)
        query = request.query_params.get('q')

        if not query:
            return Response([])

        from sentence_transformers import SentenceTransformer
        clip_model = SentenceTransformer('clip-ViT-B-32')
        text_vector = clip_model.encode(query).tolist()

        memories = Memory.objects.filter(vault_id=vault_id).exclude(clip_embedding__isnull=True)\
                                 .order_by(CosineDistance('clip_embedding', text_vector))[:10]

        return Response(MemorySerializer(memories, many=True).data)

class MemoryRestoreView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, vault_id, id):
        get_object_or_404(VaultMember, vault_id=vault_id, user=request.user)
        memory = get_object_or_404(Memory, id=id, vault_id=vault_id)

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
        serializer.save(vault_id=vault_id, sealed_by=self.request.user, status='LOCKED')

class DashboardSummaryView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, vault_id):
        get_object_or_404(VaultMember, vault_id=vault_id, user=request.user)

        today = timezone.now()
        memories_today = Memory.objects.filter(
            vault_id=vault_id,
            date__month=today.month,
            date__day=today.day
        )

        on_this_day = None
        if memories_today.exists():
            on_this_day = MemorySerializer(random.choice(memories_today)).data

        upcoming = Capsule.objects.filter(
            vault_id=vault_id,
            status='LOCKED',
            unlock_date__gt=today
        ).order_by('unlock_date').first()

        return Response({
            "curatorName": request.user.full_name.split(' ')[0],
            "memoryCount": Memory.objects.filter(vault_id=vault_id).count(),
            "kinCount": Person.objects.filter(vault_id=vault_id).count(),
            "onThisDay": on_this_day,
            "upcomingCapsule": {
                "title": upcoming.title,
                "unlockDate": upcoming.unlock_date,
            } if upcoming else None
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
        from django.db.models import Count
        duplicates = Memory.objects.filter(vault_id=vault_id).values('phash').annotate(count=Count('id')).filter(count__gt=1)

        purged_count = 0
        for dup in duplicates:
            if not dup['phash']: continue
            mems = list(Memory.objects.filter(vault_id=vault_id, phash=dup['phash']).order_by('created_at'))
            for m in mems[1:]:
                m.delete()
                purged_count += 1

        ActionLog.objects.create(
            vault_id=vault_id, user=request.user, action_type='security',
            description=f"Smart Purge deleted {purged_count} redundant artifacts."
        )
        return Response({"status": "SUCCESS", "purged": purged_count})