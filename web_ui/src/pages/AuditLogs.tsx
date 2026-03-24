import { useEffect, useMemo, useState } from 'react';
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { toast } from 'sonner';
import { createAuditLogColumns } from '@/features/audit-logs/columns';
import { AuditLogsFiltersBar } from '@/features/audit-logs/components/AuditLogsFiltersBar';
import { AuditLogsHeader } from '@/features/audit-logs/components/AuditLogsHeader';
import { AuditLogsPaginationFooter } from '@/features/audit-logs/components/AuditLogsPaginationFooter';
import { AuditLogsTableSection } from '@/features/audit-logs/components/AuditLogsTableSection';
import {
  flattenAuditLogs,
  getAuditCategoryOptions,
  getAuditTimeframeOptions,
  resolveAuditCategory,
  resolveAuditTimeframe,
  withAuditCategorySearch,
  withAuditDefaultsSearch,
  withAuditTimeframeSearch,
  type AuditLogCategory,
  type AuditLogTimeframe,
} from '@/features/audit-logs/selectors';
import type { AuditLogsSearchState } from '@/features/audit-logs/types';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { useTranslation } from '@/i18n/LanguageContext';
import { auditApi } from '@/services/auditApi';
import { getApiErrorMessage } from '@/services/httpError';
import { useAuthStore } from '@/stores/authStore';

const AuditLogs = () => {
  const { t } = useTranslation();
  const { activeVaultId } = useAuthStore();
  const navigate = useNavigate();
  const searchParams = useSearch({ strict: false }) as AuditLogsSearchState;
  const [sorting, setSorting] = useState<SortingState>([{ id: 'timestamp', desc: true }]);
  const [searchInput, setSearchInput] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const debouncedSearch = useDebouncedValue(searchInput, {
    delay: 400,
    normalize: (value: string) => value.trim(),
  });

  const activeCategory = resolveAuditCategory(searchParams.category);
  const activeTimeframe = resolveAuditTimeframe(searchParams.timeframe);

  const setActiveCategory = (category: AuditLogCategory) => {
    navigate({
      to: '/logs',
      search: (previous: Record<string, unknown>) => withAuditCategorySearch(previous, category),
    } as any);
  };

  const setActiveTimeframe = (timeframe: AuditLogTimeframe) => {
    navigate({
      to: '/logs',
      search: (previous: Record<string, unknown>) => withAuditTimeframeSearch(previous, timeframe),
    } as any);
  };

  useEffect(() => {
    if (searchParams.category && searchParams.timeframe) return;

    navigate({
      to: '/logs',
      replace: true,
      search: (previous: Record<string, unknown>) =>
        withAuditDefaultsSearch({
          previous,
          category: activeCategory,
          timeframe: activeTimeframe,
        }),
    } as any);
  }, [
    activeCategory,
    activeTimeframe,
    navigate,
    searchParams.category,
    searchParams.timeframe,
  ]);

  const {
    data: logsData,
    isLoading,
    isRefetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useAuditLogs({
    category: activeCategory,
    timeframe: activeTimeframe,
    search: debouncedSearch || undefined,
  });

  const allLogs = useMemo(() => flattenAuditLogs(logsData), [logsData]);

  const columns = useMemo(
    () =>
      createAuditLogColumns({
        timestamp: t.auditLogs.table.timestamp,
        actor: t.auditLogs.table.actor,
        action: t.auditLogs.table.action,
        resource: t.auditLogs.table.resource,
        details: t.auditLogs.table.details,
      }),
    [
      t.auditLogs.table.action,
      t.auditLogs.table.actor,
      t.auditLogs.table.details,
      t.auditLogs.table.resource,
      t.auditLogs.table.timestamp,
    ],
  );

  const table = useReactTable({
    data: allLogs,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  const categories = useMemo(
    () => getAuditCategoryOptions(t.auditLogs.categories),
    [
      t.auditLogs.categories.access,
      t.auditLogs.categories.all,
      t.auditLogs.categories.management,
      t.auditLogs.categories.system,
      t.auditLogs.categories.uploads,
    ],
  );
  const timeframeOptions = useMemo(
    () => getAuditTimeframeOptions(t.auditLogs.timeframeOptions),
    [
      t.auditLogs.timeframeOptions.all,
      t.auditLogs.timeframeOptions.day,
      t.auditLogs.timeframeOptions.month,
      t.auditLogs.timeframeOptions.week,
    ],
  );

  const handleRefresh = async () => {
    const promise = refetch();
    toast.promise(promise, {
      loading: t.auditLogs.toasts.syncing,
      success: t.auditLogs.toasts.synced,
      error: t.auditLogs.toasts.failed,
    });
  };

  const handleDownload = async () => {
    if (!activeVaultId) {
      toast.error(t.auditLogs.errors.noVaultSelected);
      return;
    }

    setIsDownloading(true);
    try {
      const downloadPromise = auditApi.exportAuditLogs(activeVaultId, {
        category: activeCategory,
        timeframe: activeTimeframe,
        search: debouncedSearch || undefined,
      });

      toast.promise(downloadPromise, {
        loading: t.auditLogs.toasts.syncing,
        success: t.auditLogs.toasts.exported,
        error: t.auditLogs.toasts.failed,
      });

      const { blob, fileName } = await downloadPromise;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(t.auditLogs.toasts.failed, {
        description: getApiErrorMessage(error, t.auditLogs.errors.retry),
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <AuditLogsHeader
        title={t.auditLogs.title}
        subtitle={t.auditLogs.subtitle}
        downloadLabel={t.auditLogs.actions.download}
        isRefetching={isRefetching}
        isDownloading={isDownloading}
        onRefresh={() => {
          void handleRefresh();
        }}
        onDownload={() => {
          void handleDownload();
        }}
      />

      <div className="bg-white dark:bg-slate-900/60 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-visible flex flex-col glow-card transition-all">
        <AuditLogsFiltersBar
          searchValue={searchInput}
          searchPlaceholder={t.auditLogs.searchPlaceholder}
          activeCategory={activeCategory}
          activeTimeframe={activeTimeframe}
          categories={categories}
          timeframeOptions={timeframeOptions}
          onSearchChange={setSearchInput}
          onCategoryChange={setActiveCategory}
          onTimeframeChange={setActiveTimeframe}
        />

        <AuditLogsTableSection
          table={table}
          isLoading={isLoading}
          isRefetching={isRefetching}
          columnsCount={columns.length}
          hasNextPage={hasNextPage || false}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={() => {
            void fetchNextPage();
          }}
        />

        <AuditLogsPaginationFooter table={table} showLabel={t.auditLogs.pagination.show} />
      </div>
    </div>
  );
};

export default AuditLogs;
