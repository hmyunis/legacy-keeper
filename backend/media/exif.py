import re
from datetime import datetime
from typing import Any

from django.utils import timezone
from PIL import ExifTags, Image, UnidentifiedImageError


EXIF_DATETIME_FORMATS = (
    '%Y:%m:%d %H:%M:%S.%f',
    '%Y:%m:%d %H:%M:%S',
    '%Y-%m-%d %H:%M:%S.%f',
    '%Y-%m-%d %H:%M:%S',
)
EXIF_METADATA_KEYS = (
    'DateTimeOriginal',
    'DateTimeDigitized',
    'DateTime',
    'OffsetTimeOriginal',
    'OffsetTimeDigitized',
    'OffsetTime',
    'Make',
    'Model',
    'Software',
    'LensModel',
)


def _to_json_safe(value: Any, depth: int = 0) -> Any:
    if depth > 3:
        return str(value)
    if value is None:
        return None
    if isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, bytes):
        return value.decode('utf-8', errors='ignore')
    if isinstance(value, dict):
        cleaned = {}
        for raw_key, raw_value in value.items():
            key = str(raw_key)
            cleaned_value = _to_json_safe(raw_value, depth + 1)
            if cleaned_value is not None:
                cleaned[key] = cleaned_value
        return cleaned
    if isinstance(value, (list, tuple)):
        return [_to_json_safe(item, depth + 1) for item in value]
    return str(value)


def _ratio_to_float(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        token = value.strip()
        if not token:
            return None
        if '/' in token:
            numerator_token, denominator_token = token.split('/', 1)
            try:
                numerator = float(numerator_token)
                denominator = float(denominator_token)
            except ValueError:
                return None
            if denominator == 0:
                return None
            return numerator / denominator
        try:
            return float(token)
        except ValueError:
            return None
    if isinstance(value, tuple) and len(value) == 2:
        numerator, denominator = value
        if denominator in (None, 0):
            return None
        return float(numerator) / float(denominator)
    numerator = getattr(value, 'numerator', None)
    denominator = getattr(value, 'denominator', None)
    if denominator in (None, 0):
        return None
    if numerator is None:
        return None
    return float(numerator) / float(denominator)


def _dms_to_decimal(values: Any, ref: str) -> float | None:
    if not isinstance(values, (list, tuple)):
        direct_decimal = _ratio_to_float(values)
        if direct_decimal is None:
            return None
        decimal = direct_decimal
        if str(ref).upper() in {'S', 'W'}:
            decimal = -abs(decimal)
        return round(decimal, 7)

    if len(values) < 3:
        return None

    degrees = _ratio_to_float(values[0])
    minutes = _ratio_to_float(values[1])
    seconds = _ratio_to_float(values[2])
    if degrees is None or minutes is None or seconds is None:
        return None

    decimal = degrees + (minutes / 60.0) + (seconds / 3600.0)
    if str(ref).upper() in {'S', 'W'}:
        decimal = -decimal
    return round(decimal, 7)


def _normalize_gps_info(gps_info: Any) -> dict[str, Any]:
    if not isinstance(gps_info, dict):
        return {}

    normalized = {}
    for key, value in gps_info.items():
        if isinstance(key, int):
            normalized_key = ExifTags.GPSTAGS.get(key, str(key))
        else:
            normalized_key = str(key)
        normalized[normalized_key] = value
    return normalized


def _extract_gps(gps_info: dict[str, Any]) -> dict[str, float] | None:
    latitude = _dms_to_decimal(gps_info.get('GPSLatitude'), str(gps_info.get('GPSLatitudeRef') or 'N'))
    longitude = _dms_to_decimal(gps_info.get('GPSLongitude'), str(gps_info.get('GPSLongitudeRef') or 'E'))
    if latitude is None or longitude is None:
        return None
    if latitude < -90 or latitude > 90 or longitude < -180 or longitude > 180:
        return None
    return {
        'latitude': latitude,
        'longitude': longitude,
    }


def _parse_offset_minutes(raw_value: Any) -> int | None:
    token = str(raw_value or '').strip()
    if not token:
        return None
    match = re.match(r'^([+-])(\d{2}):?(\d{2})$', token)
    if not match:
        return None
    sign = 1 if match.group(1) == '+' else -1
    hours = int(match.group(2))
    minutes = int(match.group(3))
    if hours > 23 or minutes > 59:
        return None
    return sign * ((hours * 60) + minutes)


def _first_non_none(values: list[Any]) -> Any:
    for value in values:
        if value is not None:
            return value
    return None


def _extract_datetime(raw_exif: dict[str, Any]) -> datetime | None:
    raw_value = (
        raw_exif.get('DateTimeOriginal')
        or raw_exif.get('DateTimeDigitized')
        or raw_exif.get('DateTime')
    )
    token = str(raw_value or '').strip()
    if not token:
        return None

    offset_minutes = _first_non_none([
        _parse_offset_minutes(raw_exif.get('OffsetTimeOriginal')),
        _parse_offset_minutes(raw_exif.get('OffsetTimeDigitized')),
        _parse_offset_minutes(raw_exif.get('OffsetTime')),
    ])

    if offset_minutes is None:
        inline_offset_match = re.search(r'([+-]\d{2}:?\d{2})$', token)
        if inline_offset_match:
            offset_minutes = _parse_offset_minutes(inline_offset_match.group(1))
            token = token[: inline_offset_match.start()].strip()

    token = token.replace('T', ' ').replace('Z', '').strip()

    fractional = ''
    base_token = token
    if '.' in token:
        base_token, fractional = token.split('.', 1)
        fractional = ''.join(char for char in fractional if char.isdigit())
        fractional = fractional[:6]
        if fractional:
            base_token = f'{base_token}.{fractional}'
    token = base_token

    parsed = None
    for date_format in EXIF_DATETIME_FORMATS:
        try:
            parsed = datetime.strptime(token, date_format)
            break
        except ValueError:
            continue
    if parsed is None:
        return None

    if offset_minutes is not None:
        tz = timezone.get_fixed_timezone(offset_minutes)
        return timezone.make_aware(parsed, timezone=tz)
    return timezone.make_aware(parsed, timezone.get_current_timezone())


def extract_exif_payload(file_obj: Any) -> dict[str, Any]:
    opened_here = False
    try:
        if hasattr(file_obj, 'open'):
            file_obj.open('rb')
            opened_here = True
        if hasattr(file_obj, 'seek'):
            file_obj.seek(0)

        with Image.open(file_obj) as image:
            exif = image.getexif()
            if not exif:
                return {
                    'raw_exif': {},
                    'date_taken': None,
                    'gps': None,
                }

            raw_exif = {}
            for tag_id, value in exif.items():
                tag_name = ExifTags.TAGS.get(tag_id, str(tag_id))
                raw_exif[tag_name] = value

            normalized_exif = _to_json_safe(raw_exif)
            metadata_exif = {
                key: normalized_exif[key]
                for key in EXIF_METADATA_KEYS
                if key in normalized_exif
            }

            gps_info = None
            if hasattr(exif, 'get_ifd'):
                ifd_class = getattr(ExifTags, 'IFD', None)
                gps_ifd_tag = getattr(ifd_class, 'GPSInfo', None) if ifd_class else None
                if gps_ifd_tag is not None:
                    gps_info = exif.get_ifd(gps_ifd_tag)
            if gps_info is None:
                gps_info = raw_exif.get('GPSInfo')

            normalized_gps = _normalize_gps_info(gps_info)
            gps_coordinates = _extract_gps(normalized_gps)
            extracted_datetime = _extract_datetime(raw_exif)
            extracted_at = timezone.now().isoformat()
            return {
                'raw_exif': metadata_exif,
                'date_taken': extracted_datetime.isoformat() if extracted_datetime else None,
                'gps': gps_coordinates,
                'extracted_at': extracted_at,
            }
    except (UnidentifiedImageError, OSError):
        return {
            'raw_exif': {},
            'date_taken': None,
            'gps': None,
        }
    finally:
        if opened_here and hasattr(file_obj, 'close'):
            try:
                file_obj.close()
            except Exception:
                pass
