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

export const useInvitations = (enabled = true) => {
  const vaultId = useAuthStore(s => s.activeVaultId);
  return useQuery({
    queryKey: ['invitations', vaultId],
    queryFn: () => governanceService.getInvitations(vaultId!),
    enabled: !!vaultId && enabled,
  });
};

export const useInviteLinks = (enabled = true) => {
  const vaultId = useAuthStore(s => s.activeVaultId);
  return useQuery({
    queryKey: ['inviteLinks', vaultId],
    queryFn: () => governanceService.getInviteLinks(vaultId!),
    enabled: !!vaultId && enabled,
  });
};

export const useInviteLink = (token?: string) => {
  return useQuery({
    queryKey: ['inviteLink', token],
    queryFn: () => governanceService.getInviteLink(token!),
    enabled: !!token,
  });
};

export const usePacts = (enabled = true) => {
  const vaultId = useAuthStore(s => s.activeVaultId);
  return useQuery({
    queryKey: ['allPacts', vaultId],
    queryFn: () => governanceService.getPacts(vaultId!),
    enabled: !!vaultId && enabled,
  });
};

export const usePactHistory = (enabled = true) => {
  const vaultId = useAuthStore(s => s.activeVaultId);
  return useQuery({
    queryKey: ['pactHistory', vaultId],
    queryFn: () => governanceService.getPactHistory(vaultId!),
    enabled: !!vaultId && enabled,
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });

  const removeMember = useMutation({
    mutationFn: (userId: string) => {
      const vaultId = useAuthStore.getState().activeVaultId;
      if (!vaultId) throw new Error("Vault ID missing");
      return axiosClient.delete(`/vaults/${vaultId}/members/${userId}/`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['members'] }),
  });

  const revokeInvitation = useMutation({
    mutationFn: (invitationId: string) => {
      const vaultId = useAuthStore.getState().activeVaultId;
      if (!vaultId) throw new Error("Vault ID missing");
      return governanceService.revokeInvitation(vaultId, invitationId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invitations'] }),
  });

  const createInviteLink = useMutation({
    mutationFn: (data: any) => {
      const vaultId = useAuthStore.getState().activeVaultId;
      if (!vaultId) throw new Error("Vault ID missing");
      return governanceService.createInviteLink(vaultId, data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inviteLinks'] }),
  });

  const revokeInviteLink = useMutation({
    mutationFn: (linkId: string) => {
      const vaultId = useAuthStore.getState().activeVaultId;
      if (!vaultId) throw new Error("Vault ID missing");
      return governanceService.revokeInviteLink(vaultId, linkId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inviteLinks'] }),
  });

  const deleteInviteLink = useMutation({
    mutationFn: (linkId: string) => {
      const vaultId = useAuthStore.getState().activeVaultId;
      if (!vaultId) throw new Error("Vault ID missing");
      return governanceService.deleteInviteLink(vaultId, linkId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inviteLinks'] }),
  });

  const claimInviteLink = useMutation({
    mutationFn: (token: string) => governanceService.claimInviteLink(token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
    },
  });

  const respondToInvitation = useMutation({
    mutationFn: ({ vaultId, invitationId, action }: { vaultId: string; invitationId: string; action: 'ACCEPT' | 'REJECT' }) => {
      return governanceService.respondToInvitation(vaultId, invitationId, action);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });

  const requestPact = useMutation({
    mutationFn: (data: { email: string }) => {
      const vaultId = useAuthStore.getState().activeVaultId;
      if (!vaultId) throw new Error("Vault ID missing");
      return axiosClient.post(`/vaults/${vaultId}/pacts/`, data).then((res) => res.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allPacts'] });
      queryClient.invalidateQueries({ queryKey: ['pactHistory'] });
    },
  });

  const actOnPact = useMutation({
    mutationFn: ({ pactId, action }: { pactId: string; action: 'ACCEPT' | 'REJECT' | 'UNLINK' }) => {
      const vaultId = useAuthStore.getState().activeVaultId;
      if (!vaultId) throw new Error("Vault ID missing");
      return governanceService.actOnPact(vaultId, pactId, action);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allPacts'] });
      queryClient.invalidateQueries({ queryKey: ['pactHistory'] });
    },
  });

  const exportLogs = useMutation({
    mutationFn: () => {
      const vaultId = useAuthStore.getState().activeVaultId;
      if (!vaultId) throw new Error("Vault ID missing");
      return axiosClient.post(`/vaults/${vaultId}/logs/export/`).then((res) => res.data);
    },
  });

  return {
    inviteMember,
    removeMember,
    requestPact,
    actOnPact,
    revokeInvitation,
    respondToInvitation,
    createInviteLink,
    revokeInviteLink,
    deleteInviteLink,
    claimInviteLink,
    exportLogs,
  };
};
