import { useCallback } from 'react';
import type { Dispatch, MouseEvent, SetStateAction } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
  UpdateMediaMetadataPayload,
  UploadMediaPayload,
} from '@/services/mediaApi';
import { MediaType, type MediaItem } from '@/types';
import type { VaultUploadState } from '@/features/vault/utils';

type ToggleFavoriteMutate = (
  payload: { mediaId: string; isFavorite?: boolean },
  options?: {
    onSuccess?: (result: { mediaId: string; isFavorite: boolean }) => void;
  },
) => void;

type UploadMediaMutate = (
  payload: {
    payload: UploadMediaPayload;
    onUploadProgress?: (progress: number) => void;
  },
  options?: {
    onSuccess?: (createdMedia: MediaItem) => void;
  },
) => void;

type UpdateMediaMutate = (
  payload: UpdateMediaMetadataPayload,
  options?: {
    onSuccess?: (updatedMedia: MediaItem) => void;
  },
) => void;

interface UseVaultMediaMutationsInput {
  queryClient: QueryClient;
  allMedia: MediaItem[];
  selectedMedia: MediaItem | null;
  setSelectedMedia: Dispatch<SetStateAction<MediaItem | null>>;
  setUploadState: Dispatch<SetStateAction<VaultUploadState>>;
  vaultDefaultVisibility: 'private' | 'family';
  canUpload: boolean;
  isUploadPending: boolean;
  toggleFavoriteMutate: ToggleFavoriteMutate;
  uploadMediaMutate: UploadMediaMutate;
  updateMediaMutate: UpdateMediaMutate;
  startExifPollingForMedia: (
    mediaId: string,
    exifStatus?: MediaItem['exifStatus'],
    faceDetectionStatus?: MediaItem['faceDetectionStatus'],
  ) => void;
  favoriteAddedMessage: string;
  favoriteRemovedMessage: string;
}

const mapMediaPages = (oldData: unknown, updatedMedia: MediaItem) => {
  const typed = oldData as { pages?: Array<{ items?: MediaItem[] }> } | undefined;
  if (!typed?.pages) return oldData;
  return {
    ...typed,
    pages: typed.pages.map((page) => ({
      ...page,
      items: (page.items || []).map((item) => (item.id === updatedMedia.id ? updatedMedia : item)),
    })),
  };
};

export const useVaultMediaMutations = ({
  queryClient,
  allMedia,
  selectedMedia,
  setSelectedMedia,
  setUploadState,
  vaultDefaultVisibility,
  canUpload,
  isUploadPending,
  toggleFavoriteMutate,
  uploadMediaMutate,
  updateMediaMutate,
  startExifPollingForMedia,
  favoriteAddedMessage,
  favoriteRemovedMessage,
}: UseVaultMediaMutationsInput) => {
  const resetUploadState = useCallback(() => {
    setUploadState({
      open: false,
      progress: 0,
      date: new Date(),
      files: [],
      primaryFileIndex: 0,
      title: '',
      location: '',
      tags: '',
      story: '',
      visibility: vaultDefaultVisibility,
      lockRule: 'none',
      lockReleaseAt: '',
      lockTargetUserIds: [],
    });
  }, [setUploadState, vaultDefaultVisibility]);

  const syncMediaRecord = useCallback(
    (updatedMedia: MediaItem) => {
      setSelectedMedia(updatedMedia);
      queryClient.setQueriesData({ queryKey: ['media'] }, (old) =>
        mapMediaPages(old, updatedMedia),
      );
      queryClient.setQueriesData({ queryKey: ['mediaFavorites'] }, (old) =>
        mapMediaPages(old, updatedMedia),
      );
    },
    [queryClient, setSelectedMedia],
  );

  const handleUploadSuccess = useCallback(
    (createdMedia: MediaItem) => {
      resetUploadState();
      setSelectedMedia(createdMedia);
      if (createdMedia.type === MediaType.PHOTO) {
        startExifPollingForMedia(
          createdMedia.id,
          createdMedia.exifStatus,
          createdMedia.faceDetectionStatus,
        );
      }
    },
    [resetUploadState, setSelectedMedia, startExifPollingForMedia],
  );

  const handleStartUpload = useCallback(
    (uploadState: VaultUploadState) => {
      if (!canUpload || isUploadPending) return;

      if (!uploadState.files.length) {
        toast.error('Please select at least one file to upload.');
        return;
      }

      const normalizedTitle = uploadState.title.trim();
      if (!normalizedTitle) {
        toast.error('Title is required.');
        return;
      }

      if (uploadState.files.length > 10) {
        toast.error('You can upload up to 10 files at a time.');
        return;
      }

      const parsedTags = uploadState.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);

      const needsTimeCondition =
        uploadState.lockRule === 'time' ||
        uploadState.lockRule === 'time_and_target';
      const needsTargetCondition =
        uploadState.lockRule === 'targeted' ||
        uploadState.lockRule === 'time_and_target';

      if (needsTimeCondition && !uploadState.lockReleaseAt.trim()) {
        toast.error('Unlock date-time is required for this lock rule.');
        return;
      }
      if (needsTargetCondition && uploadState.lockTargetUserIds.length === 0) {
        toast.error('Select at least one target user for this lock rule.');
        return;
      }

      uploadMediaMutate(
        {
          payload: {
            files: uploadState.files,
            primaryFileIndex: uploadState.primaryFileIndex,
            title: normalizedTitle,
            description: uploadState.story,
            dateTaken: uploadState.date?.toISOString(),
            location: uploadState.location,
            tags: parsedTags,
            visibility: uploadState.visibility,
            lockRule: uploadState.lockRule,
            lockReleaseAt: uploadState.lockReleaseAt
              ? new Date(uploadState.lockReleaseAt).toISOString()
              : null,
            lockTargetUserIds: uploadState.lockTargetUserIds,
          },
          onUploadProgress: (progress) => {
            setUploadState((current) => ({ ...current, progress }));
          },
        },
        {
          onSuccess: (createdMedia) => {
            handleUploadSuccess(createdMedia);
          },
        },
      );
    },
    [canUpload, handleUploadSuccess, isUploadPending, setUploadState, uploadMediaMutate],
  );

  const toggleFav = useCallback(
    (event: MouseEvent, id: string) => {
      event.stopPropagation();
      const target =
        allMedia.find((item) => item.id === id) ||
        (selectedMedia?.id === id ? selectedMedia : null);
      const nextFavorite = !target?.isFavorite;

      toggleFavoriteMutate(
        { mediaId: id, isFavorite: nextFavorite },
        {
          onSuccess: (result) => {
            setSelectedMedia((current) =>
              current && current.id === result.mediaId
                ? { ...current, isFavorite: result.isFavorite }
                : current,
            );

            if (result.isFavorite) toast.success(favoriteAddedMessage);
            else toast.info(favoriteRemovedMessage);
          },
        },
      );
    },
    [
      allMedia,
      favoriteAddedMessage,
      favoriteRemovedMessage,
      selectedMedia,
      setSelectedMedia,
      toggleFavoriteMutate,
    ],
  );

  const persistTags = useCallback(
    (nextTags: string[]) => {
      if (!selectedMedia) return;

      const normalizedTags = Array.from(
        new Set(nextTags.map((tag) => tag.trim()).filter(Boolean)),
      );
      updateMediaMutate(
        {
          id: selectedMedia.id,
          tags: normalizedTags,
          location: selectedMedia.location,
        },
        {
          onSuccess: (updatedMedia) => {
            syncMediaRecord(updatedMedia);
          },
        },
      );
    },
    [selectedMedia, syncMediaRecord, updateMediaMutate],
  );

  const handleUpdateMedia = useCallback(
    (
      payload: UpdateMediaMetadataPayload,
      onSuccess?: (updatedMedia: MediaItem) => void,
    ) => {
      updateMediaMutate(payload, {
        onSuccess: (updatedMedia) => {
          syncMediaRecord(updatedMedia);
          if (updatedMedia.type === MediaType.PHOTO) {
            startExifPollingForMedia(
              updatedMedia.id,
              updatedMedia.exifStatus,
              updatedMedia.faceDetectionStatus,
            );
          }
          onSuccess?.(updatedMedia);
        },
      });
    },
    [startExifPollingForMedia, syncMediaRecord, updateMediaMutate],
  );

  return {
    handleStartUpload,
    handleUpdateMedia,
    persistTags,
    resetUploadState,
    syncMediaRecord,
    toggleFav,
  };
};
