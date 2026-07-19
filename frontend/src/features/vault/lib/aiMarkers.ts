type AiMetadataSource = {
  exif_json?: Record<string, unknown> | null;
};

type AiSuggestionSource = {
  ai_suggestions?: Record<string, { value: unknown; status?: string; confidence?: string }> | null;
};

function toStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || '').trim())
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/[,;|]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase();
}

export function isAiGeneratedTitle(source: AiMetadataSource): boolean {
  return Boolean(source.exif_json?.ai_generated_title);
}

export function getAiGeneratedTags(source: AiMetadataSource): Set<string> {
  const aiTags = toStringList(source.exif_json?.ai_generated_tags);
  const visualTags = toStringList(source.exif_json?.ai_visual_tags);
  return new Set([...aiTags, ...visualTags].map(normalizeTag));
}

export function isAiGeneratedTag(source: AiMetadataSource, tag: string): boolean {
  return getAiGeneratedTags(source).has(normalizeTag(tag));
}

export function getPendingSuggestion(source: AiSuggestionSource, field: string) {
  const suggestion = source.ai_suggestions?.[field];
  if (!suggestion || suggestion.status !== 'pending') return null;
  return suggestion.value;
}
