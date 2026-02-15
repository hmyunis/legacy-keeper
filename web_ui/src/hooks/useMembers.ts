import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { membersApi, type MembersQueryParams } from '../services/membersApi';
import { UserRole } from '../types';
import { toast } from 'sonner';
import { useAuthStore } from '../stores/authStore';
import { getApiErrorMessage } from '../services/httpError';
import { useMemo } from 'react';

const DEFAULT_PAGE_SIZE = 20;

interface UseMembersOptions {
  enabled?: boolean;
}

export const useMembers = (
  params?: Omit<MembersQueryParams, 'page'>,
  options?: UseMembersOptions
) => {
  const activeVaultId = useAuthStore((state) => state.activeVaultId);

  const normalizedParams = useMemo(() => {
    return {
      search: params?.search?.trim() || undefined,
      role: params?.role || undefined,
      status: params?.status || undefined,
    };
  }, [params?.role, params?.search, params?.status]);

  const queryKey = useMemo(
    () => [
      'members',
      activeVaultId || null,
      normalizedParams.search || null,
      normalizedParams.role || null,
      normalizedParams.status || null,
    ],
    [
      activeVaultId,
      normalizedParams.role,
      normalizedParams.search,
      normalizedParams.status,
    ]
  );

  return useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam = 1 }) => {
      if (!activeVaultId) throw new Error('No active vault selected');
      return membersApi.getMembers(activeVaultId, {
        ...normalizedParams,
        page: pageParam,
        pageSize: DEFAULT_PAGE_SIZE,
      });
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.hasNextPage) {
        return allPages.length + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    enabled: Boolean(activeVaultId) && (options?.enabled ?? true),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });
};

export const useInviteMember = () => {
  const queryClient = useQueryClient();
  const { activeVaultId } = useAuthStore();

  return useMutation({
    mutationFn: ({ email, role }: { email: string; role: UserRole }) => {
      if (!activeVaultId) throw new Error('No active vault selected');
      return membersApi.inviteMember(activeVaultId, { email, role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast.success('Invitation dispatched to circle member');
    },
    onError: (error) => {
      toast.error('Failed to dispatch invitation', {
        description: getApiErrorMessage(error, 'Please try again.'),
      });
    },
  });
};

export const useRemoveMember = () => {
  const queryClient = useQueryClient();
  const { activeVaultId } = useAuthStore();

  return useMutation({
    mutationFn: (membershipId: string) => {
      if (!activeVaultId) throw new Error('No active vault selected');
      return membersApi.removeMember(activeVaultId, membershipId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast.success('Member clearance revoked');
    },
    onError: (error) => {
      toast.error('Failed to revoke member access', {
        description: getApiErrorMessage(error, 'Please try again.'),
      });
    },
  });
};

export const useUpdateMemberRole = () => {
  const queryClient = useQueryClient();
  const { activeVaultId } = useAuthStore();

  return useMutation({
    mutationFn: ({ membershipId, role }: { membershipId: string; role: UserRole }) => {
      if (!activeVaultId) throw new Error('No active vault selected');
      return membersApi.updateMemberRole(activeVaultId, membershipId, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast.success('Member role updated');
    },
    onError: (error) => {
      toast.error('Failed to update member role', {
        description: getApiErrorMessage(error, 'Please try again.'),
      });
    },
  });
};

export const useLeaveVault = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vaultId: string) => {
      await membersApi.leaveVault(vaultId);
      return vaultId;
    },
    onSuccess: (vaultId) => {
      const { activeVaultId, setActiveVault, logout } = useAuthStore.getState();

      if (activeVaultId === vaultId) {
        setActiveVault(null);
        logout();
      }

      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['media'] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['relationships'] });
      queryClient.invalidateQueries({ queryKey: ['treeData'] });
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
      queryClient.invalidateQueries({ queryKey: ['vaults'] });
      toast.success('You have left the vault');
    },
    onError: (error) => {
      toast.error('Failed to leave vault', {
        description: getApiErrorMessage(error, 'Please try again.'),
      });
    },
  });
};

export const useTransferVaultOwnership = () => {
  const queryClient = useQueryClient();
  const { activeVaultId } = useAuthStore();

  return useMutation({
    mutationFn: (membershipId: string) => {
      if (!activeVaultId) throw new Error('No active vault selected');
      return membersApi.transferOwnership(activeVaultId, { membershipId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vaults'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast.success('Vault ownership transferred successfully');
    },
    onError: (error) => {
      toast.error('Failed to transfer ownership', {
        description: getApiErrorMessage(error, 'Please try again.'),
      });
    },
  });
};

export const useJoinVault = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (token: string) => membersApi.joinVault({ token }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['vaults'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast.success(response.message || 'Successfully joined vault');
    },
    onError: (error) => {
      toast.error('Failed to join vault', {
        description: getApiErrorMessage(error, 'Please check your invitation link and try again.'),
      });
    },
  });
};
