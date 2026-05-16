from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from .models import Vault, VaultMember, ActionLog

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    fullName = serializers.CharField(source='full_name')
    
    class Meta:
        model = User
        fields = ('id', 'fullName', 'email', 'is_verified')

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        # Add custom user data to the response payload to match frontend AuthStore
        user_data = UserSerializer(self.user).data
        
        # Determine the user's active vault and role (if they have one)
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
        # Generate UI Avatar based on name
        name_formatted = obj.user.full_name.replace(' ', '+')
        return f"https://ui-avatars.com/api/?name={name_formatted}&background=B88F5B&color=fff"

class ActionLogSerializer(serializers.ModelSerializer):
    user = serializers.CharField(source='user.full_name', read_only=True)
    
    class Meta:
        model = ActionLog
        fields = ('id', 'user', 'action_type', 'description', 'created_at')