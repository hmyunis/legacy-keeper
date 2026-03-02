import logging
from uuid import uuid4

from django.db import transaction
from django.utils import timezone

from .models import MediaItem
from .tasks import extract_media_exif_task


logger = logging.getLogger(__name__)


class AIProcessingService:
    @staticmethod
    def _mark_photo_queued(media_item_id: str, task_id: str):
        MediaItem.objects.filter(pk=media_item_id).update(
            ai_status=MediaItem.AIStatus.PENDING,
            exif_status=MediaItem.ExifStatus.QUEUED,
            exif_error='',
            exif_extracted_data={},
            exif_task_id=task_id,
            exif_processed_at=None,
            exif_confirmed_at=None,
        )

    @staticmethod
    def _mark_non_photo_complete(media_item_id: str):
        MediaItem.objects.filter(pk=media_item_id).update(
            ai_status=MediaItem.AIStatus.COMPLETED,
            exif_status=MediaItem.ExifStatus.NOT_AVAILABLE,
            exif_error='',
            exif_extracted_data={},
            exif_processed_at=timezone.now(),
            exif_confirmed_at=None,
            exif_task_id='',
        )

    def enqueue_media_processing(self, media_item):
        media_item_id = str(media_item.pk)
        task_id = uuid4().hex
        self._mark_photo_queued(media_item_id, task_id)

        def _enqueue():
            try:
                extract_media_exif_task.apply_async(
                    args=[media_item_id],
                    queue='media',
                    task_id=task_id,
                )
            except Exception as exc:
                logger.exception('Failed to enqueue EXIF extraction for media item %s', media_item_id)
                MediaItem.objects.filter(pk=media_item_id, exif_task_id=task_id).update(
                    ai_status=MediaItem.AIStatus.FAILED,
                    exif_status=MediaItem.ExifStatus.FAILED,
                    exif_error=f'Unable to queue EXIF extraction: {exc}',
                    exif_extracted_data={},
                    exif_processed_at=timezone.now(),
                    exif_confirmed_at=None,
                    exif_task_id='',
                )

        transaction.on_commit(_enqueue)
