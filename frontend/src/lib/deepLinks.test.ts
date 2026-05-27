import { describe, it, expect } from 'vitest';
import { buildAppUrl, buildMemoryShareUrl, parseRouteTarget } from './deepLinks';

describe('deepLinks utilities', () => {
  it('builds app urls with query params', () => {
    const url = buildAppUrl('/path', { a: '1', b: null, c: 0 });
    expect(url.includes('/path')).toBe(true);
    expect(url.includes('a=1')).toBe(true);
    expect(url.includes('c=0')).toBe(true);
    expect(url.includes('b=')).toBe(false);
  });

  it('buildMemoryShareUrl returns empty without vaultId', () => {
    expect(buildMemoryShareUrl(null, 'm')).toBe('');
    expect(buildMemoryShareUrl('v1', 'm')).toContain('/museum');
  });

  it('parseRouteTarget resolves path and search', () => {
    const parsed = parseRouteTarget('/dashboard?x=1');
    expect(parsed.to).toBe('/dashboard');
    expect(parsed.search?.x).toBe('1');
  });
});
