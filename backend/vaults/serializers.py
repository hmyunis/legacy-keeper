from rest_framework import serializers
from .models import Memory, Capsule
from lineage.models import PersonFaceEmbedding

class DetectedFaceSerializer(serializers.ModelSerializer):
    person_id = serializers.CharField(source='person.id', read_only=True)
    person_name = serializers.CharField(source='person.name', read_only=True)
    person_avatar = serializers.SerializerMethodField()

    class Meta:
        model = PersonFaceEmbedding
        fields = ('id', 'person_id', 'person_name', 'person_avatar')

    def get_person_avatar(self, obj):
        if obj.person.avatar_url:
            return obj.person.avatar_url
        return f"https://ui-avatars.com/api/?name={obj.person.name.replace(' ', '+')}&background=B88F5B&color=fff"

class MemorySerializer(serializers.ModelSerializer):
    url = serializers.FileField(source='original_file', read_only=True)
    restoredUrl = serializers.FileField(source='restored_file', read_only=True)
    people = serializers.SerializerMethodField()
    detected_faces = DetectedFaceSerializer(many=True, read_only=True)
    is_indexed = serializers.SerializerMethodField()

    class Meta:
        model = Memory
        fields = ('id', 'url', 'restoredUrl', 'title', 'location', 'date', 'year', 'cluster_name', 'ai_caption', 'human_caption', 'tags', 'people', 'detected_faces', 'exif_json', 'is_reviewed', 'is_indexed', 'is_favorite')

    def get_people(self, obj):
        return [face.person.name for face in obj.detected_faces.all()]

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