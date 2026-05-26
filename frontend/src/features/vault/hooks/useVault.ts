import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

export const useInfiniteFilteredMemories = (params?: MemoryQueryParams) => {
  const vaultId = useAuthStore((s) => s.activeVaultId);
  return useInfiniteQuery({
    queryKey: ['filteredMemories', vaultId, params, 'infinite'],
    queryFn: ({ pageParam = 1 }) =>
      vaultService.getMemoriesPage(vaultId!, {
        ...params,
        page: pageParam,
        page_size: 24,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (!lastPage?.next) return undefined;
      try {
        const nextUrl = new URL(lastPage.next);
        const nextPage = Number(nextUrl.searchParams.get('page') || '0');
        return Number.isFinite(nextPage) && nextPage > 0 ? nextPage : undefined;
      } catch {
        return undefined;
      }
    },
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

export const useMemoryCollections = () => {
  const vaultId = useAuthStore((s) => s.activeVaultId);
  return useQuery({
    queryKey: ['memoryCollections', vaultId],
    queryFn: () => vaultService.getCollections(vaultId!),
    enabled: !!vaultId,
  });
};

export const useCollectionActions = () => {
  const queryClient = useQueryClient();

  const createCollection = useMutation({
    mutationFn: (name: string) => {
      const vaultId = useAuthStore.getState().activeVaultId;
      if (!vaultId) throw new Error("Vault ID missing");
      return vaultService.createCollection(vaultId, name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memoryCollections'] });
      queryClient.invalidateQueries({ queryKey: ['memoryFilters'] });
    },
  });

  const deleteCollection = useMutation({
    mutationFn: (collectionId: string) => {
      const vaultId = useAuthStore.getState().activeVaultId;
      if (!vaultId) throw new Error("Vault ID missing");
      return vaultService.deleteCollection(vaultId, collectionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memoryCollections'] });
      queryClient.invalidateQueries({ queryKey: ['memoryFilters'] });
    },
  });

  return { createCollection, deleteCollection };
};

export const useUploadMemory = () => {
  return useMutation({
    mutationFn: ({ file, title, clusterName }: { file: File; title?: string; clusterName?: string }) => {
      const vaultId = useAuthStore.getState().activeVaultId;
      if (!vaultId) throw new Error("Vault ID missing");
      return vaultService.uploadMemory(vaultId, file, title, clusterName);
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
      queryClient.invalidateQueries({ queryKey: ['vaultMemories'] });
      queryClient.invalidateQueries({ queryKey: ['vaultClusters'] });
      queryClient.invalidateQueries({ queryKey: ['memoryFilters'] });
      queryClient.invalidateQueries({ queryKey: ['memoryCollections'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      queryClient.invalidateQueries({ queryKey: ['familyTree'] });
    },
  });
};

export const useMemorySuggestionDecision = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ memoryId, field, action }: { memoryId: string; field: string; action: 'accept' | 'reject' }) => {
      const vaultId = useAuthStore.getState().activeVaultId;
      if (!vaultId) throw new Error("Vault ID missing");
      return vaultService.decideSuggestion(vaultId, memoryId, field, action);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['filteredMemories'] });
      queryClient.invalidateQueries({ queryKey: ['vaultMemories'] });
      queryClient.invalidateQueries({ queryKey: ['vaultClusters'] });
      queryClient.invalidateQueries({ queryKey: ['memoryFilters'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
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
