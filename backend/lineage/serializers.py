from rest_framework import serializers
from core.utils.media import normalize_media_url
from .models import Person, KinshipEdge

class PersonSerializer(serializers.ModelSerializer):
    photo = serializers.SerializerMethodField()
    deathYear = serializers.CharField(source='death_year', allow_blank=True, required=False)
    birthYear = serializers.CharField(source='birth_year', allow_blank=True, required=False)
    vaultId = serializers.CharField(source='vault.id', read_only=True)
    vaultName = serializers.CharField(source='vault.name', read_only=True)

    class Meta:
        model = Person
        fields = ('id', 'name', 'role', 'photo', 'birthYear', 'deathYear', 'biography', 'vaultId', 'vaultName')

    def get_photo(self, obj):
        if obj.avatar:
            return normalize_media_url(obj.avatar.url)
        if obj.avatar_url:
            return obj.avatar_url
        name_formatted = obj.name.replace(' ', '+')
        return f"https://ui-avatars.com/api/?name={name_formatted}&background=B88F5B&color=fff"

class KinshipEdgeSerializer(serializers.ModelSerializer):
    type = serializers.CharField(source='relationship_type')

    class Meta:
        model = KinshipEdge
        fields = ('from_person', 'to_person', 'type')
