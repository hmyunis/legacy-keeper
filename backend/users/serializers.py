from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from vaults.models import Membership

User = get_user_model()


def _get_primary_membership(user):
    active_memberships = user.memberships.filter(is_active=True).select_related('vault')
    owned_membership = active_memberships.filter(vault__owner=user).first()
    return owned_membership or active_memberships.first()


def serialize_user_payload(user):
    primary_membership = _get_primary_membership(user)
    return {
        'id': user.id,
        'email': user.email,
        'full_name': user.full_name,
        'bio': user.bio,
        'avatar': user.avatar.url if user.avatar else None,
        'role': primary_membership.role if primary_membership else None,
        'active_vault_id': str(primary_membership.vault_id) if primary_membership else None,
    }


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    join_token = serializers.UUIDField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ('id', 'email', 'password', 'full_name', 'join_token')

    def create(self, validated_data):
        validated_data.pop('join_token', None)
        # We enforce is_active=False until email verification
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            full_name=validated_data['full_name'],
            is_active=False  
        )
        return user

class UserProfileSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    active_vault_id = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'email', 'full_name', 'bio', 'avatar', 'is_verified', 'role', 'active_vault_id')
        read_only_fields = ('email', 'is_verified')

    def get_role(self, obj):
        membership = _get_primary_membership(obj)
        return membership.role if membership else None

    def get_active_vault_id(self, obj):
        membership = _get_primary_membership(obj)
        return str(membership.vault_id) if membership else None

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Customize the JWT response to include user details immediately.
    """
    def validate(self, attrs):
        identifier = attrs.get(self.username_field)
        password = attrs.get('password')

        if identifier and password:
            user = User.objects.filter(email__iexact=identifier).first()
            if user and not user.is_active and user.check_password(password):
                raise serializers.ValidationError(
                    {
                        "error": "Email not verified. Please verify your email before logging in.",
                        "code": "EMAIL_NOT_VERIFIED",
                    }
                )

        data = super().validate(attrs)

        has_active_membership = Membership.objects.filter(
            user=self.user,
            is_active=True,
        ).exists()
        if not has_active_membership:
            raise serializers.ValidationError(
                {
                    "error": "You no longer have access to any vault. Ask an admin for a new invite link.",
                    "code": "INVITE_REQUIRED",
                }
            )
        
        # Add extra data to the response
        data.update({
            'user': serialize_user_payload(self.user)
        })
        return data

class EmailVerificationSerializer(serializers.Serializer):
    token = serializers.UUIDField()


class GoogleOAuthLoginSerializer(serializers.Serializer):
    id_token = serializers.CharField()


class ResendVerificationSerializer(serializers.Serializer):
    email = serializers.EmailField()
    join_token = serializers.UUIDField(required=False)


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()


class ResetPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()
    token = serializers.UUIDField()
    new_password = serializers.CharField(write_only=True, min_length=8, max_length=128)

    def validate(self, attrs):
        email = attrs.get('email')
        token = attrs.get('token')
        user = User.objects.filter(email__iexact=email).first()

        if not user or not user.is_reset_password_token_valid(token):
            raise serializers.ValidationError(
                {"error": "Invalid or expired reset link."}
            )

        new_password = attrs.get('new_password')
        if not new_password or len(new_password) < 6:
            raise serializers.ValidationError({"new_password": ["Password must be at least 6 characters long."]})

        attrs['user'] = user
        return attrs
