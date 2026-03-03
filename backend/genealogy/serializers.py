from rest_framework import serializers
from django.db import transaction
from core.storage_urls import build_storage_file_url
from .models import PersonProfile, Relationship, MediaTag

class PersonProfileSerializer(serializers.ModelSerializer):
    photo_url = serializers.SerializerMethodField()

    class Meta:
        model = PersonProfile
        fields = (
            'id', 'vault', 'linked_user', 'full_name', 'maiden_name', 
            'birth_date', 'birth_place', 'death_date', 'is_deceased', 'bio', 
            'profile_photo', 'photo_url'
        )
        read_only_fields = ('vault',)

    def get_photo_url(self, obj):
        request = self.context.get('request')
        return build_storage_file_url(obj.profile_photo, request=request)

class RelationshipSerializer(serializers.ModelSerializer):
    from_person_name = serializers.ReadOnlyField(source='from_person.full_name')
    to_person_name = serializers.ReadOnlyField(source='to_person.full_name')

    class Meta:
        model = Relationship
        fields = ('id', 'from_person', 'from_person_name', 'to_person', 'to_person_name', 'relationship_type')

class MediaTagSerializer(serializers.ModelSerializer):
    person_name = serializers.ReadOnlyField(source='person.full_name')

    class Meta:
        model = MediaTag
        fields = (
            'id',
            'media_item',
            'person',
            'person_name',
            'face_coordinates',
            'detected_face_id',
            'tagged_file_id',
            'created_by',
        )
        read_only_fields = ('created_by',)

    def _normalize_face_coordinates(self, raw_value):
        if raw_value in (None, ''):
            return None
        if not isinstance(raw_value, dict):
            raise serializers.ValidationError('faceCoordinates must be an object with x, y, w, h values.')

        normalized = {
            'x': raw_value.get('x'),
            'y': raw_value.get('y'),
            'w': raw_value.get('w', raw_value.get('width')),
            'h': raw_value.get('h', raw_value.get('height')),
        }
        try:
            x = float(normalized['x'])
            y = float(normalized['y'])
            w = float(normalized['w'])
            h = float(normalized['h'])
        except (TypeError, ValueError):
            raise serializers.ValidationError('faceCoordinates values must be numeric.')

        if x < 0 or y < 0 or w <= 0 or h <= 0:
            raise serializers.ValidationError('faceCoordinates must use normalized positive values.')
        if x + w > 1.000001 or y + h > 1.000001:
            raise serializers.ValidationError('faceCoordinates values must be normalized to the 0-1 range.')

        return {
            'x': round(x, 6),
            'y': round(y, 6),
            'w': round(w, 6),
            'h': round(h, 6),
        }

    def _resolve_valid_file_ids(self, media_item):
        valid_file_ids = {f'primary-{media_item.id}'}
        valid_file_ids.update(
            str(attachment_id)
            for attachment_id in media_item.attachments.values_list('id', flat=True)
        )
        return valid_file_ids

    def _resolve_detected_face_payload(self, media_item, detected_face_id):
        payload = media_item.face_detection_data if isinstance(media_item.face_detection_data, dict) else {}
        raw_faces = payload.get('faces') if isinstance(payload.get('faces'), list) else []
        for raw_face in raw_faces:
            if not isinstance(raw_face, dict):
                continue
            candidate_id = str(raw_face.get('face_id') or raw_face.get('faceId') or '').strip()
            if candidate_id != detected_face_id:
                continue
            return {
                'face_coordinates': self._normalize_face_coordinates(raw_face.get('face_coordinates')),
                'file_id': str(raw_face.get('file_id') or raw_face.get('fileId') or '').strip(),
            }
        return {}

    def validate(self, attrs):
        media_item = attrs.get('media_item') or getattr(self.instance, 'media_item', None)
        if not media_item:
            raise serializers.ValidationError({'mediaItem': ['Media item is required.']})

        detected_face_id = str(
            attrs.get('detected_face_id', getattr(self.instance, 'detected_face_id', '')) or ''
        ).strip()
        attrs['detected_face_id'] = detected_face_id
        tagged_file_id = str(
            attrs.get('tagged_file_id', getattr(self.instance, 'tagged_file_id', '')) or ''
        ).strip()
        attrs['tagged_file_id'] = tagged_file_id

        normalized_face_coordinates = self._normalize_face_coordinates(
            attrs.get('face_coordinates', getattr(self.instance, 'face_coordinates', None))
        )

        valid_file_ids = self._resolve_valid_file_ids(media_item)
        if detected_face_id:
            detected_face_payload = self._resolve_detected_face_payload(media_item, detected_face_id)
            detected_coordinates = detected_face_payload.get('face_coordinates')
            detected_file_id = detected_face_payload.get('file_id')
            if not detected_coordinates:
                raise serializers.ValidationError({'detectedFaceId': ['Detected face could not be found for this media.']})
            if normalized_face_coordinates is None:
                normalized_face_coordinates = detected_coordinates
            if not tagged_file_id:
                tagged_file_id = detected_file_id

        if tagged_file_id and tagged_file_id not in valid_file_ids:
            raise serializers.ValidationError({'taggedFileId': ['Tagged file does not belong to this media item.']})

        attrs['face_coordinates'] = normalized_face_coordinates
        attrs['tagged_file_id'] = tagged_file_id
        return attrs

    def create(self, validated_data):
        created_by = validated_data.pop('created_by', None)
        media_item = validated_data['media_item']
        person = validated_data['person']

        defaults = {
            'face_coordinates': validated_data.get('face_coordinates'),
            'detected_face_id': validated_data.get('detected_face_id', ''),
            'tagged_file_id': validated_data.get('tagged_file_id', ''),
        }
        detected_face_id = defaults['detected_face_id']

        with transaction.atomic():
            # If this detected face already has a link, treat this request as an edit/re-link.
            if detected_face_id:
                existing_face_tag = MediaTag.objects.filter(
                    media_item=media_item,
                    detected_face_id=detected_face_id,
                ).first()
                if existing_face_tag:
                    conflicting_person_tag = MediaTag.objects.filter(
                        media_item=media_item,
                        person=person,
                    ).exclude(pk=existing_face_tag.pk).first()
                    if conflicting_person_tag:
                        conflicting_person_tag.delete()

                    existing_face_tag.person = person
                    existing_face_tag.face_coordinates = defaults.get('face_coordinates')
                    update_fields = ['person', 'face_coordinates']
                    if created_by is not None:
                        existing_face_tag.created_by = created_by
                        update_fields.append('created_by')
                    existing_face_tag.save(update_fields=update_fields)
                    return existing_face_tag

            if created_by is not None:
                defaults['created_by'] = created_by

            media_tag, _ = MediaTag.objects.update_or_create(
                media_item=media_item,
                person=person,
                defaults=defaults,
            )
            return media_tag
