import axiosClient from '../../../services/axiosClient';
import type { AuthResponse, LoginCredentials, RegisterCredentials } from '../types';

export const authService = {
  login: async (data: LoginCredentials): Promise<AuthResponse> => {
    const response = await axiosClient.post('/auth/login/', data);
    return response.data;
  },

  register: async (data: RegisterCredentials): Promise<AuthResponse> => {
    const response = await axiosClient.post('/auth/register/', data);
    return response.data;
  },

  verifyEmail: async (code: string): Promise<void> => {
    const response = await axiosClient.post('/auth/verify-email/', { code });
    return response.data;
  },

  initVault: async (vaultName: string): Promise<{ vaultId: string; name: string }> => {
    const response = await axiosClient.post('/auth/onboarding/init-vault/', { vaultName });
    return response.data;
  },

  firstRelative: async (data: { vaultId: string; name: string; birthYear: string; relationship: string }): Promise<{ personId: string }> => {
    const response = await axiosClient.post('/auth/onboarding/first-relative/', data);
    return response.data;
  }
};