from django.conf import settings
from django.db import models

from core.models import TimeStampedModel
from vaults.models import FamilyVault


class NotificationPreference(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notification_preferences',
    )
    in_app_enabled = models.BooleanField(default=True)
    push_enabled = models.BooleanField(default=True)
    new_uploads = models.BooleanField(default=True)
    comments = models.BooleanField(default=True)
    tree_updates = models.BooleanField(default=True)
    security_alerts = models.BooleanField(default=True)
    member_joins = models.BooleanField(default=True)

    def __str__(self):
        return f'Notification preferences for {self.user.email}'


class InAppNotification(TimeStampedModel):
    class NotificationType(models.TextChoices):
        UPLOAD = 'UPLOAD', 'Upload'
        COMMENT = 'COMMENT', 'Comment'
        SECURITY = 'SECURITY', 'Security'
        TREE = 'TREE', 'Tree'
        MEMBER = 'MEMBER', 'Member'
        SYSTEM = 'SYSTEM', 'System'

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='in_app_notifications',
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='triggered_notifications',
    )
    vault = models.ForeignKey(
        FamilyVault,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications',
    )
    notification_type = models.CharField(max_length=20, choices=NotificationType.choices)
    title = models.CharField(max_length=180)
    message = models.TextField()
    route = models.CharField(max_length=255, default='/')
    metadata = models.JSONField(default=dict, blank=True)
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', '-created_at']),
            models.Index(fields=['recipient', 'is_read']),
        ]

    def __str__(self):
        return f'{self.recipient.email}: {self.title}'


class PushSubscription(TimeStampedModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='push_subscriptions',
    )
    endpoint = models.TextField(unique=True)
    p256dh = models.CharField(max_length=512)
    auth = models.CharField(max_length=512)
    is_active = models.BooleanField(default=True)
    user_agent = models.CharField(max_length=512, blank=True)
    last_error = models.TextField(blank=True)
    last_success_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['user', 'is_active']),
        ]

    def __str__(self):
        return f'Push subscription for {self.user.email}'

