
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { PersonProfile } from '../types';
import { toast } from 'sonner';

export const useProfiles = () => {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: api.getProfiles,
  });
};

export const useAddProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (person: Omit<PersonProfile, 'id' | 'isLinkedToUser'>) => {
      const promise = api.addProfile(person);
      toast.promise(promise, {
        loading: 'Documenting legacy profile...',
        success: 'New lineage record established',
        error: 'Failed to create archival profile',
      });
      return promise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
  });
};
