import json
import logging
from pywebpush import webpush, WebPushException
from django.conf import settings
from .models import PushSubscription

logger = logging.getLogger(__name__)

def send_web_push(user, title, body, url="/dashboard"):
    vapid_private_key = getattr(settings, 'VAPID_PRIVATE_KEY', '')
    vapid_admin_email = getattr(settings, 'VAPID_ADMIN_EMAIL', getattr(settings, 'DEFAULT_FROM_EMAIL', 'museum@yourfamily.com'))

    if not vapid_private_key:
        logger.warning("VAPID_PRIVATE_KEY not set. Skipping push notification.")
        return

    payload = json.dumps({
        "title": title,
        "body": body,
        "url": url,
        "icon": "/logo.png"
    })

    subscriptions = PushSubscription.objects.filter(user=user)

    for sub in subscriptions:
        try:
            webpush(
                subscription_info={
                    "endpoint": sub.endpoint,
                    "keys": {"p256dh": sub.p256dh, "auth": sub.auth}
                },
                data=payload,
                vapid_private_key=vapid_private_key,
                vapid_claims={"sub": f"mailto:{vapid_admin_email}"}
            )
        except WebPushException as ex:
            logger.error(f"Web Push failed: {repr(ex)}")
            if ex.response and ex.response.status_code == 410:
                sub.delete()
        except Exception as ex:
            logger.error(f"Web Push skipped after unexpected error: {repr(ex)}")
