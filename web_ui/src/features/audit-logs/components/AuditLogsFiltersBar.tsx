import { type FC, useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Filter, Search } from 'lucide-react';
import type { AuditLogCategory, AuditLogTimeframe } from '@/features/audit-logs/selectors';
import type { AuditFilterOption } from '@/features/audit-logs/types';

interface AuditLogsFiltersBarProps {
  searchValue: string;
  searchPlaceholder: string;
  activeCategory: AuditLogCategory;
  activeTimeframe: AuditLogTimeframe;
  categories: AuditFilterOption<AuditLogCategory>[];
  timeframeOptions: AuditFilterOption<AuditLogTimeframe>[];
  onSearchChange: (value: string) => void;
  onCategoryChange: (category: AuditLogCategory) => void;
  onTimeframeChange: (timeframe: AuditLogTimeframe) => void;
}

export const AuditLogsFiltersBar: FC<AuditLogsFiltersBarProps> = ({
  searchValue,
  searchPlaceholder,
  activeCategory,
  activeTimeframe,
  categories,
  timeframeOptions,
  onSearchChange,
  onCategoryChange,
  onTimeframeChange,
}) => {
  const [isTimeframeOpen, setIsTimeframeOpen] = useState(false);
  const timeframeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const clickHandler = (event: MouseEvent) => {
      if (timeframeRef.current && !timeframeRef.current.contains(event.target as Node)) {
        setIsTimeframeOpen(false);
      }
    };

    document.addEventListener('mousedown', clickHandler);
    return () => document.removeEventListener('mousedown', clickHandler);
  }, []);

  return (
    <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col xl:flex-row gap-6 justify-between items-center bg-slate-50/50 dark:bg-slate-900/40">
      <div className="relative w-full xl:w-[450px]">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all dark:text-slate-200"
        />
      </div>

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full xl:w-auto">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border shrink-0 ${
              activeCategory === category.id
                ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-primary hover:border-primary/50'
            }`}
          >
            {category.label}
          </button>
        ))}

        <div className="relative" ref={timeframeRef}>
          <button
            onClick={() => setIsTimeframeOpen((open) => !open)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border shrink-0 ${
              activeTimeframe !== 'ALL'
                ? 'border-primary text-primary bg-primary/5'
                : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <Filter size={14} />
            {timeframeOptions.find((option) => option.id === activeTimeframe)?.label}
            <ChevronDown
              size={14}
              className={`transition-transform duration-300 ${isTimeframeOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {isTimeframeOpen && (
            <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-20 py-2 animate-in slide-in-from-top-2">
              {timeframeOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => {
                    onTimeframeChange(option.id);
                    setIsTimeframeOpen(false);
                  }}
                  className={`w-full px-4 py-2.5 text-left text-xs font-bold flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                    activeTimeframe === option.id
                      ? 'text-primary bg-primary/5'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {option.label}
                  {activeTimeframe === option.id && <Check size={14} strokeWidth={3} />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
