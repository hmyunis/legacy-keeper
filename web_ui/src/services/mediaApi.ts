import axiosClient from './axiosClient';
import type {
    ApiMediaItem,
    ApiMediaFile,
    ApiLinkedRelative,
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

const normalizeVisibility = (value?: string | null): 'private' | 'family' => {
    const normalized = String(value || '').trim().toUpperCase();
    return normalized === 'PRIVATE' ? 'private' : 'family';
};

const parseLinkedRelatives = (item: ApiMediaItem): MediaItem['linkedRelatives'] => {
    const rawRelatives = (Array.isArray(item.linkedRelatives) ? item.linkedRelatives : (item as any).linked_relatives) || [];
    if (!Array.isArray(rawRelatives)) return [];

    const seen = new Set<string>();
    return rawRelatives
        .map((entry: ApiLinkedRelative | Record<string, unknown>) => {
            if (!entry || typeof entry !== 'object') return null;

            const id = String((entry as any).id || '').trim();
            const fullName = String((entry as any).fullName ?? (entry as any).full_name ?? '').trim();
            if (!id || !fullName) return null;
            if (seen.has(id)) return null;
            seen.add(id);

            const photoUrl = toAbsoluteUrl(String((entry as any).photoUrl ?? (entry as any).photo_url ?? '').trim());
            return {
                id,
                fullName,
                photoUrl: photoUrl || undefined,
            };
        })
        .filter(Boolean) as NonNullable<MediaItem['linkedRelatives']>;
};

const resolveFileTypeFromMime = (
    mimeType?: string,
    fallbackMediaType?: MediaType,
): 'PHOTO' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' => {
    const mime = String(mimeType || '').toLowerCase();
    if (mime.startsWith('image/')) return 'PHOTO';
    if (mime.startsWith('video/')) return 'VIDEO';
    if (mime.startsWith('audio/')) return 'AUDIO';

    if (fallbackMediaType === MediaType.PHOTO) return 'PHOTO';
    if (fallbackMediaType === MediaType.VIDEO) return 'VIDEO';
    return 'DOCUMENT';
};

const mapApiFiles = (item: ApiMediaItem): MediaItem['files'] => {
    const rawFiles = Array.isArray(item.files) ? item.files : [];
    if (rawFiles.length) {
        return rawFiles
            .map((entry: ApiMediaFile) => {
                const fileUrl = toAbsoluteUrl(entry.fileUrl);
                if (!fileUrl) return null;
                const normalizedFileType = String(entry.fileType || '').toUpperCase();
                return {
                    id: String(entry.id || fileUrl),
                    fileUrl,
                    fileSize: Number(entry.fileSize || 0),
                    mimeType: entry.mimeType || undefined,
                    fileType:
                        normalizedFileType === 'PHOTO' ||
                        normalizedFileType === 'VIDEO' ||
                        normalizedFileType === 'AUDIO' ||
                        normalizedFileType === 'DOCUMENT'
                            ? (normalizedFileType as 'PHOTO' | 'VIDEO' | 'AUDIO' | 'DOCUMENT')
                            : resolveFileTypeFromMime(entry.mimeType, item.mediaType),
                    originalName: String(entry.originalName || 'Attachment'),
                    isPrimary: Boolean(entry.isPrimary),
                    createdAt: entry.createdAt || undefined,
                };
            })
            .filter(Boolean) as MediaItem['files'];
    }

    const fallbackUrl = toAbsoluteUrl(item.fileUrl);
    if (!fallbackUrl) return [];

    return [
        {
            id: `primary-${item.id}`,
            fileUrl: fallbackUrl,
            fileSize: 0,
            mimeType: undefined,
            fileType: resolveFileTypeFromMime(undefined, item.mediaType),
            originalName: item.title || 'Memory file',
            isPrimary: true,
            createdAt: item.createdAt,
        },
    ];
};

const mapApiMediaToMediaItem = (item: ApiMediaItem): MediaItem => {
    const files = mapApiFiles(item);
    const primaryFile = files.find((file) => file.isPrimary) || files[0];
    const thumbnailFile = files.find((file) => file.fileType === 'PHOTO') || primaryFile;

    return {
        id: String(item.id),
        vaultId: String(item.vault),
        uploaderId: item.uploader ? String(item.uploader) : '',
        uploaderName: String(item.uploaderName ?? (item as any).uploader_name ?? '').trim() || undefined,
        uploaderAvatar: toAbsoluteUrl(String(item.uploaderAvatar ?? (item as any).uploader_avatar ?? '').trim()) || undefined,
        linkedRelatives: parseLinkedRelatives(item),
        isFavorite: Boolean(item.isFavorite),
        type: item.mediaType,
        visibility: normalizeVisibility((item as any).visibility),
        title: item.title || 'Untitled memory',
        description: item.description || '',
        dateTaken: item.dateTaken || item.createdAt,
        uploadTimestamp: item.createdAt,
        thumbnailUrl: thumbnailFile?.fileUrl || 'https://placehold.co/600x800?text=Memory',
        fileUrl: primaryFile?.fileUrl || undefined,
        tags: parseMetadataTags(item.metadata),
        status: (item.aiStatus as MediaStatus) || MediaStatus.PENDING,
        location: parseMetadataLocation(item.metadata),
        metadata: (item.metadata && typeof item.metadata === 'object' ? item.metadata : {}) as Record<string, unknown>,
        files,
    };
};

const unwrapList = <T>(payload: T[] | PaginatedApiResponse<T> | null | undefined): T[] => {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.results)) return payload.results;
    return [];
};

export interface UploadMediaPayload {
    files: File[];
    title?: string;
    description?: string;
    dateTaken?: string;
    location?: string;
    tags?: string[];
    visibility?: 'private' | 'family';
}

export interface UpdateMediaMetadataPayload {
    id: string;
    title?: string;
    description?: string;
    dateTaken?: string | null;
    location?: string;
    tags?: string[];
    visibility?: 'private' | 'family';
    newFiles?: File[];
    removeFileIds?: string[];
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
    tags?: string[];
    locations?: string[];
    era?: string;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: 'newest' | 'oldest' | 'title';
    sortField?: 'created_at' | 'date_taken';
}

export interface FacetOption {
    value: string;
    count: number;
}

export interface MediaFilterSummary {
    totalCount: number;
    people: FacetOption[];
    tags: FacetOption[];
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
    appendCsvParam(queryParams, 'tags', params?.tags);
    appendCsvParam(queryParams, 'locations', params?.locations);
    if (params?.era) queryParams.era = params.era;
    if (params?.dateFrom) queryParams.dateFrom = params.dateFrom;
    if (params?.dateTo) queryParams.dateTo = params.dateTo;

    if (params?.sortBy) {
        const sortField = params.sortField === 'date_taken' ? 'date_taken' : 'created_at';
        queryParams.sort = params.sortBy;
        switch (params.sortBy) {
            case 'newest':
                queryParams.ordering = `-${sortField}`;
                break;
            case 'oldest':
                queryParams.ordering = sortField;
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
            tags: normalizeFacetOptions(payload.tags),
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
        if (!payload.files.length) {
            throw new Error('No files provided for upload.');
        }
        if (payload.files.length > 10) {
            throw new Error('You can upload up to 10 files at a time.');
        }

        const primaryFile = payload.files[0];
        const formData = new FormData();
        formData.append('vault', vaultId);
        formData.append('file', primaryFile);
        payload.files.forEach((file) => {
            formData.append('files', file);
        });
        formData.append('title', payload.title || primaryFile.name);
        formData.append('description', payload.description || '');
        formData.append('mediaType', resolveMediaType(primaryFile));

        if (payload.dateTaken) {
            formData.append('dateTaken', payload.dateTaken);
        }
        if (payload.visibility) {
            formData.append('visibility', payload.visibility.toUpperCase());
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
        const hasFileMutations =
            Boolean(payload.newFiles?.length) || Boolean(payload.removeFileIds?.length);

        if (hasFileMutations) {
            const formData = new FormData();

            if (payload.title !== undefined) {
                formData.append('title', payload.title);
            }
            if (payload.description !== undefined) {
                formData.append('description', payload.description);
            }
            if (payload.dateTaken !== undefined) {
                formData.append('dateTaken', payload.dateTaken === null ? 'null' : payload.dateTaken);
            }
            if (payload.visibility !== undefined) {
                formData.append('visibility', payload.visibility.toUpperCase());
            }

            const metadataPatch: Record<string, unknown> = {};
            let hasMetadataUpdate = false;

            if (payload.location !== undefined) {
                metadataPatch.location = payload.location;
                hasMetadataUpdate = true;
            }

            if (payload.tags !== undefined) {
                metadataPatch.tags = payload.tags;
                hasMetadataUpdate = true;
            }

            if (hasMetadataUpdate) {
                formData.append('metadata', JSON.stringify(metadataPatch));
            }

            if (payload.removeFileIds?.length) {
                formData.append('removeFileIds', JSON.stringify(payload.removeFileIds));
            }

            for (const file of payload.newFiles || []) {
                formData.append('newFiles', file);
            }

            const multipartResponse = await axiosClient.patch<ApiMediaItem>(
                `${MEDIA_ENDPOINT}${mediaId}/`,
                formData,
            );
            return mapApiMediaToMediaItem(multipartResponse.data);
        }

        const requestBody: Record<string, unknown> = {};

        if (payload.title !== undefined) {
            requestBody.title = payload.title;
        }
        if (payload.description !== undefined) {
            requestBody.description = payload.description;
        }
        if (payload.dateTaken !== undefined) {
            requestBody.dateTaken = payload.dateTaken;
        }
        if (payload.visibility !== undefined) {
            requestBody.visibility = payload.visibility.toUpperCase();
        }

        const nextMetadata: Record<string, unknown> = {};
        let hasMetadataUpdate = false;

        if (payload.location !== undefined) {
            nextMetadata.location = payload.location;
            hasMetadataUpdate = true;
        }

        if (payload.tags !== undefined) {
            nextMetadata.tags = payload.tags;
            hasMetadataUpdate = true;
        }

        if (hasMetadataUpdate) {
            requestBody.metadata = nextMetadata;
        }

        const response = await axiosClient.patch<ApiMediaItem>(
            `${MEDIA_ENDPOINT}${mediaId}/`,
            requestBody,
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
