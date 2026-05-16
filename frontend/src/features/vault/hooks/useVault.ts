import { useQuery } from '@tanstack/react-query';
import { vaultService } from '../api/vault.service';
import { VAULT_MEMORY_CLUSTERS } from '../data/mockData';

export const useVaultClusters = () => {
  return useQuery({
    queryKey: ['vaultClusters'],
    queryFn: vaultService.getClusters,
    initialData: VAULT_MEMORY_CLUSTERS,
  });
};