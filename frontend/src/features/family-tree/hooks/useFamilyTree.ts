import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { familyTreeService } from '../api/familyTree.service';
import { useAuthStore } from '../../../stores/authStore';

export const useFamilyTreeData = () => {
  const vaultId = useAuthStore((s) => s.activeVaultId);
  return useQuery({
    queryKey: ['familyTree', vaultId],
    queryFn: () => familyTreeService.getTree(vaultId!),
    enabled: !!vaultId,
  });
};

export const useGraftBranch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { parentId: string | null; name: string; role: string; birthYear?: string; deathYear?: string }) => {
      const vaultId = useAuthStore.getState().activeVaultId;
      if (!vaultId) throw new Error("Vault ID missing");
      return familyTreeService.graftBranch(vaultId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['familyTree'] });
    },
  });
};