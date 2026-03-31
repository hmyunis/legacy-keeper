from collections import Counter
from datetime import datetime, time
from io import BytesIO
import json
import mimetypes
from pathlib import Path

from django.contrib.auth import get_user_model
from django.db import connection, transaction
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db.models import Count, Exists, Max, Min, OuterRef, Q, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from rest_framework import decorators, permissions, status, viewsets
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from django.shortcuts import get_object_or_404
from PIL import Image, ImageOps, UnidentifiedImageError

from .models import MediaAttachment, MediaFavorite, MediaItem, MediaItemLockTarget
from .serializers import MAX_UPLOAD_BYTES, MAX_UPLOAD_MB, MediaItemSerializer, resolve_attachment_file_type
from .file_processing import process_uploaded_file_for_storage
from .natural_language_search import parse_natural_language_query
from .services import AIProcessingService
from core.storage_urls import build_storage_path_url
from vaults.models import FamilyVault, Membership
from vaults.permissions import IsVaultMember


class MediaItemViewSet(viewsets.ModelViewSet):
    serializer_class = MediaItemSerializer
    permission_classes = [permissions.IsAuthenticated, IsVaultMember]
    filter_backends = ()
    parser_classes = (MultiPartParser, FormParser, JSONParser) # Includes JSON actions like favorite toggle
    USER_UPLOAD_QUOTA_BYTES = 10 * 1024 * 1024 * 1024
    USER_UPLOAD_QUOTA_LABEL = '10 GB'
    IMAGE_EXTENSIONS = {
        '.jpg',
        '.jpeg',
        '.png',
        '.webp',
        '.gif',
        '.bmp',
        '.tif',
        '.tiff',
        '.avif',
        '.heic',
        '.heif',
    }
    VIDEO_EXTENSIONS = {'.mp4', '.mov', '.webm', '.mkv', '.avi', '.m4v', '.mpeg', '.mpg'}
    AUDIO_EXTENSIONS = {'.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'}

    def _extract_file_extension(self, file_name):
        token = str(file_name or '').strip().lower()
        if not token:
            return ''
        return Path(token).suffix.lower()

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

    def _supports_json_contains_lookup(self):
        return bool(getattr(connection.features, 'supports_json_field_contains', False))

    def _build_tag_lookup_query(self, tag_value):
        normalized_tag = str(tag_value or '').strip()
        if not normalized_tag:
            return Q()

        query = Q(metadata__icontains=f'"{normalized_tag}"')
        if self._supports_json_contains_lookup():
            query |= Q(metadata__tags__contains=[normalized_tag])
        return query

    def _apply_search_keyword_terms(self, queryset, terms):
        for term in terms:
            token = str(term).strip()
            if not token:
                continue
            query = (
                Q(title__icontains=token)
                | Q(description__icontains=token)
                | Q(metadata__icontains=token)
                | Q(tags__person__full_name__icontains=token)
            )
            queryset = queryset.filter(query)
        return queryset

    def _apply_date_bounds(self, queryset, start_date=None, end_date=None):
        if start_date:
            start_dt = self._to_aware_datetime(start_date, end=False)
            queryset = queryset.filter(
                Q(date_taken__gte=start_dt) | Q(date_taken__isnull=True, created_at__gte=start_dt)
            )
        if end_date:
            end_dt = self._to_aware_datetime(end_date, end=True)
            queryset = queryset.filter(
                Q(date_taken__lte=end_dt) | Q(date_taken__isnull=True, created_at__lte=end_dt)
            )
        return queryset

    def _apply_media_filters(self, queryset):
        search = (self.request.query_params.get('search') or '').strip()
        parsed_search = parse_natural_language_query(search) if search else None

        if search:
            has_structured_terms = bool(
                parsed_search
                and (
                    parsed_search.media_types
                    or parsed_search.people_terms
                    or parsed_search.tag_terms
                    or parsed_search.location_terms
                    or parsed_search.date_from
                    or parsed_search.date_to
                )
            )
            keyword_terms = parsed_search.keyword_terms if parsed_search else ()
            if keyword_terms:
                queryset = self._apply_search_keyword_terms(queryset, keyword_terms)
            elif not has_structured_terms:
                queryset = queryset.filter(
                    Q(title__icontains=search)
                    | Q(description__icontains=search)
                    | Q(metadata__icontains=search)
                    | Q(tags__person__full_name__icontains=search)
                )

            if parsed_search:
                if parsed_search.media_types:
                    queryset = queryset.filter(media_type__in=parsed_search.media_types)

                for person_term in parsed_search.people_terms:
                    queryset = queryset.filter(tags__person__full_name__icontains=person_term)

                for tag_term in parsed_search.tag_terms:
                    normalized_tag = str(tag_term).strip()
                    if not normalized_tag:
                        continue
                    queryset = queryset.filter(self._build_tag_lookup_query(normalized_tag))

                for location_term in parsed_search.location_terms:
                    normalized_location = str(location_term).strip()
                    if normalized_location:
                        queryset = queryset.filter(metadata__location__icontains=normalized_location)

                queryset = self._apply_date_bounds(
                    queryset,
                    start_date=parsed_search.date_from,
                    end_date=parsed_search.date_to,
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
                tags_query |= self._build_tag_lookup_query(normalized_tag)

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
            queryset = self._apply_date_bounds(
                queryset,
                start_date=parse_date(f'{start_year}-01-01'),
                end_date=parse_date(f'{end_year}-12-31'),
            )

        start_date = parse_date(
            (self.request.query_params.get('dateFrom') or self.request.query_params.get('startDate') or '').strip()
        )
        end_date = parse_date(
            (self.request.query_params.get('dateTo') or self.request.query_params.get('endDate') or '').strip()
        )
        queryset = self._apply_date_bounds(queryset, start_date=start_date, end_date=end_date)

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

    def _resolve_media_type(self, uploaded_file, requested_media_type=None, original_file_name=None):
        valid_media_types = {choice[0] for choice in MediaItem.MediaType.choices}
        normalized_requested = str(requested_media_type or '').strip().upper()
        if normalized_requested in valid_media_types:
            return normalized_requested

        content_type = str(getattr(uploaded_file, 'content_type', '') or '').lower()
        if not content_type:
            file_name = str(getattr(uploaded_file, 'name', '') or '').strip().lower()
            content_type = str(mimetypes.guess_type(file_name)[0] or '').lower()
        if content_type.startswith('image/'):
            return MediaItem.MediaType.PHOTO
        if content_type.startswith('video/'):
            return MediaItem.MediaType.VIDEO
        extension = self._extract_file_extension(
            str(original_file_name or '') or str(getattr(uploaded_file, 'name', '') or '')
        )
        if extension in self.IMAGE_EXTENSIONS:
            return MediaItem.MediaType.PHOTO
        if extension in self.VIDEO_EXTENSIONS:
            return MediaItem.MediaType.VIDEO
        return MediaItem.MediaType.DOCUMENT

    def _resolve_primary_file_index(self, uploaded_files, requested_index=None):
        if requested_index is not None:
            try:
                normalized_index = int(requested_index)
            except (TypeError, ValueError):
                raise ValidationError({'primaryFileIndex': ['Primary file index must be a valid integer.']})
            if 0 <= normalized_index < len(uploaded_files):
                return normalized_index
            raise ValidationError({'primaryFileIndex': ['Primary file index is out of range.']})

        preferred_prefixes = ('image/', 'video/', 'audio/')

        for prefix in preferred_prefixes:
            for index, uploaded_file in enumerate(uploaded_files):
                content_type = str(getattr(uploaded_file, 'content_type', '') or '').lower()
                if not content_type:
                    file_name = str(getattr(uploaded_file, 'name', '') or '').strip().lower()
                    content_type = str(mimetypes.guess_type(file_name)[0] or '').lower()
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

    def _is_request_key_present(self, request, keys):
        source = request.data
        return any(key in source for key in keys)

    def _normalize_lock_rule(self, raw_rule):
        token = str(raw_rule or '').strip().upper()
        aliases = {
            'NONE': MediaItem.LockRule.NONE,
            'TIME': MediaItem.LockRule.TIME,
            'TARGET': MediaItem.LockRule.TARGETED,
            'TARGETED': MediaItem.LockRule.TARGETED,
            'TIME_AND_TARGET': MediaItem.LockRule.TIME_AND_TARGET,
            'TIME_OR_TARGET': MediaItem.LockRule.TIME_OR_TARGET,
        }
        normalized = aliases.get(token, token)
        valid_values = {choice[0] for choice in MediaItem.LockRule.choices}
        if normalized not in valid_values:
            raise ValidationError(
                {
                    'lockRule': [
                        'Invalid lock rule. Use NONE, TIME, TARGETED, TIME_AND_TARGET, or TIME_OR_TARGET.'
                    ]
                }
            )
        return normalized

    def _parse_lock_release_at(self, raw_release_at):
        if raw_release_at in (None, '', 'null', 'None'):
            return None
        if isinstance(raw_release_at, datetime):
            parsed = raw_release_at
        else:
            parsed = parse_datetime(str(raw_release_at).strip())
        if not parsed:
            raise ValidationError({'lockReleaseAt': ['Lock release date-time is invalid.']})
        if timezone.is_naive(parsed):
            parsed = timezone.make_aware(parsed, timezone.get_current_timezone())
        return parsed

    def _parse_lock_target_user_ids(self, raw_target_ids):
        if raw_target_ids in (None, ''):
            return []

        values = []
        if isinstance(raw_target_ids, (list, tuple)):
            values = list(raw_target_ids)
        elif isinstance(raw_target_ids, str):
            token = raw_target_ids.strip()
            if not token:
                return []
            try:
                parsed = json.loads(token)
                if isinstance(parsed, list):
                    values = parsed
                else:
                    values = [item.strip() for item in token.split(',') if item.strip()]
            except ValueError:
                values = [item.strip() for item in token.split(',') if item.strip()]
        else:
            values = [raw_target_ids]

        normalized_ids = []
        seen = set()
        user_pk_field = get_user_model()._meta.pk
        for value in values:
            raw_id = str(value or '').strip()
            if not raw_id:
                continue
            try:
                normalized_id = str(user_pk_field.to_python(raw_id))
            except (TypeError, ValueError):
                raise ValidationError({'lockTargetUserIds': [f'Invalid user id: "{raw_id}".']})
            if not normalized_id or normalized_id.lower() == 'none':
                raise ValidationError({'lockTargetUserIds': [f'Invalid user id: "{raw_id}".']})
            if normalized_id in seen:
                continue
            seen.add(normalized_id)
            normalized_ids.append(normalized_id)
        return normalized_ids

    def _resolve_lock_payload(self, request, vault, media_item=None):
        lock_rule_present = self._is_request_key_present(request, ('lock_rule', 'lockRule'))
        lock_release_present = self._is_request_key_present(
            request,
            ('lock_release_at', 'lockReleaseAt'),
        )
        lock_targets_present = self._is_request_key_present(
            request,
            ('lock_target_user_ids', 'lockTargetUserIds'),
        )

        if media_item is not None and not (lock_rule_present or lock_release_present or lock_targets_present):
            return None

        current_rule = media_item.lock_rule if media_item else MediaItem.LockRule.NONE
        current_release_at = media_item.lock_release_at if media_item else None
        current_target_ids = (
            [str(user_id) for user_id in media_item.lock_targets.values_list('user_id', flat=True)]
            if media_item
            else []
        )

        next_rule = current_rule
        next_release_at = current_release_at
        next_target_ids = current_target_ids

        if lock_rule_present:
            raw_rule = request.data.get('lock_rule', request.data.get('lockRule'))
            next_rule = self._normalize_lock_rule(raw_rule)

        if lock_release_present:
            raw_release_at = request.data.get('lock_release_at', request.data.get('lockReleaseAt'))
            next_release_at = self._parse_lock_release_at(raw_release_at)

        if lock_targets_present:
            raw_targets = request.data.get('lock_target_user_ids', request.data.get('lockTargetUserIds'))
            next_target_ids = self._parse_lock_target_user_ids(raw_targets)

        if next_rule == MediaItem.LockRule.NONE:
            next_release_at = None
            next_target_ids = []
        elif next_rule == MediaItem.LockRule.TIME:
            if not next_release_at:
                raise ValidationError({'lockReleaseAt': ['A release date-time is required for TIME lock rule.']})
            next_target_ids = []
        elif next_rule == MediaItem.LockRule.TARGETED:
            if not next_target_ids:
                raise ValidationError({'lockTargetUserIds': ['Select at least one target user.']})
            next_release_at = None
        elif next_rule == MediaItem.LockRule.TIME_AND_TARGET:
            if not next_release_at:
                raise ValidationError(
                    {'lockReleaseAt': ['A release date-time is required for TIME_AND_TARGET lock rule.']}
                )
            if not next_target_ids:
                raise ValidationError({'lockTargetUserIds': ['Select at least one target user.']})
        elif next_rule == MediaItem.LockRule.TIME_OR_TARGET:
            if not next_release_at and not next_target_ids:
                raise ValidationError(
                    {
                        'lockRule': [
                            'TIME_OR_TARGET requires at least one condition: lock release date-time or target users.'
                        ]
                    }
                )

        if next_target_ids:
            active_member_user_ids = {
                str(user_id)
                for user_id in Membership.objects.filter(
                    vault=vault,
                    is_active=True,
                    user_id__in=next_target_ids,
                ).values_list('user_id', flat=True)
            }
            invalid_target_ids = [user_id for user_id in next_target_ids if user_id not in active_member_user_ids]
            if invalid_target_ids:
                raise ValidationError({'lockTargetUserIds': ['All target users must be active vault members.']})

        return {
            'lock_rule': next_rule,
            'lock_release_at': next_release_at,
            'lock_target_user_ids': next_target_ids,
        }

    def _apply_lock_payload(self, media_item, lock_payload):
        if lock_payload is None:
            return media_item

        update_fields = []
        next_rule = lock_payload['lock_rule']
        next_release_at = lock_payload['lock_release_at']
        next_target_ids = set(lock_payload['lock_target_user_ids'])

        if media_item.lock_rule != next_rule:
            media_item.lock_rule = next_rule
            update_fields.append('lock_rule')
        if media_item.lock_release_at != next_release_at:
            media_item.lock_release_at = next_release_at
            update_fields.append('lock_release_at')
        if update_fields:
            media_item.save(update_fields=update_fields)

        existing_target_ids = {
            str(user_id)
            for user_id in MediaItemLockTarget.objects.filter(media_item=media_item).values_list('user_id', flat=True)
        }
        if existing_target_ids != next_target_ids:
            lock_targets_qs = MediaItemLockTarget.objects.filter(media_item=media_item)
            if next_target_ids:
                lock_targets_qs.exclude(user_id__in=next_target_ids).delete()
            else:
                lock_targets_qs.delete()
            new_target_ids = next_target_ids.difference(existing_target_ids)
            if new_target_ids:
                MediaItemLockTarget.objects.bulk_create(
                    [
                        MediaItemLockTarget(media_item=media_item, user_id=user_id)
                        for user_id in new_target_ids
                    ],
                    ignore_conflicts=True,
                )

        return media_item

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

    def _lock_quota_user(self, user):
        if not user or not getattr(user, 'pk', None):
            return
        user.__class__.objects.select_for_update().filter(pk=user.pk).exists()

    def _current_uploaded_bytes(self, user):
        if not user or not getattr(user, 'pk', None):
            return 0
        aggregate = MediaItem.objects.filter(uploader=user).aggregate(total=Sum('file_size'))
        return int(aggregate.get('total') or 0)

    def _enforce_user_upload_quota(self, user, additional_bytes=0):
        if not user or not getattr(user, 'pk', None):
            return
        try:
            normalized_additional = max(int(additional_bytes or 0), 0)
        except (TypeError, ValueError):
            normalized_additional = 0

        projected_total = self._current_uploaded_bytes(user) + normalized_additional
        if projected_total > self.USER_UPLOAD_QUOTA_BYTES:
            raise ValidationError(
                {
                    'files': [
                        (
                            f'Upload limit reached. Each user can store up to {self.USER_UPLOAD_QUOTA_LABEL}. '
                            'Delete older media before uploading more.'
                        )
                    ]
                }
            )

    def _create_media_item(self, serializer, vault):
        with transaction.atomic():
            self._lock_quota_user(self.request.user)
            primary_file = serializer.validated_data.get('file')
            self._enforce_user_upload_quota(
                self.request.user,
                additional_bytes=self._safe_file_size(primary_file),
            )
            media_item = serializer.save(uploader=self.request.user, vault=vault)
            self._enforce_user_upload_quota(self.request.user)
        AIProcessingService().enqueue_media_processing(media_item)
        media_item.refresh_from_db()
        return media_item

    def _normalize_exif_gps(self, raw_value):
        if not isinstance(raw_value, dict):
            return None
        try:
            lat = float(raw_value.get('latitude'))
            lng = float(raw_value.get('longitude'))
        except (TypeError, ValueError):
            return None
        if not (-90.0 <= lat <= 90.0 and -180.0 <= lng <= 180.0):
            return None
        return {'latitude': lat, 'longitude': lng}

    def _normalize_exif_candidates(self, media_item):
        payload = media_item.exif_extracted_data if isinstance(media_item.exif_extracted_data, dict) else {}
        raw_candidates = payload.get('candidates') if isinstance(payload.get('candidates'), list) else []
        normalized_candidates = []

        for raw_candidate in raw_candidates:
            if not isinstance(raw_candidate, dict):
                continue
            file_id = str(raw_candidate.get('file_id') or raw_candidate.get('fileId') or '').strip()
            if not file_id:
                continue
            date_taken = str(raw_candidate.get('date_taken') or raw_candidate.get('dateTaken') or '').strip() or None
            gps = self._normalize_exif_gps(raw_candidate.get('gps'))
            if not date_taken and not gps:
                continue

            normalized_candidates.append(
                {
                    'file_id': file_id,
                    'original_name': str(
                        raw_candidate.get('original_name') or raw_candidate.get('originalName') or 'Memory file'
                    ).strip()
                    or 'Memory file',
                    'is_primary': bool(raw_candidate.get('is_primary', raw_candidate.get('isPrimary', False))),
                    'date_taken': date_taken,
                    'gps': gps,
                    'extracted_at': str(
                        raw_candidate.get('extracted_at') or raw_candidate.get('extractedAt') or ''
                    ).strip()
                    or None,
                    'raw_exif': raw_candidate.get('raw_exif') if isinstance(raw_candidate.get('raw_exif'), dict) else {},
                }
            )

        if normalized_candidates:
            return normalized_candidates

        # Backward compatibility for previously stored single-candidate payloads.
        legacy_date_taken = str(payload.get('date_taken') or '').strip() or None
        legacy_gps = self._normalize_exif_gps(payload.get('gps'))
        if not legacy_date_taken and not legacy_gps:
            return []

        metadata = media_item.metadata if isinstance(media_item.metadata, dict) else {}
        primary_name = str(metadata.get('primaryFileName') or '').strip()
        if not primary_name:
            primary_name = Path(media_item.file.name).name if media_item.file else 'Primary file'
        return [
            {
                'file_id': f'primary-{media_item.id}',
                'original_name': primary_name,
                'is_primary': True,
                'date_taken': legacy_date_taken,
                'gps': legacy_gps,
                'extracted_at': str(payload.get('extracted_at') or '').strip() or None,
                'raw_exif': payload.get('raw_exif') if isinstance(payload.get('raw_exif'), dict) else {},
            }
        ]

    def _resolve_exif_candidate_selection(self, media_item, candidates, requested_file_id=None):
        if not candidates:
            return None

        if requested_file_id:
            matched = next((candidate for candidate in candidates if candidate['file_id'] == requested_file_id), None)
            if matched:
                return matched

        payload = media_item.exif_extracted_data if isinstance(media_item.exif_extracted_data, dict) else {}
        selected_file_id = str(payload.get('selected_file_id') or payload.get('selectedFileId') or '').strip()
        if selected_file_id:
            matched = next((candidate for candidate in candidates if candidate['file_id'] == selected_file_id), None)
            if matched:
                return matched

        return candidates[0]

    def _serialize_exif_status(self, media_item):
        candidates = self._normalize_exif_candidates(media_item)
        selected_candidate = self._resolve_exif_candidate_selection(media_item, candidates)
        payload = media_item.exif_extracted_data if isinstance(media_item.exif_extracted_data, dict) else {}

        def _to_public_candidate(candidate):
            if not candidate:
                return None
            return {
                'file_id': candidate['file_id'],
                'original_name': candidate['original_name'],
                'is_primary': candidate['is_primary'],
                'date_taken': candidate.get('date_taken'),
                'gps': candidate.get('gps'),
                'extracted_at': candidate.get('extracted_at'),
            }

        return {
            'media_id': str(media_item.id),
            'status': media_item.exif_status,
            'error': media_item.exif_error or '',
            'task_id': media_item.exif_task_id or '',
            'processed_at': media_item.exif_processed_at,
            'confirmed_at': media_item.exif_confirmed_at,
            'requires_confirmation': media_item.exif_status == MediaItem.ExifStatus.AWAITING_CONFIRMATION,
            'candidate': _to_public_candidate(selected_candidate),
            'candidates': [_to_public_candidate(candidate) for candidate in candidates],
            'selected_file_id': selected_candidate['file_id'] if selected_candidate else '',
            'warnings': payload.get('warnings') if isinstance(payload.get('warnings'), list) else [],
        }

    def _normalize_face_coordinates(self, raw_value):
        if not isinstance(raw_value, dict):
            return None
        try:
            x = float(raw_value.get('x'))
            y = float(raw_value.get('y'))
            w = float(raw_value.get('w'))
            h = float(raw_value.get('h'))
        except (TypeError, ValueError):
            return None
        if w <= 0 or h <= 0:
            return None
        if x < 0 or y < 0:
            return None
        if x + w > 1.000001 or y + h > 1.000001:
            return None
        return {
            'x': round(x, 6),
            'y': round(y, 6),
            'w': round(w, 6),
            'h': round(h, 6),
        }

    def _resolve_face_thumbnail_url(self, thumbnail_path):
        return build_storage_path_url(thumbnail_path, request=self.request)

    def _normalize_detected_faces(self, media_item):
        payload = media_item.face_detection_data if isinstance(media_item.face_detection_data, dict) else {}
        raw_faces = payload.get('faces') if isinstance(payload.get('faces'), list) else []

        tags_by_face_id = {}
        for media_tag in media_item.tags.all():
            detected_face_id = str(getattr(media_tag, 'detected_face_id', '') or '').strip()
            if not detected_face_id:
                continue
            tags_by_face_id.setdefault(detected_face_id, media_tag)

        normalized_faces = []
        for raw_face in raw_faces:
            if not isinstance(raw_face, dict):
                continue
            face_id = str(raw_face.get('face_id') or raw_face.get('faceId') or '').strip()
            file_id = str(raw_face.get('file_id') or raw_face.get('fileId') or '').strip()
            if not face_id or not file_id:
                continue

            coordinates = self._normalize_face_coordinates(raw_face.get('face_coordinates'))
            if not coordinates:
                continue

            try:
                confidence = float(raw_face.get('confidence') or 0.0)
            except (TypeError, ValueError):
                confidence = 0.0

            matched_tag = tags_by_face_id.get(face_id)
            person = getattr(matched_tag, 'person', None) if matched_tag else None
            normalized_faces.append(
                {
                    'id': face_id,
                    'file_id': file_id,
                    'confidence': round(max(0.0, min(1.0, confidence)), 3),
                    'thumbnail_url': self._resolve_face_thumbnail_url(
                        raw_face.get('thumbnail_path') or raw_face.get('thumbnailPath')
                    ),
                    'bounding_box': {
                        'x': coordinates['x'],
                        'y': coordinates['y'],
                        'width': coordinates['w'],
                        'height': coordinates['h'],
                    },
                    'person_id': str(person.id) if person else None,
                    'name': person.full_name if person else '',
                }
            )
        return normalized_faces

    def _serialize_face_detection_status(self, media_item):
        payload = media_item.face_detection_data if isinstance(media_item.face_detection_data, dict) else {}
        faces = self._normalize_detected_faces(media_item)
        return {
            'media_id': str(media_item.id),
            'status': media_item.face_detection_status,
            'error': media_item.face_detection_error or '',
            'task_id': media_item.face_detection_task_id or '',
            'processed_at': media_item.face_detection_processed_at,
            'face_count': len(faces),
            'faces': faces,
            'warnings': payload.get('warnings') if isinstance(payload.get('warnings'), list) else [],
        }

    def _normalize_restoration_options(self, request):
        apply_colorize = self._parse_bool(request.data.get('colorize'))
        apply_denoise = self._parse_bool(request.data.get('denoise'))

        if apply_colorize is None:
            apply_colorize = True
        if apply_denoise is None:
            apply_denoise = True

        return {
            'colorize': bool(apply_colorize),
            'denoise': bool(apply_denoise),
        }

    def _normalize_restoration_result_entry(self, file_id, raw_entry):
        if not isinstance(raw_entry, dict):
            return None

        normalized_file_id = str(file_id or raw_entry.get('file_id') or raw_entry.get('fileId') or '').strip()
        if not normalized_file_id:
            return None

        restored_path = str(raw_entry.get('restored_path') or raw_entry.get('restoredPath') or '').strip()
        if not restored_path:
            return None

        warnings = raw_entry.get('warnings')
        normalized_warnings = (
            [str(item).strip() for item in warnings if str(item).strip()]
            if isinstance(warnings, list)
            else []
        )

        requested_options = (
            raw_entry.get('requested_options')
            if isinstance(raw_entry.get('requested_options'), dict)
            else raw_entry.get('requestedOptions')
            if isinstance(raw_entry.get('requestedOptions'), dict)
            else {}
        )
        applied_options = (
            raw_entry.get('applied_options')
            if isinstance(raw_entry.get('applied_options'), dict)
            else raw_entry.get('appliedOptions')
            if isinstance(raw_entry.get('appliedOptions'), dict)
            else {}
        )
        try:
            width = int(raw_entry.get('width') or 0)
        except (TypeError, ValueError):
            width = 0
        try:
            height = int(raw_entry.get('height') or 0)
        except (TypeError, ValueError):
            height = 0

        return {
            'file_id': normalized_file_id,
            'original_name': str(raw_entry.get('original_name') or raw_entry.get('originalName') or 'Memory file'),
            'is_primary': bool(raw_entry.get('is_primary', raw_entry.get('isPrimary', False))),
            'restored_path': restored_path,
            'restored_url': build_storage_path_url(restored_path, request=self.request),
            'processed_at': raw_entry.get('processed_at') or raw_entry.get('processedAt'),
            'task_id': str(raw_entry.get('task_id') or raw_entry.get('taskId') or ''),
            'width': width,
            'height': height,
            'detected_black_and_white': bool(
                raw_entry.get('detected_black_and_white', raw_entry.get('detectedBlackAndWhite', False))
            ),
            'requested_options': {
                'colorize': bool(requested_options.get('colorize', True)),
                'denoise': bool(requested_options.get('denoise', True)),
            },
            'applied_options': {
                'colorize': bool(applied_options.get('colorize', False)),
                'denoise': bool(applied_options.get('denoise', False)),
            },
            'warnings': normalized_warnings,
        }

    def _normalize_restoration_results(self, media_item):
        payload = media_item.restoration_data if isinstance(media_item.restoration_data, dict) else {}
        raw_results = payload.get('results') if isinstance(payload.get('results'), dict) else {}
        normalized_results = {}
        for file_id, raw_entry in raw_results.items():
            normalized_entry = self._normalize_restoration_result_entry(file_id, raw_entry)
            if not normalized_entry:
                continue
            normalized_results[normalized_entry['file_id']] = normalized_entry
        return normalized_results

    def _delete_restoration_output_paths(self, raw_payload):
        if not isinstance(raw_payload, dict):
            return
        raw_results = raw_payload.get('results')
        if not isinstance(raw_results, dict):
            return

        for raw_entry in raw_results.values():
            if not isinstance(raw_entry, dict):
                continue
            restored_path = str(raw_entry.get('restored_path') or raw_entry.get('restoredPath') or '').strip()
            if not restored_path:
                continue
            normalized_path = restored_path.lstrip('/')
            try:
                if default_storage.exists(normalized_path):
                    default_storage.delete(normalized_path)
            except Exception:
                continue

    def _reset_restoration_workflow(self, media_item, *, cleanup_existing_outputs=False):
        if cleanup_existing_outputs:
            self._delete_restoration_output_paths(
                media_item.restoration_data if isinstance(media_item.restoration_data, dict) else {}
            )

        media_item.restoration_status = MediaItem.RestorationStatus.NOT_STARTED
        media_item.restoration_error = ''
        media_item.restoration_data = {}
        media_item.restoration_task_id = ''
        media_item.restoration_processed_at = None
        media_item.save(
            update_fields=[
                'restoration_status',
                'restoration_error',
                'restoration_data',
                'restoration_task_id',
                'restoration_processed_at',
            ]
        )

    def _serialize_restoration_status(self, media_item, requested_file_id=None):
        payload = media_item.restoration_data if isinstance(media_item.restoration_data, dict) else {}
        normalized_results = self._normalize_restoration_results(media_item)
        selected_file_id = str(requested_file_id or '').strip()
        if not selected_file_id:
            selected_file_id = str(payload.get('last_result_file_id') or payload.get('lastResultFileId') or '').strip()
        if not selected_file_id and normalized_results:
            selected_file_id = next(iter(normalized_results.keys()))

        result_entry = normalized_results.get(selected_file_id)
        all_results = list(normalized_results.values())
        all_results.sort(key=lambda entry: str(entry.get('processed_at') or ''), reverse=True)

        requested_options = (
            payload.get('last_request', {}).get('options')
            if isinstance(payload.get('last_request'), dict)
            else {}
        )
        warnings = result_entry.get('warnings') if result_entry else []

        return {
            'media_id': str(media_item.id),
            'status': media_item.restoration_status,
            'error': media_item.restoration_error or '',
            'task_id': media_item.restoration_task_id or '',
            'processed_at': media_item.restoration_processed_at,
            'selected_file_id': selected_file_id,
            'requested_options': {
                'colorize': bool(requested_options.get('colorize', True)),
                'denoise': bool(requested_options.get('denoise', True)),
            },
            'result': result_entry,
            'results': all_results,
            'warnings': warnings if isinstance(warnings, list) else [],
        }

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

    def _resolve_uploaded_file_mime_type(self, uploaded_file):
        content_type = str(getattr(uploaded_file, 'content_type', '') or '').strip().lower()
        if content_type:
            return content_type
        file_name = str(getattr(uploaded_file, 'name', '') or '').strip().lower()
        guessed = str(mimetypes.guess_type(file_name)[0] or '').strip().lower()
        if guessed:
            return guessed

        extension = self._extract_file_extension(file_name)
        if extension in self.IMAGE_EXTENSIONS:
            if extension == '.webp':
                return 'image/webp'
            if extension in {'.jpg', '.jpeg'}:
                return 'image/jpeg'
            return f'image/{extension.lstrip(".")}'
        if extension in self.VIDEO_EXTENSIONS:
            return 'video/mp4'
        if extension in self.AUDIO_EXTENSIONS:
            return 'audio/mpeg'
        return ''

    def _clone_storage_file(self, source_file):
        if not source_file:
            raise FileNotFoundError('Source file is missing.')

        source_name = Path(str(getattr(source_file, 'name', '') or '')).name or 'memory-file'
        file_bytes = b''

        if hasattr(source_file, 'open'):
            source_file.open('rb')
        try:
            if hasattr(source_file, 'read'):
                file_bytes = source_file.read() or b''
        finally:
            if hasattr(source_file, 'close'):
                try:
                    source_file.close()
                except Exception:
                    pass

        return ContentFile(file_bytes, name=source_name)

    def _safe_file_size(self, file_obj):
        if not file_obj:
            return 0
        try:
            return int(getattr(file_obj, 'size', 0) or 0)
        except (FileNotFoundError, OSError, ValueError):
            return 0

    def _resolve_rotation_degrees(self, request):
        raw_degrees = request.data.get('degrees')
        direction = str(request.data.get('direction') or '').strip().lower()

        if raw_degrees in (None, ''):
            if direction == 'left':
                return -90
            if direction == 'right':
                return 90
            raise ValidationError({'degrees': ['Rotation must be provided.']})

        try:
            degrees = int(raw_degrees)
        except (TypeError, ValueError):
            raise ValidationError({'degrees': ['Rotation must be a valid integer.']})

        if degrees % 90 != 0:
            raise ValidationError({'degrees': ['Rotation must be in 90-degree increments.']})

        normalized = ((degrees + 180) % 360) - 180
        if normalized == 0:
            raise ValidationError({'degrees': ['Rotation must not be zero.']})
        return normalized

    def _resolve_rotation_target(self, media_item, request):
        raw_file_id = request.data.get('file_id', request.data.get('fileId'))
        normalized_file_id = str(raw_file_id or '').strip()
        primary_file_id = f'primary-{media_item.id}'
        fallback_file_id = f'fallback-{media_item.id}'

        if normalized_file_id in ('', primary_file_id, fallback_file_id):
            if media_item.media_type != MediaItem.MediaType.PHOTO:
                raise ValidationError({'fileId': ['The selected file is not a photo.']})
            if not media_item.file:
                raise ValidationError({'fileId': ['Primary file is missing.']})
            return ('primary', media_item, normalized_file_id or primary_file_id)

        attachment = MediaAttachment.objects.filter(
            media_item=media_item,
            id=normalized_file_id,
        ).first()
        if not attachment:
            raise ValidationError({'fileId': ['Selected file was not found.']})
        resolved_attachment_type = resolve_attachment_file_type(
            attachment.mime_type,
            file_name=attachment.original_name or getattr(attachment.file, 'name', ''),
            fallback_file_type=attachment.file_type,
        )
        if resolved_attachment_type != MediaAttachment.FileType.PHOTO:
            raise ValidationError({'fileId': ['The selected file is not a photo.']})
        if not attachment.file:
            raise ValidationError({'fileId': ['Selected attachment file is missing.']})
        return ('attachment', attachment, normalized_file_id)

    def _rotate_image_file_content(self, source_file, degrees):
        source_name = Path(str(getattr(source_file, 'name', '') or 'memory-file.jpg')).name
        suffix = Path(source_name).suffix.lower()
        format_by_suffix = {
            '.jpg': 'JPEG',
            '.jpeg': 'JPEG',
            '.png': 'PNG',
            '.webp': 'WEBP',
            '.tif': 'TIFF',
            '.tiff': 'TIFF',
            '.bmp': 'BMP',
        }

        if hasattr(source_file, 'open'):
            source_file.open('rb')

        try:
            with Image.open(source_file) as opened_image:
                output_format = format_by_suffix.get(suffix) or str(opened_image.format or 'JPEG').upper()
                if output_format == 'JPG':
                    output_format = 'JPEG'

                normalized_image = ImageOps.exif_transpose(opened_image)
                rotated_image = normalized_image.rotate(-degrees, expand=True)

                save_kwargs = {}
                exif_bytes = None
                try:
                    exif_payload = opened_image.getexif()
                    if exif_payload:
                        exif_payload[274] = 1
                        exif_bytes = exif_payload.tobytes()
                except Exception:
                    exif_bytes = None

                if output_format == 'JPEG':
                    if rotated_image.mode not in ('RGB', 'L'):
                        rotated_image = rotated_image.convert('RGB')
                    save_kwargs.update({'quality': 92, 'optimize': True})
                elif output_format == 'PNG':
                    save_kwargs.update({'optimize': True})
                elif output_format == 'WEBP':
                    save_kwargs.update({'quality': 92, 'method': 6})

                if exif_bytes and output_format in {'JPEG', 'WEBP', 'TIFF'}:
                    save_kwargs['exif'] = exif_bytes

                output_buffer = BytesIO()
                rotated_image.save(output_buffer, format=output_format, **save_kwargs)
                output_buffer.seek(0)

                output_suffix = suffix or f'.{output_format.lower()}'
                output_stem = Path(source_name).stem or 'memory-file'
                output_name = f'{output_stem}{output_suffix}'
                return ContentFile(output_buffer.read(), name=output_name)
        except UnidentifiedImageError:
            raise ValidationError({'fileId': ['Selected file is not a valid image.']})
        except OSError:
            raise ValidationError({'fileId': ['Unable to rotate this image format.']})
        finally:
            if hasattr(source_file, 'close'):
                try:
                    source_file.close()
                except Exception:
                    pass

    def _recalculate_media_total_size(self, media_item):
        remaining_attachments = list(MediaAttachment.objects.filter(media_item=media_item))
        total_size = self._safe_file_size(media_item.file) + sum(
            self._safe_file_size(attachment.file) for attachment in remaining_attachments
        )
        return int(total_size)

    def _extract_update_payload(self, request):
        excluded_keys = {
            'remove_file_ids',
            'removeFileIds',
            'new_files',
            'newFiles',
            'files',
            'lock_rule',
            'lockRule',
            'lock_release_at',
            'lockReleaseAt',
            'lock_target_user_ids',
            'lockTargetUserIds',
        }
        source = request.data
        data = {}

        if hasattr(source, 'lists'):
            for key, values in source.lists():
                if key in excluded_keys or not values:
                    continue
                data[key] = values if len(values) > 1 else values[0]
        elif isinstance(source, dict):
            for key, value in source.items():
                if key in excluded_keys:
                    continue
                data[key] = value
        else:
            for key in source.keys():
                if key in excluded_keys:
                    continue
                data[key] = source.get(key)

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
                promoted_attachment = None
                while retained_attachments and not promoted_attachment:
                    candidate_attachment = retained_attachments.pop(0)
                    try:
                        cloned_file = self._clone_storage_file(candidate_attachment.file)
                    except (FileNotFoundError, OSError):
                        candidate_attachment.delete()
                        continue

                    media_item.file = cloned_file
                    candidate_file_type = resolve_attachment_file_type(
                        candidate_attachment.mime_type,
                        file_name=candidate_attachment.original_name or getattr(candidate_attachment.file, 'name', ''),
                        fallback_file_type=candidate_attachment.file_type,
                    )
                    if candidate_file_type == MediaAttachment.FileType.PHOTO:
                        media_item.media_type = MediaItem.MediaType.PHOTO
                    elif candidate_file_type == MediaAttachment.FileType.VIDEO:
                        media_item.media_type = MediaItem.MediaType.VIDEO
                    else:
                        media_item.media_type = MediaItem.MediaType.DOCUMENT

                    promoted_name = str(
                        candidate_attachment.original_name or Path(candidate_attachment.file.name).name
                    ).strip()
                    if promoted_name:
                        next_metadata['primaryFileName'] = promoted_name
                    promoted_attachment = candidate_attachment

                if promoted_attachment:
                    promoted_attachment.delete()
                elif pending_new_files:
                    replacement = pending_new_files.pop(0)
                    media_item.file = replacement
                    media_item.media_type = self._resolve_media_type(
                        replacement,
                        original_file_name=getattr(replacement, 'name', ''),
                    )
                    next_metadata['primaryFileName'] = replacement.name
                else:
                    raise ValidationError({'removeFileIds': ['At least one file must remain attached to this memory.']})
            elif pending_new_files:
                replacement = pending_new_files.pop(0)
                media_item.file = replacement
                media_item.media_type = self._resolve_media_type(
                    replacement,
                    original_file_name=getattr(replacement, 'name', ''),
                )
                next_metadata['primaryFileName'] = replacement.name
            else:
                raise ValidationError({'removeFileIds': ['At least one file must remain attached to this memory.']})

        for attachment in removed_attachments:
            attachment.delete()

        for uploaded_file in pending_new_files:
            mime_type = self._resolve_uploaded_file_mime_type(uploaded_file)
            MediaAttachment.objects.create(
                media_item=media_item,
                file=uploaded_file,
                mime_type=mime_type,
                file_type=resolve_attachment_file_type(
                    mime_type,
                    file_name=getattr(uploaded_file, 'name', ''),
                ),
                original_name=uploaded_file.name,
            )

        next_metadata['fileCount'] = projected_file_count
        media_item.metadata = next_metadata
        remaining_attachments = list(MediaAttachment.objects.filter(media_item=media_item))
        total_size = self._safe_file_size(media_item.file) + sum(
            self._safe_file_size(attachment.file) for attachment in remaining_attachments
        )
        media_item.file_size = total_size
        media_item.content_hash = ''
        update_fields = ['metadata', 'file_size', 'content_hash']
        if remove_primary:
            update_fields.extend(['file', 'media_type'])
        media_item.save(update_fields=update_fields)
        self._reset_restoration_workflow(media_item, cleanup_existing_outputs=True)

        return media_item

    def _update_media_item(self, request, partial=False):
        media_item = self.get_object()
        self._enforce_edit_permissions(media_item)
        quota_user = media_item.uploader

        remove_file_ids = self._parse_remove_file_ids(request)
        raw_new_files = self._parse_new_files(request)
        new_files = self._process_files_for_vault(raw_new_files, media_item.vault)
        lock_payload = self._resolve_lock_payload(request, media_item.vault, media_item=media_item)
        update_payload = self._extract_update_payload(request)
        serializer = self.get_serializer(media_item, data=update_payload, partial=partial)
        serializer.is_valid(raise_exception=True)
        has_file_mutations = bool(remove_file_ids or new_files)
        self.perform_update(serializer)

        updated_media = serializer.instance
        if has_file_mutations or lock_payload is not None:
            with transaction.atomic():
                if has_file_mutations:
                    self._lock_quota_user(quota_user)
                    updated_media = self._apply_file_mutations(updated_media, remove_file_ids, new_files)
                    self._enforce_user_upload_quota(quota_user)
                updated_media = self._apply_lock_payload(updated_media, lock_payload)

        # EXIF/face processing is only needed when media files change.
        should_enqueue_processing = has_file_mutations
        if should_enqueue_processing:
            AIProcessingService().enqueue_media_processing(updated_media)
            updated_media.refresh_from_db()

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
        ).select_related('uploader', 'vault').prefetch_related(
            'tags__person',
            'attachments',
            'lock_targets__user',
        ).annotate(
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
        lock_target_subquery = MediaItemLockTarget.objects.filter(
            media_item_id=OuterRef('pk'),
            user=self.request.user,
        )
        queryset = queryset.annotate(
            is_favorite=Exists(favorite_subquery),
            can_view_private=Exists(admin_membership_subquery),
            is_lock_target=Exists(lock_target_subquery),
        )

        queryset = queryset.filter(
            Q(visibility=MediaItem.Visibility.FAMILY)
            | Q(uploader=self.request.user)
            | Q(can_view_private=True)
        )

        now = timezone.now()
        queryset = queryset.filter(
            Q(lock_rule=MediaItem.LockRule.NONE)
            | Q(uploader=self.request.user)
            | Q(can_view_private=True)
            | Q(lock_rule=MediaItem.LockRule.TIME, lock_release_at__lte=now)
            | Q(lock_rule=MediaItem.LockRule.TARGETED, is_lock_target=True)
            | Q(
                lock_rule=MediaItem.LockRule.TIME_AND_TARGET,
                lock_release_at__lte=now,
                is_lock_target=True,
            )
            | (
                Q(lock_rule=MediaItem.LockRule.TIME_OR_TARGET)
                & (Q(lock_release_at__lte=now) | Q(is_lock_target=True))
            )
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

    @decorators.action(detail=True, methods=['get'], url_path='exif-status')
    def exif_status(self, request, pk=None):
        media_item = self.get_object()
        return Response(self._serialize_exif_status(media_item))

    @decorators.action(detail=True, methods=['get'], url_path='face-detection-status')
    def face_detection_status(self, request, pk=None):
        media_item = self.get_object()
        return Response(self._serialize_face_detection_status(media_item))

    @decorators.action(detail=True, methods=['get'], url_path='restoration-status')
    def restoration_status(self, request, pk=None):
        media_item = self.get_object()
        requested_file_id = str(request.query_params.get('fileId', request.query_params.get('file_id')) or '').strip()
        return Response(self._serialize_restoration_status(media_item, requested_file_id or None))

    @decorators.action(detail=True, methods=['post'], url_path='restore')
    def restore_photo(self, request, pk=None):
        media_item = self.get_object()
        self._enforce_edit_permissions(media_item)

        if media_item.media_type != MediaItem.MediaType.PHOTO:
            raise ValidationError({'detail': 'Media restoration is only available for photos.'})

        _target_kind, _target_obj, target_file_id = self._resolve_rotation_target(media_item, request)
        options = self._normalize_restoration_options(request)
        if not options['colorize'] and not options['denoise']:
            raise ValidationError({'detail': 'Select at least one tool: colorize or denoise.'})

        current_status = media_item.restoration_status
        if current_status in (
            MediaItem.RestorationStatus.QUEUED,
            MediaItem.RestorationStatus.PROCESSING,
        ):
            payload = self._serialize_restoration_status(media_item, target_file_id)
            payload['detail'] = 'A restoration job is already running for this media item.'
            return Response(payload, status=status.HTTP_200_OK)

        AIProcessingService().enqueue_media_restoration(
            media_item,
            file_id=target_file_id,
            options=options,
        )
        media_item.refresh_from_db()
        return Response(
            self._serialize_restoration_status(media_item, target_file_id),
            status=status.HTTP_202_ACCEPTED,
        )

    @decorators.action(detail=True, methods=['post'], url_path='exif-confirm')
    def exif_confirm(self, request, pk=None):
        media_item = self.get_object()
        if media_item.uploader_id != request.user.id:
            raise PermissionDenied('Only the original uploader can confirm extracted EXIF metadata.')

        if media_item.exif_status != MediaItem.ExifStatus.AWAITING_CONFIRMATION:
            raise ValidationError({'detail': 'There is no pending EXIF metadata to confirm.'})

        action = str(request.data.get('action') or '').strip().lower()
        if action not in {'accept', 'reject'}:
            raise ValidationError({'action': ['Action must be "accept" or "reject".']})

        requested_candidate_file_id = str(
            request.data.get('candidate_file_id', request.data.get('candidateFileId')) or ''
        ).strip()
        candidate_pool = self._normalize_exif_candidates(media_item)
        if not candidate_pool:
            raise ValidationError({'detail': 'No extracted EXIF candidates are available to confirm.'})

        candidate = self._resolve_exif_candidate_selection(
            media_item,
            candidate_pool,
            requested_candidate_file_id or None,
        )
        if requested_candidate_file_id and (not candidate or candidate['file_id'] != requested_candidate_file_id):
            raise ValidationError({'candidateFileId': ['Selected EXIF candidate was not found.']})

        candidate_date_taken = candidate.get('date_taken')
        candidate_gps = candidate.get('gps') if isinstance(candidate.get('gps'), dict) else None

        apply_date_taken = self._parse_bool(
            request.data.get('apply_date_taken', request.data.get('applyDateTaken'))
        )
        apply_gps = self._parse_bool(
            request.data.get('apply_gps', request.data.get('applyGps'))
        )
        if apply_date_taken is None:
            apply_date_taken = True
        if apply_gps is None:
            apply_gps = True

        if action == 'reject':
            media_item.exif_status = MediaItem.ExifStatus.REJECTED
            media_item.exif_error = ''
            media_item.exif_confirmed_at = timezone.now()
            media_item.exif_extracted_data = {}
            media_item.save(update_fields=['exif_status', 'exif_error', 'exif_confirmed_at', 'exif_extracted_data'])
            output = self.get_serializer(media_item)
            return Response(output.data, status=status.HTTP_200_OK)

        has_date_candidate = bool(candidate_date_taken)
        has_gps_candidate = bool(candidate_gps)
        should_apply_date_taken = bool(apply_date_taken and has_date_candidate)
        should_apply_gps = bool(apply_gps and has_gps_candidate)

        if not should_apply_date_taken and not should_apply_gps:
            raise ValidationError({'detail': 'Select at least one EXIF field to apply, or reject this metadata.'})

        metadata = media_item.metadata if isinstance(media_item.metadata, dict) else {}
        next_metadata = dict(metadata)
        raw_exif = candidate.get('raw_exif')
        if isinstance(raw_exif, dict):
            next_metadata['exif'] = raw_exif
        next_metadata['exifSource'] = {
            'fileId': candidate.get('file_id'),
            'originalName': candidate.get('original_name'),
        }

        if should_apply_gps and candidate_gps:
            try:
                lat = float(candidate_gps.get('latitude'))
                lng = float(candidate_gps.get('longitude'))
            except (TypeError, ValueError):
                raise ValidationError({'detail': 'Extracted GPS value is invalid. Please reject and retry extraction.'})

            if not (-90.0 <= lat <= 90.0 and -180.0 <= lng <= 180.0):
                raise ValidationError({'detail': 'Extracted GPS value is out of range. Please reject and retry extraction.'})

            next_metadata['gps'] = {'latitude': lat, 'longitude': lng}
            if not str(next_metadata.get('location') or '').strip():
                next_metadata['location'] = f'{lat:.6f}, {lng:.6f}'

        update_fields = [
            'metadata',
            'exif_status',
            'exif_error',
            'exif_confirmed_at',
            'exif_extracted_data',
        ]
        media_item.metadata = next_metadata
        media_item.exif_status = MediaItem.ExifStatus.CONFIRMED
        media_item.exif_error = ''
        media_item.exif_confirmed_at = timezone.now()
        media_item.exif_extracted_data = {}

        if should_apply_date_taken and candidate_date_taken:
            try:
                normalized_candidate = str(candidate_date_taken).replace('Z', '+00:00')
                parsed_date_taken = datetime.fromisoformat(normalized_candidate)
            except ValueError:
                parsed_date_taken = None
            if parsed_date_taken is None:
                raise ValidationError({'detail': 'Extracted date value is invalid. Please reject and retry extraction.'})
            if timezone.is_naive(parsed_date_taken):
                parsed_date_taken = timezone.make_aware(parsed_date_taken, timezone.get_current_timezone())
            media_item.date_taken = parsed_date_taken
            update_fields.append('date_taken')

        media_item.save(update_fields=update_fields)
        output = self.get_serializer(media_item)
        return Response(output.data, status=status.HTTP_200_OK)

    @decorators.action(detail=True, methods=['post'], url_path='rotate')
    def rotate(self, request, pk=None):
        media_item = self.get_object()
        self._enforce_edit_permissions(media_item)
        degrees = self._resolve_rotation_degrees(request)
        target_kind, target_obj, rotated_file_id = self._resolve_rotation_target(media_item, request)
        quota_user = media_item.uploader

        with transaction.atomic():
            self._lock_quota_user(quota_user)
            if target_kind == 'primary':
                rotated_content = self._rotate_image_file_content(media_item.file, degrees)
                media_item.file = rotated_content
                media_item.content_hash = ''
                media_item.file_size = self._recalculate_media_total_size(media_item)
                media_item.save(update_fields=['file', 'file_size', 'content_hash'])
            else:
                rotated_content = self._rotate_image_file_content(target_obj.file, degrees)
                target_obj.file = rotated_content
                target_obj.save(update_fields=['file', 'file_size'])
                media_item.file_size = self._recalculate_media_total_size(media_item)
                media_item.save(update_fields=['file_size'])

            from genealogy.models import MediaTag

            MediaTag.objects.filter(media_item=media_item).update(
                face_coordinates=None,
                detected_face_id='',
                tagged_file_id='',
            )
            self._reset_restoration_workflow(media_item, cleanup_existing_outputs=True)
            self._enforce_user_upload_quota(quota_user)

        AIProcessingService().enqueue_face_detection_only(media_item)
        media_item.refresh_from_db()
        output = self.get_serializer(media_item)
        payload = dict(output.data)
        payload['rotated_file_id'] = rotated_file_id
        payload['applied_rotation'] = degrees
        return Response(payload, status=status.HTTP_200_OK)

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
        lock_payload = self._resolve_lock_payload(request, vault)
        requested_primary_file_index = request.data.get('primary_file_index', request.data.get('primaryFileIndex'))
        primary_file_index = self._resolve_primary_file_index(uploaded_files, requested_primary_file_index)
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
            'media_type': self._resolve_media_type(
                primary_file,
                requested_media_type,
                original_file_name=primary_source_file.name,
            ),
            'visibility': self._resolve_visibility(requested_visibility, vault),
            'metadata': primary_metadata,
        }
        if shared_date_taken:
            payload['date_taken'] = shared_date_taken

        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            self._lock_quota_user(request.user)
            projected_upload_size = sum(self._safe_file_size(file_obj) for file_obj in processed_uploaded_files)
            self._enforce_user_upload_quota(request.user, additional_bytes=projected_upload_size)
            media_item = serializer.save(uploader=request.user, vault=vault)
            total_size = int(primary_file.size or 0)

            for index, uploaded_file in enumerate(processed_uploaded_files):
                if index == primary_file_index:
                    continue

                original_file_name = uploaded_files[index].name
                mime_type = self._resolve_uploaded_file_mime_type(uploaded_file)
                attachment = MediaAttachment.objects.create(
                    media_item=media_item,
                    file=uploaded_file,
                    mime_type=mime_type,
                    file_type=resolve_attachment_file_type(
                        mime_type,
                        file_name=original_file_name,
                    ),
                    original_name=original_file_name,
                )
                total_size += int(attachment.file_size or 0)

            if media_item.file_size != total_size:
                media_item.file_size = total_size
                media_item.save(update_fields=['file_size'])
            media_item = self._apply_lock_payload(media_item, lock_payload)
            self._enforce_user_upload_quota(request.user)

        AIProcessingService().enqueue_media_processing(media_item)
        media_item.refresh_from_db()

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
