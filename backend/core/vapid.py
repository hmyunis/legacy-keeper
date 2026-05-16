import json
import logging
from pywebpush import webpush, WebPushException
from django.conf import settings
from .models import PushSubscription

logger = logging.getLogger(__name__)

def send_web_push(user, title, body, url="/dashboard"):
    if not settings.VAPID_PRIVATE_KEY:
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
                vapid_private_key=settings.VAPID_PRIVATE_KEY,
                vapid_claims={"sub": f"mailto:{settings.VAPID_ADMIN_EMAIL}"}
            )
        except WebPushException as ex:
            logger.error(f"Web Push failed: {repr(ex)}")
            if ex.response and ex.response.status_code == 410:
                sub.delete()