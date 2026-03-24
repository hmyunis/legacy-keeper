import type { FC } from 'react';
import type { Table } from '@tanstack/react-table';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { AUDIT_PAGE_SIZES } from '@/features/audit-logs/selectors';
import type { AuditLog } from '@/types';

interface AuditLogsPaginationFooterProps {
  table: Table<AuditLog>;
  showLabel: string;
}

export const AuditLogsPaginationFooter: FC<AuditLogsPaginationFooterProps> = ({
  table,
  showLabel,
}) => (
  <div className="p-6 bg-slate-50/50 dark:bg-slate-950/20 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider">
        {showLabel}
      </span>
      <Select
        value={String(table.getState().pagination.pageSize)}
        onValueChange={(value) => table.setPageSize(Number(value))}
        className="w-20"
      >
        <SelectTrigger className="h-9 rounded-xl py-2 px-3 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="z-[300]">
          {AUDIT_PAGE_SIZES.map((size) => (
            <SelectItem key={size} value={String(size)}>
              {size}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
    <div className="flex items-center gap-3">
      <button
        onClick={() => table.previousPage()}
        disabled={!table.getCanPreviousPage()}
        className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl disabled:opacity-30 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-90"
      >
        <ChevronLeft size={16} className="dark:text-slate-300" />
      </button>
      <button
        onClick={() => table.nextPage()}
        disabled={!table.getCanNextPage()}
        className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl disabled:opacity-30 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-90"
      >
        <ChevronRight size={16} className="dark:text-slate-300" />
      </button>
    </div>
  </div>
);
