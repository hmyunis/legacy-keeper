import type { InfiniteData } from '@tanstack/react-query';
import type { MediaFilterSummary, PaginatedMediaResult } from '@/services/mediaApi';
import type { MediaItem } from '@/types';
import type { TimelineSort } from './types';

const getYearFromDate = (value?: string | null): number | null => {
  if (!value) return null;
  const year = new Date(value).getFullYear();
  return Number.isNaN(year) ? null : year;
};

export const resolveTimelineSort = (value: unknown): TimelineSort =>
  value === 'newest' ? 'newest' : 'oldest';

export const resolveActiveDecade = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized || null;
};

export const flattenTimelineMedia = (
  mediaData?: InfiniteData<PaginatedMediaResult>,
): MediaItem[] => {
  if (!mediaData?.pages?.length) return [];
  return mediaData.pages.flatMap((page) => page.items || []);
};

export const getTimelineDecades = (filterSummary?: MediaFilterSummary): string[] =>
  (filterSummary?.eras || []).map((era) => era.value);

export const getCurrentTimelineCount = (
  mediaData: InfiniteData<PaginatedMediaResult> | undefined,
  allMedia: MediaItem[],
): number => mediaData?.pages[0]?.totalCount ?? allMedia.length;

export const getTotalTimelineCount = (
  filterSummary: MediaFilterSummary | undefined,
  currentTimelineCount: number,
): number => filterSummary?.totalCount ?? currentTimelineCount;

export const getActiveDecadeCount = (params: {
  activeDecade: string | null;
  filterSummary?: MediaFilterSummary;
  currentTimelineCount: number;
  totalTimelineCount: number;
}): number => {
  const { activeDecade, filterSummary, currentTimelineCount, totalTimelineCount } = params;
  if (!activeDecade) return totalTimelineCount;

  const matched = filterSummary?.eras.find((era) => era.value === activeDecade)?.count;
  return typeof matched === 'number' ? matched : currentTimelineCount;
};

export const getTimelineProgressPercent = (
  activeDecadeCount: number,
  totalTimelineCount: number,
): number => {
  if (totalTimelineCount <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((activeDecadeCount / totalTimelineCount) * 100)));
};

export const getTimelineRangeLabel = (params: {
  activeDecade: string | null;
  filterSummary?: MediaFilterSummary;
  allMedia: MediaItem[];
  emptyLabel?: string;
  unknownLabel?: string;
}): string => {
  const {
    activeDecade,
    filterSummary,
    allMedia,
    emptyLabel = 'No timeline data',
    unknownLabel = 'Unknown range',
  } = params;

  if (activeDecade) {
    const startYear = Number.parseInt(activeDecade, 10);
    if (Number.isNaN(startYear)) return activeDecade;
    return `${startYear} - ${startYear + 9}`;
  }

  const startYear = getYearFromDate(filterSummary?.dateRange?.start);
  const endYear = getYearFromDate(filterSummary?.dateRange?.end);
  if (startYear !== null && endYear !== null) {
    return `${startYear} - ${endYear}`;
  }

  if (!allMedia.length) return emptyLabel;
  const years = allMedia
    .map((item) => getYearFromDate(item.dateTaken))
    .filter((year): year is number => year !== null);
  if (!years.length) return unknownLabel;
  return `${Math.min(...years)} - ${Math.max(...years)}`;
};

export const withTimelineDecadeSearch = (
  prev: Record<string, unknown>,
  decade: string | null,
): Record<string, unknown> => {
  const next = { ...prev };
  if (decade) next.decade = decade;
  else delete next.decade;
  return next;
};

export const withTimelineSortSearch = (
  prev: Record<string, unknown>,
  sort: TimelineSort,
): Record<string, unknown> => ({ ...prev, sort });
