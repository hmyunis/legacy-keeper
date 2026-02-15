import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { mediaTagsApi } from '../services/membersApi';
import { mediaApi } from '../services/mediaApi';
import { getApiErrorMessage } from '../services/httpError';
import { toast } from 'sonner';

export interface CreateMediaTagPayload {
  mediaId: string;
  personId: string;
  faceCoordinates?: Record<string, number> | null;
}

export const useMediaTags = (mediaId?: string) => {
  return useQuery({
    queryKey: ['mediaTags', mediaId],
    queryFn: () => {
      if (!mediaId) throw new Error('Media ID is required');
      return mediaTagsApi.getTags(mediaId);
    },
    enabled: Boolean(mediaId),
  });
};

export const useCreateMediaTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateMediaTagPayload) => 
      mediaTagsApi.createTag({
        mediaItem: payload.mediaId,
        person: payload.personId,
        faceCoordinates: payload.faceCoordinates || null,
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['mediaTags', variables.mediaId] });
      toast.success('Relative linked to media');
    },
    onError: (error) => {
      toast.error('Failed to link relative', {
        description: getApiErrorMessage(error, 'Please try again.'),
      });
    },
  });
};

export const useDeleteMediaTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tagId, mediaId }: { tagId: string; mediaId: string }) =>
      mediaTagsApi.deleteTag(tagId).then(() => mediaId),
    onSuccess: (mediaId) => {
      queryClient.invalidateQueries({ queryKey: ['mediaTags', mediaId] });
      toast.success('Relative unlinked from media');
    },
    onError: (error) => {
      toast.error('Failed to unlink relative', {
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
