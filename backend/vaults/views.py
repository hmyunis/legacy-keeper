from rest_framework import viewsets, permissions, status, decorators, exceptions
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import transaction

from .models import FamilyVault, Membership, Invite
from .serializers import (
    FamilyVaultSerializer, 
    MembershipSerializer, 
    InviteCreateSerializer, 
    InviteProcessSerializer
)
from .permissions import IsVaultMember, IsVaultAdmin
from core.services import EmailService
from django.conf import settings

class FamilyVaultViewSet(viewsets.ModelViewSet):
    """
    CRUD for Vaults. 
    Queryset is filtered to only show vaults user is a member of.
    """
    serializer_class = FamilyVaultSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return FamilyVault.objects.filter(
            members__user=self.request.user, 
            members__is_active=True
        )

    def perform_create(self, serializer):
        # Atomic transaction to create vault AND admin membership
        with transaction.atomic():
            vault = serializer.save(owner=self.request.user)
            Membership.objects.create(
                user=self.request.user,
                vault=vault,
                role=Membership.Roles.ADMIN
            )

    @decorators.action(detail=True, methods=['post'], permission_classes=[IsVaultAdmin])
    def invite(self, request, pk=None):
        """Generate an invite link"""
        vault = self.get_object()
        serializer = InviteCreateSerializer(data=request.data)
        if serializer.is_valid():
            invite = serializer.save(
                vault=vault, 
                created_by=request.user
            )
            
            # Construct Link
            join_link = f"{settings.ALLOWED_HOSTS[0]}:5173/join/{invite.token}"
            
            # Send Email if address provided
            if invite.email:
                email_service = EmailService()
                email_service.send_basic_email(
                    to_email=invite.email,
                    subject=f"Join {vault.name} Family Vault",
                    html_content=f"<p>You have been invited to join the <strong>{vault.name}</strong> vault.</p><p><a href='{join_link}'>Click here to join</a></p>"
                )

            return Response({
                "message": "Invite generated",
                "link": join_link,
                "token": invite.token
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class MembershipViewSet(viewsets.ReadOnlyModelViewSet):
    """
    List members of a specific vault.
    URL: /api/vaults/{vault_pk}/members/
    """
    serializer_class = MembershipSerializer
    permission_classes = [IsVaultMember]

    def get_queryset(self):
        vault_pk = self.kwargs['vault_pk']
        return Membership.objects.filter(vault_id=vault_pk, is_active=True)

class JoinVaultView(viewsets.GenericViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = InviteProcessSerializer

    @decorators.action(detail=False, methods=['post'])
    def process(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        token = serializer.validated_data['token']

        invite = get_object_or_404(Invite, token=token)

        if not invite.is_valid():
            return Response({"error": "Invite expired or used"}, status=status.HTTP_400_BAD_REQUEST)

        # Check if already a member
        if Membership.objects.filter(user=request.user, vault=invite.vault).exists():
            return Response({"message": "You are already a member of this vault"}, status=status.HTTP_200_OK)

        # Create Membership
        Membership.objects.create(
            user=request.user,
            vault=invite.vault,
            role=invite.role
        )

        # Mark used if it was a single-use email invite
        if invite.email:
            invite.is_used = True
            invite.save()

        return Response({"message": "Joined vault successfully", "vaultId": invite.vault.id}, status=status.HTTP_200_OK)
