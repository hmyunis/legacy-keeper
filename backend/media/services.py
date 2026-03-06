import logging
from uuid import uuid4

from django.db import transaction
from django.utils import timezone

from .models import MediaItem
from .tasks import detect_media_faces_task, extract_media_exif_task


logger = logging.getLogger(__name__)


class AIProcessingService:
    @staticmethod
    def _mark_photo_queued(media_item_id: str, exif_task_id: str, face_task_id: str):
        MediaItem.objects.filter(pk=media_item_id).update(
            ai_status=MediaItem.AIStatus.PENDING,
            exif_status=MediaItem.ExifStatus.QUEUED,
            exif_error='',
            exif_extracted_data={},
            exif_task_id=exif_task_id,
            exif_processed_at=None,
            exif_confirmed_at=None,
            face_detection_status=MediaItem.FaceDetectionStatus.QUEUED,
            face_detection_error='',
            face_detection_data={},
            face_detection_task_id=face_task_id,
            face_detection_processed_at=None,
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
            face_detection_status=MediaItem.FaceDetectionStatus.NOT_AVAILABLE,
            face_detection_error='',
            face_detection_data={},
            face_detection_processed_at=timezone.now(),
            face_detection_task_id='',
        )

    @staticmethod
    def _mark_face_detection_queued(media_item_id: str, face_task_id: str):
        MediaItem.objects.filter(pk=media_item_id).update(
            face_detection_status=MediaItem.FaceDetectionStatus.QUEUED,
            face_detection_error='',
            face_detection_data={},
            face_detection_task_id=face_task_id,
            face_detection_processed_at=None,
        )

    def enqueue_media_processing(self, media_item):
        media_item_id = str(media_item.pk)
        if media_item.media_type != MediaItem.MediaType.PHOTO:
            self._mark_non_photo_complete(media_item_id)
            return

        exif_task_id = uuid4().hex
        face_task_id = uuid4().hex
        self._mark_photo_queued(media_item_id, exif_task_id, face_task_id)

        def _enqueue():
            exif_enqueue_error = None
            face_enqueue_error = None
            try:
                extract_media_exif_task.apply_async(
                    args=[media_item_id],
                    queue='media',
                    task_id=exif_task_id,
                )
            except Exception as exc:
                exif_enqueue_error = exc
                logger.exception('Failed to enqueue EXIF extraction for media item %s', media_item_id)

            try:
                detect_media_faces_task.apply_async(
                    args=[media_item_id],
                    queue='media',
                    task_id=face_task_id,
                )
            except Exception as exc:
                face_enqueue_error = exc
                logger.exception('Failed to enqueue face detection for media item %s', media_item_id)

            if exif_enqueue_error is not None:
                MediaItem.objects.filter(pk=media_item_id, exif_task_id=exif_task_id).update(
                    ai_status=MediaItem.AIStatus.FAILED,
                    exif_status=MediaItem.ExifStatus.FAILED,
                    exif_error=f'Unable to queue EXIF extraction: {exif_enqueue_error}',
                    exif_extracted_data={},
                    exif_processed_at=timezone.now(),
                    exif_confirmed_at=None,
                    exif_task_id='',
                )
            if face_enqueue_error is not None:
                MediaItem.objects.filter(pk=media_item_id, face_detection_task_id=face_task_id).update(
                    face_detection_status=MediaItem.FaceDetectionStatus.FAILED,
                    face_detection_error=f'Unable to queue face detection: {face_enqueue_error}',
                    face_detection_data={},
                    face_detection_processed_at=timezone.now(),
                    face_detection_task_id='',
                )

        transaction.on_commit(_enqueue)

    def enqueue_face_detection_only(self, media_item):
        media_item_id = str(media_item.pk)
        if media_item.media_type != MediaItem.MediaType.PHOTO:
            MediaItem.objects.filter(pk=media_item_id).update(
                face_detection_status=MediaItem.FaceDetectionStatus.NOT_AVAILABLE,
                face_detection_error='',
                face_detection_data={},
                face_detection_processed_at=timezone.now(),
                face_detection_task_id='',
            )
            return

        face_task_id = uuid4().hex
        self._mark_face_detection_queued(media_item_id, face_task_id)

        def _enqueue():
            try:
                detect_media_faces_task.apply_async(
                    args=[media_item_id],
                    queue='media',
                    task_id=face_task_id,
                )
            except Exception as exc:
                logger.exception('Failed to enqueue face detection for media item %s', media_item_id)
                MediaItem.objects.filter(pk=media_item_id, face_detection_task_id=face_task_id).update(
                    face_detection_status=MediaItem.FaceDetectionStatus.FAILED,
                    face_detection_error=f'Unable to queue face detection: {exc}',
                    face_detection_data={},
                    face_detection_processed_at=timezone.now(),
                    face_detection_task_id='',
                )

        transaction.on_commit(_enqueue)
