from io import BytesIO
from pathlib import Path

from django.core.files.base import ContentFile
from PIL import Image, ImageOps, UnidentifiedImageError

from vaults.models import FamilyVault

_RESAMPLING = getattr(Image, 'Resampling', Image)
_LANCZOS = getattr(_RESAMPLING, 'LANCZOS', Image.LANCZOS)

_IMAGE_CONTENT_TYPE_BY_FORMAT = {
    'JPEG': 'image/jpeg',
    'PNG': 'image/png',
    'WEBP': 'image/webp',
}

_QUALITY_PROFILES = {
    FamilyVault.StorageQuality.HIGH: {
        'max_dimension': 2560,
        'jpeg_quality': 88,
        'webp_quality': 88,
        'png_compress_level': 6,
    },
    FamilyVault.StorageQuality.BALANCED: {
        'max_dimension': 1600,
        'jpeg_quality': 76,
        'webp_quality': 76,
        'png_compress_level': 9,
    },
}


def _normalize_storage_quality(value):
    normalized = str(value or '').strip().upper()
    valid_values = {
        FamilyVault.StorageQuality.BALANCED,
        FamilyVault.StorageQuality.HIGH,
        FamilyVault.StorageQuality.ORIGINAL,
    }
    if normalized in valid_values:
        return normalized
    return FamilyVault.StorageQuality.HIGH


def _is_image_upload(uploaded_file):
    content_type = str(getattr(uploaded_file, 'content_type', '') or '').lower()
    if content_type.startswith('image/'):
        return True

    suffix = Path(str(getattr(uploaded_file, 'name', '') or '')).suffix.lower()
    return suffix in {'.jpg', '.jpeg', '.png', '.webp'}


def _build_save_payload(image, image_format, profile, exif_bytes=None):
    save_kwargs = {'optimize': True}
    output_format = image_format

    if output_format in {'JPG', 'JPEG'}:
        output_format = 'JPEG'
        if image.mode not in {'RGB', 'L'}:
            image = image.convert('RGB')
        save_kwargs['quality'] = profile['jpeg_quality']
        save_kwargs['progressive'] = True
        if exif_bytes:
            save_kwargs['exif'] = exif_bytes
    elif output_format == 'WEBP':
        save_kwargs['quality'] = profile['webp_quality']
        save_kwargs['method'] = 6
        if exif_bytes:
            save_kwargs['exif'] = exif_bytes
    elif output_format == 'PNG':
        save_kwargs['compress_level'] = profile['png_compress_level']
    else:
        return None

    return image, output_format, save_kwargs


def process_uploaded_file_for_storage(uploaded_file, storage_quality):
    quality = _normalize_storage_quality(storage_quality)
    if quality == FamilyVault.StorageQuality.ORIGINAL:
        return uploaded_file

    if not _is_image_upload(uploaded_file):
        return uploaded_file

    profile = _QUALITY_PROFILES.get(quality)
    if not profile:
        return uploaded_file

    try:
        if hasattr(uploaded_file, 'seek'):
            uploaded_file.seek(0)

        with Image.open(uploaded_file) as opened_image:
            if getattr(opened_image, 'is_animated', False):
                return uploaded_file

            image_format = str(getattr(opened_image, 'format', '') or '').upper()
            if image_format not in {'JPG', 'JPEG', 'PNG', 'WEBP'}:
                return uploaded_file

            exif_bytes = None
            if hasattr(opened_image, 'getexif'):
                exif = opened_image.getexif()
                if exif:
                    exif_bytes = exif.tobytes()

            processed_image = ImageOps.exif_transpose(opened_image)
            processed_image.load()

            max_dimension = int(profile['max_dimension'])
            if max(processed_image.size) > max_dimension:
                processed_image.thumbnail((max_dimension, max_dimension), _LANCZOS)

            save_payload = _build_save_payload(
                processed_image,
                image_format,
                profile,
                exif_bytes=exif_bytes,
            )
            if not save_payload:
                return uploaded_file

            image_to_save, output_format, save_kwargs = save_payload
            buffer = BytesIO()
            image_to_save.save(buffer, format=output_format, **save_kwargs)

        processed_file = ContentFile(buffer.getvalue())
        processed_file.name = Path(str(getattr(uploaded_file, 'name', '') or 'upload')).name
        content_type = _IMAGE_CONTENT_TYPE_BY_FORMAT.get(output_format)
        if content_type:
            setattr(processed_file, 'content_type', content_type)
        return processed_file
    except (UnidentifiedImageError, OSError, ValueError):
        return uploaded_file
    finally:
        if hasattr(uploaded_file, 'seek'):
            try:
                uploaded_file.seek(0)
            except Exception:
                pass
