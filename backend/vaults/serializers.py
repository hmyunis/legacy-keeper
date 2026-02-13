from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import FamilyVault, Membership, Invite

User = get_user_model()

class UserShortSerializer(serializers.ModelSerializer):
    """Used to nest user info inside membership"""
    class Meta:
        model = User
        fields = ('id', 'full_name', 'email', 'avatar')

class MembershipSerializer(serializers.ModelSerializer):
    user = UserShortSerializer(read_only=True)
    
    class Meta:
        model = Membership
        fields = ('id', 'user', 'role', 'created_at', 'is_active')

class FamilyVaultSerializer(serializers.ModelSerializer):
    # Show active members count
    member_count = serializers.SerializerMethodField()
    my_role = serializers.SerializerMethodField()

    class Meta:
        model = FamilyVault
        fields = ('id', 'name', 'description', 'cover_photo', 'safety_window_minutes', 'created_at', 'member_count', 'my_role')
        read_only_fields = ('id', 'created_at', 'owner')

    def get_member_count(self, obj):
        return obj.members.filter(is_active=True).count()

    def get_my_role(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            try:
                member = obj.members.get(user=request.user)
                return member.role
            except Membership.DoesNotExist:
                return None
        return None

class InviteCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invite
        fields = ('id', 'vault', 'email', 'role', 'expires_at', 'token')
        read_only_fields = ('token', 'created_by', 'vault')

class InviteProcessSerializer(serializers.Serializer):
    token = serializers.UUIDField()
