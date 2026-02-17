from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db.models import Sum
from django.conf import settings
from django.utils import timezone
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

    def validate_safety_window_minutes(self, value):
        if value is None:
            return value
        if value < 0:
            raise serializers.ValidationError("Safety window must be 0 minutes or greater.")
        if value > 10080:
            raise serializers.ValidationError("Safety window cannot exceed 10080 minutes (7 days).")
        return value

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
            'email': {'required': True},
            'expires_at': {'required': False},
        }

    def validate_email(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Email is required.")
        return value.strip().lower()

    def validate_role(self, value):
        if value == Membership.Roles.ADMIN:
            raise serializers.ValidationError(
                "Admin role cannot be assigned via invites. Use transfer ownership instead."
            )
        return value

class InviteProcessSerializer(serializers.Serializer):
    token = serializers.UUIDField()


class InvitePreviewSerializer(serializers.Serializer):
    token = serializers.UUIDField()


class InviteAcceptSerializer(serializers.Serializer):
    token = serializers.UUIDField()
    full_name = serializers.CharField(max_length=255)
    password = serializers.CharField(write_only=True, min_length=8, max_length=128)
    confirm_password = serializers.CharField(write_only=True, min_length=8, max_length=128)
    email = serializers.EmailField(required=False)

    def validate(self, attrs):
        password = attrs.get('password')
        confirm_password = attrs.get('confirm_password')
        if password != confirm_password:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})

        password = password.strip() if password else ''
        if len(password) < 6:
            raise serializers.ValidationError({"password": "Password must be at least 6 characters long."})

        attrs['full_name'] = attrs.get('full_name', '').strip()
        if not attrs['full_name']:
            raise serializers.ValidationError({"full_name": "Full name is required."})

        email = attrs.get('email')
        if email:
            attrs['email'] = email.strip().lower()

        return attrs


class ShareableInviteCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invite
        fields = ('id', 'role', 'expires_at')
        extra_kwargs = {
            'expires_at': {'required': True},
        }

    def validate_expires_at(self, value):
        if value <= timezone.now():
            raise serializers.ValidationError("Expiry date must be in the future.")
        return value

    def validate_role(self, value):
        if value == Membership.Roles.ADMIN:
            raise serializers.ValidationError(
                "Admin role cannot be assigned via shareable links. Use transfer ownership instead."
            )
        return value


class ShareableInviteSerializer(serializers.ModelSerializer):
    link = serializers.SerializerMethodField()
    is_revoked = serializers.SerializerMethodField()
    is_expired = serializers.SerializerMethodField()
    joined_count = serializers.IntegerField(source='successful_joins', read_only=True)

    class Meta:
        model = Invite
        fields = (
            'id',
            'token',
            'role',
            'expires_at',
            'created_at',
            'joined_count',
            'is_revoked',
            'is_expired',
            'link',
        )

    def get_link(self, obj):
        return f"{settings.FRONTEND_URL}/join/{obj.token}"

    def get_is_revoked(self, obj):
        return bool(obj.is_used)

    def get_is_expired(self, obj):
        return obj.expires_at <= timezone.now()
