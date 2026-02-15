import logging
import time

from django.db import IntegrityError, OperationalError
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import InAppNotification, NotificationPreference, PushSubscription
from .serializers import (
    InAppNotificationSerializer,
    NotificationPreferenceSerializer,
    PushSubscriptionUpsertSerializer,
    PushUnsubscribeSerializer,
)
from .services import (
    is_push_delivery_available,
    notify_user,
    remove_push_subscription,
)

logger = logging.getLogger(__name__)


def _parse_limit(raw_value, default=30, minimum=1, maximum=100):
    try:
        value = int(raw_value)
    except (TypeError, ValueError):
        return default
    return max(minimum, min(maximum, value))


def _parse_since(raw_value):
    if not raw_value:
        return None
    parsed = parse_datetime(raw_value)
    if not parsed:
        return None
    if timezone.is_naive(parsed):
        parsed = timezone.make_aware(parsed, timezone.get_current_timezone())
    return parsed


def _is_sqlite_locked(exc):
    return 'database is locked' in str(exc).lower()


def _upsert_push_subscription(*, user, payload, max_attempts=3):
    endpoint = payload['endpoint']
    for attempt in range(max_attempts):
        try:
            subscription = PushSubscription.objects.filter(endpoint=endpoint).first()

            if subscription:
                has_changes = any(
                    [
                        subscription.user_id != user.id,
                        subscription.p256dh != payload['p256dh'],
                        subscription.auth != payload['auth'],
                        subscription.user_agent != payload.get('user_agent', ''),
                        not subscription.is_active,
                        bool(subscription.last_error),
                    ]
                )
                if not has_changes:
                    return subscription, False

                subscription.user = user
                subscription.p256dh = payload['p256dh']
                subscription.auth = payload['auth']
                subscription.user_agent = payload.get('user_agent', '')
                subscription.is_active = True
                subscription.last_error = ''
                subscription.save(
                    update_fields=[
                        'user',
                        'p256dh',
                        'auth',
                        'user_agent',
                        'is_active',
                        'last_error',
                        'updated_at',
                    ]
                )
                return subscription, False

            created_subscription = PushSubscription.objects.create(
                user=user,
                endpoint=endpoint,
                p256dh=payload['p256dh'],
                auth=payload['auth'],
                user_agent=payload.get('user_agent', ''),
                is_active=True,
                last_error='',
            )
            return created_subscription, True
        except IntegrityError:
            # Another request created it between read and create; retry as update.
            continue
        except OperationalError as exc:
            if _is_sqlite_locked(exc) and attempt < max_attempts - 1:
                backoff_seconds = 0.05 * (2 ** attempt)
                logger.warning(
                    'Push subscription upsert retried due to SQLite lock (attempt %s/%s, endpoint=%s)',
                    attempt + 1,
                    max_attempts,
                    endpoint,
                )
                time.sleep(backoff_seconds)
                continue
            raise

    # Final fallback in pathological race cases.
    subscription = PushSubscription.objects.get(endpoint=endpoint)
    return subscription, False


class NotificationListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        limit = _parse_limit(request.query_params.get('limit'))
        since = _parse_since(request.query_params.get('since'))

        queryset = InAppNotification.objects.filter(recipient=request.user).order_by('-created_at')
        if since:
            queryset = queryset.filter(created_at__gt=since)

        notifications = list(queryset[:limit])
        unread_count = InAppNotification.objects.filter(recipient=request.user, is_read=False).count()

        serializer = InAppNotificationSerializer(notifications, many=True)
        return Response(
            {
                'items': serializer.data,
                'unread_count': unread_count,
                'server_time': timezone.now().isoformat(),
            }
        )

    def delete(self, request):
        deleted_count, _ = InAppNotification.objects.filter(recipient=request.user).delete()
        return Response({'deleted_count': deleted_count})


class NotificationDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, notification_id):
        deleted_count, _ = InAppNotification.objects.filter(
            id=notification_id,
            recipient=request.user,
        ).delete()
        if not deleted_count:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)


class NotificationMarkReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, notification_id):
        notification = InAppNotification.objects.filter(
            id=notification_id,
            recipient=request.user,
        ).first()
        if not notification:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not notification.is_read:
            notification.is_read = True
            notification.read_at = timezone.now()
            notification.save(update_fields=['is_read', 'read_at', 'updated_at'])

        return Response({'message': 'Notification marked as read'})


class NotificationMarkAllReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        updated_count = InAppNotification.objects.filter(
            recipient=request.user,
            is_read=False,
        ).update(
            is_read=True,
            read_at=timezone.now(),
        )
        return Response({'updated_count': updated_count})


class NotificationPreferenceView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        preferences, _ = NotificationPreference.objects.get_or_create(user=request.user)
        serializer = NotificationPreferenceSerializer(
            preferences,
            context={'push_available': is_push_delivery_available()},
        )
        payload = dict(serializer.data)
        payload['push_available'] = is_push_delivery_available()
        return Response(payload)

    def patch(self, request):
        preferences, _ = NotificationPreference.objects.get_or_create(user=request.user)
        serializer = NotificationPreferenceSerializer(preferences, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        payload = dict(serializer.data)
        payload['push_available'] = is_push_delivery_available()
        return Response(payload)


class PushPublicKeyView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from django.conf import settings

        public_key = (getattr(settings, 'VAPID_PUBLIC_KEY', '') or '').strip() or None
        return Response(
            {
                'public_key': public_key,
                'is_available': bool(public_key and is_push_delivery_available()),
            }
        )


class PushSubscribeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        raw_payload = request.data
        nested_keys = raw_payload.get('keys')
        if not isinstance(nested_keys, dict):
            nested_keys = {}

        def first_present(*values):
            for value in values:
                if value is None:
                    continue
                if isinstance(value, str) and not value.strip():
                    continue
                return value
            return None

        normalized_payload = {
            'endpoint': raw_payload.get('endpoint'),
            'p256dh': first_present(
                raw_payload.get('p256dh'),
                raw_payload.get('p_256dh'),
                nested_keys.get('p256dh'),
                nested_keys.get('p_256dh'),
                raw_payload.get('keys[p256dh]'),
                raw_payload.get('keys[p_256dh]'),
                raw_payload.get('keys.p256dh'),
                raw_payload.get('keys.p_256dh'),
            ),
            'auth': first_present(
                raw_payload.get('auth'),
                nested_keys.get('auth'),
                raw_payload.get('keys[auth]'),
                raw_payload.get('keys.auth'),
            ),
            'user_agent': raw_payload.get('user_agent') or raw_payload.get('userAgent') or '',
        }

        serializer = PushSubscriptionUpsertSerializer(data=normalized_payload)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data

        try:
            subscription, created = _upsert_push_subscription(user=request.user, payload=payload)
        except OperationalError as exc:
            if _is_sqlite_locked(exc):
                return Response(
                    {'detail': 'Push subscription is temporarily busy. Please retry.'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
            raise

        return Response(
            {
                'message': 'Push subscription registered',
                'subscription_id': str(subscription.id),
                'created': created,
                'push_available': is_push_delivery_available(),
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class PushUnsubscribeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = PushUnsubscribeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        endpoint = serializer.validated_data.get('endpoint')
        deleted_count = remove_push_subscription(user=request.user, endpoint=endpoint)
        return Response({'deleted_count': deleted_count})


class NotificationTestTriggerView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        notify_user(
            user=request.user,
            notification_type=InAppNotification.NotificationType.SYSTEM,
            title='Test notification',
            message='Browser push and in-app notification channels are active.',
            actor=None,
            vault=None,
            route='/settings?tab=notifications',
            metadata={'source': 'manual-test'},
        )
        return Response({'message': 'Test notification dispatched'})
