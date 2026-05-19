import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { governanceService } from '../api/governance.service';
import { useAuthStore } from '../../../stores/authStore';
import axiosClient from '../../../services/axiosClient';

export const useMembers = () => {
  const vaultId = useAuthStore(s => s.activeVaultId);
  return useQuery({
    queryKey: ['members', vaultId],
    queryFn: () => governanceService.getMembers(vaultId!),
    enabled: !!vaultId,
  });
};

export const useLogs = (params: { page?: number; q?: string } = {}) => {
  const vaultId = useAuthStore(s => s.activeVaultId);
  return useQuery({
    queryKey: ['logs', vaultId, params],
    queryFn: () => governanceService.getLogs(vaultId!, params),
    enabled: !!vaultId,
  });
};

export const useGovernanceActions = () => {
  const queryClient = useQueryClient();

  const inviteMember = useMutation({
    mutationFn: (data: any) => {
      const vaultId = useAuthStore.getState().activeVaultId;
      return governanceService.inviteMember(vaultId!, data);
    }
  });

  const removeMember = useMutation({
    mutationFn: (userId: string) => {
      const vaultId = useAuthStore.getState().activeVaultId;
      if (!vaultId) throw new Error("Vault ID missing");
      return axiosClient.delete(`/vaults/${vaultId}/members/${userId}/`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['members'] }),
  });

  const requestPact = useMutation({
    mutationFn: (data: { email: string }) => {
      const vaultId = useAuthStore.getState().activeVaultId;
      if (!vaultId) throw new Error("Vault ID missing");
      return axiosClient.post(`/vaults/${vaultId}/pacts/`, data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['allPacts'] }),
  });

  const exportLogs = useMutation({
    mutationFn: () => {
      const vaultId = useAuthStore.getState().activeVaultId;
      if (!vaultId) throw new Error("Vault ID missing");
      return axiosClient.post(`/vaults/${vaultId}/logs/export/`).then((res) => res.data);
    },
  });

  return { inviteMember, removeMember, requestPact, exportLogs };
};
