from rest_framework import serializers

from .models import InAppNotification, NotificationPreference
from .services import TYPE_TO_CLIENT_LABEL


class InAppNotificationSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()
    type = serializers.SerializerMethodField()

    class Meta:
        model = InAppNotification
        fields = (
            'id',
            'title',
            'message',
            'type',
            'notification_type',
            'is_read',
            'route',
            'metadata',
            'vault_id',
            'actor_name',
            'created_at',
        )

    def get_actor_name(self, obj):
        if not obj.actor:
            return 'System'
        return obj.actor.full_name or obj.actor.email

    def get_type(self, obj):
        return TYPE_TO_CLIENT_LABEL.get(obj.notification_type, 'system')


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    push_available = serializers.BooleanField(read_only=True)

    class Meta:
        model = NotificationPreference
        fields = (
            'in_app_enabled',
            'push_enabled',
            'new_uploads',
            'comments',
            'tree_updates',
            'security_alerts',
            'member_joins',
            'push_available',
        )


class PushSubscriptionUpsertSerializer(serializers.Serializer):
    endpoint = serializers.CharField()
    p256dh = serializers.CharField()
    auth = serializers.CharField()
    user_agent = serializers.CharField(required=False, allow_blank=True)


class PushUnsubscribeSerializer(serializers.Serializer):
    endpoint = serializers.CharField(required=False, allow_blank=True)

