import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { capsulesService } from '../api/capsules.service';

export const useCapsules = () => {
  return useQuery({
    queryKey: ['capsules'],
    queryFn: capsulesService.getCapsules,
  });
};

export const useSealCapsule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: capsulesService.sealCapsule,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['capsules'] }),
  });
};