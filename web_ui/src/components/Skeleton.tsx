
import React from 'react';

// Fix: Allow Skeleton to accept standard HTML attributes like 'key' and 'style'
export const Skeleton = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`animate-pulse bg-slate-200 dark:bg-slate-800 rounded-lg ${className}`} {...props} />
);

export const CardSkeleton = () => (
  <div className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800 space-y-4 shadow-sm">
    <Skeleton className="w-12 h-12 rounded-2xl" />
    <div className="space-y-2">
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-3 w-1/3" />
    </div>
  </div>
);

export const MediaCardSkeleton = () => (
  <div className="bg-white dark:bg-slate-900/60 rounded-[2rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
    <Skeleton className="aspect-[4/3] w-full rounded-none" />
    <div className="p-5 space-y-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  </div>
);

export const TableRowSkeleton = ({ columns }: { columns: number }) => (
  <tr className="border-b border-slate-50 dark:border-slate-800/40">
    {Array.from({ length: columns }).map((_, i) => (
      <td key={i} className="px-8 py-6">
        <Skeleton className="h-4 w-full" />
      </td>
    ))}
  </tr>
);
