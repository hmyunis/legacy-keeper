from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from core.middleware import get_current_user
from genealogy.models import PersonProfile, Relationship
from media.models import MediaItem
from vaults.models import Membership

from .models import InAppNotification
from .services import notify_user, notify_vault_members


def _request_actor():
    actor = get_current_user()
    if actor and getattr(actor, 'is_authenticated', False):
        return actor
    return None


def _display_name(user, fallback='A family member'):
    if not user:
        return fallback
    return user.full_name or getattr(user, 'email', fallback) or fallback


@receiver(pre_save, sender=MediaItem)
def capture_media_previous_state(sender, instance, **kwargs):
    if not instance.pk:
        instance._previous_description = ''
        return

    previous = MediaItem.objects.filter(pk=instance.pk).only('description').first()
    instance._previous_description = previous.description if previous else ''


@receiver(pre_save, sender=Membership)
def capture_membership_previous_state(sender, instance, **kwargs):
    if not instance.pk:
        instance._previous_is_active = None
        instance._previous_role = None
        return

    previous = Membership.objects.filter(pk=instance.pk).only('is_active', 'role').first()
    if previous:
        instance._previous_is_active = previous.is_active
        instance._previous_role = previous.role
        return

    instance._previous_is_active = None
    instance._previous_role = None


@receiver(post_save, sender=MediaItem)
def on_media_created(sender, instance, created, **kwargs):
    if not created:
        return

    actor = _request_actor() or instance.uploader
    actor_name = _display_name(actor)
    media_title = instance.title or 'Untitled memory'

    notify_vault_members(
        vault=instance.vault,
        notification_type=InAppNotification.NotificationType.UPLOAD,
        title='New archival upload',
        message=f'{actor_name} added "{media_title}" to the vault.',
        actor=actor,
        route='/vault',
        metadata={
            'mediaId': str(instance.id),
            'mediaTitle': media_title,
        },
    )


@receiver(post_save, sender=MediaItem)
def on_media_description_updated(sender, instance, created, **kwargs):
    if created:
        return

    previous_description = (getattr(instance, '_previous_description', '') or '').strip()
    current_description = (instance.description or '').strip()
    if not current_description or current_description == previous_description:
        return

    actor = _request_actor() or instance.uploader
    actor_name = _display_name(actor)
    media_title = instance.title or 'Untitled memory'

    notify_vault_members(
        vault=instance.vault,
        notification_type=InAppNotification.NotificationType.COMMENT,
        title='Memory note updated',
        message=f'{actor_name} added or updated a note on "{media_title}".',
        actor=actor,
        route='/vault',
        metadata={
            'mediaId': str(instance.id),
            'mediaTitle': media_title,
            'hadPreviousNote': bool(previous_description),
        },
    )


@receiver(post_save, sender=PersonProfile)
def on_profile_created(sender, instance, created, **kwargs):
    if not created:
        return

    actor = _request_actor()
    actor_name = actor.full_name if actor and actor.full_name else 'A family member'

    notify_vault_members(
        vault=instance.vault,
        notification_type=InAppNotification.NotificationType.TREE,
        title='Family tree updated',
        message=f'{actor_name} added {instance.full_name} to the family tree.',
        actor=actor,
        route='/tree',
        metadata={
            'personId': str(instance.id),
            'personName': instance.full_name,
        },
    )


@receiver(post_save, sender=Relationship)
def on_relationship_created(sender, instance, created, **kwargs):
    if not created:
        return

    actor = _request_actor()
    actor_name = actor.full_name if actor and actor.full_name else 'A family member'
    from_name = instance.from_person.full_name
    to_name = instance.to_person.full_name

    notify_vault_members(
        vault=instance.from_person.vault,
        notification_type=InAppNotification.NotificationType.TREE,
        title='Family relationship mapped',
        message=f'{actor_name} linked {from_name} and {to_name} in the family tree.',
        actor=actor,
        route='/tree',
        metadata={
            'relationshipId': str(instance.id),
            'fromPersonId': str(instance.from_person_id),
            'toPersonId': str(instance.to_person_id),
        },
    )


@receiver(post_save, sender=Membership)
def on_member_joined(sender, instance, created, **kwargs):
    if not instance.is_active:
        return

    was_reactivated = getattr(instance, '_previous_is_active', None) is False
    if not created and not was_reactivated:
        return

    actor = _request_actor() or instance.user
    member_name = _display_name(instance.user, fallback='A member')
    vault_name = instance.vault.name

    notify_vault_members(
        vault=instance.vault,
        notification_type=InAppNotification.NotificationType.MEMBER,
        title='New member joined',
        message=f'{member_name} joined {vault_name}.',
        actor=actor,
        route='/members',
        admin_only=True,
        exclude_user_ids=[instance.user_id],
        metadata={
            'memberId': str(instance.user_id),
            'memberName': member_name,
            'membershipId': str(instance.id),
            'reactivated': was_reactivated,
        },
    )


@receiver(post_save, sender=Membership)
def on_membership_role_changed(sender, instance, created, **kwargs):
    if created or not instance.is_active:
        return

    previous_role = getattr(instance, '_previous_role', None)
    if not previous_role or previous_role == instance.role:
        return

    actor = _request_actor()
    if actor and actor.id == instance.user_id:
        return

    actor_name = _display_name(actor, fallback='An administrator')
    role_label = instance.get_role_display() or instance.role.title()

    notify_user(
        user=instance.user,
        notification_type=InAppNotification.NotificationType.SECURITY,
        title='Vault permission updated',
        message=f'{actor_name} changed your vault role to {role_label}.',
        actor=actor,
        vault=instance.vault,
        route='/settings?tab=notifications',
        metadata={
            'vaultId': str(instance.vault_id),
            'membershipId': str(instance.id),
            'previousRole': previous_role,
            'currentRole': instance.role,
        },
    )
