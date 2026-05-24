import { useMutation } from '@tanstack/react-query';
import { searchService } from '../api/search.service';
import { useAuthStore } from '../../../stores/authStore';

export const useVibeSearch = () => {
  return useMutation({
    mutationFn: (query: string) => {
      const vaultId = useAuthStore.getState().activeVaultId;
      if (!vaultId) throw new Error("Vault ID missing");
      return searchService.vibeSearch(vaultId, query);
    },
  });
};

export const useDeepVibeSearch = () => {
  return useMutation({
    mutationFn: (query: string) => {
      const vaultId = useAuthStore.getState().activeVaultId;
      if (!vaultId) throw new Error("Vault ID missing");
      return searchService.startDeepVibeSearch(vaultId, query);
    },
  });
};
