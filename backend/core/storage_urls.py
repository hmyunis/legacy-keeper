from functools import lru_cache

import boto3
from botocore.client import Config
from django.conf import settings
from django.core.files.storage import default_storage


def _normalize_storage_path(path):
    token = str(path or '').strip()
    if not token:
        return ''
    return token.lstrip('/')


@lru_cache(maxsize=1)
def _get_s3_presign_client():
    endpoint_url = str(
        getattr(settings, 'AWS_S3_PRESIGNED_ENDPOINT_URL', '') or getattr(settings, 'AWS_S3_ENDPOINT_URL', '')
    ).strip() or None
    signature_version = str(getattr(settings, 'AWS_S3_SIGNATURE_VERSION', 's3v4') or 's3v4').strip() or 's3v4'
    addressing_style = str(getattr(settings, 'AWS_S3_ADDRESSING_STYLE', 'path') or 'path').strip() or 'path'
    return boto3.client(
        's3',
        endpoint_url=endpoint_url,
        region_name=getattr(settings, 'AWS_S3_REGION_NAME', None) or None,
        aws_access_key_id=getattr(settings, 'AWS_ACCESS_KEY_ID', None) or None,
        aws_secret_access_key=getattr(settings, 'AWS_SECRET_ACCESS_KEY', None) or None,
        aws_session_token=getattr(settings, 'AWS_SESSION_TOKEN', None) or None,
        config=Config(
            signature_version=signature_version,
            s3={'addressing_style': addressing_style},
        ),
    )


def _build_s3_presigned_url(path):
    expires_in = max(int(getattr(settings, 'AWS_PRESIGNED_URL_EXPIRE', 900) or 900), 1)
    return _get_s3_presign_client().generate_presigned_url(
        'get_object',
        Params={
            'Bucket': settings.AWS_STORAGE_BUCKET_NAME,
            'Key': path,
        },
        ExpiresIn=expires_in,
    )


def build_storage_path_url(path, request=None):
    token = _normalize_storage_path(path)
    if not token:
        return None

    use_s3 = bool(getattr(settings, 'USE_S3', False))
    use_presigned_urls = bool(getattr(settings, 'AWS_USE_PRESIGNED_URLS', True))

    if use_s3 and use_presigned_urls:
        try:
            return _build_s3_presigned_url(token)
        except Exception:
            pass

    try:
        raw_url = default_storage.url(token)
    except Exception:
        return None

    if request:
        return request.build_absolute_uri(raw_url)
    return raw_url


def build_storage_file_url(file_field, request=None):
    if not file_field:
        return None
    token = getattr(file_field, 'name', '')
    return build_storage_path_url(token, request=request)
