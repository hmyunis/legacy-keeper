import type { FC } from 'react';
import { Clock, Shield, UserCheck, Users } from 'lucide-react';
import { CardSkeleton } from '@/components/Skeleton';
import type { MembersStats } from '@/features/members/types';

interface MembersStatsGridProps {
  isLoading: boolean;
  stats: MembersStats;
  labels: {
    total: string;
    active: string;
    pending: string;
    contributors: string;
  };
}

export const MembersStatsGrid: FC<MembersStatsGridProps> = ({ isLoading, stats, labels }) => {
  const cards = [
    { label: labels.total, value: stats.total, icon: <Users className="text-primary" />, color: 'bg-primary/10' },
    {
      label: labels.active,
      value: stats.active,
      icon: <UserCheck className="text-emerald-600 dark:text-emerald-400" />,
      color: 'bg-emerald-50 dark:bg-emerald-900/20',
    },
    {
      label: labels.pending,
      value: stats.pending,
      icon: <Clock className="text-orange-600 dark:text-orange-400" />,
      color: 'bg-orange-50 dark:bg-orange-900/20',
    },
    {
      label: labels.contributors,
      value: stats.contributors,
      icon: <Shield className="text-purple-600 dark:text-purple-400" />,
      color: 'bg-purple-50 dark:bg-purple-900/20',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {isLoading
        ? Array.from({ length: 4 }).map((_, index) => <CardSkeleton key={index} />)
        : cards.map((card, index) => (
            <div
              key={index}
              className="bg-white dark:bg-slate-900 p-5 rounded-4xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 glow-card"
            >
              <div className={`p-3 rounded-2xl ${card.color}`}>{card.icon}</div>
              <div>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{card.value}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{card.label}</p>
              </div>
            </div>
          ))}
    </div>
  );
};
