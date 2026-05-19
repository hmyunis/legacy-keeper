import json
import logging
import requests
from core.vapid import send_web_push
from io import BytesIO
from PIL import Image, ExifTags
import imagehash
import face_recognition
import numpy as np

from celery import shared_task
from django.conf import settings
from vaults.models import Memory
from lineage.models import Person, PersonFaceEmbedding

logger = logging.getLogger(__name__)

_clip_model = None

def get_clip_model():
    global _clip_model
    if _clip_model is None:
        from sentence_transformers import SentenceTransformer
        _clip_model = SentenceTransformer('clip-ViT-B-32')
    return _clip_model

@shared_task(bind=True, queue='high_priority')
def process_memory_task(self, memory_id):
    try:
        memory = Memory.objects.get(id=memory_id)

        image_path = memory.original_file.path if not settings.USE_MINIO else memory.original_file.url
        if settings.USE_MINIO:
            if image_path.startswith('/'):
                minio_base_url = getattr(settings, 'MINIO_PUBLIC_MEDIA_URL', 'http://localhost:9000').rstrip('/')
                image_path = f"{minio_base_url}{image_path}"
            response = requests.get(image_path)
            img = Image.open(BytesIO(response.content))
        else:
            img = Image.open(image_path)

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

        memory.exif_json = tech_meta
        memory.exif_json['width'] = img.width
        memory.exif_json['height'] = img.height
        memory.exif_json['filesize'] = memory.original_file.size

        memory.phash = str(imagehash.phash(img_rgb))

        vector = get_clip_model().encode(img_rgb).tolist()
        memory.clip_embedding = vector

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

        people_str = ", ".join(detected_people_names) if detected_people_names else "No distinct people"
        prompt = (
            f"Write a nostalgic 1-sentence caption for a family museum exhibit based on these details: "
            f"Location: {memory.location}, Year: {memory.year}, People: {people_str}, Tags: {', '.join(memory.tags)}. "
            "Keep it poetic and brief."
        )

        try:
            ollama_res = requests.post(f"{settings.OLLAMA_URL}/api/generate", json={
                "model": "llama3.1:8b",
                "prompt": prompt,
                "stream": False
            }, timeout=60)

            if ollama_res.status_code == 200:
                memory.ai_caption = ollama_res.json().get("response", "").strip()
        except requests.exceptions.RequestException as e:
            logger.warning(f"Ollama local API failed: {e}. Skipping auto-captioning.")

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