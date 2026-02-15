from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db.models import Sum
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
    is_owner = serializers.SerializerMethodField()
    storage_used_bytes = serializers.SerializerMethodField()
    family_name = serializers.CharField(required=False, allow_blank=True, max_length=120)
    storage_quality = serializers.ChoiceField(
        choices=FamilyVault.StorageQuality.choices,
        required=False,
    )
    default_visibility = serializers.ChoiceField(
        choices=FamilyVault.DefaultVisibility.choices,
        required=False,
    )

    class Meta:
        model = FamilyVault
        fields = (
            'id',
            'name',
            'family_name',
            'description',
            'cover_photo',
            'safety_window_minutes',
            'storage_quality',
            'default_visibility',
            'created_at',
            'member_count',
            'my_role',
            'is_owner',
            'storage_used_bytes',
        )
        read_only_fields = ('id', 'created_at', 'owner')

    def validate_family_name(self, value):
        return value.strip()

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

    def get_is_owner(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.owner_id == request.user.id
        return False

    def get_storage_used_bytes(self, obj):
        annotated_value = getattr(obj, 'storage_used_bytes', None)
        if annotated_value is not None:
            return int(annotated_value or 0)
        aggregate = obj.media_items.aggregate(total=Sum('file_size'))
        return int(aggregate.get('total') or 0)

class InviteCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invite
        fields = ('id', 'vault', 'email', 'role', 'expires_at', 'token')
        read_only_fields = ('token', 'created_by', 'vault')
        extra_kwargs = {
            'expires_at': {'required': False},
        }

class InviteProcessSerializer(serializers.Serializer):
    token = serializers.UUIDField()
