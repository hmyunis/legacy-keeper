import type { FC } from 'react';
import { Skeleton } from '@/components/Skeleton';

interface TimelineEntrySkeletonProps {
  isEven: boolean;
}

export const TimelineEntrySkeleton: FC<TimelineEntrySkeletonProps> = ({ isEven }) => (
  <div
    className={`relative flex flex-col items-stretch gap-6 sm:gap-8 md:flex-row md:items-center md:gap-16 ${isEven ? 'md:flex-row-reverse' : ''}`}
  >
    <div className="absolute left-5 z-10 h-4 w-4 -translate-x-1/2 rounded-full border-4 border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 sm:left-8 md:left-1/2"></div>
    <div
      className={`flex w-full pl-10 sm:pl-16 md:w-[calc(50%-2rem)] md:pl-0 ${isEven ? 'justify-start' : 'justify-end'}`}
    >
      <div className="w-full overflow-hidden rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 sm:p-6 lg:p-8">
        <Skeleton className="aspect-video w-full rounded-2xl" />
        <div className="mt-4 space-y-3 sm:mt-5">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
            <Skeleton className="h-3 w-40" />
            <div className="mt-3 flex items-center gap-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-8 w-8 rounded-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
    <div className="hidden md:block w-[calc(50%-2rem)]"></div>
  </div>
);
