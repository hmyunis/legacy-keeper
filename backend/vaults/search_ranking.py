import logging
import math
import re
import unicodedata
from dataclasses import dataclass
from difflib import SequenceMatcher

from django.db.models import Q
from pgvector.django import CosineDistance

from vaults.models import Memory

logger = logging.getLogger(__name__)

_SEARCH_STOPWORDS = {
    'a', 'an', 'and', 'around', 'at', 'be', 'before', 'during', 'for', 'from', 'in',
    'into', 'is', 'it', 'of', 'on', 'or', 'over', 'that', 'the', 'their', 'there',
    'this', 'to', 'with', 'without', 'year', 'years', 'old', 'photo', 'photos', 'picture',
    'image', 'images', 'memory', 'memories', 'document', 'documents', 'file', 'files',
}

_SEARCH_SYNONYMS = {
    'dad': {'father', 'daddy', 'papa'},
    'mom': {'mother', 'mama', 'momma'},
    'grandma': {'grandmother', 'nana', 'nan'},
    'grandpa': {'grandfather', 'papa'},
    'kids': {'children', 'child', 'kid'},
    'baby': {'infant', 'newborn'},
    'car': {'vehicle', 'automobile'},
    'home': {'house', 'household', 'residence'},
    'wedding': {'marriage', 'married'},
    'birthday': {'bday', 'birth day'},
    'school': {'class', 'college', 'university'},
    'work': {'job', 'office'},
    'pet': {'dog', 'cat', 'animal'},
    'vacation': {'holiday', 'trip', 'travel'},
    'beach': {'shore', 'coast'},
    'party': {'celebration', 'gathering'},
}


def normalize_search_text(value):
    raw = unicodedata.normalize('NFKD', str(value or ''))
    stripped = ''.join(ch for ch in raw if not unicodedata.combining(ch))
    return re.sub(r'[^a-z0-9]+', ' ', stripped.lower()).strip()


def _expand_query_tokens(tokens):
    expanded = []
    seen = set()
    for token in tokens:
        if token in seen:
            continue
        seen.add(token)
        expanded.append(token)
        for synonym in _SEARCH_SYNONYMS.get(token, set()):
            normalized_synonym = normalize_search_text(synonym)
            if normalized_synonym and normalized_synonym not in seen:
                seen.add(normalized_synonym)
                expanded.append(normalized_synonym)
    return expanded


def tokenize_search_query(query):
    normalized_query = str(query or '').strip()
    quoted_matches = [match.strip() for match in re.findall(r'"([^"]+)"', normalized_query)]
    quoted_phrases = [normalize_search_text(match) for match in quoted_matches]
    cleaned_query = re.sub(r'"[^"]+"', ' ', normalized_query)
    normalized = normalize_search_text(cleaned_query)
    tokens = [token for token in normalized.split() if len(token) > 1 and token not in _SEARCH_STOPWORDS]
    expanded_tokens = _expand_query_tokens(tokens)

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
        'expanded_tokens': expanded_tokens,
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
        numerator += float(left) * float(right)
        a_norm += float(left) * float(left)
        b_norm += float(right) * float(right)

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


def build_search_blob(memory):
    exif = memory.exif_json or {}
    text_parts = [
        memory.title or '',
        memory.location or '',
        memory.year or '',
        memory.cluster_name or '',
        memory.ai_caption or '',
        memory.human_caption or '',
        ' '.join(memory.tags or []),
        ' '.join(get_memory_people_names(memory)),
        ' '.join(exif.get('ai_visual_tags') or []),
        ' '.join(exif.get('ai_object_tags') or []),
        ' '.join(exif.get('ai_suggested_tags') or []),
        str(exif.get('ai_document_text') or ''),
        str(exif.get('ai_ocr_text') or ''),
    ]
    return normalize_search_text(' '.join(text_parts))


def build_search_document(memory):
    exif = memory.exif_json or {}
    people = ', '.join(get_memory_people_names(memory))
    text_parts = [
        f"Title: {memory.title or ''}",
        f"Location: {memory.location or ''}",
        f"Year: {memory.year or ''}",
        f"Cluster: {memory.cluster_name or ''}",
        f"Tags: {', '.join(memory.tags or [])}",
        f"People: {people}",
        f"Human caption: {memory.human_caption or ''}",
        f"AI caption: {memory.ai_caption or ''}",
        f"Object tags: {', '.join(exif.get('ai_object_tags') or [])}",
        f"Visual tags: {', '.join(exif.get('ai_visual_tags') or [])}",
        f"Suggested tags: {', '.join(exif.get('ai_suggested_tags') or [])}",
        f"OCR text: {exif.get('ai_ocr_text') or ''}",
        f"Document text: {exif.get('ai_document_text') or ''}",
    ]
    return '\n'.join(part for part in text_parts if part.strip())


def build_search_queryset(base_qs, query_parts):
    lexical_q = Q()
    tokens = (query_parts.get('expanded_tokens') or query_parts.get('tokens') or [])[:10]
    phrases = query_parts['phrases'][:4]

    for token in tokens:
        lexical_q |= (
            Q(title__icontains=token) |
            Q(ai_caption__icontains=token) |
            Q(human_caption__icontains=token) |
            Q(location__icontains=token) |
            Q(cluster_name__icontains=token) |
            Q(year__icontains=token) |
            Q(tags__icontains=token) |
            Q(exif_json__ai_visual_tags__icontains=token) |
            Q(exif_json__ai_object_tags__icontains=token) |
            Q(exif_json__ai_ocr_text__icontains=token) |
            Q(identified_people__name__icontains=token) |
            Q(detected_faces__person__name__icontains=token)
        )

    for phrase in phrases:
        lexical_q |= (
            Q(title__icontains=phrase) |
            Q(ai_caption__icontains=phrase) |
            Q(human_caption__icontains=phrase) |
            Q(location__icontains=phrase) |
            Q(cluster_name__icontains=phrase) |
            Q(tags__icontains=phrase) |
            Q(exif_json__ai_visual_tags__icontains=phrase) |
            Q(exif_json__ai_object_tags__icontains=phrase) |
            Q(exif_json__ai_ocr_text__icontains=phrase) |
            Q(identified_people__name__icontains=phrase) |
            Q(detected_faces__person__name__icontains=phrase)
        )

    for year in query_parts['years']:
        lexical_q |= Q(year=year) | Q(date__year=year)

    for decade in query_parts['decades']:
        lexical_q |= Q(year__startswith=decade[:3])

    if not lexical_q:
        return base_qs.none()

    return base_qs.filter(lexical_q).distinct()


def get_search_candidate_ids(base_qs, query_parts, query_vector=None, semantic_limit=80, lexical_limit=80, candidate_limit=160):
    semantic_ids = []
    semantic_qs = base_qs.exclude(clip_embedding__isnull=True)
    if query_vector is not None and semantic_qs.exists():
        semantic_ids = list(
            semantic_qs.order_by(CosineDistance('clip_embedding', query_vector))
            .values_list('id', flat=True)[:semantic_limit]
        )

    lexical_ids = []
    if query_parts.get('tokens') or query_parts.get('phrases') or query_parts.get('years') or query_parts.get('decades'):
        lexical_ids = list(
            build_search_queryset(base_qs, query_parts)
            .values_list('id', flat=True)[:lexical_limit]
        )

    candidate_ids = list(dict.fromkeys([*semantic_ids, *lexical_ids]))
    if not candidate_ids:
        candidate_ids = list(semantic_ids[:candidate_limit] or lexical_ids[:candidate_limit])

    return candidate_ids[:candidate_limit]


def _normalize_score_series(values):
    series = [float(value) for value in values if value is not None]
    if not series:
        return []
    if len(series) == 1:
        return [1.0]

    minimum = min(series)
    maximum = max(series)
    if math.isclose(minimum, maximum):
        return [0.5 for _ in series]
    return [(value - minimum) / (maximum - minimum) for value in series]


def get_search_reranker():
    if hasattr(get_search_reranker, '_cached_model'):
        return getattr(get_search_reranker, '_cached_model')

    try:
        from sentence_transformers import CrossEncoder
    except Exception as exc:  # pragma: no cover - import level fallback
        logger.warning('CrossEncoder unavailable for search reranking: %s', exc)
        return None

    model_name = 'cross-encoder/ms-marco-MiniLM-L-6-v2'
    try:
        model = CrossEncoder(model_name)
        setattr(get_search_reranker, '_cached_model', model)
        return model
    except Exception as exc:  # pragma: no cover - model load fallback
        logger.warning('Could not load search reranker model %s: %s', model_name, exc)
        return None


@dataclass
class ScoredMemory:
    memory: Memory
    base_score: float
    lexical_score: float
    semantic_score: float
    search_blob: str
    final_score: float = 0.0
    rerank_score: float | None = None
    reasons: list[str] | None = None


def score_memory(memory, query_parts, query_vector=None, search_blob=None):
    blob = search_blob or build_search_blob(memory)
    normalized_query = query_parts['normalized']
    query_tokens = query_parts.get('expanded_tokens') or query_parts.get('tokens') or []
    query_token_count = len(query_tokens) or 1

    lexical_score = 0.0
    field_weights = [
        (memory.title or '', 3.0),
        (memory.human_caption or '', 2.5),
        (memory.ai_caption or '', 2.1),
        ((memory.exif_json or {}).get('ai_document_text') or '', 2.8),
        ((memory.exif_json or {}).get('ai_ocr_text') or '', 2.8),
        (' '.join((memory.exif_json or {}).get('ai_object_tags') or []), 2.4),
        (' '.join((memory.exif_json or {}).get('ai_visual_tags') or []), 1.4),
        (' '.join((memory.exif_json or {}).get('ai_suggested_tags') or []), 1.1),
        (' '.join(memory.tags or []), 2.0),
        (memory.location or '', 1.5),
        (memory.cluster_name or '', 1.0),
        (memory.year or '', 1.7),
    ]

    people_blob = ' '.join(get_memory_people_names(memory))
    if people_blob:
        field_weights.append((people_blob, 2.3))

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
            lexical_score += weight * 0.5

        if normalized_query and normalized_field:
            ratio = SequenceMatcher(None, normalized_query, normalized_field).ratio()
            if ratio >= 0.72:
                lexical_score += weight * ratio * 0.3

    for year in query_parts['years']:
        if memory.year == year:
            lexical_score += 2.0
        elif memory.date and str(memory.date.year) == year:
            lexical_score += 1.3

    for decade in query_parts['decades']:
        if memory.year and memory.year.startswith(decade[:3]):
            lexical_score += 1.5
        elif memory.date and str(memory.date.year).startswith(decade[:3]):
            lexical_score += 1.1

    for phrase in query_parts['phrases']:
        if phrase and phrase in blob:
            lexical_score += 2.0

    semantic_score = 0.0
    if query_vector is not None and memory.clip_embedding is not None:
        semantic_score = max(cosine_similarity(query_vector, list(memory.clip_embedding)), 0.0)

    if query_vector is not None and query_tokens:
        semantic_weight = 0.48
        lexical_weight = 0.52
    elif query_vector is not None:
        semantic_weight = 0.6
        lexical_weight = 0.4
    else:
        semantic_weight = 0.0
        lexical_weight = 1.0

    base_score = float((semantic_score * semantic_weight) + ((min(lexical_score, 10.0) / 10.0) * lexical_weight))
    if query_parts['phrases']:
        base_score += 0.06
    if query_parts['years'] or query_parts['decades']:
        base_score += 0.05

    return ScoredMemory(
        memory=memory,
        base_score=float(base_score),
        lexical_score=float(lexical_score),
        semantic_score=float(semantic_score),
        search_blob=blob,
        final_score=float(base_score),
    )


def explain_memory_match(memory, query_parts, query_vector=None, search_blob=None, rerank_score=None):
    reasons = []
    seen = set()
    blob = search_blob or build_search_blob(memory)
    exif = memory.exif_json or {}

    def add_reason(reason):
        if reason and reason not in seen and len(reasons) < 6:
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
    query_tokens = query_parts.get('expanded_tokens') or query_parts.get('tokens') or []
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

    if rerank_score is not None:
        if rerank_score >= 0.7:
            add_reason('Contextual relevance')
        elif rerank_score >= 0.5 and not reasons:
            add_reason('Contextual relevance')

    semantic_score = 0.0
    if query_vector is not None and memory.clip_embedding is not None:
        semantic_score = max(cosine_similarity(query_vector, list(memory.clip_embedding)), 0.0)
    if semantic_score >= 0.22 or (not reasons and semantic_score > 0):
        add_reason('Semantic similarity')

    if not reasons:
        add_reason('Lexical relevance')

    return reasons


def rerank_scored_memories(scored_memories, query_parts, query_vector=None, limit=20, rerank_pool_size=80):
    candidates = [item for item in scored_memories if item.base_score > 0.02]
    if not candidates:
        return []

    candidates.sort(key=lambda item: (item.base_score, item.memory.created_at), reverse=True)
    pool = candidates[:max(limit, rerank_pool_size)]

    reranker = get_search_reranker()
    if reranker is not None and len(pool) > 1:
        try:
            pairs = [(query_parts['raw'], build_search_document(item.memory)) for item in pool]
            raw_scores = reranker.predict(pairs)
            normalized_scores = _normalize_score_series(raw_scores)
            for item, rerank_score in zip(pool, normalized_scores):
                item.rerank_score = float(rerank_score)
                item.final_score = float((item.base_score * 0.58) + (item.rerank_score * 0.42))
        except Exception as exc:  # pragma: no cover - model fallback
            logger.warning('Search reranking failed, falling back to base scores: %s', exc)
            for item in pool:
                item.rerank_score = None
                item.final_score = float(item.base_score)
    else:
        for item in pool:
            item.rerank_score = None
            item.final_score = float(item.base_score)

    pool.sort(key=lambda item: (item.final_score, item.memory.created_at), reverse=True)
    top_hits = pool[:limit]

    for item in top_hits:
        item.reasons = explain_memory_match(
            item.memory,
            query_parts,
            query_vector,
            search_blob=item.search_blob,
            rerank_score=item.rerank_score,
        )

    return top_hits
