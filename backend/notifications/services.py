import json
import logging

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from vaults.models import Membership

from .models import InAppNotification, NotificationPreference, PushSubscription

logger = logging.getLogger(__name__)


TYPE_TO_PREF_FIELD = {
    InAppNotification.NotificationType.UPLOAD: 'new_uploads',
    InAppNotification.NotificationType.COMMENT: 'comments',
    InAppNotification.NotificationType.TREE: 'tree_updates',
    InAppNotification.NotificationType.SECURITY: 'security_alerts',
    InAppNotification.NotificationType.MEMBER: 'member_joins',
}

TYPE_TO_CLIENT_LABEL = {
    InAppNotification.NotificationType.UPLOAD: 'upload',
    InAppNotification.NotificationType.COMMENT: 'comment',
    InAppNotification.NotificationType.SECURITY: 'security',
    InAppNotification.NotificationType.TREE: 'tree',
    InAppNotification.NotificationType.MEMBER: 'member',
    InAppNotification.NotificationType.SYSTEM: 'system',
}

def is_push_delivery_available():
    has_config = bool(
        getattr(settings, 'VAPID_PUBLIC_KEY', '').strip()
        and getattr(settings, 'VAPID_PRIVATE_KEY', '').strip()
        and getattr(settings, 'VAPID_SUBJECT', '').strip()
    )
    if not has_config:
        return False

    try:
        import pywebpush  # noqa: F401
    except Exception:
        return False

    return True


def _get_or_create_preferences(user):
    preferences, _ = NotificationPreference.objects.get_or_create(user=user)
    return preferences


def _is_allowed_by_preferences(preferences, notification_type):
    field_name = TYPE_TO_PREF_FIELD.get(notification_type)
    if not field_name:
        return True
    return bool(getattr(preferences, field_name, True))


def _to_push_payload(
    *,
    notification,
    notification_type,
    title,
    message,
    route='/',
    metadata=None,
    vault_id=None,
):
    effective_route = route or '/'
    notification_id = None
    effective_metadata = metadata or {}
    effective_vault_id = str(vault_id) if vault_id else None

    if notification:
        effective_route = notification.route or effective_route
        notification_id = str(notification.id)
        effective_vault_id = str(notification.vault_id) if notification.vault_id else effective_vault_id
        effective_metadata = notification.metadata or effective_metadata

    effective_type = notification.notification_type if notification else notification_type
    resolved_route = effective_route if effective_route.startswith('/') else f'/{effective_route}'
    scope_tag = effective_vault_id or 'global'
    type_label = TYPE_TO_CLIENT_LABEL.get(effective_type, 'system')

    return {
        'title': title,
        'body': message,
        'icon': '/notification-icon.svg',
        'badge': '/notification-badge.svg',
        'image': '/notification-image.svg',
        'tag': f'legacykeeper-{type_label}-{scope_tag}',
        'renotify': False,
        'requireInteraction': effective_type == InAppNotification.NotificationType.SECURITY,
        'actions': [
            {'action': 'open', 'title': 'Open'},
        ],
        'data': {
            'url': resolved_route,
            'notificationId': notification_id,
            'vaultId': effective_vault_id,
            'type': type_label,
            'metadata': effective_metadata,
        },
    }


def _send_push(subscription, payload):
    if not is_push_delivery_available():
        return False

    try:
        from pywebpush import webpush, WebPushException
    except Exception:
        logger.warning('pywebpush is not installed; skipping browser push delivery')
        return False

    try:
        webpush(
            subscription_info={
                'endpoint': subscription.endpoint,
                'keys': {
                    'p256dh': subscription.p256dh,
                    'auth': subscription.auth,
                },
            },
            data=json.dumps(payload),
            vapid_private_key=settings.VAPID_PRIVATE_KEY,
            vapid_claims={'sub': settings.VAPID_SUBJECT},
            ttl=60,
        )
        subscription.is_active = True
        subscription.last_error = ''
        subscription.last_success_at = timezone.now()
        subscription.save(update_fields=['is_active', 'last_error', 'last_success_at', 'updated_at'])
        return True
    except Exception as exc:
        status_code = None
        response = getattr(exc, 'response', None)
        if response is not None:
            status_code = getattr(response, 'status_code', None)

        # Stale or unauthorized endpoints should be disabled so they stop failing on every trigger.
        if status_code in (401, 403, 404, 410):
            subscription.is_active = False

        subscription.last_error = str(exc)[:2000]
        subscription.save(update_fields=['is_active', 'last_error', 'updated_at'])

        if isinstance(exc, WebPushException):
            logger.warning('Web push failed: %s', exc)
        else:
            logger.warning('Unexpected push delivery error: %s', exc)
        return False


def _send_push_to_user(user, payload):
    subscriptions = PushSubscription.objects.filter(user=user, is_active=True)
    delivered = 0
    for subscription in subscriptions:
        if _send_push(subscription, payload):
            delivered += 1
    return delivered


@transaction.atomic
def notify_user(
    *,
    user,
    notification_type,
    title,
    message,
    actor=None,
    vault=None,
    route='/',
    metadata=None,
):
    preferences = _get_or_create_preferences(user)
    if not _is_allowed_by_preferences(preferences, notification_type):
        return None

    in_app_notification = None
    if preferences.in_app_enabled:
        in_app_notification = InAppNotification.objects.create(
            recipient=user,
            actor=actor,
            vault=vault,
            notification_type=notification_type,
            title=title[:180],
            message=message,
            route=route or '/',
            metadata=metadata or {},
        )

    if preferences.push_enabled:
        payload = _to_push_payload(
            notification=in_app_notification,
            notification_type=notification_type,
            title=title,
            message=message,
            route=route,
            metadata=metadata,
            vault_id=getattr(vault, 'id', None),
        )
        _send_push_to_user(user, payload)

    return in_app_notification


def notify_vault_members(
    *,
    vault,
    notification_type,
    title,
    message,
    actor=None,
    route='/',
    metadata=None,
    admin_only=False,
    exclude_user_ids=None,
):
    memberships = Membership.objects.filter(vault=vault, is_active=True).select_related('user')
    if admin_only:
        memberships = memberships.filter(role=Membership.Roles.ADMIN)

    excluded = {str(user_id) for user_id in (exclude_user_ids or [])}
    if actor and actor.is_authenticated:
        excluded.add(str(actor.id))

    created_notifications = []
    for membership in memberships:
        if str(membership.user_id) in excluded:
            continue
        notification = notify_user(
            user=membership.user,
            notification_type=notification_type,
            title=title,
            message=message,
            actor=actor,
            vault=vault,
            route=route,
            metadata=metadata,
        )
        if notification:
            created_notifications.append(notification)

    return created_notifications


def notify_security_login(*, user, ip_address=None, user_agent=None):
    details = []
    if ip_address:
        details.append(f'IP {ip_address}')
    if user_agent:
        details.append(user_agent[:80])

    description = 'Successful sign-in detected.'
    if details:
        description = f'Successful sign-in detected ({", ".join(details)}).'

    return notify_user(
        user=user,
        notification_type=InAppNotification.NotificationType.SECURITY,
        title='Security sign-in alert',
        message=description,
        actor=None,
        vault=None,
        route='/settings?tab=notifications',
        metadata={
            'ipAddress': ip_address or '',
            'userAgent': user_agent or '',
            'timestamp': timezone.now().isoformat(),
        },
    )


def remove_push_subscription(*, user, endpoint=None):
    queryset = PushSubscription.objects.filter(user=user)
    if endpoint:
        queryset = queryset.filter(endpoint=endpoint)
    deleted_count, _ = queryset.delete()
    return deleted_count
