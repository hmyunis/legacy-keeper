import axiosClient from '../../../services/axiosClient';
import { extractList, extractData, extractPaginated } from '../../../services/responseExtractor';
import type { VaultCluster, VaultMemory } from '../../vault/types';

export interface MemoryFilters {
  clusters: string[];
  decades: string[];
  decadeCounts: Record<string, number>;
  undatedCount: number;
  totalCount: number;
}

export interface MemoryCollection {
  id: string | null;
  name: string;
  memory_count: number;
  created_at?: string | null;
}

export interface MemoryQueryParams {
  q?: string;
  cluster?: string;
  decade?: string;
  reviewed?: boolean;
  is_favorite?: boolean;
  file_type?: 'image' | 'video' | 'audio' | 'pdf';
}

export interface PaginatedVaultMemories {
  count: number;
  next: string | null;
  previous: string | null;
  results: VaultMemory[];
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

  getMemoriesPage: async (
    vaultId: string,
    params?: MemoryQueryParams & { page?: number; page_size?: number }
  ): Promise<PaginatedVaultMemories> => {
    const response = await axiosClient.get(`/vaults/${vaultId}/memories/`, {
      params: { page_size: 24, ...params },
    });
    return extractPaginated<VaultMemory>(response);
  },

  getFilters: async (vaultId: string): Promise<MemoryFilters> => {
    const response = await axiosClient.get(`/vaults/${vaultId}/memories/filters/`);
    const data = extractData<Partial<MemoryFilters>>(response);
    return {
      clusters: Array.isArray(data?.clusters) ? data.clusters : [],
      decades: Array.isArray(data?.decades) ? data.decades : [],
      decadeCounts: data?.decadeCounts && typeof data.decadeCounts === 'object' ? data.decadeCounts : {},
      undatedCount: typeof data?.undatedCount === 'number' ? data.undatedCount : 0,
      totalCount: typeof data?.totalCount === 'number' ? data.totalCount : 0,
    };
  },

  getCollections: async (vaultId: string): Promise<MemoryCollection[]> => {
    const response = await axiosClient.get(`/vaults/${vaultId}/memories/collections/`);
    return extractList<MemoryCollection>(response);
  },

  createCollection: async (vaultId: string, name: string): Promise<MemoryCollection> => {
    const response = await axiosClient.post(`/vaults/${vaultId}/memories/collections/`, { name });
    return response.data;
  },

  deleteCollection: async (vaultId: string, collectionId: string): Promise<void> => {
    await axiosClient.delete(`/vaults/${vaultId}/memories/collections/${collectionId}/`);
  },

  uploadMemory: async (vaultId: string, file: File, title?: string): Promise<{ task_id: string | null, memory_id: string }> => {
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

  decideSuggestion: async (vaultId: string, memoryId: string, field: string, action: 'accept' | 'reject'): Promise<VaultMemory> => {
    const response = await axiosClient.post(`/vaults/${vaultId}/memories/${memoryId}/suggestions/${field}/`, { action });
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
