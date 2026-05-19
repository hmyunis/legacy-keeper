from django.contrib.auth.hashers import make_password
import random
import redis
import csv
from django.conf import settings
from django.http import HttpResponse
from django.db.models import Q
from rest_framework import status, views, generics
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404

from .models import Vault, VaultMember, ActionLog, LineagePact, PushSubscription
from .serializers import CustomTokenObtainPairSerializer, VaultMemberSerializer, ActionLogSerializer, LineagePactSerializer
from core.utils.mail import send_notification_email
from lineage.models import Person
from tasks.governance import send_invite_email_task, export_vault_logs_task

User = get_user_model()

redis_client = redis.from_url(settings.CELERY_BROKER_URL)

class RegisterView(views.APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        password = request.data.get('password') or ''
        full_name = (request.data.get('fullName') or '').strip()

        if not email or not password or not full_name:
            return Response({"error": "email, password, and fullName are required."}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email=email).exists():
            return Response({"error": "Email already in use"}, status=status.HTTP_400_BAD_REQUEST)

        user = User(email=email, full_name=full_name)
        user.set_password(password)
        user.save()

        code = f"{random.randint(1000, 9999)}-{random.randint(1000, 9999)}"
        redis_client.setex(f"verify:{email}", 900, code)

        html_msg = f"<h1>Welcome to LegacyKeeper</h1><p>Your activation key is: <strong>{code}</strong></p>"
        send_notification_email("Your Vault Activation Key", html_msg, f"Key: {code}", email, full_name)

        refresh = RefreshToken.for_user(user)
        serializer = CustomTokenObtainPairSerializer()

        return Response({
            "user": {"id": str(user.id), "fullName": user.full_name, "email": user.email, "role": "curator", "is_verified": False},
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


class ResendVerificationEmailView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        if user.is_verified:
            return Response({"error": "Email is already verified."}, status=status.HTTP_400_BAD_REQUEST)

        code = f"{random.randint(1000, 9999)}-{random.randint(1000, 9999)}"
        redis_client.setex(f"verify:{user.email}", 900, code)

        html_msg = f"<h1>LegacyKeeper Activation</h1><p>Your new activation key is: <strong>{code}</strong></p>"
        send_notification_email("Your New Vault Activation Key", html_msg, f"Key: {code}", user.email, user.full_name)
        return Response({"success": True, "message": "Activation key resent."}, status=status.HTTP_200_OK)

class LineagePactListView(generics.ListAPIView):
    serializer_class = LineagePactSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        vault_id = self.kwargs['vault_id']
        return LineagePact.objects.filter(
            Q(target_vault_id=vault_id, status='PENDING') |
            Q(requester_vault_id=vault_id, status='PENDING')
        )

class LineagePactActionView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, vault_id, pact_id):
        get_object_or_404(VaultMember, vault_id=vault_id, user=request.user, role='ADMIN')
        pact = get_object_or_404(LineagePact, id=pact_id, target_vault_id=vault_id)

        action = request.data.get('action')
        if action == 'ACCEPT':
            pact.status = 'ACCEPTED'
            pact.save()

            ActionLog.objects.create(
                vault_id=vault_id, user=request.user, action_type='governance',
                description=f"Accepted Lineage Pact with '{pact.requester_vault.name}'."
            )
            ActionLog.objects.create(
                vault_id=pact.requester_vault_id, user=None, action_type='governance',
                description=f"Lineage Pact accepted by '{pact.target_vault.name}'."
            )
            return Response({"status": "ACCEPTED"})

        pact.delete()
        return Response({"status": "REJECTED"})


class InitVaultView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if VaultMember.objects.filter(user=request.user, role='ADMIN').exists():
            return Response({"error": "You already manage a family vault."}, status=status.HTTP_400_BAD_REQUEST)

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
            description=f"Added {name} to the Lineage Tree.",
            target_id=person.id,
            target_type='PERSON'
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

    def get(self, request):
        from .serializers import UserSerializer
        return Response(UserSerializer(request.user, context={'request': request}).data)

    def patch(self, request):
        user = request.user
        if 'avatar' in request.FILES:
            user.avatar = request.FILES['avatar']
        if 'fullName' in request.data:
            user.full_name = request.data['fullName']
        if 'email' in request.data:
            user.email = request.data['email']
        user.save()

        from .serializers import UserSerializer
        return Response(UserSerializer(user, context={'request': request}).data)

    def put(self, request):
        return self.patch(request)


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


from django.core.validators import validate_email
from django.core.exceptions import ValidationError

class LineagePactRequestView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, vault_id):
        get_object_or_404(VaultMember, vault_id=vault_id, user=request.user)
        pacts = LineagePact.objects.filter(
            Q(requester_vault_id=vault_id) | Q(target_vault_id=vault_id),
            status='PENDING'
        ).order_by('-created_at')
        serializer = LineagePactSerializer(pacts, many=True, context={'view': self})
        return Response(serializer.data)

    def post(self, request, vault_id):
        get_object_or_404(VaultMember, vault_id=vault_id, user=request.user, role='ADMIN')
        target_email = request.data.get('email', '').lower()

        try:
            validate_email(target_email)
        except ValidationError:
            return Response({"error": "Invalid email format."}, status=status.HTTP_400_BAD_REQUEST)

        if target_email == request.user.email:
            return Response({"error": "You cannot pact with yourself."}, status=status.HTTP_400_BAD_REQUEST)

        exists = LineagePact.objects.filter(
            (Q(requester_vault_id=vault_id) & Q(target_vault__members__user__email=target_email)) |
            (Q(target_vault_id=vault_id) & Q(requester_vault__members__user__email=target_email))
        ).exists()

        if exists:
            return Response({"error": "A pact or request already exists with this curator."}, status=status.HTTP_400_BAD_REQUEST)

        target_user = User.objects.filter(email=target_email).first()
        target_member = None
        if target_user:
            target_member = VaultMember.objects.filter(user=target_user, role='ADMIN').first()

        if not target_member:
            send_invite_email_task.delay(str(vault_id), target_email, 'ADMIN', request.user.full_name)
            return Response({"status": "INVITATION_SENT", "message": "User is not a curator yet. Invitation dispatched."}, status=status.HTTP_200_OK)

        LineagePact.objects.create(
            requester_vault_id=vault_id,
            target_vault_id=target_member.vault_id,
            status='PENDING'
        )

        return Response({"status": "PACT_REQUESTED"}, status=status.HTTP_201_CREATED)


class VaultLogsView(generics.ListAPIView):
    serializer_class = ActionLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        vault_id = self.kwargs['vault_id']
        get_object_or_404(VaultMember, vault_id=vault_id, user=self.request.user)
        qs = ActionLog.objects.select_related('user').filter(vault_id=vault_id)

        q = self.request.query_params.get('q')
        if q:
            qs = qs.filter(
                Q(action_type__icontains=q) |
                Q(description__icontains=q) |
                Q(user__full_name__icontains=q)
            )

        return qs.order_by('-created_at')


class ExportLogsView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, vault_id):
        get_object_or_404(VaultMember, vault_id=vault_id, user=request.user)
        task = export_vault_logs_task.delay(str(vault_id), request.user.email)
        return Response({"task_id": task.id, "status": "PROCESSING"}, status=status.HTTP_202_ACCEPTED)

class DownloadLogsView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, vault_id):
        get_object_or_404(VaultMember, vault_id=vault_id, user=request.user, role='ADMIN')
        logs = ActionLog.objects.filter(vault_id=vault_id).order_by('-created_at')

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="vault_registry_{vault_id}.csv"'

        writer = csv.writer(response)
        writer.writerow(['Timestamp', 'User', 'Action', 'Details'])
        for log in logs:
            writer.writerow([log.created_at, log.user.full_name if log.user else "System", log.action_type, log.description])

        return response

class PasswordResetRequestView(views.APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        user = User.objects.filter(email=email).first()
        if user:
            code = f"{random.randint(1000, 9999)}-{random.randint(1000, 9999)}"
            redis_client.setex(f"reset:{email}", 900, code)

            html_msg = f"<h1>Password Recovery</h1><p>Your reset key is: <strong>{code}</strong></p>"
            send_notification_email("Vault Recovery Key", html_msg, f"Key: {code}", email, user.full_name)

        return Response({"status": "SUCCESS", "message": "If the email exists, a key was sent."})

class PasswordResetConfirmView(views.APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        code = request.data.get('code')
        new_password = request.data.get('password')

        stored_code = redis_client.get(f"reset:{email}")
        if stored_code and stored_code.decode('utf-8') == code:
            user = User.objects.get(email=email)
            user.password = make_password(new_password)
            user.save()
            redis_client.delete(f"reset:{email}")
            return Response({"success": True})

        return Response({"error": "Invalid or expired key"}, status=status.HTTP_400_BAD_REQUEST)
