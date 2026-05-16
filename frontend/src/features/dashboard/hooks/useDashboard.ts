import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../stores/authStore';
import axiosClient from '../../../services/axiosClient';

export const useDashboardSummary = () => {
  const vaultId = useAuthStore((s) => s.activeVaultId);
  return useQuery({
    queryKey: ['dashboardSummary', vaultId],
    queryFn: async () => {
      const res = await axiosClient.get(`/vaults/${vaultId}/dashboard/summary/`);
      return res.data;
    },
    enabled: !!vaultId,
  });
};