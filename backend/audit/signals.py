from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.contrib.contenttypes.models import ContentType
from django.forms.models import model_to_dict

from core.middleware import get_current_user
from .models import AuditLog
# Import models we want to track
from vaults.models import FamilyVault, Membership, Invite
from media.models import MediaItem
from genealogy.models import PersonProfile, Relationship

# List of models to audit
AUDIT_MODELS = [FamilyVault, Membership, Invite, MediaItem, PersonProfile, Relationship]

def get_vault_id(instance):
    """Helper to extract vault_id from various model types"""
    if hasattr(instance, 'vault_id'):
        return instance.vault_id
    elif hasattr(instance, 'vault'):
        return instance.vault.id
    elif isinstance(instance, FamilyVault):
        return instance.id
    return None

@receiver(post_save)
def log_save(sender, instance, created, **kwargs):
    if sender not in AUDIT_MODELS:
        return

    user = get_current_user()
    if not user or not user.is_authenticated:
        return

    action = AuditLog.Action.CREATE if created else AuditLog.Action.UPDATE
    
    # Simple change tracking could be added here for UPDATE
    # For MVP, we just log that an update occurred
    
    AuditLog.objects.create(
        actor=user,
        vault_id=get_vault_id(instance),
        content_type=ContentType.objects.get_for_model(sender),
        object_id=instance.pk,
        action=action,
        changes={'info': 'Record created/updated'} 
    )

@receiver(post_delete)
def log_delete(sender, instance, **kwargs):
    if sender not in AUDIT_MODELS:
        return

    user = get_current_user()
    if not user or not user.is_authenticated:
        return

    AuditLog.objects.create(
        actor=user,
        vault_id=get_vault_id(instance),
        content_type=ContentType.objects.get_for_model(sender),
        object_id=instance.pk,
        action=AuditLog.Action.DELETE,
        changes={'info': f'Record deleted: {str(instance)}'}
    )
