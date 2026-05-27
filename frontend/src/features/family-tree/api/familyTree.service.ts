import axiosClient from '../../../services/axiosClient';
import { extractData } from '../../../services/responseExtractor';
import type { FamilyTreeData } from '../types';

export const familyTreeService = {
  getTree: async (vaultId: string): Promise<FamilyTreeData> => {
    const response = await axiosClient.get(`/vaults/${vaultId}/lineage/`);
    return extractData<FamilyTreeData>(response);
  },

  graftBranch: async (
    vaultId: string,
    data: { parentId: string | null; name: string; role: string }
  ): Promise<{ personId: string }> => {
    const response = await axiosClient.post(`/vaults/${vaultId}/lineage/graft/`, data);
    return response.data;
  },

  deleteRelationship: async (
    vaultId: string,
    payload: { fromPersonId: string; toPersonId: string; type: 'PARENT_OF' | 'SPOUSE_OF' }
  ): Promise<{ status: string }> => {
    const response = await axiosClient.delete(`/vaults/${vaultId}/lineage/relationship/`, { data: payload });
    return response.data;
  }
};
