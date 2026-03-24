import type { FC } from 'react';

interface HelpCenterEmptyStateProps {
  searchQuery: string;
  title: string;
  subtitle: string;
}

export const HelpCenterEmptyState: FC<HelpCenterEmptyStateProps> = ({
  searchQuery,
  title,
  subtitle,
}) => (
  <div className="rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-10 text-center space-y-3">
    <p className="text-lg font-bold text-slate-900 dark:text-white">
      {searchQuery ? (
        <>
          {title} <span className="text-primary">"{searchQuery}"</span>
        </>
      ) : (
        `${title}...`
      )}
    </p>
    <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
  </div>
);
