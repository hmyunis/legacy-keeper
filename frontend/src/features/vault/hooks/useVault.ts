import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vaultService } from '../api/vault.service';
import { useAuthStore } from '../../../stores/authStore';
import type { MemoryQueryParams } from '../api/vault.service';

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

export const useFilteredMemories = (params?: MemoryQueryParams) => {
  const vaultId = useAuthStore((s) => s.activeVaultId);
  return useQuery({
    queryKey: ['filteredMemories', vaultId, params],
    queryFn: () => vaultService.getMemories(vaultId!, params),
    enabled: !!vaultId,
  });
};

export const useMemoryFilters = () => {
  const vaultId = useAuthStore((s) => s.activeVaultId);
  return useQuery({
    queryKey: ['memoryFilters', vaultId],
    queryFn: () => vaultService.getFilters(vaultId!),
    enabled: !!vaultId,
  });
};

export const useUploadMemory = () => {
  return useMutation({
    mutationFn: ({ file, title }: { file: File; title?: string }) => {
      const vaultId = useAuthStore.getState().activeVaultId;
      if (!vaultId) throw new Error("Vault ID missing");
      return vaultService.uploadMemory(vaultId, file, title);
    }
  });
};

export const useUpdateMemory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ memoryId, data }: { memoryId: string; data: Record<string, unknown> }) => {
      const vaultId = useAuthStore.getState().activeVaultId;
      if (!vaultId) throw new Error("Vault ID missing");
      return vaultService.updateMemory(vaultId, memoryId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['filteredMemories'] });
      queryClient.invalidateQueries({ queryKey: ['vaultClusters'] });
    },
  });
};

export const useDeleteMemory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memoryId: string) => {
      const vaultId = useAuthStore.getState().activeVaultId;
      if (!vaultId) throw new Error("Vault ID missing");
      return vaultService.deleteMemory(vaultId, memoryId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vaultClusters'] });
      queryClient.invalidateQueries({ queryKey: ['filteredMemories'] });
      queryClient.invalidateQueries({ queryKey: ['memoryFilters'] });
    },
  });
};
