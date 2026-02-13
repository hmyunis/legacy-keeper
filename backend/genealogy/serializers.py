from rest_framework import serializers
from .models import PersonProfile, Relationship, MediaTag

class PersonProfileSerializer(serializers.ModelSerializer):
    photo_url = serializers.SerializerMethodField()

    class Meta:
        model = PersonProfile
        fields = (
            'id', 'vault', 'linked_user', 'full_name', 'maiden_name', 
            'birth_date', 'death_date', 'is_deceased', 'bio', 
            'profile_photo', 'photo_url'
        )
        read_only_fields = ('vault',)

    def get_photo_url(self, obj):
        request = self.context.get('request')
        if obj.profile_photo:
            return request.build_absolute_uri(obj.profile_photo.url)
        return None

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
        fields = ('id', 'media_item', 'person', 'person_name', 'face_coordinates', 'created_by')
        read_only_fields = ('created_by',)
