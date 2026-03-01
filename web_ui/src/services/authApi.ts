import { User, UserRole } from '../types';
import axiosClient from './axiosClient';
import { AUTH_API } from './authEndpoints';
import { appEnv } from './env';
import type { UpdateProfileRequest } from '../types/api.types';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest extends LoginRequest {
  fullName: string;
  joinToken?: string;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface ResendVerificationRequest {
  email: string;
  joinToken?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  token: string;
  newPassword: string;
}

export interface GoogleLoginRequest {
  idToken: string;
}

export interface ApiAuthUser {
  id: string | number;
  email: string;
  fullName: string;
  bio?: string;
  avatar?: string | null;
  role?: UserRole;
  activeVaultId?: string | null;
  subscriptionTier?: User['subscriptionTier'];
  storageUsed?: number;
}

export interface AuthSuccessResponse {
  access: string;
  refresh: string;
  user: ApiAuthUser;
}

export interface RefreshTokenRequest {
  refresh: string;
}

export interface RefreshTokenResponse {
  access: string;
  refresh?: string;
}

const fallbackAvatar = (fullName: string, email: string) => {
  const label = encodeURIComponent(fullName || email || 'LegacyKeeper');
  return `https://ui-avatars.com/api/?name=${label}&background=E2E8F0&color=334155`;
};

const toAbsoluteUrl = (value?: string | null) => {
  if (!value) {
    return null;
  }
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  try {
    return new URL(value, appEnv.apiBaseUrl).toString();
  } catch {
    return value;
  }
};

const parseUserRole = (role?: string): UserRole => {
  if (!role) {
    return UserRole.VIEWER;
  }
  if (role === UserRole.ADMIN || role === UserRole.CONTRIBUTOR || role === UserRole.VIEWER) {
    return role;
  }
  return UserRole.VIEWER;
};

export const mapApiUserToUser = (apiUser: ApiAuthUser): User => ({
  id: String(apiUser.id),
  email: apiUser.email,
  fullName: apiUser.fullName,
  bio: apiUser.bio || '',
  profilePhoto: toAbsoluteUrl(apiUser.avatar) || fallbackAvatar(apiUser.fullName, apiUser.email),
  role: parseUserRole(apiUser.role),
  subscriptionTier: apiUser.subscriptionTier || 'BASIC',
  storageUsed: apiUser.storageUsed ?? 0,
});

export const authApi = {
  register: (payload: RegisterRequest) =>
    axiosClient.post<{ id: string; email: string; fullName: string }>(AUTH_API.register, payload).then((r) => r.data),

  login: (payload: LoginRequest) =>
    axiosClient.post<AuthSuccessResponse>(AUTH_API.login, payload).then((r) => r.data),

  googleLogin: (payload: GoogleLoginRequest) =>
    axiosClient.post<AuthSuccessResponse>(AUTH_API.googleLogin, payload).then((r) => r.data),

  refreshToken: (payload: RefreshTokenRequest) =>
    axiosClient.post<RefreshTokenResponse>(AUTH_API.refreshToken, payload).then((r) => r.data),

  getMe: () =>
    axiosClient.get<ApiAuthUser>(AUTH_API.me).then((r) => r.data),

  updateMe: (payload: UpdateProfileRequest) => {
    const formData = new FormData();
    if (payload.fullName) {
      formData.append('fullName', payload.fullName);
    }
    if (payload.bio !== undefined) {
      formData.append('bio', payload.bio);
    }
    if (payload.avatar) {
      formData.append('avatar', payload.avatar);
    }
    return axiosClient.patch<ApiAuthUser>(AUTH_API.me, formData).then((r) => r.data);
  },

  verifyEmail: (payload: VerifyEmailRequest) =>
    axiosClient.post<{ message: string }>(AUTH_API.verifyEmail, payload).then((r) => r.data),

  resendVerification: (payload: ResendVerificationRequest) =>
    axiosClient.post<{ message: string }>(AUTH_API.resendVerification, payload).then((r) => r.data),

  forgotPassword: (payload: ForgotPasswordRequest) =>
    axiosClient.post<{ message: string }>(AUTH_API.forgotPassword, payload).then((r) => r.data),

  resetPassword: (payload: ResetPasswordRequest) =>
    axiosClient.post<{ message: string }>(AUTH_API.resetPassword, payload).then((r) => r.data),
};
