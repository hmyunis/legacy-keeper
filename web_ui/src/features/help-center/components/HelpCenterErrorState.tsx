import type { FC } from 'react';
import { RefreshCw } from 'lucide-react';

interface HelpCenterErrorStateProps {
  message: string;
  retryLabel: string;
  onRetry: () => void;
}

export const HelpCenterErrorState: FC<HelpCenterErrorStateProps> = ({
  message,
  retryLabel,
  onRetry,
}) => (
  <div className="rounded-[2rem] border border-rose-200/80 dark:border-rose-900/50 bg-rose-50/60 dark:bg-rose-950/20 p-8 text-center space-y-4">
    <p className="text-sm font-bold text-rose-700 dark:text-rose-300">{message}</p>
    <button
      type="button"
      onClick={onRetry}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-300"
    >
      <RefreshCw size={14} />
      {retryLabel}
    </button>
  </div>
);
