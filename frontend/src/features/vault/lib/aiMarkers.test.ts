import { describe, it, expect } from 'vitest';
import { isAiGeneratedTitle, getAiGeneratedTags, isAiGeneratedTag, getPendingSuggestion } from './aiMarkers';

describe('aiMarkers utilities', () => {
  it('detects ai generated title flag', () => {
    expect(isAiGeneratedTitle({ exif_json: { ai_generated_title: true } })).toBe(true);
    expect(isAiGeneratedTitle({})).toBe(false);
  });

  it('parses ai tags from arrays and strings', () => {
    const source = { exif_json: { ai_generated_tags: ['One', ' two '], ai_visual_tags: 'three,four' } } as any;
    const tags = getAiGeneratedTags(source);
    expect(tags.has('one')).toBe(true);
    expect(tags.has('two')).toBe(true);
    expect(tags.has('three')).toBe(true);
    expect(tags.has('four')).toBe(true);
  });

  it('isAiGeneratedTag checks membership case-insensitively', () => {
    const source = { exif_json: { ai_generated_tags: ['Cat'] } } as any;
    expect(isAiGeneratedTag(source, 'cat')).toBe(true);
    expect(isAiGeneratedTag(source, 'DOG')).toBe(false);
  });

  it('getPendingSuggestion returns only pending/high confidence', () => {
    const good = { ai_suggestions: { title: { value: 'X', status: 'pending', confidence: 'high' } } } as any;
    const badStatus = { ai_suggestions: { title: { value: 'X', status: 'accepted', confidence: 'high' } } } as any;
    const badConfidence = { ai_suggestions: { title: { value: 'X', status: 'pending', confidence: 'low' } } } as any;

    expect(getPendingSuggestion(good, 'title')).toBe('X');
    expect(getPendingSuggestion(badStatus, 'title')).toBeNull();
    expect(getPendingSuggestion(badConfidence, 'title')).toBeNull();
  });
});
