import { useMutation } from '@tanstack/react-query';
import { authService } from '../api/auth.service';

export const useLogin = () => {
  return useMutation({
    mutationFn: authService.login,
  });
};

export const useRegister = () => {
  return useMutation({
    mutationFn: authService.register,
  });
};