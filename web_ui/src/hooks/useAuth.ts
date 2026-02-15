import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  authApi,
  AuthSuccessResponse,
  mapApiUserToUser,
  GoogleLoginRequest,
  LoginRequest,
  RegisterRequest,
  VerifyEmailRequest,
  ResendVerificationRequest,
} from '../services/authApi';
import { getApiErrorMessage } from '../services/httpError';
import { useAuthStore } from '../stores/authStore';
import type { UpdateProfileRequest } from '../types/api.types';

const applySession = (payload: AuthSuccessResponse) => {
  const user = mapApiUserToUser(payload.user);
  useAuthStore.getState().login({
    user,
    accessToken: payload.access,
    refreshToken: payload.refresh,
    activeVaultId: payload.user.activeVaultId ?? null,
  });
};

export const useLogin = () =>
  useMutation({
    mutationFn: (payload: LoginRequest) => authApi.login(payload),
    onSuccess: (payload) => {
      applySession(payload);
      toast.success('Welcome back.');
    },
    onError: (error) => {
      toast.error('Unable to login.', {
        description: getApiErrorMessage(error, 'Please verify your credentials and try again.'),
      });
    },
  });

export const useRegister = () =>
  useMutation({
    mutationFn: (payload: RegisterRequest) => authApi.register(payload),
    onSuccess: () => {
      toast.success('Registration successful.', {
        description: 'Please verify your email before logging in.',
      });
    },
    onError: (error) => {
      toast.error('Unable to create account.', {
        description: getApiErrorMessage(error, 'Please review your details and try again.'),
      });
    },
  });

export const useGoogleLogin = () =>
  useMutation({
    mutationFn: (payload: GoogleLoginRequest) => authApi.googleLogin(payload),
    onSuccess: (payload) => {
      applySession(payload);
      toast.success('Signed in with Google.');
    },
    onError: (error) => {
      toast.error('Google sign-in failed.', {
        description: getApiErrorMessage(error, 'Please try again or use email/password login.'),
      });
    },
  });

export const useVerifyEmail = () =>
  useMutation({
    mutationFn: (payload: VerifyEmailRequest) => authApi.verifyEmail(payload),
  });

export const useResendVerification = () =>
  useMutation({
    mutationFn: (payload: ResendVerificationRequest) => authApi.resendVerification(payload),
    onSuccess: (response) => {
      toast.success(response.message || 'Verification email sent.');
    },
    onError: (error) => {
      toast.error('Unable to resend verification email.', {
        description: getApiErrorMessage(error, 'Please check the email and try again.'),
      });
    },
  });

export const useUpdateProfile = () =>
  useMutation({
    mutationFn: (payload: UpdateProfileRequest) => authApi.updateMe(payload),
    onSuccess: (payload) => {
      const mappedUser = mapApiUserToUser(payload);
      useAuthStore.getState().updateUser(mappedUser);
    },
  });
