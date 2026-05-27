import { describe, it, expect } from 'vitest';
import { extractData, extractList, extractPaginated } from './responseExtractor';

describe('responseExtractor', () => {
  it('extractData returns .data', () => {
    const res = { data: { a: 1 } } as any;
    expect(extractData(res)).toEqual({ a: 1 });
  });

  it('extractList handles arrays and paginated', () => {
    expect(extractList({ data: [1, 2, 3] })).toEqual([1, 2, 3]);
    expect(extractList([1, 2])).toEqual([1, 2]);
    expect(extractList({ data: { results: ['x'] } })).toEqual(['x']);
    expect(extractList(null)).toEqual([]);
  });

  it('extractPaginated returns normalized shape', () => {
    const pag = { data: { count: 2, next: null, previous: null, results: ['a'] } } as any;
    expect(extractPaginated(pag).results).toEqual(['a']);

    const arr = { data: [1, 2] } as any;
    const norm = extractPaginated(arr);
    expect(norm.count).toBe(2);
    expect(norm.results).toEqual([1, 2]);
  });
});
