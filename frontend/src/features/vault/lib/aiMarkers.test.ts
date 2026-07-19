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

  it('getPendingSuggestion returns pending suggestions at any confidence', () => {
    const highConfidence = { ai_suggestions: { title: { value: 'X', status: 'pending', confidence: 'high' } } } as any;
    const mediumConfidence = { ai_suggestions: { tags: { value: ['portrait'], status: 'pending', confidence: 'medium' } } } as any;
    const badStatus = { ai_suggestions: { title: { value: 'X', status: 'accepted', confidence: 'high' } } } as any;

    expect(getPendingSuggestion(highConfidence, 'title')).toBe('X');
    expect(getPendingSuggestion(mediumConfidence, 'tags')).toEqual(['portrait']);
    expect(getPendingSuggestion(badStatus, 'title')).toBeNull();
  });
});
