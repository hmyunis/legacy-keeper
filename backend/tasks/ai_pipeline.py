import json
import logging
import re
import requests
from core.vapid import send_web_push
from io import BytesIO
from PIL import Image, ExifTags
import imagehash
import face_recognition
import numpy as np

from celery import shared_task
from django.conf import settings
from django.utils import timezone
from tasks.ollama_client import generate_with_ollama
from vaults.models import Memory
from lineage.models import Person, PersonFaceEmbedding

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


def build_suggestion(memory, field, value):
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
        "generated_at": timezone.now().isoformat(),
        "decided_at": existing.get("decided_at") if status != 'pending' else None,
        "decided_by": existing.get("decided_by") if status != 'pending' else None,
    }


def put_suggestion(memory, field, value):
    suggestion = build_suggestion(memory, field, value)
    if not suggestion:
        return

    suggestions = dict(memory.ai_suggestions or {})
    suggestions[field] = suggestion
    memory.ai_suggestions = suggestions

@shared_task(bind=True, queue='high_priority', name='tasks.ai_pipeline.process_memory_task')
def process_memory_task(self, memory_id):
    try:
        memory = Memory.objects.get(id=memory_id)
        previous_exif = memory.exif_json or {}

        image_path = memory.original_file.path if not settings.USE_MINIO else memory.original_file.url
        if settings.USE_MINIO:
            if image_path.startswith('/'):
                minio_base_url = getattr(settings, 'MINIO_PUBLIC_MEDIA_URL', 'http://localhost:9000').rstrip('/')
                image_path = f"{minio_base_url}{image_path}"
            response = requests.get(image_path)
            img = Image.open(BytesIO(response.content))
        else:
            img = Image.open(image_path)

        is_grayscale = img.mode == 'L'
        img_rgb = img.convert('RGB')
        np_img = np.array(img_rgb)

        exif_data = img._getexif()
        extracted_year = ""
        tech_meta = {}
        if exif_data:
            for tag, value in exif_data.items():
                decoded = ExifTags.TAGS.get(tag, tag)
                if decoded == "DateTimeOriginal" and isinstance(value, str):
                    extracted_year = value[:4]
                    memory.year = extracted_year
                if decoded in ["Make", "Model", "LensModel", "ExposureTime", "FNumber"]:
                    tech_meta[decoded] = str(value)

        previous_ai_meta = {
            key: value for key, value in previous_exif.items()
            if key.startswith("ai_")
        }
        memory.exif_json = {**previous_ai_meta, **tech_meta}
        memory.exif_json['width'] = img.width
        memory.exif_json['height'] = img.height
        memory.exif_json['filesize'] = memory.original_file.size

        memory.phash = str(imagehash.phash(img_rgb))

        clip_model = get_clip_model()
        vector = clip_model.encode(img_rgb).tolist()
        memory.clip_embedding = vector
        visual_tags = infer_visual_tags(clip_model, img, vector)

        previous_unknowns = [
            face.person for face in memory.detected_faces.select_related('person').all()
            if face.person.name.startswith("Unknown Kin")
        ]
        memory.detected_faces.all().delete()
        for person in previous_unknowns:
            if person.face_embeddings.count() == 0:
                person.delete()

        face_locations = face_recognition.face_locations(np_img)
        face_encodings = face_recognition.face_encodings(np_img, face_locations)

        detected_people_names = []

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
                PersonFaceEmbedding.objects.create(
                    person=new_person,
                    memory=memory,
                    bounding_box=location,
                    embedding_vector=encoding.tolist()
                )
                detected_people_names.append(new_person.name)

        if is_grayscale:
            visual_tags = merge_tags(visual_tags, ["black and white"], limit=7)

        manual_people_names = list(memory.identified_people.values_list('name', flat=True))
        people_context = merge_tags(detected_people_names, manual_people_names, limit=30)

        metadata_context = {
            "current_title": memory.title or "",
            "location": memory.location or "",
            "year": memory.year or "",
            "people": people_context,
            "visual_tags": visual_tags,
            "existing_tags": memory.tags or [],
        }
        prompt = (
            "You are curating a private family museum exhibit. "
            "Return only valid JSON with keys: title, description, tags. "
            "title must be specific, warm, and 3-8 words. "
            "description must be 1-2 polished sentences suitable for an exhibit label. "
            "tags must be 5-10 concise lowercase tags, each under 50 characters. "
            "Do not invent named people. Use the known people list only if present. "
            f"Context: {json.dumps(metadata_context, ensure_ascii=False)}"
        )

        generated_title = ""
        generated_description = ""
        generated_tags = []
        try:
            ollama_res = generate_with_ollama({
                "model": settings.OLLAMA_MODEL,
                "prompt": prompt,
                "format": "json",
                "stream": False,
                "think": False,
                "options": {
                    "temperature": 0.2,
                    "num_predict": 500,
                },
            }, timeout=60)

            enrichment = parse_json_object(ollama_res.json().get("response", ""))
            generated_title = str(enrichment.get("title") or "").strip()
            generated_description = str(enrichment.get("description") or "").strip()
            generated_tags = enrichment.get("tags") or []
        except requests.exceptions.RequestException as e:
            logger.warning(f"Ollama local API failed: {e}. Applying local visual tags only.")

        ai_generated_tags = merge_tags(visual_tags, generated_tags)
        memory.exif_json["ai_visual_tags"] = visual_tags
        memory.exif_json["ai_suggested_tags"] = ai_generated_tags

        if not generated_description:
            generated_description = fallback_exhibit_description(
                memory.year,
                memory.location,
                detected_people_names,
                ai_generated_tags,
            )

        if not generated_title:
            generated_title = fallback_exhibit_title(memory.year, memory.location, ai_generated_tags)

        put_suggestion(memory, "title", generated_title[:255])
        put_suggestion(memory, "description", generated_description)
        put_suggestion(memory, "tags", ai_generated_tags)

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
        raise e
