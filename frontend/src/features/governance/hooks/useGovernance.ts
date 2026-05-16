import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { governanceService } from '../api/governance.service';

export const useMembers = () => {
  return useQuery({
    queryKey: ['members'],
    queryFn: governanceService.getMembers,
    initialData: [],
  });
};

export const useInviteMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: governanceService.inviteMember,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['members'] }),
  });
};

export const useRequestPact = () => {
  return useMutation({
    mutationFn: governanceService.requestPact,
  });
};

export const useRemoveMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: governanceService.removeMember,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['members'] }),
  });
};