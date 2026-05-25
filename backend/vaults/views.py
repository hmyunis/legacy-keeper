import datetime
import logging
import math
import random
import re
import unicodedata
from difflib import SequenceMatcher
from rest_framework import generics, views, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from django.utils import timezone
from pgvector.django import CosineDistance

from .models import Memory, Capsule, MemoryCollection
from core.models import VaultMember, ActionLog, get_accessible_vault_ids
from lineage.models import Person
from .serializers import MemorySerializer, CapsuleSerializer, MemoryCollectionSerializer
from django.db.models import Q, Count, F
from . import search_ranking as search_ranker
from rest_framework.pagination import PageNumberPagination

_clip_model = None
logger = logging.getLogger(__name__)
_SEARCH_STOPWORDS = {
    'a', 'an', 'and', 'around', 'at', 'be', 'before', 'during', 'for', 'from', 'in',
    'into', 'is', 'it', 'of', 'on', 'or', 'over', 'that', 'the', 'their', 'there',
    'this', 'to', 'with', 'without', 'year', 'years', 'old', 'photo', 'photos', 'picture',
    'image', 'images', 'memory', 'memories'
}

def get_clip_model():
    global _clip_model
    if _clip_model is None:
        try:
            from sentence_transformers import SentenceTransformer
            _clip_model = SentenceTransformer('clip-ViT-B-32')
        except Exception as exc:
            logger.warning("CLIP search model unavailable; falling back to lexical search only: %s", exc)
            return None
    return _clip_model

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

def get_memory_search_blob(memory):
    people = []
    seen = set()
    for face in memory.detected_faces.all():
        if face.person_id and str(face.person_id) not in seen:
            seen.add(str(face.person_id))
            people.append(face.person.name)
    for person in memory.identified_people.all():
        if str(person.id) not in seen:
            seen.add(str(person.id))
            people.append(person.name)

    return normalize_search_text(
        ' '.join([
            memory.title or '',
            memory.location or '',
            memory.year or '',
            memory.cluster_name or '',
            memory.ai_caption or '',
            memory.human_caption or '',
            ' '.join(memory.tags or []),
            ' '.join((memory.exif_json or {}).get('ai_visual_tags') or []),
            ' '.join((memory.exif_json or {}).get('ai_object_tags') or []),
            str((memory.exif_json or {}).get('ai_ocr_text') or ''),
            ' '.join(people),
        ])
    )

def build_search_queryset(base_qs, query_parts):
    lexical_q = Q()
    tokens = query_parts['tokens'][:8]
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

def score_memory_for_query(memory, query_parts, query_vector=None):
    search_blob = get_memory_search_blob(memory)
    normalized_query = query_parts['normalized']
    query_tokens = query_parts['tokens']
    query_token_count = len(query_tokens) or 1

    lexical_score = 0.0
    field_weights = [
        (memory.title or '', 2.6),
        (memory.human_caption or '', 2.2),
        (memory.ai_caption or '', 1.7),
        (memory.location or '', 1.2),
        (memory.cluster_name or '', 0.9),
        (' '.join(memory.tags or []), 1.8),
        (' '.join((memory.exif_json or {}).get('ai_object_tags') or []), 1.7),
        (' '.join((memory.exif_json or {}).get('ai_visual_tags') or []), 1.2),
        ((memory.exif_json or {}).get('ai_ocr_text') or '', 2.0),
        (memory.year or '', 1.6),
    ]

    people_blob = []
    seen = set()
    for face in memory.detected_faces.all():
        if face.person_id and str(face.person_id) not in seen:
            seen.add(str(face.person_id))
            people_blob.append(face.person.name)
    for person in memory.identified_people.all():
        if str(person.id) not in seen:
            seen.add(str(person.id))
            people_blob.append(person.name)
    if people_blob:
        field_weights.append((' '.join(people_blob), 2.0))

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
        if phrase and phrase in search_blob:
            lexical_score += 1.5

    semantic_score = 0.0
    if query_vector is not None and memory.clip_embedding is not None:
        semantic_score = max(cosine_similarity(query_vector, list(memory.clip_embedding)), 0.0)

    if query_vector is not None and query_tokens:
        semantic_weight = 0.62
        lexical_weight = 0.38
    elif query_vector is not None:
        semantic_weight = 0.75
        lexical_weight = 0.25
    else:
        semantic_weight = 0.0
        lexical_weight = 1.0

    score = float((semantic_score * semantic_weight) + ((min(lexical_score, 6.0) / 6.0) * lexical_weight))
    if query_parts['phrases']:
        score += 0.04
    if query_parts['years'] or query_parts['decades']:
        score += 0.05

    return float(score)

def explain_memory_match(memory, query_parts, query_vector=None):
    reasons = []
    seen = set()
    search_blob = get_memory_search_blob(memory)

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
    query_phrases = query_parts.get('phrases', [])
    phrase_terms = query_parts.get('phrase_terms', [])

    maybe_add_field_reason('Title', memory.title, query_tokens, normalized_query)
    maybe_add_field_reason('Location', memory.location, query_tokens, normalized_query)
    maybe_add_field_reason('Caption', memory.human_caption or memory.ai_caption, query_tokens, normalized_query)
    maybe_add_field_reason('Tag', ' '.join(memory.tags or []), query_tokens, normalized_query)
    maybe_add_field_reason('Object', ' '.join((memory.exif_json or {}).get('ai_object_tags') or []), query_tokens, normalized_query)
    maybe_add_field_reason('Image text', (memory.exif_json or {}).get('ai_ocr_text') or '', query_tokens, normalized_query)
    maybe_add_field_reason('Year', memory.year, query_tokens, normalized_query)

    people = []
    seen_people = set()
    for face in memory.detected_faces.all():
        if face.person_id and str(face.person_id) not in seen_people:
            seen_people.add(str(face.person_id))
            people.append(face.person.name)
    for person in memory.identified_people.all():
        if str(person.id) not in seen_people:
            seen_people.add(str(person.id))
            people.append(person.name)
    maybe_add_field_reason('Name', ' '.join(people), query_tokens, normalized_query)

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
        if normalized_phrase:
            if normalized_phrase in search_blob:
                add_reason(f'Phrase: "{phrase}"')

    semantic_score = 0.0
    if query_vector is not None and memory.clip_embedding is not None:
        semantic_score = max(cosine_similarity(query_vector, list(memory.clip_embedding)), 0.0)
    if semantic_score >= 0.22 or (not reasons and semantic_score > 0):
        add_reason('Semantic similarity')

    if not reasons:
        add_reason('Lexical relevance')

    return reasons

def get_vault_access_level(user, vault_id):
    if VaultMember.objects.filter(user=user, vault_id=vault_id).exists():
        return 'MEMBER'

    from core.models import LineagePact
    is_pact_active = LineagePact.objects.filter(
        (Q(requester_vault_id=vault_id, target_vault__members__user=user) |
         Q(target_vault_id=vault_id, requester_vault__members__user=user)),
        status='ACCEPTED'
    ).exists()

    return 'FEDERATED' if is_pact_active else None

def has_vault_access(user, vault_id):
    return get_vault_access_level(user, vault_id) is not None

class MemoryListCreateView(generics.ListCreateAPIView):
    serializer_class = MemorySerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    class MemoryPagination(PageNumberPagination):
        page_size = 24
        page_size_query_param = 'page_size'
        max_page_size = 60

    def get_queryset(self):
        vault_id = self.kwargs['vault_id']
        if not has_vault_access(self.request.user, vault_id):
            raise PermissionDenied("You do not have access to this vault.")
        qs = Memory.objects.visible_to_vault(vault_id).prefetch_related('detected_faces__person').order_by('-created_at', '-id')

        q = self.request.query_params.get('q')
        if q:
            qs = qs.filter(
                Q(title__icontains=q) |
                Q(ai_caption__icontains=q) |
                Q(human_caption__icontains=q) |
                Q(location__icontains=q) |
                Q(tags__icontains=q)
            )

        cluster = self.request.query_params.get('cluster')
        if cluster:
            qs = qs.filter(cluster_name=cluster)

        decade = (self.request.query_params.get('decade') or '').strip().lower()
        if decade:
            if decade == 'undated':
                qs = qs.filter(Q(year='') | Q(year__isnull=True))
            else:
                decade_start = decade.rstrip('s')
                if len(decade_start) == 4 and decade_start.isdigit():
                    qs = qs.filter(year__startswith=decade_start[:3])

        reviewed = self.request.query_params.get('reviewed')
        if reviewed is not None:
            qs = qs.filter(is_reviewed=reviewed.lower() == 'true')
            
        is_favorite = self.request.query_params.get('is_favorite')
        if is_favorite is not None:
            qs = qs.filter(is_favorite=is_favorite.lower() == 'true')

        file_type = (self.request.query_params.get('file_type') or '').strip().lower()
        if file_type and file_type != 'all':
            image_exts = ('.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.avif', '.tif', '.tiff')
            video_exts = ('.mp4', '.webm', '.mov', '.m4v', '.ogg')
            audio_exts = ('.mp3', '.wav', '.m4a', '.aac', '.flac', '.oga')
            pdf_exts = ('.pdf',)

            extension_filters = {
                'image': image_exts,
                'video': video_exts,
                'audio': audio_exts,
                'pdf': pdf_exts,
            }
            mime_prefix_filters = {
                'image': ('image/',),
                'video': ('video/',),
                'audio': ('audio/',),
                'pdf': ('application/pdf',),
            }

            exts = extension_filters.get(file_type)
            mime_prefixes = mime_prefix_filters.get(file_type)
            if exts and mime_prefixes:
                ext_q = Q()
                for ext in exts:
                    ext_q |= Q(original_file__iendswith=ext)

                mime_q = Q()
                for mime_prefix in mime_prefixes:
                    mime_q |= (
                        Q(exif_json__mime_type__istartswith=mime_prefix)
                        | Q(exif_json__content_type__istartswith=mime_prefix)
                        | Q(exif_json__mimetype__istartswith=mime_prefix)
                        | Q(exif_json__media_type__istartswith=mime_prefix)
                        | Q(exif_json__file_type__istartswith=mime_prefix)
                    )

                qs = qs.filter(ext_q | mime_q)

        return qs

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())

        if 'page' in request.query_params or 'page_size' in request.query_params:
            paginator = self.MemoryPagination()
            page = paginator.paginate_queryset(queryset, request, view=self)
            serializer = self.get_serializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        vault_id = self.kwargs['vault_id']
        if not VaultMember.objects.filter(user=request.user, vault_id=vault_id, role__in=['ADMIN', 'CONTRIBUTOR']).exists():
            raise PermissionDenied("You lack contribution rights to this vault.")

        file = request.FILES.get('file')
        if not file:
            return Response({"file": ["No file was uploaded."]}, status=status.HTTP_400_BAD_REQUEST)

        title = request.data.get('title', '')

        memory = Memory.objects.create(vault_id=vault_id, original_file=file, title=title)

        ActionLog.objects.create(
            vault_id=vault_id, user=request.user, action_type='upload',
            description=f"Curated new artifact: '{title or 'Untitled'}'.",
            target_id=memory.id,
            target_type='MEMORY'
        )

        task_id = None
        try:
            from tasks.ai_pipeline import process_memory_task
            task = process_memory_task.delay(str(memory.id))
            task_id = task.id
        except Exception as exc:
            # Keep the upload usable when the local worker/broker is down. The
            # review dialog can still open for manual verification.
            memory.exif_json = {**(memory.exif_json or {}), "processing_error": str(exc)}
            memory.save(update_fields=['exif_json'])

        return Response({"task_id": task_id, "status": "PROCESSING" if task_id else "PENDING_REVIEW", "memory_id": str(memory.id)}, status=status.HTTP_202_ACCEPTED)

class VaultClustersView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, vault_id):
        if not has_vault_access(request.user, vault_id):
            raise PermissionDenied("You do not have access to this vault.")
        memories = Memory.objects.visible_to_vault(vault_id).filter(is_reviewed=True)

        clusters = {}
        for mem in memories:
            if mem.cluster_name and mem.cluster_name != 'Unsorted':
                name = mem.cluster_name
            elif mem.year:
                name = f"{mem.year[:3]}0s Era"
            else:
                name = "The Archive"

            if name not in clusters:
                clusters[name] = []
            clusters[name].append(MemorySerializer(mem, context={'request': request}).data)

        result = []
        angle_step = 3.14 * 0.4
        for i, (name, items) in enumerate(clusters.items()):
            result.append({
                "name": name,
                "angle": i * angle_step,
                "memories": items
            })

        return Response(result)

class VibeSearchView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, vault_id):
        if not has_vault_access(request.user, vault_id):
            raise PermissionDenied("You do not have access to this vault.")
        query = (request.query_params.get('q') or '').strip()

        if not query:
            return Response([])

        query_parts = search_ranker.tokenize_search_query(query)
        text_vector = None
        clip_model = get_clip_model()
        if clip_model is not None:
            try:
                text_vector = clip_model.encode(query).tolist()
            except Exception as exc:
                logger.warning("Search query embedding failed for vault %s: %s", vault_id, exc)

        base_qs = Memory.objects.visible_to_vault(vault_id).prefetch_related(
            'detected_faces__person',
            'identified_people',
        )

        candidate_ids = search_ranker.get_search_candidate_ids(base_qs, query_parts, text_vector)
        if not candidate_ids:
            return Response([])

        memory_map = {memory.id: memory for memory in base_qs.filter(id__in=candidate_ids)}
        scored = [
            search_ranker.score_memory(memory_map[memory_id], query_parts, text_vector)
            for memory_id in candidate_ids
            if memory_id in memory_map
        ]
        ranked = search_ranker.rerank_scored_memories(scored, query_parts, text_vector, limit=20, rerank_pool_size=80)

        payload = []
        for hit in ranked:
            row = MemorySerializer(hit.memory, context={'request': request}).data
            row['searchScore'] = float(round(float(hit.final_score), 4))
            row['searchReasons'] = hit.reasons or []
            payload.append(row)

        return Response(payload)

    def post(self, request, vault_id):
        if not has_vault_access(request.user, vault_id):
            raise PermissionDenied("You do not have access to this vault.")

        query = (request.data.get('query') or request.data.get('q') or '').strip()
        if not query:
            return Response({"detail": "Query is required."}, status=status.HTTP_400_BAD_REQUEST)

        deep = request.data.get('deep', True)
        if isinstance(deep, str):
            deep = deep.lower() not in {'false', '0', 'no'}

        if not deep:
            return self.get(request, vault_id)

        from tasks.search import deep_search_vault_task

        task = deep_search_vault_task.delay(str(vault_id), query)
        return Response({
            "task_id": task.id,
            "status": "PROCESSING",
            "progress": 0,
            "stage": "Queued for deep search",
        }, status=status.HTTP_202_ACCEPTED)

class VaultTagCloudView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, vault_id):
        if not has_vault_access(request.user, vault_id):
            raise PermissionDenied("You do not have access to this vault.")

        from collections import Counter
        memories = Memory.objects.visible_to_vault(vault_id)
        all_tags = []
        for m in memories:
            all_tags.extend(m.tags or [])

        top_tags = [tag for tag, count in Counter(all_tags).most_common(5)]
        return Response(top_tags)

class MemoryFiltersView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, vault_id):
        if not has_vault_access(request.user, vault_id):
            raise PermissionDenied("You do not have access to this vault.")

        memories = Memory.objects.visible_to_vault(vault_id)

        clusters = list(
            memories.exclude(cluster_name='Unsorted')
            .order_by('cluster_name')
            .values_list('cluster_name', flat=True)
            .distinct()
        )

        years = list(memories.exclude(year='').order_by('year').values_list('year', flat=True).distinct())
        decades = sorted(
            set(f"{y[:3]}0s" for y in years if y and len(y) == 4),
            key=lambda value: int(value[:4]) if value[:4].isdigit() else 0,
        )
        undated_count = memories.filter(Q(year='') | Q(year__isnull=True)).count()

        return Response({
            "clusters": clusters,
            "decades": decades,
            "decadeCounts": {decade: memories.filter(year__startswith=decade[:3]).count() for decade in decades},
            "undatedCount": undated_count,
            "totalCount": memories.count(),
        })

class MemoryCollectionListCreateView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, vault_id):
        if not has_vault_access(request.user, vault_id):
            raise PermissionDenied("You do not have access to this vault.")

        explicit = MemoryCollection.objects.filter(vault_id=vault_id).annotate(
            memory_count=Count('vault__memories', filter=Q(vault__memories__cluster_name=F('name')))
        )
        explicit_names = set(explicit.values_list('name', flat=True))

        memory_names = Memory.objects.visible_to_vault(vault_id).exclude(cluster_name='').exclude(cluster_name='Unsorted')\
            .values('cluster_name').annotate(memory_count=Count('id')).order_by('cluster_name')

        items = MemoryCollectionSerializer(explicit, many=True).data
        for row in memory_names:
            if row['cluster_name'] in explicit_names:
                continue
            items.append({
                "id": None,
                "name": row['cluster_name'],
                "memory_count": row['memory_count'],
                "created_at": None,
            })

        items.sort(key=lambda item: item['name'].lower())
        return Response(items)

    def post(self, request, vault_id):
        member = VaultMember.objects.filter(user=request.user, vault_id=vault_id).first()
        if not member or member.role == 'VIEWER':
            raise PermissionDenied("You lack contribution rights to create collections.")

        name = (request.data.get('name') or '').strip()
        if not name:
            return Response({"name": ["Collection name is required."]}, status=status.HTTP_400_BAD_REQUEST)
        if len(name) > 100:
            return Response({"name": ["Collection name must be 100 characters or fewer."]}, status=status.HTTP_400_BAD_REQUEST)
        if name.lower() == 'unsorted':
            return Response({"name": ["Unsorted is reserved for uncategorized memories."]}, status=status.HTTP_400_BAD_REQUEST)

        collection, created = MemoryCollection.objects.get_or_create(vault_id=vault_id, name=name)
        if created:
            ActionLog.objects.create(
                vault_id=vault_id,
                user=request.user,
                action_type='edit',
                description=f"Created memory collection '{name}'.",
                target_id=collection.id,
                target_type='COLLECTION'
            )

        collection.memory_count = Memory.objects.visible_to_vault(vault_id).filter(cluster_name=name).count()
        return Response(MemoryCollectionSerializer(collection).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

class MemoryCollectionDetailView(views.APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, vault_id, collection_id):
        member = VaultMember.objects.filter(user=request.user, vault_id=vault_id).first()
        if not member or member.role == 'VIEWER':
            raise PermissionDenied("You lack contribution rights to delete collections.")

        collection = get_object_or_404(MemoryCollection, id=collection_id, vault_id=vault_id)
        linked_count = Memory.objects.filter(vault_id=vault_id, cluster_name=collection.name).count()
        if linked_count > 0:
            return Response({
                "error": "Collection still contains memories. Unlink those memories before deleting it.",
                "memory_count": linked_count,
            }, status=status.HTTP_409_CONFLICT)

        collection_name = collection.name
        collection.delete()
        ActionLog.objects.create(
            vault_id=vault_id,
            user=request.user,
            action_type='delete',
            description=f"Deleted empty memory collection '{collection_name}'.",
            target_type='COLLECTION'
        )
        return Response(status=status.HTTP_204_NO_CONTENT)

class MemoryRestoreView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, vault_id, id):
        member = VaultMember.objects.filter(user=request.user, vault_id=vault_id).first()
        if not member or member.role == 'VIEWER':
            raise PermissionDenied("You lack contribution rights to trigger AI restoration.")

        memory = get_object_or_404(Memory, id=id, vault_id=vault_id)
        from tasks.restoration import restore_memory_task
        task = restore_memory_task.delay(str(memory.id))
        return Response({"task_id": task.id}, status=status.HTTP_202_ACCEPTED)

class CapsuleListCreateView(generics.ListCreateAPIView):
    serializer_class = CapsuleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        vault_id = self.kwargs['vault_id']
        get_object_or_404(VaultMember, vault_id=vault_id, user=self.request.user)
        return Capsule.objects.filter(vault_id=vault_id).order_by('unlock_date')

    def perform_create(self, serializer):
        vault_id = self.kwargs['vault_id']
        member = VaultMember.objects.filter(user=self.request.user, vault_id=vault_id).first()
        if not member or member.role == 'VIEWER':
            raise PermissionDenied("You lack contribution rights to seal a capsule.")

        memory_ids = self.request.data.get('memory_ids', [])
        if memory_ids:
            valid_mems = Memory.objects.filter(id__in=memory_ids, vault_id=vault_id).count()
            if valid_mems != len(memory_ids):
                raise PermissionDenied("One or more artifacts do not belong to this vault.")

        capsule = serializer.save(vault_id=vault_id, sealed_by=self.request.user, status='LOCKED')
        if memory_ids:
            capsule.memories.add(*memory_ids)

        ActionLog.objects.create(
            vault_id=vault_id,
            user=self.request.user,
            action_type='security',
            description=f"Sealed a new Time Capsule: '{capsule.title}' until {capsule.unlock_date.strftime('%Y-%m-%d')}."
        )

class CapsuleOpenView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, vault_id, pk):
        get_object_or_404(VaultMember, vault_id=vault_id, user=request.user)
        capsule = get_object_or_404(Capsule, id=pk, vault_id=vault_id)

        if capsule.status == 'LOCKED' and capsule.unlock_date > timezone.now():
            return Response({"error": "Temporal lock still active. Capsule cannot be opened."}, status=status.HTTP_400_BAD_REQUEST)

        capsule.status = 'OPENED'
        capsule.save()
        return Response({"status": "OPENED"})


class CapsuleDetailView(views.APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, vault_id, pk):
        get_object_or_404(VaultMember, vault_id=vault_id, user=request.user)
        capsule = get_object_or_404(Capsule, id=pk)

        if str(capsule.vault_id) != str(vault_id):
            raise PermissionDenied("This capsule does not belong to the requested vault.")

        if not capsule.sealed_by_id or str(capsule.sealed_by_id) != str(request.user.id):
            raise PermissionDenied("Only the author can delete this capsule.")

        capsule_title = capsule.title
        capsule.delete()
        ActionLog.objects.create(
            vault_id=vault_id,
            user=request.user,
            action_type='capsule',
            description=f"Deleted Time Capsule: '{capsule_title}'.",
        )
        return Response(status=status.HTTP_204_NO_CONTENT)

class DashboardSummaryView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, vault_id):
        member = get_object_or_404(VaultMember, vault_id=vault_id, user=request.user)
        vault = member.vault

        today = timezone.now()
        memories_today = Memory.objects.visible_to_vault(vault_id).filter(
            date__month=today.month,
            date__day=today.day
        )

        on_this_day = None
        if memories_today.exists():
            on_this_day = MemorySerializer(random.choice(memories_today), context={'request': request}).data

        upcoming = Capsule.objects.filter(
            vault_id=vault_id,
            status='LOCKED',
            unlock_date__gt=today
        ).order_by('unlock_date').first()

        unreviewed_count = Memory.objects.visible_to_vault(vault_id).filter(is_reviewed=False).count()

        recent_exhibits = Memory.objects.visible_to_vault(vault_id).order_by('-created_at')[:4]
        hero_images = [request.build_absolute_uri(m.original_file.url) for m in recent_exhibits]

        return Response({
            "vaultName": vault.name,
            "curatorName": request.user.full_name.split(' ')[0],
            "memoryCount": Memory.objects.visible_to_vault(vault_id).count(),
            "unreviewedCount": unreviewed_count,
            "kinCount": Person.objects.filter(vault_id=vault_id).count(),
            "heroImages": hero_images,
            "onThisDay": on_this_day,
            "upcomingCapsule": {
                "title": upcoming.title,
                "unlockDate": upcoming.unlock_date,
            } if upcoming else None,
            "theme": {
                "primaryHue": vault.primary_hue,
                "grainEnabled": vault.grain_enabled
            }
        })

class VaultSettingsView(views.APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, vault_id):
        member = get_object_or_404(VaultMember, vault_id=vault_id, user=request.user, role='ADMIN')
        vault = member.vault
        vault.primary_hue = request.data.get('primary_hue', vault.primary_hue)
        vault.grain_enabled = request.data.get('grain_enabled', vault.grain_enabled)
        vault.save()
        return Response({"status": "SUCCESS", "message": "Settings updated."})

class SmartPurgeView(views.APIView):
    permission_classes = [IsAuthenticated]

    def _build_duplicate_plan(self, vault_id, request):
        duplicates = Memory.objects.filter(vault_id=vault_id) \
            .exclude(phash='') \
            .values('phash') \
            .annotate(count=Count('id')) \
            .filter(count__gt=1)

        groups = []
        default_delete_ids = []
        total_bytes = 0

        for dup in duplicates:
            mems = list(Memory.objects.filter(vault_id=vault_id, phash=dup['phash']).exclude(capsules__status='LOCKED'))
            if len(mems) < 2:
                continue

            def score(mem):
                exif = mem.exif_json or {}
                width = int(exif.get('width', 0) or 0)
                height = int(exif.get('height', 0) or 0)
                filesize = int(exif.get('filesize', 0) or 0)
                return (width * height, filesize)

            mems.sort(key=score, reverse=True)
            keep = mems[0]
            candidates = mems[1:]

            candidate_rows = []
            for mem in mems:
                exif = mem.exif_json or {}
                bytes_size = int(exif.get('filesize', 0) or 0)
                if mem.id != keep.id:
                    total_bytes += bytes_size
                    default_delete_ids.append(str(mem.id))
                candidate_rows.append({
                    "id": str(mem.id),
                    "title": mem.title or "Untitled",
                    "url": request.build_absolute_uri(mem.original_file.url) if mem.original_file else "",
                    "year": mem.year or "",
                    "location": mem.location or "",
                    "width": int(exif.get('width', 0) or 0),
                    "height": int(exif.get('height', 0) or 0),
                    "filesize": bytes_size,
                    "suggested_keep": mem.id == keep.id,
                })

            groups.append({
                "phash": dup['phash'],
                "keep_id": str(keep.id),
                "items": candidate_rows,
            })

        return groups, default_delete_ids, total_bytes

    def get(self, request, vault_id):
        get_object_or_404(VaultMember, vault_id=vault_id, user=request.user, role='ADMIN')
        groups, default_delete_ids, total_bytes = self._build_duplicate_plan(vault_id, request)
        return Response({
            "groups": groups,
            "default_delete_ids": default_delete_ids,
            "candidate_count": len(default_delete_ids),
            "estimated_mb_saved": round(total_bytes / (1024 * 1024), 2),
        })

    def post(self, request, vault_id):
        get_object_or_404(VaultMember, vault_id=vault_id, user=request.user, role='ADMIN')
        groups, default_delete_ids, _ = self._build_duplicate_plan(vault_id, request)

        allowed_ids = {item["id"] for group in groups for item in group["items"] if not item["suggested_keep"]}
        selected_ids = request.data.get('memory_ids')
        if isinstance(selected_ids, list):
            selected_ids = [str(mid) for mid in selected_ids if str(mid) in allowed_ids]
        else:
            selected_ids = list(default_delete_ids)

        purged_count = 0
        bytes_saved = 0

        for mem in Memory.objects.filter(id__in=selected_ids, vault_id=vault_id).exclude(capsules__status='LOCKED'):
            bytes_saved += int((mem.exif_json or {}).get('filesize', 0) or 0)
            mem.delete()
            purged_count += 1

        if purged_count > 0:
            ActionLog.objects.create(
                vault_id=vault_id,
                user=request.user,
                action_type='security',
                description=f"Smart Purge complete. Reclaimed {purged_count} visual duplicates (~{round(bytes_saved/1024/1024, 2)} MB saved)."
            )

        return Response({
            "status": "SUCCESS",
            "purged": purged_count,
            "mb_saved": round(bytes_saved / (1024 * 1024), 2)
        })

class MemoryReprocessView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, vault_id, id):
        member = VaultMember.objects.filter(user=request.user, vault_id=vault_id).first()
        if not member or member.role == 'VIEWER':
            raise PermissionDenied("You lack contribution rights to trigger AI reprocessing.")

        memory = get_object_or_404(Memory, id=id, vault_id=vault_id)
        try:
            from tasks.ai_pipeline import process_memory_task
            task = process_memory_task.delay(str(id))
        except Exception as exc:
            return Response({"error": f"AI queue unavailable: {exc}"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        return Response({"task_id": task.id, "status": "REPROCESSING"})

class MemorySuggestionDecisionView(views.APIView):
    permission_classes = [IsAuthenticated]

    allowed_fields = {'title', 'description', 'tags'}

    def post(self, request, vault_id, id, field):
        member = VaultMember.objects.filter(user=request.user, vault_id=vault_id).first()
        if not member or member.role == 'VIEWER':
            raise PermissionDenied("You lack contribution rights to review AI suggestions.")
        if field not in self.allowed_fields:
            return Response({"field": ["Unsupported suggestion field."]}, status=status.HTTP_400_BAD_REQUEST)

        action = request.data.get('action')
        if action not in {'accept', 'reject'}:
            return Response({"action": ["Use 'accept' or 'reject'."]}, status=status.HTTP_400_BAD_REQUEST)

        memory = get_object_or_404(Memory, id=id, vault_id=vault_id)
        suggestions = dict(memory.ai_suggestions or {})
        suggestion = dict(suggestions.get(field) or {})
        if not suggestion.get('value'):
            return Response({"error": "No AI suggestion is available for this field."}, status=status.HTTP_404_NOT_FOUND)

        exif_json = memory.exif_json or {}
        suggestion['status'] = 'accepted' if action == 'accept' else 'rejected'
        suggestion['decided_at'] = timezone.now().isoformat()
        suggestion['decided_by'] = str(request.user.id)
        suggestions[field] = suggestion
        memory.ai_suggestions = suggestions

        if action == 'accept':
            value = suggestion.get('value')
            if field == 'title':
                memory.title = str(value or '')[:255]
                exif_json['ai_generated_title'] = True
            elif field == 'description':
                memory.ai_caption = str(value or '')
                exif_json['ai_generated_description'] = True
            elif field == 'tags':
                suggested_tags = value if isinstance(value, list) else []
                current_tags = list(memory.tags or [])
                current_lookup = {str(tag).strip().lower() for tag in current_tags}
                for tag in suggested_tags:
                    clean = str(tag or '').strip()
                    if clean and clean.lower() not in current_lookup:
                        current_tags.append(clean[:50])
                        current_lookup.add(clean.lower())
                memory.tags = current_tags

                previous_ai_tags = exif_json.get('ai_generated_tags') or []
                ai_lookup = {str(tag).strip().lower() for tag in previous_ai_tags}
                accepted_ai_tags = list(previous_ai_tags)
                for tag in suggested_tags:
                    clean = str(tag or '').strip()
                    if clean and clean.lower() not in ai_lookup:
                        accepted_ai_tags.append(clean[:50])
                        ai_lookup.add(clean.lower())
                exif_json['ai_generated_tags'] = accepted_ai_tags

        memory.exif_json = exif_json
        memory.save()

        ActionLog.objects.create(
            vault_id=vault_id,
            user=request.user,
            action_type='edit',
            description=f"{action.title()}ed AI suggestion for {field} on '{memory.title or 'Untitled'}'.",
            target_id=memory.id,
            target_type='MEMORY'
        )

        return Response(MemorySerializer(memory, context={'request': request}).data)

class MemoryIdentifiedKinView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, vault_id, id):
        member = VaultMember.objects.filter(user=request.user, vault_id=vault_id).first()
        if not member or member.role == 'VIEWER':
            raise PermissionDenied("You lack contribution rights to identify kin.")

        person_id = request.data.get('person_id')
        if not person_id:
            return Response({"person_id": ["A person id is required."]}, status=status.HTTP_400_BAD_REQUEST)

        memory = get_object_or_404(Memory, id=id, vault_id=vault_id)
        vault_ids = get_accessible_vault_ids(vault_id)
        person = get_object_or_404(Person, id=person_id, vault_id__in=vault_ids)
        memory.identified_people.add(person)

        ActionLog.objects.create(
            vault_id=vault_id,
            user=request.user,
            action_type='edit',
            description=f"Manually identified {person.name} in '{memory.title or 'Untitled'}'.",
            target_id=memory.id,
            target_type='MEMORY'
        )

        return Response(MemorySerializer(memory, context={'request': request}).data)

    def delete(self, request, vault_id, id):
        member = VaultMember.objects.filter(user=request.user, vault_id=vault_id).first()
        if not member or member.role == 'VIEWER':
            raise PermissionDenied("You lack contribution rights to update identified kin.")

        person_id = request.data.get('person_id')
        if not person_id:
            return Response({"person_id": ["A person id is required."]}, status=status.HTTP_400_BAD_REQUEST)

        memory = get_object_or_404(Memory, id=id, vault_id=vault_id)
        person = get_object_or_404(Person, id=person_id)
        memory.identified_people.remove(person)

        ActionLog.objects.create(
            vault_id=vault_id,
            user=request.user,
            action_type='edit',
            description=f"Removed manual kin identification for {person.name} from '{memory.title or 'Untitled'}'.",
            target_id=memory.id,
            target_type='MEMORY'
        )

        return Response(MemorySerializer(memory, context={'request': request}).data)

class MemoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = MemorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        vault_id = self.kwargs['vault_id']
        if not has_vault_access(self.request.user, vault_id):
            raise PermissionDenied("You do not have access to this vault.")
        return Memory.objects.filter(vault_id=vault_id)

    def perform_update(self, serializer):
        vault_id = self.kwargs['vault_id']
        member = VaultMember.objects.filter(user=self.request.user, vault_id=vault_id).first()
        if not member or member.role == 'VIEWER':
            raise PermissionDenied("You lack contribution rights to edit this artifact.")

        previous_title = serializer.instance.title or ''
        previous_exif = serializer.instance.exif_json or {}
        previous_ai_tags = previous_exif.get('ai_generated_tags') or previous_exif.get('ai_visual_tags') or []
        instance = serializer.save()

        exif_json = instance.exif_json or {}
        exif_changed = False

        if 'title' in self.request.data and (instance.title or '') != previous_title:
            exif_json.pop('ai_generated_title', None)
            exif_json.pop('ai_suggested_title', None)
            exif_changed = True

        if 'tags' in self.request.data:
            current_tags = {str(tag).strip().lower() for tag in (instance.tags or [])}
            kept_ai_tags = [
                tag for tag in previous_ai_tags
                if str(tag).strip().lower() in current_tags
            ]
            exif_json['ai_generated_tags'] = kept_ai_tags
            exif_changed = True

        if exif_changed:
            instance.exif_json = exif_json
            instance.save(update_fields=['exif_json'])

        ActionLog.objects.create(
            vault_id=vault_id,
            user=self.request.user,
            action_type='edit',
            description=f"Updated details for artifact '{instance.title or 'Untitled'}.'",
            target_id=instance.id,
            target_type='MEMORY'
        )

    def perform_destroy(self, instance):
        vault_id = self.kwargs['vault_id']
        member = VaultMember.objects.filter(user=self.request.user, vault_id=vault_id).first()
        if not member or member.role == 'VIEWER':
            raise PermissionDenied("You lack contribution rights to expunge this artifact.")

        if instance.capsules.filter(status='LOCKED').exists():
            raise PermissionDenied("This artifact is sealed inside a Time Capsule and cannot be expunged.")

        ActionLog.objects.create(
            vault_id=vault_id,
            user=self.request.user,
            action_type='delete',
            description=f"Artifact '{instance.title or 'Untitled'}' was expunged."
        )
        instance.delete()
