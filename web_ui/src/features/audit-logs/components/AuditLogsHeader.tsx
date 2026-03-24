import type { FC } from 'react';
import { Download, History, RefreshCw } from 'lucide-react';

interface AuditLogsHeaderProps {
  title: string;
  subtitle: string;
  downloadLabel: string;
  isRefetching: boolean;
  isDownloading: boolean;
  onRefresh: () => void;
  onDownload: () => void;
}

export const AuditLogsHeader: FC<AuditLogsHeaderProps> = ({
  title,
  subtitle,
  downloadLabel,
  isRefetching,
  isDownloading,
  onRefresh,
  onDownload,
}) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
    <div>
      <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
        <History className="text-primary" size={24} />
        {title}
      </h1>
      <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{subtitle}</p>
    </div>

    <div className="flex items-center gap-3">
      <button
        onClick={onRefresh}
        disabled={isRefetching}
        className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm hover:text-primary transition-all active:scale-95"
      >
        <RefreshCw size={18} className={isRefetching ? 'animate-spin' : ''} />
      </button>
      <button
        onClick={onDownload}
        disabled={isDownloading}
        className="px-6 py-2.5 bg-primary text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-60"
      >
        <Download size={16} />
        {downloadLabel}
      </button>
    </div>
  </div>
);
