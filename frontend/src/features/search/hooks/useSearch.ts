import { useMutation } from '@tanstack/react-query';
import { searchService } from '../api/search.service';
import { useAuthStore } from '../../../stores/authStore';

export const useVibeSearch = () => {
  const vaultId = useAuthStore((s) => s.activeVaultId);
  return useMutation({
    mutationFn: (query: string) => searchService.vibeSearch(vaultId!, query),
  });
};