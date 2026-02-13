
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { Relationship } from '../types';
import { toast } from 'sonner';

export const useRelationships = () => {
  return useQuery({
    queryKey: ['relationships'],
    queryFn: api.getRelationships,
  });
};

export const useAddRelationship = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (rel: Omit<Relationship, 'id'>) => {
      const promise = api.addRelationship(rel);
      toast.promise(promise, {
        loading: 'Establishing kinship link...',
        success: 'Lineage branch connected',
        error: 'Failed to establish relationship',
      });
      return promise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relationships'] });
    },
  });
};
