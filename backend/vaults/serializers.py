from rest_framework import serializers
from django.utils import timezone
from .models import Memory, Capsule, MemoryCollection
from lineage.models import Person, PersonFaceEmbedding
from core.utils.media import normalize_media_url

class DetectedFaceSerializer(serializers.ModelSerializer):
    person_id = serializers.CharField(source='person.id', read_only=True)
    person_name = serializers.CharField(source='person.name', read_only=True)
    person_avatar = serializers.SerializerMethodField()

    class Meta:
        model = PersonFaceEmbedding
        fields = ('id', 'person_id', 'person_name', 'person_avatar', 'bounding_box')

    def get_person_avatar(self, obj):
        if obj.person.avatar:
            return normalize_media_url(obj.person.avatar.url)
        if obj.person.avatar_url:
            return obj.person.avatar_url
        return f"https://ui-avatars.com/api/?name={obj.person.name.replace(' ', '+')}&background=B88F5B&color=fff"

class IdentifiedPersonSerializer(serializers.ModelSerializer):
    person_avatar = serializers.SerializerMethodField()

    class Meta:
        model = Person
        fields = ('id', 'name', 'role', 'person_avatar')

    def get_person_avatar(self, obj):
        if obj.avatar:
            return normalize_media_url(obj.avatar.url)
        if obj.avatar_url:
            return obj.avatar_url
        return f"https://ui-avatars.com/api/?name={obj.name.replace(' ', '+')}&background=B88F5B&color=fff"

class MemorySerializer(serializers.ModelSerializer):
    vaultId = serializers.CharField(source='vault.id', read_only=True)
    vaultName = serializers.CharField(source='vault.name', read_only=True)
    url = serializers.SerializerMethodField()
    restoredUrl = serializers.SerializerMethodField()
    people = serializers.SerializerMethodField()
    detected_faces = DetectedFaceSerializer(many=True, read_only=True)
    identified_people = IdentifiedPersonSerializer(many=True, read_only=True)
    is_indexed = serializers.SerializerMethodField()
    capturedAt = serializers.SerializerMethodField()

    class Meta:
        model = Memory
        fields = ('id', 'vaultId', 'vaultName', 'url', 'restoredUrl', 'title', 'location', 'date', 'year', 'capturedAt', 'cluster_name', 'ai_caption', 'human_caption', 'tags', 'people', 'detected_faces', 'identified_people', 'exif_json', 'ai_suggestions', 'is_reviewed', 'is_indexed', 'is_favorite')

    def validate(self, attrs):
        if 'date' in attrs:
            attrs['year'] = str(attrs['date'].year) if attrs.get('date') else ''
        return attrs

    def get_people(self, obj):
        names = []
        seen = set()
        for face in obj.detected_faces.all():
            key = str(face.person_id)
            if key not in seen:
                seen.add(key)
                names.append(face.person.name)
        for person in obj.identified_people.all():
            key = str(person.id)
            if key not in seen:
                seen.add(key)
                names.append(person.name)
        return names

    def get_is_indexed(self, obj):
        return obj.clip_embedding is not None

    def get_capturedAt(self, obj):
        exif = obj.exif_json or {}
        return exif.get('capture_datetime') or exif.get('capture_date') or None

    def get_url(self, obj):
        return normalize_media_url(obj.original_file.url) if obj.original_file else None

    def get_restoredUrl(self, obj):
        return normalize_media_url(obj.restored_file.url) if obj.restored_file else None

class CapsuleSerializer(serializers.ModelSerializer):
    daysRemaining = serializers.SerializerMethodField()
    memory_urls = serializers.SerializerMethodField()
    sealedById = serializers.SerializerMethodField()
    targetUsers = serializers.SerializerMethodField()
    addedToVault = serializers.BooleanField(source='added_to_vault', read_only=True)

    class Meta:
        model = Capsule
        fields = (
            'id',
            'title',
            'unlock_date',
            'status',
            'daysRemaining',
            'message',
            'memory_urls',
            'sealedById',
            'is_public',
            'targetUsers',
            'addedToVault',
        )

    def get_daysRemaining(self, obj):
        from django.utils import timezone
        delta = obj.unlock_date - timezone.now()
        return max(delta.days, 0)

    def get_memory_urls(self, obj):
        memories = obj.memories.all()
        if obj.status == 'LOCKED' or obj.unlock_date > timezone.now():
            memories = memories[:1]
        return [normalize_media_url(m.original_file.url) for m in memories if m.original_file]

    def get_sealedById(self, obj):
        return str(obj.sealed_by_id) if obj.sealed_by_id else None

    def get_targetUsers(self, obj):
        return [
            {
                'id': str(user.id),
                'name': user.full_name,
                'email': user.email,
            }
            for user in obj.target_users.all()
        ]

class MemoryCollectionSerializer(serializers.ModelSerializer):
    memory_count = serializers.SerializerMethodField()

    class Meta:
        model = MemoryCollection
        fields = ('id', 'name', 'memory_count', 'created_at')

    def get_memory_count(self, obj):
        return getattr(obj, 'memory_count', 0)
