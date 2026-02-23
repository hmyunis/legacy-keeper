import json
import mimetypes
from rest_framework import serializers
from .models import MediaAttachment, MediaItem

MAX_UPLOAD_MB = 20
MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024


def resolve_attachment_file_type(mime_type):
    normalized = str(mime_type or '').lower()
    if normalized.startswith('image/'):
        return MediaAttachment.FileType.PHOTO
    if normalized.startswith('video/'):
        return MediaAttachment.FileType.VIDEO
    if normalized.startswith('audio/'):
        return MediaAttachment.FileType.AUDIO
    return MediaAttachment.FileType.DOCUMENT


class MediaAttachmentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    is_primary = serializers.SerializerMethodField()

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
        if not obj.file:
            return None
        if request:
            return request.build_absolute_uri(obj.file.url)
        return obj.file.url

    def get_is_primary(self, _obj):
        return False

class MediaItemSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    uploader_name = serializers.CharField(source='uploader.full_name', read_only=True)
    uploader_avatar = serializers.SerializerMethodField()
    is_favorite = serializers.SerializerMethodField()
    files = serializers.SerializerMethodField()
    linked_relatives = serializers.SerializerMethodField()

    class Meta:
        model = MediaItem
        fields = (
            'id', 'vault', 'uploader', 'uploader_name', 'uploader_avatar',
            'file', 'file_url', 'is_favorite', 'file_size', 'media_type', 
            'title', 'description', 'date_taken', 'visibility',
            'ai_status', 'created_at', 'metadata', 'files', 'linked_relatives'
        )
        read_only_fields = ('id', 'uploader', 'is_favorite', 'file_size', 'ai_status', 'created_at')

    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.file:
            return request.build_absolute_uri(obj.file.url) if request else obj.file.url
        return None

    def get_uploader_avatar(self, obj):
        request = self.context.get('request')
        uploader = getattr(obj, 'uploader', None)
        if not uploader or not getattr(uploader, 'avatar', None):
            return None
        return request.build_absolute_uri(uploader.avatar.url) if request else uploader.avatar.url

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
                    'file_url': request.build_absolute_uri(obj.file.url) if request else obj.file.url,
                    'file_size': int(obj.file.size or 0),
                    'mime_type': mime_type,
                    'file_type': resolve_attachment_file_type(mime_type),
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
                photo_url = request.build_absolute_uri(person.profile_photo.url) if request else person.profile_photo.url

            payload.append(
                {
                    'id': person_id,
                    'full_name': person.full_name,
                    'photo_url': photo_url,
                }
            )

        payload.sort(key=lambda relative: str(relative.get('full_name') or '').lower())
        return payload

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
