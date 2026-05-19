import axiosClient from '../../../services/axiosClient';
import { extractList, extractData } from '../../../services/responseExtractor';
import type { VaultCluster, VaultMemory } from '../../vault/types';

export interface MemoryFilters {
  clusters: string[];
  decades: string[];
}

export interface MemoryQueryParams {
  q?: string;
  cluster?: string;
  decade?: string;
  reviewed?: boolean;
  is_favorite?: boolean;
}

export const vaultService = {
  getClusters: async (vaultId: string): Promise<VaultCluster[]> => {
    const response = await axiosClient.get(`/vaults/${vaultId}/memories/clusters/`);
    return extractList<VaultCluster>(response);
  },

  getMemories: async (vaultId: string, params?: MemoryQueryParams): Promise<VaultMemory[]> => {
    const response = await axiosClient.get(`/vaults/${vaultId}/memories/`, { params: { limit: 1000, ...params } });
    return extractList<VaultMemory>(response);
  },

  getFilters: async (vaultId: string): Promise<MemoryFilters> => {
    const response = await axiosClient.get(`/vaults/${vaultId}/memories/filters/`);
    return extractData<MemoryFilters>(response);
  },

  uploadMemory: async (vaultId: string, file: File, title?: string): Promise<{ task_id: string, memory_id: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);

    const response = await axiosClient.post(`/vaults/${vaultId}/memories/`, formData);
    return response.data;
  },

  updateMemory: async (vaultId: string, memoryId: string, data: Partial<VaultMemory>): Promise<VaultMemory> => {
    const response = await axiosClient.patch(`/vaults/${vaultId}/memories/${memoryId}/`, data);
    return response.data;
  },

  restoreMemory: async (vaultId: string, memoryId: string): Promise<{ task_id: string }> => {
    const response = await axiosClient.post(`/vaults/${vaultId}/memories/${memoryId}/restore/`);
    return response.data;
  },

  deleteMemory: async (vaultId: string, memoryId: string): Promise<void> => {
    await axiosClient.delete(`/vaults/${vaultId}/memories/${memoryId}/`);
  }
};