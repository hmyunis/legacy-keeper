from django.db import models
from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.utils.translation import gettext_lazy as _

class AuditLog(models.Model):
    class Action(models.TextChoices):
        CREATE = 'CREATE', _('Create')
        UPDATE = 'UPDATE', _('Update')
        DELETE = 'DELETE', _('Delete')
        LOGIN = 'LOGIN', _('Login')
        ACCESS = 'ACCESS', _('Access')

    # Who
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True,
        related_name='audit_logs'
    )

    # Where (Vault Context)
    # We store the vault ID specifically to allow Vault Admins to filter logs easily
    vault_id = models.UUIDField(null=True, blank=True, db_index=True)

    # What (Target Object)
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.UUIDField() # Assuming all your models use UUIDs
    content_object = GenericForeignKey('content_type', 'object_id')

    # Details
    action = models.CharField(max_length=20, choices=Action.choices)
    changes = models.JSONField(default=dict, blank=True) # For updates: {old: x, new: y}
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['vault_id', '-timestamp']),
        ]

    def __str__(self):
        return f"{self.actor} {self.action} {self.content_type} ({self.timestamp})"
