import { useMutation } from '@tanstack/react-query';
import { authService } from '../api/auth.service';

export const useLogin = () => {
  return useMutation({ mutationFn: authService.login });
};

export const useRegister = () => {
  return useMutation({ mutationFn: authService.register });
};

export const useVerifyEmail = () => {
  return useMutation({ mutationFn: authService.verifyEmail });
};

export const useInitVault = () => {
  return useMutation({ mutationFn: authService.initVault });
};

export const useFirstRelative = () => {
  return useMutation({ mutationFn: authService.firstRelative });
};