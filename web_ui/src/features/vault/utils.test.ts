import type { InfiniteData } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import type { PaginatedMediaResult } from '@/services/mediaApi';
import {
  MediaExifStatus,
  MediaFaceDetectionStatus,
  MediaRestorationStatus,
  MediaStatus,
  MediaType,
  type MediaItem,
} from '@/types';
import {
  buildEmptyVaultFilters,
  buildVaultFiltersState,
  buildVaultMediaQueryParams,
  buildVaultSearchParams,
  flattenVaultMedia,
  getActiveFilterCount,
  getVaultTotalCount,
  isExifRunning,
  isFaceDetectionRunning,
  mergeLegacyPersonFilter,
  summarizeVaultExifProgress,
  toDateParam,
  toDateValue,
  toggleStringItem,
  toggleTypeItem,
} from './utils';

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

describe('vault utils', () => {
  it('parses and serializes date values', () => {
    expect(toDateValue('invalid')).toBeUndefined();
    const parsed = toDateValue('2024-01-02');
    expect(parsed).toBeInstanceOf(Date);
    expect(toDateParam(new Date('2024-01-02T15:10:00.000Z'))).toBe('2024-01-02');
  });

  it('normalizes legacy person and people filters', () => {
    expect(mergeLegacyPersonFilter([' Ada ', 'Linus'], 'Ada')).toEqual(['Ada', 'Linus']);
  });

  it('toggles string and type items', () => {
    expect(toggleStringItem(['a', 'b'], 'b')).toEqual(['a']);
    expect(toggleStringItem(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggleTypeItem([MediaType.PHOTO], MediaType.PHOTO)).toEqual([]);
    expect(toggleTypeItem([], MediaType.DOCUMENT)).toEqual([MediaType.DOCUMENT]);
  });

  it('builds filters state and active filter count', () => {
    const filters = buildVaultFiltersState({
      people: [' Alice '],
      tags: ['tag-1'],
      locations: [' Addis '],
      types: [MediaType.PHOTO],
      era: '1990s',
      startDate: '2020-01-01',
      endDate: '2020-02-01',
    });
    expect(filters.people).toEqual(['Alice']);
    expect(filters.locations).toEqual(['Addis']);
    expect(getActiveFilterCount(filters)).toBe(7);
  });

  it('creates empty filters state', () => {
    expect(buildEmptyVaultFilters()).toEqual({
      people: [],
      tags: [],
      locations: [],
      era: null,
      types: [],
      startDate: undefined,
      endDate: undefined,
    });
  });

  it('builds vault search params with canonical keys', () => {
    const next = buildVaultSearchParams(
      { person: 'legacy', tab: 'all', extra: 1 },
      {
        searchQuery: '  hello  ',
        sortBy: 'newest',
        view: 'grid',
        tab: 'favorites',
        filters: {
          people: ['p1', 'p2'],
          tags: ['t1'],
          locations: ['l1'],
          era: '1980s',
          types: [MediaType.PHOTO, MediaType.VIDEO],
          startDate: new Date('2020-01-01T00:00:00.000Z'),
          endDate: new Date('2020-02-01T00:00:00.000Z'),
        },
      },
    );

    expect(next).toMatchObject({
      sort: 'newest',
      view: 'grid',
      tab: 'favorites',
      q: 'hello',
      people: 'p1,p2',
      tags: 't1',
      locations: 'l1',
      era: '1980s',
      types: 'PHOTO,VIDEO',
      startDate: '2020-01-01',
      endDate: '2020-02-01',
      extra: 1,
    });
    expect(next.person).toBeUndefined();
  });

  it('removes empty keys when building vault search params', () => {
    const next = buildVaultSearchParams(
      {
        q: 'old',
        tab: 'favorites',
        people: 'p1',
        tags: 't1',
        locations: 'l1',
        types: 'PHOTO',
        era: '1990s',
        startDate: '2024-01-01',
        endDate: '2024-01-02',
      },
      {
        searchQuery: '   ',
        sortBy: 'title',
        view: 'list',
        tab: 'all',
        filters: buildEmptyVaultFilters(),
      },
    );

    expect(next).toMatchObject({ sort: 'title', view: 'list' });
    expect(next.q).toBeUndefined();
    expect(next.tab).toBeUndefined();
    expect(next.people).toBeUndefined();
    expect(next.tags).toBeUndefined();
    expect(next.locations).toBeUndefined();
    expect(next.types).toBeUndefined();
    expect(next.era).toBeUndefined();
    expect(next.startDate).toBeUndefined();
    expect(next.endDate).toBeUndefined();
  });

  it('builds media query params from vault filters', () => {
    const params = buildVaultMediaQueryParams({
      sortBy: 'oldest',
      searchQuery: 'query',
      filters: {
        people: ['person-1'],
        tags: [],
        locations: [],
        era: null,
        types: [MediaType.PHOTO],
        startDate: new Date('2021-01-01T00:00:00.000Z'),
        endDate: undefined,
      },
    });

    expect(params).toEqual({
      sortBy: 'oldest',
      sortField: 'created_at',
      search: 'query',
      people: ['person-1'],
      tags: undefined,
      locations: undefined,
      types: [MediaType.PHOTO],
      era: undefined,
      dateFrom: '2021-01-01',
      dateTo: undefined,
    });
  });

  it('flattens media pages and reads total count', () => {
    const mediaData: InfiniteData<PaginatedMediaResult> = {
      pages: [
        {
          items: [buildMediaItem({ id: '1' }), buildMediaItem({ id: '2' })],
          totalCount: 3,
          hasNextPage: true,
          hasPreviousPage: false,
        },
        {
          items: [buildMediaItem({ id: '3' })],
          totalCount: 3,
          hasNextPage: false,
          hasPreviousPage: true,
        },
      ],
      pageParams: [1, 2],
    };

    expect(flattenVaultMedia(mediaData).map((item) => item.id)).toEqual(['1', '2', '3']);
    expect(getVaultTotalCount(mediaData)).toBe(3);
  });

  it('summarizes exif and face detection status counts for photos only', () => {
    const summary = summarizeVaultExifProgress([
      buildMediaItem({
        id: '1',
        exifStatus: MediaExifStatus.QUEUED,
        faceDetectionStatus: MediaFaceDetectionStatus.PROCESSING,
      }),
      buildMediaItem({
        id: '2',
        exifStatus: MediaExifStatus.AWAITING_CONFIRMATION,
        faceDetectionStatus: MediaFaceDetectionStatus.FAILED,
      }),
      buildMediaItem({
        id: '3',
        exifStatus: MediaExifStatus.FAILED,
      }),
      buildMediaItem({
        id: '4',
        type: MediaType.DOCUMENT,
        exifStatus: MediaExifStatus.QUEUED,
        faceDetectionStatus: MediaFaceDetectionStatus.QUEUED,
      }),
    ]);

    expect(summary).toEqual({
      active: 1,
      awaitingConfirmation: 1,
      failed: 1,
      faceProcessing: 1,
      faceFailed: 1,
    });
  });

  it('checks running state helpers', () => {
    expect(isExifRunning(MediaExifStatus.QUEUED)).toBe(true);
    expect(isExifRunning(MediaExifStatus.CONFIRMED)).toBe(false);
    expect(isFaceDetectionRunning(MediaFaceDetectionStatus.PROCESSING)).toBe(true);
    expect(isFaceDetectionRunning(MediaFaceDetectionStatus.FAILED)).toBe(false);
  });
});

