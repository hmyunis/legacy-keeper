import logging
import math
import re
import unicodedata
from difflib import SequenceMatcher
from io import BytesIO

import requests
from celery import shared_task
from django.conf import settings

from vaults.models import Memory
from vaults.serializers import MemorySerializer
from vaults import search_ranking as search_ranker
from tasks.ai_pipeline import get_clip_model

logger = logging.getLogger(__name__)

try:
    from PyPDF2 import PdfReader
except Exception:  # pragma: no cover - optional dependency fallback
    PdfReader = None

_SEARCH_STOPWORDS = {
    'a', 'an', 'and', 'around', 'at', 'be', 'before', 'during', 'for', 'from', 'in',
    'into', 'is', 'it', 'of', 'on', 'or', 'over', 'that', 'the', 'their', 'there',
    'this', 'to', 'with', 'without', 'year', 'years', 'old', 'photo', 'photos', 'picture',
    'image', 'images', 'memory', 'memories', 'document', 'documents', 'file', 'files',
}

_KNOWN_MEDIA_TEXT_KEYS = (
    'ai_document_text',
    'ai_caption',
    'human_caption',
)


def normalize_search_text(value):
    raw = unicodedata.normalize('NFKD', str(value or ''))
    stripped = ''.join(ch for ch in raw if not unicodedata.combining(ch))
    return re.sub(r'[^a-z0-9]+', ' ', stripped.lower()).strip()


def tokenize_search_query(query):
    normalized_query = str(query or '').strip()
    quoted_matches = [match.strip() for match in re.findall(r'"([^"]+)"', normalized_query)]
    quoted_phrases = [normalize_search_text(match) for match in quoted_matches]
    cleaned_query = re.sub(r'"[^"]+"', ' ', normalized_query)
    normalized = normalize_search_text(cleaned_query)
    tokens = [token for token in normalized.split() if len(token) > 1 and token not in _SEARCH_STOPWORDS]

    years = sorted(set(re.findall(r'\b((?:18|19|20)\d{2})\b', normalized_query)))
    decades = []
    for match in re.findall(r'\b((?:18|19|20)\d{2})s\b', normalized_query, flags=re.IGNORECASE):
        decades.append(f"{match[:3]}0s")
    for match in re.findall(r'\b(\d{2})s\b', normalized_query):
        if match.isdigit():
            decades.append(f"19{match}0s")

    return {
        'raw': normalized_query,
        'normalized': normalized,
        'tokens': tokens,
        'phrases': [phrase for phrase in quoted_phrases if phrase],
        'phrase_terms': [phrase for phrase in quoted_matches if phrase],
        'years': years,
        'decades': sorted(set(decades)),
    }


def cosine_similarity(a, b):
    if not a or not b:
        return 0.0

    numerator = 0.0
    a_norm = 0.0
    b_norm = 0.0
    for left, right in zip(a, b):
        numerator += left * right
        a_norm += left * left
        b_norm += right * right

    if not a_norm or not b_norm:
        return 0.0

    return float(numerator / math.sqrt(a_norm * b_norm))


def get_memory_people_names(memory):
    names = []
    seen = set()
    for face in memory.detected_faces.all():
        if face.person_id and str(face.person_id) not in seen:
            seen.add(str(face.person_id))
            names.append(face.person.name)
    for person in memory.identified_people.all():
        if str(person.id) not in seen:
            seen.add(str(person.id))
            names.append(person.name)
    return names


def fetch_memory_bytes(memory):
    if settings.USE_MINIO:
        file_url = memory.original_file.url
        if file_url.startswith('/'):
            minio_base_url = getattr(settings, 'MINIO_PUBLIC_MEDIA_URL', 'http://localhost:9000').rstrip('/')
            file_url = f"{minio_base_url}{file_url}"
        response = requests.get(file_url, timeout=30)
        response.raise_for_status()
        return BytesIO(response.content)

    try:
        with memory.original_file.open('rb') as handle:
            return BytesIO(handle.read())
    except Exception:
        return None


def extract_pdf_text(memory):
    cached = (memory.exif_json or {}).get('ai_document_text')
    if cached:
        return str(cached)

    if PdfReader is None:
        return ''

    file_name = getattr(memory.original_file, 'name', '') or ''
    if not file_name.lower().endswith('.pdf'):
        return ''

    source = fetch_memory_bytes(memory)
    if source is None:
        return ''

    try:
        source.seek(0)
        reader = PdfReader(source)
    except Exception as exc:
        logger.warning("Could not open PDF for deep search on memory %s: %s", memory.id, exc)
        return ''

    chunks = []
    for page in reader.pages[:50]:
        try:
            page_text = (page.extract_text() or '').strip()
            if page_text:
                chunks.append(page_text)
        except Exception as exc:
            logger.warning("Could not extract PDF text for memory %s: %s", memory.id, exc)

    return "\n\n".join(chunks)[:12000]


def build_deep_memory_blob(memory):
    people = get_memory_people_names(memory)
    exif = memory.exif_json or {}
    text_parts = [
        memory.title or '',
        memory.location or '',
        memory.year or '',
        memory.cluster_name or '',
        memory.ai_caption or '',
        memory.human_caption or '',
        ' '.join(memory.tags or []),
        ' '.join(people),
        ' '.join(exif.get('ai_visual_tags') or []),
        ' '.join(exif.get('ai_object_tags') or []),
        ' '.join(exif.get('ai_suggested_tags') or []),
        str(exif.get('ai_document_text') or ''),
        str(exif.get('ai_ocr_text') or ''),
    ]
    if (exif.get('ai_media_type') or '').lower() == 'pdf':
        text_parts.append(extract_pdf_text(memory))
    return normalize_search_text(' '.join(text_parts))


def score_memory_for_query(memory, query_parts, query_vector=None, search_blob=None):
    blob = search_blob or build_deep_memory_blob(memory)
    normalized_query = query_parts['normalized']
    query_tokens = query_parts['tokens']
    query_token_count = len(query_tokens) or 1

    lexical_score = 0.0
    field_weights = [
        (memory.title or '', 2.8),
        (memory.human_caption or '', 2.2),
        (memory.ai_caption or '', 1.8),
        ((memory.exif_json or {}).get('ai_document_text') or '', 2.6),
        (memory.location or '', 1.3),
        (memory.cluster_name or '', 0.9),
        (' '.join(memory.tags or []), 1.9),
        (memory.year or '', 1.7),
        (' '.join((memory.exif_json or {}).get('ai_object_tags') or []), 2.0),
        (' '.join((memory.exif_json or {}).get('ai_visual_tags') or []), 1.2),
        (' '.join((memory.exif_json or {}).get('ai_suggested_tags') or []), 1.0),
        ((memory.exif_json or {}).get('ai_ocr_text') or '', 2.4),
    ]

    people_blob = ' '.join(get_memory_people_names(memory))
    if people_blob:
        field_weights.append((people_blob, 2.0))

    query_token_set = set(query_tokens)
    for field_text, weight in field_weights:
        if not field_text:
            continue
        normalized_field = normalize_search_text(field_text)
        field_tokens = set(normalized_field.split())
        overlap = len(query_token_set & field_tokens)
        if overlap:
            lexical_score += weight * (overlap / query_token_count)

        if normalized_query and normalized_query in normalized_field:
            lexical_score += weight * 0.45

        if normalized_query and normalized_field:
            ratio = SequenceMatcher(None, normalized_query, normalized_field).ratio()
            if ratio >= 0.72:
                lexical_score += weight * ratio * 0.25

    for year in query_parts['years']:
        if memory.year == year:
            lexical_score += 1.8
        elif memory.date and str(memory.date.year) == year:
            lexical_score += 1.2

    for decade in query_parts['decades']:
        if memory.year and memory.year.startswith(decade[:3]):
            lexical_score += 1.4
        elif memory.date and str(memory.date.year).startswith(decade[:3]):
            lexical_score += 1.0

    for phrase in query_parts['phrases']:
        if phrase and phrase in blob:
            lexical_score += 1.7

    semantic_score = 0.0
    if query_vector is not None and memory.clip_embedding is not None:
        semantic_score = max(cosine_similarity(query_vector, list(memory.clip_embedding)), 0.0)

    if query_vector is not None and query_tokens:
        semantic_weight = 0.6
        lexical_weight = 0.4
    elif query_vector is not None:
        semantic_weight = 0.72
        lexical_weight = 0.28
    else:
        semantic_weight = 0.0
        lexical_weight = 1.0

    score = float((semantic_score * semantic_weight) + ((min(lexical_score, 7.0) / 7.0) * lexical_weight))
    if query_parts['phrases']:
        score += 0.05
    if query_parts['years'] or query_parts['decades']:
        score += 0.05

    return float(score)


def explain_memory_match(memory, query_parts, query_vector=None, search_blob=None):
    reasons = []
    seen = set()
    blob = search_blob or build_deep_memory_blob(memory)
    exif = memory.exif_json or {}

    def add_reason(reason):
        if reason and reason not in seen and len(reasons) < 5:
            seen.add(reason)
            reasons.append(reason)

    def maybe_add_field_reason(label, field_text, query_tokens, exact_phrase=None):
        if not field_text:
            return
        normalized_field = normalize_search_text(field_text)
        field_tokens = set(normalized_field.split())
        overlaps = [token for token in query_tokens if token in field_tokens]
        if overlaps:
            add_reason(f"{label}: {', '.join(overlaps[:2])}")
        elif exact_phrase and exact_phrase in normalized_field:
            add_reason(f"{label} match")

    normalized_query = query_parts['normalized']
    query_tokens = query_parts['tokens']
    phrase_terms = query_parts.get('phrase_terms', [])

    maybe_add_field_reason('Title', memory.title, query_tokens, normalized_query)
    maybe_add_field_reason('Location', memory.location, query_tokens, normalized_query)
    maybe_add_field_reason('Caption', memory.human_caption or memory.ai_caption, query_tokens, normalized_query)
    maybe_add_field_reason('Tag', ' '.join(memory.tags or []), query_tokens, normalized_query)
    maybe_add_field_reason('Year', memory.year, query_tokens, normalized_query)
    maybe_add_field_reason('Document text', exif.get('ai_document_text') or '', query_tokens, normalized_query)
    maybe_add_field_reason('Image text', exif.get('ai_ocr_text') or '', query_tokens, normalized_query)
    maybe_add_field_reason('Object', ' '.join(exif.get('ai_object_tags') or []), query_tokens, normalized_query)
    maybe_add_field_reason('Visual tags', ' '.join(exif.get('ai_visual_tags') or []), query_tokens, normalized_query)
    maybe_add_field_reason('Suggested tags', ' '.join(exif.get('ai_suggested_tags') or []), query_tokens, normalized_query)
    maybe_add_field_reason('Name', ' '.join(get_memory_people_names(memory)), query_tokens, normalized_query)

    for year in query_parts['years']:
        if memory.year == year or (memory.date and str(memory.date.year) == year):
            add_reason(f"Year: {year}")

    for decade in query_parts['decades']:
        if memory.year and memory.year.startswith(decade[:3]):
            add_reason(f"Decade: {decade}")
        elif memory.date and str(memory.date.year).startswith(decade[:3]):
            add_reason(f"Decade: {decade}")

    for phrase in phrase_terms:
        normalized_phrase = normalize_search_text(phrase)
        if normalized_phrase and normalized_phrase in blob:
            add_reason(f'Phrase: "{phrase}"')

    semantic_score = 0.0
    if query_vector is not None and memory.clip_embedding is not None:
        semantic_score = max(cosine_similarity(query_vector, list(memory.clip_embedding)), 0.0)
    if semantic_score >= 0.22 or (not reasons and semantic_score > 0):
        add_reason('Semantic similarity')

    if not reasons:
        add_reason('Lexical relevance')

    return reasons


@shared_task(bind=True, queue='high_priority', name='tasks.search.deep_search_vault_task')
def deep_search_vault_task(self, vault_id, query):
    query = (query or '').strip()
    query_parts = search_ranker.tokenize_search_query(query)
    self.update_state(state='PROGRESS', meta={'progress': 3, 'stage': 'Preparing deep search'})

    query_vector = None
    if query:
        try:
            query_vector = get_clip_model().encode(query).tolist()
        except Exception as exc:
            logger.warning("Deep search query embedding failed for vault %s: %s", vault_id, exc)

    memories = list(
        Memory.objects.visible_to_vault(vault_id).prefetch_related(
            'detected_faces__person',
            'identified_people',
        )
    )

    total = max(len(memories), 1)
    scored = []
    for index, memory in enumerate(memories, start=1):
        if index == 1 or index % 5 == 0 or index == total:
            progress = min(95, 5 + int((index / total) * 85))
            self.update_state(
                state='PROGRESS',
                meta={
                    'progress': progress,
                    'stage': f'Scanning memory {index} of {total}',
                }
            )

        blob = build_deep_memory_blob(memory)
        item = search_ranker.score_memory(memory, query_parts, query_vector, search_blob=blob)
        if item.base_score <= 0.02:
            continue
        scored.append(item)

    ranked = search_ranker.rerank_scored_memories(scored, query_parts, query_vector, limit=20, rerank_pool_size=80)

    payload = []
    for hit in ranked:
        row = MemorySerializer(hit.memory).data
        row['searchScore'] = float(round(float(hit.final_score), 4))
        row['searchReasons'] = hit.reasons or []
        payload.append(row)

    return {
        'query': query,
        'deep': True,
        'count': len(payload),
        'results': payload,
    }
