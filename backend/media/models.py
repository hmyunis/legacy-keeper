from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from vaults.models import FamilyVault
from core.models import TimeStampedModel
from core.utils import get_upload_path
import hashlib
from django.core.files.uploadedfile import UploadedFile
from pathlib import Path

class MediaItem(TimeStampedModel):
    class MediaType(models.TextChoices):
        PHOTO = 'PHOTO', _('Photo')
        DOCUMENT = 'DOCUMENT', _('Document')
        VIDEO = 'VIDEO', _('Video')

    class AIStatus(models.TextChoices):
        PENDING = 'PENDING', _('Pending')
        PROCESSING = 'PROCESSING', _('Processing')
        COMPLETED = 'COMPLETED', _('Completed')
        FAILED = 'FAILED', _('Failed')

    class Visibility(models.TextChoices):
        PRIVATE = 'PRIVATE', _('Private')
        FAMILY = 'FAMILY', _('Family')

    # Relationships
    vault = models.ForeignKey(FamilyVault, on_delete=models.CASCADE, related_name='media_items')
    uploader = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='uploaded_media')
    
    # File Data
    file = models.FileField(upload_to=get_upload_path)
    file_size = models.BigIntegerField(editable=False, help_text="Size in bytes")
    content_hash = models.CharField(max_length=64, blank=True, default='', db_index=True)
    media_type = models.CharField(max_length=20, choices=MediaType.choices, default=MediaType.PHOTO)
    
    # Metadata
    title = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    date_taken = models.DateTimeField(null=True, blank=True)
    visibility = models.CharField(
        max_length=20,
        choices=Visibility.choices,
        default=Visibility.FAMILY,
    )
    
    # Technical Metadata (EXIF, GPS, etc.)
    metadata = models.JSONField(default=dict, blank=True)
    
    # AI Processing
    ai_status = models.CharField(max_length=20, choices=AIStatus.choices, default=AIStatus.PENDING)

    def _calculate_content_hash(self):
        if not self.file:
            return ''

        digest = hashlib.sha256()
        file_obj = None
        opened_for_hash = False
        initial_position = None

        try:
            file_obj = getattr(self.file, 'file', self.file)

            if hasattr(file_obj, 'tell'):
                initial_position = file_obj.tell()

            if getattr(file_obj, 'closed', False) and hasattr(self.file, 'open'):
                self.file.open('rb')
                opened_for_hash = True
                file_obj = getattr(self.file, 'file', self.file)

            if hasattr(file_obj, 'seek'):
                file_obj.seek(0)

            if hasattr(file_obj, 'chunks'):
                for chunk in file_obj.chunks():
                    if chunk:
                        digest.update(chunk)
            else:
                while True:
                    chunk = file_obj.read(8192)
                    if not chunk:
                        break
                    digest.update(chunk)

            return digest.hexdigest()
        except Exception:
            return ''
        finally:
            if hasattr(file_obj, 'seek'):
                try:
                    # Rewind uploads so Django can store them after hashing.
                    file_obj.seek(initial_position or 0)
                except Exception:
                    pass
            if opened_for_hash and not isinstance(file_obj, UploadedFile):
                try:
                    self.file.close()
                except Exception:
                    pass

    def ensure_content_hash(self, persist=False):
        if self.content_hash:
            return self.content_hash

        computed_hash = self._calculate_content_hash()
        if not computed_hash:
            return ''

        self.content_hash = computed_hash
        if persist and self.pk:
            type(self).objects.filter(pk=self.pk).update(content_hash=computed_hash)
        return computed_hash

    def save(self, *args, **kwargs):
        # Auto-calculate primary file size if caller did not set a total explicitly.
        if self.file and not self.file_size:
            self.file_size = self.file.size
        if self.file and not self.content_hash:
            self.content_hash = self._calculate_content_hash()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title if self.title else f"Media {self.id}"


class MediaFavorite(TimeStampedModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='media_favorites',
    )
    media_item = models.ForeignKey(
        MediaItem,
        on_delete=models.CASCADE,
        related_name='favorites',
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['user', 'media_item'], name='uniq_user_media_favorite'),
        ]
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['media_item', 'user']),
        ]

    def __str__(self):
        return f'{self.user_id}:{self.media_item_id}'


class MediaAttachment(TimeStampedModel):
    class FileType(models.TextChoices):
        PHOTO = 'PHOTO', _('Photo')
        VIDEO = 'VIDEO', _('Video')
        AUDIO = 'AUDIO', _('Audio')
        DOCUMENT = 'DOCUMENT', _('Document')

    media_item = models.ForeignKey(
        MediaItem,
        on_delete=models.CASCADE,
        related_name='attachments',
    )
    file = models.FileField(upload_to=get_upload_path)
    file_size = models.BigIntegerField(editable=False, default=0)
    mime_type = models.CharField(max_length=120, blank=True, default='')
    file_type = models.CharField(max_length=20, choices=FileType.choices, default=FileType.DOCUMENT)
    original_name = models.CharField(max_length=255, blank=True, default='')

    class Meta:
        ordering = ('created_at', 'id')

    def save(self, *args, **kwargs):
        if self.file:
            self.file_size = self.file.size
            if not self.original_name:
                self.original_name = Path(self.file.name).name
        super().save(*args, **kwargs)

    def __str__(self):
        return self.original_name or f'Attachment {self.id}'
