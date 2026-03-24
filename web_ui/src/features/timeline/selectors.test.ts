import type { InfiniteData } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import type { MediaFilterSummary, PaginatedMediaResult } from '@/services/mediaApi';
import {
  MediaExifStatus,
  MediaFaceDetectionStatus,
  MediaRestorationStatus,
  MediaStatus,
  MediaType,
  type MediaItem,
} from '@/types';
import {
  flattenTimelineMedia,
  getActiveDecadeCount,
  getCurrentTimelineCount,
  getTimelineProgressPercent,
  getTimelineRangeLabel,
  getTotalTimelineCount,
  getTimelineDecades,
  resolveActiveDecade,
  resolveTimelineSort,
  withTimelineDecadeSearch,
  withTimelineSortSearch,
} from './selectors';

const buildMediaItem = (overrides: Partial<MediaItem>): MediaItem => ({
  id: 'media-1',
  vaultId: 'vault-1',
  uploaderId: 'user-1',
  isFavorite: false,
  type: MediaType.PHOTO,
  visibility: 'family',
  title: 'Memory',
  description: '',
  dateTaken: '2020-01-01T00:00:00.000Z',
  uploadTimestamp: '2020-01-01T00:00:00.000Z',
  thumbnailUrl: 'https://example.com/thumb.jpg',
  tags: [],
  status: MediaStatus.COMPLETED,
  exifStatus: MediaExifStatus.CONFIRMED,
  faceDetectionStatus: MediaFaceDetectionStatus.COMPLETED,
  restorationStatus: MediaRestorationStatus.NOT_STARTED,
  metadata: {},
  files: [],
  ...overrides,
});

const buildFilterSummary = (overrides: Partial<MediaFilterSummary> = {}): MediaFilterSummary => ({
  totalCount: 9,
  people: [],
  tags: [],
  locations: [],
  eras: [
    { value: '1980', count: 2 },
    { value: '1990', count: 3 },
  ],
  types: [],
  dateRange: {
    start: '1980-01-01',
    end: '2000-12-31',
  },
  ...overrides,
});

describe('timeline selectors', () => {
  it('resolves sort and decade search values', () => {
    expect(resolveTimelineSort('newest')).toBe('newest');
    expect(resolveTimelineSort('x')).toBe('oldest');
    expect(resolveActiveDecade(' 1990 ')).toBe('1990');
    expect(resolveActiveDecade('   ')).toBeNull();
  });

  it('flattens media pages and uses first page total count', () => {
    const mediaData: InfiniteData<PaginatedMediaResult> = {
      pages: [
        {
          items: [buildMediaItem({ id: '1' }), buildMediaItem({ id: '2' })],
          totalCount: 10,
          hasNextPage: true,
          hasPreviousPage: false,
        },
        {
          items: [buildMediaItem({ id: '3' })],
          totalCount: 10,
          hasNextPage: false,
          hasPreviousPage: true,
        },
      ],
      pageParams: [1, 2],
    };

    const allMedia = flattenTimelineMedia(mediaData);
    expect(allMedia.map((item) => item.id)).toEqual(['1', '2', '3']);
    expect(getCurrentTimelineCount(mediaData, allMedia)).toBe(10);
  });

  it('computes decade counts and progress percent', () => {
    const summary = buildFilterSummary();
    const currentCount = 5;
    const totalCount = getTotalTimelineCount(summary, currentCount);

    expect(getActiveDecadeCount({
      activeDecade: null,
      filterSummary: summary,
      currentTimelineCount: currentCount,
      totalTimelineCount: totalCount,
    })).toBe(9);

    expect(getActiveDecadeCount({
      activeDecade: '1990',
      filterSummary: summary,
      currentTimelineCount: currentCount,
      totalTimelineCount: totalCount,
    })).toBe(3);

    expect(getTimelineProgressPercent(3, 9)).toBe(33);
  });

  it('builds range labels using decade, filter date range, and fallback media dates', () => {
    const summary = buildFilterSummary();
    const media = [
      buildMediaItem({ id: '1', dateTaken: '2010-01-01T00:00:00.000Z' }),
      buildMediaItem({ id: '2', dateTaken: '2014-02-01T00:00:00.000Z' }),
    ];

    expect(getTimelineRangeLabel({ activeDecade: '1990', filterSummary: summary, allMedia: media })).toBe(
      '1990 - 1999',
    );
    expect(getTimelineRangeLabel({ activeDecade: null, filterSummary: summary, allMedia: media })).toBe(
      '1980 - 2000',
    );
    expect(
      getTimelineRangeLabel({
        activeDecade: null,
        filterSummary: buildFilterSummary({ dateRange: { start: null, end: null } }),
        allMedia: media,
      }),
    ).toBe('2010 - 2014');
  });

  it('returns configured empty and unknown labels', () => {
    expect(
      getTimelineRangeLabel({
        activeDecade: null,
        filterSummary: buildFilterSummary({ dateRange: { start: null, end: null } }),
        allMedia: [],
        emptyLabel: 'No data',
      }),
    ).toBe('No data');

    expect(
      getTimelineRangeLabel({
        activeDecade: null,
        filterSummary: buildFilterSummary({ dateRange: { start: null, end: null } }),
        allMedia: [buildMediaItem({ dateTaken: 'invalid-date' })],
        unknownLabel: 'Unknown',
      }),
    ).toBe('Unknown');
  });

  it('maps decade list and search state updates', () => {
    const summary = buildFilterSummary();
    expect(getTimelineDecades(summary)).toEqual(['1980', '1990']);

    expect(withTimelineDecadeSearch({ q: 'x', decade: '1980' }, null)).toEqual({ q: 'x' });
    expect(withTimelineDecadeSearch({ q: 'x' }, '1990')).toEqual({ q: 'x', decade: '1990' });
    expect(withTimelineSortSearch({ q: 'x' }, 'newest')).toEqual({ q: 'x', sort: 'newest' });
  });
});
