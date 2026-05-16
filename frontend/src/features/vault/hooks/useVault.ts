import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vaultService } from '../api/vault.service';
import { useAuthStore } from '../../../stores/authStore';

export const useVaultClusters = () => {
  const vaultId = useAuthStore((s) => s.activeVaultId);
  return useQuery({
    queryKey: ['vaultClusters', vaultId],
    queryFn: () => vaultService.getClusters(vaultId!),
    enabled: !!vaultId,
  });
};

export const useVaultMemories = () => {
  const vaultId = useAuthStore((s) => s.activeVaultId);
  return useQuery({
    queryKey: ['vaultMemories', vaultId],
    queryFn: () => vaultService.getMemories(vaultId!),
    enabled: !!vaultId,
  });
};

export const useUploadMemory = () => {
  const queryClient = useQueryClient();
  const vaultId = useAuthStore((s) => s.activeVaultId);

  return useMutation({
    mutationFn: ({ file, title }: { file: File; title?: string }) =>
      vaultService.uploadMemory(vaultId!, file, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vaultClusters'] });
      queryClient.invalidateQueries({ queryKey: ['vaultMemories'] });
    },
  });
};