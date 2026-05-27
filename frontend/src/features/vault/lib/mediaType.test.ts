import { describe, it, expect } from 'vitest';
import { detectVaultMediaType } from './mediaType';

describe('detectVaultMediaType', () => {
  it('detects image by extension', () => {
    expect(detectVaultMediaType('https://example.com/photo.JPG')).toBe('image');
    expect(detectVaultMediaType('file.png')).toBe('image');
  });

  it('detects video by extension', () => {
    expect(detectVaultMediaType('movie.mp4')).toBe('video');
  });

  it('detects audio by extension', () => {
    expect(detectVaultMediaType('sound.MP3')).toBe('audio');
  });

  it('detects pdf by extension', () => {
    expect(detectVaultMediaType('doc.pdf')).toBe('pdf');
  });

  it('handles urls with query and hash', () => {
    expect(detectVaultMediaType('https://x/y/image.png?version=1#frag')).toBe('image');
  });

  it('prefers mime metadata over extension', () => {
    const exif = { mime_type: 'video/mp4' };
    expect(detectVaultMediaType('pic.jpg', exif)).toBe('video');
  });

  it('recognizes alternate mime keys', () => {
    expect(detectVaultMediaType(undefined, { mimetype: 'image/jpeg' })).toBe('image');
    expect(detectVaultMediaType(undefined, { content_type: 'application/pdf' })).toBe('pdf');
    expect(detectVaultMediaType(undefined, { file_type: 'audio/wav' })).toBe('audio');
    expect(detectVaultMediaType(undefined, { media_type: 'video/webm' })).toBe('video');
  });

  it('returns unknown for missing or unsupported', () => {
    expect(detectVaultMediaType()).toBe('unknown');
    expect(detectVaultMediaType('file.unknownext')).toBe('unknown');
  });
});

