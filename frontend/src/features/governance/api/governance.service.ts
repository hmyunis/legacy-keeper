import axiosClient from "../../../services/axiosClient";
import { extractList, extractPaginated } from "../../../services/responseExtractor";

export const governanceService = {
  getMembers: async (vaultId: string) => {
    const response = await axiosClient.get(`/vaults/${vaultId}/members/`);
    return extractList(response);
  },
  inviteMember: async (vaultId: string, payload: any) => {
    const response = await axiosClient.post(`/vaults/${vaultId}/members/invite/`, payload);
    return response.data;
  },
  getInvitations: async (vaultId: string) => {
    const response = await axiosClient.get(`/vaults/${vaultId}/members/invitations/`);
    return extractList(response);
  },
  revokeInvitation: async (vaultId: string, invitationId: string) => {
    await axiosClient.delete(`/vaults/${vaultId}/members/invitations/${invitationId}/`);
  },
  respondToInvitation: async (vaultId: string, invitationId: string, action: 'ACCEPT' | 'REJECT') => {
    const response = await axiosClient.post(`/vaults/${vaultId}/members/invitations/${invitationId}/`, { action });
    return response.data;
  },
  getPacts: async (vaultId: string) => {
    const response = await axiosClient.get(`/vaults/${vaultId}/pacts/`);
    return extractList(response);
  },
  getPactHistory: async (vaultId: string) => {
    const response = await axiosClient.get(`/vaults/${vaultId}/pacts/history/`);
    return extractList(response);
  },
  actOnPact: async (vaultId: string, pactId: string, action: 'ACCEPT' | 'REJECT') => {
    const response = await axiosClient.post(`/vaults/${vaultId}/pacts/${pactId}/action/`, { action });
    return response.data;
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
