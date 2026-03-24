import type { FC } from 'react';
import { GitBranch, Users } from 'lucide-react';

interface DashboardAsideProps {
  lineageTitle: string;
  lineageDescription: string;
  exploreTreeLabel: string;
  showQuickAccess: boolean;
  quickAccessTitle: string;
  inviteTitle: string;
  inviteDescription: string;
  logsTitle: string;
  logsDescription: string;
  onExploreTree: () => void;
  onOpenMembers: () => void;
  onOpenLogs: () => void;
}

export const DashboardAside: FC<DashboardAsideProps> = ({
  lineageTitle,
  lineageDescription,
  exploreTreeLabel,
  showQuickAccess,
  quickAccessTitle,
  inviteTitle,
  inviteDescription,
  logsTitle,
  logsDescription,
  onExploreTree,
  onOpenMembers,
  onOpenLogs,
}) => (
  <div className="space-y-6">
    <div className="bg-primary dark:bg-primary/90 rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 text-white relative overflow-hidden group shadow-2xl">
      <div className="relative z-10">
        <h3 className="text-xl sm:text-2xl font-bold mb-3">{lineageTitle}</h3>
        <p className="text-white/80 text-xs sm:text-sm mb-6 leading-relaxed opacity-90">
          {lineageDescription}
        </p>
        <button
          type="button"
          onClick={onExploreTree}
          className="w-full sm:w-auto bg-white text-primary px-6 py-3 rounded-xl font-bold text-xs hover:bg-white/90 transition-all glow-primary"
        >
          {exploreTreeLabel}
        </button>
      </div>
      <GitBranch
        size={160}
        className="hidden sm:block absolute right-[-20px] bottom-[-20px] opacity-10 group-hover:rotate-12 transition-transform duration-1000"
      />
    </div>

    {showQuickAccess && (
      <>
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 px-2">{quickAccessTitle}</h2>
        <div className="grid grid-cols-1 gap-3">
          <button
            type="button"
            onClick={onOpenMembers}
            className="w-full p-4 bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center gap-4 hover:border-primary transition-all glow-card"
          >
            <div className="p-2 bg-primary/10 rounded-xl">
              <Users size={18} className="text-primary" />
            </div>
            <div className="text-left">
              <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">{inviteTitle}</p>
              <p className="text-[8px] sm:text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                {inviteDescription}
              </p>
            </div>
          </button>
          <button
            type="button"
            onClick={onOpenLogs}
            className="w-full p-4 bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center gap-4 hover:border-emerald-400 transition-all glow-card"
          >
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
              <GitBranch size={18} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-left">
              <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">{logsTitle}</p>
              <p className="text-[8px] sm:text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                {logsDescription}
              </p>
            </div>
          </button>
        </div>
      </>
    )}
  </div>
);
