import axiosClient from '../../../services/axiosClient';
import { extractList } from '../../../services/responseExtractor';
import type { Capsule } from '../types';

export const capsulesService = {
  getCapsules: async (vaultId: string): Promise<Capsule[]> => {
    const response = await axiosClient.get(`/vaults/${vaultId}/capsules/`, { params: { limit: 1000 } });
    return extractList<Capsule>(response);
  },
  sealCapsule: async (vaultId: string, data: any): Promise<void> => {
    await axiosClient.post(`/vaults/${vaultId}/capsules/`, data);
  },
  deleteCapsule: async (vaultId: string, capsuleId: string): Promise<void> => {
    await axiosClient.delete(`/vaults/${vaultId}/capsules/${capsuleId}/`);
  }
};
