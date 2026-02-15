import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { genealogyApi } from '../services/genealogyApi';
import { Relationship } from '../types';
import { toast } from 'sonner';
import { useAuthStore } from '../stores/authStore';
import { getApiErrorMessage } from '../services/httpError';

export const useRelationships = () => {
  const { activeVaultId } = useAuthStore();

  return useQuery({
    queryKey: ['relationships', activeVaultId],
    queryFn: () => {
      if (!activeVaultId) throw new Error('No active vault selected');
      return genealogyApi.getRelationships(activeVaultId);
    },
    enabled: Boolean(activeVaultId),
  });
};

export const useAddRelationship = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (rel: Omit<Relationship, 'id'>) => 
      genealogyApi.createRelationship({
        fromPerson: rel.personAId,
        toPerson: rel.personBId,
        relationshipType: rel.type,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relationships'] });
      queryClient.invalidateQueries({ queryKey: ['treeData'] });
      toast.success('Lineage branch connected');
    },
    onError: (error) => {
      toast.error('Failed to establish relationship', {
        description: getApiErrorMessage(error, 'Please try again.'),
      });
    },
  });
};

export const useDeleteRelationship = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (relationshipId: string) => genealogyApi.deleteRelationship(relationshipId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relationships'] });
      queryClient.invalidateQueries({ queryKey: ['treeData'] });
      toast.success('Relationship removed');
    },
    onError: (error) => {
      toast.error('Failed to remove relationship', {
        description: getApiErrorMessage(error, 'Please try again.'),
      });
    },
  });
};

export const useTreeData = () => {
  const { activeVaultId } = useAuthStore();

  return useQuery({
    queryKey: ['treeData', activeVaultId],
    queryFn: () => {
      if (!activeVaultId) throw new Error('No active vault selected');
      return genealogyApi.getTreeData(activeVaultId);
    },
    enabled: Boolean(activeVaultId),
  });
};
