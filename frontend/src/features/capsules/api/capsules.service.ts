import axiosClient from '../../../services/axiosClient';
import type { Capsule } from '../types';

export const capsulesService = {
  getCapsules: async (vaultId: string): Promise<Capsule[]> => {
    const response = await axiosClient.get(`/vaults/${vaultId}/capsules/`);
    return response.data;
  },
  sealCapsule: async (vaultId: string, data: any): Promise<void> => {
    await axiosClient.post(`/vaults/${vaultId}/capsules/`, data);
  }
};