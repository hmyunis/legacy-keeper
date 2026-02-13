from rest_framework import generics, status, views, permissions
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model
from django.conf import settings

from .serializers import (
    UserRegistrationSerializer, 
    CustomTokenObtainPairSerializer,
    UserProfileSerializer,
    EmailVerificationSerializer
)
from core.services import EmailService
from vaults.models import FamilyVault, Membership

User = get_user_model()

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = UserRegistrationSerializer

    def perform_create(self, serializer):
        user = serializer.save()
        
        # --- Send Verification Email ---
        email_service = EmailService()
        verification_link = f"{settings.ALLOWED_HOSTS[0]}:5173/verify?token={user.verification_token}"
        
        subject = "Welcome to LegacyKeeper - Verify your Email"
        html_content = f"""
            <h1>Welcome, {user.full_name}!</h1>
            <p>Please click the link below to verify your account and start your Family Vault:</p>
            <a href="{verification_link}">Verify My Account</a>
            <p>Or copy this token: <b>{user.verification_token}</b></p>
            <p>Thank you for using LegacyKeeper!</p>
        """
        
        email_service.send_basic_email(
            to_email=user.email,
            subject=subject,
            html_content=html_content
        )

class VerifyEmailView(views.APIView):
    permission_classes = (permissions.AllowAny,)
    serializer_class = EmailVerificationSerializer

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            token = serializer.validated_data['token']
            try:
                user = User.objects.get(verification_token=token)
                
                if user.is_active:
                    return Response({"message": "Account already verified"}, status=status.HTTP_200_OK)
                
                user.is_active = True
                user.is_verified = True
                user.save()

                # --- NEW CODE: Auto-Generate Vault ---
                vault_name = f"{user.full_name}'s Family"
                vault = FamilyVault.objects.create(
                    name=vault_name,
                    owner=user,
                    description="Your family's digital heritage starts here."
                )
                Membership.objects.create(
                    user=user,
                    vault=vault,
                    role=Membership.Roles.ADMIN
                )
                # -------------------------------------

                return Response({"message": "Email verified and Vault created."}, status=status.HTTP_200_OK)
            except User.DoesNotExist:
                return Response({"error": "Invalid token"}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class UserProfileView(generics.RetrieveUpdateAPIView):
    queryset = User.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_object(self):
        return self.request.user
