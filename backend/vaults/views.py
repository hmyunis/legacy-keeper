from collections import defaultdict

from rest_framework import viewsets, permissions, status, decorators, exceptions
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import transaction, IntegrityError
from django.db.models import Q, Sum, Value, BigIntegerField
from django.db.models.functions import Coalesce
from django.utils import timezone

from .models import FamilyVault, Membership, Invite
from .serializers import (
    FamilyVaultSerializer, 
    MembershipSerializer, 
    InviteCreateSerializer, 
    InviteProcessSerializer
)
from .permissions import IsVaultAdmin
from core.services import EmailService
from django.conf import settings
from media.models import MediaItem
from genealogy.models import MediaTag

class FamilyVaultViewSet(viewsets.ModelViewSet):
    """
    CRUD for Vaults. 
    Queryset is filtered to only show vaults user is a member of.
    """
    serializer_class = FamilyVaultSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ('update', 'partial_update', 'destroy'):
            return [permissions.IsAuthenticated(), IsVaultAdmin()]
        return [permission() for permission in self.permission_classes]

    def get_queryset(self):
        return (
            FamilyVault.objects.filter(
                members__user=self.request.user,
                members__is_active=True,
            )
            .annotate(
                storage_used_bytes=Coalesce(
                    Sum('media_items__file_size'),
                    Value(0),
                    output_field=BigIntegerField(),
                )
            )
        )

    def perform_create(self, serializer):
        # Atomic transaction to create vault AND admin membership
        with transaction.atomic():
            vault = serializer.save(owner=self.request.user)
            Membership.objects.create(
                user=self.request.user,
                vault=vault,
                role=Membership.Roles.ADMIN
            )

    def _absolute_media_url(self, item):
        if not item.file:
            return None
        request = self.request
        url = item.file.url
        return request.build_absolute_uri(url) if request else url

    def _normalize_metadata_tags(self, raw_tags):
        if isinstance(raw_tags, str):
            raw_tags = [tag.strip() for tag in raw_tags.split(',') if tag.strip()]
        if not isinstance(raw_tags, list):
            return []
        return [str(tag).strip() for tag in raw_tags if str(tag).strip()]

    def _resolve_duplicate_groups(self, vault, selected_hashes=None):
        media_items = list(
            MediaItem.objects.filter(vault=vault)
            .only(
                'id',
                'title',
                'description',
                'date_taken',
                'metadata',
                'file',
                'file_size',
                'content_hash',
                'created_at',
            )
            .order_by('created_at', 'id')
        )

        for item in media_items:
            if item.content_hash:
                continue
            computed_hash = item.ensure_content_hash(persist=True)
            if computed_hash:
                item.content_hash = computed_hash

        grouped = defaultdict(list)
        for item in media_items:
            if not item.content_hash:
                continue
            if selected_hashes and item.content_hash not in selected_hashes:
                continue
            grouped[item.content_hash].append(item)

        duplicate_groups = []
        for content_hash, items in grouped.items():
            if len(items) < 2:
                continue

            primary = items[0]
            duplicates = items[1:]
            reclaimable_bytes = sum(int(duplicate.file_size or 0) for duplicate in duplicates)
            duplicate_groups.append(
                {
                    'hash': content_hash,
                    'primary': primary,
                    'duplicates': duplicates,
                    'reclaimable_bytes': reclaimable_bytes,
                }
            )

        duplicate_groups.sort(key=lambda group: group['reclaimable_bytes'], reverse=True)
        return duplicate_groups, len(media_items)

    def _serialize_duplicate_group(self, group):
        primary = group['primary']
        duplicates = group['duplicates']

        return {
            'hash': group['hash'],
            'reclaimable_bytes': group['reclaimable_bytes'],
            'duplicate_count': len(duplicates),
            'primary': {
                'id': str(primary.id),
                'title': primary.title or 'Untitled memory',
                'file_size': int(primary.file_size or 0),
                'created_at': primary.created_at,
                'file_url': self._absolute_media_url(primary),
            },
            'duplicates': [
                {
                    'id': str(item.id),
                    'title': item.title or 'Untitled memory',
                    'file_size': int(item.file_size or 0),
                    'created_at': item.created_at,
                    'file_url': self._absolute_media_url(item),
                }
                for item in duplicates
            ],
        }

    def _merge_duplicate_into_primary(self, primary, duplicate):
        primary_metadata = primary.metadata if isinstance(primary.metadata, dict) else {}
        duplicate_metadata = duplicate.metadata if isinstance(duplicate.metadata, dict) else {}
        updated_metadata = dict(primary_metadata)

        primary_tags = self._normalize_metadata_tags(primary_metadata.get('tags'))
        duplicate_tags = self._normalize_metadata_tags(duplicate_metadata.get('tags'))
        merged_tags = sorted(set(primary_tags + duplicate_tags))
        if merged_tags:
            updated_metadata['tags'] = merged_tags

        primary_location = str(primary_metadata.get('location') or '').strip()
        duplicate_location = str(duplicate_metadata.get('location') or '').strip()
        if not primary_location and duplicate_location:
            updated_metadata['location'] = duplicate_location

        changed_fields = []
        if updated_metadata != primary_metadata:
            primary.metadata = updated_metadata
            changed_fields.append('metadata')

        if (not primary.title or primary.title.lower().startswith('untitled')) and duplicate.title:
            primary.title = duplicate.title
            changed_fields.append('title')

        if (not primary.description) and duplicate.description:
            primary.description = duplicate.description
            changed_fields.append('description')

        if primary.date_taken is None and duplicate.date_taken is not None:
            primary.date_taken = duplicate.date_taken
            changed_fields.append('date_taken')

        if changed_fields:
            primary.save(update_fields=list(set(changed_fields)))

        duplicate_tags_qs = MediaTag.objects.filter(media_item=duplicate).only(
            'id',
            'media_item_id',
            'person_id',
            'face_coordinates',
            'created_by_id',
        )
        for tag in duplicate_tags_qs:
            exists = MediaTag.objects.filter(media_item=primary, person_id=tag.person_id).exists()
            if exists:
                tag.delete()
                continue
            tag.media_item = primary
            try:
                tag.save(update_fields=['media_item'])
            except IntegrityError:
                tag.delete()

    @decorators.action(detail=True, methods=['get'], url_path='health-analysis', permission_classes=[IsVaultAdmin])
    def health_analysis(self, request, pk=None):
        vault = self.get_object()
        duplicate_groups, total_items = self._resolve_duplicate_groups(vault)

        duplicate_count = sum(len(group['duplicates']) for group in duplicate_groups)
        reclaimable_bytes = sum(group['reclaimable_bytes'] for group in duplicate_groups)

        return Response(
            {
                'vault_id': str(vault.id),
                'generated_at': timezone.now(),
                'total_items': total_items,
                'duplicate_groups_count': len(duplicate_groups),
                'duplicate_items_count': duplicate_count,
                'reclaimable_bytes': reclaimable_bytes,
                'groups': [self._serialize_duplicate_group(group) for group in duplicate_groups[:100]],
            }
        )

    @decorators.action(detail=True, methods=['post'], url_path='cleanup-redundant', permission_classes=[IsVaultAdmin])
    def cleanup_redundant(self, request, pk=None):
        vault = self.get_object()
        raw_hashes = request.data.get('groupHashes') or []
        selected_hashes = {str(value).strip() for value in raw_hashes if str(value).strip()}

        dry_run_raw = request.data.get('dryRun', False)
        dry_run = str(dry_run_raw).strip().lower() in ('true', '1', 'yes')

        duplicate_groups, _ = self._resolve_duplicate_groups(
            vault,
            selected_hashes=selected_hashes if selected_hashes else None,
        )

        duplicate_count = sum(len(group['duplicates']) for group in duplicate_groups)
        reclaimable_bytes = sum(group['reclaimable_bytes'] for group in duplicate_groups)

        if dry_run:
            return Response(
                {
                    'dry_run': True,
                    'groups_selected': len(duplicate_groups),
                    'duplicate_items_count': duplicate_count,
                    'reclaimable_bytes': reclaimable_bytes,
                    'groups': [self._serialize_duplicate_group(group) for group in duplicate_groups[:100]],
                }
            )

        deleted_items = 0
        recovered_bytes = 0

        with transaction.atomic():
            for group in duplicate_groups:
                primary = group['primary']
                for duplicate in group['duplicates']:
                    self._merge_duplicate_into_primary(primary, duplicate)
                    recovered_bytes += int(duplicate.file_size or 0)
                    duplicate.delete()
                    deleted_items += 1

        remaining_groups, _ = self._resolve_duplicate_groups(vault)

        return Response(
            {
                'dry_run': False,
                'groups_processed': len(duplicate_groups),
                'deleted_items_count': deleted_items,
                'recovered_bytes': recovered_bytes,
                'remaining_duplicate_groups': len(remaining_groups),
                'message': 'Redundant files cleanup completed.',
            }
        )

    @decorators.action(detail=True, methods=['post'], permission_classes=[IsVaultAdmin])
    def invite(self, request, pk=None):
        """Generate an invite link"""
        vault = self.get_object()
        serializer = InviteCreateSerializer(data=request.data)
        if serializer.is_valid():
            invite_email = serializer.validated_data.get('email')
            normalized_email = invite_email.strip().lower() if invite_email else None

            if normalized_email:
                already_member = Membership.objects.filter(
                    vault=vault,
                    user__email__iexact=normalized_email,
                    is_active=True,
                ).exists()
                if already_member:
                    return Response(
                        {"error": "User is already an active member of this vault"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                existing_invite = Invite.objects.filter(
                    vault=vault,
                    email__iexact=normalized_email,
                    is_used=False,
                    expires_at__gt=timezone.now(),
                ).first()
                if existing_invite:
                    return Response(
                        {"error": "An active invite already exists for this email"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            invite = serializer.save(
                vault=vault,
                created_by=request.user,
                email=normalized_email or invite_email,
            )
            
            # Construct Link
            join_link = f"{settings.FRONTEND_URL}/join/{invite.token}"
            
            # Send Email if address provided
            if invite.email:
                email_service = EmailService()
                email_service.send_basic_email(
                    to_email=invite.email,
                    subject=f"Join {vault.name} Family Vault",
                    html_content=f"<p>You have been invited to join the <strong>{vault.name}</strong> vault.</p><p><a href='{join_link}'>Click here to join</a></p>"
                )

            return Response({
                "message": "Invite generated",
                "link": join_link,
                "token": invite.token
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @decorators.action(detail=True, methods=['post'])
    def leave(self, request, pk=None):
        """Allow a member to leave a vault, with owner and last-admin safeguards."""
        vault = self.get_object()
        membership = Membership.objects.filter(
            vault=vault,
            user=request.user,
            is_active=True,
        ).first()

        if not membership:
            return Response(
                {"error": "Not an active member of this vault"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if vault.owner_id == request.user.id:
            return Response(
                {"error": "Vault owner cannot leave. Transfer ownership first."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if membership.role == Membership.Roles.ADMIN:
            admin_count = Membership.objects.filter(
                vault=vault,
                role=Membership.Roles.ADMIN,
                is_active=True,
            ).count()
            if admin_count <= 1:
                return Response(
                    {"error": "Cannot leave as the last vault admin"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        membership.delete()
        return Response({"message": "Left vault successfully"}, status=status.HTTP_200_OK)

    @decorators.action(detail=True, methods=['post'], url_path='transfer-ownership')
    def transfer_ownership(self, request, pk=None):
        """Allow the current owner to transfer vault ownership to another active member."""
        vault = self.get_object()

        if vault.owner_id != request.user.id:
            raise exceptions.PermissionDenied("Only vault owner can transfer ownership")

        membership_id = request.data.get('membershipId')
        if not membership_id:
            return Response(
                {"membershipId": ["This field is required."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        membership = Membership.objects.filter(
            id=membership_id,
            vault=vault,
            is_active=True,
        ).select_related('user').first()

        if not membership:
            return Response(
                {"error": "Target member not found in this vault"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if membership.user_id == request.user.id:
            return Response(
                {"error": "You already own this vault"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            if membership.role != Membership.Roles.ADMIN:
                membership.role = Membership.Roles.ADMIN
                membership.save(update_fields=['role'])

            vault.owner = membership.user
            vault.save(update_fields=['owner'])

        return Response(
            {"message": "Ownership transferred successfully", "ownerId": membership.user_id},
            status=status.HTTP_200_OK,
        )

class MembershipViewSet(viewsets.GenericViewSet):
    """
    List and remove members of a specific vault.
    URL: /api/vaults/{vault_pk}/members/
    """
    serializer_class = MembershipSerializer
    permission_classes = [permissions.IsAuthenticated]

    def _ensure_request_user_is_member(self, vault_pk):
        if not Membership.objects.filter(
            vault_id=vault_pk,
            user=self.request.user,
            is_active=True,
        ).exists():
            raise exceptions.PermissionDenied("Not a member of this vault")

    def _ensure_request_user_is_admin(self, vault_pk):
        if not Membership.objects.filter(
            vault_id=vault_pk,
            user=self.request.user,
            role=Membership.Roles.ADMIN,
            is_active=True,
        ).exists():
            raise exceptions.PermissionDenied("Vault admin access required")

    def get_queryset(self):
        vault_pk = self.kwargs['vault_pk']
        self._ensure_request_user_is_member(vault_pk)
        return Membership.objects.filter(vault_id=vault_pk).select_related('user').order_by('-created_at')

    def _parse_is_active_filter(self):
        is_active_value = self.request.query_params.get('is_active')
        if is_active_value is None:
            is_active_value = self.request.query_params.get('isActive')
        if is_active_value is None:
            return None

        normalized = str(is_active_value).strip().lower()
        if normalized in ('true', '1', 'yes'):
            return True
        if normalized in ('false', '0', 'no'):
            return False
        return None

    def _pending_display_name(self, email):
        if not email:
            return "Pending Invite"

        local_part = email.split('@')[0].replace('.', ' ').replace('_', ' ').strip()
        return local_part.title() if local_part else "Pending Invite"

    def list(self, request, *args, **kwargs):
        vault_pk = self.kwargs['vault_pk']
        queryset = self.get_queryset()

        search_query = (request.query_params.get('search') or '').strip()
        if search_query:
            queryset = queryset.filter(
                Q(user__full_name__icontains=search_query) |
                Q(user__email__icontains=search_query)
            )

        role = (request.query_params.get('role') or '').strip().upper()
        if role in dict(Membership.Roles.choices):
            queryset = queryset.filter(role=role)

        status_filter = self._parse_is_active_filter()
        if status_filter is not None:
            queryset = queryset.filter(is_active=status_filter)

        membership_rows = [
            {
                "id": str(member.id),
                "user": {
                    "id": str(member.user_id),
                    "full_name": member.user.full_name,
                    "email": member.user.email,
                    "avatar": member.user.avatar.url if member.user.avatar else None,
                },
                "role": member.role,
                "created_at": member.created_at,
                "is_active": member.is_active,
                "source": "membership",
            }
            for member in queryset
        ]

        include_pending_invites = status_filter is not True and Membership.objects.filter(
            vault_id=vault_pk,
            user=request.user,
            role=Membership.Roles.ADMIN,
            is_active=True,
        ).exists()

        invite_rows = []
        if include_pending_invites:
            invites = Invite.objects.filter(
                vault_id=vault_pk,
                is_used=False,
                expires_at__gt=timezone.now(),
            ).order_by('-created_at')

            if search_query:
                invites = invites.filter(email__icontains=search_query)
            if role in dict(Membership.Roles.choices):
                invites = invites.filter(role=role)

            invite_rows = [
                {
                    "id": f"invite_{invite.id}",
                    "user": {
                        "id": f"invite_user_{invite.id}",
                        "full_name": self._pending_display_name(invite.email),
                        "email": invite.email or "",
                        "avatar": None,
                    },
                    "role": invite.role,
                    "created_at": invite.created_at,
                    "is_active": False,
                    "source": "invite",
                }
                for invite in invites
            ]

        records = membership_rows + invite_rows
        records.sort(key=lambda item: item["created_at"], reverse=True)

        page = self.paginate_queryset(records)
        if page is not None:
            return self.get_paginated_response(page)

        return Response(records)

    def destroy(self, request, *args, **kwargs):
        vault_pk = self.kwargs['vault_pk']
        self._ensure_request_user_is_admin(vault_pk)

        member_id = str(self.kwargs['pk'])
        if member_id.startswith('invite_'):
            invite_pk = member_id.replace('invite_', '', 1)
            if not invite_pk.isdigit():
                return Response(status=status.HTTP_404_NOT_FOUND)

            invite = get_object_or_404(
                Invite,
                id=invite_pk,
                vault_id=vault_pk,
                is_used=False,
            )
            invite.is_used = True
            invite.save(update_fields=['is_used'])
            return Response(status=status.HTTP_204_NO_CONTENT)

        membership = get_object_or_404(
            Membership,
            id=member_id,
            vault_id=vault_pk,
            is_active=True,
        )

        if membership.user_id == membership.vault.owner_id:
            return Response(
                {"error": "Cannot remove vault owner membership"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if membership.role == Membership.Roles.ADMIN:
            admin_count = Membership.objects.filter(
                vault_id=vault_pk,
                role=Membership.Roles.ADMIN,
                is_active=True,
            ).count()
            if admin_count <= 1:
                return Response(
                    {"error": "Cannot remove the last vault admin"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        membership.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def partial_update(self, request, *args, **kwargs):
        vault_pk = self.kwargs['vault_pk']
        self._ensure_request_user_is_admin(vault_pk)

        role = (request.data.get('role') or '').strip().upper()
        if role not in dict(Membership.Roles.choices):
            return Response(
                {"role": ["Role must be one of ADMIN, CONTRIBUTOR, VIEWER."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        member_id = str(self.kwargs['pk'])
        if member_id.startswith('invite_'):
            invite_pk = member_id.replace('invite_', '', 1)
            if not invite_pk.isdigit():
                return Response(status=status.HTTP_404_NOT_FOUND)

            invite = get_object_or_404(
                Invite,
                id=invite_pk,
                vault_id=vault_pk,
                is_used=False,
                expires_at__gt=timezone.now(),
            )

            if invite.role != role:
                invite.role = role
                invite.save(update_fields=['role'])

            return Response(
                {
                    "id": f"invite_{invite.id}",
                    "user": {
                        "id": f"invite_user_{invite.id}",
                        "full_name": self._pending_display_name(invite.email),
                        "email": invite.email or "",
                        "avatar": None,
                    },
                    "role": invite.role,
                    "created_at": invite.created_at,
                    "is_active": False,
                    "source": "invite",
                },
                status=status.HTTP_200_OK,
            )

        membership = get_object_or_404(
            Membership.objects.select_related('vault', 'user'),
            id=member_id,
            vault_id=vault_pk,
            is_active=True,
        )

        if membership.user_id == membership.vault.owner_id and role != Membership.Roles.ADMIN:
            return Response(
                {"error": "Vault owner must retain ADMIN role"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if membership.role == Membership.Roles.ADMIN and role != Membership.Roles.ADMIN:
            admin_count = Membership.objects.filter(
                vault_id=vault_pk,
                role=Membership.Roles.ADMIN,
                is_active=True,
            ).count()
            if admin_count <= 1:
                return Response(
                    {"error": "Cannot demote the last vault admin"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if membership.role != role:
            membership.role = role
            membership.save(update_fields=['role'])

        return Response(
            {
                "id": str(membership.id),
                "user": {
                    "id": str(membership.user_id),
                    "full_name": membership.user.full_name,
                    "email": membership.user.email,
                    "avatar": membership.user.avatar.url if membership.user.avatar else None,
                },
                "role": membership.role,
                "created_at": membership.created_at,
                "is_active": membership.is_active,
                "source": "membership",
            },
            status=status.HTTP_200_OK,
        )

class JoinVaultView(viewsets.GenericViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = InviteProcessSerializer

    @decorators.action(detail=False, methods=['post'])
    def process(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        token = serializer.validated_data['token']

        invite = get_object_or_404(Invite, token=token)

        if not invite.is_valid():
            return Response({"error": "Invite expired or used"}, status=status.HTTP_400_BAD_REQUEST)

        if invite.email and invite.email.lower() != request.user.email.lower():
            return Response(
                {"error": "This invite is restricted to a different email address"},
                status=status.HTTP_403_FORBIDDEN,
            )

        membership = Membership.objects.filter(user=request.user, vault=invite.vault).first()
        vault_payload = {
            "vaultId": invite.vault.id,
            "vaultName": invite.vault.name,
            "role": invite.role,
        }
        if membership and membership.is_active:
            return Response(
                {
                    "message": "You are already a member of this vault",
                    **vault_payload,
                    "role": membership.role,
                    "alreadyMember": True,
                },
                status=status.HTTP_200_OK,
            )

        if membership:
            membership.is_active = True
            membership.role = invite.role
            membership.save(update_fields=['is_active', 'role'])
        else:
            Membership.objects.create(
                user=request.user,
                vault=invite.vault,
                role=invite.role
            )

        # Mark used if it was a single-use email invite
        if invite.email:
            invite.is_used = True
            invite.save()

        return Response(
            {
                "message": "Joined vault successfully",
                **vault_payload,
                "alreadyMember": False,
            },
            status=status.HTTP_200_OK,
        )
