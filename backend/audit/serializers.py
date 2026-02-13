from rest_framework import serializers
from .models import AuditLog

class AuditLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.ReadOnlyField(source='actor.full_name')
    target_type = serializers.ReadOnlyField(source='content_type.model')

    class Meta:
        model = AuditLog
        fields = (
            'id', 'timestamp', 'actor_name', 'action', 
            'target_type', 'changes'
        )
