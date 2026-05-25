import logging
from io import BytesIO

from django.core.files.base import ContentFile
from PIL import Image, ImageOps

logger = logging.getLogger(__name__)


def _square_face_box(location, image_size, padding_ratio=0.45):
    top, right, bottom, left = [int(value) for value in location]
    image_width, image_height = image_size

    face_width = max(right - left, 1)
    face_height = max(bottom - top, 1)
    center_x = left + face_width / 2
    center_y = top + face_height / 2
    side = max(face_width, face_height) * (1 + padding_ratio * 2)

    crop_left = max(int(center_x - side / 2), 0)
    crop_top = max(int(center_y - side / 2), 0)
    crop_right = min(int(center_x + side / 2), image_width)
    crop_bottom = min(int(center_y + side / 2), image_height)

    return crop_left, crop_top, crop_right, crop_bottom


def save_person_avatar_from_face_image(person, image, location, source_id=None):
    if not location:
        return False

    try:
        oriented_image = image.convert("RGB")
        crop = oriented_image.crop(_square_face_box(location, oriented_image.size))
        crop = ImageOps.fit(crop, (384, 384), Image.Resampling.LANCZOS, centering=(0.5, 0.5))

        output = BytesIO()
        crop.save(output, format="JPEG", quality=88, optimize=True)

        source_slug = str(source_id or person.id)[:8]
        person.avatar.save(
            f"face-{person.id}-{source_slug}.jpg",
            ContentFile(output.getvalue()),
            save=True,
        )
        return True
    except Exception as exc:
        logger.warning("Could not create face avatar for person %s: %s", person.id, exc)
        return False


def save_person_avatar_from_memory_face(person, memory, location):
    try:
        with memory.original_file.open("rb") as image_file:
            image = Image.open(image_file)
            return save_person_avatar_from_face_image(person, image, location, source_id=memory.id)
    except Exception as exc:
        logger.warning("Could not open memory %s for face avatar: %s", memory.id, exc)
        return False
