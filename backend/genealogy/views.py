from rest_framework import viewsets, permissions, status, decorators
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from .models import PersonProfile, Relationship, MediaTag
from .serializers import PersonProfileSerializer, RelationshipSerializer, MediaTagSerializer
from vaults.models import FamilyVault
from vaults.permissions import IsVaultMember

class PersonProfileViewSet(viewsets.ModelViewSet):
    serializer_class = PersonProfileSerializer
    permission_classes = [permissions.IsAuthenticated, IsVaultMember]

    def get_queryset(self):
        vault_pk = self.kwargs.get('vault_pk') or self.request.query_params.get('vault')
        if not vault_pk:
            return PersonProfile.objects.none()
        return PersonProfile.objects.filter(vault_id=vault_pk)

    def perform_create(self, serializer):
        vault_id = self.request.data.get('vault') or self.kwargs.get('vault_pk')
        vault = get_object_or_404(FamilyVault, id=vault_id)
        
        # Security check: User must be member of vault
        if not vault.members.filter(user=self.request.user).exists():
            raise permissions.PermissionDenied("Not a member of this vault")
            
        serializer.save(vault=vault)

    @decorators.action(detail=False, methods=['get'])
    def tree(self, request):
        """
        Returns graph data (Nodes and Edges) for family tree visualization.
        Usage: /api/genealogy/profiles/tree/?vault={uuid}
        """
        vault_pk = request.query_params.get('vault')
        if not vault_pk:
            return Response({"error": "Vault ID required"}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Get Nodes (People)
        people = PersonProfile.objects.filter(vault_id=vault_pk)
        nodes = PersonProfileSerializer(people, many=True, context={'request': request}).data

        # 2. Get Edges (Relationships)
        # We need all relationships where EITHER side is in this vault (integrity check ensures both are)
        relationships = Relationship.objects.filter(from_person__vault_id=vault_pk)
        edges = RelationshipSerializer(relationships, many=True).data

        return Response({
            "nodes": nodes,
            "edges": edges
        })

class RelationshipViewSet(viewsets.ModelViewSet):
    serializer_class = RelationshipSerializer
    permission_classes = [permissions.IsAuthenticated, IsVaultMember]

    def get_queryset(self):
        # We assume usage like /api/relationships/?vault={id}
        # Or filtering by person. For simplicity, let's allow filtering by vault param.
        vault_pk = self.request.query_params.get('vault')
        if vault_pk:
            return Relationship.objects.filter(from_person__vault_id=vault_pk)
        return Relationship.objects.none()

class MediaTagViewSet(viewsets.ModelViewSet):
    serializer_class = MediaTagSerializer
    permission_classes = [permissions.IsAuthenticated, IsVaultMember]

    def get_queryset(self):
        # Filter by specific media item if provided
        media_id = self.request.query_params.get('media')
        if media_id:
            return MediaTag.objects.filter(media_item_id=media_id)
        
        return MediaTag.objects.filter(media_item__vault__members__user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
