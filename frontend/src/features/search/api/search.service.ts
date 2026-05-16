import { VAULT_MEMORY_CLUSTERS } from '../../vault/data/mockData';
import type { VaultMemory } from '../../vault/types';

export const searchService = {
  vibeSearch: async (query: string): Promise<VaultMemory[]> => {
    const all = VAULT_MEMORY_CLUSTERS.flatMap(c => c.memories);
    await new Promise(res => setTimeout(res, 2000));
    return all.sort(() => 0.5 - Math.random()).slice(0, 4);
  }
};