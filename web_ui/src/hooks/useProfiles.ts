import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { genealogyApi, type ProfilesQueryParams } from '../services/genealogyApi';
import { PersonProfile } from '../types';
import { toast } from 'sonner';
import { useAuthStore } from '../stores/authStore';
import { getApiErrorMessage } from '../services/httpError';

const DEFAULT_PAGE_SIZE = 20;

export const useProfiles = (params?: Omit<ProfilesQueryParams, 'page'>) => {
  const { activeVaultId } = useAuthStore();

  return useInfiniteQuery({
    queryKey: ['profiles', activeVaultId, params],
    queryFn: ({ pageParam = 1 }) => {
      if (!activeVaultId) throw new Error('No active vault selected');
      return genealogyApi.getProfiles(activeVaultId, { ...params, page: pageParam, pageSize: DEFAULT_PAGE_SIZE });
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

export const useProfile = (profileId: string) => {
  return useQuery({
    queryKey: ['profile', profileId],
    queryFn: () => genealogyApi.getProfile(profileId),
    enabled: Boolean(profileId),
  });
};

export interface ProfileFormData {
  fullName: string;
  birthDate?: string | null;
  birthPlace?: string;
  deathDate?: string | null;
  biography?: string;
  profilePhoto?: File;
}

export const useAddProfile = () => {
  const queryClient = useQueryClient();
  const { activeVaultId } = useAuthStore();

  return useMutation({
    mutationFn: (data: ProfileFormData) => {
      if (!activeVaultId) throw new Error('No active vault selected');
      return genealogyApi.createProfile({
        vault: activeVaultId,
        fullName: data.fullName,
        birthDate: data.birthDate || null,
        birthPlace: data.birthPlace,
        deathDate: data.deathDate || null,
        bio: data.biography,
        profilePhoto: data.profilePhoto,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['treeData'] });
      toast.success('New lineage record established');
    },
    onError: (error) => {
      toast.error('Failed to create archival profile', {
        description: getApiErrorMessage(error, 'Please try again.'),
      });
    },
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      profileId, 
      data 
    }: { 
      profileId: string; 
      data: Partial<ProfileFormData>;
    }) => genealogyApi.updateProfile(profileId, {
      fullName: data.fullName,
      birthDate: data.birthDate,
      birthPlace: data.birthPlace,
      deathDate: data.deathDate,
      bio: data.biography,
      profilePhoto: data.profilePhoto,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['treeData'] });
      toast.success('Profile updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update profile', {
        description: getApiErrorMessage(error, 'Please try again.'),
      });
    },
  });
};

export const useDeleteProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (profileId: string) => genealogyApi.deleteProfile(profileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['treeData'] });
      toast.success('Profile removed from tree');
    },
    onError: (error) => {
      toast.error('Failed to remove profile', {
        description: getApiErrorMessage(error, 'Please try again.'),
      });
    },
  });
};
