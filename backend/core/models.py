import uuid
import secrets
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _

class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = None
    email = models.EmailField(_('email address'), unique=True)
    full_name = models.CharField(max_length=255)
    is_verified = models.BooleanField(default=False)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)

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


class VaultInvitation(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('ACCEPTED', 'Accepted'),
        ('REJECTED', 'Rejected'),
        ('REVOKED', 'Revoked'),
    )
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vault = models.ForeignKey(Vault, on_delete=models.CASCADE, related_name='invitations')
    email = models.EmailField()
    role = models.CharField(max_length=15, choices=VaultMember.ROLE_CHOICES, default='VIEWER')
    invited_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='sent_vault_invitations')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    accepted_at = models.DateTimeField(null=True, blank=True)
    rejected_at = models.DateTimeField(null=True, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('vault', 'email')


class VaultInviteLink(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vault = models.ForeignKey(Vault, on_delete=models.CASCADE, related_name='invite_links')
    token = models.CharField(max_length=64, unique=True, db_index=True)
    role = models.CharField(max_length=15, choices=VaultMember.ROLE_CHOICES, default='VIEWER')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_vault_invite_links')
    max_uses = models.PositiveIntegerField(null=True, blank=True)
    uses_count = models.PositiveIntegerField(default=0)
    expires_at = models.DateTimeField(null=True, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @staticmethod
    def generate_token():
        return secrets.token_urlsafe(24)

    @property
    def is_revoked(self):
        return self.revoked_at is not None

    @property
    def is_deleted(self):
        return self.deleted_at is not None

    def has_capacity(self):
        return self.max_uses is None or self.uses_count < self.max_uses

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
    target_id = models.UUIDField(null=True, blank=True)
    target_type = models.CharField(max_length=20, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

class PushSubscription(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='push_subscriptions')
    endpoint = models.URLField(max_length=500)
    p256dh = models.CharField(max_length=200)
    auth = models.CharField(max_length=200)
    created_at = models.DateTimeField(auto_now_add=True)

def get_accessible_vault_ids(vault_id):
    from django.db.models import Q
    pacts = LineagePact.objects.filter(
        Q(requester_vault_id=vault_id) | Q(target_vault_id=vault_id),
        status='ACCEPTED'
    )
    return [vault_id] + [p.target_vault_id if str(p.requester_vault_id) == str(vault_id) else p.requester_vault_id for p in pacts]
