from django.contrib.auth.hashers import make_password
import random
import redis
import csv
import re
from django.conf import settings
from django.http import HttpResponse
from django.db import transaction
from django.db.models import Q, F
from django.utils import timezone
from rest_framework import status, views, generics
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.core.validators import validate_email
from django.core.exceptions import ValidationError

from .models import Vault, VaultMember, ActionLog, LineagePact, PushSubscription, VaultInvitation, VaultInviteLink, SharedArtifact
from .serializers import CustomTokenObtainPairSerializer, UserSerializer, VaultMemberSerializer, ActionLogSerializer, LineagePactSerializer, VaultInvitationSerializer, VaultInviteLinkSerializer, SharedArtifactSerializer
from core.utils.mail import send_notification_email
from core.vapid import diagnose_vapid_config, send_web_push
from lineage.models import Person
from tasks.governance import send_invite_email_task, export_vault_logs_task

User = get_user_model()

redis_client = redis.from_url(settings.CELERY_BROKER_URL)


def normalize_activation_code(value):
    digits = re.sub(r'\D', '', str(value or ''))[:8]
    if len(digits) != 8:
        return ''
    return f"{digits[:4]}-{digits[4:]}"

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
        user_data = UserSerializer(user, context={'request': request}).data

        return Response({
            "user": user_data,
            "accessToken": str(refresh.access_token),
            "refreshToken": str(refresh)
        }, status=status.HTTP_201_CREATED)


class VerifyEmailView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        code = normalize_activation_code(request.data.get('code'))
        user = request.user

        stored_code = redis_client.get(f"verify:{user.email}")
        if stored_code and normalize_activation_code(stored_code.decode('utf-8')) == code:
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


class LineagePactHistoryView(generics.ListAPIView):
    serializer_class = LineagePactSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        vault_id = self.kwargs['vault_id']
        get_object_or_404(VaultMember, vault_id=vault_id, user=self.request.user)
        return LineagePact.objects.filter(
            Q(target_vault_id=vault_id, status='ACCEPTED') |
            Q(requester_vault_id=vault_id, status='ACCEPTED')
        ).order_by('-created_at')

class LineagePactActionView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, vault_id, pact_id):
        get_object_or_404(VaultMember, vault_id=vault_id, user=request.user, role='ADMIN')
        pact = get_object_or_404(LineagePact, id=pact_id, status='PENDING')
        is_target_vault = str(pact.target_vault_id) == str(vault_id)
        is_requester_vault = str(pact.requester_vault_id) == str(vault_id)
        if not is_target_vault and not is_requester_vault:
            return Response({"error": "This pact is not part of your vault."}, status=status.HTTP_403_FORBIDDEN)

        action = (request.data.get('action') or '').upper()
        if action == 'ACCEPT':
            if not is_target_vault:
                return Response({"error": "Only the receiving vault can accept this pact."}, status=status.HTTP_400_BAD_REQUEST)
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

        if action != 'REJECT':
            return Response({"error": "Invalid action. Use ACCEPT or REJECT."}, status=status.HTTP_400_BAD_REQUEST)

        if is_target_vault:
            log_text = f"Declined Lineage Pact with '{pact.requester_vault.name}'."
            remote_text = f"Lineage Pact was declined by '{pact.target_vault.name}'."
            remote_vault_id = pact.requester_vault_id
        else:
            log_text = f"Revoked outgoing Lineage Pact request to '{pact.target_vault.name}'."
            remote_text = f"Lineage Pact request was revoked by '{pact.requester_vault.name}'."
            remote_vault_id = pact.target_vault_id

        ActionLog.objects.create(
            vault_id=vault_id, user=request.user, action_type='governance',
            description=log_text
        )
        ActionLog.objects.create(
            vault_id=remote_vault_id, user=None, action_type='governance',
            description=remote_text
        )
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

        return Response({"vaultId": str(vault.id), "name": vault.name, "role": "ADMIN"}, status=status.HTTP_201_CREATED)


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
        diagnostics = diagnose_vapid_config()
        config_is_invalid = (
            diagnostics.get("privateKeyIsPlaceholder")
            or diagnostics.get("publicKeyIsPlaceholder")
            or diagnostics.get("privateKeyError")
            or diagnostics.get("privateKeyFormat") == "empty"
            or diagnostics.get("publicKeyLength", 0) < 80
        )
        if config_is_invalid:
            return Response(
                {
                    "error": "Push notifications are not configured on the server. Update the VAPID keys and restart the backend.",
                    "diagnostics": diagnostics,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        sub_info = request.data or {}
        endpoint = sub_info.get('endpoint')
        p256dh = sub_info.get('keys', {}).get('p256dh', '')
        auth = sub_info.get('keys', {}).get('auth', '')

        if not endpoint or not p256dh or not auth:
            return Response({"error": "Invalid push subscription payload."}, status=status.HTTP_400_BAD_REQUEST)

        PushSubscription.objects.update_or_create(
            user=request.user,
            endpoint=endpoint,
            defaults={'p256dh': p256dh, 'auth': auth}
        )
        return Response(status=status.HTTP_201_CREATED)


class PushUnsubscribeView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        endpoint = (request.data or {}).get('endpoint')
        qs = PushSubscription.objects.filter(user=request.user)
        if endpoint:
            qs = qs.filter(endpoint=endpoint)
        deleted_count, _ = qs.delete()
        return Response({"deleted": deleted_count}, status=status.HTTP_200_OK)


class PushStatusView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        has_subscription = PushSubscription.objects.filter(user=request.user).exists()
        return Response({"enabled": has_subscription}, status=status.HTTP_200_OK)


class PushTestView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        subscriptions = PushSubscription.objects.filter(user=request.user)
        if not subscriptions.exists():
            return Response(
                {"error": "No push subscription found for this browser yet."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        push_result = send_web_push(
            request.user,
            "LegacyKeeper Test Notification",
            "This is what a push notification looks like.",
            "/settings?tab=identity",
        )

        # Return 200 OK if at least one active device successfully received the push.
        # Stale or expired devices are cleaned up quietly on the backend during transmission.
        if push_result and push_result.get("sent", 0) > 0:
            return Response(push_result, status=status.HTTP_200_OK)

        # Only return 400 Bad Request if zero notifications were sent successfully
        reason = (push_result or {}).get("error") or "Push notification could not be sent."
        return Response(
            {"error": reason, "diagnostics": diagnose_vapid_config()},
            status=status.HTTP_400_BAD_REQUEST,
        )


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
        email = (request.data.get('email') or '').strip().lower()
        role = (request.data.get('role') or 'VIEWER').strip().upper()

        try:
            validate_email(email)
        except ValidationError:
            return Response({"error": "Invalid email format."}, status=status.HTTP_400_BAD_REQUEST)

        if role not in dict(VaultMember.ROLE_CHOICES):
            return Response({"error": "Invalid role."}, status=status.HTTP_400_BAD_REQUEST)

        if email == request.user.email:
            return Response({"error": "You cannot invite yourself."}, status=status.HTTP_400_BAD_REQUEST)

        existing_user = User.objects.filter(email=email).first()
        if existing_user and VaultMember.objects.filter(vault_id=vault_id, user=existing_user).exists():
            return Response({"error": "This user is already a vault member."}, status=status.HTTP_400_BAD_REQUEST)

        invitation, _ = VaultInvitation.objects.update_or_create(
            vault_id=vault_id,
            email=email,
            defaults={
                'role': role,
                'invited_by': request.user,
                'status': 'PENDING',
                'accepted_at': None,
                'rejected_at': None,
                'revoked_at': None,
            }
        )

        task = send_invite_email_task.delay(str(vault_id), email, role, request.user.full_name)

        ActionLog.objects.create(
            vault_id=vault_id, user=request.user, action_type='governance',
            description=f"Dispatched invitation to {email}."
        )
        return Response({
            "task_id": task.id,
            "status": "PROCESSING",
            "invitation_id": str(invitation.id),
        }, status=status.HTTP_202_ACCEPTED)


class VaultInvitationsListView(generics.ListAPIView):
    serializer_class = VaultInvitationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        vault_id = self.kwargs['vault_id']
        get_object_or_404(VaultMember, vault_id=vault_id, user=self.request.user)
        return VaultInvitation.objects.select_related('vault', 'invited_by').filter(vault_id=vault_id).order_by('-created_at')


class VaultInvitationDetailView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, vault_id, invitation_id):
        invitation = get_object_or_404(VaultInvitation, id=invitation_id, vault_id=vault_id)
        if (request.user.email or '').strip().lower() != invitation.email.lower():
            return Response({"error": "This invitation was not sent to your account."}, status=status.HTTP_403_FORBIDDEN)

        if invitation.status != 'PENDING':
            return Response({"error": f"This invitation has already been {invitation.status.lower()}."}, status=status.HTTP_400_BAD_REQUEST)

        action = (request.data.get('action') or '').strip().upper()
        if action not in {'ACCEPT', 'REJECT'}:
            return Response({"error": "Invalid action. Use ACCEPT or REJECT."}, status=status.HTTP_400_BAD_REQUEST)

        if action == 'ACCEPT':
            membership, created = VaultMember.objects.get_or_create(
                user=request.user,
                vault=invitation.vault,
                defaults={'role': invitation.role}
            )
            if not created and membership.role != 'ADMIN' and membership.role != invitation.role:
                membership.role = invitation.role
                membership.save(update_fields=['role'])

            invitation.status = 'ACCEPTED'
            invitation.accepted_at = timezone.now()
            invitation.rejected_at = None
            invitation.revoked_at = None
            invitation.save(update_fields=['status', 'accepted_at', 'rejected_at', 'revoked_at', 'updated_at'])

            ActionLog.objects.create(
                vault_id=vault_id,
                user=request.user,
                action_type='governance',
                description=f"Accepted invitation to join '{invitation.vault.name}'."
            )
            return Response({
                "status": "ACCEPTED",
                "vaultId": str(invitation.vault_id),
            }, status=status.HTTP_200_OK)

        invitation.status = 'REJECTED'
        invitation.rejected_at = timezone.now()
        invitation.accepted_at = None
        invitation.revoked_at = None
        invitation.save(update_fields=['status', 'rejected_at', 'accepted_at', 'revoked_at', 'updated_at'])

        ActionLog.objects.create(
            vault_id=vault_id,
            user=request.user,
            action_type='governance',
            description=f"Declined invitation to join '{invitation.vault.name}'."
        )
        return Response({"status": "REJECTED"}, status=status.HTTP_200_OK)

    def delete(self, request, vault_id, invitation_id):
        get_object_or_404(VaultMember, vault_id=vault_id, user=request.user, role='ADMIN')
        invitation = get_object_or_404(VaultInvitation, id=invitation_id, vault_id=vault_id)

        invitation.status = 'REVOKED'
        invitation.revoked_at = timezone.now()
        invitation.accepted_at = None
        invitation.rejected_at = None
        invitation.save(update_fields=['status', 'revoked_at', 'accepted_at', 'rejected_at', 'updated_at'])

        ActionLog.objects.create(
            vault_id=vault_id, user=request.user, action_type='governance',
            description=f"Revoked invitation for {invitation.email}."
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


def _invite_link_status(invite_link):
    if invite_link.deleted_at:
        return "DELETED"
    if invite_link.revoked_at:
        return "REVOKED"
    if invite_link.expires_at and invite_link.expires_at <= timezone.now():
        return "EXPIRED"
    if not invite_link.has_capacity():
        return "FULL"
    return "ACTIVE"


class VaultInviteLinkListCreateView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, vault_id):
        get_object_or_404(VaultMember, vault_id=vault_id, user=request.user, role='ADMIN')
        links = VaultInviteLink.objects.select_related('vault', 'created_by').filter(
            vault_id=vault_id,
            deleted_at__isnull=True,
        ).order_by('-created_at')
        return Response(VaultInviteLinkSerializer(links, many=True).data)

    def post(self, request, vault_id):
        get_object_or_404(VaultMember, vault_id=vault_id, user=request.user, role='ADMIN')
        role = (request.data.get('role') or 'VIEWER').strip().upper()
        if role not in {'VIEWER', 'CONTRIBUTOR'}:
            return Response({"error": "Invite links can only grant viewer or contributor access."}, status=status.HTTP_400_BAD_REQUEST)

        max_uses_raw = request.data.get('maxUses', request.data.get('max_uses'))
        max_uses = None
        if max_uses_raw not in (None, ''):
            try:
                max_uses = int(max_uses_raw)
            except (TypeError, ValueError):
                return Response({"error": "Max uses must be a whole number."}, status=status.HTTP_400_BAD_REQUEST)
            if max_uses < 1:
                return Response({"error": "Max uses must be at least 1."}, status=status.HTTP_400_BAD_REQUEST)

        expires_at = None
        expires_at_raw = request.data.get('expiresAt', request.data.get('expires_at'))
        if expires_at_raw not in (None, ''):
            try:
                from dateutil import parser as date_parser
                expires_at = date_parser.parse(str(expires_at_raw))
                if timezone.is_naive(expires_at):
                    expires_at = timezone.make_aware(expires_at)
            except (ValueError, TypeError):
                return Response({"error": "Expiry date is invalid."}, status=status.HTTP_400_BAD_REQUEST)
            if expires_at <= timezone.now():
                return Response({"error": "Expiry date must be in the future."}, status=status.HTTP_400_BAD_REQUEST)

        token = VaultInviteLink.generate_token()
        while VaultInviteLink.objects.filter(token=token).exists():
            token = VaultInviteLink.generate_token()

        invite_link = VaultInviteLink.objects.create(
            vault_id=vault_id,
            token=token,
            role=role,
            max_uses=max_uses,
            expires_at=expires_at,
            created_by=request.user,
        )

        ActionLog.objects.create(
            vault_id=vault_id,
            user=request.user,
            action_type='governance',
            description=f"Generated a {role.lower()} invite link."
        )
        return Response(VaultInviteLinkSerializer(invite_link).data, status=status.HTTP_201_CREATED)


class VaultInviteLinkDetailView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, vault_id, link_id):
        get_object_or_404(VaultMember, vault_id=vault_id, user=request.user, role='ADMIN')
        invite_link = get_object_or_404(VaultInviteLink, id=link_id, vault_id=vault_id, deleted_at__isnull=True)
        action = (request.data.get('action') or '').strip().upper()
        if action != 'REVOKE':
            return Response({"error": "Invalid action."}, status=status.HTTP_400_BAD_REQUEST)

        if not invite_link.revoked_at:
            invite_link.revoked_at = timezone.now()
            invite_link.save(update_fields=['revoked_at', 'updated_at'])
            ActionLog.objects.create(
                vault_id=vault_id,
                user=request.user,
                action_type='governance',
                description="Revoked an invite link."
            )
        return Response(VaultInviteLinkSerializer(invite_link).data)

    def delete(self, request, vault_id, link_id):
        get_object_or_404(VaultMember, vault_id=vault_id, user=request.user, role='ADMIN')
        invite_link = get_object_or_404(VaultInviteLink, id=link_id, vault_id=vault_id, deleted_at__isnull=True)
        invite_link.deleted_at = timezone.now()
        invite_link.revoked_at = invite_link.revoked_at or timezone.now()
        invite_link.save(update_fields=['deleted_at', 'revoked_at', 'updated_at'])
        ActionLog.objects.create(
            vault_id=vault_id,
            user=request.user,
            action_type='governance',
            description="Deleted an invite link."
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class PublicInviteLinkView(views.APIView):
    permission_classes = [AllowAny]

    def get(self, request, token):
        invite_link = get_object_or_404(VaultInviteLink.objects.select_related('vault', 'created_by'), token=token)
        link_status = _invite_link_status(invite_link)
        return Response({
            "token": invite_link.token,
            "vaultId": str(invite_link.vault_id),
            "vaultName": invite_link.vault.name,
            "role": invite_link.role,
            "status": link_status,
            "maxUses": invite_link.max_uses,
            "usesCount": invite_link.uses_count,
            "expiresAt": invite_link.expires_at,
            "createdByName": invite_link.created_by.full_name if invite_link.created_by else None,
        })


class ClaimInviteLinkView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, token):
        if not request.user.is_verified:
            return Response({"error": "Please verify your email before joining a vault."}, status=status.HTTP_403_FORBIDDEN)

        with transaction.atomic():
            invite_link = get_object_or_404(
                VaultInviteLink.objects.select_for_update().select_related('vault'),
                token=token,
            )
            link_status = _invite_link_status(invite_link)
            if link_status != "ACTIVE":
                return Response({"error": f"This invite link is {link_status.lower()}."}, status=status.HTTP_400_BAD_REQUEST)

            membership, created = VaultMember.objects.get_or_create(
                user=request.user,
                vault=invite_link.vault,
                defaults={'role': invite_link.role}
            )
            if not created:
                return Response({
                    "status": "ALREADY_MEMBER",
                    "vaultId": str(invite_link.vault_id),
                    "vaultName": invite_link.vault.name,
                })

            invite_link.uses_count = F('uses_count') + 1
            invite_link.save(update_fields=['uses_count', 'updated_at'])
            invite_link.refresh_from_db(fields=['uses_count'])

            ActionLog.objects.create(
                vault=invite_link.vault,
                user=request.user,
                action_type='governance',
                description=f"Joined via invite link as {invite_link.role}."
            )

        return Response({
            "status": "JOINED",
            "vaultId": str(invite_link.vault_id),
            "vaultName": invite_link.vault.name,
            "role": membership.role,
        }, status=status.HTTP_201_CREATED)


def _user_vault_ids(user):
    if not user or not user.is_authenticated:
        return []
    return list(VaultMember.objects.filter(user=user).values_list('vault_id', flat=True))


def _has_lineage_pact_access(user, vault_id):
    user_vault_ids = _user_vault_ids(user)
    if not user_vault_ids:
        return False
    if any(str(user_vault_id) == str(vault_id) for user_vault_id in user_vault_ids):
        return True
    return LineagePact.objects.filter(
        (
            Q(requester_vault_id=vault_id, target_vault_id__in=user_vault_ids) |
            Q(target_vault_id=vault_id, requester_vault_id__in=user_vault_ids)
        ),
        status='ACCEPTED',
    ).exists()


def _can_authenticated_user_view_share(user, share):
    if not user or not user.is_authenticated:
        return False
    if share.vault_scope == SharedArtifact.SCOPE_ANY_VAULT:
        return VaultMember.objects.filter(user=user).exists()
    if share.vault_scope == SharedArtifact.SCOPE_LINEAGE_PACT:
        return _has_lineage_pact_access(user, share.vault_id)
    return VaultMember.objects.filter(user=user, vault_id=share.vault_id).exists()


def _can_authenticated_user_open_item(user, share):
    if not user or not user.is_authenticated:
        return False
    return VaultMember.objects.filter(user=user, vault_id=share.vault_id).exists()


def _get_share_item(share):
    if share.item_type == SharedArtifact.ITEM_MEMORY:
        from vaults.models import Memory
        return get_object_or_404(Memory, id=share.object_id, vault_id=share.vault_id)
    if share.item_type == SharedArtifact.ITEM_PERSON:
        return get_object_or_404(Person, id=share.object_id, vault_id=share.vault_id)
    raise ValueError("Unsupported share item type.")


def _build_share_redirect_path(share):
    if share.item_type == SharedArtifact.ITEM_MEMORY:
        return f"/museum?vaultId={share.vault_id}&memoryId={share.object_id}"
    if share.item_type == SharedArtifact.ITEM_PERSON:
        return f"/person/{share.object_id}?vaultId={share.vault_id}"
    return "/dashboard"


def _build_share_public_payload(request, share, item):
    if share.item_type == SharedArtifact.ITEM_MEMORY:
        from vaults.serializers import MemorySerializer
        item_data = MemorySerializer(item, context={'request': request}).data
    else:
        from lineage.serializers import PersonSerializer
        from vaults.models import Memory
        item_data = PersonSerializer(item, context={'request': request}).data
        memory_count = Memory.objects.filter(
            Q(detected_faces__person=item) | Q(identified_people=item)
        ).distinct().count()
        item_data.update({
            "vaultId": str(item.vault_id),
            "vaultName": item.vault.name,
            "memoryCount": memory_count,
        })

    return {
        "mode": "public",
        "token": share.token,
        "itemType": share.item_type,
        "vaultId": str(share.vault_id),
        "vaultName": share.vault.name,
        "audience": share.audience,
        "vaultScope": share.vault_scope,
        "item": item_data,
        "redirectPath": _build_share_redirect_path(share),
    }


class SharedArtifactCreateView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        item_type = (request.data.get('itemType') or request.data.get('item_type') or '').strip().upper()
        object_id = request.data.get('itemId') or request.data.get('object_id')
        vault_id = request.data.get('vaultId') or request.data.get('vault_id')
        audience = (request.data.get('audience') or SharedArtifact.AUDIENCE_PUBLIC).strip().upper()
        vault_scope = (request.data.get('vaultScope') or request.data.get('vault_scope') or SharedArtifact.SCOPE_SAME_VAULT).strip().upper()

        if item_type not in dict(SharedArtifact.ITEM_TYPE_CHOICES):
            return Response({"error": "Unsupported share item type."}, status=status.HTTP_400_BAD_REQUEST)
        if audience not in dict(SharedArtifact.AUDIENCE_CHOICES):
            return Response({"error": "Unsupported share audience."}, status=status.HTTP_400_BAD_REQUEST)
        if vault_scope not in dict(SharedArtifact.VAULT_SCOPE_CHOICES):
            return Response({"error": "Unsupported vault access scope."}, status=status.HTTP_400_BAD_REQUEST)
        if not vault_id or not object_id:
            return Response({"error": "vaultId and itemId are required."}, status=status.HTTP_400_BAD_REQUEST)

        get_object_or_404(VaultMember, vault_id=vault_id, user=request.user)

        if item_type == SharedArtifact.ITEM_MEMORY:
            from vaults.models import Memory
            get_object_or_404(Memory, id=object_id, vault_id=vault_id)
        else:
            get_object_or_404(Person, id=object_id, vault_id=vault_id)

        token = SharedArtifact.generate_token()
        while SharedArtifact.objects.filter(token=token).exists():
            token = SharedArtifact.generate_token()

        share = SharedArtifact.objects.create(
            vault_id=vault_id,
            token=token,
            item_type=item_type,
            object_id=object_id,
            audience=audience,
            vault_scope=vault_scope,
            created_by=request.user,
        )

        ActionLog.objects.create(
            vault_id=vault_id,
            user=request.user,
            action_type='share',
            description=f"Created a share link for {item_type.lower()} {object_id}.",
            target_id=object_id,
            target_type=item_type,
        )
        return Response(SharedArtifactSerializer(share).data, status=status.HTTP_201_CREATED)


class SharedArtifactResolveView(views.APIView):
    permission_classes = [AllowAny]

    def get(self, request, token):
        share = get_object_or_404(
            SharedArtifact.objects.select_related('vault', 'created_by'),
            token=token,
            revoked_at__isnull=True,
        )
        item = _get_share_item(share)

        if request.user.is_authenticated:
            if _can_authenticated_user_open_item(request.user, share):
                return Response({
                    "mode": "redirect",
                    "redirectPath": _build_share_redirect_path(share),
                    "vaultId": str(share.vault_id),
                    "itemType": share.item_type,
                    "itemId": str(share.object_id),
                })
            if share.audience == SharedArtifact.AUDIENCE_PUBLIC or _can_authenticated_user_view_share(request.user, share):
                return Response(_build_share_public_payload(request, share, item))
            if share.audience != SharedArtifact.AUDIENCE_PUBLIC:
                return Response({"error": "This share is not available to your vault."}, status=status.HTTP_403_FORBIDDEN)
            return Response(_build_share_public_payload(request, share, item))

        if share.audience != SharedArtifact.AUDIENCE_PUBLIC:
            return Response({
                "error": "Sign in to open this share.",
                "requiresAuth": True,
            }, status=status.HTTP_401_UNAUTHORIZED)

        return Response(_build_share_public_payload(request, share, item))


class RemoveMemberView(views.APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, vault_id, member_id):
        get_object_or_404(VaultMember, vault_id=vault_id, user=request.user, role='ADMIN')
        member_to_remove = get_object_or_404(VaultMember, id=member_id, vault_id=vault_id)

        if member_to_remove.role == 'ADMIN':
            return Response({"error": "Cannot remove a Vault Admin."}, status=status.HTTP_400_BAD_REQUEST)

        if member_to_remove.user_id == request.user.id:
            return Response({"error": "You cannot remove yourself from the vault."}, status=status.HTTP_400_BAD_REQUEST)

        member_name = member_to_remove.user.full_name
        member_to_remove.delete()

        ActionLog.objects.create(
            vault_id=vault_id, user=request.user, action_type='governance',
            description=f"Revoked vault access for {member_name}."
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


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
        current_vault = get_object_or_404(Vault, id=vault_id)
        target_email = (request.data.get('email') or '').strip().lower()

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
            if target_member and str(target_member.vault_id) == str(vault_id):
                return Response({"error": "This curator already administers your vault."}, status=status.HTTP_400_BAD_REQUEST)

        if not target_member:
            return Response(
                {"error": "This email does not belong to an admin of a vault."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        pact = LineagePact.objects.create(
            requester_vault_id=vault_id,
            target_vault_id=target_member.vault_id,
            status='PENDING'
        )
        ActionLog.objects.create(
            vault_id=vault_id, user=request.user, action_type='governance',
            description=f"Requested Lineage Pact with '{target_member.vault.name}'."
        )
        ActionLog.objects.create(
            vault_id=target_member.vault_id, user=None, action_type='governance',
            description=f"Received Lineage Pact request from '{current_vault.name}'."
        )

        return Response({"status": "PACT_REQUESTED", "pact_id": str(pact.id)}, status=status.HTTP_201_CREATED)


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
