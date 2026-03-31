import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    X,
    Calendar,
    Plus,
    Trash2,
    Share2,
    Heart,
    MapPin,
    Download,
    Loader2,
    FileText,
    Music2,
    Film,
    Pencil,
    Save,
    Lock,
    Users,
    Eye,
    EyeOff,
    Camera,
    Aperture,
    Maximize2,
    RotateCcw,
    RotateCw,
    Sparkles,
    ExternalLink,
} from 'lucide-react';
import {
    MediaExifStatus,
    MediaFaceDetectionStatus,
    MediaLockRule,
    MediaItem,
    MediaRestorationStatus,
    PersonProfile,
} from '../../types';
import { useProfiles } from '../../hooks/useProfiles';
import { useAuthStore } from '../../stores/authStore';
import {
    useCreateMediaTag,
    useDeleteMediaTag,
    useMediaTags,
    useDownloadMedia,
    useUpdateMediaTag,
} from '../../hooks/useMediaTags';
import {
    useConfirmMediaExif,
    useMediaExifStatus,
    useMediaFaceDetectionStatus,
    useMediaRestorationStatus,
    useRestoreMediaFile,
    useRotateMediaFile,
} from '../../hooks/useMedia';
import { toast } from 'sonner';
import DatePicker from '../DatePicker';
import type { UpdateMediaMetadataPayload } from '../../services/mediaApi';
import PresignedImage from '../ui/PresignedImage';
import { useSignedUrlRecovery } from '../../hooks/useSignedUrlRecovery';
import { useTranslation } from '../../i18n/LanguageContext';
import { Select, SelectContent, SelectItem, SelectTrigger } from '../ui/Select';
import { canManageMediaActions } from '@/features/vault/utils';

// --- Interfaces & Constants ---
interface MediaDetailModalProps {
    media: MediaItem;
    relatedMedia?: MediaItem[];
    lockTargetCandidates: Array<{
        userId: string;
        fullName: string;
        email: string;
    }>;
    safetyWindowMinutes?: number;
    isFavorite: boolean;
    isTagInputVisible: boolean;
    manualTagValue: string;
    onClose: () => void;
    onSelectRelatedMedia?: (media: MediaItem) => void;
    onToggleFavorite: (e: React.MouseEvent, id: string) => void;
    onDelete: (id: string) => void;
    onAddTag: (tag: string) => void;
    onRemoveTag: (tag: string) => void;
    onTagInputChange: (val: string) => void;
    setTagInputVisible: (visible: boolean) => void;
    onManualTagSubmit: (e?: React.FormEvent) => void;
    onUpdateMedia: (
        payload: UpdateMediaMetadataPayload,
        onSuccess?: (updatedMedia: MediaItem) => void,
    ) => void;
    onSyncMedia?: (updatedMedia: MediaItem) => void;
    shouldPollExif?: boolean;
    isUpdatingMedia?: boolean;
}

interface EditDraft {
    title: string;
    story: string;
    location: string;
    tags: string;
    visibility: 'private' | 'family';
    lockRule: MediaLockRule;
    lockReleaseAt: string;
    lockTargetUserIds: string[];
    dateTaken?: Date;
}

interface NormalizedRectangle {
    x: number;
    y: number;
    w: number;
    h: number;
}

interface ManualAnnotation {
    tagId: string;
    personId: string;
    personName: string;
    coordinates: NormalizedRectangle;
}

const MAX_MEMORY_FILES = 10;
const MIN_MANUAL_BOX_SIZE = 0.015;
const LOCK_HOUR_OPTIONS = Array.from({ length: 24 }, (_, index) =>
    String(index).padStart(2, '0'),
);
const LOCK_MINUTE_OPTIONS = ['00', '15', '30', '45'];

// --- Helper Functions ---
const toFaceCoordinatesPayload = (face: NonNullable<MediaItem['detectedFaces']>[number]) => ({
    x: face.boundingBox.x,
    y: face.boundingBox.y,
    w: face.boundingBox.width,
    h: face.boundingBox.height,
});

const clampNormalizedValue = (value: number) => Math.max(0, Math.min(1, value));

const normalizeFaceCoordinates = (
    value?: Record<string, number> | null,
): NormalizedRectangle | null => {
    if (!value || typeof value !== 'object') return null;
    const width = Number(value.w ?? value.width);
    const height = Number(value.h ?? value.height);
    const x = Number(value.x);
    const y = Number(value.y);
    if (
        !Number.isFinite(x) ||
        !Number.isFinite(y) ||
        !Number.isFinite(width) ||
        !Number.isFinite(height)
    )
        return null;
    if (width <= 0 || height <= 0) return null;
    const clampedX = clampNormalizedValue(x);
    const clampedY = clampNormalizedValue(y);
    const clampedWidth = Math.max(0, Math.min(clampNormalizedValue(width), 1 - clampedX));
    const clampedHeight = Math.max(0, Math.min(clampNormalizedValue(height), 1 - clampedY));
    if (clampedWidth <= 0 || clampedHeight <= 0) return null;
    return { x: clampedX, y: clampedY, w: clampedWidth, h: clampedHeight };
};

const parseLocalDateTime = (value: string): Date | undefined => {
    const normalized = String(value || '').trim();
    if (!normalized) return undefined;
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) return undefined;
    return parsed;
};

const formatLocalDateTime = (value: Date): string => {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    const hour = String(value.getHours()).padStart(2, '0');
    const minute = String(value.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hour}:${minute}`;
};

const toEditDraft = (media: MediaItem): EditDraft => {
    const parsedDate = media.dateTaken ? new Date(media.dateTaken) : undefined;
    const parsedLockReleaseAt = media.lockReleaseAt ? new Date(media.lockReleaseAt) : null;
    const lockReleaseAtInput =
        parsedLockReleaseAt && !Number.isNaN(parsedLockReleaseAt.getTime())
            ? `${parsedLockReleaseAt.getFullYear()}-${String(parsedLockReleaseAt.getMonth() + 1).padStart(2, '0')}-${String(parsedLockReleaseAt.getDate()).padStart(2, '0')}T${String(parsedLockReleaseAt.getHours()).padStart(2, '0')}:${String(parsedLockReleaseAt.getMinutes()).padStart(2, '0')}`
            : '';
    return {
        title: media.title || '',
        story: media.description || '',
        location: media.location || '',
        tags: (media.tags || []).join(', '),
        visibility: media.visibility || 'family',
        lockRule: media.lockRule === 'time_or_target' ? 'time_and_target' : media.lockRule || 'none',
        lockReleaseAt: lockReleaseAtInput,
        lockTargetUserIds: media.lockTargetUserIds || [],
        dateTaken: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : undefined,
    };
};

const MediaDetailModal: React.FC<MediaDetailModalProps> = ({
    media,
    isFavorite,
    lockTargetCandidates,
    safetyWindowMinutes,
    isTagInputVisible,
    manualTagValue,
    onClose,
    onToggleFavorite,
    onDelete,
    onTagInputChange,
    onManualTagSubmit,
    onRemoveTag,
    setTagInputVisible,
    onUpdateMedia,
    onSyncMedia,
    shouldPollExif = false,
    isUpdatingMedia = false,
}) => {
    const { t } = useTranslation();
    const faceStatusLabels: Record<MediaFaceDetectionStatus, string> = {
        [MediaFaceDetectionStatus.NOT_STARTED]: 'Not started',
        [MediaFaceDetectionStatus.QUEUED]: 'Queued',
        [MediaFaceDetectionStatus.PROCESSING]: 'Processing',
        [MediaFaceDetectionStatus.COMPLETED]: t.common.status.completed,
        [MediaFaceDetectionStatus.NOT_AVAILABLE]: 'No faces detected',
        [MediaFaceDetectionStatus.FAILED]: 'Failed',
    };
    const restorationStatusLabels: Record<MediaRestorationStatus, string> = {
        [MediaRestorationStatus.NOT_STARTED]: 'Ready',
        [MediaRestorationStatus.QUEUED]: 'Queued',
        [MediaRestorationStatus.PROCESSING]: 'Processing',
        [MediaRestorationStatus.COMPLETED]: t.common.status.completed,
        [MediaRestorationStatus.NOT_AVAILABLE]: 'Not available',
        [MediaRestorationStatus.FAILED]: 'Failed',
    };
    // --- State ---
    const [taggingFaceId, setTaggingFaceId] = useState<string | null>(null);
    const [localFaces, setLocalFaces] = useState(media.detectedFaces || []);
    const [isLinkPickerOpen, setIsLinkPickerOpen] = useState(false);
    const [activeFileId, setActiveFileId] = useState<string | null>(null);
    const [isSharing, setIsSharing] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editDraft, setEditDraft] = useState<EditDraft>(() => toEditDraft(media));
    const [pendingRemovedFileIds, setPendingRemovedFileIds] = useState<Set<string>>(new Set());
    const [pendingNewFiles, setPendingNewFiles] = useState<File[]>([]);
    const [selectedExifCandidateFileId, setSelectedExifCandidateFileId] = useState<string>('');
    const [isManualDrawMode, setIsManualDrawMode] = useState(false);
    const [manualDrawStartPoint, setManualDrawStartPoint] = useState<{
        x: number;
        y: number;
    } | null>(null);
    const [draftManualRectangle, setDraftManualRectangle] = useState<NormalizedRectangle | null>(
        null,
    );
    const [pendingManualAnnotation, setPendingManualAnnotation] = useState<{
        coordinates: NormalizedRectangle;
        fileId: string;
        tagId?: string;
    } | null>(null);
    const [showTagBoxes, setShowTagBoxes] = useState(true);
    const [previewRotationByFileId, setPreviewRotationByFileId] = useState<Record<string, number>>(
        {},
    );
    const [restorationOptions, setRestorationOptions] = useState({
        colorize: true,
        denoise: true,
    });
    const [comparePosition, setComparePosition] = useState(0);
    const editFileInputRef = useRef<HTMLInputElement>(null);
    const faceAnchorRefs = useRef<Record<string, HTMLButtonElement | null>>({});
    const { currentUser } = useAuthStore();

    // --- Hooks & Queries ---
    const { data: profilesData } = useProfiles();
    const profiles = useMemo(
        () => profilesData?.pages.flatMap((page) => page.items) || [],
        [profilesData],
    );

    const { data: mediaTags } = useMediaTags(media.id);
    const createMediaTagMutation = useCreateMediaTag();
    const updateMediaTagMutation = useUpdateMediaTag();
    const deleteMediaTagMutation = useDeleteMediaTag();
    const downloadMediaMutation = useDownloadMedia();
    const confirmMediaExifMutation = useConfirmMediaExif();
    const rotateMediaFileMutation = useRotateMediaFile();
    const restoreMediaFileMutation = useRestoreMediaFile();
    const recoverSignedUrls = useSignedUrlRecovery();

    const { data: exifStatusData } = useMediaExifStatus(media.id, {
        enabled:
            media.type === 'PHOTO' ||
            (media.exifStatus !== MediaExifStatus.NOT_STARTED &&
                media.exifStatus !== MediaExifStatus.NOT_AVAILABLE),
        poll: shouldPollExif,
    });

    const { data: faceStatusData } = useMediaFaceDetectionStatus(media.id, {
        enabled: media.type === 'PHOTO',
        poll: true,
    });

    // --- Computed State ---
    const canEdit = canManageMediaActions({
        role: currentUser?.role,
        currentUserId: currentUser?.id,
        uploaderId: media.uploaderId,
        uploadTimestamp: media.uploadTimestamp,
        safetyWindowMinutes,
    });
    const canDelete = canEdit;

    const effectiveExifStatus =
        exifStatusData?.status || media.exifStatus || MediaExifStatus.NOT_STARTED;
    const exifCandidates = useMemo(
        () =>
            exifStatusData?.candidates?.length
                ? exifStatusData.candidates
                : exifStatusData?.candidate
                  ? [exifStatusData.candidate]
                  : [],
        [exifStatusData],
    );
    const exifNeedsConfirmation =
        (exifStatusData?.requiresConfirmation ?? false) ||
        effectiveExifStatus === MediaExifStatus.AWAITING_CONFIRMATION;

    const selectedExifCandidate = useMemo(() => {
        if (!exifCandidates.length) return undefined;
        if (selectedExifCandidateFileId)
            return (
                exifCandidates.find((c) => c.fileId === selectedExifCandidateFileId) ||
                exifCandidates[0]
            );
        return exifCandidates[0];
    }, [exifCandidates, selectedExifCandidateFileId]);
    const hasExifDateCandidate = Boolean(
        selectedExifCandidate?.dateTaken &&
        !Number.isNaN(new Date(selectedExifCandidate.dateTaken).getTime()),
    );
    const hasExifGpsCandidate = Boolean(
        selectedExifCandidate?.gps &&
        typeof selectedExifCandidate.gps.latitude === 'number' &&
        typeof selectedExifCandidate.gps.longitude === 'number',
    );
    const selectedExifDatePreview = useMemo(() => {
        if (!selectedExifCandidate?.dateTaken) return '';
        const parsed = new Date(selectedExifCandidate.dateTaken);
        if (Number.isNaN(parsed.getTime())) return selectedExifCandidate.dateTaken;
        return parsed.toLocaleString();
    }, [selectedExifCandidate?.dateTaken]);
    const selectedExifGpsPreview = hasExifGpsCandidate
        ? `${selectedExifCandidate!.gps!.latitude.toFixed(6)}, ${selectedExifCandidate!.gps!.longitude.toFixed(6)}`
        : '';
    const locationMapHref = useMemo(() => {
        if (hasExifGpsCandidate) {
            const latitude = selectedExifCandidate!.gps!.latitude;
            const longitude = selectedExifCandidate!.gps!.longitude;
            return `https://maps.google.com/?q=${latitude},${longitude}`;
        }

        const normalizedLocation = media.location?.trim();
        if (normalizedLocation) {
            return `https://maps.google.com/?q=${encodeURIComponent(normalizedLocation)}`;
        }

        return undefined;
    }, [
        hasExifGpsCandidate,
        selectedExifCandidate?.gps?.latitude,
        selectedExifCandidate?.gps?.longitude,
        media.location,
    ]);
    const locationPreviewText = hasExifGpsCandidate
        ? selectedExifGpsPreview
        : media.location?.trim() || t.vault.detail.locationViaMap;
    const lockTargetUsersForDisplay = useMemo(() => {
        const candidateById = new Map(
            lockTargetCandidates.map((candidate) => [String(candidate.userId), candidate]),
        );
        const normalizedUsers: Array<{ id: string; fullName: string; email: string }> = [];
        const seen = new Set<string>();

        const mediaUsers = Array.isArray(media.lockTargetUsers) ? media.lockTargetUsers : [];
        for (const user of mediaUsers) {
            const id = String(user?.id || '').trim();
            if (!id || seen.has(id)) continue;
            const fallbackCandidate = candidateById.get(id);
            seen.add(id);
            normalizedUsers.push({
                id,
                fullName: String(user?.fullName || fallbackCandidate?.fullName || '').trim(),
                email: String(user?.email || fallbackCandidate?.email || '').trim(),
            });
        }

        const targetIds = Array.isArray(media.lockTargetUserIds) ? media.lockTargetUserIds : [];
        for (const rawId of targetIds) {
            const id = String(rawId || '').trim();
            if (!id || seen.has(id)) continue;
            const fallbackCandidate = candidateById.get(id);
            seen.add(id);
            normalizedUsers.push({
                id,
                fullName: String(fallbackCandidate?.fullName || '').trim(),
                email: String(fallbackCandidate?.email || '').trim(),
            });
        }

        return normalizedUsers;
    }, [lockTargetCandidates, media.lockTargetUserIds, media.lockTargetUsers]);

    const effectiveFaceStatus =
        faceStatusData?.status || media.faceDetectionStatus || MediaFaceDetectionStatus.NOT_STARTED;
    const isFaceDetectionInProgress =
        effectiveFaceStatus === MediaFaceDetectionStatus.QUEUED ||
        effectiveFaceStatus === MediaFaceDetectionStatus.PROCESSING;

    const memoryFiles = useMemo(() => {
        if (media.files?.length) {
            return [...media.files].sort((a, b) =>
                a.isPrimary === b.isPrimary ? 0 : a.isPrimary ? -1 : 1,
            );
        }
        if (!media.fileUrl) return [];
        return [
            {
                id: `fallback-${media.id}`,
                fileUrl: media.fileUrl,
                fileSize: 0,
                fileType:
                    media.type === 'VIDEO'
                        ? 'VIDEO'
                        : media.type === 'PHOTO'
                          ? 'PHOTO'
                          : 'DOCUMENT',
                originalName: media.title || 'Memory file',
                isPrimary: true,
            },
        ];
    }, [media]);

    // --- Effects ---
    useEffect(() => {
        setLocalFaces(media.detectedFaces || []);
        setTaggingFaceId(null);
        setIsLinkPickerOpen(false);
        setIsEditMode(false);
        setEditDraft(toEditDraft(media));
        setPendingRemovedFileIds(new Set());
        setPendingNewFiles([]);
        setSelectedExifCandidateFileId('');
        setIsManualDrawMode(false);
        setManualDrawStartPoint(null);
        setDraftManualRectangle(null);
        setPendingManualAnnotation(null);
        setPreviewRotationByFileId({});
        setRestorationOptions({ colorize: true, denoise: true });
        setComparePosition(0);
    }, [media.id, media.detectedFaces]);

    useEffect(() => {
        if (faceStatusData?.faces) setLocalFaces(faceStatusData.faces);
    }, [faceStatusData?.faces, media.id]);

    useEffect(() => {
        if (!taggingFaceId) return;
        const closeDropdown = () => setTaggingFaceId(null);
        window.addEventListener('resize', closeDropdown);
        window.addEventListener('scroll', closeDropdown, true);
        return () => {
            window.removeEventListener('resize', closeDropdown);
            window.removeEventListener('scroll', closeDropdown, true);
        };
    }, [taggingFaceId]);

    useEffect(() => {
        if (!exifCandidates.length) {
            setSelectedExifCandidateFileId('');
            return;
        }
        const selectedFromServer =
            exifStatusData?.selectedFileId || exifStatusData?.candidate?.fileId;
        setSelectedExifCandidateFileId((prev) =>
            prev && exifCandidates.some((c) => c.fileId === prev)
                ? prev
                : selectedFromServer || exifCandidates[0]?.fileId || '',
        );
    }, [exifCandidates, exifStatusData]);

    // --- Logic for Files & Faces ---
    const linkedPersonIds = useMemo(() => {
        const ids = new Set((mediaTags || []).map((tag) => tag.personId));
        for (const face of localFaces) {
            if (face.personId) ids.add(face.personId);
        }
        return ids;
    }, [localFaces, mediaTags]);
    const linkedProfiles = useMemo(
        () => profiles.filter((profile) => linkedPersonIds.has(profile.id)),
        [linkedPersonIds, profiles],
    );
    const availableProfiles = useMemo(
        () => profiles.filter((profile) => !linkedPersonIds.has(profile.id)),
        [linkedPersonIds, profiles],
    );

    const activeExistingFiles = useMemo(
        () => memoryFiles.filter((file) => !pendingRemovedFileIds.has(file.id)),
        [memoryFiles, pendingRemovedFileIds],
    );
    const projectedFileCount = activeExistingFiles.length + pendingNewFiles.length;

    const activeFile = useMemo(() => {
        const candidateFiles = isEditMode ? activeExistingFiles : memoryFiles;
        if (!candidateFiles.length) return null;
        if (activeFileId)
            return candidateFiles.find((file) => file.id === activeFileId) || candidateFiles[0];
        return candidateFiles.find((file) => file.isPrimary) || candidateFiles[0];
    }, [activeExistingFiles, activeFileId, isEditMode, memoryFiles]);

    const activeFileFaces = useMemo(() => {
        if (!activeFile || activeFile.fileType !== 'PHOTO') return [];
        return (localFaces || [])
            .filter((face) =>
                face.fileId ? face.fileId === activeFile.id : Boolean(activeFile.isPrimary),
            )
            .sort((a, b) =>
                Math.abs(a.boundingBox.y - b.boundingBox.y) > 0.0001
                    ? a.boundingBox.y - b.boundingBox.y
                    : a.boundingBox.x - b.boundingBox.x,
            );
    }, [activeFile, localFaces]);
    const activePreviewRotation = activeFile ? previewRotationByFileId[activeFile.id] || 0 : 0;
    const {
        data: restorationStatusData,
        refetch: refetchRestorationStatus,
    } = useMediaRestorationStatus(media.id, activeFile?.id, {
        enabled: activeFile?.fileType === 'PHOTO',
        poll: true,
    });
    const effectiveRestorationStatus =
        restorationStatusData?.status ||
        media.restorationStatus ||
        MediaRestorationStatus.NOT_STARTED;
    const isRestorationInProgress =
        effectiveRestorationStatus === MediaRestorationStatus.QUEUED ||
        effectiveRestorationStatus === MediaRestorationStatus.PROCESSING;
    const activeRestorationResult = useMemo(() => {
        if (!activeFile || activeFile.fileType !== 'PHOTO') return undefined;
        const selectedResult =
            restorationStatusData?.result &&
            restorationStatusData.result.fileId === activeFile.id
                ? restorationStatusData.result
                : undefined;
        if (selectedResult) return selectedResult;
        return restorationStatusData?.results.find((result) => result.fileId === activeFile.id);
    }, [activeFile, restorationStatusData?.result, restorationStatusData?.results]);
    const restorationWarnings = useMemo(() => {
        if (activeRestorationResult?.warnings?.length) return activeRestorationResult.warnings;
        return restorationStatusData?.warnings || [];
    }, [activeRestorationResult?.warnings, restorationStatusData?.warnings]);

    const manualAnnotations = useMemo<ManualAnnotation[]>(() => {
        if (!activeFile || activeFile.fileType !== 'PHOTO') return [];
        return (mediaTags || [])
            .map((tag) => {
                if (tag.detectedFaceId) return null;
                const coords = normalizeFaceCoordinates(tag.faceCoordinates);
                if (!coords) return null;
                if (tag.taggedFileId && tag.taggedFileId !== activeFile.id) return null;
                if (!tag.taggedFileId && !activeFile.isPrimary) return null;
                return {
                    tagId: tag.id,
                    personId: tag.personId,
                    personName: tag.personName,
                    coordinates: coords,
                };
            })
            .filter((tag): tag is ManualAnnotation => Boolean(tag));
    }, [activeFile, mediaTags]);

    const pendingManualLinkedPersonId = useMemo(() => {
        if (!pendingManualAnnotation?.tagId) return '';
        return (
            manualAnnotations.find((a) => a.tagId === pendingManualAnnotation.tagId)?.personId || ''
        );
    }, [manualAnnotations, pendingManualAnnotation]);

    const manualAnnotationProfiles = useMemo(
        () =>
            availableProfiles.filter((p) => p.id !== pendingManualLinkedPersonId),
        [availableProfiles, pendingManualLinkedPersonId],
    );
    const isManualAnnotationSaving =
        createMediaTagMutation.isPending || updateMediaTagMutation.isPending;

    // --- Handlers ---
    useEffect(() => {
        const candidateFiles = isEditMode ? activeExistingFiles : memoryFiles;
        if (!candidateFiles.length) {
            setActiveFileId(null);
            return;
        }
        setActiveFileId((candidateFiles.find((f) => f.isPrimary) || candidateFiles[0]).id);
    }, [activeExistingFiles, isEditMode, media.id, memoryFiles]);

    useEffect(() => {
        setComparePosition(0);
    }, [activeFile?.id]);

    const handleEditFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const incoming = Array.from(e.target.files || []);
        if (!incoming.length) return;
        if (activeExistingFiles.length + incoming.length > MAX_MEMORY_FILES) {
            toast.error(`Max ${MAX_MEMORY_FILES} files allowed.`);
            return;
        }
        setPendingNewFiles((prev) => [...prev, ...incoming]);
        e.target.value = '';
    };

    const handleDownload = () => {
        if (!activeFile?.fileUrl) return;
        downloadMediaMutation.mutate({
            mediaItem: { ...media, fileUrl: activeFile.fileUrl },
            fileName: activeFile.originalName,
        });
    };

    const handleShare = async () => {
        const shareUrl = activeFile?.fileUrl || media.fileUrl;
        if (!shareUrl) return toast.error('No link available');
        setIsSharing(true);
        try {
            if (navigator.share && navigator.canShare({ url: shareUrl })) {
                await navigator.share({
                    title: media.title,
                    text: activeFile?.originalName,
                    url: shareUrl,
                });
            } else {
                await navigator.clipboard.writeText(shareUrl);
                toast.success('Link copied');
            }
        } catch (e: any) {
            if (e.name !== 'AbortError') toast.error('Share failed');
        } finally {
            setIsSharing(false);
        }
    };

    const rotatePreview = (deltaDegrees: number) => {
        if (!activeFile || activeFile.fileType !== 'PHOTO') return;
        setPreviewRotationByFileId((prev) => {
            const current = prev[activeFile.id] || 0;
            const next = ((current + deltaDegrees) % 360 + 360) % 360;
            if (!next) {
                const cloned = { ...prev };
                delete cloned[activeFile.id];
                return cloned;
            }
            return { ...prev, [activeFile.id]: next };
        });
    };

    const handleSaveRotation = () => {
        if (!canEdit || !activeFile || activeFile.fileType !== 'PHOTO' || !activePreviewRotation) return;
        const targetFileId = activeFile.isPrimary ? `primary-${media.id}` : activeFile.id;
        const normalizedDegrees =
            activePreviewRotation > 180 ? activePreviewRotation - 360 : activePreviewRotation;
        rotateMediaFileMutation.mutate(
            {
                mediaId: media.id,
                payload: {
                    fileId: targetFileId,
                    degrees: normalizedDegrees,
                },
            },
            {
                onSuccess: (updatedMedia) => {
                    onSyncMedia?.(updatedMedia);
                    setPreviewRotationByFileId((prev) => {
                        const cloned = { ...prev };
                        delete cloned[activeFile.id];
                        return cloned;
                    });
                },
            },
        );
    };

    const handleRunRestoration = () => {
        if (!canEdit || !activeFile || activeFile.fileType !== 'PHOTO') return;
        if (!restorationOptions.colorize && !restorationOptions.denoise) {
            toast.error('Select at least one restoration tool.');
            return;
        }

        restoreMediaFileMutation.mutate(
            {
                mediaId: media.id,
                payload: {
                    fileId: activeFile.id,
                    colorize: restorationOptions.colorize,
                    denoise: restorationOptions.denoise,
                },
            },
            {
                onSuccess: async () => {
                    await refetchRestorationStatus();
                },
            },
        );
    };

    const getDetectedFaceDropdownStyle = (faceId: string): React.CSSProperties => {
        const anchor = faceAnchorRefs.current[faceId];
        if (!anchor || typeof window === 'undefined') {
            return { position: 'fixed', left: -9999, top: -9999 };
        }

        const rect = anchor.getBoundingClientRect();
        const width = Math.min(220, Math.max(160, window.innerWidth - 16));
        let left = rect.left + rect.width / 2 - width / 2;
        left = Math.max(8, Math.min(left, window.innerWidth - width - 8));

        const belowTop = rect.bottom + 6;
        const belowAvailable = window.innerHeight - belowTop - 8;
        if (belowAvailable >= 120) {
            return {
                position: 'fixed',
                left,
                top: belowTop,
                width,
                maxHeight: Math.min(260, belowAvailable),
            };
        }

        const aboveAvailable = rect.top - 14;
        const height = Math.max(120, Math.min(260, aboveAvailable));
        const top = Math.max(8, rect.top - height - 6);
        return {
            position: 'fixed',
            left,
            top,
            width,
            maxHeight: height,
        };
    };

    const handleExifDecision = (action: 'accept' | 'reject') => {
        if (!isUploader || confirmMediaExifMutation.isPending) return;

        const applyDateTaken = action === 'accept' ? hasExifDateCandidate : false;
        const applyGps = action === 'accept' ? hasExifGpsCandidate : false;

        if (action === 'accept' && !applyDateTaken && !applyGps) {
            toast.error('No EXIF date/GPS found to apply. You can reject this suggestion.');
            return;
        }

        confirmMediaExifMutation.mutate(
            {
                mediaId: media.id,
                payload: {
                    action,
                    applyDateTaken,
                    applyGps,
                    candidateFileId: selectedExifCandidate?.fileId,
                },
            },
            {
                onSuccess: (updatedMedia) => {
                    onSyncMedia?.(updatedMedia);
                },
            },
        );
    };

    // --- Drawing Logic ---
    const buildRectangleFromPoints = (
        start: { x: number; y: number },
        end: { x: number; y: number },
    ): NormalizedRectangle => {
        const left = clampNormalizedValue(Math.min(start.x, end.x));
        const top = clampNormalizedValue(Math.min(start.y, end.y));
        const right = clampNormalizedValue(Math.max(start.x, end.x));
        const bottom = clampNormalizedValue(Math.max(start.y, end.y));
        return { x: left, y: top, w: Math.max(0, right - left), h: Math.max(0, bottom - top) };
    };

    const getRelativePoint = (e: React.MouseEvent<HTMLDivElement>) => {
        const bounds = e.currentTarget.getBoundingClientRect();
        if (bounds.width <= 0 || bounds.height <= 0) return null;
        return {
            x: clampNormalizedValue((e.clientX - bounds.left) / bounds.width),
            y: clampNormalizedValue((e.clientY - bounds.top) / bounds.height),
        };
    };

    const handlePhotoOverlayMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (
            !canEdit ||
            !isManualDrawMode ||
            activeFile?.fileType !== 'PHOTO' ||
            pendingManualAnnotation ||
            isManualAnnotationSaving ||
            e.button !== 0
        )
            return;
        const point = getRelativePoint(e);
        if (!point) return;
        e.preventDefault();
        setTaggingFaceId(null);
        setManualDrawStartPoint(point);
        setDraftManualRectangle({ x: point.x, y: point.y, w: 0, h: 0 });
    };

    const handlePhotoOverlayMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!manualDrawStartPoint) return;
        const point = getRelativePoint(e);
        if (point) setDraftManualRectangle(buildRectangleFromPoints(manualDrawStartPoint, point));
    };

    const handlePhotoOverlayMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!manualDrawStartPoint || activeFile?.fileType !== 'PHOTO') return;
        const point = getRelativePoint(e);
        setManualDrawStartPoint(null);
        setDraftManualRectangle(null);
        setIsManualDrawMode(false);

        if (point) {
            const rect = buildRectangleFromPoints(manualDrawStartPoint, point);
            if (rect.w >= MIN_MANUAL_BOX_SIZE && rect.h >= MIN_MANUAL_BOX_SIZE) {
                setPendingManualAnnotation({ coordinates: rect, fileId: activeFile!.id });
            } else {
                toast.error('Selection too small.');
            }
        }
    };

    const linkProfileToManualAnnotation = (profile: PersonProfile) => {
        if (
            !canEdit ||
            !pendingManualAnnotation ||
            isManualAnnotationSaving ||
            (linkedPersonIds.has(profile.id) && profile.id !== pendingManualLinkedPersonId)
        )
            return;
        const payload = {
            mediaId: media.id,
            personId: profile.id,
            faceCoordinates: pendingManualAnnotation.coordinates,
            taggedFileId: pendingManualAnnotation.fileId,
        };
        const onSuccess = () => setPendingManualAnnotation(null);
        if (pendingManualAnnotation.tagId)
            updateMediaTagMutation.mutate(
                { tagId: pendingManualAnnotation.tagId, ...payload },
                { onSuccess },
            );
        else createMediaTagMutation.mutate(payload, { onSuccess });
    };

    const linkProfileToFace = (faceId: string, profile: PersonProfile) => {
        if (
            !canEdit ||
            createMediaTagMutation.isPending ||
            linkedPersonIds.has(profile.id)
        )
            return;
        const targetFace = localFaces.find((f) => f.id === faceId);
        if (!targetFace) return;
        createMediaTagMutation.mutate(
            {
                mediaId: media.id,
                personId: profile.id,
                detectedFaceId: targetFace.id,
                faceCoordinates: toFaceCoordinatesPayload(targetFace),
            },
            {
                onSuccess: () => {
                    setLocalFaces((prev) =>
                        prev.map((f) =>
                            f.id === faceId
                                ? { ...f, personId: profile.id, name: profile.fullName }
                                : f,
                        ),
                    );
                    setTaggingFaceId(null);
                },
            },
        );
    };

    const unlinkDetectedFace = (faceId: string) => {
        const matchingTag = mediaTags?.find(
            (t) => String(t.detectedFaceId || '').trim() === faceId,
        );
        if (matchingTag)
            deleteMediaTagMutation.mutate(
                { tagId: matchingTag.id, mediaId: media.id },
                {
                    onSuccess: () => {
                        setLocalFaces((prev) =>
                            prev.map((f) =>
                                f.id === faceId
                                    ? { ...f, personId: undefined, name: undefined }
                                    : f,
                            ),
                        );
                        setTaggingFaceId(null);
                    },
                },
            );
    };

    const linkProfileToMedia = (profile: PersonProfile) => {
        if (!canEdit || createMediaTagMutation.isPending || linkedPersonIds.has(profile.id)) return;
        createMediaTagMutation.mutate(
            { mediaId: media.id, personId: profile.id },
            { onSuccess: () => setIsLinkPickerOpen(false) },
        );
    };

    const unlinkProfileFromMedia = (profile: PersonProfile) => {
        const matchingTag = mediaTags?.find((t) => t.personId === profile.id);
        if (matchingTag)
            deleteMediaTagMutation.mutate(
                { tagId: matchingTag.id, mediaId: media.id },
                {
                    onSuccess: () =>
                        setLocalFaces((prev) =>
                            prev.map((f) =>
                                f.personId === profile.id
                                    ? { ...f, personId: undefined, name: undefined }
                                    : f,
                            ),
                        ),
                },
            );
    };

    const needsTimeLockCondition =
        editDraft.lockRule === 'time' ||
        editDraft.lockRule === 'time_and_target';
    const needsTargetLockCondition =
        editDraft.lockRule === 'targeted' ||
        editDraft.lockRule === 'time_and_target';
    const lockReleaseDateTime = useMemo(
        () => parseLocalDateTime(editDraft.lockReleaseAt),
        [editDraft.lockReleaseAt],
    );
    const selectedLockHour = String(lockReleaseDateTime?.getHours() ?? 9).padStart(2, '0');
    const rawSelectedLockMinute = String(lockReleaseDateTime?.getMinutes() ?? 0).padStart(2, '0');
    const selectedLockMinute = LOCK_MINUTE_OPTIONS.includes(rawSelectedLockMinute)
        ? rawSelectedLockMinute
        : LOCK_MINUTE_OPTIONS[0];
    const lockRuleLabel =
        editDraft.lockRule === 'time'
            ? t.vault.detail.editForm.lockRules.time
            : editDraft.lockRule === 'targeted'
                ? t.vault.detail.editForm.lockRules.targeted
                : editDraft.lockRule === 'time_and_target'
                    ? t.vault.detail.editForm.lockRules.both
                    : t.vault.detail.editForm.lockRules.none;

    const toggleEditLockTargetUser = (userId: string) => {
        setEditDraft((prev) => {
            if (prev.lockTargetUserIds.includes(userId)) {
                return {
                    ...prev,
                    lockTargetUserIds: prev.lockTargetUserIds.filter((id) => id !== userId),
                };
            }
            return {
                ...prev,
                lockTargetUserIds: [...prev.lockTargetUserIds, userId],
            };
        });
    };

    const ensureLockDateTime = () => {
        if (lockReleaseDateTime) return new Date(lockReleaseDateTime);
        const fallback = new Date();
        fallback.setHours(9, 0, 0, 0);
        return fallback;
    };

    const handleLockDateChange = (nextDate: Date) => {
        const next = ensureLockDateTime();
        next.setFullYear(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate());
        setEditDraft((prev) => ({
            ...prev,
            lockReleaseAt: formatLocalDateTime(next),
        }));
    };

    const handleLockHourChange = (nextHour: string) => {
        const next = ensureLockDateTime();
        next.setHours(Number(nextHour), Number(selectedLockMinute), 0, 0);
        setEditDraft((prev) => ({
            ...prev,
            lockReleaseAt: formatLocalDateTime(next),
        }));
    };

    const handleLockMinuteChange = (nextMinute: string) => {
        const next = ensureLockDateTime();
        next.setHours(Number(selectedLockHour), Number(nextMinute), 0, 0);
        setEditDraft((prev) => ({
            ...prev,
            lockReleaseAt: formatLocalDateTime(next),
        }));
    };

    const handleSaveMediaEdits = () => {
        if (!canEdit) return;
        if (!editDraft.title.trim()) return toast.error(t.vault.detail.editForm.titleRequired);
        if (needsTimeLockCondition && !editDraft.lockReleaseAt.trim()) {
            return toast.error(t.vault.detail.editForm.unlockAtRequired);
        }
        if (needsTargetLockCondition && editDraft.lockTargetUserIds.length === 0) {
            return toast.error(t.vault.detail.editForm.targetUsersRequired);
        }

        onUpdateMedia(
            {
                id: media.id,
                title: editDraft.title.trim(),
                description: editDraft.story.trim(),
                location: editDraft.location.trim(),
                tags: Array.from(
                    new Set(
                        editDraft.tags
                            .split(',')
                            .map((t) => t.trim())
                            .filter(Boolean),
                    ),
                ),
                dateTaken: editDraft.dateTaken?.toISOString() || null,
                visibility: editDraft.visibility,
                lockRule: editDraft.lockRule,
                lockReleaseAt: editDraft.lockReleaseAt
                    ? new Date(editDraft.lockReleaseAt).toISOString()
                    : null,
                lockTargetUserIds: editDraft.lockTargetUserIds,
                removeFileIds: Array.from(pendingRemovedFileIds),
                newFiles: pendingNewFiles,
            },
            (updated) => {
                setIsEditMode(false);
                setEditDraft(toEditDraft(updated));
                setPendingRemovedFileIds(new Set());
                setPendingNewFiles([]);
            },
        );
    };

    return (
        <div className="fixed inset-0 z-110 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-xl bg-slate-950/60 animate-in fade-in duration-300">
            {/* Modal Card */}
            <div className="bg-white dark:bg-slate-900 w-full max-w-7xl h-dvh sm:h-[92vh] rounded-none sm:rounded-4xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row animate-in zoom-in-95 duration-500">
                {/* --- LEFT: Media Preview (40% height on mobile, 100% on desktop) --- */}
                <div className="w-full h-[40dvh] lg:h-full lg:flex-1 bg-slate-50 dark:bg-slate-950 relative z-0 overflow-hidden flex items-center justify-center group p-2 sm:p-4 border-b lg:border-b-0 lg:border-r border-slate-100 dark:border-slate-800">
                    {activeFile?.fileType === 'PHOTO' && (
                        <div className="relative inline-block max-w-full select-none h-full items-center justify-center">
                            <PresignedImage
                                src={activeFile.fileUrl}
                                className="max-w-full max-h-full object-contain rounded-xl shadow-lg transition-transform duration-200"
                                alt={activeFile.originalName}
                                draggable={false}
                                onRecover={() => recoverSignedUrls(media.id)}
                                style={{
                                    transform:
                                        activePreviewRotation !== 0
                                            ? `rotate(${activePreviewRotation}deg)`
                                            : undefined,
                                }}
                            />

                            {/* Tagging Overlay (z-20) */}
                            <div
                                className={`absolute inset-0 z-20 ${canEdit && isManualDrawMode ? 'cursor-crosshair' : 'cursor-default'}`}
                                style={{
                                    transform:
                                        activePreviewRotation !== 0
                                            ? `rotate(${activePreviewRotation}deg)`
                                            : undefined,
                                    transformOrigin: 'center center',
                                }}
                                onMouseDown={handlePhotoOverlayMouseDown}
                                onMouseMove={handlePhotoOverlayMouseMove}
                                onMouseUp={handlePhotoOverlayMouseUp}
                                onMouseLeave={() => {
                                    setManualDrawStartPoint(null);
                                    setDraftManualRectangle(null);
                                }}
                            >
                                {/* Detected Face Boxes */}
                                {showTagBoxes &&
                                    activeFileFaces.map((face, index) => (
                                        <div
                                            key={`box-${face.id}`}
                                            className="absolute"
                                            style={{
                                                left: `${face.boundingBox.x * 100}%`,
                                                top: `${face.boundingBox.y * 100}%`,
                                                width: `${face.boundingBox.width * 100}%`,
                                                height: `${face.boundingBox.height * 100}%`,
                                            }}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => canEdit && setTaggingFaceId(face.id)}
                                                className={`relative h-full w-full rounded-md border-2 transition-colors ${face.personId ? 'border-emerald-500 bg-emerald-500/10' : 'border-amber-400 bg-amber-400/10 hover:border-primary'}`}
                                            >
                                                <span className="absolute -top-5 left-0 rounded bg-slate-900/85 text-white text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 whitespace-nowrap">
                                                    {face.name || `Face ${index + 1}`}
                                                </span>
                                            </button>
                                        </div>
                                    ))}

                                {/* Manual Annotation Boxes */}
                                {showTagBoxes &&
                                    manualAnnotations.map((ann, index) => (
                                        <div
                                            key={`manual-${ann.tagId}`}
                                            className="absolute"
                                            style={{
                                                left: `${ann.coordinates.x * 100}%`,
                                                top: `${ann.coordinates.y * 100}%`,
                                                width: `${ann.coordinates.w * 100}%`,
                                                height: `${ann.coordinates.h * 100}%`,
                                            }}
                                        >
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setPendingManualAnnotation({
                                                        coordinates: ann.coordinates,
                                                        fileId: activeFile.id,
                                                        tagId: ann.tagId,
                                                    })
                                                }
                                                disabled={!canEdit}
                                                className="relative h-full w-full rounded-md border-2 border-sky-400 bg-sky-500/10 transition-colors"
                                            >
                                                <span className="absolute -top-5 left-0 rounded bg-sky-900/85 text-white text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 whitespace-nowrap">
                                                    {ann.personName || `Manual ${index + 1}`}
                                                </span>
                                            </button>
                                            {canEdit && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteMediaTagMutation.mutate({
                                                            tagId: ann.tagId,
                                                            mediaId: media.id,
                                                        });
                                                    }}
                                                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-md hover:bg-rose-600"
                                                >
                                                    <X size={10} />
                                                </button>
                                            )}
                                        </div>
                                    ))}

                                {/* Draw Draft */}
                                {draftManualRectangle && (
                                    <div
                                        className="absolute rounded-md border-2 border-sky-500 border-dashed bg-sky-500/10"
                                        style={{
                                            left: `${draftManualRectangle.x * 100}%`,
                                            top: `${draftManualRectangle.y * 100}%`,
                                            width: `${draftManualRectangle.w * 100}%`,
                                            height: `${draftManualRectangle.h * 100}%`,
                                        }}
                                    />
                                )}
                            </div>

                            {/* Tagging Popup Modal */}
                            {canEdit && pendingManualAnnotation && (
                                <div className="absolute top-4 left-4 z-50 w-64 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 p-3 shadow-2xl backdrop-blur-sm animate-in slide-in-from-top-4">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-300 mb-2">
                                        Identify Person
                                    </p>
                                    <div className="max-h-48 overflow-y-auto no-scrollbar space-y-1">
                                        {manualAnnotationProfiles.map((p) => (
                                            <button
                                                key={p.id}
                                                onClick={() => linkProfileToManualAnnotation(p)}
                                                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-left"
                                            >
                                                <PresignedImage
                                                    src={p.photoUrl}
                                                    className="w-6 h-6 rounded-full object-cover"
                                                />
                                                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 truncate">
                                                    {p.fullName}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="mt-2 flex justify-end gap-2">
                                        <button
                                            onClick={() => setPendingManualAnnotation(null)}
                                            className="px-2 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeFile?.fileType === 'VIDEO' && (
                        <video
                            src={activeFile.fileUrl}
                            controls
                            className="max-w-full max-h-full rounded-xl shadow-lg bg-black"
                        />
                    )}

                    {activeFile?.fileType === 'AUDIO' && (
                        <div className="w-full max-w-md bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl">
                            <div className="flex items-center gap-3 mb-4">
                                <Music2 size={24} className="text-primary" />
                                <p className="font-bold text-slate-700 dark:text-slate-200 truncate">
                                    {activeFile.originalName}
                                </p>
                            </div>
                            <audio src={activeFile.fileUrl} controls className="w-full" />
                        </div>
                    )}

                    {activeFile?.fileType === 'DOCUMENT' && (
                        <div className="w-full max-w-xl rounded-3xl border border-slate-200/80 dark:border-slate-700/80 bg-gradient-to-br from-white via-slate-50 to-slate-100/70 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/60 p-6 shadow-2xl shadow-slate-900/10">
                            <div className="mb-5 flex items-start gap-4">
                                <div className="h-14 w-14 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/80 shadow-sm flex items-center justify-center shrink-0">
                                    <FileText size={26} className="text-slate-600 dark:text-slate-300" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                                        Document Preview
                                    </p>
                                    <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                                        {activeFile.originalName}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                                        Open in a new tab for full reading and native document controls.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <a
                                    href={activeFile.fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-widest border border-slate-900 bg-slate-900 text-white transition-colors hover:bg-slate-700 hover:border-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white dark:hover:border-white"
                                >
                                    <ExternalLink size={14} />
                                    Open Document
                                </a>
                                <button
                                    type="button"
                                    onClick={handleDownload}
                                    disabled={downloadMediaMutation.isPending}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-widest border border-slate-300 bg-white text-slate-700 transition-colors hover:bg-slate-900 hover:border-slate-900 hover:text-white focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-60 disabled:cursor-not-allowed dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-100 dark:hover:border-slate-100 dark:hover:text-slate-900"
                                >
                                    {downloadMediaMutation.isPending ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                        <Download size={14} />
                                    )}
                                    Download Copy
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Viewer Controls - Z-40 to sit ABOVE the Overlay(z-20) */}
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none z-40">
                        <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 p-1.5 rounded-2xl shadow-xl flex items-center gap-2 pointer-events-auto backdrop-blur-md">
                            <button
                                type="button"
                                onClick={() => setShowTagBoxes((prev) => !prev)}
                                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
                                title={showTagBoxes ? 'Hide Tags' : 'Show Tags'}
                            >
                                {showTagBoxes ? <Eye size={16} /> : <EyeOff size={16} />}
                            </button>
                            {activeFile?.fileType === 'PHOTO' && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => rotatePreview(-90)}
                                        className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
                                        title="Rotate Left"
                                    >
                                        <RotateCcw size={16} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => rotatePreview(90)}
                                        className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
                                        title="Rotate Right"
                                    >
                                        <RotateCw size={16} />
                                    </button>
                                </>
                            )}
                            {canEdit &&
                                activeFile?.fileType === 'PHOTO' &&
                                activePreviewRotation !== 0 && (
                                    <button
                                        type="button"
                                        onClick={handleSaveRotation}
                                        disabled={rotateMediaFileMutation.isPending}
                                        className="p-2 rounded-xl bg-primary text-white disabled:opacity-60 disabled:cursor-not-allowed"
                                        title="Save Rotation"
                                    >
                                        {rotateMediaFileMutation.isPending ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <Save size={16} />
                                        )}
                                    </button>
                                )}
                            {canEdit && activeFile?.fileType === 'PHOTO' && (
                                <button
                                    type="button"
                                    onClick={() => setIsManualDrawMode((prev) => !prev)}
                                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${isManualDrawMode ? 'bg-primary text-white shadow-lg shadow-primary/25' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
                                >
                                    {isManualDrawMode ? t.vault.detail.editForm.cancel : t.vault.detail.drawTag}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* --- RIGHT: Details Panel (Scrollable) --- */}
                <div className="w-full lg:w-112.5 xl:w-120 h-[60dvh] lg:h-full flex flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 relative z-20">
                    {/* Header (Sticky) */}
                    <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur z-20 sticky top-0">
                        <div className="min-w-0 flex-1">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white leading-tight wrap-break-word">
                                {media.title}
                            </h2>
                            <div className="flex flex-wrap items-center gap-3 mt-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Calendar size={12} />{' '}
                                    {new Date(media.dateTaken).toLocaleDateString()}
                                </p>
                                {media.location && (
                                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-1.5 truncate max-w-45">
                                        <MapPin size={12} /> {media.location}
                                    </p>
                                )}
                                <span
                                    className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 border text-[9px] font-bold uppercase tracking-widest ${
                                        media.visibility === 'private'
                                            ? 'border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400'
                                            : 'border-sky-200 text-sky-600 bg-sky-50 dark:border-sky-900/30 dark:bg-sky-900/10 dark:text-sky-400'
                                    }`}
                                >
                                    {media.visibility === 'private' ? (
                                        <Lock size={10} />
                                    ) : (
                                        <Users size={10} />
                                    )}{' '}
                                    {media.visibility === 'private' ? t.vault.detail.visibilityPrivate : t.vault.detail.visibilityFamily}
                                </span>
                                {media.lockRule && media.lockRule !== 'none' && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 border text-[9px] font-bold uppercase tracking-widest border-amber-200 text-amber-700 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-300">
                                        <Lock size={10} /> {t.vault.detail.timeLocked}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                            {canEdit &&
                                (isEditMode ? (
                                    <button
                                        onClick={handleSaveMediaEdits}
                                        disabled={isUpdatingMedia}
                                        className="p-2 bg-primary text-white rounded-xl shadow-lg shadow-primary/20"
                                    >
                                        <Save size={18} />
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setIsEditMode(true)}
                                        className="p-2 text-slate-400 hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
                                    >
                                        <Pencil size={18} />
                                    </button>
                                ))}
                            <button
                                onClick={onClose}
                                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Content (Scrollable) */}
                    <div className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-5 space-y-6">
                        {/* Edit Mode Fields */}
                        {isEditMode && (
                            <div className="space-y-4 rounded-2xl border border-primary/20 bg-primary/[0.03] p-4">
                                <div className="grid gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                                            {t.vault.detail.editForm.title}
                                        </label>
                                        <input
                                            type="text"
                                            value={editDraft.title}
                                            onChange={(e) =>
                                                setEditDraft({
                                                    ...editDraft,
                                                    title: e.target.value,
                                                })
                                            }
                                            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                                            {t.vault.detail.editForm.date}
                                        </label>
                                        <DatePicker
                                            date={editDraft.dateTaken}
                                            onChange={(d) =>
                                                setEditDraft({ ...editDraft, dateTaken: d })
                                            }
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                                            {t.vault.detail.editForm.location}
                                        </label>
                                        <input
                                            type="text"
                                            value={editDraft.location}
                                            onChange={(e) =>
                                                setEditDraft({
                                                    ...editDraft,
                                                    location: e.target.value,
                                                })
                                            }
                                            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                                            {t.vault.detail.editForm.story}
                                        </label>
                                        <textarea
                                            rows={3}
                                            value={editDraft.story}
                                            onChange={(e) =>
                                                setEditDraft({
                                                    ...editDraft,
                                                    story: e.target.value,
                                                })
                                            }
                                            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                                            {t.vault.detail.editForm.timeLock}
                                        </label>
                                        <Select
                                            value={editDraft.lockRule}
                                            onValueChange={(value) =>
                                                setEditDraft({
                                                    ...editDraft,
                                                    lockRule: value as MediaLockRule,
                                                })
                                            }
                                            className="w-full"
                                        >
                                            <SelectTrigger className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-900">
                                                <span className="text-slate-700 dark:text-slate-200">
                                                    {lockRuleLabel}
                                                </span>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">{t.vault.detail.editForm.lockRules.none}</SelectItem>
                                                <SelectItem value="time">{t.vault.detail.editForm.lockRules.time}</SelectItem>
                                                <SelectItem value="targeted">{t.vault.detail.editForm.lockRules.targeted}</SelectItem>
                                                <SelectItem value="time_and_target">{t.vault.detail.editForm.lockRules.both}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {needsTimeLockCondition && (
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                                                {t.vault.detail.editForm.unlockAt}
                                            </label>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                <DatePicker
                                                    date={lockReleaseDateTime}
                                                    onChange={handleLockDateChange}
                                                    placeholder={t.vault.detail.editForm.pickDate}
                                                    className="sm:col-span-2"
                                                />
                                                <Select value={selectedLockHour} onValueChange={handleLockHourChange}>
                                                    <SelectTrigger className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-900">
                                                        <span className="text-slate-700 dark:text-slate-200">{`${selectedLockHour}:${selectedLockMinute}`}</span>
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {LOCK_HOUR_OPTIONS.map((hour) => (
                                                            <SelectItem key={hour} value={hour}>
                                                                {`${hour}:${selectedLockMinute}`}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                    {t.vault.detail.editForm.minuteLabel}
                                                </span>
                                                <Select value={selectedLockMinute} onValueChange={handleLockMinuteChange}>
                                                    <SelectTrigger className="w-24 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs bg-white dark:bg-slate-900">
                                                        <span className="text-slate-700 dark:text-slate-200">{selectedLockMinute}</span>
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {LOCK_MINUTE_OPTIONS.map((minute) => (
                                                            <SelectItem key={minute} value={minute}>
                                                                {minute}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    )}
                                    {needsTargetLockCondition && (
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                                                {t.vault.detail.editForm.targetUsers}
                                            </label>
                                            <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 space-y-1">
                                                {lockTargetCandidates.length === 0 && (
                                                    <p className="text-[11px] text-slate-500">
                                                        {t.vault.detail.editForm.noMembers}
                                                    </p>
                                                )}
                                                {lockTargetCandidates.map((member) => (
                                                    <label
                                                        key={member.userId}
                                                        className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={editDraft.lockTargetUserIds.includes(member.userId)}
                                                            onChange={() => toggleEditLockTargetUser(member.userId)}
                                                        />
                                                        <span className="text-xs text-slate-700 dark:text-slate-200 font-medium">
                                                            {member.fullName}
                                                        </span>
                                                        <span className="text-[10px] text-slate-500 truncate">
                                                            {member.email}
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {/* File Manager */}
                                    <div className="border-t border-dashed border-slate-200 dark:border-slate-700 pt-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                                            {t.vault.detail.editForm.files} ({projectedFileCount})
                                        </label>
                                        <div className="space-y-2">
                                            {memoryFiles.map((f) => (
                                                <div
                                                    key={f.id}
                                                    className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                                                >
                                                    <span className="text-xs truncate max-w-37.5 font-bold text-slate-600 dark:text-slate-300">
                                                        {f.originalName}
                                                    </span>
                                                    <button
                                                        onClick={() =>
                                                            setPendingRemovedFileIds((prev) => {
                                                                const n = new Set(prev);
                                                                n.has(f.id)
                                                                    ? n.delete(f.id)
                                                                    : n.add(f.id);
                                                                return n;
                                                            })
                                                        }
                                                        className={`text-[9px] font-black uppercase tracking-widest ${pendingRemovedFileIds.has(f.id) ? 'text-emerald-500' : 'text-rose-500'}`}
                                                    >
                                                        {pendingRemovedFileIds.has(f.id)
                                                            ? t.vault.detail.editForm.keep
                                                            : t.vault.detail.editForm.remove}
                                                    </button>
                                                </div>
                                            ))}
                                            <button
                                                onClick={() => editFileInputRef.current?.click()}
                                                className="w-full py-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary"
                                            >
                                                {t.vault.detail.editForm.addFile}
                                            </button>
                                            <input
                                                type="file"
                                                ref={editFileInputRef}
                                                multiple
                                                className="hidden"
                                                onChange={handleEditFileInputChange}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setIsEditMode(false)}
                                            className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-500"
                                        >
                                            {t.vault.detail.editForm.cancel}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Story */}
                        {!isEditMode && (
                            <div className="space-y-2">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    {t.vault.detail.theStory}
                                </h3>
                                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed italic border-l-2 border-primary/20 pl-4">
                                    {media.description || (
                                        <span className="text-slate-400 not-italic">
                                        {t.vault.detail.noStoryAdded}
                                        </span>
                                    )}
                                </p>
                            </div>
                        )}

                        {!isEditMode && lockTargetUsersForDisplay.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Users size={12} /> {t.vault.detail.editForm.targetUsers}
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {lockTargetUsersForDisplay.map((targetUser) => (
                                        <div
                                            key={targetUser.id}
                                            className="min-w-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/50 px-3 py-2"
                                        >
                                            <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate">
                                                {targetUser.fullName || targetUser.email || targetUser.id}
                                            </p>
                                            {(targetUser.email ||
                                                targetUser.fullName !== targetUser.id) && (
                                                <p className="text-[10px] text-slate-500 dark:text-slate-300 truncate">
                                                    {targetUser.email || targetUser.id}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Faces & People */}
                        {(localFaces.length > 0 || linkedProfiles.length > 0) && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        {t.vault.detail.detectedFaces}
                                    </h3>
                                    <span
                                        className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${isFaceDetectionInProgress ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-500'}`}
                                    >
                                        {faceStatusLabels[effectiveFaceStatus]}
                                    </span>
                                </div>

                                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                                    {/* Linked People */}
                                    {linkedProfiles.map((profile) => (
                                        <div
                                            key={profile.id}
                                            className="group relative flex flex-col items-center"
                                        >
                                            <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-emerald-500/30 p-0.5">
                                                <PresignedImage
                                                    src={profile.photoUrl}
                                                    className="w-full h-full rounded-xl object-cover"
                                                />
                                            </div>
                                            <span className="text-[9px] font-bold text-slate-600 dark:text-slate-300 mt-1 truncate w-full text-center">
                                                {profile.fullName.split(' ')[0]}
                                            </span>
                                            {canEdit && (
                                                <button
                                                    onClick={() => unlinkProfileFromMedia(profile)}
                                                    className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                                >
                                                    <X size={10} />
                                                </button>
                                            )}
                                        </div>
                                    ))}

                                    {/* Unidentified Faces */}
                                    {localFaces
                                        .filter((f) => !f.personId)
                                        .map((face) => (
                                            <div
                                                key={face.id}
                                                className="group relative flex flex-col items-center"
                                            >
                                                <button
                                                    ref={(node) => {
                                                        faceAnchorRefs.current[face.id] = node;
                                                    }}
                                                    type="button"
                                                    onClick={() =>
                                                        canEdit &&
                                                        setTaggingFaceId(
                                                            taggingFaceId === face.id
                                                                ? null
                                                                : face.id,
                                                        )
                                                    }
                                                    className={`w-12 h-12 rounded-2xl overflow-hidden border-2 border-dashed border-amber-400/50 p-0.5 hover:border-amber-500 transition-colors ${taggingFaceId === face.id ? 'ring-2 ring-amber-400 ring-offset-2' : ''}`}
                                                >
                                                    {face.thumbnailUrl ? (
                                                        <PresignedImage
                                                            src={face.thumbnailUrl}
                                                            className="w-full h-full rounded-xl object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                                                            <Users
                                                                size={16}
                                                                className="text-slate-300"
                                                            />
                                                        </div>
                                                    )}
                                                </button>
                                                <span className="text-[9px] font-bold text-amber-600/70 mt-1">
                                                    {t.vault.detail.unknown}
                                                </span>

                                                {/* Tagging Popover */}
                                                {taggingFaceId === face.id &&
                                                    typeof document !== 'undefined' &&
                                                    createPortal(
                                                        <div
                                                            style={getDetectedFaceDropdownStyle(
                                                                face.id,
                                                            )}
                                                            className="z-220 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 overflow-y-auto"
                                                        >
                                                            {availableProfiles.length === 0 && (
                                                                <p className="px-2 py-1.5 text-[9px] font-bold text-slate-500 dark:text-slate-300">
                                                                    {t.vault.detail.noUnlinkedRelatives}
                                                                </p>
                                                            )}
                                                            {availableProfiles.map((p) => (
                                                                <button
                                                                    key={p.id}
                                                                    onClick={() =>
                                                                        linkProfileToFace(
                                                                            face.id,
                                                                            p,
                                                                        )
                                                                    }
                                                                    className="w-full flex items-center gap-2 p-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-left"
                                                                >
                                                                    <PresignedImage
                                                                        src={p.photoUrl}
                                                                        className="w-4 h-4 rounded-full object-cover"
                                                                    />
                                                                    <span className="text-[9px] font-bold text-slate-700 dark:text-slate-200 truncate">
                                                                        {p.fullName}
                                                                    </span>
                                                                </button>
                                                            ))}
                                                        </div>,
                                                        document.body,
                                                    )}
                                            </div>
                                        ))}

                                    {canEdit && (
                                        <button
                                            onClick={() => setIsLinkPickerOpen(!isLinkPickerOpen)}
                                            className="flex flex-col items-center justify-center w-12 h-12 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-300 hover:text-primary hover:border-primary transition-colors"
                                        >
                                            <Plus size={18} />
                                        </button>
                                    )}
                                </div>

                                {isLinkPickerOpen && (
                                    <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <p className="text-[9px] font-bold uppercase text-slate-400 mb-2 px-1">
                                            Add Relative manually
                                        </p>
                                        <div className="grid grid-cols-2 gap-2">
                                            {availableProfiles.map((p) => (
                                                <button
                                                    key={p.id}
                                                    onClick={() => linkProfileToMedia(p)}
                                                    className="flex items-center gap-2 p-1.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 hover:border-primary/50 transition-colors text-left"
                                                >
                                                    <PresignedImage
                                                        src={p.photoUrl}
                                                        className="w-5 h-5 rounded-full object-cover"
                                                    />
                                                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate">
                                                        {p.fullName}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeFile?.fileType === 'PHOTO' && (
                            <div className="space-y-3">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Sparkles size={12} /> {t.vault.detail.mediaRestoration}
                                </h3>
                                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 p-3 space-y-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <span
                                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ${
                                                effectiveRestorationStatus ===
                                                    MediaRestorationStatus.COMPLETED
                                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                                    : effectiveRestorationStatus ===
                                                          MediaRestorationStatus.FAILED
                                                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                                                      : effectiveRestorationStatus ===
                                                            MediaRestorationStatus.QUEUED ||
                                                          effectiveRestorationStatus ===
                                                              MediaRestorationStatus.PROCESSING
                                                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                                            }`}
                                        >
                                            {restorationStatusLabels[effectiveRestorationStatus]}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={handleRunRestoration}
                                            disabled={
                                                !canEdit ||
                                                isRestorationInProgress ||
                                                restoreMediaFileMutation.isPending
                                            }
                                            className="px-3 py-2 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-60 disabled:cursor-not-allowed"
                                        >
                                            {isRestorationInProgress ||
                                            restoreMediaFileMutation.isPending
                                                ? t.vault.detail.processing
                                                : t.vault.detail.restorePhoto}
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setRestorationOptions((state) => ({
                                                    ...state,
                                                    denoise: !state.denoise,
                                                }))
                                            }
                                            className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                                                restorationOptions.denoise
                                                    ? 'border-primary bg-primary/10 text-primary'
                                                    : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300'
                                            }`}
                                        >
                                            <p className="text-[10px] font-black uppercase tracking-widest">
                                                {t.vault.detail.denoise}
                                            </p>
                                            <p className="text-[10px] font-medium">
                                                {t.vault.detail.denoiseDesc}
                                            </p>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setRestorationOptions((state) => ({
                                                    ...state,
                                                    colorize: !state.colorize,
                                                }))
                                            }
                                            className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                                                restorationOptions.colorize
                                                    ? 'border-primary bg-primary/10 text-primary'
                                                    : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300'
                                            }`}
                                        >
                                            <p className="text-[10px] font-black uppercase tracking-widest">
                                                {t.vault.detail.colorize}
                                            </p>
                                            <p className="text-[10px] font-medium">
                                                {t.vault.detail.colorizeDesc}
                                            </p>
                                        </button>
                                    </div>

                                    {restorationStatusData?.error && (
                                        <p className="text-[10px] text-rose-600 dark:text-rose-300 font-semibold">
                                            {restorationStatusData.error}
                                        </p>
                                    )}
                                    {restorationWarnings.length > 0 && (
                                        <p className="text-[10px] text-amber-700 dark:text-amber-300 font-medium">
                                            {restorationWarnings[0]}
                                        </p>
                                    )}

                                    {activeRestorationResult?.restoredUrl && (
                                        <div className="space-y-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5">
                                            <div className="relative aspect-4/3 rounded-xl overflow-hidden bg-slate-950/90">
                                                <PresignedImage
                                                    src={activeFile.fileUrl}
                                                    alt={`${activeFile.originalName} original`}
                                                    className="absolute inset-0 w-full h-full object-contain"
                                                    onRecover={() => recoverSignedUrls(media.id)}
                                                />
                                                <div
                                                    className="absolute inset-0"
                                                    style={{
                                                        maskImage: `linear-gradient(to right, transparent 0%, transparent ${comparePosition}%, black ${comparePosition}%, black 100%)`,
                                                        WebkitMaskImage: `linear-gradient(to right, transparent 0%, transparent ${comparePosition}%, black ${comparePosition}%, black 100%)`,
                                                    }}
                                                >
                                                    <PresignedImage
                                                        src={activeRestorationResult.restoredUrl}
                                                        alt={`${activeFile.originalName} restored`}
                                                        className="absolute inset-0 w-full h-full object-contain"
                                                        onRecover={async () => {
                                                            await recoverSignedUrls(media.id);
                                                            await refetchRestorationStatus();
                                                        }}
                                                    />
                                                </div>
                                                <div
                                                    className="absolute inset-y-0 w-0.5 bg-white/90 shadow-[0_0_0_1px_rgba(15,23,42,0.25)]"
                                                    style={{ left: `calc(${comparePosition}% - 1px)` }}
                                                />
                                                <div className="absolute bottom-2 left-2 rounded bg-slate-900/70 text-white text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5">
                                                    {t.vault.detail.after}
                                                </div>
                                                <div className="absolute bottom-2 right-2 rounded bg-primary/90 text-white text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5">
                                                    {t.vault.detail.before}
                                                </div>
                                            </div>
                                            <input
                                                type="range"
                                                min={0}
                                                max={100}
                                                value={comparePosition}
                                                onChange={(e) =>
                                                    setComparePosition(Number(e.target.value))
                                                }
                                                className="w-full accent-primary"
                                                style={{
                                                    accentColor: 'var(--color-primary)',
                                                }}
                                                aria-label={t.common.media.compareSlider}
                                            />
                                            <p className="text-[10px] text-slate-500 dark:text-slate-300 font-medium">
                                                {t.vault.detail.compareHint}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Technical Details (EXIF) - Expanded */}
                        {media.type === 'PHOTO' &&
                            effectiveExifStatus !== MediaExifStatus.NOT_AVAILABLE && (
                                <div className="space-y-3">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <Camera size={12} /> {t.vault.detail.technicalDetails}
                                    </h3>

                                    <div className="grid grid-cols-2 gap-3">
                                        {exifNeedsConfirmation && (
                                            <div className="col-span-2 p-2.5 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-900/15 space-y-2">
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">
                                                        {t.vault.detail.exifNeedsReview}
                                                    </p>
                                                    {isUploader ? (
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleExifDecision('accept')
                                                                }
                                                                disabled={
                                                                    confirmMediaExifMutation.isPending
                                                                }
                                                                className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest disabled:opacity-60"
                                                            >
                                                                {confirmMediaExifMutation.isPending
                                                                    ? t.vault.detail.saving
                                                                    : t.vault.detail.accept}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleExifDecision('reject')
                                                                }
                                                                disabled={
                                                                    confirmMediaExifMutation.isPending
                                                                }
                                                                className="px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-700 text-[9px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300 disabled:opacity-60"
                                                            >
                                                                {t.vault.detail.reject}
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <p className="text-[9px] font-medium text-amber-700/80 dark:text-amber-300/90">
                                                            {t.vault.detail.uploaderReviewRequired}
                                                        </p>
                                                    )}
                                                </div>
                                                {selectedExifCandidate && (
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                                                        <div className="rounded-xl border border-amber-200/80 dark:border-amber-800/70 bg-white/80 dark:bg-slate-900/40 px-2 py-1.5">
                                                            <p className="text-[8px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">
                                                                {t.vault.detail.source}
                                                            </p>
                                                            <p className="mt-0.5 text-[10px] font-semibold text-slate-700 dark:text-slate-200 truncate">
                                                                {selectedExifCandidate.originalName ||
                                                                    t.vault.detail.primaryFile}
                                                            </p>
                                                        </div>
                                                        <div className="rounded-xl border border-amber-200/80 dark:border-amber-800/70 bg-white/80 dark:bg-slate-900/40 px-2 py-1.5">
                                                            <p className="text-[8px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">
                                                                {t.vault.detail.dateFound}
                                                            </p>
                                                            <p className="mt-0.5 text-[10px] font-semibold text-slate-700 dark:text-slate-200 truncate">
                                                                {selectedExifDatePreview || t.vault.detail.noDateFound}
                                                            </p>
                                                        </div>
                                                        <div className="rounded-xl border border-amber-200/80 dark:border-amber-800/70 bg-white/80 dark:bg-slate-900/40 px-2 py-1.5">
                                                            <p className="text-[8px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">
                                                                {t.vault.detail.gpsFound}
                                                            </p>
                                                            <p className="mt-0.5 text-[10px] font-semibold text-slate-700 dark:text-slate-200 truncate">
                                                                {selectedExifGpsPreview || t.vault.detail.noGpsFound}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                                {exifCandidates.length > 1 && (
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {exifCandidates.map((candidate) => {
                                                            const isActiveCandidate =
                                                                candidate.fileId ===
                                                                selectedExifCandidate?.fileId;
                                                            return (
                                                                <button
                                                                    key={`exif-candidate-${candidate.fileId}`}
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setSelectedExifCandidateFileId(
                                                                            candidate.fileId,
                                                                        )
                                                                    }
                                                                    className={`px-2 py-1 rounded-lg text-[9px] font-bold transition-colors ${
                                                                        isActiveCandidate
                                                                            ? 'bg-amber-600 text-white'
                                                                            : 'bg-white/80 dark:bg-slate-900/70 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                                                    }`}
                                                                >
                                                                    {candidate.originalName ||
                                                                        t.vault.detail.candidate}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Metadata Cards */}
                                        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                            <div className="flex items-center gap-2 mb-1 text-slate-400">
                                                <Camera size={12} />{' '}
                                                <span className="text-[9px] font-black uppercase tracking-widest">
                                                    {t.vault.detail.device}
                                                </span>
                                            </div>
                                            <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate">
                                                {(media.metadata as any)?.exif?.make}{' '}
                                                {(media.metadata as any)?.exif?.model ||
                                                    t.vault.detail.unknownCamera}
                                            </p>
                                        </div>

                                        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                            <div className="flex items-center gap-2 mb-1 text-slate-400">
                                                <Aperture size={12} />{' '}
                                                <span className="text-[9px] font-black uppercase tracking-widest">
                                                    {t.vault.detail.settings}
                                                </span>
                                            </div>
                                            <p className="text-[10px] font-medium text-slate-600 dark:text-slate-300">
                                                {/* Example safe access to deep properties */}
                                                ISO {(media.metadata as any)?.exif?.iso || '--'} •
                                                ƒ/{(media.metadata as any)?.exif?.fNumber || '--'} •{' '}
                                                {(media.metadata as any)?.exif?.exposureTime
                                                    ? `1/${Math.round(1 / (media.metadata as any).exif.exposureTime)}`
                                                    : '--'}
                                                s
                                            </p>
                                        </div>

                                        {locationMapHref && (
                                            <div className="col-span-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1 text-slate-400">
                                                        <MapPin size={12} />{' '}
                                                        <span className="text-[9px] font-black uppercase tracking-widest">
                                                            {t.vault.detail.gpsCoordinates}
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] font-mono text-slate-600 dark:text-slate-300">
                                                        {locationPreviewText}
                                                    </p>
                                                </div>
                                                <a
                                                    href={locationMapHref}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="p-2 bg-white dark:bg-slate-900 rounded-xl text-primary hover:bg-primary hover:text-white transition-colors"
                                                >
                                                    <Maximize2 size={14} />
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                        {/* Tags List */}
                        <div className="space-y-3">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                {t.vault.detail.preservationTags}
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {media.tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl text-[10px] font-bold text-slate-600 dark:text-slate-300"
                                    >
                                        {tag}
                                        {canEdit && (
                                            <button
                                                onClick={() => onRemoveTag(tag)}
                                                className="text-slate-300 hover:text-rose-500"
                                            >
                                                <X size={10} />
                                            </button>
                                        )}
                                    </span>
                                ))}
                                {canEdit && (
                                    <button
                                        onClick={() => setTagInputVisible(true)}
                                        className="px-3 flex gap-1.5 items-center py-1.5 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-[10px] font-bold text-slate-400 hover:text-primary transition-all"
                                    >
                                        <Plus size={12} /> {t.vault.detail.add}
                                    </button>
                                )}
                            </div>
                            {canEdit && isTagInputVisible && (
                                <form
                                    onSubmit={onManualTagSubmit}
                                    className="flex gap-2 animate-in fade-in slide-in-from-left-2"
                                >
                                    <input
                                        autoFocus
                                        value={manualTagValue}
                                        onChange={(e) => onTagInputChange(e.target.value)}
                                        placeholder={t.common.actions.newTagPlaceholder}
                                        className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                                    />
                                    <button
                                        type="submit"
                                        className="px-3 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-black uppercase tracking-widest"
                                    >
                                        {t.common.actions.save}
                                    </button>
                                </form>
                            )}
                        </div>

                        {/* File List (View Mode) */}
                        {!isEditMode && memoryFiles.length > 1 && (
                            <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    {t.vault.detail.filesInMemory} ({memoryFiles.length})
                                </h3>
                                <div className="space-y-2">
                                    {memoryFiles.map((file) => (
                                        <button
                                            key={file.id}
                                            onClick={() => setActiveFileId(file.id)}
                                            className={`w-full flex items-center gap-3 p-2 rounded-2xl border text-left transition-all ${activeFile?.id === file.id ? 'bg-primary/5 border-primary ring-1 ring-primary/20' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-primary/50'}`}
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 overflow-hidden text-slate-400">
                                                {file.fileType === 'PHOTO' ? (
                                                    <PresignedImage
                                                        src={file.fileUrl}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <FileText size={18} />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p
                                                    className={`text-[11px] font-bold truncate ${activeFile?.id === file.id ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}
                                                >
                                                    {file.originalName}
                                                </p>
                                                <p className="text-[9px] text-slate-400">
                                                    {file.fileType}
                                                </p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Actions (Sticky) */}
                    <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 backdrop-blur z-20">
                        <div className="flex gap-3">
                            <button
                                onClick={(e) => onToggleFavorite(e, media.id)}
                                className={`flex-1 py-3 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all border ${
                                    isFavorite
                                        ? 'bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-500/20'
                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-primary hover:text-primary'
                                }`}
                            >
                                <Heart size={14} fill={isFavorite ? 'currentColor' : 'none'} />{' '}
                                {isFavorite ? t.vault.detail.essential : t.vault.detail.markEssential}
                            </button>

                            <div className="flex gap-2">
                                <button
                                    onClick={handleShare}
                                    className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-400 hover:text-primary hover:border-primary transition-all"
                                >
                                    <Share2 size={18} />
                                </button>
                                <button
                                    onClick={handleDownload}
                                    disabled={downloadMediaMutation.isPending}
                                    className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-400 hover:text-primary hover:border-primary transition-all"
                                >
                                    {downloadMediaMutation.isPending ? (
                                        <Loader2 size={18} className="animate-spin" />
                                    ) : (
                                        <Download size={18} />
                                    )}
                                </button>
                                {canDelete && (
                                    <button
                                        onClick={() => onDelete(media.id)}
                                        className="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/20 rounded-2xl text-rose-500 hover:bg-rose-500 hover:text-white hover:shadow-lg hover:shadow-rose-500/20 transition-all"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MediaDetailModal;
