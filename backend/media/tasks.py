import logging
from datetime import datetime
from pathlib import Path
from typing import Any

from celery import shared_task
from django.utils import timezone

from .exif import extract_exif_payload
from .models import MediaAttachment, MediaItem


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


def _is_current_task(media_item_id: str, task_id: str) -> bool:
    if not task_id:
        return False
    current_task_id = MediaItem.objects.filter(pk=media_item_id).values_list('exif_task_id', flat=True).first()
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


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, retry_jitter=True, retry_kwargs={'max_retries': 3})
def extract_media_exif_task(self, media_item_id: str):
    task_id = str(getattr(self.request, 'id', '') or '')
    media_item = MediaItem.objects.filter(pk=media_item_id).first()
    if not media_item:
        return {'status': 'skipped', 'reason': 'media-not-found'}

    if not _is_current_task(str(media_item_id), task_id):
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
        if _is_current_task(str(media_item_id), task_id):
            MediaItem.objects.filter(pk=media_item_id, exif_task_id=task_id).update(
                ai_status=MediaItem.AIStatus.FAILED,
                exif_status=MediaItem.ExifStatus.FAILED,
                exif_error=f'EXIF extraction failed: {exc}',
                exif_processed_at=timezone.now(),
            )
        raise

    if not _is_current_task(str(media_item_id), task_id):
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
