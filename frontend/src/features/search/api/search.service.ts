import axiosClient from '../../../services/axiosClient';
import { extractData, extractList } from '../../../services/responseExtractor';
import type { VaultMemory } from '../../vault/types';

export interface DeepSearchStartResponse {
  task_id: string;
  status: 'PROCESSING';
  progress: number;
  stage?: string | null;
}

export const searchService = {
  vibeSearch: async (vaultId: string, query: string): Promise<VaultMemory[]> => {
    const response = await axiosClient.get(`/vaults/${vaultId}/search/vibe/`, {
      params: { q: query }
    });
    return extractList<VaultMemory>(response);
  },

  startDeepVibeSearch: async (vaultId: string, query: string): Promise<DeepSearchStartResponse> => {
    const response = await axiosClient.post(`/vaults/${vaultId}/search/vibe/`, {
      query,
      deep: true,
    });
    return extractData<DeepSearchStartResponse>(response);
  }
};
