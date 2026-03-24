import type { FC } from 'react';
import { Clock } from 'lucide-react';

interface TimelineProgressFooterProps {
  progressLabel: string;
  progressPercent: number;
  rangeLabel: string;
}

export const TimelineProgressFooter: FC<TimelineProgressFooterProps> = ({
  progressLabel,
  progressPercent,
  rangeLabel,
}) => (
  <div className="fixed bottom-4 left-1/2 z-[100] flex w-[calc(100%-1rem)] max-w-md -translate-x-1/2 items-center gap-3 rounded-2xl border border-slate-100 bg-white/80 px-4 py-2.5 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-10 dark:border-slate-800 dark:bg-slate-900/80 sm:bottom-10 sm:w-auto sm:max-w-none sm:gap-6 sm:rounded-full sm:px-6 sm:py-3">
    <div className="flex shrink-0 items-center gap-2 text-[10px] font-black uppercase text-slate-500">
      <Clock size={14} /> {progressLabel}
    </div>
    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 sm:w-40 sm:flex-none">
      <div className="h-full bg-primary transition-all" style={{ width: `${progressPercent}%` }}></div>
    </div>
    <span className="shrink-0 text-[10px] font-black text-primary">{rangeLabel}</span>
  </div>
);
