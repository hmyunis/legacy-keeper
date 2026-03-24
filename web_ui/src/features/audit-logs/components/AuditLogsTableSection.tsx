import type { FC } from 'react';
import type { Table } from '@tanstack/react-table';
import { RefreshCw } from 'lucide-react';
import AuditTable from '@/components/audit-logs/AuditTable';
import { InfiniteScroll } from '@/components/ui/Pagination';
import type { AuditLog } from '@/types';

interface AuditLogsTableSectionProps {
  table: Table<AuditLog>;
  isLoading: boolean;
  isRefetching: boolean;
  columnsCount: number;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
}

export const AuditLogsTableSection: FC<AuditLogsTableSectionProps> = ({
  table,
  isLoading,
  isRefetching,
  columnsCount,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}) => (
  <div className="relative">
    {isRefetching && (
      <div className="absolute inset-0 bg-white/40 dark:bg-slate-900/40 backdrop-blur-[1px] z-10 flex items-center justify-center">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-full shadow-2xl">
          <RefreshCw className="animate-spin text-primary" size={24} />
        </div>
      </div>
    )}
    <InfiniteScroll
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      onLoadMore={onLoadMore}
    >
      <AuditTable table={table} isLoading={isLoading} columnsCount={columnsCount} />
    </InfiniteScroll>
  </div>
);
