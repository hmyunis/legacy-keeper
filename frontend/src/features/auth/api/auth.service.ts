import type { AuthResponse, LoginCredentials, RegisterCredentials } from '../types';

export const authService = {
  login: async (data: LoginCredentials): Promise<AuthResponse> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          user: { id: '1', fullName: 'Guest Curator', email: data.email || 'guest@legacykeeper.app', role: 'curator' },
          accessToken: 'demo-access',
          refreshToken: 'demo-refresh',
        });
      }, 1500);
    });
  },

  register: async (data: RegisterCredentials): Promise<AuthResponse> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          user: { id: '2', fullName: data.fullName || 'New Curator', email: data.email || 'guest@legacykeeper.app', role: 'curator' },
          accessToken: 'demo-access',
          refreshToken: 'demo-refresh',
        });
      }, 1500);
    });
  },
};