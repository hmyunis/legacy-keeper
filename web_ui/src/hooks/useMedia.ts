import { useQuery, useMutation, useQueryClient, useInfiniteQuery, type QueryClient } from '@tanstack/react-query';
import {
  mediaApi,
  type UploadMediaPayload,
  type UpdateMediaMetadataPayload,
  type MediaQueryParams,
  type ConfirmExifPayload,
  type RotateMediaFilePayload,
  type RestoreMediaFilePayload,
} from '../services/mediaApi';
import { toast } from 'sonner';
import { useAuthStore } from '../stores/authStore';
import { getApiErrorMessage } from '../services/httpError';
import {
  MediaExifStatus,
  MediaFaceDetectionStatus,
  type MediaItem,
  type MediaExifWorkflowStatus,
  type MediaFaceDetectionWorkflowStatus,
  MediaRestorationStatus,
  type MediaRestorationWorkflowStatus,
} from '../types';

const DEFAULT_PAGE_SIZE = 20;
const EXIF_ACTIVE_STATUSES = new Set<MediaExifStatus>([
  MediaExifStatus.QUEUED,
  MediaExifStatus.PROCESSING,
]);
const FACE_DETECTION_ACTIVE_STATUSES = new Set<MediaFaceDetectionStatus>([
  MediaFaceDetectionStatus.QUEUED,
  MediaFaceDetectionStatus.PROCESSING,
]);
const RESTORATION_ACTIVE_STATUSES = new Set<MediaRestorationStatus>([
  MediaRestorationStatus.QUEUED,
  MediaRestorationStatus.PROCESSING,
]);

interface QueryOptions {
  enabled?: boolean;
  poll?: boolean;
}

const updateFavoriteStateInPages = (old: any, mediaId: string, isFavorite: boolean) => {
  if (!old?.pages) return old;
  return {
    ...old,
    pages: old.pages.map((page: any) => ({
      ...page,
      items: page.items.map((item: MediaItem) => (item.id === mediaId ? { ...item, isFavorite } : item)),
    })),
  };
};

export const useMedia = (params?: Omit<MediaQueryParams, 'page'>, options?: QueryOptions) => {
  const { activeVaultId } = useAuthStore();
  const enabled = options?.enabled ?? true;

  return useInfiniteQuery({
    queryKey: ['media', activeVaultId, params],
    queryFn: ({ pageParam = 1 }) => {
      if (!activeVaultId) throw new Error('No active vault selected');
      return mediaApi.getMedia(activeVaultId, { ...params, page: pageParam, pageSize: DEFAULT_PAGE_SIZE });
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.hasNextPage) {
        return allPages.length + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    enabled: Boolean(activeVaultId) && enabled,
  });
};

export const useFavoriteMedia = (params?: Omit<MediaQueryParams, 'page'>, options?: QueryOptions) => {
  const { activeVaultId } = useAuthStore();
  const enabled = options?.enabled ?? true;

  return useInfiniteQuery({
    queryKey: ['mediaFavorites', activeVaultId, params],
    queryFn: ({ pageParam = 1 }) => {
      if (!activeVaultId) throw new Error('No active vault selected');
      return mediaApi.getFavoriteMedia(activeVaultId, { ...params, page: pageParam, pageSize: DEFAULT_PAGE_SIZE });
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.hasNextPage) {
        return allPages.length + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    enabled: Boolean(activeVaultId) && enabled,
  });
};

export const useMediaFilters = (
  params?: Omit<MediaQueryParams, 'page' | 'pageSize' | 'sortBy'>,
  options?: QueryOptions,
) => {
  const { activeVaultId } = useAuthStore();
  const enabled = options?.enabled ?? true;

  return useQuery({
    queryKey: ['mediaFilters', activeVaultId, params],
    queryFn: () => {
      if (!activeVaultId) throw new Error('No active vault selected');
      return mediaApi.getMediaFilters(activeVaultId, params);
    },
    enabled: Boolean(activeVaultId) && enabled,
  });
};

export const useMediaItem = (mediaId: string) => {
  return useQuery({
    queryKey: ['media', mediaId],
    queryFn: () => mediaApi.getMediaItem(mediaId),
    enabled: Boolean(mediaId),
  });
};

export const useDeleteMedia = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => mediaApi.deleteMedia(id),
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ['media'] });
      const previousData = queryClient.getQueryData(['media']);
      
      queryClient.setQueryData(['media'], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            items: page.items.filter((item: any) => item.id !== deletedId),
            totalCount: page.totalCount - 1,
          })),
        };
      });
      
      return { previousData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      queryClient.invalidateQueries({ queryKey: ['mediaFavorites'] });
      toast.success('Artifact successfully removed from vault');
    },
    onError: (error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['media'], context.previousData);
      }
      toast.error('Failed to delete artifact', {
        description: getApiErrorMessage(error, 'Please try again.'),
      });
    },
  });
};

export const useUploadMedia = () => {
  const queryClient = useQueryClient();
  const { activeVaultId } = useAuthStore();

  return useMutation({
    mutationFn: ({ 
      payload, 
      onUploadProgress 
    }: { 
      payload: UploadMediaPayload; 
      onUploadProgress?: (progress: number) => void;
    }) => {
      if (!activeVaultId) throw new Error('No active vault selected');
      return mediaApi.createMedia(activeVaultId, payload, onUploadProgress);
    },
    onSuccess: (createdMedia) => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      toast.success('Memory preserved in vault');
      if (
        createdMedia.exifStatus === MediaExifStatus.QUEUED ||
        createdMedia.exifStatus === MediaExifStatus.PROCESSING ||
        createdMedia.exifStatus === MediaExifStatus.AWAITING_CONFIRMATION
      ) {
        toast.info('Photo EXIF extraction started in the background. You can confirm suggested date/GPS once ready.');
      }
      if (
        createdMedia.faceDetectionStatus === MediaFaceDetectionStatus.QUEUED ||
        createdMedia.faceDetectionStatus === MediaFaceDetectionStatus.PROCESSING
      ) {
        toast.info('Face detection started in the background. Review each detected face before confirming a person.');
      }
    },
    onError: (error) => {
      toast.error('Failed to preserve memory', {
        description: getApiErrorMessage(error, 'Please verify file size and details, then try again.'),
      });
    },
  });
};

export const useMediaExifStatus = (mediaId: string, options?: QueryOptions) => {
  const enabled = options?.enabled ?? true;
  const poll = options?.poll ?? false;
  return useQuery({
    queryKey: ['mediaExifStatus', mediaId],
    queryFn: () => mediaApi.getExifStatus(mediaId),
    enabled: Boolean(mediaId) && enabled,
    refetchInterval: (query) => {
      if (!poll) return false;
      const status = (query.state.data as MediaExifWorkflowStatus | undefined)?.status;
      if (status === MediaExifStatus.NOT_STARTED) {
        return query.state.dataUpdateCount < 10 ? 3000 : false;
      }
      return status && EXIF_ACTIVE_STATUSES.has(status) ? 3000 : false;
    },
  });
};

export const useMediaFaceDetectionStatus = (mediaId: string, options?: QueryOptions) => {
  const enabled = options?.enabled ?? true;
  const poll = options?.poll ?? false;
  return useQuery({
    queryKey: ['mediaFaceDetectionStatus', mediaId],
    queryFn: () => mediaApi.getFaceDetectionStatus(mediaId),
    enabled: Boolean(mediaId) && enabled,
    refetchInterval: (query) => {
      if (!poll) return false;
      const status = (query.state.data as MediaFaceDetectionWorkflowStatus | undefined)?.status;
      if (status === MediaFaceDetectionStatus.NOT_STARTED) {
        return query.state.dataUpdateCount < 10 ? 3000 : false;
      }
      return status && FACE_DETECTION_ACTIVE_STATUSES.has(status) ? 3000 : false;
    },
  });
};

export const useMediaRestorationStatus = (
  mediaId: string,
  fileId?: string,
  options?: QueryOptions,
) => {
  const enabled = options?.enabled ?? true;
  const poll = options?.poll ?? false;
  return useQuery({
    queryKey: ['mediaRestorationStatus', mediaId, fileId],
    queryFn: () => mediaApi.getRestorationStatus(mediaId, fileId),
    enabled: Boolean(mediaId) && enabled,
    refetchInterval: (query) => {
      if (!poll) return false;
      const status = (query.state.data as MediaRestorationWorkflowStatus | undefined)?.status;
      if (status === MediaRestorationStatus.NOT_STARTED) {
        return query.state.dataUpdateCount < 10 ? 2500 : false;
      }
      return status && RESTORATION_ACTIVE_STATUSES.has(status) ? 2500 : false;
    },
  });
};

const syncUpdatedMediaInCaches = (queryClient: QueryClient, updatedMedia: MediaItem) => {
  queryClient.setQueriesData({ queryKey: ['media'] }, (old: any) => {
    if (!old?.pages) return old;
    return {
      ...old,
      pages: old.pages.map((page: any) => ({
        ...page,
        items: page.items.map((item: MediaItem) => (item.id === updatedMedia.id ? updatedMedia : item)),
      })),
    };
  });
  queryClient.setQueriesData({ queryKey: ['mediaFavorites'] }, (old: any) => {
    if (!old?.pages) return old;
    return {
      ...old,
      pages: old.pages.map((page: any) => ({
        ...page,
        items: page.items.map((item: MediaItem) => (item.id === updatedMedia.id ? updatedMedia : item)),
      })),
    };
  });
};

export const useConfirmMediaExif = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ mediaId, payload }: { mediaId: string; payload: ConfirmExifPayload }) =>
      mediaApi.confirmExif(mediaId, payload),
    onSuccess: (updatedMedia) => {
      syncUpdatedMediaInCaches(queryClient, updatedMedia);
      queryClient.invalidateQueries({ queryKey: ['mediaExifStatus', updatedMedia.id] });
      toast.success('EXIF metadata decision saved.');
    },
    onError: (error) => {
      toast.error('Failed to save EXIF confirmation', {
        description: getApiErrorMessage(error, 'Please try again.'),
      });
    },
  });
};

export const useUpdateMediaMetadata = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateMediaMetadataPayload) => 
      mediaApi.updateMedia(payload.id, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(['media'], (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            items: page.items.map((item: any) => 
              item.id === data.id ? data : item
            ),
          })),
        };
      });
      queryClient.invalidateQueries({ queryKey: ['media'] });
      queryClient.invalidateQueries({ queryKey: ['mediaRestorationStatus', data.id] });
    },
    onError: (error) => {
      toast.error('Failed to update media', {
        description: getApiErrorMessage(error, 'Please try again.'),
      });
    },
  });
};

export const useRotateMediaFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ mediaId, payload }: { mediaId: string; payload: RotateMediaFilePayload }) =>
      mediaApi.rotateMediaFile(mediaId, payload),
    onSuccess: (updatedMedia) => {
      syncUpdatedMediaInCaches(queryClient, updatedMedia);
      queryClient.invalidateQueries({ queryKey: ['mediaExifStatus', updatedMedia.id] });
      queryClient.invalidateQueries({ queryKey: ['mediaFaceDetectionStatus', updatedMedia.id] });
      queryClient.invalidateQueries({ queryKey: ['mediaRestorationStatus', updatedMedia.id] });
      toast.success('Rotation saved');
    },
    onError: (error) => {
      toast.error('Failed to save rotation', {
        description: getApiErrorMessage(error, 'Please try again.'),
      });
    },
  });
};

export const useRestoreMediaFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ mediaId, payload }: { mediaId: string; payload: RestoreMediaFilePayload }) =>
      mediaApi.restoreMediaFile(mediaId, payload),
    onSuccess: (restorationStatus, variables) => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      queryClient.invalidateQueries({ queryKey: ['mediaFavorites'] });
      queryClient.invalidateQueries({ queryKey: ['media', variables.mediaId] });
      queryClient.invalidateQueries({
        queryKey: ['mediaRestorationStatus', variables.mediaId, variables.payload.fileId],
      });
      if (restorationStatus.status === MediaRestorationStatus.FAILED) {
        toast.error('Photo restoration failed', {
          description: restorationStatus.error || 'Please try again.',
        });
      } else if (restorationStatus.status === MediaRestorationStatus.COMPLETED) {
        toast.success('Photo restoration is ready.');
      } else {
        toast.success('Photo restoration started.');
      }
    },
    onError: (error) => {
      toast.error('Failed to start restoration', {
        description: getApiErrorMessage(error, 'Please try again.'),
      });
    },
  });
};

export const useToggleMediaFavorite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ mediaId, isFavorite }: { mediaId: string; isFavorite?: boolean }) =>
      mediaApi.toggleFavorite(mediaId, isFavorite),
    onMutate: async ({ mediaId, isFavorite }) => {
      const nextFavorite = typeof isFavorite === 'boolean' ? isFavorite : undefined;
      if (nextFavorite === undefined) {
        return {};
      }

      await Promise.all([
        queryClient.cancelQueries({ queryKey: ['media'] }),
        queryClient.cancelQueries({ queryKey: ['mediaFavorites'] }),
      ]);

      const previousMedia = queryClient.getQueriesData({ queryKey: ['media'] });
      const previousFavorites = queryClient.getQueriesData({ queryKey: ['mediaFavorites'] });

      queryClient.setQueriesData({ queryKey: ['media'] }, (old: any) =>
        updateFavoriteStateInPages(old, mediaId, nextFavorite),
      );
      queryClient.setQueriesData({ queryKey: ['mediaFavorites'] }, (old: any) => {
        if (!old?.pages) return old;
        if (nextFavorite) {
          return updateFavoriteStateInPages(old, mediaId, true);
        }

        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            items: page.items.filter((item: MediaItem) => item.id !== mediaId),
          })),
        };
      });

      return { previousMedia, previousFavorites };
    },
    onError: (error, _variables, context) => {
      context?.previousMedia?.forEach(([key, value]: [unknown, unknown]) => {
        queryClient.setQueryData(key as any, value);
      });
      context?.previousFavorites?.forEach(([key, value]: [unknown, unknown]) => {
        queryClient.setQueryData(key as any, value);
      });
      toast.error('Failed to update favorite status', {
        description: getApiErrorMessage(error, 'Please try again.'),
      });
    },
    onSuccess: (data) => {
      queryClient.setQueriesData({ queryKey: ['media'] }, (old: any) =>
        updateFavoriteStateInPages(old, data.mediaId, data.isFavorite),
      );
      queryClient.invalidateQueries({ queryKey: ['mediaFavorites'] });
    },
  });
};

export const useBulkDeleteMedia = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => mediaApi.deleteMedia(id)));
      return ids;
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      queryClient.invalidateQueries({ queryKey: ['mediaFavorites'] });
      toast.success(`${ids.length} artifacts removed successfully`);
    },
    onError: (error) => {
      toast.error('Failed to complete batch purge', {
        description: getApiErrorMessage(error, 'Please try again.'),
      });
    },
  });
};

export const useDownloadMedia = () => {
  return useMutation({
    mutationFn: ({ mediaItem, fileName }: { mediaItem: any; fileName?: string }) => 
      mediaApi.downloadMedia(mediaItem, fileName),
    onSuccess: () => {
      toast.success('Download started');
    },
    onError: (error) => {
      toast.error('Failed to download file', {
        description: getApiErrorMessage(error, 'Please try again.'),
      });
    },
  });
};
