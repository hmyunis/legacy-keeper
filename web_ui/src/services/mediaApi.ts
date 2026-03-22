import axiosClient from './axiosClient';
import type {
    ApiMediaItem,
    ApiMediaFile,
    ApiLinkedRelative,
    ApiMediaFilterSummary,
    ApiMediaExifStatusResponse,
    ApiMediaFaceDetectionStatusResponse,
    ApiMediaRestorationStatusResponse,
    ApiMediaRestorationResult,
    ApiDetectedFace,
    PaginatedApiResponse,
} from '../types/api.types';
import {
    MediaItem,
    MediaStatus,
    MediaExifStatus,
    MediaExifWorkflowStatus,
    MediaFaceDetectionStatus,
    MediaFaceDetectionWorkflowStatus,
    MediaRestorationStatus,
    MediaRestorationWorkflowStatus,
    MediaRestorationResult,
} from '../types';
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

const extractFileExtension = (value?: string | null): string => {
    const token = String(value || '').trim().toLowerCase();
    if (!token) return '';
    const sanitized = token.split('?')[0].split('#')[0];
    const lastDot = sanitized.lastIndexOf('.');
    if (lastDot < 0 || lastDot === sanitized.length - 1) return '';
    return sanitized.slice(lastDot);
};

const IMAGE_EXTENSIONS = new Set([
    '.jpg',
    '.jpeg',
    '.png',
    '.webp',
    '.gif',
    '.bmp',
    '.tif',
    '.tiff',
    '.avif',
    '.heic',
    '.heif',
]);
const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.webm', '.mkv', '.avi', '.m4v', '.mpeg', '.mpg']);
const AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac']);

const resolveMediaType = (file: File): MediaType => {
    const mime = file.type.toLowerCase();
    if (mime.startsWith('image/')) return MediaType.PHOTO;
    if (mime.startsWith('video/')) return MediaType.VIDEO;
    const extension = extractFileExtension(file.name);
    if (IMAGE_EXTENSIONS.has(extension)) return MediaType.PHOTO;
    if (VIDEO_EXTENSIONS.has(extension)) return MediaType.VIDEO;
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

const normalizeExifStatus = (value?: string | null): MediaExifStatus => {
    const normalized = String(value || '').trim().toUpperCase();
    const validStatuses = Object.values(MediaExifStatus);
    if (validStatuses.includes(normalized as MediaExifStatus)) {
        return normalized as MediaExifStatus;
    }
    return MediaExifStatus.NOT_STARTED;
};

const normalizeFaceDetectionStatus = (value?: string | null): MediaFaceDetectionStatus => {
    const normalized = String(value || '').trim().toUpperCase();
    const validStatuses = Object.values(MediaFaceDetectionStatus);
    if (validStatuses.includes(normalized as MediaFaceDetectionStatus)) {
        return normalized as MediaFaceDetectionStatus;
    }
    return MediaFaceDetectionStatus.NOT_STARTED;
};

const normalizeRestorationStatus = (value?: string | null): MediaRestorationStatus => {
    const normalized = String(value || '').trim().toUpperCase();
    const validStatuses = Object.values(MediaRestorationStatus);
    if (validStatuses.includes(normalized as MediaRestorationStatus)) {
        return normalized as MediaRestorationStatus;
    }
    return MediaRestorationStatus.NOT_STARTED;
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
    fileName?: string,
): 'PHOTO' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' => {
    const mime = String(mimeType || '').toLowerCase();
    if (mime.startsWith('image/')) return 'PHOTO';
    if (mime.startsWith('video/')) return 'VIDEO';
    if (mime.startsWith('audio/')) return 'AUDIO';

    const extension = extractFileExtension(fileName);
    if (IMAGE_EXTENSIONS.has(extension)) return 'PHOTO';
    if (VIDEO_EXTENSIONS.has(extension)) return 'VIDEO';
    if (AUDIO_EXTENSIONS.has(extension)) return 'AUDIO';

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
                const inferredFileType = resolveFileTypeFromMime(
                    entry.mimeType,
                    item.mediaType,
                    entry.originalName || entry.fileUrl || undefined,
                );
                const resolvedFileType =
                    normalizedFileType === 'PHOTO' ||
                    normalizedFileType === 'VIDEO' ||
                    normalizedFileType === 'AUDIO'
                        ? (normalizedFileType as 'PHOTO' | 'VIDEO' | 'AUDIO')
                        : normalizedFileType === 'DOCUMENT' && inferredFileType !== 'DOCUMENT'
                            ? inferredFileType
                            : normalizedFileType === 'DOCUMENT'
                                ? 'DOCUMENT'
                                : inferredFileType;
                return {
                    id: String(entry.id || fileUrl),
                    fileUrl,
                    fileSize: Number(entry.fileSize || 0),
                    mimeType: entry.mimeType || undefined,
                    fileType: resolvedFileType,
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
            fileType: resolveFileTypeFromMime(undefined, item.mediaType, item.title || fallbackUrl),
            originalName: item.title || 'Memory file',
            isPrimary: true,
            createdAt: item.createdAt,
        },
    ];
};

const parseDetectedFace = (
    entry: ApiDetectedFace | Record<string, unknown>,
): NonNullable<MediaItem['detectedFaces']>[number] | null => {
    if (!entry || typeof entry !== 'object') return null;

    const id = String((entry as any).id || '').trim();
    const fileId = String((entry as any).fileId ?? (entry as any).file_id ?? '').trim();
    if (!id || !fileId) return null;

    const rawBoundingBox = (entry as any).boundingBox ?? (entry as any).bounding_box;
    if (!rawBoundingBox || typeof rawBoundingBox !== 'object') return null;

    const x = Number((rawBoundingBox as any).x);
    const y = Number((rawBoundingBox as any).y);
    const width = Number((rawBoundingBox as any).width);
    const height = Number((rawBoundingBox as any).height);
    const isFiniteBox =
        Number.isFinite(x) &&
        Number.isFinite(y) &&
        Number.isFinite(width) &&
        Number.isFinite(height) &&
        x >= 0 &&
        y >= 0 &&
        width > 0 &&
        height > 0 &&
        x + width <= 1.000001 &&
        y + height <= 1.000001;
    if (!isFiniteBox) return null;

    const confidenceRaw = Number((entry as any).confidence ?? 0);
    const confidence = Number.isFinite(confidenceRaw)
        ? Math.max(0, Math.min(1, confidenceRaw))
        : 0;

    const personId = String((entry as any).personId ?? (entry as any).person_id ?? '').trim();
    const name = String((entry as any).name ?? '').trim();
    const thumbnailUrl = toAbsoluteUrl(
        String((entry as any).thumbnailUrl ?? (entry as any).thumbnail_url ?? '').trim(),
    );

    return {
        id,
        fileId,
        confidence,
        thumbnailUrl: thumbnailUrl || undefined,
        boundingBox: { x, y, width, height },
        personId: personId || undefined,
        name: name || undefined,
    };
};

const parseDetectedFaces = (item: ApiMediaItem | Record<string, unknown>): MediaItem['detectedFaces'] => {
    const rawFaces = Array.isArray((item as any).detectedFaces)
        ? ((item as any).detectedFaces as ApiDetectedFace[])
        : Array.isArray((item as any).detected_faces)
            ? ((item as any).detected_faces as ApiDetectedFace[])
            : [];
    return rawFaces
        .map((entry) => parseDetectedFace(entry))
        .filter(Boolean) as MediaItem['detectedFaces'];
};

const parseRestorationOptions = (
    options?: Record<string, unknown> | null,
    defaults: { colorize: boolean; denoise: boolean } = { colorize: true, denoise: true },
): { colorize: boolean; denoise: boolean } => ({
    colorize: Boolean((options as any)?.colorize ?? defaults.colorize),
    denoise: Boolean((options as any)?.denoise ?? defaults.denoise),
});

const parseRestorationResult = (
    entry: ApiMediaRestorationResult | Record<string, unknown> | null | undefined,
): MediaRestorationResult | null => {
    if (!entry || typeof entry !== 'object') return null;

    const fileId = String((entry as any).fileId ?? (entry as any).file_id ?? '').trim();
    if (!fileId) return null;

    const restoredPath = String((entry as any).restoredPath ?? (entry as any).restored_path ?? '').trim();
    const restoredUrl = toAbsoluteUrl(String((entry as any).restoredUrl ?? (entry as any).restored_url ?? '').trim());
    const warnings = Array.isArray((entry as any).warnings)
        ? (entry as any).warnings.map((warning: unknown) => String(warning).trim()).filter(Boolean)
        : [];

    return {
        fileId,
        originalName: String((entry as any).originalName ?? (entry as any).original_name ?? 'Memory file').trim() || 'Memory file',
        isPrimary: Boolean((entry as any).isPrimary ?? (entry as any).is_primary),
        restoredPath: restoredPath || undefined,
        restoredUrl: restoredUrl || undefined,
        processedAt:
            typeof (entry as any).processedAt === 'string'
                ? (entry as any).processedAt
                : typeof (entry as any).processed_at === 'string'
                    ? (entry as any).processed_at
                    : undefined,
        taskId: String((entry as any).taskId ?? (entry as any).task_id ?? '').trim() || undefined,
        width: Number.isFinite(Number((entry as any).width)) ? Number((entry as any).width) : undefined,
        height: Number.isFinite(Number((entry as any).height)) ? Number((entry as any).height) : undefined,
        detectedBlackAndWhite: Boolean(
            (entry as any).detectedBlackAndWhite ?? (entry as any).detected_black_and_white,
        ),
        requestedOptions: parseRestorationOptions(
            ((entry as any).requestedOptions ??
                (entry as any).requested_options ??
                null) as Record<string, unknown> | null,
        ),
        appliedOptions: parseRestorationOptions(
            ((entry as any).appliedOptions ??
                (entry as any).applied_options ??
                null) as Record<string, unknown> | null,
            { colorize: false, denoise: false },
        ),
        warnings: warnings.length ? warnings : undefined,
    };
};

const mapApiMediaToMediaItem = (item: ApiMediaItem): MediaItem => {
    const files = mapApiFiles(item);
    const primaryFile = files.find((file) => file.isPrimary) || files[0];
    const thumbnailFile = files.find((file) => file.fileType === 'PHOTO') || primaryFile;
    const inferredPrimaryMediaType =
        primaryFile?.fileType === 'PHOTO'
            ? MediaType.PHOTO
            : primaryFile?.fileType === 'VIDEO'
                ? MediaType.VIDEO
                : MediaType.DOCUMENT;
    const resolvedMediaType =
        item.mediaType === MediaType.DOCUMENT &&
        inferredPrimaryMediaType === MediaType.PHOTO
            ? MediaType.PHOTO
            : item.mediaType;

    return {
        id: String(item.id),
        vaultId: String(item.vault),
        uploaderId: item.uploader ? String(item.uploader) : '',
        uploaderName: String(item.uploaderName ?? (item as any).uploader_name ?? '').trim() || undefined,
        uploaderAvatar: toAbsoluteUrl(String(item.uploaderAvatar ?? (item as any).uploader_avatar ?? '').trim()) || undefined,
        linkedRelatives: parseLinkedRelatives(item),
        isFavorite: Boolean(item.isFavorite),
        type: resolvedMediaType,
        visibility: normalizeVisibility((item as any).visibility),
        title: item.title || 'Untitled memory',
        description: item.description || '',
        dateTaken: item.dateTaken || item.createdAt,
        uploadTimestamp: item.createdAt,
        thumbnailUrl: thumbnailFile?.fileUrl || 'https://placehold.co/600x800?text=Memory',
        fileUrl: primaryFile?.fileUrl || undefined,
        tags: parseMetadataTags(item.metadata),
        status: (item.aiStatus as MediaStatus) || MediaStatus.PENDING,
        exifStatus: normalizeExifStatus(item.exifStatus),
        exifError: String(item.exifError || '').trim() || undefined,
        exifProcessedAt: item.exifProcessedAt || undefined,
        exifConfirmedAt: item.exifConfirmedAt || undefined,
        faceDetectionStatus: normalizeFaceDetectionStatus(
            (item as any).faceDetectionStatus ?? (item as any).face_detection_status,
        ),
        faceDetectionError: String(
            (item as any).faceDetectionError ?? (item as any).face_detection_error ?? '',
        ).trim() || undefined,
        faceDetectionProcessedAt:
            (item as any).faceDetectionProcessedAt ??
            (item as any).face_detection_processed_at ??
            undefined,
        restorationStatus: normalizeRestorationStatus(
            (item as any).restorationStatus ?? (item as any).restoration_status,
        ),
        restorationError: String(
            (item as any).restorationError ?? (item as any).restoration_error ?? '',
        ).trim() || undefined,
        restorationProcessedAt:
            (item as any).restorationProcessedAt ??
            (item as any).restoration_processed_at ??
            undefined,
        location: parseMetadataLocation(item.metadata),
        metadata: (item.metadata && typeof item.metadata === 'object' ? item.metadata : {}) as Record<string, unknown>,
        files,
        detectedFaces: parseDetectedFaces(item),
    };
};

const unwrapList = <T>(payload: T[] | PaginatedApiResponse<T> | null | undefined): T[] => {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.results)) return payload.results;
    return [];
};

export interface UploadMediaPayload {
    files: File[];
    primaryFileIndex?: number;
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

export interface ConfirmExifPayload {
    action: 'accept' | 'reject';
    applyDateTaken?: boolean;
    applyGps?: boolean;
    candidateFileId?: string;
}

export interface RotateMediaFilePayload {
    fileId?: string;
    degrees: number;
}

export interface RestoreMediaFilePayload {
    fileId?: string;
    colorize?: boolean;
    denoise?: boolean;
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

const parseExifCandidate = (candidate: Record<string, unknown> | null | undefined) => {
    if (!candidate || typeof candidate !== 'object') return null;

    const rawGps = candidate.gps;
    const gps =
        rawGps &&
        typeof rawGps === 'object' &&
        typeof (rawGps as any).latitude === 'number' &&
        typeof (rawGps as any).longitude === 'number'
            ? {
                latitude: (rawGps as any).latitude,
                longitude: (rawGps as any).longitude,
            }
            : undefined;

    const fileId = String((candidate as any).fileId ?? (candidate as any).file_id ?? '').trim();
    if (!fileId) return null;

    const originalName = String((candidate as any).originalName ?? (candidate as any).original_name ?? '').trim() || 'Memory file';
    const dateTaken =
        typeof (candidate as any).dateTaken === 'string'
            ? (candidate as any).dateTaken
            : typeof (candidate as any).date_taken === 'string'
                ? (candidate as any).date_taken
                : undefined;
    const extractedAt =
        typeof (candidate as any).extractedAt === 'string'
            ? (candidate as any).extractedAt
            : typeof (candidate as any).extracted_at === 'string'
                ? (candidate as any).extracted_at
                : undefined;

    return {
        fileId,
        originalName,
        isPrimary: Boolean((candidate as any).isPrimary ?? (candidate as any).is_primary),
        dateTaken,
        gps,
        extractedAt,
    };
};

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

    getExifStatus: async (mediaId: string): Promise<MediaExifWorkflowStatus> => {
        const response = await axiosClient.get<ApiMediaExifStatusResponse | Record<string, unknown>>(
            `${MEDIA_ENDPOINT}${mediaId}/exif-status/`,
        );
        const payload: any = response.data || {};
        const parsedCandidates = Array.isArray(payload.candidates)
            ? payload.candidates
                .map((entry: unknown) => parseExifCandidate(entry as Record<string, unknown>))
                .filter(Boolean)
            : [];
        const selectedCandidate = parseExifCandidate(
            payload.candidate && typeof payload.candidate === 'object' ? payload.candidate : undefined,
        );
        const fallbackCandidate = selectedCandidate || parsedCandidates[0];

        return {
            mediaId: String(payload.mediaId ?? payload.media_id ?? mediaId),
            status: normalizeExifStatus(payload.status),
            error: String(payload.error || '').trim() || undefined,
            taskId: String(payload.taskId ?? payload.task_id ?? '').trim() || undefined,
            processedAt: typeof payload.processedAt === 'string' ? payload.processedAt : undefined,
            confirmedAt: typeof payload.confirmedAt === 'string' ? payload.confirmedAt : undefined,
            requiresConfirmation: Boolean(payload.requiresConfirmation ?? payload.requires_confirmation),
            candidate: fallbackCandidate || undefined,
            candidates: parsedCandidates,
            selectedFileId:
                String(payload.selectedFileId ?? payload.selected_file_id ?? '').trim() || fallbackCandidate?.fileId,
            warnings: Array.isArray(payload.warnings)
                ? payload.warnings.map((warning: unknown) => String(warning).trim()).filter(Boolean)
                : undefined,
        };
    },

    getFaceDetectionStatus: async (mediaId: string): Promise<MediaFaceDetectionWorkflowStatus> => {
        const response = await axiosClient.get<ApiMediaFaceDetectionStatusResponse | Record<string, unknown>>(
            `${MEDIA_ENDPOINT}${mediaId}/face-detection-status/`,
        );
        const payload: any = response.data || {};
        const faces = Array.isArray(payload.faces)
            ? payload.faces
                .map((entry: unknown) => parseDetectedFace(entry as ApiDetectedFace))
                .filter(Boolean)
            : [];

        const faceCountRaw = Number(payload.faceCount ?? payload.face_count);
        const faceCount = Number.isFinite(faceCountRaw) ? faceCountRaw : faces.length;

        return {
            mediaId: String(payload.mediaId ?? payload.media_id ?? mediaId),
            status: normalizeFaceDetectionStatus(payload.status),
            error: String(payload.error || '').trim() || undefined,
            taskId: String(payload.taskId ?? payload.task_id ?? '').trim() || undefined,
            processedAt:
                typeof payload.processedAt === 'string'
                    ? payload.processedAt
                    : typeof payload.processed_at === 'string'
                        ? payload.processed_at
                        : undefined,
            faceCount,
            faces,
            warnings: Array.isArray(payload.warnings)
                ? payload.warnings.map((warning: unknown) => String(warning).trim()).filter(Boolean)
                : undefined,
        };
    },

    getRestorationStatus: async (
        mediaId: string,
        fileId?: string,
    ): Promise<MediaRestorationWorkflowStatus> => {
        const response = await axiosClient.get<ApiMediaRestorationStatusResponse | Record<string, unknown>>(
            `${MEDIA_ENDPOINT}${mediaId}/restoration-status/`,
            {
                params: fileId ? { fileId } : undefined,
            },
        );
        const payload: any = response.data || {};
        const parsedResult = parseRestorationResult(
            payload.result && typeof payload.result === 'object'
                ? (payload.result as ApiMediaRestorationResult)
                : undefined,
        );
        const parsedResults = Array.isArray(payload.results)
            ? payload.results
                .map((entry: unknown) => parseRestorationResult(entry as ApiMediaRestorationResult))
                .filter(Boolean)
            : [];
        const warnings = Array.isArray(payload.warnings)
            ? payload.warnings.map((warning: unknown) => String(warning).trim()).filter(Boolean)
            : parsedResult?.warnings;

        return {
            mediaId: String(payload.mediaId ?? payload.media_id ?? mediaId),
            status: normalizeRestorationStatus(payload.status),
            error: String(payload.error || '').trim() || undefined,
            taskId: String(payload.taskId ?? payload.task_id ?? '').trim() || undefined,
            processedAt:
                typeof payload.processedAt === 'string'
                    ? payload.processedAt
                    : typeof payload.processed_at === 'string'
                        ? payload.processed_at
                        : undefined,
            selectedFileId:
                String(payload.selectedFileId ?? payload.selected_file_id ?? fileId ?? '').trim() ||
                parsedResult?.fileId,
            requestedOptions: parseRestorationOptions(
                (payload.requestedOptions ?? payload.requested_options ?? null) as
                    | Record<string, unknown>
                    | null,
            ),
            result: parsedResult || undefined,
            results: parsedResults as MediaRestorationResult[],
            warnings: warnings && warnings.length ? warnings : undefined,
        };
    },

    restoreMediaFile: async (
        mediaId: string,
        payload: RestoreMediaFilePayload,
    ): Promise<MediaRestorationWorkflowStatus> => {
        const response = await axiosClient.post<ApiMediaRestorationStatusResponse | Record<string, unknown>>(
            `${MEDIA_ENDPOINT}${mediaId}/restore/`,
            {
                fileId: payload.fileId || undefined,
                colorize: payload.colorize ?? true,
                denoise: payload.denoise ?? true,
            },
        );
        const normalized = response.data || {};
        const requestedFileId =
            String((normalized as any).selectedFileId ?? (normalized as any).selected_file_id ?? payload.fileId ?? '').trim() ||
            payload.fileId;
        return mediaApi.getRestorationStatus(mediaId, requestedFileId);
    },

    confirmExif: async (mediaId: string, payload: ConfirmExifPayload): Promise<MediaItem> => {
        const response = await axiosClient.post<ApiMediaItem>(`${MEDIA_ENDPOINT}${mediaId}/exif-confirm/`, {
            action: payload.action,
            applyDateTaken: payload.applyDateTaken ?? true,
            applyGps: payload.applyGps ?? true,
            candidateFileId: payload.candidateFileId || undefined,
        });
        return mapApiMediaToMediaItem(response.data);
    },

    rotateMediaFile: async (mediaId: string, payload: RotateMediaFilePayload): Promise<MediaItem> => {
        const response = await axiosClient.post<ApiMediaItem>(`${MEDIA_ENDPOINT}${mediaId}/rotate/`, {
            fileId: payload.fileId || undefined,
            degrees: payload.degrees,
        });
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

        const normalizedPrimaryFileIndex =
            typeof payload.primaryFileIndex === 'number' &&
            Number.isInteger(payload.primaryFileIndex) &&
            payload.primaryFileIndex >= 0 &&
            payload.primaryFileIndex < payload.files.length
                ? payload.primaryFileIndex
                : 0;
        const primaryFile = payload.files[normalizedPrimaryFileIndex];
        const formData = new FormData();
        formData.append('vault', vaultId);
        formData.append('file', primaryFile);
        formData.append('primaryFileIndex', String(normalizedPrimaryFileIndex));
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
