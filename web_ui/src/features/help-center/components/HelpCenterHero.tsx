import type { FC } from 'react';
import { HelpCircle, Search } from 'lucide-react';

interface HelpCenterHeroProps {
  badgeLabel: string;
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  searchQuery: string;
  clearLabel: string;
  onSearchQueryChange: (value: string) => void;
  onClear: () => void;
}

export const HelpCenterHero: FC<HelpCenterHeroProps> = ({
  badgeLabel,
  title,
  subtitle,
  searchPlaceholder,
  searchQuery,
  clearLabel,
  onSearchQueryChange,
  onClear,
}) => (
  <div className="flex flex-col items-center text-center space-y-8 py-10">
    <div className="space-y-4">
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-primary font-bold text-[10px] uppercase tracking-widest">
        <HelpCircle size={14} />
        {badgeLabel}
      </div>
      <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">{title}</h1>
      <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto text-sm">{subtitle}</p>
    </div>

    <div className="relative w-full max-w-2xl group">
      <Search
        className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors"
        size={20}
      />
      <input
        type="text"
        placeholder={searchPlaceholder}
        value={searchQuery}
        onChange={(event) => onSearchQueryChange(event.target.value)}
        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] py-5 pl-14 pr-6 text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-xl"
      />
    </div>

    {searchQuery && (
      <button
        type="button"
        onClick={onClear}
        className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors"
      >
        {clearLabel}
      </button>
    )}
  </div>
);
