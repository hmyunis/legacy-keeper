from rest_framework import serializers
from .models import Memory, Capsule, MemoryCollection
from lineage.models import Person, PersonFaceEmbedding

class DetectedFaceSerializer(serializers.ModelSerializer):
    person_id = serializers.CharField(source='person.id', read_only=True)
    person_name = serializers.CharField(source='person.name', read_only=True)
    person_avatar = serializers.SerializerMethodField()

    class Meta:
        model = PersonFaceEmbedding
        fields = ('id', 'person_id', 'person_name', 'person_avatar', 'bounding_box')

    def get_person_avatar(self, obj):
        if obj.person.avatar_url:
            return obj.person.avatar_url
        return f"https://ui-avatars.com/api/?name={obj.person.name.replace(' ', '+')}&background=B88F5B&color=fff"

class IdentifiedPersonSerializer(serializers.ModelSerializer):
    person_avatar = serializers.SerializerMethodField()

    class Meta:
        model = Person
        fields = ('id', 'name', 'role', 'person_avatar')

    def get_person_avatar(self, obj):
        if obj.avatar_url:
            return obj.avatar_url
        return f"https://ui-avatars.com/api/?name={obj.name.replace(' ', '+')}&background=B88F5B&color=fff"

class MemorySerializer(serializers.ModelSerializer):
    url = serializers.FileField(source='original_file', read_only=True)
    restoredUrl = serializers.FileField(source='restored_file', read_only=True)
    people = serializers.SerializerMethodField()
    detected_faces = DetectedFaceSerializer(many=True, read_only=True)
    identified_people = IdentifiedPersonSerializer(many=True, read_only=True)
    is_indexed = serializers.SerializerMethodField()

    class Meta:
        model = Memory
        fields = ('id', 'url', 'restoredUrl', 'title', 'location', 'date', 'year', 'cluster_name', 'ai_caption', 'human_caption', 'tags', 'people', 'detected_faces', 'identified_people', 'exif_json', 'ai_suggestions', 'is_reviewed', 'is_indexed', 'is_favorite')

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

class CapsuleSerializer(serializers.ModelSerializer):
    daysRemaining = serializers.SerializerMethodField()
    memory_urls = serializers.SerializerMethodField()

    class Meta:
        model = Capsule
        fields = ('id', 'title', 'unlock_date', 'status', 'daysRemaining', 'message', 'memory_urls')

    def get_daysRemaining(self, obj):
        from django.utils import timezone
        delta = obj.unlock_date - timezone.now()
        return max(delta.days, 0)

    def get_memory_urls(self, obj):
        request = self.context.get('request')
        memories = obj.memories.all()
        if obj.status == 'LOCKED':
            memories = memories[:1]
        return [request.build_absolute_uri(m.original_file.url) for m in memories]

class MemoryCollectionSerializer(serializers.ModelSerializer):
    memory_count = serializers.SerializerMethodField()

    class Meta:
        model = MemoryCollection
        fields = ('id', 'name', 'memory_count', 'created_at')

    def get_memory_count(self, obj):
        return getattr(obj, 'memory_count', 0)
