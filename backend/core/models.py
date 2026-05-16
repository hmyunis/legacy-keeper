import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _

class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = None  # Remove username field
    email = models.EmailField(_('email address'), unique=True)
    full_name = models.CharField(max_length=255)
    is_verified = models.BooleanField(default=False)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name']

    def __str__(self):
        return self.email

class Vault(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Settings
    primary_hue = models.CharField(max_length=7, default='#B88F5B')
    grain_enabled = models.BooleanField(default=True)

    def __str__(self):
        return self.name

class VaultMember(models.Model):
    ROLE_CHOICES = (
        ('ADMIN', 'Admin'),
        ('CONTRIBUTOR', 'Contributor'),
        ('VIEWER', 'Viewer'),
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='vault_memberships')
    vault = models.ForeignKey(Vault, on_delete=models.CASCADE, related_name='members')
    role = models.CharField(max_length=15, choices=ROLE_CHOICES, default='VIEWER')
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'vault')

class LineagePact(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('ACCEPTED', 'Accepted'),
    )
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    requester_vault = models.ForeignKey(Vault, on_delete=models.CASCADE, related_name='requested_pacts')
    target_vault = models.ForeignKey(Vault, on_delete=models.CASCADE, related_name='received_pacts')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)

class ActionLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vault = models.ForeignKey(Vault, on_delete=models.CASCADE, related_name='logs')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    action_type = models.CharField(max_length=50)
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

class PushSubscription(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='push_subscriptions')
    endpoint = models.URLField(max_length=500)
    p256dh = models.CharField(max_length=200)
    auth = models.CharField(max_length=200)
    created_at = models.DateTimeField(auto_now_add=True)