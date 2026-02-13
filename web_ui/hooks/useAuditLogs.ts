
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export const useAuditLogs = () => {
  return useQuery({
    queryKey: ['auditLogs'],
    queryFn: api.getAuditLogs,
  });
};
