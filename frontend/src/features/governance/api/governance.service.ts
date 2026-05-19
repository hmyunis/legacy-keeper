import axiosClient from "../../../services/axiosClient";
import { extractList, extractPaginated } from "../../../services/responseExtractor";

export const governanceService = {
  getMembers: async (vaultId: string) => {
    const response = await axiosClient.get(`/vaults/${vaultId}/members/`);
    return extractList(response);
  },
  inviteMember: async (vaultId: string, payload: any) => {
    await axiosClient.post(`/vaults/${vaultId}/members/invite/`, payload);
  },
  getLogs: async (vaultId: string, params: { page?: number; q?: string } = {}) => {
    const limit = 10;
    const offset = ((params.page || 1) - 1) * limit;
    const response = await axiosClient.get(`/vaults/${vaultId}/logs/`, {
      params: { limit, offset, q: params.q }
    });
    return extractPaginated(response);
  }
};