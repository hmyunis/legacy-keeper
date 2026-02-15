from uuid import uuid4
from urllib.parse import quote

from rest_framework import generics, status, views, permissions
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.conf import settings
from django.db import transaction

from .serializers import (
    UserRegistrationSerializer, 
    CustomTokenObtainPairSerializer,
    UserProfileSerializer,
    EmailVerificationSerializer,
    GoogleOAuthLoginSerializer,
    ResendVerificationSerializer,
    serialize_user_payload,
)
from core.services import EmailService
from notifications.services import notify_security_login
from vaults.models import FamilyVault, Membership

User = get_user_model()


def derive_family_name(full_name: str) -> str:
    parts = [segment.strip() for segment in (full_name or '').split() if segment.strip()]
    if not parts:
        return 'Family'
    return parts[-1]


def ensure_personal_vault(user):
    if FamilyVault.objects.filter(owner=user).exists():
        return

    family_name = derive_family_name(user.full_name)
    vault_name = f"{family_name} Family Vault"
    vault = FamilyVault.objects.create(
        name=vault_name,
        family_name=family_name,
        owner=user,
        description="Your family's digital heritage starts here.",
    )
    Membership.objects.create(
        user=user,
        vault=vault,
        role=Membership.Roles.ADMIN,
    )


def send_verification_email(user):
    email_service = EmailService()
    encoded_email = quote(user.email)
    verification_link = f"{settings.FRONTEND_URL}/verify?token={user.verification_token}&email={encoded_email}"

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
        html_content=html_content,
    )


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = UserRegistrationSerializer

    def perform_create(self, serializer):
        user = serializer.save()

        # Send verification email
        send_verification_email(user)

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
                    ensure_personal_vault(user)
                    return Response({"message": "Account already verified"}, status=status.HTTP_200_OK)
                
                user.is_active = True
                user.is_verified = True
                user.save()

                ensure_personal_vault(user)

                return Response({"message": "Email verified and Vault created."}, status=status.HTTP_200_OK)
            except User.DoesNotExist:
                return Response({"error": "Invalid token"}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ResendVerificationEmailView(views.APIView):
    permission_classes = (permissions.AllowAny,)
    serializer_class = ResendVerificationSerializer

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']
        user = User.objects.filter(email__iexact=email).first()

        # Return generic success for unknown users to avoid account enumeration.
        if not user:
            return Response(
                {"message": "If an account exists for this email, a verification email has been sent."},
                status=status.HTTP_200_OK,
            )

        if user.is_active and user.is_verified:
            return Response({"message": "Account is already verified."}, status=status.HTTP_200_OK)

        user.verification_token = uuid4()
        user.save(update_fields=['verification_token'])
        send_verification_email(user)

        return Response(
            {"message": "Verification email sent. Please check your inbox."},
            status=status.HTTP_200_OK,
        )

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == status.HTTP_200_OK:
            email = request.data.get('email') or request.data.get('username')
            user = User.objects.filter(email__iexact=(email or '')).first()
            if user:
                notify_security_login(
                    user=user,
                    ip_address=request.META.get('REMOTE_ADDR'),
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                )
        return response


class GoogleOAuthLoginView(views.APIView):
    permission_classes = (permissions.AllowAny,)
    serializer_class = GoogleOAuthLoginSerializer

    @transaction.atomic
    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)

        if not settings.GOOGLE_OAUTH_CLIENT_ID:
            return Response(
                {"error": "Google OAuth is not configured"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            from google.auth.transport import requests as google_requests
            from google.oauth2 import id_token
        except ImportError:
            return Response(
                {"error": "google-auth dependency is missing on the backend"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            token_data = id_token.verify_oauth2_token(
                serializer.validated_data['id_token'],
                google_requests.Request(),
                settings.GOOGLE_OAUTH_CLIENT_ID,
            )
        except ValueError:
            return Response({"error": "Invalid Google token"}, status=status.HTTP_400_BAD_REQUEST)

        if not token_data.get('email_verified'):
            return Response({"error": "Google email is not verified"}, status=status.HTTP_400_BAD_REQUEST)

        email = token_data.get('email')
        if not email:
            return Response({"error": "Google token email is missing"}, status=status.HTTP_400_BAD_REQUEST)

        full_name = token_data.get('name') or (email.split('@')[0] if email else "LegacyKeeper User")

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'full_name': full_name,
                'is_active': True,
                'is_verified': True,
            },
        )

        if created:
            user.set_unusable_password()
            user.save(update_fields=['password'])
        else:
            should_save = False
            if not user.is_active:
                user.is_active = True
                should_save = True
            if not user.is_verified:
                user.is_verified = True
                should_save = True
            if not user.full_name:
                user.full_name = full_name
                should_save = True
            if should_save:
                user.save()

        ensure_personal_vault(user)

        refresh = RefreshToken.for_user(user)

        notify_security_login(
            user=user,
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
        )

        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": serialize_user_payload(user),
            },
            status=status.HTTP_200_OK,
        )


class UserProfileView(generics.RetrieveUpdateAPIView):
    queryset = User.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_object(self):
        return self.request.user
