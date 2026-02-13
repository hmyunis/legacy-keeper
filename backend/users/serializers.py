from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('id', 'email', 'password', 'full_name')

    def create(self, validated_data):
        # We enforce is_active=False until email verification
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            full_name=validated_data['full_name'],
            is_active=False  
        )
        return user

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'email', 'full_name', 'avatar', 'is_verified')
        read_only_fields = ('email', 'is_verified')

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Customize the JWT response to include user details immediately.
    """
    def validate(self, attrs):
        data = super().validate(attrs)
        
        # Add extra data to the response
        data.update({
            'user': {
                'id': self.user.id,
                'email': self.user.email,
                'full_name': self.user.full_name,
                'avatar': self.user.avatar.url if self.user.avatar else None
            }
        })
        return data

class EmailVerificationSerializer(serializers.Serializer):
    token = serializers.UUIDField()
