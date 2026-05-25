import logging
import os
import re
import tempfile
from datetime import date, datetime

from dateutil import parser as date_parser
from PIL import ExifTags, Image

logger = logging.getLogger(__name__)

DATE_KEYS = (
    "DateTimeOriginal",
    "CreateDate",
    "DateCreated",
    "DateTimeDigitized",
    "DateTime",
    "ModifyDate",
    "MediaCreateDate",
    "TrackCreateDate",
    "creation_time",
    "com.apple.quicktime.creationdate",
    "\xa9day",
)

LOCATION_NAME_KEYS = (
    "Location",
    "LocationShown",
    "City",
    "Sub-location",
    "Sublocation",
    "Province-State",
    "State",
    "Country",
    "Country-PrimaryLocationName",
)


def _safe_float(value):
    try:
        return float(value)
    except (TypeError, ValueError, ZeroDivisionError):
        return None


CONTROL_CHAR_PATTERN = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")


def _clean_text(value):
    text = str(value or "")
    text = text.replace("\x00", "")
    text = CONTROL_CHAR_PATTERN.sub("", text)
    return text.strip()


def json_safe(value):
    if isinstance(value, str):
        return _clean_text(value)
    if isinstance(value, (int, float, bool)) or value is None:
        return value
    if isinstance(value, bytes):
        return _clean_text(value.decode("utf-8", errors="ignore"))
    if isinstance(value, (list, tuple)):
        return [json_safe(item) for item in value]
    if isinstance(value, dict):
        return {_clean_text(key): json_safe(item) for key, item in value.items()}

    as_float = _safe_float(value)
    if as_float is not None:
        return as_float
    return _clean_text(value)


def _first_scalar(value):
    if isinstance(value, (list, tuple)):
        return value[0] if value else None
    return value


def _normalize_date_text(value):
    value = _first_scalar(value)
    if value is None:
        return ""

    text = _clean_text(value)
    if not text or text in {"0000:00:00 00:00:00", "0000-00-00T00:00:00"}:
        return ""

    text = re.sub(r"^D:", "", text)
    text = re.sub(r"([+-]\d{2})'(\d{2})'$", r"\1:\2", text)

    if re.match(r"^\d{4}:\d{2}:\d{2}", text):
        text = text.replace(":", "-", 2)

    return text


def _parse_datetime_value(value):
    text = _normalize_date_text(value)
    if not text:
        return None, ""

    compact_match = re.match(r"^(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?(\d{2})?", text)
    if compact_match:
        try:
            parsed = datetime(
                int(compact_match.group(1)),
                int(compact_match.group(2)),
                int(compact_match.group(3)),
                int(compact_match.group(4) or 0),
                int(compact_match.group(5) or 0),
                int(compact_match.group(6) or 0),
            )
            if 1800 <= parsed.year <= datetime.now().year + 1:
                return parsed, text
        except ValueError:
            pass

    try:
        parsed = date_parser.parse(text, fuzzy=True)
        if 1800 <= parsed.year <= datetime.now().year + 1:
            return parsed, text
    except (ValueError, OverflowError, TypeError):
        return None, text

    return None, text


def _parse_date_value(value):
    parsed, raw_text = _parse_datetime_value(value)
    return (parsed.date(), raw_text) if parsed else (None, raw_text)


def _parse_date_from_filename(file_name):
    base = os.path.basename(file_name or "")
    patterns = (
        r"(?P<year>20\d{2}|19\d{2})[-_. ]?(?P<month>0[1-9]|1[0-2])[-_. ]?(?P<day>0[1-9]|[12]\d|3[01])",
        r"(?P<day>0[1-9]|[12]\d|3[01])[-_. ](?P<month>0[1-9]|1[0-2])[-_. ](?P<year>20\d{2}|19\d{2})",
    )

    for pattern in patterns:
        match = re.search(pattern, base)
        if not match:
            continue
        try:
            return date(
                int(match.group("year")),
                int(match.group("month")),
                int(match.group("day")),
            ), match.group(0)
        except ValueError:
            continue

    return None, ""


def _ratio_to_float(value):
    if isinstance(value, (list, tuple)) and len(value) == 2 and not isinstance(value[0], (list, tuple)):
        numerator = _safe_float(value[0])
        denominator = _safe_float(value[1])
        return numerator / denominator if numerator is not None and denominator else None
    return _safe_float(value)


def _dms_to_decimal(value, ref):
    if value is None:
        return None

    if isinstance(value, str):
        value = value.strip()
        compact_dms = re.match(r"^(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)\s*([NSEW])?$", value, flags=re.I)
        if compact_dms:
            degrees = float(compact_dms.group(1))
            minutes = float(compact_dms.group(2))
            result = degrees + minutes / 60
            direction = (compact_dms.group(3) or ref or "").upper()
            if direction in {"S", "W"}:
                result = -abs(result)
            return result

        decimal_match = re.match(r"^([+-]?\d+(?:\.\d+)?)\s*([NSEW])?$", value, flags=re.I)
        if decimal_match:
            result = float(decimal_match.group(1))
            direction = (decimal_match.group(2) or ref or "").upper()
            if direction in {"S", "W"}:
                result = -abs(result)
            return result

    if not isinstance(value, (list, tuple)) or len(value) < 3:
        return _safe_float(value)

    degrees = _ratio_to_float(value[0])
    minutes = _ratio_to_float(value[1])
    seconds = _ratio_to_float(value[2])
    if None in {degrees, minutes, seconds}:
        return None

    result = degrees + minutes / 60 + seconds / 3600
    if str(ref or "").upper() in {"S", "W"}:
        result = -result
    return result


def _decode_gps_ifd(gps):
    if not gps:
        return {}

    decoded = {}
    for tag, value in gps.items():
        decoded[ExifTags.GPSTAGS.get(tag, tag)] = value

    latitude = _dms_to_decimal(decoded.get("GPSLatitude"), decoded.get("GPSLatitudeRef"))
    longitude = _dms_to_decimal(decoded.get("GPSLongitude"), decoded.get("GPSLongitudeRef"))
    result = {}
    if latitude is not None and longitude is not None:
        result["gps_latitude"] = round(latitude, 7)
        result["gps_longitude"] = round(longitude, 7)
        result["location"] = f"{latitude:.6f}, {longitude:.6f}"
        result["gps_source"] = "exif"

    altitude = _ratio_to_float(decoded.get("GPSAltitude"))
    if altitude is not None:
        if str(decoded.get("GPSAltitudeRef", "")) in {"1", "b'\\x01'"}:
            altitude = -altitude
        result["gps_altitude"] = round(altitude, 2)

    return result


def _merge_metadata(*sources):
    merged = {}
    date_candidates = []
    for source in sources:
        for key, value in (source or {}).items():
            if key == "date_candidates":
                date_candidates.extend(value or [])
            elif value not in (None, "", [], {}):
                merged[key] = value
    if date_candidates:
        merged["date_candidates"] = date_candidates
    return merged


def _read_sample_bytes(memory, max_bytes=25 * 1024 * 1024):
    try:
        size = int(memory.original_file.size or 0)
        with memory.original_file.open("rb") as file_obj:
            if size <= max_bytes:
                return file_obj.read()
            head = file_obj.read(max_bytes // 2)
            file_obj.seek(max(size - max_bytes // 2, 0))
            return head + file_obj.read(max_bytes // 2)
    except Exception as exc:
        logger.debug("Could not read metadata byte sample for memory %s: %s", memory.id, exc)
        return b""


def _extract_xmp_text(raw_bytes):
    if not raw_bytes:
        return ""
    text = raw_bytes.decode("utf-8", errors="ignore")
    matches = re.findall(r"<x:xmpmeta[\s\S]*?</x:xmpmeta>", text, flags=re.I)
    return "\n".join(matches) if matches else text[:200000]


def _parse_iso6709(value):
    value = str(value or "").strip()
    match = re.search(r"([+-]\d+(?:\.\d+)?)([+-]\d+(?:\.\d+)?)", value)
    if not match:
        return {}
    latitude = float(match.group(1))
    longitude = float(match.group(2))
    return {
        "gps_latitude": round(latitude, 7),
        "gps_longitude": round(longitude, 7),
        "location": f"{latitude:.6f}, {longitude:.6f}",
        "gps_source": "iso6709",
    }


def _extract_xmp_metadata(raw_bytes):
    text = _extract_xmp_text(raw_bytes)
    if not text:
        return {}

    metadata = {}
    for key in DATE_KEYS:
        key_pattern = re.escape(key)
        patterns = (
            rf"{key_pattern}\s*=\s*[\"']([^\"']+)[\"']",
            rf"<[^>]*{key_pattern}[^>]*>([^<]+)</[^>]+>",
        )
        for pattern in patterns:
            match = re.search(pattern, text, flags=re.I)
            if match:
                metadata.setdefault("date_candidates", []).append((key, match.group(1).strip()))
                break

    iso_location = re.search(r"(?:ISO6709|location\.ISO6709)\s*=\s*[\"']([^\"']+)[\"']", text, flags=re.I)
    if not iso_location:
        iso_location = re.search(r"<[^>]*(?:ISO6709|location\.ISO6709)[^>]*>([^<]+)</[^>]+>", text, flags=re.I)
    if iso_location:
        metadata.update(_parse_iso6709(iso_location.group(1)))

    lat_match = re.search(r"GPSLatitude\s*=\s*[\"']([^\"']+)[\"']|<[^>]*GPSLatitude[^>]*>([^<]+)</[^>]+>", text, flags=re.I)
    lon_match = re.search(r"GPSLongitude\s*=\s*[\"']([^\"']+)[\"']|<[^>]*GPSLongitude[^>]*>([^<]+)</[^>]+>", text, flags=re.I)
    if lat_match and lon_match and "gps_latitude" not in metadata:
        lat_text = lat_match.group(1) or lat_match.group(2)
        lon_text = lon_match.group(1) or lon_match.group(2)
        latitude = _dms_to_decimal(lat_text, lat_text[-1:])
        longitude = _dms_to_decimal(lon_text, lon_text[-1:])
        if latitude is not None and longitude is not None:
            metadata.update({
                "gps_latitude": round(latitude, 7),
                "gps_longitude": round(longitude, 7),
                "location": f"{latitude:.6f}, {longitude:.6f}",
                "gps_source": "xmp",
            })

    location_parts = []
    for key in LOCATION_NAME_KEYS:
        key_pattern = re.escape(key)
        match = re.search(rf"{key_pattern}\s*=\s*[\"']([^\"']+)[\"']", text, flags=re.I)
        if not match:
            match = re.search(rf"<[^>]*{key_pattern}[^>]*>([^<]+)</[^>]+>", text, flags=re.I)
        if match:
            value = re.sub(r"\s+", " ", match.group(1)).strip()
            if value and value not in location_parts:
                location_parts.append(value)

    if location_parts:
        metadata["location_label"] = ", ".join(location_parts[:4])

    return metadata


def _extract_image_metadata(memory, raw_bytes):
    metadata = {}
    try:
        with memory.original_file.open("rb") as file_obj:
            image = Image.open(file_obj)
            exif = image.getexif()
            if exif:
                decoded = {}
                for tag, value in exif.items():
                    name = ExifTags.TAGS.get(tag, tag)
                    if name == "GPSInfo":
                        try:
                            gps_ifd = exif.get_ifd(tag)
                        except Exception:
                            gps_ifd = value if isinstance(value, dict) else {}
                        metadata.update(_decode_gps_ifd(gps_ifd))
                    else:
                        decoded[str(name)] = json_safe(value)

                metadata["embedded_exif"] = decoded
                for key in DATE_KEYS:
                    if key in decoded:
                        metadata.setdefault("date_candidates", []).append((key, decoded[key]))
    except Exception as exc:
        logger.debug("Image metadata extraction failed for memory %s: %s", memory.id, exc)

    return _merge_metadata(metadata, _extract_xmp_metadata(raw_bytes))


def _with_temp_file(memory, suffix, callback):
    try:
        source_path = memory.original_file.path
        if source_path:
            return callback(source_path)
    except (AttributeError, NotImplementedError, ValueError):
        pass

    temp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    try:
        with memory.original_file.open("rb") as file_obj:
            temp.write(file_obj.read())
        temp.flush()
        temp.close()
        return callback(temp.name)
    finally:
        try:
            os.unlink(temp.name)
        except OSError:
            pass


def _extract_video_metadata(memory, raw_bytes):
    metadata = _extract_xmp_metadata(raw_bytes)

    try:
        from mutagen import File as MutagenFile
    except ImportError:
        return metadata

    def parse(path):
        parsed = MutagenFile(path, easy=False)
        tags = getattr(parsed, "tags", None) if parsed else None
        if not tags:
            return {}

        result = {"embedded_media_tags": {}}
        for key, value in tags.items():
            safe_value = json_safe(value)
            result["embedded_media_tags"][str(key)] = safe_value
            if str(key) in DATE_KEYS:
                result.setdefault("date_candidates", []).append((str(key), safe_value))
            if "location" in str(key).lower() and "gps_latitude" not in result:
                result.update(_parse_iso6709(_first_scalar(safe_value)))
        return result

    try:
        suffix = os.path.splitext(getattr(memory.original_file, "name", "") or "")[1]
        media_metadata = _with_temp_file(memory, suffix, parse)
        return _merge_metadata(metadata, media_metadata)
    except Exception as exc:
        logger.debug("Video metadata extraction failed for memory %s: %s", memory.id, exc)
        return metadata


def _extract_pdf_metadata(memory):
    try:
        import fitz
    except ImportError:
        return {}

    def parse(path):
        doc = fitz.open(path)
        try:
            raw = doc.metadata or {}
        finally:
            doc.close()

        result = {"embedded_pdf_metadata": json_safe(raw)}
        for key in ("creationDate", "modDate", "created", "modified"):
            if raw.get(key):
                result.setdefault("date_candidates", []).append((key, raw[key]))
        if raw.get("subject"):
            result["pdf_subject"] = raw["subject"]
        return result

    try:
        return _with_temp_file(memory, ".pdf", parse)
    except Exception as exc:
        logger.debug("PDF metadata extraction failed for memory %s: %s", memory.id, exc)
        return {}


def _pick_best_date(candidates, file_name):
    for source, value in candidates or []:
        parsed_datetime, raw_text = _parse_datetime_value(value)
        parsed = parsed_datetime.date() if parsed_datetime else None
        if parsed:
            return parsed, source, raw_text, parsed_datetime.isoformat()

    parsed, raw_text = _parse_date_from_filename(file_name)
    if parsed:
        return parsed, "filename", raw_text, ""

    return None, "", "", ""


def extract_capture_metadata(memory, media_kind):
    file_name = getattr(memory.original_file, "name", "") or ""
    raw_bytes = _read_sample_bytes(memory)

    metadata = {}
    if media_kind == "image":
        metadata.update(_extract_image_metadata(memory, raw_bytes))
    elif media_kind == "video":
        metadata.update(_extract_video_metadata(memory, raw_bytes))
    elif media_kind == "pdf":
        metadata = _merge_metadata(metadata, _extract_pdf_metadata(memory), _extract_xmp_metadata(raw_bytes))
    else:
        metadata.update(_extract_xmp_metadata(raw_bytes))

    captured_date, date_source, raw_date, captured_datetime = _pick_best_date(metadata.get("date_candidates"), file_name)
    normalized = dict(metadata)
    normalized.pop("date_candidates", None)
    if captured_date:
        normalized["capture_date"] = captured_date.isoformat()
        normalized["capture_year"] = str(captured_date.year)
        normalized["capture_date_source"] = date_source
        normalized["capture_date_raw"] = raw_date
    if captured_datetime:
        normalized["capture_datetime"] = captured_datetime

    if normalized.get("location_label"):
        normalized["location"] = normalized["location_label"]
    elif normalized.get("location"):
        normalized["location"] = str(normalized["location"])

    normalized["metadata_extraction_version"] = 1
    return {
        "date": captured_date,
        "year": str(captured_date.year) if captured_date else "",
        "location": normalized.get("location", ""),
        "exif": json_safe(normalized),
    }
