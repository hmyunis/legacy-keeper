import axiosClient from '../../../services/axiosClient';
import { extractList } from '../../../services/responseExtractor';
import type { VaultMemory } from '../../vault/types';

export const searchService = {
  vibeSearch: async (vaultId: string, query: string): Promise<VaultMemory[]> => {
    const response = await axiosClient.get(`/vaults/${vaultId}/search/vibe/`, {
      params: { q: query }
    });
    return extractList<VaultMemory>(response);
  }
};
