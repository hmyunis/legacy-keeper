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
  const vaultId = useAuthStore((s) => s.activeVaultId);
  return useMutation({
    mutationFn: (personId: string) => chroniclesService.generateStory(vaultId!, personId),
  });
};