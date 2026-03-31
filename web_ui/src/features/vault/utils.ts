import type { InfiniteData } from '@tanstack/react-query';
import type { PaginatedMediaResult } from '@/services/mediaApi';
import {
  MediaExifStatus,
  MediaFaceDetectionStatus,
  MediaLockRule,
  MediaType,
  type MediaItem,
  UserRole,
} from '@/types';

export type VaultTab = 'all' | 'favorites';
export type VaultSortOption = 'newest' | 'oldest' | 'title';
export type VaultViewMode = 'grid' | 'list';

export interface VaultFiltersState {
  people: string[];
  tags: string[];
  locations: string[];
  era: string | null;
  types: MediaType[];
  startDate?: Date;
  endDate?: Date;
}

export interface VaultExifProgressSummary {
  active: number;
  awaitingConfirmation: number;
  failed: number;
  faceProcessing: number;
  faceFailed: number;
}

export interface VaultTagState {
  visible: boolean;
  value: string;
}

export interface VaultUploadState {
  open: boolean;
  progress: number;
  date: Date;
  files: File[];
  primaryFileIndex: number;
  title: string;
  location: string;
  tags: string;
  story: string;
  visibility: 'private' | 'family';
  lockRule: MediaLockRule;
  lockReleaseAt: string;
  lockTargetUserIds: string[];
}

export interface VaultLockTargetCandidate {
  userId: string;
  fullName: string;
  email: string;
}

const EXIF_RUNNING_STATUSES = new Set<MediaExifStatus>([
  MediaExifStatus.QUEUED,
  MediaExifStatus.PROCESSING,
]);
const FACE_DETECTION_RUNNING_STATUSES = new Set<MediaFaceDetectionStatus>([
  MediaFaceDetectionStatus.QUEUED,
  MediaFaceDetectionStatus.PROCESSING,
]);

export const EXIF_POLL_WINDOW_MS = 120000;
export const EXIF_STATUS_TOAST_DURATION_MS = 5000;

export const toDateValue = (value?: string): Date | undefined => {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed;
};

export const toDateParam = (value?: Date): string | undefined => {
  if (!value) return undefined;
  return value.toISOString().split('T')[0];
};

export const toggleStringItem = (items: string[], value: string): string[] =>
  items.includes(value) ? items.filter((item) => item !== value) : [...items, value];

export const toggleTypeItem = (items: MediaType[], value: MediaType): MediaType[] =>
  items.includes(value) ? items.filter((item) => item !== value) : [...items, value];

export const normalizeVaultStringFilters = (items?: string[]): string[] =>
  Array.from(new Set((items || []).map((item) => item.trim()).filter(Boolean)));

export const normalizeInitialTypeFilters = (items?: MediaType[]): MediaType[] =>
  (items || []).filter((item) => Object.values(MediaType).includes(item));

export const mergeLegacyPersonFilter = (
  people: string[] | undefined,
  legacyPerson?: string,
): string[] =>
  normalizeVaultStringFilters([...(people || []), ...(legacyPerson ? [legacyPerson] : [])]);

export const buildVaultFiltersState = (input: {
  people?: string[];
  tags?: string[];
  locations?: string[];
  era?: string | null;
  types?: MediaType[];
  startDate?: string;
  endDate?: string;
}): VaultFiltersState => ({
  people: normalizeVaultStringFilters(input.people),
  tags: normalizeVaultStringFilters(input.tags),
  locations: normalizeVaultStringFilters(input.locations),
  era: input.era || null,
  types: normalizeInitialTypeFilters(input.types),
  startDate: toDateValue(input.startDate),
  endDate: toDateValue(input.endDate),
});

export const buildEmptyVaultFilters = (): VaultFiltersState => ({
  people: [],
  tags: [],
  locations: [],
  era: null,
  types: [],
  startDate: undefined,
  endDate: undefined,
});

export const getActiveFilterCount = (filters: VaultFiltersState): number => {
  let count = 0;
  count += filters.people.length;
  count += filters.tags.length;
  count += filters.locations.length;
  count += filters.types.length;
  if (filters.era) count += 1;
  if (filters.startDate) count += 1;
  if (filters.endDate) count += 1;
  return count;
};

export const buildVaultSearchParams = (
  prev: Record<string, unknown>,
  input: {
    searchQuery: string;
    sortBy: VaultSortOption;
    view: VaultViewMode;
    tab: VaultTab;
    filters: VaultFiltersState;
  },
): Record<string, unknown> => {
  const { searchQuery, sortBy, view, tab, filters } = input;
  const next: Record<string, unknown> = { ...prev, sort: sortBy, view };

  if (tab === 'favorites') next.tab = 'favorites';
  else delete next.tab;

  const trimmedSearch = searchQuery.trim();
  if (trimmedSearch) next.q = trimmedSearch;
  else delete next.q;

  if (filters.people.length) next.people = filters.people.join(',');
  else delete next.people;

  if (filters.tags.length) next.tags = filters.tags.join(',');
  else delete next.tags;

  if (filters.locations.length) next.locations = filters.locations.join(',');
  else delete next.locations;

  if (filters.types.length) next.types = filters.types.join(',');
  else delete next.types;

  if (filters.era) next.era = filters.era;
  else delete next.era;

  const startDate = toDateParam(filters.startDate);
  if (startDate) next.startDate = startDate;
  else delete next.startDate;

  const endDate = toDateParam(filters.endDate);
  if (endDate) next.endDate = endDate;
  else delete next.endDate;

  delete next.person;
  return next;
};

export const buildVaultMediaQueryParams = (input: {
  sortBy: VaultSortOption;
  searchQuery?: string;
  filters: VaultFiltersState;
}) => {
  const { sortBy, searchQuery, filters } = input;
  return {
    sortBy,
    sortField: 'created_at' as const,
    search: searchQuery || undefined,
    people: filters.people.length ? filters.people : undefined,
    tags: filters.tags.length ? filters.tags : undefined,
    locations: filters.locations.length ? filters.locations : undefined,
    types: filters.types.length ? filters.types : undefined,
    era: filters.era || undefined,
    dateFrom: toDateParam(filters.startDate),
    dateTo: toDateParam(filters.endDate),
  };
};

export const excludeLockAuthorFromCandidates = (
  candidates: VaultLockTargetCandidate[],
  authorUserId?: string | null,
): VaultLockTargetCandidate[] => {
  const normalizedAuthorId = String(authorUserId || '').trim();
  if (!normalizedAuthorId) return candidates;
  return candidates.filter(
    (candidate) => String(candidate.userId || '').trim() !== normalizedAuthorId,
  );
};

export const canManageMediaActions = (input: {
  role?: UserRole | null;
  currentUserId?: string | null;
  uploaderId?: string | null;
  uploadTimestamp?: string | null;
  safetyWindowMinutes?: number | null;
  nowMs?: number;
}): boolean => {
  const {
    role,
    currentUserId,
    uploaderId,
    uploadTimestamp,
    safetyWindowMinutes,
    nowMs = Date.now(),
  } = input;

  if (!role) return false;
  if (role === UserRole.ADMIN) return true;
  if (role !== UserRole.CONTRIBUTOR) return false;

  const normalizedCurrentUserId = String(currentUserId || '').trim();
  const normalizedUploaderId = String(uploaderId || '').trim();
  if (!normalizedCurrentUserId || normalizedCurrentUserId !== normalizedUploaderId) {
    return false;
  }

  if (typeof safetyWindowMinutes !== 'number') return true;

  const createdAt = new Date(String(uploadTimestamp || ''));
  if (Number.isNaN(createdAt.getTime())) return true;

  const elapsedMinutes = (nowMs - createdAt.getTime()) / 60000;
  return elapsedMinutes <= Math.max(safetyWindowMinutes, 0);
};

export const flattenVaultMedia = (
  mediaData?: InfiniteData<PaginatedMediaResult>,
): MediaItem[] => {
  if (!mediaData) return [];
  return mediaData.pages.flatMap((page) => page.items);
};

export const getVaultTotalCount = (
  mediaData?: InfiniteData<PaginatedMediaResult>,
): number => {
  if (!mediaData) return 0;
  return mediaData.pages[0]?.totalCount || 0;
};

export const summarizeVaultExifProgress = (
  mediaItems: MediaItem[],
): VaultExifProgressSummary => {
  let active = 0;
  let awaitingConfirmation = 0;
  let failed = 0;
  let faceProcessing = 0;
  let faceFailed = 0;

  for (const item of mediaItems) {
    if (item.type !== MediaType.PHOTO) continue;

    if (item.exifStatus === MediaExifStatus.QUEUED || item.exifStatus === MediaExifStatus.PROCESSING) {
      active += 1;
    } else if (item.exifStatus === MediaExifStatus.AWAITING_CONFIRMATION) {
      awaitingConfirmation += 1;
    } else if (item.exifStatus === MediaExifStatus.FAILED) {
      failed += 1;
    }

    if (
      item.faceDetectionStatus === MediaFaceDetectionStatus.QUEUED ||
      item.faceDetectionStatus === MediaFaceDetectionStatus.PROCESSING
    ) {
      faceProcessing += 1;
    } else if (item.faceDetectionStatus === MediaFaceDetectionStatus.FAILED) {
      faceFailed += 1;
    }
  }

  return { active, awaitingConfirmation, failed, faceProcessing, faceFailed };
};

export const isExifRunning = (status?: MediaExifStatus): boolean =>
  Boolean(status && EXIF_RUNNING_STATUSES.has(status));

export const isFaceDetectionRunning = (status?: MediaFaceDetectionStatus): boolean =>
  Boolean(status && FACE_DETECTION_RUNNING_STATUSES.has(status));
