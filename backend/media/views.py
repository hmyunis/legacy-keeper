from collections import Counter
from datetime import datetime, time
import json
import mimetypes
from pathlib import Path

from django.db import transaction
from django.core.files.base import ContentFile
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
from core.storage_urls import build_storage_path_url
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
        if not content_type:
            file_name = str(getattr(uploaded_file, 'name', '') or '').strip().lower()
            content_type = str(mimetypes.guess_type(file_name)[0] or '').lower()
        if content_type.startswith('image/'):
            return MediaItem.MediaType.PHOTO
        if content_type.startswith('video/'):
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
        return str(mimetypes.guess_type(file_name)[0] or '')

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

    def _extract_update_payload(self, request):
        excluded_keys = {'remove_file_ids', 'removeFileIds', 'new_files', 'newFiles', 'files'}
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
                    if candidate_attachment.file_type == MediaAttachment.FileType.PHOTO:
                        media_item.media_type = MediaItem.MediaType.PHOTO
                    elif candidate_attachment.file_type == MediaAttachment.FileType.VIDEO:
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
                    media_item.media_type = self._resolve_media_type(replacement)
                    next_metadata['primaryFileName'] = replacement.name
                else:
                    raise ValidationError({'removeFileIds': ['At least one file must remain attached to this memory.']})
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
            mime_type = self._resolve_uploaded_file_mime_type(uploaded_file)
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
        total_size = self._safe_file_size(media_item.file) + sum(
            self._safe_file_size(attachment.file) for attachment in remaining_attachments
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
        update_payload = self._extract_update_payload(request)
        serializer = self.get_serializer(media_item, data=update_payload, partial=partial)
        serializer.is_valid(raise_exception=True)
        has_file_mutations = bool(remove_file_ids or new_files)
        self.perform_update(serializer)

        updated_media = serializer.instance
        if has_file_mutations:
            with transaction.atomic():
                updated_media = self._apply_file_mutations(updated_media, remove_file_ids, new_files)

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

    @decorators.action(detail=True, methods=['get'], url_path='exif-status')
    def exif_status(self, request, pk=None):
        media_item = self.get_object()
        return Response(self._serialize_exif_status(media_item))

    @decorators.action(detail=True, methods=['get'], url_path='face-detection-status')
    def face_detection_status(self, request, pk=None):
        media_item = self.get_object()
        return Response(self._serialize_face_detection_status(media_item))

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
                mime_type = self._resolve_uploaded_file_mime_type(uploaded_file)
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
