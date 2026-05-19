import { useQuery, useMutation } from '@tanstack/react-query';
import { chroniclesService } from '../api/chronicles.service';
import { useAuthStore } from '../../../stores/authStore';

export const useTimeline = () => {
  const vaultId = useAuthStore((s) => s.activeVaultId);
  return useQuery({
    queryKey: ['timeline', vaultId],
    queryFn: () => chroniclesService.getTimeline(vaultId!),
    enabled: !!vaultId,
  });
};

export const useGenerateStory = () => {
  return useMutation({
    mutationFn: (personId: string) => {
      const vaultId = useAuthStore.getState().activeVaultId;
      if (!vaultId) throw new Error("Vault ID missing");
      return chroniclesService.generateStory(vaultId, personId);
    },
  });
};