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
    if hasattr(instance, 'vault_id') and instance.vault_id:
        return instance.vault_id
    if hasattr(instance, 'vault') and getattr(instance, 'vault', None) is not None:
        return instance.vault.id
    if hasattr(instance, 'from_person') and getattr(instance, 'from_person', None) is not None:
        return instance.from_person.vault_id
    if hasattr(instance, 'media_item') and getattr(instance, 'media_item', None) is not None:
        return instance.media_item.vault_id
    if isinstance(instance, FamilyVault):
        return instance.id
    return None

@receiver(post_save)
def log_save(sender, instance, created, **kwargs):
    if sender not in AUDIT_MODELS:
        return

    user = get_current_user()
    actor = user if user and getattr(user, 'is_authenticated', False) else None

    action = AuditLog.Action.CREATE if created else AuditLog.Action.UPDATE
    
    # Simple change tracking could be added here for UPDATE
    # For MVP, we just log that an update occurred
    
    AuditLog.objects.create(
        actor=actor,
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
    actor = user if user and getattr(user, 'is_authenticated', False) else None

    AuditLog.objects.create(
        actor=actor,
        vault_id=get_vault_id(instance),
        content_type=ContentType.objects.get_for_model(sender),
        object_id=instance.pk,
        action=AuditLog.Action.DELETE,
        changes={'info': f'Record deleted: {str(instance)}'}
    )
