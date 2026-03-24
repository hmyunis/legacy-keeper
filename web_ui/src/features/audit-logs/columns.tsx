import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, Calendar, Terminal, User } from 'lucide-react';
import type { AuditLog } from '@/types';

export interface AuditLogTableText {
  timestamp: string;
  actor: string;
  action: string;
  resource: string;
  details: string;
}

export const createAuditLogColumns = (
  text: AuditLogTableText,
): ColumnDef<AuditLog>[] => [
  {
    accessorKey: 'timestamp',
    header: ({ column }) => (
      <button
        className="flex items-center gap-2 font-bold tracking-widest text-[10px] uppercase hover:text-primary transition-colors"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        {text.timestamp}
        <ArrowUpDown size={12} />
      </button>
    ),
    cell: (info) => (
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-bold text-xs">
          <Calendar size={14} className="text-primary" />
          {info.getValue() as string}
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'actorName',
    header: ({ column }) => (
      <button
        className="flex items-center gap-2 font-bold tracking-widest text-[10px] uppercase hover:text-primary transition-colors"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        {text.actor}
        <ArrowUpDown size={12} />
      </button>
    ),
    cell: (info) => (
      <div className="flex items-center gap-3">
        <div
          className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black ${
            info.getValue() === 'System'
              ? 'bg-slate-900 text-white shadow-lg'
              : 'bg-primary/10 text-primary'
          }`}
        >
          {info.getValue() === 'System' ? <Terminal size={14} /> : <User size={14} />}
        </div>
        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
          {info.getValue() as string}
        </span>
      </div>
    ),
  },
  {
    accessorKey: 'action',
    header: () => (
      <span className="uppercase font-bold tracking-widest text-[10px]">{text.action}</span>
    ),
    cell: (info) => (
      <span className="px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[9px] font-black uppercase bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
        {(info.getValue() as string).replace('_', ' ')}
      </span>
    ),
  },
  {
    accessorKey: 'target',
    header: () => (
      <span className="uppercase font-bold tracking-widest text-[10px]">{text.resource}</span>
    ),
    cell: (info) => (
      <span className="text-xs font-bold text-slate-600 dark:text-slate-400 truncate max-w-[150px] inline-block">
        {info.getValue() as string}
      </span>
    ),
  },
  {
    accessorKey: 'details',
    header: () => (
      <span className="uppercase font-bold tracking-widest text-[10px]">{text.details}</span>
    ),
    cell: (info) => (
      <p className="text-xs text-slate-500 dark:text-slate-400 italic leading-relaxed line-clamp-1">
        {info.getValue() as string}
      </p>
    ),
  },
];
