from django.urls import path

from .views import (
    NotificationDetailView,
    NotificationListView,
    NotificationMarkAllReadView,
    NotificationMarkReadView,
    NotificationPreferenceView,
    NotificationTestTriggerView,
    PushPublicKeyView,
    PushSubscribeView,
    PushUnsubscribeView,
)

urlpatterns = [
    path('notifications/', NotificationListView.as_view(), name='notifications-list'),
    path('notifications/<uuid:notification_id>/', NotificationDetailView.as_view(), name='notifications-detail'),
    path('notifications/<uuid:notification_id>/read/', NotificationMarkReadView.as_view(), name='notifications-read'),
    path('notifications/read-all/', NotificationMarkAllReadView.as_view(), name='notifications-read-all'),
    path('notifications/preferences/', NotificationPreferenceView.as_view(), name='notifications-preferences'),
    path('notifications/push/public-key/', PushPublicKeyView.as_view(), name='notifications-push-public-key'),
    path('notifications/push/subscribe/', PushSubscribeView.as_view(), name='notifications-push-subscribe'),
    path('notifications/push/unsubscribe/', PushUnsubscribeView.as_view(), name='notifications-push-unsubscribe'),
    path('notifications/test-trigger/', NotificationTestTriggerView.as_view(), name='notifications-test-trigger'),
]

