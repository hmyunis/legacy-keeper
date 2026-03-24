import type { FC } from 'react';
import { Skeleton } from '@/components/Skeleton';

export const TreeSkeleton: FC = () => (
  <div className="flex flex-col items-center gap-16 sm:gap-24 relative min-w-max">
    {[1, 2, 3].map((level) => (
      <div key={level} className="flex gap-10 md:gap-24">
        {[1, 2].map((node) => (
          <div
            key={node}
            className="p-2 rounded-3xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm"
          >
            <Skeleton className="w-16 h-16 rounded-2xl" />
            <div className="mt-3 flex flex-col items-center gap-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-2 w-12" />
            </div>
          </div>
        ))}
      </div>
    ))}
  </div>
);
