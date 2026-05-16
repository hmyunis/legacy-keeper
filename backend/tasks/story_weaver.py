import logging
import requests
from celery import shared_task
from lineage.models import Person
from vaults.models import Memory

logger = logging.getLogger(__name__)

@shared_task(bind=True, queue='low_priority')
def generate_chronicle_task(self, person_id):
    try:
        person = Person.objects.get(id=person_id)

        memories = Memory.objects.filter(detected_faces__person=person).order_by('year')

        event_list = []
        for mem in memories:
            event_list.append(f"In {mem.year or 'an unknown year'} at {mem.location}: {mem.ai_caption}")

        events_str = " | ".join(event_list)

        prompt = (
            f"Write a moving, 4-paragraph biographical chronicle for {person.name}, "
            f"born in {person.birth_year or 'unknown'}, passed in {person.death_year or 'unknown'}. "
            f"Use these events from their life: {events_str}. "
            "Focus on family resilience, warmth, and legacy. Do not use generic filler."
        )

        ollama_res = requests.post('http://localhost:11434/api/generate', json={
            "model": "llama3.1:8b",
            "prompt": prompt,
            "stream": False
        }, timeout=60)

        if ollama_res.status_code == 200:
            person.biography = ollama_res.json().get("response", "").strip()
            person.save()
            return {"status": "READY", "person_id": str(person.id)}
        else:
            raise Exception(f"Ollama returned {ollama_res.status_code}")

    except Exception as e:
        logger.error(f"Failed to generate chronicle for person {person_id}: {str(e)}")
        raise e