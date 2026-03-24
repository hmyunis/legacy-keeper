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
  countTimelineEvents,
  flattenDashboardMedia,
  getRecentUploads,
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

describe('dashboard selectors', () => {
  it('flattens paginated media pages into a single list', () => {
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

    expect(flattenDashboardMedia(mediaData).map((item) => item.id)).toEqual(['1', '2', '3']);
  });

  it('returns zero timeline events for empty media list', () => {
    expect(countTimelineEvents([])).toBe(0);
  });

  it('counts timeline events using only valid dates when present', () => {
    const media = [
      buildMediaItem({ id: '1', dateTaken: '2021-06-10T00:00:00.000Z' }),
      buildMediaItem({ id: '2', dateTaken: 'invalid-date' }),
      buildMediaItem({ id: '3', dateTaken: '2018-04-22T00:00:00.000Z' }),
    ];

    expect(countTimelineEvents(media)).toBe(2);
  });

  it('returns recent uploads with configured limit', () => {
    const media = [
      buildMediaItem({ id: '1' }),
      buildMediaItem({ id: '2' }),
      buildMediaItem({ id: '3' }),
      buildMediaItem({ id: '4' }),
      buildMediaItem({ id: '5' }),
    ];

    expect(getRecentUploads(media, 4).map((item) => item.id)).toEqual(['1', '2', '3', '4']);
  });
});
