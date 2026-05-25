from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import Vault, VaultMember, ActionLog, LineagePact, VaultInvitation, VaultInviteLink

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    fullName = serializers.CharField(source='full_name')
    avatar = serializers.SerializerMethodField()
    vaultId = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()
    vaults = serializers.SerializerMethodField()
    pendingInvitations = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id',
            'fullName',
            'email',
            'is_verified',
            'avatar',
            'vaultId',
            'role',
            'vaults',
            'pendingInvitations',
        )

    def get_avatar(self, obj):
        if obj.avatar:
            return self.context['request'].build_absolute_uri(obj.avatar.url)
        return f"https://ui-avatars.com/api/?name={obj.full_name.replace(' ', '+')}&background=B88F5B&color=fff"

    def get_vaultId(self, obj):
        memberships = list(obj.vault_memberships.select_related('vault').all())
        if len(memberships) != 1:
            return None
        return str(memberships[0].vault.id)

    def get_role(self, obj):
        memberships = list(obj.vault_memberships.select_related('vault').all())
        if len(memberships) != 1:
            return 'CURATOR'
        return memberships[0].role

    def get_vaults(self, obj):
        memberships = obj.vault_memberships.select_related('vault').order_by('joined_at')
        return [
            {
                'id': str(membership.vault_id),
                'name': membership.vault.name,
                'role': membership.role,
                'joinedAt': membership.joined_at,
            }
            for membership in memberships
        ]

    def get_pendingInvitations(self, obj):
        invitations = VaultInvitation.objects.select_related('vault', 'invited_by').filter(
            email=obj.email,
            status='PENDING'
        ).order_by('-created_at')
        return [
            {
                'id': str(invitation.id),
                'vaultId': str(invitation.vault_id),
                'vaultName': invitation.vault.name,
                'role': invitation.role,
                'status': invitation.status,
                'invitedByName': invitation.invited_by.full_name if invitation.invited_by else None,
                'createdAt': invitation.created_at,
            }
            for invitation in invitations
        ]

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        user_data = UserSerializer(self.user, context=self.context).data

        return {
            'user': user_data,
            'accessToken': data['access'],
            'refreshToken': data['refresh']
        }

class VaultSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vault
        fields = ('id', 'name', 'primary_hue', 'grain_enabled', 'created_at')

class VaultMemberSerializer(serializers.ModelSerializer):
    userId = serializers.CharField(source='user.id', read_only=True)
    name = serializers.CharField(source='user.full_name', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = VaultMember
        fields = ('id', 'userId', 'name', 'email', 'role', 'avatar', 'joined_at')

    def get_avatar(self, obj):
        name_formatted = obj.user.full_name.replace(' ', '+')
        return f"https://ui-avatars.com/api/?name={name_formatted}&background=B88F5B&color=fff"

class ActionLogSerializer(serializers.ModelSerializer):
    user = serializers.CharField(source='user.full_name', read_only=True)

    class Meta:
        model = ActionLog
        fields = ('id', 'user', 'action_type', 'description', 'target_id', 'target_type', 'created_at')

class LineagePactSerializer(serializers.ModelSerializer):
    requester_name = serializers.CharField(source='requester_vault.name', read_only=True)
    target_vault_name = serializers.CharField(source='target_vault.name', read_only=True)
    is_incoming = serializers.SerializerMethodField()

    class Meta:
        model = LineagePact
        fields = ('id', 'requester_name', 'target_vault_name', 'status', 'is_incoming', 'created_at')

    def get_is_incoming(self, obj):
        current_vault_id = self.context['view'].kwargs.get('vault_id')
        return str(obj.target_vault_id) == str(current_vault_id)


class VaultInvitationSerializer(serializers.ModelSerializer):
    invitedByName = serializers.CharField(source='invited_by.full_name', read_only=True)
    vaultId = serializers.CharField(source='vault.id', read_only=True)
    vaultName = serializers.CharField(source='vault.name', read_only=True)
    invitedAt = serializers.DateTimeField(source='created_at', read_only=True)
    acceptedAt = serializers.DateTimeField(source='accepted_at', read_only=True)
    rejectedAt = serializers.DateTimeField(source='rejected_at', read_only=True)
    revokedAt = serializers.DateTimeField(source='revoked_at', read_only=True)

    class Meta:
        model = VaultInvitation
        fields = (
            'id',
            'email',
            'role',
            'status',
            'vaultId',
            'vaultName',
            'invitedByName',
            'invitedAt',
            'acceptedAt',
            'rejectedAt',
            'revokedAt',
        )


class VaultInviteLinkSerializer(serializers.ModelSerializer):
    vaultId = serializers.CharField(source='vault.id', read_only=True)
    vaultName = serializers.CharField(source='vault.name', read_only=True)
    createdByName = serializers.CharField(source='created_by.full_name', read_only=True)
    expiresAt = serializers.DateTimeField(source='expires_at', read_only=True)
    revokedAt = serializers.DateTimeField(source='revoked_at', read_only=True)
    deletedAt = serializers.DateTimeField(source='deleted_at', read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    maxUses = serializers.IntegerField(source='max_uses', read_only=True)
    usesCount = serializers.IntegerField(source='uses_count', read_only=True)
    isExpired = serializers.SerializerMethodField()
    isRevoked = serializers.BooleanField(source='is_revoked', read_only=True)
    isDeleted = serializers.BooleanField(source='is_deleted', read_only=True)

    class Meta:
        model = VaultInviteLink
        fields = (
            'id',
            'token',
            'role',
            'vaultId',
            'vaultName',
            'createdByName',
            'maxUses',
            'usesCount',
            'expiresAt',
            'revokedAt',
            'deletedAt',
            'createdAt',
            'isExpired',
            'isRevoked',
            'isDeleted',
        )

    def get_isExpired(self, obj):
        return bool(obj.expires_at and obj.expires_at <= timezone.now())
