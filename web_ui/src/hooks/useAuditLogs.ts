import { useInfiniteQuery } from '@tanstack/react-query';
import { auditApi, type AuditLogsQueryParams } from '../services/auditApi';
import { useAuthStore } from '../stores/authStore';

const DEFAULT_PAGE_SIZE = 50;

export const useAuditLogs = (params?: Omit<AuditLogsQueryParams, 'page'>) => {
  const { activeVaultId } = useAuthStore();

  return useInfiniteQuery({
    queryKey: ['auditLogs', activeVaultId, params],
    queryFn: ({ pageParam = 1 }) => {
      if (!activeVaultId) throw new Error('No active vault selected');
      return auditApi.getAuditLogs(activeVaultId, { ...params, page: pageParam, pageSize: DEFAULT_PAGE_SIZE });
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.hasNextPage) {
        return allPages.length + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    enabled: Boolean(activeVaultId),
  });
};
