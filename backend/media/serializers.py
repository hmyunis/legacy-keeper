import json
import mimetypes
from rest_framework import serializers
from django.utils import timezone
from core.storage_urls import build_storage_file_url, build_storage_path_url
from .models import MediaAttachment, MediaItem
from vaults.models import Membership

MAX_UPLOAD_MB = 20
MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024
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


def _file_extension(file_name):
    token = str(file_name or '').strip().lower()
    if not token:
        return ''
    if '.' not in token:
        return ''
    return f'.{token.split(".")[-1]}'


def resolve_attachment_file_type(mime_type, file_name=None, fallback_file_type=None):
    normalized = str(mime_type or '').lower()
    if normalized.startswith('image/'):
        return MediaAttachment.FileType.PHOTO
    if normalized.startswith('video/'):
        return MediaAttachment.FileType.VIDEO
    if normalized.startswith('audio/'):
        return MediaAttachment.FileType.AUDIO

    extension = _file_extension(file_name)
    if extension in IMAGE_EXTENSIONS:
        return MediaAttachment.FileType.PHOTO
    if extension in VIDEO_EXTENSIONS:
        return MediaAttachment.FileType.VIDEO
    if extension in AUDIO_EXTENSIONS:
        return MediaAttachment.FileType.AUDIO

    normalized_fallback = str(fallback_file_type or '').strip().upper()
    valid_types = {choice[0] for choice in MediaAttachment.FileType.choices}
    if normalized_fallback in valid_types:
        return normalized_fallback
    return MediaAttachment.FileType.DOCUMENT


class MediaAttachmentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    is_primary = serializers.SerializerMethodField()
    file_type = serializers.SerializerMethodField()

    class Meta:
        model = MediaAttachment
        fields = (
            'id',
            'file_url',
            'file_size',
            'mime_type',
            'file_type',
            'original_name',
            'is_primary',
            'created_at',
        )
        read_only_fields = fields

    def get_file_url(self, obj):
        request = self.context.get('request')
        return build_storage_file_url(obj.file, request=request)

    def get_is_primary(self, _obj):
        return False

    def get_file_type(self, obj):
        return resolve_attachment_file_type(
            obj.mime_type,
            file_name=obj.original_name or getattr(obj.file, 'name', ''),
            fallback_file_type=obj.file_type,
        )

class MediaItemSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    uploader_name = serializers.CharField(source='uploader.full_name', read_only=True)
    uploader_avatar = serializers.SerializerMethodField()
    is_favorite = serializers.SerializerMethodField()
    files = serializers.SerializerMethodField()
    linked_relatives = serializers.SerializerMethodField()
    detected_faces = serializers.SerializerMethodField()
    lock_target_user_ids = serializers.SerializerMethodField()
    lock_target_users = serializers.SerializerMethodField()
    is_time_locked = serializers.SerializerMethodField()

    class Meta:
        model = MediaItem
        fields = (
            'id', 'vault', 'uploader', 'uploader_name', 'uploader_avatar',
            'file', 'file_url', 'is_favorite', 'file_size', 'media_type', 
            'title', 'description', 'date_taken', 'visibility',
            'lock_rule', 'lock_release_at', 'lock_target_user_ids', 'lock_target_users', 'is_time_locked',
            'ai_status',
            'exif_status',
            'exif_error',
            'exif_processed_at',
            'exif_confirmed_at',
            'face_detection_status',
            'face_detection_error',
            'face_detection_processed_at',
            'restoration_status',
            'restoration_error',
            'restoration_processed_at',
            'created_at',
            'is_time_locked',
            'metadata',
            'files',
            'linked_relatives',
            'detected_faces',
        )
        read_only_fields = (
            'id',
            'uploader',
            'is_favorite',
            'file_size',
            'ai_status',
            'exif_status',
            'exif_error',
            'exif_processed_at',
            'exif_confirmed_at',
            'face_detection_status',
            'face_detection_error',
            'face_detection_processed_at',
            'restoration_status',
            'restoration_error',
            'restoration_processed_at',
            'created_at',
        )

    def get_file_url(self, obj):
        request = self.context.get('request')
        return build_storage_file_url(obj.file, request=request)

    def get_uploader_avatar(self, obj):
        request = self.context.get('request')
        uploader = getattr(obj, 'uploader', None)
        if not uploader or not getattr(uploader, 'avatar', None):
            return None
        return build_storage_file_url(uploader.avatar, request=request)

    def get_is_favorite(self, obj):
        annotated = getattr(obj, 'is_favorite', None)
        if annotated is not None:
            return bool(annotated)

        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            return False

        return obj.favorites.filter(user=request.user).exists()

    def get_files(self, obj):
        request = self.context.get('request')
        files = []

        if obj.file:
            mime_type = mimetypes.guess_type(obj.file.name or '')[0] or ''
            metadata = obj.metadata if isinstance(obj.metadata, dict) else {}
            original_name = str(metadata.get('primaryFileName') or '').strip() or obj.file.name.split('/')[-1]
            files.append(
                {
                    'id': f'primary-{obj.id}',
                    'file_url': build_storage_file_url(obj.file, request=request),
                    'file_size': int(obj.file.size or 0),
                    'mime_type': mime_type,
                    'file_type': resolve_attachment_file_type(
                        mime_type,
                        file_name=original_name,
                        fallback_file_type=(
                            MediaAttachment.FileType.PHOTO
                            if obj.media_type == MediaItem.MediaType.PHOTO
                            else MediaAttachment.FileType.VIDEO
                            if obj.media_type == MediaItem.MediaType.VIDEO
                            else MediaAttachment.FileType.DOCUMENT
                        ),
                    ),
                    'original_name': original_name,
                    'is_primary': True,
                    'created_at': obj.created_at,
                }
            )

        attachment_serializer = MediaAttachmentSerializer(
            obj.attachments.all(),
            many=True,
            context=self.context,
        )
        files.extend(attachment_serializer.data)
        return files

    def get_linked_relatives(self, obj):
        request = self.context.get('request')
        payload = []
        seen_person_ids = set()

        for media_tag in obj.tags.all():
            person = getattr(media_tag, 'person', None)
            if not person:
                continue
            person_id = str(person.id)
            if person_id in seen_person_ids:
                continue
            seen_person_ids.add(person_id)

            photo_url = None
            if person.profile_photo:
                photo_url = build_storage_file_url(person.profile_photo, request=request)

            payload.append(
                {
                    'id': person_id,
                    'full_name': person.full_name,
                    'photo_url': photo_url,
                }
            )

        payload.sort(key=lambda relative: str(relative.get('full_name') or '').lower())
        return payload

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

    def _absolute_storage_url(self, path):
        request = self.context.get('request')
        return build_storage_path_url(path, request=request)

    def get_detected_faces(self, obj):
        payload = obj.face_detection_data if isinstance(obj.face_detection_data, dict) else {}
        raw_faces = payload.get('faces') if isinstance(payload.get('faces'), list) else []
        tags_by_face_id = {}
        for media_tag in obj.tags.all():
            detected_face_id = str(getattr(media_tag, 'detected_face_id', '') or '').strip()
            if not detected_face_id:
                continue
            tags_by_face_id.setdefault(detected_face_id, media_tag)

        faces = []
        for raw_face in raw_faces:
            if not isinstance(raw_face, dict):
                continue
            face_id = str(raw_face.get('face_id') or raw_face.get('faceId') or '').strip()
            if not face_id:
                continue
            file_id = str(raw_face.get('file_id') or raw_face.get('fileId') or '').strip()
            if not file_id:
                continue

            face_coordinates = self._normalize_face_coordinates(raw_face.get('face_coordinates'))
            if not face_coordinates:
                continue

            try:
                confidence = float(raw_face.get('confidence') or 0.0)
            except (TypeError, ValueError):
                confidence = 0.0

            matched_tag = tags_by_face_id.get(face_id)
            person = getattr(matched_tag, 'person', None) if matched_tag else None

            faces.append(
                {
                    'id': face_id,
                    'file_id': file_id,
                    'confidence': round(max(0.0, min(1.0, confidence)), 3),
                    'thumbnail_url': self._absolute_storage_url(
                        raw_face.get('thumbnail_path') or raw_face.get('thumbnailPath')
                    ),
                    'bounding_box': {
                        'x': face_coordinates['x'],
                        'y': face_coordinates['y'],
                        'width': face_coordinates['w'],
                        'height': face_coordinates['h'],
                    },
                    'person_id': str(person.id) if person else None,
                    'name': person.full_name if person else '',
                }
            )

        return faces

    def _is_request_user_vault_admin(self, obj):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if not request or not user or not user.is_authenticated:
            return False
        annotated = getattr(obj, 'can_view_private', None)
        if annotated is not None:
            return bool(annotated)
        return obj.vault.members.filter(
            user=user,
            role=Membership.Roles.ADMIN,
            is_active=True,
        ).exists()

    def _is_request_user_lock_target(self, obj):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if not request or not user or not user.is_authenticated:
            return False
        annotated = getattr(obj, 'is_lock_target', None)
        if annotated is not None:
            return bool(annotated)
        return obj.lock_targets.filter(user=user).exists()

    def get_is_time_locked(self, obj):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if not request or not user or not user.is_authenticated:
            return False

        if obj.lock_rule == MediaItem.LockRule.NONE:
            return False
        if obj.uploader_id == user.id:
            return False
        if self._is_request_user_vault_admin(obj):
            return False

        now = timezone.now()
        is_time_ready = bool(obj.lock_release_at and obj.lock_release_at <= now)
        is_target_user = self._is_request_user_lock_target(obj)

        if obj.lock_rule == MediaItem.LockRule.TIME:
            return not is_time_ready
        if obj.lock_rule == MediaItem.LockRule.TARGETED:
            return not is_target_user
        if obj.lock_rule == MediaItem.LockRule.TIME_AND_TARGET:
            return not (is_time_ready and is_target_user)
        if obj.lock_rule == MediaItem.LockRule.TIME_OR_TARGET:
            return not (is_time_ready or is_target_user)
        return False

    def get_lock_target_user_ids(self, obj):
        return [str(entry.user_id) for entry in obj.lock_targets.all()]

    def get_lock_target_users(self, obj):
        return [
            {
                'id': str(entry.user_id),
                'full_name': entry.user.full_name,
                'email': entry.user.email,
            }
            for entry in obj.lock_targets.all()
        ]

    def validate_file(self, value):
        """
        Validator for file size (e.g., max 20MB)
        """
        if value.size > MAX_UPLOAD_BYTES:
            raise serializers.ValidationError(f"File too large. Size should not exceed {MAX_UPLOAD_MB} MB.")
        return value

    def validate_metadata(self, value):
        if value in (None, ''):
            return {}

        if isinstance(value, str):
            try:
                value = json.loads(value)
            except json.JSONDecodeError:
                raise serializers.ValidationError("Metadata must be valid JSON.")

        if not isinstance(value, dict):
            raise serializers.ValidationError("Metadata must be an object.")

        tags = value.get('tags')
        if isinstance(tags, str):
            tags = [tag.strip() for tag in tags.split(',') if tag.strip()]
        elif tags is None:
            tags = []
        elif not isinstance(tags, list):
            raise serializers.ValidationError("metadata.tags must be a list of strings.")

        value['tags'] = [str(tag).strip() for tag in tags if str(tag).strip()]

        location = value.get('location')
        value['location'] = str(location).strip() if location else ''

        return value

    def update(self, instance, validated_data):
        incoming_metadata = validated_data.pop('metadata', None)
        if incoming_metadata is not None:
            existing_metadata = instance.metadata if isinstance(instance.metadata, dict) else {}
            merged_metadata = dict(existing_metadata)
            merged_metadata.update(incoming_metadata)
            validated_data['metadata'] = merged_metadata

        return super().update(instance, validated_data)
