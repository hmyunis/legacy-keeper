from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
import uuid
from datetime import timedelta
from django.utils import timezone

from core.models import TimeStampedModel
from core.utils import get_upload_path

class FamilyVault(TimeStampedModel):
    class StorageQuality(models.TextChoices):
        BALANCED = 'BALANCED', _('Balanced')
        HIGH = 'HIGH', _('High')
        ORIGINAL = 'ORIGINAL', _('Original')

    class DefaultVisibility(models.TextChoices):
        PRIVATE = 'PRIVATE', _('Private')
        FAMILY = 'FAMILY', _('Family')

    name = models.CharField(max_length=255)
    family_name = models.CharField(max_length=120, blank=True, default='')
    description = models.TextField(blank=True)
    cover_photo = models.ImageField(upload_to=get_upload_path, null=True, blank=True)
    storage_quality = models.CharField(
        max_length=20,
        choices=StorageQuality.choices,
        default=StorageQuality.HIGH,
    )
    default_visibility = models.CharField(
        max_length=20,
        choices=DefaultVisibility.choices,
        default=DefaultVisibility.FAMILY,
    )
    
    # Archival Policy
    safety_window_minutes = models.IntegerField(
        default=60, 
        help_text="Time in minutes a contributor has to delete their own upload."
    )
    
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.PROTECT, 
        related_name='owned_vaults'
    )

    def __str__(self):
        return self.name

class Membership(TimeStampedModel):
    class Roles(models.TextChoices):
        ADMIN = 'ADMIN', _('Administrator')
        CONTRIBUTOR = 'CONTRIBUTOR', _('Contributor')
        VIEWER = 'VIEWER', _('Viewer')

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='memberships')
    vault = models.ForeignKey(FamilyVault, on_delete=models.CASCADE, related_name='members')
    role = models.CharField(max_length=20, choices=Roles.choices, default=Roles.CONTRIBUTOR)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('user', 'vault')

    def __str__(self):
        return f"{self.user.email} - {self.vault.name} ({self.role})"

class Invite(TimeStampedModel):
    class Roles(models.TextChoices):
        ADMIN = 'ADMIN', _('Administrator')
        CONTRIBUTOR = 'CONTRIBUTOR', _('Contributor')
        VIEWER = 'VIEWER', _('Viewer')

    token = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    vault = models.ForeignKey(FamilyVault, on_delete=models.CASCADE, related_name='invites')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    
    # If email is specified, only that email can join. If null, it's a public link.
    email = models.EmailField(null=True, blank=True)
    role = models.CharField(max_length=20, choices=Roles.choices, default=Roles.CONTRIBUTOR)
    
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    def is_valid(self):
        return not self.is_used and self.expires_at > timezone.now()

    def save(self, *args, **kwargs):
        if not self.expires_at:
            # Default 7 days expiry
            self.expires_at = timezone.now() + timedelta(days=7)
        super().save(*args, **kwargs)
