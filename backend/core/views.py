import uuid
import random
import redis
from django.conf import settings
from rest_framework import status, views, generics
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404

from .models import Vault, VaultMember, ActionLog, LineagePact
from .serializers import CustomTokenObtainPairSerializer, VaultMemberSerializer, ActionLogSerializer
from core.utils.mail import send_notification_email
from lineage.models import Person

User = get_user_model()

# Setup Redis Client for verification tokens
redis_client = redis.from_url(settings.CELERY_BROKER_URL)

class RegisterView(views.APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        full_name = request.data.get('fullName')

        if User.objects.filter(email=email).exists():
            return Response({"error": "Email already in use"}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(email=email, password=password, full_name=full_name)
        
        # Generate 8-digit verification code
        code = f"{random.randint(1000, 9999)}-{random.randint(1000, 9999)}"
        redis_client.setex(f"verify:{email}", 900, code) # 15 min TTL
        
        # Send Email
        html_msg = f"<h1>Welcome to LegacyKeeper</h1><p>Your activation key is: <strong>{code}</strong></p>"
        send_notification_email("Your Vault Activation Key", html_msg, f"Key: {code}", email, full_name)

        # Generate JWT
        refresh = RefreshToken.for_user(user)
        serializer = CustomTokenObtainPairSerializer()
        
        return Response({
            "user": {"id": str(user.id), "fullName": user.full_name, "email": user.email, "role": "curator"},
            "accessToken": str(refresh.access_token),
            "refreshToken": str(refresh)
        }, status=status.HTTP_201_CREATED)


class VerifyEmailView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        code = request.data.get('code')
        user = request.user
        
        stored_code = redis_client.get(f"verify:{user.email}")
        if stored_code and stored_code.decode('utf-8') == code:
            user.is_verified = True
            user.save()
            redis_client.delete(f"verify:{user.email}")
            return Response({"success": True})
        
        return Response({"error": "Invalid or expired key"}, status=status.HTTP_400_BAD_REQUEST)


class InitVaultView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        vault_name = request.data.get('vaultName')
        
        vault = Vault.objects.create(name=vault_name)
        VaultMember.objects.create(user=request.user, vault=vault, role='ADMIN')
        
        ActionLog.objects.create(
            vault=vault, user=request.user, action_type='security',
            description=f"Museum Vault '{vault_name}' instantiated."
        )
        
        return Response({"vaultId": str(vault.id), "name": vault.name}, status=status.HTTP_201_CREATED)


class FirstRelativeView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        vault_id = request.data.get('vaultId')
        name = request.data.get('name')
        birth_year = request.data.get('birthYear', '')
        role = request.data.get('relationship', '')

        # Security Check
        member = get_object_or_404(VaultMember, vault_id=vault_id, user=request.user)

        person = Person.objects.create(
            vault_id=vault_id, name=name, birth_year=birth_year, role=role
        )
        
        ActionLog.objects.create(
            vault_id=vault_id, user=request.user, action_type='upload',
            description=f"Added {name} to the Lineage Tree."
        )

        return Response({"personId": str(person.id)}, status=status.HTTP_201_CREATED)

# Governance APIs
class VaultMembersListView(generics.ListAPIView):
    serializer_class = VaultMemberSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        vault_id = self.kwargs['vault_id']
        get_object_or_404(VaultMember, vault_id=vault_id, user=self.request.user) # Access check
        return VaultMember.objects.filter(vault_id=vault_id)

class InviteMemberView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, vault_id):
        get_object_or_404(VaultMember, vault_id=vault_id, user=request.user, role='ADMIN') # Must be Admin
        
        email = request.data.get('email')
        role = request.data.get('role', 'VIEWER')
        
        # Here we would create an invite token and send it via Celery mail task
        # For now, we return 202 as spec defines
        return Response({"message": "Invitation queued.", "status": "PROCESSING"}, status=status.HTTP_202_ACCEPTED)

class VaultLogsView(generics.ListAPIView):
    serializer_class = ActionLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        vault_id = self.kwargs['vault_id']
        get_object_or_404(VaultMember, vault_id=vault_id, user=self.request.user)
        return ActionLog.objects.filter(vault_id=vault_id).order_by('-created_at')

class ExportLogsView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, vault_id):
        get_object_or_404(VaultMember, vault_id=vault_id, user=request.user)
        # Mocking Celery task dispatch for Phase 2
        fake_task_id = str(uuid.uuid4())
        return Response({"task_id": fake_task_id, "status": "PROCESSING"}, status=status.HTTP_202_ACCEPTED)