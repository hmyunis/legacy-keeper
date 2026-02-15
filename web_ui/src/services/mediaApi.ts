import axiosClient from './axiosClient';
import type {
    ApiMediaItem,
    ApiMediaFilterSummary,
    PaginatedApiResponse,
} from '../types/api.types';
import { MediaItem, MediaStatus } from '../types';
import { MediaType } from '../types';
import { appEnv } from './env';

const MEDIA_ENDPOINT = 'media/';

const toAbsoluteUrl = (value?: string | null): string | null => {
    if (!value) return null;
    if (/^https?:\/\//i.test(value)) return value;
    try {
        return new URL(value, appEnv.apiBaseUrl).toString();
    } catch {
        return value;
    }
};

const resolveMediaType = (file: File): MediaType => {
    const mime = file.type.toLowerCase();
    if (mime.startsWith('image/')) return MediaType.PHOTO;
    if (mime.startsWith('video/')) return MediaType.VIDEO;
    return MediaType.DOCUMENT;
};

const parseMetadataTags = (metadata?: Record<string, unknown> | null): string[] => {
    if (!metadata) return [];
    const raw = metadata.tags;
    if (Array.isArray(raw)) {
        return raw.map((value) => String(value).trim()).filter(Boolean);
    }
    if (typeof raw === 'string') {
        return raw
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean);
    }
    return [];
};

const parseMetadataLocation = (metadata?: Record<string, unknown> | null): string | undefined => {
    if (!metadata) return undefined;
    const raw = metadata.location;
    if (typeof raw !== 'string') return undefined;
    const value = raw.trim();
    return value || undefined;
};

const mapApiMediaToMediaItem = (item: ApiMediaItem): MediaItem => ({
    id: String(item.id),
    vaultId: String(item.vault),
    uploaderId: item.uploader ? String(item.uploader) : '',
    isFavorite: Boolean(item.isFavorite),
    type: item.mediaType,
    title: item.title || 'Untitled memory',
    description: item.description || '',
    dateTaken: item.dateTaken || item.createdAt,
    uploadTimestamp: item.createdAt,
    thumbnailUrl: toAbsoluteUrl(item.fileUrl) || 'https://placehold.co/600x800?text=Memory',
    fileUrl: toAbsoluteUrl(item.fileUrl) || undefined,
    tags: parseMetadataTags(item.metadata),
    status: (item.aiStatus as MediaStatus) || MediaStatus.PENDING,
    location: parseMetadataLocation(item.metadata),
});

const unwrapList = <T>(payload: T[] | PaginatedApiResponse<T> | null | undefined): T[] => {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.results)) return payload.results;
    return [];
};

export interface UploadMediaPayload {
    file: File;
    title: string;
    description: string;
    dateTaken?: string;
    location?: string;
    tags?: string[];
}

export interface UpdateMediaMetadataPayload {
    id: string;
    tags: string[];
    location?: string;
}

export interface PaginatedMediaResult {
    items: MediaItem[];
    totalCount: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}

export interface ToggleFavoriteResponse {
    mediaId: string;
    isFavorite: boolean;
}

export interface MediaQueryParams {
    page?: number;
    pageSize?: number;
    search?: string;
    type?: MediaType;
    types?: MediaType[];
    people?: string[];
    locations?: string[];
    era?: string;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: 'newest' | 'oldest' | 'title';
}

export interface FacetOption {
    value: string;
    count: number;
}

export interface MediaFilterSummary {
    totalCount: number;
    people: FacetOption[];
    locations: FacetOption[];
    eras: FacetOption[];
    types: Array<{ value: MediaType; count: number }>;
    dateRange: {
        start: string | null;
        end: string | null;
    };
}

const normalizeFacetOptions = (value: unknown): FacetOption[] => {
    if (!Array.isArray(value)) return [];
    return value
        .map((item) => {
            if (!item || typeof item !== 'object') return null;
            const rawValue = (item as any).value;
            const rawCount = (item as any).count;
            if (typeof rawValue !== 'string') return null;
            return {
                value: rawValue,
                count: typeof rawCount === 'number' ? rawCount : 0,
            };
        })
        .filter(Boolean) as FacetOption[];
};

const appendCsvParam = (queryParams: Record<string, unknown>, key: string, values?: string[]) => {
    if (!values?.length) return;
    const normalized = values.map((value) => value.trim()).filter(Boolean);
    if (!normalized.length) return;
    queryParams[key] = normalized.join(',');
};

const buildMediaQueryParams = (
    vaultId: string,
    params?: MediaQueryParams,
    options?: { includePagination?: boolean },
): Record<string, unknown> => {
    const queryParams: Record<string, unknown> = { vault: vaultId };
    const includePagination = options?.includePagination !== false;

    if (includePagination && params?.page) queryParams.page = params.page;
    if (includePagination && params?.pageSize) queryParams.pageSize = params.pageSize;
    if (params?.search) queryParams.search = params.search;
    if (params?.type) queryParams.mediaType = params.type;
    appendCsvParam(queryParams, 'mediaType', params?.types);
    appendCsvParam(queryParams, 'people', params?.people);
    appendCsvParam(queryParams, 'locations', params?.locations);
    if (params?.era) queryParams.era = params.era;
    if (params?.dateFrom) queryParams.dateFrom = params.dateFrom;
    if (params?.dateTo) queryParams.dateTo = params.dateTo;

    if (params?.sortBy) {
        switch (params.sortBy) {
            case 'newest':
                queryParams.ordering = '-created_at';
                break;
            case 'oldest':
                queryParams.ordering = 'created_at';
                break;
            case 'title':
                queryParams.ordering = 'title';
                break;
        }
    }

    return queryParams;
};

export const mediaApi = {
    getMedia: async (vaultId: string, params?: MediaQueryParams): Promise<PaginatedMediaResult> => {
        const queryParams = buildMediaQueryParams(vaultId, params);

        const response = await axiosClient.get<PaginatedApiResponse<ApiMediaItem>>(MEDIA_ENDPOINT, {
            params: queryParams,
        });

        const data = response.data;
        const items = (data.results || []).map(mapApiMediaToMediaItem);

        return {
            items,
            totalCount: data.count || items.length,
            hasNextPage: !!data.next,
            hasPreviousPage: !!data.previous,
        };
    },

    getMediaFilters: async (vaultId: string, params?: Omit<MediaQueryParams, 'page' | 'pageSize' | 'sortBy'>): Promise<MediaFilterSummary> => {
        const queryParams = buildMediaQueryParams(vaultId, params, { includePagination: false });

        const response = await axiosClient.get<ApiMediaFilterSummary | Record<string, unknown>>(
            `${MEDIA_ENDPOINT}filters/`,
            { params: queryParams },
        );

        const payload: any = response.data || {};
        const dateRange = payload.dateRange || payload.date_range || {};
        const typeOptions = normalizeFacetOptions(payload.types).filter((item) =>
            Object.values(MediaType).includes(item.value as MediaType),
        ) as Array<{ value: MediaType; count: number }>;

        return {
            totalCount: Number(payload.totalCount ?? payload.total_count ?? 0),
            people: normalizeFacetOptions(payload.people),
            locations: normalizeFacetOptions(payload.locations),
            eras: normalizeFacetOptions(payload.eras),
            types: typeOptions,
            dateRange: {
                start: typeof dateRange.start === 'string' ? dateRange.start : null,
                end: typeof dateRange.end === 'string' ? dateRange.end : null,
            },
        };
    },

    getFavoriteMedia: async (vaultId: string, params?: MediaQueryParams): Promise<PaginatedMediaResult> => {
        const queryParams = buildMediaQueryParams(vaultId, params);

        const response = await axiosClient.get<PaginatedApiResponse<ApiMediaItem>>(`${MEDIA_ENDPOINT}favorites/`, {
            params: queryParams,
        });

        const data = response.data;
        const items = (data.results || []).map(mapApiMediaToMediaItem);

        return {
            items,
            totalCount: data.count || items.length,
            hasNextPage: !!data.next,
            hasPreviousPage: !!data.previous,
        };
    },

    getMediaItem: async (mediaId: string): Promise<MediaItem> => {
        const response = await axiosClient.get<ApiMediaItem>(`${MEDIA_ENDPOINT}${mediaId}/`);
        return mapApiMediaToMediaItem(response.data);
    },

    createMedia: async (
        vaultId: string,
        payload: UploadMediaPayload,
        onUploadProgress?: (progress: number) => void,
    ): Promise<MediaItem> => {
        const formData = new FormData();
        formData.append('vault', vaultId);
        formData.append('file', payload.file);
        formData.append('title', payload.title);
        formData.append('description', payload.description);
        formData.append('mediaType', resolveMediaType(payload.file));

        if (payload.dateTaken) {
            formData.append('dateTaken', payload.dateTaken);
        }

        formData.append(
            'metadata',
            JSON.stringify({
                location: payload.location || '',
                tags: payload.tags || [],
            }),
        );

        const response = await axiosClient.post<ApiMediaItem>(MEDIA_ENDPOINT, formData, {
            onUploadProgress: (event) => {
                if (!onUploadProgress || !event.total) return;
                const progress = Math.round((event.loaded * 100) / event.total);
                onUploadProgress(progress);
            },
        });

        return mapApiMediaToMediaItem(response.data);
    },

    updateMedia: async (
        mediaId: string,
        payload: UpdateMediaMetadataPayload,
    ): Promise<MediaItem> => {
        const formData = new FormData();
        formData.append(
            'metadata',
            JSON.stringify({
                location: payload.location || '',
                tags: payload.tags,
            }),
        );

        const response = await axiosClient.patch<ApiMediaItem>(
            `${MEDIA_ENDPOINT}${mediaId}/`,
            formData,
        );
        return mapApiMediaToMediaItem(response.data);
    },

    deleteMedia: async (mediaId: string): Promise<void> => {
        await axiosClient.delete(`${MEDIA_ENDPOINT}${mediaId}/`);
    },

    toggleFavorite: async (mediaId: string, isFavorite?: boolean): Promise<ToggleFavoriteResponse> => {
        const payload = typeof isFavorite === 'boolean' ? { isFavorite } : {};
        const response = await axiosClient.post<{ mediaId?: string; media_id?: string; isFavorite?: boolean; is_favorite?: boolean }>(
            `${MEDIA_ENDPOINT}${mediaId}/favorite/`,
            payload,
        );
        return {
            mediaId: String(response.data.mediaId ?? response.data.media_id ?? mediaId),
            isFavorite: Boolean(response.data.isFavorite ?? response.data.is_favorite),
        };
    },

    exportTimeline: async (
        vaultId: string,
        params?: Omit<MediaQueryParams, 'page' | 'pageSize'>,
    ): Promise<{ blob: Blob; fileName: string }> => {
        const queryParams = buildMediaQueryParams(vaultId, params, { includePagination: false });
        const response = await axiosClient.get<Blob>(`${MEDIA_ENDPOINT}export/`, {
            params: queryParams,
            responseType: 'blob',
        });

        const disposition = response.headers['content-disposition'];
        const fileNameMatch = disposition?.match(/filename="?([^"]+)"?/i);
        const fileName = fileNameMatch?.[1] || `media-timeline-${vaultId}.csv`;

        return { blob: response.data, fileName };
    },

    downloadMedia: async (mediaItem: MediaItem, fileName?: string): Promise<void> => {
        if (!mediaItem.fileUrl) {
            throw new Error('File URL not available');
        }

        const response = await axiosClient.get(mediaItem.fileUrl, {
            responseType: 'blob',
        });

        const blob = new Blob([response.data]);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName || `${mediaItem.title}.${getFileExtension(mediaItem.type)}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    },
};

const getFileExtension = (type: MediaType): string => {
    switch (type) {
        case MediaType.PHOTO:
            return 'jpg';
        case MediaType.VIDEO:
            return 'mp4';
        case MediaType.DOCUMENT:
            return 'pdf';
        default:
            return 'bin';
    }
};

export type { ApiMediaItem };
