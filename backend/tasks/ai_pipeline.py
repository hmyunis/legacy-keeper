import json
import logging
import mimetypes
import os
import re
import requests
import tempfile
from core.vapid import send_web_push
from io import BytesIO
from PIL import Image, ImageOps
import imagehash
import face_recognition
import numpy as np

try:
    import cv2
except ImportError:
    cv2 = None

try:
    import pytesseract
    from pytesseract import TesseractNotFoundError
except ImportError:
    pytesseract = None

    class TesseractNotFoundError(Exception):
        pass

from celery import shared_task
from django.conf import settings
from django.utils import timezone
from tasks.ollama_client import generate_with_ollama
from vaults.models import Memory
from lineage.models import Person, PersonFaceEmbedding
from lineage.avatar_utils import save_person_avatar_from_face_image
from tasks.metadata_extractor import extract_capture_metadata, json_safe

logger = logging.getLogger(__name__)

_clip_model = None

VISUAL_TAG_CANDIDATES = [
    "portrait",
    "group photo",
    "family gathering",
    "childhood",
    "baby",
    "wedding",
    "birthday",
    "graduation",
    "holiday",
    "reunion",
    "ceremony",
    "party",
    "meal",
    "dining table",
    "home",
    "kitchen",
    "living room",
    "school",
    "church",
    "garden",
    "park",
    "beach",
    "mountains",
    "outdoors",
    "indoors",
    "travel",
    "car",
    "street",
    "document",
    "letter",
    "black and white",
    "vintage",
    "military",
    "work",
    "sports",
    "music",
    "dance",
]

IMAGE_OBJECT_CANDIDATES = [
    "person",
    "child",
    "baby",
    "bride",
    "groom",
    "table",
    "chair",
    "sofa",
    "bed",
    "car",
    "bicycle",
    "bus",
    "train",
    "airplane",
    "boat",
    "house",
    "building",
    "church",
    "school",
    "tree",
    "flower",
    "mountain",
    "beach",
    "cake",
    "food",
    "cup",
    "book",
    "letter",
    "document",
    "certificate",
    "newspaper",
    "clock",
    "watch",
    "phone",
    "camera",
    "television",
    "musical instrument",
    "piano",
    "guitar",
    "toy",
    "dog",
    "cat",
]

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tif", ".tiff", ".heic", ".heif"}
VIDEO_EXTENSIONS = {".mp4", ".mov", ".m4v", ".avi", ".mkv", ".webm"}
PDF_EXTENSIONS = {".pdf"}
MAX_VIDEO_FRAMES = 20
MAX_PDF_PAGES = 50
AI_METADATA_PROMPT_VERSION = 2
MAX_AI_TAGS = 7
LOW_CONFIDENCE_TAGS = {
    "family",
    "family memory",
    "memory",
    "photo",
    "image",
    "picture",
    "person",
    "people",
    "vintage",
    "outdoors",
    "indoors",
}
WEAK_CONTEXT_COLLECTIONS = {"", "unsorted", "uncategorized", "unknown", "misc", "miscellaneous"}

def get_clip_model():
    global _clip_model
    if _clip_model is None:
        from sentence_transformers import SentenceTransformer
        _clip_model = SentenceTransformer('clip-ViT-B-32')
    return _clip_model


def clean_tag(tag):
    tag = re.sub(r'\s+', ' ', str(tag or '').strip().lower().replace('#', ''))
    tag = re.sub(r'[^a-z0-9 &-]', '', tag).strip(' -&')
    return tag[:50]


def merge_tags(*tag_groups, limit=14):
    merged = []
    seen = set()
    for group in tag_groups:
        if isinstance(group, str):
            group = re.split(r'[,;|]', group)
        for tag in group or []:
            cleaned = clean_tag(tag)
            if cleaned and cleaned not in seen:
                seen.add(cleaned)
                merged.append(cleaned)
            if len(merged) >= limit:
                return merged
    return merged


def is_unknown_person_name(name):
    return str(name or "").strip().lower().startswith("unknown kin")


def get_collection_name(memory):
    collection = str(getattr(memory, "cluster_name", "") or "").strip()
    if collection.lower() in WEAK_CONTEXT_COLLECTIONS:
        return ""
    return collection[:120]


def get_collection_context(memory, limit=6):
    collection_name = get_collection_name(memory)
    if not collection_name:
        return []

    siblings = (
        Memory.objects
        .filter(vault=memory.vault, cluster_name=collection_name)
        .exclude(id=memory.id)
        .order_by("-created_at")[:limit]
    )
    context = []
    for sibling in siblings:
        context.append({
            "title": sibling.title or "",
            "year": sibling.year or "",
            "location": sibling.location or "",
            "tags": merge_tags(sibling.tags or [], limit=5),
        })
    return context


def normalize_confidence(value, default="medium"):
    value = str(value or "").strip().lower()
    if value in {"high", "medium", "low"}:
        return value
    return default


def confidence_from_context(known_people, searchable_text, collection_context, visual_tags, object_tags, generated_value):
    if not generated_value:
        return "low"
    if known_people or searchable_text:
        return "high"
    if collection_context and (visual_tags or object_tags):
        return "high"
    if visual_tags or object_tags:
        return "medium"
    return "low"


def add_curated_tag(tags, tag_confidence, tag_sources, tag, confidence, source):
    cleaned = clean_tag(tag)
    if not cleaned or cleaned in LOW_CONFIDENCE_TAGS or cleaned in tag_confidence:
        return
    tags.append(cleaned)
    tag_confidence[cleaned] = normalize_confidence(confidence)
    tag_sources[cleaned] = source


def curate_ai_tags(
    generated_tags,
    visual_tags,
    object_tags,
    known_people,
    year,
    location,
    collection_name,
    existing_tags,
    limit=MAX_AI_TAGS,
):
    tags = []
    tag_confidence = {}
    tag_sources = {}

    for name in known_people[:4]:
        add_curated_tag(tags, tag_confidence, tag_sources, name, "high", "person_match")

    if year:
        add_curated_tag(tags, tag_confidence, tag_sources, year, "high", "capture_year")
    if location:
        add_curated_tag(tags, tag_confidence, tag_sources, location, "high", "artifact_location")
    if collection_name:
        add_curated_tag(tags, tag_confidence, tag_sources, collection_name, "medium", "collection")

    visual_set = set(merge_tags(visual_tags, limit=20))
    object_set = set(merge_tags(object_tags, limit=20))
    existing_set = set(merge_tags(existing_tags or [], limit=20))

    for tag in generated_tags or []:
        cleaned = clean_tag(tag)
        if not cleaned:
            continue
        if cleaned in visual_set or cleaned in object_set or cleaned in existing_set:
            confidence = "medium"
        elif cleaned in LOW_CONFIDENCE_TAGS:
            continue
        else:
            confidence = "low"
        add_curated_tag(tags, tag_confidence, tag_sources, cleaned, confidence, "metadata_model")

    for tag in visual_tags:
        add_curated_tag(tags, tag_confidence, tag_sources, tag, "medium", "visual_classifier")
    for tag in object_tags:
        add_curated_tag(tags, tag_confidence, tag_sources, tag, "medium", "object_classifier")

    return tags[:limit], {
        tag: {"confidence": tag_confidence[tag], "source": tag_sources[tag]}
        for tag in tags[:limit]
    }


def infer_visual_tags(model, image, image_vector, limit=6):
    text_prompts = [f"a family archive photo showing {tag}" for tag in VISUAL_TAG_CANDIDATES]
    text_vectors = np.array(model.encode(text_prompts), dtype=np.float32)
    image_vector = np.array(image_vector, dtype=np.float32)

    text_vectors = text_vectors / np.linalg.norm(text_vectors, axis=1, keepdims=True)
    image_vector = image_vector / np.linalg.norm(image_vector)
    scores = text_vectors @ image_vector

    ranked_indexes = np.argsort(scores)[::-1]
    selected = []
    for index in ranked_indexes:
        tag = VISUAL_TAG_CANDIDATES[index]
        score = float(scores[index])
        if len(selected) < 3 or score >= 0.22:
            selected.append(tag)
        if len(selected) >= limit:
            break

    if image.mode == 'L':
        selected.append("black and white")

    return merge_tags(selected, limit=limit)


def infer_image_object_tags(model, image_vector, limit=8):
    text_prompts = [f"a family archive photo containing a {tag}" for tag in IMAGE_OBJECT_CANDIDATES]
    text_vectors = np.array(model.encode(text_prompts), dtype=np.float32)
    image_vector = np.array(image_vector, dtype=np.float32)

    text_vectors = text_vectors / np.linalg.norm(text_vectors, axis=1, keepdims=True)
    image_vector = image_vector / np.linalg.norm(image_vector)
    scores = text_vectors @ image_vector

    ranked_indexes = np.argsort(scores)[::-1]
    selected = []
    for index in ranked_indexes:
        tag = IMAGE_OBJECT_CANDIDATES[index]
        score = float(scores[index])
        if len(selected) < 3 or score >= 0.24:
            selected.append(tag)
        if len(selected) >= limit:
            break

    return merge_tags(selected, limit=limit)


def extract_image_ocr_text(image):
    if pytesseract is None:
        return "", "pytesseract is not installed, so image OCR was skipped."

    try:
        prepared = ImageOps.grayscale(image.convert("RGB"))
        prepared = ImageOps.autocontrast(prepared)
        text = pytesseract.image_to_string(prepared, config="--psm 6")
        text = re.sub(r'\s+', ' ', text or '').strip()
        return text[:6000], ""
    except TesseractNotFoundError:
        return "", "Tesseract OCR is not installed or not on PATH, so image OCR was skipped."
    except Exception as exc:
        logger.warning("Image OCR failed: %s", exc)
        return "", f"Image OCR failed: {exc}"


def parse_json_object(raw_text):
    if not raw_text:
        return {}

    try:
        return json.loads(raw_text)
    except json.JSONDecodeError:
        pass

    match = re.search(r'\{.*\}', raw_text, flags=re.DOTALL)
    if not match:
        return {}

    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError:
        return {}


def should_replace_title(memory):
    current_title = (memory.title or '').strip().lower()
    return (
        not current_title
        or current_title in {"untitled", "untitled artifact"}
        or not memory.is_reviewed
        or bool((memory.exif_json or {}).get("ai_generated_title"))
    )


def fallback_exhibit_title(year, location, tags):
    subject = next((tag for tag in tags if tag not in {"outdoors", "indoors", "vintage"}), "family memory")
    parts = [subject.title()]
    if location:
        parts.append(f"in {location}")
    elif year:
        parts.append(f"from {year}")
    return " ".join(parts)[:255]


def fallback_exhibit_description(year, location, people_names, tags):
    details = []
    if people_names:
        details.append(f"featuring {', '.join(people_names[:3])}")
    if location:
        details.append(f"captured in {location}")
    if year:
        details.append(f"around {year}")
    if tags:
        details.append(f"with traces of {', '.join(tags[:3])}")

    if details:
        return f"A preserved family moment, {' '.join(details)}."
    return "A preserved family moment awaiting curator context."


def build_suggestion(memory, field, value, confidence="medium", rationale=""):
    if not value:
        return None

    existing = (memory.ai_suggestions or {}).get(field) or {}
    status = 'pending'
    if existing.get('value') == value and existing.get('status') in {'accepted', 'rejected'}:
        status = existing.get('status')

    return {
        "value": value,
        "status": status,
        "source": "ai",
        "confidence": normalize_confidence(confidence),
        "rationale": str(rationale or "")[:240],
        "generated_at": timezone.now().isoformat(),
        "decided_at": existing.get("decided_at") if status != 'pending' else None,
        "decided_by": existing.get("decided_by") if status != 'pending' else None,
    }


def put_suggestion(memory, field, value, confidence="medium", rationale=""):
    suggestion = build_suggestion(memory, field, value, confidence=confidence, rationale=rationale)
    if not suggestion:
        return

    suggestions = dict(memory.ai_suggestions or {})
    suggestions[field] = suggestion
    memory.ai_suggestions = suggestions


def detect_media_kind(file_name):
    ext = os.path.splitext(file_name or "")[1].lower()
    mime_type, _ = mimetypes.guess_type(file_name or "")
    if ext in IMAGE_EXTENSIONS or (mime_type or "").startswith("image/"):
        return "image"
    if ext in VIDEO_EXTENSIONS or (mime_type or "").startswith("video/"):
        return "video"
    if ext in PDF_EXTENSIONS or mime_type == "application/pdf":
        return "pdf"
    return "unknown"


def fetch_file_source(memory):
    file_name = getattr(memory.original_file, "name", "") or ""
    if settings.USE_MINIO:
        file_url = memory.original_file.url
        if file_url.startswith('/'):
            minio_base_url = getattr(settings, 'MINIO_PUBLIC_MEDIA_URL', 'http://localhost:9000').rstrip('/')
            file_url = f"{minio_base_url}{file_url}"
        response = requests.get(file_url, timeout=30)
        response.raise_for_status()
        return file_name, BytesIO(response.content), None
    return file_name, None, memory.original_file.path


def materialize_source_to_path(source_bytes, source_path, suffix=""):
    if source_path:
        return source_path, None

    temp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    try:
        source_bytes.seek(0)
        temp.write(source_bytes.read())
        temp.flush()
        return temp.name, temp.name
    finally:
        temp.close()


def open_image_from_source(source_bytes, source_path):
    if source_path:
        return Image.open(source_path)
    source_bytes.seek(0)
    return Image.open(source_bytes)


def extract_image_context(source_bytes, source_path):
    img = open_image_from_source(source_bytes, source_path)
    return {
        "frames": [img.convert("RGB")],
        "primary_image": img,
        "text": "",
        "metadata": {
            "width": img.width,
            "height": img.height,
            "frame_count": 1,
        },
        "warnings": [],
    }


def sample_video_frames(source_bytes, source_path, file_name):
    if cv2 is None:
        return {
            "frames": [],
            "primary_image": None,
            "text": "",
            "metadata": {"media_type": "video"},
            "warnings": ["opencv-python-headless is not available, so video frames were not sampled."],
        }

    video_path, temp_path = materialize_source_to_path(
        source_bytes,
        source_path,
        suffix=os.path.splitext(file_name or "")[1],
    )
    frames = []
    warnings = []
    cap = None
    try:
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return {
                "frames": [],
                "primary_image": None,
                "text": "",
                "metadata": {"media_type": "video"},
                "warnings": ["Video could not be opened for frame sampling."],
            }

        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        fps = float(cap.get(cv2.CAP_PROP_FPS) or 0)
        duration_seconds = (frame_count / fps) if frame_count > 0 and fps > 0 else None
        if frame_count <= 0:
            return {
                "frames": [],
                "primary_image": None,
                "text": "",
                "metadata": {"media_type": "video", "fps": fps, "duration_seconds": duration_seconds},
                "warnings": ["Video frame count is unavailable, so frame sampling was skipped."],
            }

        sample_count = min(MAX_VIDEO_FRAMES, frame_count)
        frame_indexes = np.linspace(0, max(frame_count - 1, 0), num=sample_count, dtype=int)
        for frame_index in frame_indexes:
            try:
                cap.set(cv2.CAP_PROP_POS_FRAMES, int(frame_index))
                ok, frame = cap.read()
                if not ok or frame is None:
                    continue
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                frames.append(Image.fromarray(rgb_frame))
            except Exception as ex:
                warnings.append(f"Skipped video frame {int(frame_index)}: {ex}")

        primary = frames[0] if frames else None
        return {
            "frames": frames,
            "primary_image": primary,
            "text": "",
            "metadata": {
                "media_type": "video",
                "width": primary.width if primary else None,
                "height": primary.height if primary else None,
                "frame_count": frame_count,
                "sampled_frames": len(frames),
                "fps": fps,
                "duration_seconds": duration_seconds,
            },
            "warnings": warnings,
        }
    finally:
        if cap is not None:
            cap.release()
        if temp_path:
            try:
                os.unlink(temp_path)
            except OSError:
                pass


def extract_pdf_context(source_bytes, source_path, file_name):
    pdf_path, temp_path = materialize_source_to_path(
        source_bytes,
        source_path,
        suffix=os.path.splitext(file_name or "")[1] or ".pdf",
    )
    try:
        try:
            import fitz
        except ImportError:
            return {
                "frames": [],
                "primary_image": None,
                "text": "",
                "metadata": {"media_type": "pdf"},
                "warnings": ["PyMuPDF is not installed, so PDF content was not processed."],
            }

        doc = fitz.open(pdf_path)
        try:
            page_count = doc.page_count
            if page_count > MAX_PDF_PAGES:
                return {
                    "frames": [],
                    "primary_image": None,
                    "text": "",
                    "metadata": {"media_type": "pdf", "page_count": page_count},
                    "warnings": [f"PDF has {page_count} pages; only PDFs up to {MAX_PDF_PAGES} pages are processed."],
                }

            frames = []
            text_chunks = []
            matrix = fitz.Matrix(1.5, 1.5)
            for page in doc:
                text = page.get_text("text").strip()
                if text:
                    text_chunks.append(text)
                try:
                    pix = page.get_pixmap(matrix=matrix, alpha=False)
                    frames.append(Image.frombytes("RGB", [pix.width, pix.height], pix.samples))
                except Exception as ex:
                    logger.warning(f"Could not render PDF page for memory context: {ex}")

            primary = frames[0] if frames else None
            return {
                "frames": frames,
                "primary_image": primary,
                "text": "\n\n".join(text_chunks)[:4000],
                "metadata": {
                    "media_type": "pdf",
                    "page_count": page_count,
                    "rendered_pages": len(frames),
                    "width": primary.width if primary else None,
                    "height": primary.height if primary else None,
                },
                "warnings": [],
            }
        finally:
            doc.close()
    finally:
        if temp_path:
            try:
                os.unlink(temp_path)
            except OSError:
                pass


def extract_media_context(memory):
    file_name, source_bytes, source_path = fetch_file_source(memory)
    media_kind = detect_media_kind(file_name)
    if media_kind == "image":
        context = extract_image_context(source_bytes, source_path)
    elif media_kind == "video":
        context = sample_video_frames(source_bytes, source_path, file_name)
    elif media_kind == "pdf":
        context = extract_pdf_context(source_bytes, source_path, file_name)
    else:
        context = {
            "frames": [],
            "primary_image": None,
            "text": "",
            "metadata": {},
            "warnings": [f"Unsupported media type for AI visual processing: {file_name or 'unknown file'}"],
        }
    context["media_kind"] = media_kind
    context["file_name"] = file_name
    return context

@shared_task(bind=True, queue='high_priority', name='tasks.ai_pipeline.process_memory_task')
def process_memory_task(self, memory_id):
    try:
        memory = Memory.objects.get(id=memory_id)
        previous_exif = memory.exif_json or {}

        media_context = extract_media_context(memory)
        frames = media_context["frames"]
        primary_image = media_context["primary_image"]
        document_text = media_context["text"]
        media_kind = media_context["media_kind"]
        warnings = media_context["warnings"]

        capture_metadata = extract_capture_metadata(memory, media_kind)
        extracted_year = capture_metadata["year"]
        if capture_metadata["date"]:
            memory.date = capture_metadata["date"]
        if extracted_year:
            memory.year = extracted_year
        if capture_metadata["location"] and not memory.location:
            memory.location = capture_metadata["location"][:255]

        embedded_exif = capture_metadata["exif"].get("embedded_exif") or {}
        tech_meta = {
            key: str(embedded_exif[key])
            for key in ["Make", "Model", "LensModel", "ExposureTime", "FNumber"]
            if embedded_exif.get(key) not in (None, "")
        }
        is_grayscale = bool(primary_image and primary_image.mode == 'L')

        previous_ai_meta = {
            key: value for key, value in previous_exif.items()
            if key.startswith("ai_")
        }
        memory.exif_json = {
            **previous_ai_meta,
            **tech_meta,
            **media_context["metadata"],
            **capture_metadata["exif"],
        }
        memory.exif_json['ai_media_type'] = media_kind
        memory.exif_json['ai_processing_status'] = 'processing'
        if warnings:
            memory.exif_json['ai_processing_warnings'] = warnings
        memory.exif_json['filesize'] = memory.original_file.size
        memory.exif_json = json_safe(memory.exif_json)

        visual_tags = []
        object_tags = []
        image_ocr_text = ""
        detected_people_names = []
        if frames:
            clip_model = get_clip_model()
            vectors = []
            for frame in frames:
                try:
                    frame_rgb = frame.convert('RGB')
                    frame_vector = clip_model.encode(frame_rgb).tolist()
                    vectors.append(frame_vector)
                    visual_tags = merge_tags(
                        visual_tags,
                        infer_visual_tags(clip_model, frame_rgb, frame_vector),
                        limit=12,
                    )
                    if media_kind == "image":
                        object_tags = merge_tags(
                            object_tags,
                            infer_image_object_tags(clip_model, frame_vector),
                            limit=12,
                        )
                except Exception as ex:
                    logger.warning(f"Skipped frame-level AI visual analysis for memory {memory_id}: {ex}")

            if vectors:
                avg_vector = np.mean(np.array(vectors, dtype=np.float32), axis=0)
                memory.clip_embedding = avg_vector.tolist()

            if primary_image:
                img_rgb = primary_image.convert('RGB')
                if media_kind == "image":
                    image_ocr_text, ocr_warning = extract_image_ocr_text(img_rgb)
                    if ocr_warning:
                        warnings.append(ocr_warning)
                memory.phash = str(imagehash.phash(img_rgb))
                if not memory.exif_json.get("width"):
                    memory.exif_json['width'] = img_rgb.width
                if not memory.exif_json.get("height"):
                    memory.exif_json['height'] = img_rgb.height

                previous_unknowns = [
                    face.person for face in memory.detected_faces.select_related('person').all()
                    if face.person.name.startswith("Unknown Kin")
                ]
                memory.detected_faces.all().delete()
                for person in previous_unknowns:
                    if person.face_embeddings.count() == 0:
                        person.delete()

                try:
                    np_img = np.array(img_rgb)
                    face_locations = face_recognition.face_locations(np_img)
                    face_encodings = face_recognition.face_encodings(np_img, face_locations)
                except Exception as ex:
                    logger.warning(f"Face recognition skipped for memory {memory_id}: {ex}")
                    face_locations = []
                    face_encodings = []

                for location, encoding in zip(face_locations, face_encodings):
                    existing_embeddings = PersonFaceEmbedding.objects.filter(person__vault=memory.vault)
                    match_found = False

                    for emb_record in existing_embeddings:
                        db_encoding = np.array(emb_record.embedding_vector)
                        matches = face_recognition.compare_faces([db_encoding], encoding, tolerance=0.6)

                        if matches[0]:
                            PersonFaceEmbedding.objects.create(
                                person=emb_record.person,
                                memory=memory,
                                bounding_box=location,
                                embedding_vector=encoding.tolist()
                            )
                            detected_people_names.append(emb_record.person.name)
                            match_found = True
                            break

                    if not match_found:
                        new_person = Person.objects.create(
                            vault=memory.vault,
                            name=f"Unknown Kin ({str(memory.id)[:4]})",
                            role="Unknown"
                        )
                        save_person_avatar_from_face_image(new_person, img_rgb, location, source_id=memory.id)
                        PersonFaceEmbedding.objects.create(
                            person=new_person,
                            memory=memory,
                            bounding_box=location,
                            embedding_vector=encoding.tolist()
                        )
                        detected_people_names.append(new_person.name)

        if is_grayscale:
            visual_tags = merge_tags(visual_tags, ["black and white"], limit=7)
        if media_kind == "pdf":
            visual_tags = merge_tags(visual_tags, ["document"], limit=12)

        manual_people_names = list(memory.identified_people.values_list('name', flat=True))
        people_context = merge_tags(detected_people_names, manual_people_names, limit=30)
        known_people_context = [name for name in people_context if not is_unknown_person_name(name)]
        unknown_face_count = len([name for name in people_context if is_unknown_person_name(name)])
        searchable_text = "\n\n".join(part for part in [document_text, image_ocr_text] if part)
        collection_name = get_collection_name(memory)
        collection_context = get_collection_context(memory)

        metadata_context = {
            "current_title": memory.title or "",
            "file_name": os.path.basename(media_context.get("file_name") or ""),
            "collection_name": collection_name,
            "collection_neighbors": collection_context,
            "location": memory.location or "",
            "year": memory.year or "",
            "known_people": known_people_context,
            "unknown_face_count": unknown_face_count,
            "visual_tags": visual_tags,
            "object_tags": object_tags,
            "existing_tags": memory.tags or [],
            "media_type": media_kind,
            "media_metadata": {
                "width": memory.exif_json.get("width"),
                "height": memory.exif_json.get("height"),
                "capture_date": str(memory.date or ""),
                "camera": tech_meta,
            },
            "document_text": searchable_text[:4000],
            "ocr_text": image_ocr_text[:2000],
            "processing_warnings": warnings,
        }
        prompt = (
            "You are curating a private family museum exhibit. "
            "Return only valid JSON with keys: title, description, tags, confidence. "
            "title must be specific, warm, and 3-8 words. "
            "description must be 1-2 polished sentences suitable for an exhibit label. "
            "tags must be 4-7 concise lowercase tags, each under 50 characters. "
            "Avoid generic tags such as family, memory, photo, image, person, people, vintage, outdoors, or indoors. "
            "Use collection_name and collection_neighbors as weak context only, not proof. "
            "Do not infer events, relationships, places, dates, or named people unless the context explicitly supports them. "
            "Use known_people only when present; never name unknown faces. "
            "If document_text or ocr_text is present, use only explicit contents. "
            "confidence must be an object with title, description, and tags values of high, medium, or low. "
            f"Context: {json.dumps(metadata_context, ensure_ascii=False)}"
        )

        generated_title = ""
        generated_description = ""
        generated_tags = []
        generated_confidence = {}
        try:
            ollama_res = generate_with_ollama({
                "model": settings.OLLAMA_MODEL,
                "prompt": prompt,
                "format": "json",
                "stream": False,
                "think": False,
                "options": {
                    "temperature": 0.2,
                    "num_predict": 420,
                },
            }, timeout=60)

            enrichment = parse_json_object(ollama_res.json().get("response", ""))
            generated_title = str(enrichment.get("title") or "").strip()
            generated_description = str(enrichment.get("description") or "").strip()
            generated_tags = merge_tags(enrichment.get("tags") or [], limit=MAX_AI_TAGS)
            generated_confidence = enrichment.get("confidence") or {}
            if not isinstance(generated_confidence, dict):
                generated_confidence = {}
        except requests.exceptions.RequestException as e:
            logger.warning(f"Ollama local API failed: {e}. Applying local visual tags only.")

        ai_generated_tags, ai_tag_confidence = curate_ai_tags(
            generated_tags,
            visual_tags,
            object_tags,
            known_people_context,
            memory.year,
            memory.location,
            collection_name,
            memory.tags or [],
        )
        fallback_confidence = confidence_from_context(
            known_people_context,
            searchable_text,
            collection_context,
            visual_tags,
            object_tags,
            generated_title or generated_description or ai_generated_tags,
        )
        title_confidence = normalize_confidence(generated_confidence.get("title"), fallback_confidence)
        description_confidence = normalize_confidence(generated_confidence.get("description"), fallback_confidence)
        tags_confidence = normalize_confidence(generated_confidence.get("tags"), fallback_confidence)
        memory.exif_json["ai_visual_tags"] = visual_tags
        memory.exif_json["ai_object_tags"] = object_tags
        memory.exif_json["ai_suggested_tags"] = ai_generated_tags
        memory.exif_json["ai_tag_confidence"] = ai_tag_confidence
        memory.exif_json["ai_metadata_prompt_version"] = AI_METADATA_PROMPT_VERSION
        memory.exif_json["ai_metadata_model"] = settings.OLLAMA_MODEL
        if collection_name:
            memory.exif_json["ai_collection_context"] = {
                "name": collection_name,
                "neighbors_used": len(collection_context),
            }
        if document_text:
            memory.exif_json["ai_document_text"] = document_text[:12000]
        if image_ocr_text:
            memory.exif_json["ai_ocr_text"] = image_ocr_text[:6000]
        memory.exif_json["ai_processed_frame_count"] = len(frames)
        memory.exif_json["ai_processed_text_chars"] = len(searchable_text or "")
        if warnings:
            memory.exif_json['ai_processing_warnings'] = warnings
        memory.exif_json["ai_processing_status"] = "ready" if (frames or searchable_text) else "skipped"

        if not generated_description:
            generated_description = fallback_exhibit_description(
                memory.year,
                memory.location,
                known_people_context,
                ai_generated_tags,
            )
            description_confidence = fallback_confidence

        if not generated_title:
            generated_title = fallback_exhibit_title(memory.year, memory.location, ai_generated_tags)
            title_confidence = fallback_confidence

        put_suggestion(
            memory,
            "title",
            generated_title[:255],
            confidence=title_confidence,
            rationale="Generated from confirmed people, OCR/EXIF, collection context, and visual signals.",
        )
        put_suggestion(
            memory,
            "description",
            generated_description,
            confidence=description_confidence,
            rationale="Generated from confirmed people, OCR/EXIF, collection context, and visual signals.",
        )
        put_suggestion(
            memory,
            "tags",
            ai_generated_tags,
            confidence=tags_confidence,
            rationale="Tags are limited to high-value context and observable visual matches.",
        )

        memory.exif_json = json_safe(memory.exif_json)
        memory.save()

        for member in memory.vault.members.all():
            send_web_push(
                user=member.user,
                title="Artifact Curated",
                body=f"AI has finished analyzing '{memory.title}'.",
                url="/vault"
            )

        return {"status": "READY", "memory_id": str(memory.id)}

    except Exception as e:
        logger.error(f"Failed to process memory {memory_id}: {str(e)}")
        try:
            memory = Memory.objects.get(id=memory_id)
            memory.exif_json = {
                **(memory.exif_json or {}),
                "ai_processing_status": "failed",
                "ai_processing_error": str(e)[:500],
            }
            memory.exif_json = json_safe(memory.exif_json)
            memory.save(update_fields=["exif_json"])
        except Exception:
            logger.exception(f"Could not persist AI failure state for memory {memory_id}")
        return {"status": "FAILED", "memory_id": str(memory_id), "error": str(e)}
