import axiosClient from '../../../services/axiosClient';
import type { VaultCluster, VaultMemory } from '../../vault/types';

export const vaultService = {
  getClusters: async (vaultId: string): Promise<VaultCluster[]> => {
    const response = await axiosClient.get(`/vaults/${vaultId}/memories/clusters/`);
    return response.data;
  },

  getMemories: async (vaultId: string): Promise<VaultMemory[]> => {
    const response = await axiosClient.get(`/vaults/${vaultId}/memories/`);
    return Array.isArray(response.data) ? response.data : response.data.results;
  },

  uploadMemory: async (vaultId: string, file: File, title?: string): Promise<{ task_id: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);

    const response = await axiosClient.post(`/vaults/${vaultId}/memories/`, formData);
    return response.data;
  },

  restoreMemory: async (vaultId: string, memoryId: string): Promise<{ task_id: string }> => {
    const response = await axiosClient.post(`/vaults/${vaultId}/memories/${memoryId}/restore/`);
    return response.data;
  }
};