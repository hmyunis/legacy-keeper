import type { FC } from 'react';
import { Calendar, ChevronRight, Database, Users } from 'lucide-react';
import { CardSkeleton } from '@/components/Skeleton';
import type { DashboardStat } from '../types';

interface DashboardStatsGridProps {
  stats: DashboardStat[];
  isLoading: boolean;
  onNavigate: (to: DashboardStat['to']) => void;
}

const STAT_ICONS = {
  memories: Database,
  members: Users,
  timeline: Calendar,
} as const;

export const DashboardStatsGrid: FC<DashboardStatsGridProps> = ({
  stats,
  isLoading,
  onNavigate,
}) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
    {isLoading
      ? Array.from({ length: 3 }).map((_, index) => <CardSkeleton key={index} />)
      : stats.map((stat) => {
          const Icon = STAT_ICONS[stat.icon];
          return (
            <button
              key={stat.label}
              type="button"
              onClick={() => onNavigate(stat.to)}
              className="bg-white dark:bg-slate-900/60 p-5 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:border-primary/50 dark:hover:border-primary/50 transition-all text-left group glow-card"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-primary/10 group-hover:scale-110 transition-transform shadow-sm">
                  <Icon className="text-primary" />
                </div>
                <ChevronRight
                  size={16}
                  className="text-slate-300 dark:text-slate-600 group-hover:text-primary transition-all"
                />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100">
                {stat.value}
              </p>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                {stat.label}
              </p>
            </button>
          );
        })}
  </div>
);
