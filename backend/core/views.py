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

from .models import Vault, VaultMember, ActionLog, LineagePact, PushSubscription
from .serializers import CustomTokenObtainPairSerializer, VaultMemberSerializer, ActionLogSerializer
from core.utils.mail import send_notification_email
from lineage.models import Person
from tasks.governance import send_invite_email_task, export_vault_logs_task

User = get_user_model()

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

        code = f"{random.randint(1000, 9999)}-{random.randint(1000, 9999)}"
        redis_client.setex(f"verify:{email}", 900, code)

        html_msg = f"<h1>Welcome to LegacyKeeper</h1><p>Your activation key is: <strong>{code}</strong></p>"
        send_notification_email("Your Vault Activation Key", html_msg, f"Key: {code}", email, full_name)

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

        member = get_object_or_404(VaultMember, vault_id=vault_id, user=request.user)

        person = Person.objects.create(
            vault_id=vault_id, name=name, birth_year=birth_year, role=role
        )

        ActionLog.objects.create(
            vault_id=vault_id, user=request.user, action_type='upload',
            description=f"Added {name} to the Lineage Tree."
        )

        return Response({"personId": str(person.id)}, status=status.HTTP_201_CREATED)


class PushSubscribeView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        sub_info = request.data
        PushSubscription.objects.get_or_create(
            user=request.user,
            endpoint=sub_info.get('endpoint'),
            defaults={
                'p256dh': sub_info.get('keys', {}).get('p256dh', ''),
                'auth': sub_info.get('keys', {}).get('auth', '')
            }
        )
        return Response(status=status.HTTP_201_CREATED)


class UpdateProfileView(views.APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request):
        user = request.user
        user.full_name = request.data.get('fullName', user.full_name)
        user.email = request.data.get('email', user.email)
        user.save()
        return Response({"status": "SUCCESS", "message": "Profile updated."})


class VaultMembersListView(generics.ListAPIView):
    serializer_class = VaultMemberSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        vault_id = self.kwargs['vault_id']
        get_object_or_404(VaultMember, vault_id=vault_id, user=self.request.user)
        return VaultMember.objects.select_related('user').filter(vault_id=vault_id)


class InviteMemberView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, vault_id):
        get_object_or_404(VaultMember, vault_id=vault_id, user=request.user, role='ADMIN')
        email = request.data.get('email')
        role = request.data.get('role', 'VIEWER')

        task = send_invite_email_task.delay(str(vault_id), email, role, request.user.full_name)

        ActionLog.objects.create(
            vault_id=vault_id, user=request.user, action_type='governance',
            description=f"Dispatched invitation to {email}."
        )
        return Response({"task_id": task.id, "status": "PROCESSING"}, status=status.HTTP_202_ACCEPTED)


class RemoveMemberView(views.APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, vault_id, user_id):
        get_object_or_404(VaultMember, vault_id=vault_id, user=request.user, role='ADMIN')
        member_to_remove = get_object_or_404(VaultMember, vault_id=vault_id, user_id=user_id)

        if member_to_remove.role == 'ADMIN':
            return Response({"error": "Cannot remove a Vault Admin."}, status=status.HTTP_400_BAD_REQUEST)

        member_name = member_to_remove.user.full_name
        member_to_remove.delete()

        ActionLog.objects.create(
            vault_id=vault_id, user=request.user, action_type='governance',
            description=f"Revoked vault access for {member_name}."
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class LineagePactRequestView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, vault_id):
        get_object_or_404(VaultMember, vault_id=vault_id, user=request.user, role='ADMIN')
        target_email = request.data.get('email')

        target_user = get_object_or_404(User, email=target_email)
        target_member = VaultMember.objects.filter(user=target_user, role='ADMIN').first()

        if not target_member:
            return Response({"error": "Target user does not administrate a vault."}, status=status.HTTP_400_BAD_REQUEST)

        LineagePact.objects.create(
            requester_vault_id=vault_id,
            target_vault_id=target_member.vault_id,
            status='PENDING'
        )

        ActionLog.objects.create(
            vault_id=vault_id, user=request.user, action_type='governance',
            description=f"Dispatched Lineage Pact request to {target_email}."
        )
        return Response({"status": "PACT_REQUESTED"}, status=status.HTTP_201_CREATED)


class VaultLogsView(generics.ListAPIView):
    serializer_class = ActionLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        vault_id = self.kwargs['vault_id']
        get_object_or_404(VaultMember, vault_id=vault_id, user=self.request.user)
        return ActionLog.objects.select_related('user').filter(vault_id=vault_id).order_by('-created_at')


class ExportLogsView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, vault_id):
        get_object_or_404(VaultMember, vault_id=vault_id, user=request.user)
        task = export_vault_logs_task.delay(str(vault_id), request.user.email)
        return Response({"task_id": task.id, "status": "PROCESSING"}, status=status.HTTP_202_ACCEPTED)