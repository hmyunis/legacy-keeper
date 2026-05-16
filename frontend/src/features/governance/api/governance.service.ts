import axiosClient from "../../../services/axiosClient";

export const governanceService = {
  getMembers: async (vaultId: string) => {
    const response = await axiosClient.get(`/vaults/${vaultId}/members/`);
    return response.data;
  },
  inviteMember: async (vaultId: string, payload: any) => {
    await axiosClient.post(`/vaults/${vaultId}/members/invite/`, payload);
  },
  getLogs: async (vaultId: string) => {
    const response = await axiosClient.get(`/vaults/${vaultId}/logs/`);
    return response.data.results || response.data;
  }
};