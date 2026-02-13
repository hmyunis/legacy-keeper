import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { toast } from 'sonner';

export const useMedia = () => {
  return useQuery({
    queryKey: ['media'],
    queryFn: api.getMedia,
  });
};

export const useDeleteMedia = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => {
      const promise = api.deleteMedia(id);
      toast.promise(promise, {
        loading: 'Purging archival record...',
        success: 'Artifact successfully removed from vault',
        error: 'Failed to delete artifact',
      });
      return promise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
    },
  });
};

export const useBulkDeleteMedia = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => {
      const promise = Promise.all(ids.map(id => api.deleteMedia(id)));
      toast.promise(promise, {
        loading: `Purging ${ids.length} artifacts...`,
        success: 'Batch operation completed successfully',
        error: 'Failed to complete batch purge',
      });
      return promise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
    },
  });
};