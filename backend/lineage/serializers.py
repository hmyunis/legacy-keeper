from rest_framework import serializers
from .models import Person, KinshipEdge

class PersonSerializer(serializers.ModelSerializer):
    photo = serializers.URLField(source='avatar_url', read_only=True)
    deathYear = serializers.CharField(source='death_year')

    class Meta:
        model = Person
        fields = ('id', 'name', 'role', 'photo', 'deathYear', 'biography')

class KinshipEdgeSerializer(serializers.ModelSerializer):
    type = serializers.CharField(source='relationship_type')

    class Meta:
        model = KinshipEdge
        fields = ('from_person', 'to_person', 'type')