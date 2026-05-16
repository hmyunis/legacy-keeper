export interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface LoginCredentials {
  email?: string;
  password?: string;
}

export interface RegisterCredentials extends LoginCredentials {
  fullName?: string;
}