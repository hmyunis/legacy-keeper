from collections import Counter
from datetime import datetime, time
import json
from pathlib import Path

from django.db import transaction
from django.db.models import Count, Exists, Max, Min, OuterRef, Q
from django.db.models.functions import Coalesce
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import decorators, permissions, status, viewsets
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from django.shortcuts import get_object_or_404

from .models import MediaAttachment, MediaFavorite, MediaItem
from .serializers import MAX_UPLOAD_BYTES, MAX_UPLOAD_MB, MediaItemSerializer, resolve_attachment_file_type
from .file_processing import process_uploaded_file_for_storage
from .services import AIProcessingService
from vaults.models import FamilyVault, Membership
from vaults.permissions import IsVaultMember

class MediaItemViewSet(viewsets.ModelViewSet):
    serializer_class = MediaItemSerializer
    permission_classes = [permissions.IsAuthenticated, IsVaultMember]
    filter_backends = ()
    parser_classes = (MultiPartParser, FormParser, JSONParser) # Includes JSON actions like favorite toggle

    def _get_vault_id(self):
        return self.kwargs.get('vault_pk') or self.request.query_params.get('vault')

    def _parse_csv_param(self, *keys):
        for key in keys:
            values = self.request.query_params.getlist(key)
            if not values:
                raw = self.request.query_params.get(key)
                if raw:
                    values = [raw]
            if not values:
                continue

            parsed = []
            for raw_value in values:
                parsed.extend([item.strip() for item in str(raw_value).split(',') if item.strip()])
            if parsed:
                return parsed
        return []

    def _parse_era(self, value):
        if not value:
            return None, None
        token = ''.join(ch for ch in str(value) if ch.isdigit())
        if len(token) < 4:
            return None, None
        start_year = int(token[:4])
        end_year = start_year + 9
        return start_year, end_year

    def _to_aware_datetime(self, value, end=False):
        if not value:
            return None
        day_time = time.max if end else time.min
        combined = datetime.combine(value, day_time)
        if timezone.is_naive(combined):
            return timezone.make_aware(combined)
        return combined

    def _parse_bool(self, value):
        if isinstance(value, bool):
            return value
        if value is None:
            return None

        normalized = str(value).strip().lower()
        if normalized in ('true', '1', 'yes', 'on'):
            return True
        if normalized in ('false', '0', 'no', 'off'):
            return False
        return None

    def _apply_media_filters(self, queryset):
        search = (self.request.query_params.get('search') or '').strip()
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(description__icontains=search)
                | Q(metadata__icontains=search)
                | Q(tags__person__full_name__icontains=search)
            )

        media_types = self._parse_csv_param('mediaType', 'media_type')
        if media_types:
            valid_media_types = {choice[0] for choice in MediaItem.MediaType.choices}
            selected_media_types = [media_type for media_type in media_types if media_type in valid_media_types]
            if selected_media_types:
                queryset = queryset.filter(media_type__in=selected_media_types)

        people = self._parse_csv_param('people', 'person')
        if people:
            queryset = queryset.filter(tags__person__full_name__in=people)

        tags = self._parse_csv_param('tags', 'tag')
        if tags:
            tags_query = Q()
            has_tag_condition = False
            for tag in tags:
                normalized_tag = str(tag).strip()
                if not normalized_tag:
                    continue
                has_tag_condition = True
                tags_query |= Q(metadata__tags__contains=[normalized_tag])
                tags_query |= Q(metadata__icontains=f'"{normalized_tag}"')

            if has_tag_condition:
                queryset = queryset.filter(tags_query)

        locations = self._parse_csv_param('locations', 'location')
        if locations:
            location_query = Q()
            for location in locations:
                location_query |= Q(metadata__location__icontains=location)
            queryset = queryset.filter(location_query)

        era = (self.request.query_params.get('era') or '').strip()
        start_year, end_year = self._parse_era(era)
        if start_year and end_year:
            queryset = queryset.filter(
                Q(date_taken__year__gte=start_year, date_taken__year__lte=end_year)
                | Q(date_taken__isnull=True, created_at__year__gte=start_year, created_at__year__lte=end_year)
            )

        start_date = parse_date(
            (self.request.query_params.get('dateFrom') or self.request.query_params.get('startDate') or '').strip()
        )
        if start_date:
            start_dt = self._to_aware_datetime(start_date, end=False)
            queryset = queryset.filter(
                Q(date_taken__gte=start_dt) | Q(date_taken__isnull=True, created_at__gte=start_dt)
            )

        end_date = parse_date(
            (self.request.query_params.get('dateTo') or self.request.query_params.get('endDate') or '').strip()
        )
        if end_date:
            end_dt = self._to_aware_datetime(end_date, end=True)
            queryset = queryset.filter(
                Q(date_taken__lte=end_dt) | Q(date_taken__isnull=True, created_at__lte=end_dt)
            )

        return queryset

    def _get_upload_vault(self, request):
        vault_id = request.data.get('vault') or self.kwargs.get('vault_pk') or request.query_params.get('vault')
        vault = get_object_or_404(FamilyVault, id=vault_id)

        if not vault.members.filter(user=request.user).exists():
            raise PermissionDenied("You are not a member of this vault.")

        return vault

    def _parse_metadata_payload(self, raw_metadata):
        if raw_metadata in (None, ''):
            return {}

        if isinstance(raw_metadata, dict):
            return dict(raw_metadata)

        if isinstance(raw_metadata, str):
            try:
                parsed = json.loads(raw_metadata)
            except ValueError:
                raise ValidationError({'metadata': ['Metadata must be valid JSON.']})
            if not isinstance(parsed, dict):
                raise ValidationError({'metadata': ['Metadata must be an object.']})
            return parsed

        raise ValidationError({'metadata': ['Metadata must be valid JSON.']})

    def _resolve_media_type(self, uploaded_file, requested_media_type=None):
        valid_media_types = {choice[0] for choice in MediaItem.MediaType.choices}
        normalized_requested = str(requested_media_type or '').strip().upper()
        if normalized_requested in valid_media_types:
            return normalized_requested

        content_type = str(getattr(uploaded_file, 'content_type', '') or '').lower()
        if content_type.startswith('image/'):
            return MediaItem.MediaType.PHOTO
        if content_type.startswith('video/'):
            return MediaItem.MediaType.VIDEO
        return MediaItem.MediaType.DOCUMENT

    def _resolve_primary_file_index(self, uploaded_files):
        preferred_prefixes = ('image/', 'video/', 'audio/')

        for prefix in preferred_prefixes:
            for index, uploaded_file in enumerate(uploaded_files):
                content_type = str(getattr(uploaded_file, 'content_type', '') or '').lower()
                if content_type.startswith(prefix):
                    return index

        return 0

    def _resolve_visibility(self, requested_visibility, vault):
        valid_values = {choice[0] for choice in MediaItem.Visibility.choices}
        normalized_requested = str(requested_visibility or '').strip().upper()
        if normalized_requested in valid_values:
            return normalized_requested

        default_visibility = str(getattr(vault, 'default_visibility', '') or '').strip().upper()
        if default_visibility in valid_values:
            return default_visibility
        return MediaItem.Visibility.FAMILY

    def _process_files_for_vault(self, uploaded_files, vault):
        storage_quality = getattr(vault, 'storage_quality', FamilyVault.StorageQuality.HIGH)
        return [process_uploaded_file_for_storage(file_obj, storage_quality) for file_obj in uploaded_files]

    def _validate_uploaded_files(self, uploaded_files):
        if len(uploaded_files) > 10:
            raise ValidationError({'files': ['You can upload up to 10 files at a time.']})

        for uploaded_file in uploaded_files:
            if uploaded_file.size > MAX_UPLOAD_BYTES:
                raise ValidationError(
                    {'files': [f'"{uploaded_file.name}" is too large. Each file must be <= {MAX_UPLOAD_MB} MB.']}
                )

    def _create_media_item(self, serializer, vault):
        media_item = serializer.save(uploader=self.request.user, vault=vault)
        AIProcessingService().process_media(media_item)
        return media_item

    def _resolve_ordering(self):
        sort_alias = (self.request.query_params.get('sort') or '').strip().lower()
        sort_to_ordering = {
            'newest': '-date_taken',
            'oldest': 'date_taken',
            'title': 'title',
        }
        ordering_from_sort = sort_to_ordering.get(sort_alias)

        raw_ordering = (self.request.query_params.get('ordering') or ordering_from_sort or '-created_at').strip()
        if not raw_ordering:
            raw_ordering = '-created_at'

        allowed_fields = {'created_at', 'sort_date', 'title'}
        aliases = {
            'createdAt': 'created_at',
            'dateTaken': 'sort_date',
            'date_taken': 'sort_date',
        }

        resolved = []
        for token in [item.strip() for item in raw_ordering.split(',') if item.strip()]:
            prefix = '-' if token.startswith('-') else ''
            raw_field = token[1:] if token.startswith('-') else token
            field = aliases.get(raw_field, raw_field)
            if field in allowed_fields:
                resolved.append(f'{prefix}{field}')

        return resolved or ['-created_at']

    def _parse_remove_file_ids(self, request):
        raw = request.data.get('remove_file_ids', request.data.get('removeFileIds'))
        if raw in (None, ''):
            return []

        if isinstance(raw, (list, tuple)):
            return [str(item).strip() for item in raw if str(item).strip()]

        if isinstance(raw, str):
            try:
                parsed = json.loads(raw)
                if isinstance(parsed, list):
                    return [str(item).strip() for item in parsed if str(item).strip()]
            except ValueError:
                pass
            return [item.strip() for item in raw.split(',') if item.strip()]

        return []

    def _parse_new_files(self, request):
        files = []
        for key in ('new_files', 'newFiles', 'files'):
            files.extend(request.FILES.getlist(key))
        return files

    def _extract_update_payload(self, request):
        data = request.data.copy()
        for key in ('remove_file_ids', 'removeFileIds', 'new_files', 'newFiles'):
            if key in data:
                data.pop(key)

        for key in ('date_taken', 'dateTaken'):
            if key in data:
                raw_value = data.get(key)
                if raw_value in ('', 'null', 'None'):
                    data[key] = None

        for key in ('visibility',):
            if key in data:
                raw_value = str(data.get(key) or '').strip().upper()
                if raw_value:
                    data[key] = raw_value
                else:
                    data.pop(key)
        return data

    def _apply_file_mutations(self, media_item, remove_file_ids, new_files):
        if not remove_file_ids and not new_files:
            return media_item

        self._validate_uploaded_files(new_files)

        primary_file_id = f'primary-{media_item.id}'
        # Query attachments directly to avoid stale prefetched relation cache during update flows.
        existing_attachments = list(
            MediaAttachment.objects.filter(media_item=media_item).order_by('created_at', 'id')
        )
        existing_attachment_ids = {str(attachment.id) for attachment in existing_attachments}
        remove_file_id_set = {str(file_id).strip() for file_id in remove_file_ids if str(file_id).strip()}
        remove_primary = primary_file_id in remove_file_id_set
        remove_attachment_ids = remove_file_id_set.intersection(existing_attachment_ids)

        retained_existing_files_count = (0 if remove_primary else 1) + (
            len(existing_attachments) - len(remove_attachment_ids)
        )
        if remove_primary and retained_existing_files_count == 0:
            projected_file_count = len(new_files)
        else:
            projected_file_count = retained_existing_files_count + len(new_files)

        if projected_file_count <= 0:
            raise ValidationError({'removeFileIds': ['At least one file must remain attached to this memory.']})
        if projected_file_count > 10:
            raise ValidationError({'newFiles': ['A memory can contain up to 10 files.']})

        removed_attachments = [attachment for attachment in existing_attachments if str(attachment.id) in remove_attachment_ids]
        retained_attachments = [attachment for attachment in existing_attachments if str(attachment.id) not in remove_attachment_ids]
        pending_new_files = list(new_files)
        metadata = media_item.metadata if isinstance(media_item.metadata, dict) else {}
        next_metadata = dict(metadata)

        if remove_primary:
            if retained_attachments:
                promoted_attachment = retained_attachments.pop(0)
                media_item.file = promoted_attachment.file
                if promoted_attachment.file_type == MediaAttachment.FileType.PHOTO:
                    media_item.media_type = MediaItem.MediaType.PHOTO
                elif promoted_attachment.file_type == MediaAttachment.FileType.VIDEO:
                    media_item.media_type = MediaItem.MediaType.VIDEO
                else:
                    media_item.media_type = MediaItem.MediaType.DOCUMENT
                promoted_name = str(promoted_attachment.original_name or Path(promoted_attachment.file.name).name).strip()
                if promoted_name:
                    next_metadata['primaryFileName'] = promoted_name
                promoted_attachment.delete()
            elif pending_new_files:
                replacement = pending_new_files.pop(0)
                media_item.file = replacement
                media_item.media_type = self._resolve_media_type(replacement)
                next_metadata['primaryFileName'] = replacement.name
            else:
                raise ValidationError({'removeFileIds': ['At least one file must remain attached to this memory.']})

        for attachment in removed_attachments:
            attachment.delete()

        for uploaded_file in pending_new_files:
            mime_type = str(getattr(uploaded_file, 'content_type', '') or '')
            MediaAttachment.objects.create(
                media_item=media_item,
                file=uploaded_file,
                mime_type=mime_type,
                file_type=resolve_attachment_file_type(mime_type),
                original_name=uploaded_file.name,
            )

        next_metadata['fileCount'] = projected_file_count
        media_item.metadata = next_metadata
        remaining_attachments = list(MediaAttachment.objects.filter(media_item=media_item))
        total_size = int(getattr(media_item.file, 'size', 0) or 0) + sum(
            int(attachment.file_size or 0) for attachment in remaining_attachments
        )
        media_item.file_size = total_size
        media_item.content_hash = ''
        update_fields = ['metadata', 'file_size', 'content_hash']
        if remove_primary:
            update_fields.extend(['file', 'media_type'])
        media_item.save(update_fields=update_fields)

        return media_item

    def _update_media_item(self, request, partial=False):
        media_item = self.get_object()
        self._enforce_edit_permissions(media_item)

        remove_file_ids = self._parse_remove_file_ids(request)
        raw_new_files = self._parse_new_files(request)
        new_files = self._process_files_for_vault(raw_new_files, media_item.vault)
        serializer = self.get_serializer(media_item, data=self._extract_update_payload(request), partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        updated_media = serializer.instance
        if remove_file_ids or new_files:
            with transaction.atomic():
                updated_media = self._apply_file_mutations(updated_media, remove_file_ids, new_files)

        # Ensure response serialization does not reuse stale prefetched attachments/tags.
        if hasattr(updated_media, '_prefetched_objects_cache'):
            updated_media._prefetched_objects_cache = {}

        output = self.get_serializer(updated_media)
        return Response(output.data)

    def _get_membership_for_media(self, media_item):
        return Membership.objects.filter(
            vault=media_item.vault,
            user=self.request.user,
            is_active=True,
        ).first()

    def _enforce_edit_permissions(self, media_item):
        membership = self._get_membership_for_media(media_item)
        if not membership:
            raise PermissionDenied("You are not an active member of this vault.")

        if membership.role == Membership.Roles.ADMIN:
            return

        if membership.role == Membership.Roles.VIEWER:
            raise PermissionDenied("Viewers are not allowed to edit media.")

        if membership.role == Membership.Roles.CONTRIBUTOR:
            if media_item.uploader_id != self.request.user.id:
                raise PermissionDenied("Contributors can only edit media they uploaded.")

            safety_window_minutes = max(int(media_item.vault.safety_window_minutes or 0), 0)
            elapsed_minutes = (timezone.now() - media_item.created_at).total_seconds() / 60
            if elapsed_minutes > safety_window_minutes:
                raise PermissionDenied(
                    f"Edit window expired. Contributors can only edit their uploads within {safety_window_minutes} minutes."
                )

    def _enforce_delete_permissions(self, media_item):
        membership = self._get_membership_for_media(media_item)
        if not membership:
            raise PermissionDenied("You are not an active member of this vault.")

        if membership.role == Membership.Roles.VIEWER:
            raise PermissionDenied("Viewers are not allowed to delete media.")

        if membership.role == Membership.Roles.CONTRIBUTOR:
            if media_item.uploader_id != self.request.user.id:
                raise PermissionDenied("Contributors can only delete media they uploaded.")

            safety_window_minutes = max(int(media_item.vault.safety_window_minutes or 0), 0)
            elapsed_minutes = (timezone.now() - media_item.created_at).total_seconds() / 60
            if elapsed_minutes > safety_window_minutes:
                raise PermissionDenied(
                    f"Delete window expired. Contributors can only delete their uploads within {safety_window_minutes} minutes."
                )

    def get_queryset(self):
        vault_pk = self._get_vault_id()

        queryset = MediaItem.objects.filter(
            vault__members__user=self.request.user,
            vault__members__is_active=True,
        ).select_related('uploader', 'vault').prefetch_related('tags__person', 'attachments').annotate(
            sort_date=Coalesce('date_taken', 'created_at')
        )

        favorite_subquery = MediaFavorite.objects.filter(
            user=self.request.user,
            media_item_id=OuterRef('pk'),
        )
        admin_membership_subquery = Membership.objects.filter(
            vault_id=OuterRef('vault_id'),
            user=self.request.user,
            role=Membership.Roles.ADMIN,
            is_active=True,
        )
        queryset = queryset.annotate(
            is_favorite=Exists(favorite_subquery),
            can_view_private=Exists(admin_membership_subquery),
        )

        queryset = queryset.filter(
            Q(visibility=MediaItem.Visibility.FAMILY)
            | Q(uploader=self.request.user)
            | Q(can_view_private=True)
        )

        if vault_pk:
            queryset = queryset.filter(vault_id=vault_pk)

        queryset = self._apply_media_filters(queryset)
        return queryset.order_by(*self._resolve_ordering()).distinct()

    @decorators.action(detail=False, methods=['get'], url_path='favorites')
    def favorites(self, request, *args, **kwargs):
        queryset = self.get_queryset().filter(favorites__user=request.user).distinct()
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @decorators.action(detail=True, methods=['post'], url_path='favorite')
    def favorite(self, request, pk=None):
        media_item = self.get_object()
        requested_state = self._parse_bool(
            request.data.get('is_favorite', request.data.get('isFavorite'))
        )

        currently_favorited = MediaFavorite.objects.filter(
            user=request.user,
            media_item=media_item,
        ).exists()
        is_favorite = (not currently_favorited) if requested_state is None else requested_state

        if is_favorite:
            MediaFavorite.objects.get_or_create(user=request.user, media_item=media_item)
        else:
            MediaFavorite.objects.filter(user=request.user, media_item=media_item).delete()

        return Response(
            {
                'media_id': str(media_item.id),
                'is_favorite': is_favorite,
            },
            status=status.HTTP_200_OK,
        )

    @decorators.action(detail=False, methods=['get'], url_path='filters')
    def filters(self, request, *args, **kwargs):
        queryset = self.get_queryset()

        media_type_rows = (
            queryset.values('media_type')
            .annotate(count=Count('id'))
            .order_by('-count', 'media_type')
        )

        location_rows = (
            queryset.exclude(metadata__location__isnull=True)
            .exclude(metadata__location='')
            .values('metadata__location')
            .annotate(count=Count('id'))
            .order_by('-count', 'metadata__location')[:30]
        )

        date_aggregate = queryset.aggregate(
            min_date_taken=Min('date_taken'),
            max_date_taken=Max('date_taken'),
            min_created=Min('created_at'),
            max_created=Max('created_at'),
        )

        date_start = date_aggregate['min_date_taken'] or date_aggregate['min_created']
        date_end = date_aggregate['max_date_taken'] or date_aggregate['max_created']

        relation_people_rows = (
            queryset.exclude(tags__person__full_name__isnull=True)
            .exclude(tags__person__full_name='')
            .values('tags__person__full_name')
            .annotate(count=Count('id', distinct=True))
            .order_by('-count', 'tags__person__full_name')
        )

        tags_counter = Counter()
        for metadata in queryset.values_list('metadata', flat=True):
            if not isinstance(metadata, dict):
                continue

            raw_tags = metadata.get('tags')
            if isinstance(raw_tags, str):
                parsed_tags = [tag.strip() for tag in raw_tags.split(',') if tag.strip()]
            elif isinstance(raw_tags, list):
                parsed_tags = [str(tag).strip() for tag in raw_tags if str(tag).strip()]
            else:
                parsed_tags = []

            for tag in set(parsed_tags):
                tags_counter[tag] += 1

        era_counter = Counter()
        for date_taken, created_at in queryset.values_list('date_taken', 'created_at'):
            effective_date = date_taken or created_at
            if not effective_date:
                continue
            decade = (effective_date.year // 10) * 10
            era_counter[f'{decade}s'] += 1

        era_rows = [
            {'value': era, 'count': count}
            for era, count in sorted(
                era_counter.items(),
                key=lambda item: int(item[0][:-1]),
                reverse=True,
            )
        ]

        return Response(
            {
                'total_count': queryset.count(),
                'people': [
                    {'value': row['tags__person__full_name'], 'count': row['count']}
                    for row in relation_people_rows[:30]
                ],
                'tags': [
                    {'value': tag, 'count': count}
                    for tag, count in tags_counter.most_common(30)
                ],
                'locations': [
                    {'value': row['metadata__location'], 'count': row['count']}
                    for row in location_rows
                ],
                'eras': era_rows,
                'types': [
                    {'value': row['media_type'], 'count': row['count']}
                    for row in media_type_rows
                ],
                'date_range': {
                    'start': date_start.isoformat() if date_start else None,
                    'end': date_end.isoformat() if date_end else None,
                },
            }
        )

    def perform_create(self, serializer):
        vault = self._get_upload_vault(self.request)
        self._create_media_item(serializer, vault)

    def create(self, request, *args, **kwargs):
        uploaded_files = request.FILES.getlist('files')
        if not uploaded_files:
            single_file = request.FILES.get('file')
            if single_file:
                uploaded_files = [single_file]
            else:
                return super().create(request, *args, **kwargs)

        self._validate_uploaded_files(uploaded_files)

        vault = self._get_upload_vault(request)
        processed_uploaded_files = self._process_files_for_vault(uploaded_files, vault)
        shared_title = str(request.data.get('title') or '').strip()
        shared_description = str(request.data.get('description') or '').strip()
        shared_date_taken = request.data.get('date_taken') or request.data.get('dateTaken')
        shared_metadata = self._parse_metadata_payload(request.data.get('metadata'))
        requested_media_type = request.data.get('media_type') or request.data.get('mediaType')
        requested_visibility = request.data.get('visibility')
        primary_file_index = self._resolve_primary_file_index(uploaded_files)
        primary_source_file = uploaded_files[primary_file_index]
        primary_file = processed_uploaded_files[primary_file_index]

        primary_metadata = dict(shared_metadata)
        primary_metadata.setdefault('primaryFileName', primary_source_file.name)
        primary_metadata.setdefault('fileCount', len(processed_uploaded_files))

        payload = {
            'vault': str(vault.id),
            'file': primary_file,
            'title': shared_title or primary_source_file.name,
            'description': shared_description,
            'media_type': self._resolve_media_type(primary_file, requested_media_type),
            'visibility': self._resolve_visibility(requested_visibility, vault),
            'metadata': primary_metadata,
        }
        if shared_date_taken:
            payload['date_taken'] = shared_date_taken

        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            media_item = serializer.save(uploader=request.user, vault=vault)
            total_size = int(primary_file.size or 0)

            for index, uploaded_file in enumerate(processed_uploaded_files):
                if index == primary_file_index:
                    continue

                original_file_name = uploaded_files[index].name
                mime_type = str(getattr(uploaded_file, 'content_type', '') or '')
                attachment = MediaAttachment.objects.create(
                    media_item=media_item,
                    file=uploaded_file,
                    mime_type=mime_type,
                    file_type=resolve_attachment_file_type(mime_type),
                    original_name=original_file_name,
                )
                total_size += int(attachment.file_size or 0)

            if media_item.file_size != total_size:
                media_item.file_size = total_size
                media_item.save(update_fields=['file_size'])

        AIProcessingService().process_media(media_item)

        output = self.get_serializer(media_item)
        return Response(output.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        return self._update_media_item(request, partial=False)

    def partial_update(self, request, *args, **kwargs):
        return self._update_media_item(request, partial=True)

    def destroy(self, request, *args, **kwargs):
        media_item = self.get_object()
        self._enforce_delete_permissions(media_item)
        return super().destroy(request, *args, **kwargs)
