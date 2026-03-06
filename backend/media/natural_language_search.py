import re
from dataclasses import dataclass, field
from datetime import date
from typing import Iterable


DATE_MIN_YEAR = 1600
DATE_MAX_YEAR = 2100
TOKEN_LIMIT = 10

DATE_TOKEN_PATTERN = r"(?:\d{4}-\d{2}-\d{2}|\d{4}/\d{2}/\d{2}|\d{4})"
CLAUSE_BOUNDARY_PATTERN = (
    r"(?:between|from|in|during|on|before|after|since|until|till|to|tag|tagged|"
    r"type|media|person|people|location|loc|place|with)"
)

MEDIA_TYPE_ALIASES = {
    "PHOTO": {
        "photo",
        "photos",
        "picture",
        "pictures",
        "pic",
        "pics",
        "image",
        "images",
        "snapshot",
        "snapshots",
    },
    "VIDEO": {
        "video",
        "videos",
        "movie",
        "movies",
        "clip",
        "clips",
        "footage",
        "film",
        "films",
    },
    "DOCUMENT": {
        "document",
        "documents",
        "doc",
        "docs",
        "pdf",
        "letter",
        "letters",
        "certificate",
        "certificates",
        "paper",
        "papers",
    },
}

STOPWORDS = {
    "a",
    "an",
    "and",
    "at",
    "by",
    "for",
    "from",
    "in",
    "into",
    "of",
    "on",
    "or",
    "the",
    "to",
    "with",
    "during",
    "before",
    "after",
    "since",
    "until",
    "till",
    "between",
    "around",
    "near",
    "show",
    "find",
    "me",
    "my",
    "our",
}


@dataclass(frozen=True)
class ParsedNaturalSearch:
    keyword_terms: tuple[str, ...] = ()
    media_types: tuple[str, ...] = ()
    people_terms: tuple[str, ...] = ()
    tag_terms: tuple[str, ...] = ()
    location_terms: tuple[str, ...] = ()
    date_from: date | None = None
    date_to: date | None = None


@dataclass
class _MutableParseState:
    date_from: date | None = None
    date_to: date | None = None
    media_types: list[str] = field(default_factory=list)
    people_terms: list[str] = field(default_factory=list)
    tag_terms: list[str] = field(default_factory=list)
    location_terms: list[str] = field(default_factory=list)

    def merge_date_range(self, start: date | None, end: date | None):
        if start is not None:
            if self.date_from is None or start > self.date_from:
                self.date_from = start
        if end is not None:
            if self.date_to is None or end < self.date_to:
                self.date_to = end

    def finalize(self, keyword_terms: Iterable[str]) -> ParsedNaturalSearch:
        return ParsedNaturalSearch(
            keyword_terms=tuple(_dedupe_terms(keyword_terms)),
            media_types=tuple(_dedupe_terms(self.media_types)),
            people_terms=tuple(_dedupe_terms(self.people_terms)),
            tag_terms=tuple(_dedupe_terms(self.tag_terms)),
            location_terms=tuple(_dedupe_terms(self.location_terms)),
            date_from=self.date_from,
            date_to=self.date_to,
        )


def parse_natural_language_query(raw_query: str) -> ParsedNaturalSearch:
    normalized = _normalize_query(raw_query)
    if not normalized:
        return ParsedNaturalSearch()

    state = _MutableParseState()
    working = normalized

    # Structured date ranges first so single-year patterns do not consume their parts.
    working = _consume_date_ranges(working, state)
    working = _consume_decades(working, state)
    working = _consume_before_after_date_tokens(working, state)
    working = _consume_exact_date_tokens(working, state)

    # Explicit prefixed fields (supports quoted and unquoted values).
    working = _consume_type_prefixes(working, state)
    working = _consume_prefixed_terms(working, ("person", "people"), state.people_terms)
    working = _consume_prefixed_terms(working, ("tag", "tags"), state.tag_terms)
    working = _consume_prefixed_terms(working, ("location", "loc", "place"), state.location_terms)

    # Natural language field cues.
    working = _consume_natural_tag_cues(working, state)
    working = _consume_natural_people_cues(working, state)
    working = _consume_natural_location_cues(working, state)
    working = _consume_media_type_aliases(working, state)

    # Standalone year is treated as a year filter.
    working = _consume_standalone_years(working, state)

    keyword_terms = _extract_keyword_terms(working)
    return state.finalize(keyword_terms)


def _normalize_query(raw_query: str) -> str:
    value = str(raw_query or "")
    value = value.replace("\u2018", "'").replace("\u2019", "'")
    value = value.replace("\u201c", '"').replace("\u201d", '"')
    value = value.replace("\u2013", "-").replace("\u2014", "-")
    value = re.sub(r"\s+", " ", value).strip()
    return value


def _blank_spans(text: str, spans: list[tuple[int, int]]) -> str:
    if not spans:
        return text
    chars = list(text)
    for start, end in spans:
        bounded_start = max(0, start)
        bounded_end = min(len(chars), end)
        for idx in range(bounded_start, bounded_end):
            chars[idx] = " "
    return "".join(chars)


def _extract_match_value(match: re.Match[str], *group_names: str) -> str:
    group_index = match.re.groupindex
    for name in group_names:
        if name not in group_index:
            continue
        value = match.group(name)
        if value:
            return re.sub(r"\s+", " ", value).strip()
    return ""


def _parse_date_token(value: str) -> date | None:
    token = str(value or "").strip()
    if not token:
        return None
    if "/" in token:
        token = token.replace("/", "-")
    if re.fullmatch(r"\d{4}", token):
        year = int(token)
        if DATE_MIN_YEAR <= year <= DATE_MAX_YEAR:
            return date(year, 1, 1)
        return None
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", token):
        return None
    try:
        parsed = date.fromisoformat(token)
    except ValueError:
        return None
    if not (DATE_MIN_YEAR <= parsed.year <= DATE_MAX_YEAR):
        return None
    return parsed


def _date_token_range(
    value: str,
    *,
    as_lower_bound: bool = False,
    as_upper_bound: bool = False,
) -> tuple[date | None, date | None]:
    parsed = _parse_date_token(value)
    if not parsed:
        return None, None

    token = str(value).strip().replace("/", "-")
    is_year_only = bool(re.fullmatch(r"\d{4}", token))

    if as_lower_bound:
        return parsed, None
    if as_upper_bound:
        if is_year_only:
            return None, date(parsed.year, 12, 31)
        return None, parsed
    if is_year_only:
        return date(parsed.year, 1, 1), date(parsed.year, 12, 31)
    return parsed, parsed


def _consume_date_ranges(text: str, state: _MutableParseState) -> str:
    spans: list[tuple[int, int]] = []
    patterns = [
        rf"\bbetween\s+(?P<start>{DATE_TOKEN_PATTERN})\s+(?:and|to)\s+(?P<end>{DATE_TOKEN_PATTERN})\b",
        rf"\bfrom\s+(?P<start>{DATE_TOKEN_PATTERN})\s+to\s+(?P<end>{DATE_TOKEN_PATTERN})\b",
        rf"\b(?P<start>{DATE_TOKEN_PATTERN})\s*-\s*(?P<end>{DATE_TOKEN_PATTERN})\b",
    ]
    for pattern in patterns:
        for match in re.finditer(pattern, text, flags=re.IGNORECASE):
            start = _extract_match_value(match, "start")
            end = _extract_match_value(match, "end")
            start_from, start_to = _date_token_range(start)
            end_from, end_to = _date_token_range(end)
            if start_from and end_to:
                range_start = start_from if not end_from or start_from <= end_from else end_from
                range_end = end_to if not start_to or end_to >= start_to else start_to
                state.merge_date_range(range_start, range_end)
                spans.append(match.span())
    return _blank_spans(text, spans)


def _consume_decades(text: str, state: _MutableParseState) -> str:
    spans: list[tuple[int, int]] = []

    for match in re.finditer(r"\b(?P<decade>(?:1[6-9]\d|20\d)0)s\b", text, flags=re.IGNORECASE):
        decade = int(_extract_match_value(match, "decade"))
        state.merge_date_range(date(decade, 1, 1), date(decade + 9, 12, 31))
        spans.append(match.span())

    for match in re.finditer(r"\b'(?P<short>\d{2})s\b", text, flags=re.IGNORECASE):
        short = int(_extract_match_value(match, "short"))
        pivot = date.today().year % 100
        century = 2000 if short <= pivot else 1900
        decade = century + short
        if decade % 10 == 0 and DATE_MIN_YEAR <= decade <= DATE_MAX_YEAR:
            state.merge_date_range(date(decade, 1, 1), date(decade + 9, 12, 31))
            spans.append(match.span())

    return _blank_spans(text, spans)


def _consume_before_after_date_tokens(text: str, state: _MutableParseState) -> str:
    spans: list[tuple[int, int]] = []
    before_pattern = rf"\b(?:before|until|till|earlier than|older than)\s+(?P<value>{DATE_TOKEN_PATTERN})\b"
    after_pattern = rf"\b(?:after|since|newer than|later than)\s+(?P<value>{DATE_TOKEN_PATTERN})\b"

    for match in re.finditer(before_pattern, text, flags=re.IGNORECASE):
        token = _extract_match_value(match, "value")
        start, end = _date_token_range(token, as_upper_bound=True)
        state.merge_date_range(start, end)
        spans.append(match.span())

    for match in re.finditer(after_pattern, text, flags=re.IGNORECASE):
        token = _extract_match_value(match, "value")
        start, end = _date_token_range(token, as_lower_bound=True)
        state.merge_date_range(start, end)
        spans.append(match.span())

    return _blank_spans(text, spans)


def _consume_exact_date_tokens(text: str, state: _MutableParseState) -> str:
    spans: list[tuple[int, int]] = []
    pattern = rf"\b(?:in|from|during|on|around)\s+(?P<value>{DATE_TOKEN_PATTERN})\b"
    for match in re.finditer(pattern, text, flags=re.IGNORECASE):
        token = _extract_match_value(match, "value")
        start, end = _date_token_range(token)
        state.merge_date_range(start, end)
        spans.append(match.span())
    return _blank_spans(text, spans)


def _consume_type_prefixes(text: str, state: _MutableParseState) -> str:
    spans: list[tuple[int, int]] = []
    pattern = (
        rf"\b(?:type|media)\s*:\s*"
        rf"(?:\"(?P<quoted>[^\"]+)\"|'(?P<single>[^']+)'|(?P<plain>[^\s,;]+))"
    )
    for match in re.finditer(pattern, text, flags=re.IGNORECASE):
        raw_value = _extract_match_value(match, "quoted", "single", "plain").lower()
        matched_type = _map_alias_to_media_type(raw_value)
        if matched_type:
            state.media_types.append(matched_type)
            spans.append(match.span())
    return _blank_spans(text, spans)


def _consume_prefixed_terms(
    text: str,
    aliases: tuple[str, ...],
    target: list[str],
) -> str:
    alias_pattern = "|".join(re.escape(alias) for alias in aliases)
    spans: list[tuple[int, int]] = []

    quoted_patterns = [
        rf"\b(?:{alias_pattern})\s*:\s*\"(?P<quoted>[^\"]+)\"",
        rf"\b(?:{alias_pattern})\s*:\s*'(?P<single>[^']+)'",
    ]
    for pattern in quoted_patterns:
        for match in re.finditer(pattern, text, flags=re.IGNORECASE):
            value = _extract_match_value(match, "quoted", "single")
            if value:
                target.append(value)
                spans.append(match.span())

    masked_text = _blank_spans(text, spans)
    plain_pattern = (
        rf"\b(?:{alias_pattern})\s*:\s*(?P<plain>[^,;]+?)"
        rf"(?=\s+\b{CLAUSE_BOUNDARY_PATTERN}\b|\s+{DATE_TOKEN_PATTERN}\b|$)"
    )
    for match in re.finditer(plain_pattern, masked_text, flags=re.IGNORECASE):
        value = _extract_match_value(match, "quoted", "single", "plain")
        if value:
            target.append(value)
            spans.append(match.span())
    return _blank_spans(text, spans)


def _consume_natural_tag_cues(text: str, state: _MutableParseState) -> str:
    spans: list[tuple[int, int]] = []
    pattern = (
        r"\btagged\s+"
        r"(?:\"(?P<quoted>[^\"]+)\"|'(?P<single>[^']+)'|(?P<plain>[^\s,;]+))"
    )
    for match in re.finditer(pattern, text, flags=re.IGNORECASE):
        value = _extract_match_value(match, "quoted", "single", "plain")
        if value:
            state.tag_terms.append(value)
            spans.append(match.span())
    return _blank_spans(text, spans)


def _consume_natural_people_cues(text: str, state: _MutableParseState) -> str:
    spans: list[tuple[int, int]] = []
    pattern = (
        r"\bwith\s+"
        r"(?:\"(?P<quoted>[^\"]+)\"|'(?P<single>[^']+)'|(?P<plain>[^\s,;]+))"
    )
    for match in re.finditer(pattern, text, flags=re.IGNORECASE):
        value = _extract_match_value(match, "quoted", "single", "plain")
        if value:
            state.people_terms.append(value)
            spans.append(match.span())
    return _blank_spans(text, spans)


def _consume_natural_location_cues(text: str, state: _MutableParseState) -> str:
    spans: list[tuple[int, int]] = []
    pattern = r"\bin\s+(?:\"(?P<quoted>[^\"]+)\"|'(?P<single>[^']+)')"
    for match in re.finditer(pattern, text, flags=re.IGNORECASE):
        value = _extract_match_value(match, "quoted", "single")
        if value:
            state.location_terms.append(value)
            spans.append(match.span())
    return _blank_spans(text, spans)


def _consume_media_type_aliases(text: str, state: _MutableParseState) -> str:
    spans: list[tuple[int, int]] = []
    for alias, media_type in _iter_alias_media_pairs():
        pattern = rf"\b{re.escape(alias)}\b"
        for match in re.finditer(pattern, text, flags=re.IGNORECASE):
            state.media_types.append(media_type)
            spans.append(match.span())
    return _blank_spans(text, spans)


def _consume_standalone_years(text: str, state: _MutableParseState) -> str:
    matches = list(re.finditer(r"\b(?P<year>(?:1[6-9]\d{2}|20\d{2}))\b", text))
    if len(matches) != 1:
        return text
    spans: list[tuple[int, int]] = []
    match = matches[0]
    year = int(_extract_match_value(match, "year"))
    if DATE_MIN_YEAR <= year <= DATE_MAX_YEAR:
        state.merge_date_range(date(year, 1, 1), date(year, 12, 31))
        spans.append(match.span())
    return _blank_spans(text, spans)


def _extract_keyword_terms(text: str) -> list[str]:
    normalized = _normalize_query(text)
    if not normalized:
        return []

    terms: list[str] = []
    consumed_spans: list[tuple[int, int]] = []
    phrase_pattern = r"\"(?P<double>[^\"]+)\"|'(?P<single>[^']+)'"
    for match in re.finditer(phrase_pattern, normalized):
        value = _extract_match_value(match, "double", "single").lower()
        if value and value not in STOPWORDS:
            terms.append(value)
            consumed_spans.append(match.span())
    stripped = _blank_spans(normalized, consumed_spans)
    parts = re.split(r"[^a-zA-Z0-9']+", stripped)
    for part in parts:
        token = part.strip().lower()
        if not token or token in STOPWORDS:
            continue
        if len(token) <= 1 and not token.isdigit():
            continue
        terms.append(token)
    return _dedupe_terms(terms)[:TOKEN_LIMIT]


def _iter_alias_media_pairs():
    for media_type, aliases in MEDIA_TYPE_ALIASES.items():
        for alias in aliases:
            yield alias, media_type


def _map_alias_to_media_type(value: str) -> str | None:
    normalized = str(value or "").strip().lower()
    if not normalized:
        return None
    for media_type, aliases in MEDIA_TYPE_ALIASES.items():
        if normalized in aliases:
            return media_type
    return None


def _dedupe_terms(values: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    output: list[str] = []
    for raw in values:
        value = re.sub(r"\s+", " ", str(raw or "")).strip()
        if not value:
            continue
        key = value.lower()
        if key in seen:
            continue
        seen.add(key)
        output.append(value)
    return output
