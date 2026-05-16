import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { governanceService } from '../api/governance.service';
import { useAuthStore } from '../../../stores/authStore';

export const useMembers = () => {
  const vaultId = useAuthStore(s => s.activeVaultId);
  return useQuery({
    queryKey: ['members', vaultId],
    queryFn: () => governanceService.getMembers(vaultId!),
    enabled: !!vaultId,
  });
};

export const useLogs = () => {
  const vaultId = useAuthStore(s => s.activeVaultId);
  return useQuery({
    queryKey: ['logs', vaultId],
    queryFn: () => governanceService.getLogs(vaultId!),
    enabled: !!vaultId,
  });
};

export const useGovernanceActions = () => {
  const queryClient = useQueryClient();
  const vaultId = useAuthStore(s => s.activeVaultId);

  const inviteMember = useMutation({
    mutationFn: (data: any) => governanceService.inviteMember(vaultId!, data),
  });

  const removeMember = useMutation({
    mutationFn: (userId: string) => fetch(`/api/vaults/${vaultId}/members/${userId}/`, { method: 'DELETE', headers: { Authorization: `Bearer ${useAuthStore.getState().accessToken}` } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['members'] }),
  });

  const requestPact = useMutation({
    mutationFn: (data: { email: string }) => fetch(`/api/vaults/${vaultId}/pacts/`, { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${useAuthStore.getState().accessToken}` } }),
  });

  const exportLogs = useMutation({
    mutationFn: () => fetch(`/api/vaults/${vaultId}/logs/export/`, { method: 'POST', headers: { Authorization: `Bearer ${useAuthStore.getState().accessToken}` } }).then(r => r.json()),
  });

  return { inviteMember, removeMember, requestPact, exportLogs };
};