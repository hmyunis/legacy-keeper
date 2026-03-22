import hashlib
import logging
from datetime import datetime
from pathlib import Path
from typing import Any

from celery import shared_task
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.utils import timezone

from .exif import extract_exif_payload
from .models import MediaAttachment, MediaItem
from .vision import detect_faces, restore_legacy_photo


logger = logging.getLogger(__name__)


def _parse_iso_datetime(raw_value: Any) -> datetime | None:
    token = str(raw_value or '').strip()
    if not token:
        return None
    try:
        parsed = datetime.fromisoformat(token)
    except ValueError:
        return None
    if timezone.is_naive(parsed):
        return timezone.make_aware(parsed, timezone.get_current_timezone())
    return parsed


def _is_current_task(media_item_id: str, task_id: str, task_field: str = 'exif_task_id') -> bool:
    if not task_id:
        return False
    current_task_id = MediaItem.objects.filter(pk=media_item_id).values_list(task_field, flat=True).first()
    return str(current_task_id or '') == str(task_id)


def _resolve_primary_original_name(media_item: MediaItem) -> str:
    metadata = media_item.metadata if isinstance(media_item.metadata, dict) else {}
    primary_name = str(metadata.get('primaryFileName') or '').strip()
    if primary_name:
        return primary_name
    if media_item.file:
        return Path(media_item.file.name).name
    return media_item.title or 'Primary file'


def _iter_media_files(media_item: MediaItem):
    if media_item.file:
        yield {
            'file_id': f'primary-{media_item.id}',
            'file_obj': media_item.file,
            'original_name': _resolve_primary_original_name(media_item),
            'is_primary': True,
        }

    attachments = MediaAttachment.objects.filter(media_item=media_item).order_by('created_at', 'id')
    for attachment in attachments:
        if not attachment.file:
            continue
        original_name = str(attachment.original_name or Path(attachment.file.name).name).strip() or 'Attachment'
        yield {
            'file_id': str(attachment.id),
            'file_obj': attachment.file,
            'original_name': original_name,
            'is_primary': False,
        }


def _safe_delete_storage_file(path: str):
    token = str(path or '').strip()
    if not token:
        return
    try:
        if default_storage.exists(token):
            default_storage.delete(token)
    except Exception:
        logger.warning('Failed to delete stale face thumbnail "%s".', token, exc_info=True)


def _normalize_restoration_options(raw_options: Any) -> dict[str, bool]:
    normalized = raw_options if isinstance(raw_options, dict) else {}
    apply_colorize = bool(normalized.get('colorize', True))
    apply_denoise = bool(normalized.get('denoise', True))
    return {
        'colorize': apply_colorize,
        'denoise': apply_denoise,
    }


def _normalize_result_path(raw_value: Any) -> str:
    return str(raw_value or '').strip().lstrip('/')


def _normalize_restoration_results(raw_payload: Any) -> dict[str, dict[str, Any]]:
    if not isinstance(raw_payload, dict):
        return {}

    raw_results = raw_payload.get('results')
    if not isinstance(raw_results, dict):
        return {}

    normalized_results = {}
    for raw_file_id, raw_entry in raw_results.items():
        file_id = str(raw_file_id or '').strip()
        if not file_id or not isinstance(raw_entry, dict):
            continue
        restored_path = _normalize_result_path(
            raw_entry.get('restored_path') or raw_entry.get('restoredPath')
        )
        if not restored_path:
            continue
        normalized_results[file_id] = dict(raw_entry)
    return normalized_results


def _cleanup_face_thumbnails(payload: Any):
    if not isinstance(payload, dict):
        return
    raw_faces = payload.get('faces')
    if not isinstance(raw_faces, list):
        return
    for raw_face in raw_faces:
        if not isinstance(raw_face, dict):
            continue
        _safe_delete_storage_file(str(raw_face.get('thumbnail_path') or '').strip())


def _build_face_identifier(file_id: str, face_coordinates: dict[str, Any], index: int) -> str:
    token = ':'.join(
        [
            str(file_id),
            f"{float(face_coordinates.get('x', 0.0)):.6f}",
            f"{float(face_coordinates.get('y', 0.0)):.6f}",
            f"{float(face_coordinates.get('w', 0.0)):.6f}",
            f"{float(face_coordinates.get('h', 0.0)):.6f}",
            str(index),
        ]
    )
    return f'face-{hashlib.sha1(token.encode("utf-8")).hexdigest()[:16]}'


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, retry_jitter=True, retry_kwargs={'max_retries': 3})
def extract_media_exif_task(self, media_item_id: str):
    task_id = str(getattr(self.request, 'id', '') or '')
    media_item = MediaItem.objects.filter(pk=media_item_id).first()
    if not media_item:
        return {'status': 'skipped', 'reason': 'media-not-found'}

    if not _is_current_task(str(media_item_id), task_id, task_field='exif_task_id'):
        return {'status': 'skipped', 'reason': 'stale-task'}

    MediaItem.objects.filter(pk=media_item_id, exif_task_id=task_id).update(
        ai_status=MediaItem.AIStatus.PROCESSING,
        exif_status=MediaItem.ExifStatus.PROCESSING,
        exif_error='',
    )

    try:
        candidate_items = []
        warnings = []
        total_files = 0

        for source_file in _iter_media_files(media_item):
            total_files += 1
            try:
                payload = extract_exif_payload(source_file['file_obj'])
            except Exception as exc:  # pragma: no cover - defensive fallback
                logger.exception(
                    'EXIF extraction failed for media item %s file %s',
                    media_item_id,
                    source_file['file_id'],
                )
                warnings.append(f'{source_file["original_name"]}: {exc}')
                continue

            raw_exif = payload.get('raw_exif') if isinstance(payload.get('raw_exif'), dict) else {}
            gps = payload.get('gps') if isinstance(payload.get('gps'), dict) else None
            date_taken = _parse_iso_datetime(payload.get('date_taken'))

            if not date_taken and not gps:
                continue

            candidate_items.append(
                {
                    'file_id': str(source_file['file_id']),
                    'original_name': str(source_file['original_name']),
                    'is_primary': bool(source_file['is_primary']),
                    'date_taken': date_taken.isoformat() if date_taken else None,
                    'gps': gps,
                    'raw_exif': raw_exif,
                    'extracted_at': str(payload.get('extracted_at') or timezone.now().isoformat()),
                }
            )
        has_candidate = bool(candidate_items)
    except Exception as exc:
        logger.exception('EXIF extraction attempt failed for media item %s', media_item_id)
        if _is_current_task(str(media_item_id), task_id, task_field='exif_task_id'):
            MediaItem.objects.filter(pk=media_item_id, exif_task_id=task_id).update(
                ai_status=MediaItem.AIStatus.FAILED,
                exif_status=MediaItem.ExifStatus.FAILED,
                exif_error=f'EXIF extraction failed: {exc}',
                exif_processed_at=timezone.now(),
            )
        raise

    if not _is_current_task(str(media_item_id), task_id, task_field='exif_task_id'):
        return {'status': 'skipped', 'reason': 'stale-task'}

    now = timezone.now()
    if not has_candidate:
        exif_payload = {
            'candidates': [],
            'selected_file_id': '',
            'total_files': total_files,
            'files_with_exif': 0,
            'warnings': warnings,
            'extracted_at': now.isoformat(),
        }
        MediaItem.objects.filter(pk=media_item_id, exif_task_id=task_id).update(
            ai_status=MediaItem.AIStatus.COMPLETED,
            exif_status=MediaItem.ExifStatus.NOT_AVAILABLE,
            exif_error='',
            exif_extracted_data=exif_payload,
            exif_processed_at=now,
        )
        return {'status': 'completed', 'reason': 'no-exif-candidate'}

    selected_file_id = str(candidate_items[0].get('file_id') or '')
    candidate_payload = {
        'candidates': candidate_items,
        'selected_file_id': selected_file_id,
        'total_files': total_files,
        'files_with_exif': len(candidate_items),
        'warnings': warnings,
        'extracted_at': now.isoformat(),
    }

    MediaItem.objects.filter(pk=media_item_id, exif_task_id=task_id).update(
        ai_status=MediaItem.AIStatus.COMPLETED,
        exif_status=MediaItem.ExifStatus.AWAITING_CONFIRMATION,
        exif_error='',
        exif_extracted_data=candidate_payload,
        exif_processed_at=now,
        exif_confirmed_at=None,
    )
    return {'status': 'completed', 'reason': 'awaiting-confirmation'}


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, retry_jitter=True, retry_kwargs={'max_retries': 3})
def detect_media_faces_task(self, media_item_id: str):
    task_id = str(getattr(self.request, 'id', '') or '')
    media_item = MediaItem.objects.filter(pk=media_item_id).first()
    if not media_item:
        return {'status': 'skipped', 'reason': 'media-not-found'}

    if not _is_current_task(str(media_item_id), task_id, task_field='face_detection_task_id'):
        return {'status': 'skipped', 'reason': 'stale-task'}

    MediaItem.objects.filter(pk=media_item_id, face_detection_task_id=task_id).update(
        face_detection_status=MediaItem.FaceDetectionStatus.PROCESSING,
        face_detection_error='',
    )

    detected_faces = []
    warnings = []
    total_files = 0
    processed_image_files = 0
    generated_thumbnail_paths = []

    try:
        for source_file in _iter_media_files(media_item):
            total_files += 1
            try:
                payload = detect_faces(source_file['file_obj'])
            except Exception as exc:
                if isinstance(exc, RuntimeError):
                    raise
                warnings.append(f'{source_file["original_name"]}: {exc}')
                logger.exception(
                    'Face detection failed for media item %s file %s',
                    media_item_id,
                    source_file['file_id'],
                )
                continue

            if not payload.get('is_image'):
                continue
            processed_image_files += 1

            raw_faces = payload.get('faces') if isinstance(payload.get('faces'), list) else []
            for index, raw_face in enumerate(raw_faces):
                if not isinstance(raw_face, dict):
                    continue
                face_coordinates = raw_face.get('face_coordinates')
                if not isinstance(face_coordinates, dict):
                    continue

                face_id = _build_face_identifier(str(source_file['file_id']), face_coordinates, index)
                thumbnail_path = ''
                thumbnail_bytes = raw_face.get('thumbnail_bytes')
                if isinstance(thumbnail_bytes, (bytes, bytearray)) and thumbnail_bytes:
                    candidate_path = f'face-thumbnails/{media_item_id}/{task_id}/{face_id}.jpg'
                    thumbnail_path = default_storage.save(candidate_path, ContentFile(bytes(thumbnail_bytes)))
                    generated_thumbnail_paths.append(thumbnail_path)

                detected_faces.append(
                    {
                        'face_id': face_id,
                        'file_id': str(source_file['file_id']),
                        'original_name': str(source_file['original_name']),
                        'is_primary': bool(source_file['is_primary']),
                        'face_coordinates': face_coordinates,
                        'confidence': float(raw_face.get('confidence') or 0.0),
                        'thumbnail_path': thumbnail_path,
                    }
                )
    except Exception as exc:
        logger.exception('Face detection attempt failed for media item %s', media_item_id)
        if _is_current_task(str(media_item_id), task_id, task_field='face_detection_task_id'):
            MediaItem.objects.filter(pk=media_item_id, face_detection_task_id=task_id).update(
                face_detection_status=MediaItem.FaceDetectionStatus.FAILED,
                face_detection_error=f'Face detection failed: {exc}',
                face_detection_processed_at=timezone.now(),
            )
        for thumbnail_path in generated_thumbnail_paths:
            _safe_delete_storage_file(thumbnail_path)
        raise

    if not _is_current_task(str(media_item_id), task_id, task_field='face_detection_task_id'):
        for thumbnail_path in generated_thumbnail_paths:
            _safe_delete_storage_file(thumbnail_path)
        return {'status': 'skipped', 'reason': 'stale-task'}

    previous_payload = (
        MediaItem.objects.filter(pk=media_item_id).values_list('face_detection_data', flat=True).first()
    )
    _cleanup_face_thumbnails(previous_payload)

    now = timezone.now()
    faces_payload = {
        'faces': detected_faces,
        'total_files': total_files,
        'processed_image_files': processed_image_files,
        'detected_face_count': len(detected_faces),
        'warnings': warnings,
        'model': 'opencv-haarcascade-frontalface-default',
        'processed_at': now.isoformat(),
    }

    if not detected_faces:
        MediaItem.objects.filter(pk=media_item_id, face_detection_task_id=task_id).update(
            face_detection_status=MediaItem.FaceDetectionStatus.NOT_AVAILABLE,
            face_detection_error='',
            face_detection_data=faces_payload,
            face_detection_processed_at=now,
        )
        return {'status': 'completed', 'reason': 'no-face-candidate'}

    MediaItem.objects.filter(pk=media_item_id, face_detection_task_id=task_id).update(
        face_detection_status=MediaItem.FaceDetectionStatus.COMPLETED,
        face_detection_error='',
        face_detection_data=faces_payload,
        face_detection_processed_at=now,
    )
    return {'status': 'completed', 'reason': 'faces-detected'}


@shared_task(bind=True)
def restore_media_photo_task(self, media_item_id: str, file_id: str, options: dict | None = None):
    task_id = str(getattr(self.request, 'id', '') or '')
    media_item = MediaItem.objects.filter(pk=media_item_id).first()
    if not media_item:
        return {'status': 'skipped', 'reason': 'media-not-found'}

    if not _is_current_task(str(media_item_id), task_id, task_field='restoration_task_id'):
        return {'status': 'skipped', 'reason': 'stale-task'}

    if media_item.media_type != MediaItem.MediaType.PHOTO:
        MediaItem.objects.filter(pk=media_item_id, restoration_task_id=task_id).update(
            restoration_status=MediaItem.RestorationStatus.NOT_AVAILABLE,
            restoration_error='Media restoration is available only for photo items.',
            restoration_processed_at=timezone.now(),
            restoration_task_id='',
        )
        return {'status': 'completed', 'reason': 'not-a-photo'}

    normalized_file_id = str(file_id or '').strip()
    if not normalized_file_id:
        normalized_file_id = f'primary-{media_item.id}'
    normalized_options = _normalize_restoration_options(options)
    if not normalized_options['colorize'] and not normalized_options['denoise']:
        MediaItem.objects.filter(pk=media_item_id, restoration_task_id=task_id).update(
            restoration_status=MediaItem.RestorationStatus.FAILED,
            restoration_error='Select at least one restoration tool (colorize or denoise).',
            restoration_processed_at=timezone.now(),
            restoration_task_id='',
        )
        return {'status': 'failed', 'reason': 'no-tools-selected'}

    MediaItem.objects.filter(pk=media_item_id, restoration_task_id=task_id).update(
        restoration_status=MediaItem.RestorationStatus.PROCESSING,
        restoration_error='',
    )

    selected_source = next(
        (
            source
            for source in _iter_media_files(media_item)
            if str(source.get('file_id') or '').strip() == normalized_file_id
        ),
        None,
    )
    if not selected_source:
        MediaItem.objects.filter(pk=media_item_id, restoration_task_id=task_id).update(
            restoration_status=MediaItem.RestorationStatus.FAILED,
            restoration_error='Selected file was not found for this memory item.',
            restoration_processed_at=timezone.now(),
            restoration_task_id='',
        )
        return {'status': 'failed', 'reason': 'file-not-found'}

    generated_path = ''
    try:
        restoration_payload = restore_legacy_photo(
            selected_source['file_obj'],
            apply_colorize=normalized_options['colorize'],
            apply_denoise=normalized_options['denoise'],
        )
        if not _is_current_task(str(media_item_id), task_id, task_field='restoration_task_id'):
            return {'status': 'skipped', 'reason': 'stale-task'}

        restored_bytes = restoration_payload.get('image_bytes')
        if not isinstance(restored_bytes, (bytes, bytearray)) or not restored_bytes:
            raise RuntimeError('Restoration output is empty.')

        source_name = str(selected_source.get('original_name') or 'memory-file').strip() or 'memory-file'
        source_stem = Path(source_name).stem or 'memory-file'
        target_file_name = f'{source_stem}-restored.jpg'
        generated_path = default_storage.save(
            f'restored-media/{media_item_id}/{task_id}/{target_file_name}',
            ContentFile(bytes(restored_bytes)),
        )
        if not _is_current_task(str(media_item_id), task_id, task_field='restoration_task_id'):
            _safe_delete_storage_file(generated_path)
            return {'status': 'skipped', 'reason': 'stale-task'}

        current_payload = (
            MediaItem.objects.filter(pk=media_item_id).values_list('restoration_data', flat=True).first()
        )
        next_payload = dict(current_payload) if isinstance(current_payload, dict) else {}
        results_by_file_id = _normalize_restoration_results(next_payload)
        previous_entry = results_by_file_id.get(normalized_file_id)
        previous_path = _normalize_result_path(
            (previous_entry or {}).get('restored_path') or (previous_entry or {}).get('restoredPath')
        )
        if previous_path and previous_path != _normalize_result_path(generated_path):
            _safe_delete_storage_file(previous_path)

        warnings = restoration_payload.get('warnings')
        normalized_warnings = (
            [str(item).strip() for item in warnings if str(item).strip()]
            if isinstance(warnings, list)
            else []
        )
        now = timezone.now()
        results_by_file_id[normalized_file_id] = {
            'file_id': normalized_file_id,
            'original_name': str(selected_source.get('original_name') or 'Memory file'),
            'is_primary': bool(selected_source.get('is_primary')),
            'restored_path': generated_path,
            'task_id': task_id,
            'processed_at': now.isoformat(),
            'width': int(restoration_payload.get('width') or 0),
            'height': int(restoration_payload.get('height') or 0),
            'detected_black_and_white': bool(restoration_payload.get('detected_black_and_white')),
            'requested_options': normalized_options,
            'applied_options': restoration_payload.get('applied')
            if isinstance(restoration_payload.get('applied'), dict)
            else normalized_options,
            'warnings': normalized_warnings,
        }
        next_payload['results'] = results_by_file_id
        next_payload['last_result_file_id'] = normalized_file_id
        next_payload['last_processed_at'] = now.isoformat()
        next_payload['last_task_id'] = task_id

        MediaItem.objects.filter(pk=media_item_id, restoration_task_id=task_id).update(
            restoration_status=MediaItem.RestorationStatus.COMPLETED,
            restoration_error='',
            restoration_data=next_payload,
            restoration_processed_at=now,
        )
        return {'status': 'completed', 'reason': 'restoration-ready'}
    except Exception as exc:
        logger.exception('Media restoration failed for media item %s file %s', media_item_id, normalized_file_id)
        if generated_path:
            _safe_delete_storage_file(generated_path)
        if _is_current_task(str(media_item_id), task_id, task_field='restoration_task_id'):
            MediaItem.objects.filter(pk=media_item_id, restoration_task_id=task_id).update(
                restoration_status=MediaItem.RestorationStatus.FAILED,
                restoration_error=f'Media restoration failed: {exc}',
                restoration_processed_at=timezone.now(),
                restoration_task_id='',
            )
        return {'status': 'failed', 'reason': 'restoration-error'}
