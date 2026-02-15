from rest_framework import viewsets, permissions, status, decorators
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from .models import PersonProfile, Relationship, MediaTag
from .serializers import PersonProfileSerializer, RelationshipSerializer, MediaTagSerializer
from vaults.models import FamilyVault, Membership
from vaults.permissions import IsVaultMember

class PersonProfileViewSet(viewsets.ModelViewSet):
    serializer_class = PersonProfileSerializer
    permission_classes = [permissions.IsAuthenticated, IsVaultMember]

    def get_queryset(self):
        queryset = PersonProfile.objects.filter(
            vault__members__user=self.request.user,
            vault__members__is_active=True,
        ).distinct()

        vault_pk = self.kwargs.get('vault_pk') or self.request.query_params.get('vault')
        if vault_pk:
            queryset = queryset.filter(vault_id=vault_pk)
        return queryset

    def perform_create(self, serializer):
        vault_id = self.request.data.get('vault') or self.kwargs.get('vault_pk')
        vault = get_object_or_404(FamilyVault, id=vault_id)
        
        # Security checks: User must be active member and vault admin.
        if not vault.members.filter(user=self.request.user, is_active=True).exists():
            raise permissions.PermissionDenied("Not a member of this vault")
        if not Membership.objects.filter(
            user=self.request.user,
            vault=vault,
            role=Membership.Roles.ADMIN,
            is_active=True,
        ).exists():
            raise permissions.PermissionDenied("Vault admin access required")
            
        serializer.save(vault=vault)

    def perform_update(self, serializer):
        profile = self.get_object()
        if not Membership.objects.filter(
            user=self.request.user,
            vault=profile.vault,
            role=Membership.Roles.ADMIN,
            is_active=True,
        ).exists():
            raise permissions.PermissionDenied("Vault admin access required")

        serializer.save()

    def perform_destroy(self, instance):
        if not Membership.objects.filter(
            user=self.request.user,
            vault=instance.vault,
            role=Membership.Roles.ADMIN,
            is_active=True,
        ).exists():
            raise permissions.PermissionDenied("Vault admin access required")

        instance.delete()

    @decorators.action(detail=False, methods=['get'])
    def tree(self, request):
        """
        Returns graph data (Nodes and Edges) for family tree visualization.
        Usage: /api/genealogy/profiles/tree/?vault={uuid}
        """
        vault_pk = request.query_params.get('vault')
        if not vault_pk:
            return Response({"error": "Vault ID required"}, status=status.HTTP_400_BAD_REQUEST)

        vault = get_object_or_404(
            FamilyVault.objects.filter(
                members__user=request.user,
                members__is_active=True,
            ).distinct(),
            id=vault_pk,
        )

        # 1. Get Nodes (People)
        people = PersonProfile.objects.filter(vault=vault)
        nodes = PersonProfileSerializer(people, many=True, context={'request': request}).data

        # 2. Get Edges (Relationships)
        # We need all relationships where EITHER side is in this vault (integrity check ensures both are)
        relationships = Relationship.objects.filter(from_person__vault=vault)
        edges = RelationshipSerializer(relationships, many=True).data

        return Response({
            "vault": {
                "id": str(vault.id),
                "name": vault.name,
                "family_name": vault.family_name,
                "member_count": Membership.objects.filter(vault=vault, is_active=True).count(),
            },
            "nodes": nodes,
            "edges": edges
        })

class RelationshipViewSet(viewsets.ModelViewSet):
    serializer_class = RelationshipSerializer
    permission_classes = [permissions.IsAuthenticated, IsVaultMember]

    def get_queryset(self):
        queryset = Relationship.objects.filter(
            from_person__vault__members__user=self.request.user,
            from_person__vault__members__is_active=True,
        ).distinct()

        vault_pk = self.request.query_params.get('vault')
        if vault_pk:
            queryset = queryset.filter(from_person__vault_id=vault_pk)
        return queryset

    def perform_create(self, serializer):
        from_person = serializer.validated_data.get('from_person')
        if not from_person:
            raise permissions.PermissionDenied("from_person is required")

        if not Membership.objects.filter(
            user=self.request.user,
            vault=from_person.vault,
            role=Membership.Roles.ADMIN,
            is_active=True,
        ).exists():
            raise permissions.PermissionDenied("Vault admin access required")

        serializer.save()

    def perform_update(self, serializer):
        relationship = self.get_object()
        if not Membership.objects.filter(
            user=self.request.user,
            vault=relationship.from_person.vault,
            role=Membership.Roles.ADMIN,
            is_active=True,
        ).exists():
            raise permissions.PermissionDenied("Vault admin access required")

        serializer.save()

    def perform_destroy(self, instance):
        if not Membership.objects.filter(
            user=self.request.user,
            vault=instance.from_person.vault,
            role=Membership.Roles.ADMIN,
            is_active=True,
        ).exists():
            raise permissions.PermissionDenied("Vault admin access required")

        instance.delete()

class MediaTagViewSet(viewsets.ModelViewSet):
    serializer_class = MediaTagSerializer
    permission_classes = [permissions.IsAuthenticated, IsVaultMember]

    def get_queryset(self):
        queryset = MediaTag.objects.filter(
            media_item__vault__members__user=self.request.user,
            media_item__vault__members__is_active=True,
        ).distinct()

        # Filter by specific media item if provided
        media_id = self.request.query_params.get('media')
        if media_id:
            queryset = queryset.filter(media_item_id=media_id)
        
        return queryset

    def perform_create(self, serializer):
        media_item = serializer.validated_data.get('media_item')
        if not media_item or not media_item.vault.members.filter(user=self.request.user, is_active=True).exists():
            raise permissions.PermissionDenied("Not a member of this vault")

        serializer.save(created_by=self.request.user)
