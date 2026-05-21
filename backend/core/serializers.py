from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from .models import Vault, VaultMember, ActionLog, LineagePact

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    fullName = serializers.CharField(source='full_name')
    avatar = serializers.SerializerMethodField()
    vaultId = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'fullName', 'email', 'is_verified', 'avatar', 'vaultId', 'role')

    def get_avatar(self, obj):
        if obj.avatar:
            return self.context['request'].build_absolute_uri(obj.avatar.url)
        return f"https://ui-avatars.com/api/?name={obj.full_name.replace(' ', '+')}&background=B88F5B&color=fff"

    def get_vaultId(self, obj):
        member = obj.vault_memberships.first()
        return str(member.vault.id) if member else None

    def get_role(self, obj):
        member = obj.vault_memberships.first()
        return member.role if member else 'CURATOR'

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        user_data = UserSerializer(self.user, context=self.context).data

        member = self.user.vault_memberships.first()
        if member:
            user_data['role'] = member.role
            user_data['vaultId'] = str(member.vault.id)

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
    name = serializers.CharField(source='user.full_name', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = VaultMember
        fields = ('id', 'name', 'email', 'role', 'avatar', 'joined_at')

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
