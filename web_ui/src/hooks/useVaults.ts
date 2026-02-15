import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vaultApi } from '../services/vaultApi';
import { toast } from 'sonner';
import { getApiErrorMessage } from '../services/httpError';
import type { CreateVaultRequest, UpdateVaultRequest } from '../types/api.types';

export const useVaults = () => {
  return useQuery({
    queryKey: ['vaults'],
    queryFn: () => vaultApi.getVaults(),
  });
};

export const useVault = (vaultId: string) => {
  return useQuery({
    queryKey: ['vault', vaultId],
    queryFn: () => vaultApi.getVault(vaultId),
    enabled: Boolean(vaultId),
  });
};

export const useCreateVault = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateVaultRequest) => vaultApi.createVault(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vaults'] });
      toast.success('Vault created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create vault', {
        description: getApiErrorMessage(error, 'Please try again.'),
      });
    },
  });
};

export const useUpdateVault = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ vaultId, data }: { vaultId: string; data: UpdateVaultRequest }) => 
      vaultApi.updateVault(vaultId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vaults'] });
      queryClient.invalidateQueries({ queryKey: ['vault'] });
      toast.success('Vault updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update vault', {
        description: getApiErrorMessage(error, 'Please try again.'),
      });
    },
  });
};

export const useVaultHealthAnalysis = (vaultId: string, enabled = true) => {
  return useQuery({
    queryKey: ['vaultHealthAnalysis', vaultId],
    queryFn: () => vaultApi.getVaultHealthAnalysis(vaultId),
    enabled: Boolean(vaultId) && enabled,
  });
};

export const useCleanupVaultRedundant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      vaultId,
      groupHashes,
      dryRun,
    }: {
      vaultId: string;
      groupHashes?: string[];
      dryRun?: boolean;
    }) => vaultApi.cleanupVaultRedundant(vaultId, { groupHashes, dryRun }),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vaultHealthAnalysis', variables.vaultId] });
      queryClient.invalidateQueries({ queryKey: ['media'] });
      if (variables.dryRun) {
        toast.success('Redundancy preview generated');
      } else {
        toast.success('Redundant files cleanup complete');
      }
    },
    onError: (error) => {
      toast.error('Failed to clean redundant files', {
        description: getApiErrorMessage(error, 'Please try again.'),
      });
    },
  });
};
