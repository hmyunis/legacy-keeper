import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { mediaApi } from '../services/mediaApi';
import type { MediaItem } from '../types';

const syncUpdatedMediaInPages = (old: any, updatedMedia: MediaItem) => {
  if (!old?.pages) return old;
  return {
    ...old,
    pages: old.pages.map((page: any) => ({
      ...page,
      items: page.items.map((item: MediaItem) => (item.id === updatedMedia.id ? updatedMedia : item)),
    })),
  };
};

export const useSignedUrlRecovery = () => {
  const queryClient = useQueryClient();

  return useCallback(
    async (mediaId?: string): Promise<MediaItem | null> => {
      const refreshTasks: Promise<unknown>[] = [
        queryClient.invalidateQueries({ queryKey: ['media'], refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['mediaFavorites'], refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['profiles'], refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['profile'], refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['members'], refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['vaults'], refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['vault'], refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['treeData'], refetchType: 'active' }),
      ];

      if (!mediaId) {
        await Promise.allSettled(refreshTasks);
        return null;
      }

      let refreshedMedia: MediaItem | null = null;
      try {
        refreshedMedia = await mediaApi.getMediaItem(mediaId);
      } catch {
        refreshedMedia = null;
      }

      if (refreshedMedia) {
        queryClient.setQueryData(['media', mediaId], refreshedMedia);
        queryClient.setQueriesData({ queryKey: ['media'] }, (old: any) => syncUpdatedMediaInPages(old, refreshedMedia!));
        queryClient.setQueriesData(
          { queryKey: ['mediaFavorites'] },
          (old: any) => syncUpdatedMediaInPages(old, refreshedMedia!)
        );
      }

      refreshTasks.push(
        queryClient.invalidateQueries({ queryKey: ['mediaExifStatus', mediaId], refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['mediaFaceDetectionStatus', mediaId], refetchType: 'active' })
      );
      await Promise.allSettled(refreshTasks);

      return refreshedMedia;
    },
    [queryClient]
  );
};
