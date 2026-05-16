import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { capsulesService } from '../api/capsules.service';
import { useAuthStore } from '../../../stores/authStore';

export const useCapsules = () => {
  const vaultId = useAuthStore(s => s.activeVaultId);
  return useQuery({
    queryKey: ['capsules', vaultId],
    queryFn: () => capsulesService.getCapsules(vaultId!),
    enabled: !!vaultId,
  });
};

export const useSealCapsule = () => {
  const queryClient = useQueryClient();
  const vaultId = useAuthStore(s => s.activeVaultId);
  return useMutation({
    mutationFn: (data: any) => capsulesService.sealCapsule(vaultId!, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['capsules'] }),
  });
};