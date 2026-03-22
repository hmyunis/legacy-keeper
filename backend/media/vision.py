import io
import logging
import os
import threading
import urllib.request
from typing import Any

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter, ImageOps, UnidentifiedImageError
from django.conf import settings

try:
    import cv2
except Exception:  # pragma: no cover - import safety
    cv2 = None


_FACE_CLASSIFIER = None
_COLORIZATION_NET = None
_COLORIZATION_LOCK = threading.Lock()
logger = logging.getLogger(__name__)

_COLORIZATION_ASSETS = {
    'prototxt': {
        'file_name': 'colorization_deploy_v2.prototxt',
        'urls': [
            'https://huggingface.co/spaces/viveknarayan/Image_Colorization/resolve/main/colorization_deploy_v2.prototxt',
            'https://raw.githubusercontent.com/richzhang/colorization/caffe/colorization/models/colorization_deploy_v2.prototxt',
        ],
    },
    'model': {
        'file_name': 'colorization_release_v2.caffemodel',
        'urls': [
            'https://huggingface.co/spaces/viveknarayan/Image_Colorization/resolve/main/colorization_release_v2.caffemodel',
            'https://eecs.berkeley.edu/~rich.zhang/projects/2016_colorization/files/demo_v2/colorization_release_v2.caffemodel',
        ],
    },
    'points': {
        'file_name': 'pts_in_hull.npy',
        'urls': [
            'https://huggingface.co/spaces/viveknarayan/Image_Colorization/resolve/main/pts_in_hull.npy',
            'https://raw.githubusercontent.com/richzhang/colorization/caffe/colorization/resources/pts_in_hull.npy',
        ],
    },
}


def _get_colorization_model_dir():
    configured = str(getattr(settings, 'MEDIA_RESTORATION_MODEL_DIR', '') or '').strip()
    if not configured:
        return os.path.join(str(getattr(settings, 'BASE_DIR', '') or ''), 'models', 'colorization')
    return configured


def _ensure_model_asset(path: str, download_urls: Any):
    if os.path.exists(path):
        return

    if not bool(getattr(settings, 'MEDIA_RESTORATION_AUTO_DOWNLOAD', True)):
        raise FileNotFoundError(f'Missing required model file: {path}')

    os.makedirs(os.path.dirname(path), exist_ok=True)
    urls = []
    if isinstance(download_urls, (list, tuple)):
        urls = [str(item).strip() for item in download_urls if str(item).strip()]
    elif isinstance(download_urls, str) and download_urls.strip():
        urls = [download_urls.strip()]

    if not urls:
        raise RuntimeError(f'No download URLs configured for model asset: {path}')

    errors = []
    for url in urls:
        try:
            with urllib.request.urlopen(url, timeout=30) as response:
                data = response.read()
            if not data:
                raise RuntimeError(f'No data downloaded from {url}')
            with open(path, 'wb') as model_file:
                model_file.write(data)
            return
        except Exception as exc:
            errors.append(f'{url} ({exc})')
            continue

    joined_errors = '; '.join(errors)
    raise RuntimeError(f'Failed to download model asset for {path}. Attempts: {joined_errors}')


def _resolve_colorization_asset_paths():
    model_dir = _get_colorization_model_dir()
    resolved = {}
    for key, payload in _COLORIZATION_ASSETS.items():
        file_name = payload['file_name']
        resolved[key] = os.path.join(model_dir, file_name)
    return resolved


def _load_colorization_net():
    global _COLORIZATION_NET
    if cv2 is None:
        raise RuntimeError('OpenCV is not available for DNN colorization.')

    with _COLORIZATION_LOCK:
        if _COLORIZATION_NET is not None:
            return _COLORIZATION_NET

        paths = _resolve_colorization_asset_paths()
        for key, payload in _COLORIZATION_ASSETS.items():
            _ensure_model_asset(paths[key], payload.get('urls') or payload.get('url'))

        net = cv2.dnn.readNetFromCaffe(paths['prototxt'], paths['model'])
        points = np.load(paths['points'])
        points = points.transpose().reshape(2, 313, 1, 1).astype(np.float32)

        class8_layer = net.getLayerId('class8_ab')
        conv8_layer = net.getLayerId('conv8_313_rh')
        net.getLayer(class8_layer).blobs = [points]
        net.getLayer(conv8_layer).blobs = [np.full((1, 313), 2.606, dtype=np.float32)]

        _COLORIZATION_NET = net
        return _COLORIZATION_NET


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


def _channel_delta_stats(rgb_array: np.ndarray) -> tuple[float, float, float]:
    red = rgb_array[:, :, 0].astype(np.float32)
    green = rgb_array[:, :, 1].astype(np.float32)
    blue = rgb_array[:, :, 2].astype(np.float32)
    channel_delta = np.maximum.reduce(
        [
            np.abs(red - green),
            np.abs(red - blue),
            np.abs(green - blue),
        ]
    )
    return (
        float(np.mean(channel_delta)),
        float(np.percentile(channel_delta, 75)),
        float(np.percentile(channel_delta, 90)),
    )


def _is_mostly_black_and_white(rgb_array: np.ndarray) -> bool:
    if rgb_array.size == 0:
        return False

    mean_delta, p75_delta, p90_delta = _channel_delta_stats(rgb_array)

    if cv2 is not None:
        hsv = cv2.cvtColor(rgb_array, cv2.COLOR_RGB2HSV)
        sat = hsv[:, :, 1].astype(np.float32)
        low_sat_ratio = float(np.mean(sat < 40))
        very_low_sat_ratio = float(np.mean(sat < 25))
        median_sat = float(np.percentile(sat, 50))
        p75_sat = float(np.percentile(sat, 75))

        # Intentionally lenient to treat faded/sepia scans as monochrome-like.
        if low_sat_ratio >= 0.60:
            return True
        if very_low_sat_ratio >= 0.45 and median_sat <= 46 and p75_sat <= 78:
            return True

    # Fallback / complement based on cross-channel similarity.
    return mean_delta <= 17.0 and p75_delta <= 28.0 and p90_delta <= 40.0


def _has_strong_color_information(rgb_array: np.ndarray) -> bool:
    if rgb_array.size == 0:
        return False

    mean_delta, p75_delta, _p90_delta = _channel_delta_stats(rgb_array)

    if cv2 is None:
        return mean_delta >= 24.0 and p75_delta >= 34.0

    hsv = cv2.cvtColor(rgb_array, cv2.COLOR_RGB2HSV)
    sat = hsv[:, :, 1].astype(np.float32)
    mean_sat = float(np.mean(sat))
    p75_sat = float(np.percentile(sat, 75))
    low_sat_ratio = float(np.mean(sat < 40))

    return (
        mean_sat >= 55.0
        and p75_sat >= 78.0
        and low_sat_ratio <= 0.35
        and mean_delta >= 24.0
        and p75_delta >= 34.0
    )


def _estimate_noise_level(rgb_array: np.ndarray) -> float:
    if cv2 is None:
        gray = np.asarray(Image.fromarray(rgb_array, mode='RGB').convert('L'), dtype=np.float32)
        blurred = np.asarray(
            Image.fromarray(gray.astype(np.uint8), mode='L').filter(ImageFilter.GaussianBlur(radius=1.4)),
            dtype=np.float32,
        )
        residual = np.abs(gray - blurred)
        return float(np.percentile(residual, 70))

    gray = cv2.cvtColor(rgb_array, cv2.COLOR_RGB2GRAY).astype(np.float32)
    blurred = cv2.GaussianBlur(gray, (0, 0), sigmaX=1.3, sigmaY=1.3)
    residual = np.abs(gray - blurred)
    return float(np.percentile(residual, 70))


def _denoise_rgb_array(
    rgb_array: np.ndarray,
    *,
    is_black_and_white: bool,
    noise_level: float,
) -> np.ndarray:
    if cv2 is None:
        image = Image.fromarray(rgb_array, mode='RGB')
        image = image.filter(ImageFilter.MedianFilter(size=3))
        if noise_level >= 10.0:
            image = image.filter(ImageFilter.GaussianBlur(radius=0.8))
        return np.array(image)

    bgr = cv2.cvtColor(rgb_array, cv2.COLOR_RGB2BGR)
    normalized_noise = max(0.0, min(1.0, noise_level / 32.0))
    if is_black_and_white:
        gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
        h_strength = int(round(9 + normalized_noise * 10))
        denoised_gray = cv2.fastNlMeansDenoising(
            gray,
            None,
            h=h_strength,
            templateWindowSize=7,
            searchWindowSize=21,
        )
        restored_gray = cv2.cvtColor(denoised_gray, cv2.COLOR_GRAY2RGB)
        return restored_gray

    h_strength = int(round(6 + normalized_noise * 10))
    h_color_strength = int(round(6 + normalized_noise * 8))
    denoised_bgr = cv2.fastNlMeansDenoisingColored(
        bgr,
        None,
        h=h_strength,
        hColor=h_color_strength,
        templateWindowSize=7,
        searchWindowSize=21,
    )
    return cv2.cvtColor(denoised_bgr, cv2.COLOR_BGR2RGB)


def _apply_fallback_warm_colorization(rgb_array: np.ndarray, *, blend_strength: float) -> np.ndarray:
    source = Image.fromarray(rgb_array, mode='RGB')
    luminance = source.convert('L')
    warm_tone = ImageOps.colorize(
        luminance,
        black='#2a2230',
        mid='#b28666',
        white='#f4e6d0',
    ).convert('RGB')
    strength = max(0.0, min(1.0, float(blend_strength)))
    return np.array(Image.blend(source, warm_tone, strength))


def _apply_dnn_colorization(rgb_array: np.ndarray) -> np.ndarray:
    net = _load_colorization_net()

    bgr = cv2.cvtColor(rgb_array, cv2.COLOR_RGB2BGR).astype(np.float32) / 255.0
    lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB)
    l_channel = lab[:, :, 0]

    resized_l = cv2.resize(l_channel, (224, 224))
    resized_l = resized_l - 50.0
    net.setInput(cv2.dnn.blobFromImage(resized_l))
    predicted_ab = net.forward()[0, :, :, :].transpose((1, 2, 0))
    predicted_ab = cv2.resize(predicted_ab, (rgb_array.shape[1], rgb_array.shape[0]))

    colorized_lab = np.concatenate((l_channel[:, :, np.newaxis], predicted_ab), axis=2)
    colorized_bgr = cv2.cvtColor(colorized_lab.astype(np.float32), cv2.COLOR_LAB2BGR)
    colorized_bgr = np.clip(colorized_bgr, 0.0, 1.0)
    return (colorized_bgr * 255.0).astype(np.uint8)[:, :, ::-1]


def _enhance_restored_rgb(rgb_array: np.ndarray) -> np.ndarray:
    if cv2 is None:
        image = Image.fromarray(rgb_array, mode='RGB')
        image = ImageEnhance.Contrast(image).enhance(1.10)
        image = ImageEnhance.Sharpness(image).enhance(1.18)
        return np.array(image)

    lab = cv2.cvtColor(rgb_array, cv2.COLOR_RGB2LAB)
    l_channel, a_channel, b_channel = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.2, tileGridSize=(8, 8))
    enhanced_l = clahe.apply(l_channel)
    merged_lab = cv2.merge((enhanced_l, a_channel, b_channel))
    enhanced_rgb = cv2.cvtColor(merged_lab, cv2.COLOR_LAB2RGB)
    sharpened = cv2.addWeighted(enhanced_rgb, 1.12, cv2.GaussianBlur(enhanced_rgb, (0, 0), 1.0), -0.12, 0)
    return np.clip(sharpened, 0, 255).astype(np.uint8)


def _restore_faded_color_photo(rgb_array: np.ndarray) -> np.ndarray:
    if cv2 is None:
        image = Image.fromarray(rgb_array, mode='RGB')
        image = ImageEnhance.Color(image).enhance(1.14)
        image = ImageEnhance.Contrast(image).enhance(1.07)
        return np.array(image)

    lab = cv2.cvtColor(rgb_array, cv2.COLOR_RGB2LAB).astype(np.float32)
    l_channel, a_channel, b_channel = cv2.split(lab)
    a_channel = (a_channel - 128.0) * 1.08 + 128.0
    b_channel = (b_channel - 128.0) * 1.08 + 128.0
    recolored_lab = cv2.merge(
        (
            np.clip(l_channel, 0, 255),
            np.clip(a_channel, 0, 255),
            np.clip(b_channel, 0, 255),
        )
    ).astype(np.uint8)
    return cv2.cvtColor(recolored_lab, cv2.COLOR_LAB2RGB)


def restore_legacy_photo(
    file_obj: Any,
    *,
    apply_colorize: bool = True,
    apply_denoise: bool = True,
) -> dict[str, Any]:
    image = _load_rgb_image(file_obj)
    if image is None:
        raise UnidentifiedImageError('The selected file is not a valid image.')

    rgb_array = np.array(image)
    if rgb_array.size == 0:
        raise ValueError('Image has no readable pixel data.')

    is_black_and_white = _is_mostly_black_and_white(rgb_array)
    has_strong_color = _has_strong_color_information(rgb_array)
    noise_level = _estimate_noise_level(rgb_array)
    warnings = []
    applied_colorize = False
    applied_denoise = False
    working_array = rgb_array
    colorization_method = 'none'

    if apply_denoise:
        working_array = _denoise_rgb_array(
            working_array,
            is_black_and_white=is_black_and_white,
            noise_level=noise_level,
        )
        applied_denoise = True

    if apply_colorize:
        if is_black_and_white or not has_strong_color:
            try:
                if cv2 is None:
                    raise RuntimeError('OpenCV is unavailable.')
                working_array = _apply_dnn_colorization(working_array)
                colorization_method = 'opencv-dnn'
            except Exception as exc:
                logger.warning('Falling back to warm-tone colorization: %s', exc, exc_info=True)
                blend_strength = 0.72 if is_black_and_white else 0.45
                working_array = _apply_fallback_warm_colorization(
                    working_array,
                    blend_strength=blend_strength,
                )
                colorization_method = 'fallback-warmtone'
                warnings.append(
                    'High-quality colorization model unavailable. Applied fallback colorization.'
                )
            applied_colorize = True
        else:
            working_array = _restore_faded_color_photo(working_array)
            colorization_method = 'faded-color-enhance'
            applied_colorize = True

    working_array = _enhance_restored_rgb(working_array)
    output_image = Image.fromarray(working_array, mode='RGB')

    output_buffer = io.BytesIO()
    output_image.save(output_buffer, format='JPEG', quality=92, optimize=True)
    output_bytes = output_buffer.getvalue()

    return {
        'image_bytes': output_bytes,
        'width': int(output_image.width),
        'height': int(output_image.height),
        'detected_black_and_white': bool(is_black_and_white),
        'applied': {
            'colorize': bool(applied_colorize),
            'denoise': bool(applied_denoise),
        },
        'noise_level': round(float(noise_level), 3),
        'colorization_method': colorization_method,
        'warnings': warnings,
        'format': 'JPEG',
        'mime_type': 'image/jpeg',
    }
