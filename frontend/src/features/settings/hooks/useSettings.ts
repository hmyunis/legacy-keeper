import { useMutation } from '@tanstack/react-query';
import { settingsService } from '../api/settings.service';

export const usePurgeStorage = () => {
  return useMutation({ mutationFn: settingsService.purgeStorage });
};

export const useUpdateProfile = () => {
  return useMutation({ mutationFn: settingsService.updateProfile });
};