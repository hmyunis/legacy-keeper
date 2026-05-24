import json
import logging
import base64
import os
import re
from urllib.parse import urlsplit
from pywebpush import webpush, WebPushException
from django.conf import settings
from .models import PushSubscription

logger = logging.getLogger(__name__)

def _base64url_decode(raw_value):
    value = (raw_value or "").strip().strip("'\"")
    if not value:
        return b""
    padded = value + "=" * ((4 - len(value) % 4) % 4)
    return base64.urlsafe_b64decode(padded.encode("utf-8"))


def _serialize_private_key_to_der_base64(private_key):
    from cryptography.hazmat.primitives import serialization
    der = private_key.private_bytes(
        encoding=serialization.Encoding.DER,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    return base64.b64encode(der).decode("utf-8")


def _derive_public_key_urlsafe(private_key):
    from cryptography.hazmat.primitives import serialization
    raw_public = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.X962,
        format=serialization.PublicFormat.UncompressedPoint,
    )
    return base64.urlsafe_b64encode(raw_public).decode("utf-8").rstrip("=")


def _normalize_vapid_private_key(raw_key):
    key = (raw_key or "").strip().strip("'\"")
    if not key:
        return key, "missing"
    if "\\n" in key:
        key = key.replace("\\n", "\n")

    if key.startswith("{"):
        try:
            key_json = json.loads(key)
            key = (key_json.get("privateKey") or key_json.get("private_key") or "").strip()
        except Exception:
            return key, "invalid-json-key-object"

    try:
        from cryptography.hazmat.primitives import serialization
        from cryptography.hazmat.primitives.asymmetric import ec
        from cryptography.hazmat.primitives.serialization import load_der_private_key, load_pem_private_key
    except Exception as ex:
        logger.error("Cryptography is unavailable for VAPID key normalization: %s", ex)
        return key, "crypto-unavailable"

    if os.path.exists(key):
        try:
            with open(key, "rb") as key_file:
                key_bytes = key_file.read()
            if b"PRIVATE KEY" in key_bytes:
                private_key = load_pem_private_key(key_bytes, password=None)
            else:
                private_key = load_der_private_key(key_bytes, password=None)
            return _serialize_private_key_to_der_base64(private_key), None
        except Exception as ex:
            logger.warning("Failed to parse VAPID private key file %s: %s", key, ex)
            return key, "invalid-key-file"

    if "BEGIN" in key and "PRIVATE KEY" in key:
        try:
            private_key = load_pem_private_key(key.encode("utf-8"), password=None)
            return _serialize_private_key_to_der_base64(private_key), None
        except Exception as ex:
            logger.warning("Failed to parse PEM VAPID private key: %s", ex)
            return key, "invalid-pem"

    # Try standard base64 DER or scalar first. Some tooling emits +/=
    # instead of URL-safe -_ without padding.
    try:
        der_bytes = base64.b64decode(key.encode("utf-8"), validate=True)
        if len(der_bytes) == 32:
            private_int = int.from_bytes(der_bytes, byteorder="big", signed=False)
            private_key = ec.derive_private_key(private_int, ec.SECP256R1())
        else:
            private_key = load_der_private_key(der_bytes, password=None)
        return _serialize_private_key_to_der_base64(private_key), None
    except Exception:
        pass

    # Try a raw urlsafe base64 scalar from web-push CLI.
    if re.fullmatch(r"[A-Za-z0-9_-]{40,90}", key) is not None:
        try:
            decoded = _base64url_decode(key)
            if len(decoded) == 32:
                private_int = int.from_bytes(decoded, byteorder="big", signed=False)
                private_key = ec.derive_private_key(private_int, ec.SECP256R1())
                return _serialize_private_key_to_der_base64(private_key), None
            if len(decoded) == 65 and decoded[:1] == b"\x04":
                return key, "public-key-used-as-private-key"
            return key, f"invalid-base64url-length-{len(decoded)}"
        except Exception as ex:
            logger.warning("Failed to normalize base64url VAPID key: %s", ex)
            return key, "invalid-base64url"

    return key, "unsupported-format"


def diagnose_vapid_config():
    raw_private_key = getattr(settings, 'VAPID_PRIVATE_KEY', '')
    raw_public_key = getattr(settings, 'VAPID_PUBLIC_KEY', '')
    private_key = (raw_private_key or "").strip().strip("'\"")
    public_key = (raw_public_key or "").strip().strip("'\"")
    private_decoded_len = None
    public_decoded_len = None
    normalized_key, private_error = _normalize_vapid_private_key(private_key)

    try:
        if private_key and re.fullmatch(r"[A-Za-z0-9_-]+={0,2}", private_key):
            private_decoded_len = len(_base64url_decode(private_key))
    except Exception:
        private_decoded_len = None

    try:
        if public_key and re.fullmatch(r"[A-Za-z0-9_-]+={0,2}", public_key):
            public_decoded_len = len(_base64url_decode(public_key))
    except Exception:
        public_decoded_len = None

    derived_public_key = ""
    try:
        if normalized_key and not private_error:
            from cryptography.hazmat.primitives.serialization import load_der_private_key
            normalized_private_key = load_der_private_key(base64.b64decode(normalized_key.encode("utf-8")), password=None)
            derived_public_key = _derive_public_key_urlsafe(normalized_private_key)
    except Exception:
        derived_public_key = ""

    return {
        "privateKeyFormat": _describe_vapid_key(private_key),
        "privateKeyLength": len(private_key),
        "privateKeyDecodedLength": private_decoded_len,
        "privateKeyError": private_error,
        "publicKeyLength": len(public_key),
        "publicKeyDecodedLength": public_decoded_len,
        "privateKeyIsPlaceholder": private_key in {"your-vapid-private-key", "your_vapid_private_key"},
        "publicKeyIsPlaceholder": public_key in {"your-vapid-public-key", "your_vapid_public_key"},
        "normalizedPrivateKeyFormat": _describe_vapid_key(normalized_key),
        "derivedPublicKeyMatches": bool(public_key and derived_public_key and public_key == derived_public_key),
    }


def _describe_vapid_key(key):
    preview = (key or "").strip().strip("'\"")
    if not preview:
        return "empty"
    if ("BEGIN" in preview and "PRIVATE KEY" in preview) or "\\n" in preview:
        return "pem"
    if re.fullmatch(r"[A-Za-z0-9_-]{40,90}", preview or ""):
        return "base64url"
    try:
        decoded = base64.b64decode(preview.encode("utf-8"), validate=True)
        if decoded.startswith(b"\x30") and len(decoded) > 60:
            return "base64der"
    except Exception:
        pass
    return "unknown"


def _webpush_headers_for_endpoint(endpoint):
    host = (urlsplit(endpoint or "").hostname or "").lower()
    if host.endswith("notify.windows.com"):
        # Windows Push Notification Services rejects Web Push requests without
        # an explicit notification type. Browser Web Push payloads are raw data
        # consumed by the service worker, not native XML toast payloads.
        return {"X-WNS-Type": "wns/raw"}
    return {}


def _response_details(response):
    if response is None:
        return ""

    body = ""
    try:
        body = response.text or ""
    except Exception:
        body = ""

    if len(body) > 500:
        body = body[:500] + "..."

    request_id = ""
    try:
        request_id = response.headers.get("X-WNS-Msg-ID") or response.headers.get("X-Request-Id") or ""
    except Exception:
        request_id = ""

    details = []
    if body:
        details.append(body)
    if request_id:
        details.append(f"request_id={request_id}")
    return " ".join(details)

def send_web_push(user, title, body, url="/dashboard"):
    raw_private_key = getattr(settings, 'VAPID_PRIVATE_KEY', '')
    vapid_private_key, vapid_key_error = _normalize_vapid_private_key(raw_private_key)
    vapid_admin_email = getattr(settings, 'VAPID_ADMIN_EMAIL', getattr(settings, 'DEFAULT_FROM_EMAIL', 'museum@yourfamily.com'))
    configured_public_key = (getattr(settings, 'VAPID_PUBLIC_KEY', '') or '').strip().strip("'\"")

    if not vapid_private_key or vapid_key_error:
        logger.warning(
            "Skipping push notification because VAPID_PRIVATE_KEY is invalid or unsupported (reason=%s, raw=%s).",
            vapid_key_error or 'missing',
            _describe_vapid_key(raw_private_key),
        )
        return {
            "sent": 0,
            "failed": 0,
            "deleted": 0,
            "error": f"Invalid VAPID private key ({vapid_key_error or 'missing'}).",
        }

    try:
        from cryptography.hazmat.primitives.serialization import load_der_private_key
        private_key = load_der_private_key(base64.b64decode(vapid_private_key.encode("utf-8")), password=None)
        derived_public_key = _derive_public_key_urlsafe(private_key)
        if configured_public_key and derived_public_key != configured_public_key:
            logger.warning(
                "VAPID key pair mismatch. configured_public=%s derived_public=%s",
                configured_public_key[:12] + "...",
                derived_public_key[:12] + "...",
            )
            return {
                "sent": 0,
                "failed": 0,
                "deleted": 0,
                "error": "VAPID key pair mismatch. Update VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY together.",
            }
    except Exception as ex:
        logger.warning("Could not validate VAPID key pair: %s", ex)
    logger.debug(
        "Web push VAPID key format: raw=%s normalized=%s",
        _describe_vapid_key(raw_private_key),
        _describe_vapid_key(vapid_private_key),
    )

    payload = json.dumps({
        "title": title,
        "body": body,
        "icon": "/logo.png",
        "badge": "/logo.png",
        "tag": "legacykeeper-push-notification",
        "renotify": True,
        "actions": [
            {"action": "open", "title": "Open Vault"},
        ],
        "data": {
            "url": url
        }
    })

    subscriptions = PushSubscription.objects.filter(user=user)
    if not subscriptions.exists():
        logger.info("No push subscriptions found for user %s; skipping push notification.", getattr(user, 'id', None))
        return {
            "sent": 0,
            "failed": 0,
            "deleted": 0,
            "error": "No push subscription found for this browser/user.",
        }

    sent_count = 0
    failed_count = 0
    deleted_count = 0
    first_error = None
    for sub in subscriptions:
        try:
            headers = _webpush_headers_for_endpoint(sub.endpoint)
            webpush(
                subscription_info={
                    "endpoint": sub.endpoint,
                    "keys": {"p256dh": sub.p256dh, "auth": sub.auth}
                },
                data=payload,
                headers=headers,
                ttl=600,
                vapid_private_key=vapid_private_key,
                vapid_claims={"sub": f"mailto:{vapid_admin_email}"}
            )
            sent_count += 1
        except WebPushException as ex:
            logger.error(f"Web Push failed: {repr(ex)}")
            failed_count += 1
            if first_error is None:
                response = getattr(ex, "response", None)
                status_code = getattr(response, "status_code", "unknown")
                details = _response_details(response)
                first_error = f"Web push failed (status {status_code})."
                if details:
                    first_error = f"{first_error} {details}"
            if ex.response and ex.response.status_code in {401, 403, 404, 410}:
                sub.delete()
                deleted_count += 1
        except Exception as ex:
            logger.error(f"Web Push skipped after unexpected error: {repr(ex)}")
            failed_count += 1
            if first_error is None:
                first_error = str(ex)
    return {
        "sent": sent_count,
        "failed": failed_count,
        "deleted": deleted_count,
        "error": first_error,
    }
