export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  fullName: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    is_verified?: boolean;
    vaultId?: string;
    avatar?: string;
  };
  accessToken: string;
  refreshToken: string;
}
