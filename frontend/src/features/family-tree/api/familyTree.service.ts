import axiosClient from '../../../services/axiosClient';
import type { FamilyTreeData } from '../types';

export const familyTreeService = {
  getTree: async (vaultId: string): Promise<FamilyTreeData> => {
    const response = await axiosClient.get(`/vaults/${vaultId}/lineage/`);
    return response.data;
  },

  graftBranch: async (
    vaultId: string,
    data: { parentId: string | null; name: string; role: string }
  ): Promise<{ personId: string }> => {
    const response = await axiosClient.post(`/vaults/${vaultId}/lineage/graft/`, data);
    return response.data;
  }
};