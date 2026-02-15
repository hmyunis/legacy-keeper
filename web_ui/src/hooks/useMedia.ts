import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { mediaApi, type UploadMediaPayload, type UpdateMediaMetadataPayload, type MediaQueryParams } from '../services/mediaApi';
import { toast } from 'sonner';
import { useAuthStore } from '../stores/authStore';
import { getApiErrorMessage } from '../services/httpError';
import type { MediaItem } from '../types';

const DEFAULT_PAGE_SIZE = 20;

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

export const useMedia = (params?: Omit<MediaQueryParams, 'page'>) => {
  const { activeVaultId } = useAuthStore();

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
    enabled: Boolean(activeVaultId),
  });
};

export const useFavoriteMedia = (params?: Omit<MediaQueryParams, 'page'>) => {
  const { activeVaultId } = useAuthStore();

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
    enabled: Boolean(activeVaultId),
  });
};

export const useMediaFilters = (
  params?: Omit<MediaQueryParams, 'page' | 'pageSize' | 'sortBy'>
) => {
  const { activeVaultId } = useAuthStore();

  return useQuery({
    queryKey: ['mediaFilters', activeVaultId, params],
    queryFn: () => {
      if (!activeVaultId) throw new Error('No active vault selected');
      return mediaApi.getMediaFilters(activeVaultId, params);
    },
    enabled: Boolean(activeVaultId),
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      toast.success('Memory preserved in vault');
    },
    onError: (error) => {
      toast.error('Failed to preserve memory', {
        description: getApiErrorMessage(error, 'Please verify file size and details, then try again.'),
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
    },
    onError: (error) => {
      toast.error('Failed to update media tags', {
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
