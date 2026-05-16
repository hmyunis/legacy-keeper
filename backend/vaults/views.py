import datetime
from rest_framework import generics, views, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from django.utils import timezone
from pgvector.django import CosineDistance

from .models import Memory, Capsule
from core.models import VaultMember
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
        return Memory.objects.filter(vault_id=vault_id).order_by('-created_at')

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

        Capsule.objects.filter(vault_id=vault_id, status='LOCKED', unlock_date__lte=timezone.now()).update(status='READY')
        return Capsule.objects.filter(vault_id=vault_id)

    def perform_create(self, serializer):
        vault_id = self.kwargs['vault_id']
        serializer.save(vault_id=vault_id, sealed_by=self.request.user, status='LOCKED')