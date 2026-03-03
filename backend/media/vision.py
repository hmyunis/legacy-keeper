import io
from typing import Any

import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError

try:
    import cv2
except Exception:  # pragma: no cover - import safety
    cv2 = None


_FACE_CLASSIFIER = None


def _get_face_classifier():
    global _FACE_CLASSIFIER
    if cv2 is None:
        raise RuntimeError('OpenCV is not installed. Install opencv-python-headless to enable face detection.')

    if _FACE_CLASSIFIER is not None:
        return _FACE_CLASSIFIER

    cascade_path = getattr(getattr(cv2, 'data', None), 'haarcascades', '') + 'haarcascade_frontalface_default.xml'
    classifier = cv2.CascadeClassifier(cascade_path)
    if classifier.empty():
        raise RuntimeError('Unable to load OpenCV face detection model.')
    _FACE_CLASSIFIER = classifier
    return _FACE_CLASSIFIER


def _load_rgb_image(file_obj: Any):
    opened_here = False
    try:
        if hasattr(file_obj, 'open'):
            file_obj.open('rb')
            opened_here = True
        if hasattr(file_obj, 'seek'):
            file_obj.seek(0)

        with Image.open(file_obj) as source:
            image = ImageOps.exif_transpose(source).convert('RGB')
        return image
    except (UnidentifiedImageError, OSError):
        return None
    finally:
        if opened_here and hasattr(file_obj, 'close'):
            try:
                file_obj.close()
            except Exception:
                pass


def _normalize_face_coordinates(x: int, y: int, w: int, h: int, width: int, height: int):
    return {
        'x': round(max(0.0, min(1.0, x / width)), 6),
        'y': round(max(0.0, min(1.0, y / height)), 6),
        'w': round(max(0.0, min(1.0, w / width)), 6),
        'h': round(max(0.0, min(1.0, h / height)), 6),
    }


def _build_face_thumbnail(image: Image.Image, x: int, y: int, w: int, h: int) -> bytes:
    padding_x = max(int(w * 0.25), 8)
    padding_y = max(int(h * 0.25), 8)

    left = max(0, x - padding_x)
    top = max(0, y - padding_y)
    right = min(image.width, x + w + padding_x)
    bottom = min(image.height, y + h + padding_y)

    crop = image.crop((left, top, right, bottom))
    resized = crop.resize((160, 160), Image.Resampling.LANCZOS)

    buffer = io.BytesIO()
    resized.save(buffer, format='JPEG', quality=84, optimize=True)
    return buffer.getvalue()


def detect_faces(file_obj: Any, *, min_face_size_px: int = 36, max_faces: int = 30):
    image = _load_rgb_image(file_obj)
    if image is None:
        return {
            'is_image': False,
            'width': 0,
            'height': 0,
            'faces': [],
        }

    width, height = image.size
    if width <= 0 or height <= 0:
        return {
            'is_image': False,
            'width': 0,
            'height': 0,
            'faces': [],
        }

    classifier = _get_face_classifier()
    rgb_array = np.array(image)
    gray = cv2.cvtColor(rgb_array, cv2.COLOR_RGB2GRAY)

    dynamic_min_face = max(min_face_size_px, int(min(width, height) * 0.06))
    detections = classifier.detectMultiScale(
        gray,
        scaleFactor=1.12,
        minNeighbors=5,
        minSize=(dynamic_min_face, dynamic_min_face),
    )

    candidates = []
    for raw_x, raw_y, raw_w, raw_h in detections:
        x = max(0, int(raw_x))
        y = max(0, int(raw_y))
        w = max(1, int(raw_w))
        h = max(1, int(raw_h))

        if x + w > width:
            w = width - x
        if y + h > height:
            h = height - y
        if w <= 0 or h <= 0:
            continue

        relative_size = min(w, h) / float(max(width, height))
        confidence = round(min(0.98, max(0.55, 0.55 + relative_size)), 3)
        candidates.append(
            {
                'face_coordinates': _normalize_face_coordinates(x, y, w, h, width, height),
                'confidence': confidence,
                'thumbnail_bytes': _build_face_thumbnail(image, x, y, w, h),
                'pixel_area': w * h,
            }
        )

    candidates.sort(key=lambda row: row['pixel_area'], reverse=True)
    trimmed = candidates[:max_faces]
    for row in trimmed:
        row.pop('pixel_area', None)

    return {
        'is_image': True,
        'width': width,
        'height': height,
        'faces': trimmed,
    }
