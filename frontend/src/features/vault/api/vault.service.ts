import { VAULT_MEMORY_CLUSTERS } from '../data/mockData';
import type { VaultCluster } from '../types';

export const vaultService = {
  getClusters: async (): Promise<VaultCluster[]> => {
    return VAULT_MEMORY_CLUSTERS;
  }
};