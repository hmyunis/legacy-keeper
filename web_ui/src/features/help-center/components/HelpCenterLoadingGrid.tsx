import type { FC } from 'react';

interface HelpCenterLoadingGridProps {
  itemCount?: number;
}

export const HelpCenterLoadingGrid: FC<HelpCenterLoadingGridProps> = ({ itemCount = 6 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {Array.from({ length: itemCount }).map((_, idx) => (
      <div
        key={idx}
        className="p-8 bg-white dark:bg-slate-900/60 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 animate-pulse space-y-4"
      >
        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800" />
        <div className="h-5 w-3/4 rounded bg-slate-100 dark:bg-slate-800" />
        <div className="h-4 w-full rounded bg-slate-100 dark:bg-slate-800" />
        <div className="h-4 w-4/5 rounded bg-slate-100 dark:bg-slate-800" />
      </div>
    ))}
  </div>
);
