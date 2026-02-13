import React from 'react';
import { flexRender, Table } from '@tanstack/react-table';
import { Terminal, Info } from 'lucide-react';
import { AuditLog } from '../../types';
import { useTranslation } from '../../i18n/LanguageContext';

interface AuditTableProps {
  table: Table<AuditLog>;
  isLoading: boolean;
  columnsCount: number;
}

const AuditTable: React.FC<AuditTableProps> = ({ table, isLoading, columnsCount }) => {
  const { t } = useTranslation();
  
  return (
    <div className="overflow-x-auto no-scrollbar">
      <table className="w-full text-left border-collapse min-w-[1000px]">
        <thead>
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id} className="bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800">
              {headerGroup.headers.map(header => (
                <th key={header.id} className="px-8 py-5">
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {isLoading ? (
            [...Array(6)].map((_, i) => (
              <tr key={i} className="border-b border-slate-50 dark:border-slate-800/40">
                {[...Array(columnsCount)].map((_, j) => (
                  <td key={j} className="px-8 py-6">
                    <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse w-full"></div>
                  </td>
                ))}
              </tr>
            ))
          ) : table.getRowModel().rows.length > 0 ? (
            table.getRowModel().rows.map(row => (
              <tr key={row.id} className="border-b border-slate-50 dark:border-slate-800/40 hover:bg-primary/[0.03] transition-all group">
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-8 py-6">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columnsCount} className="px-8 py-32 text-center">
                <div className="flex flex-col items-center gap-5">
                  <div className="p-8 bg-slate-50 dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 text-slate-200 shadow-inner">
                    <Terminal size={48} strokeWidth={1} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-800 dark:text-slate-100 font-bold text-lg">{t.auditLogs.table.empty}</p>
                    <p className="text-slate-500 dark:text-slate-400 text-xs">{t.auditLogs.table.emptyDesc}</p>
                  </div>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default AuditTable;