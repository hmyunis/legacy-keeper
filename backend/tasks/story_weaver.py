import logging
from celery import shared_task
from django.conf import settings
from django.db.models import Q
from tasks.ollama_client import generate_with_ollama
from lineage.models import Person, KinshipEdge
from vaults.models import Memory

logger = logging.getLogger(__name__)

@shared_task(bind=True, queue='low_priority')
def generate_chronicle_task(self, person_id):
    try:
        person = Person.objects.get(id=person_id)

        memories = Memory.objects.filter(
            Q(detected_faces__person=person) |
            Q(title__icontains=person.name) |
            Q(tags__contains=[person.name])
        ).distinct().order_by('year')

        kin_links = KinshipEdge.objects.filter(Q(from_person=person) | Q(to_person=person))
        family_context = []
        for edge in kin_links:
            rel = edge.to_person if edge.from_person == person else edge.from_person
            family_context.append(f"{rel.name} ({edge.relationship_type})")

        event_list = [f"In {m.year or 'an unknown year'} at {m.location}: {m.ai_caption}" for m in memories]

        if not event_list:
            prompt = (
                f"Write a 2-paragraph speculative biography for {person.name}, a member of the family lineage. "
                f"Focus on the mystery of time and the importance of preserving names. "
                f"Context: Family includes {', '.join(family_context)}."
            )
        else:
            prompt = (
                f"Write a moving, 4-paragraph biographical chronicle for {person.name}. "
                f"Timeline of events: {' | '.join(event_list)}. "
                f"Important family members mentioned: {', '.join(family_context)}. "
                "The tone must be museum-quality, warm, and prestigious. Do not use corporate filler words."
            )

        ollama_res = generate_with_ollama({
            "model": settings.OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False
        }, timeout=90)

        person = Person.objects.get(id=person_id)
        person.biography = ollama_res.json().get("response", "").strip()
        person.active_story_task_id = None
        person.save()
        return {"status": "READY", "person_id": str(person.id)}

    except Exception as e:
        try:
            person = Person.objects.get(id=person_id)
            person.active_story_task_id = None
            person.save()
        except:
            pass
        logger.error(f"Failed to generate chronicle for person {person_id}: {str(e)}")
        raise e
