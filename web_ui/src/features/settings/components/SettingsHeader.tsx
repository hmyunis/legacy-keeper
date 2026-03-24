import type { FC } from 'react';

interface SettingsHeaderProps {
  title: string;
  subtitle: string;
}

export const SettingsHeader: FC<SettingsHeaderProps> = ({ title, subtitle }) => (
  <div className="border-b border-slate-200 dark:border-slate-800 pb-6">
    <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{subtitle}</p>
  </div>
);
