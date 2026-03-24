import type { InfiniteData } from '@tanstack/react-query';
import type { PaginatedMediaResult } from '@/services/mediaApi';
import type { MediaItem } from '@/types';

export const DASHBOARD_RECENT_UPLOADS_LIMIT = 4;

const hasValidDate = (value: string): boolean => {
  const timestamp = new Date(value).getTime();
  return !Number.isNaN(timestamp);
};

export const flattenDashboardMedia = (
  mediaData?: InfiniteData<PaginatedMediaResult>,
): MediaItem[] => {
  if (!mediaData?.pages?.length) return [];
  return mediaData.pages.flatMap((page) => page.items || []);
};

export const countTimelineEvents = (mediaItems: MediaItem[]): number => {
  if (!mediaItems.length) return 0;
  const withValidDate = mediaItems.filter((item) => hasValidDate(item.dateTaken));
  return withValidDate.length || mediaItems.length;
};

export const getRecentUploads = (
  mediaItems: MediaItem[],
  limit = DASHBOARD_RECENT_UPLOADS_LIMIT,
): MediaItem[] => {
  if (limit <= 0) return [];
  return mediaItems.slice(0, limit);
};

