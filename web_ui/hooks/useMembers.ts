
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { UserRole } from '../types';
import { toast } from 'sonner';

export const useMembers = () => {
  return useQuery({
    queryKey: ['members'],
    queryFn: api.getMembers,
  });
};

export const useInviteMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, role }: { email: string; role: UserRole }) => {
      const promise = api.inviteMember(email, role);
      toast.promise(promise, {
        loading: `Securing invitation for ${email}...`,
        success: 'Invitation dispatched to circle member',
        error: 'Failed to dispatch invitation',
      });
      return promise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });
};

export const useRemoveMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => {
      const promise = api.removeMember(id);
      toast.promise(promise, {
        loading: 'Revoking access...',
        success: 'Member clearance revoked',
        error: 'Failed to revoke member access',
      });
      return promise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });
};
