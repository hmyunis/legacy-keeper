from rest_framework import serializers
from .models import Memory, Capsule

class MemorySerializer(serializers.ModelSerializer):
    url = serializers.FileField(source='original_file', read_only=True)
    restoredUrl = serializers.FileField(source='restored_file', read_only=True)
    people = serializers.SerializerMethodField()

    class Meta:
        model = Memory
        fields = ('id', 'url', 'restoredUrl', 'title', 'location', 'date', 'year', 'cluster_name', 'ai_caption', 'tags', 'people')

    def get_people(self, obj):
        return [face.person.name for face in obj.detected_faces.all()]

class CapsuleSerializer(serializers.ModelSerializer):
    daysRemaining = serializers.SerializerMethodField()

    class Meta:
        model = Capsule
        fields = ('id', 'title', 'unlock_date', 'status', 'daysRemaining', 'message')

    def get_daysRemaining(self, obj):
        from django.utils import timezone
        delta = obj.unlock_date - timezone.now()
        return max(delta.days, 0)