import { useEffect, useRef, useState, type FC } from 'react';
import { ArrowDownWideNarrow, Check, ChevronDown, History } from 'lucide-react';
import type { TimelineSort } from '@/features/timeline/types';

interface TimelineHeaderProps {
  label: string;
  title: string;
  directionLabel: string;
  newestFirstLabel: string;
  oldestFirstLabel: string;
  sort: TimelineSort;
  onSortChange: (sort: TimelineSort) => void;
}

export const TimelineHeader: FC<TimelineHeaderProps> = ({
  label,
  title,
  directionLabel,
  newestFirstLabel,
  oldestFirstLabel,
  sort,
  onSortChange,
}) => {
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div className="flex flex-col gap-4 border-b pb-6 sm:gap-6 sm:pb-8 md:flex-row md:items-end md:justify-between lg:pb-10">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
          <History size={14} /> {label}
        </div>
        <h1 className="text-2xl font-black leading-tight sm:text-3xl lg:text-4xl">{title}</h1>
      </div>
      <div className="relative w-full md:w-auto" ref={sortRef}>
        <button
          onClick={() => setIsSortOpen((open) => !open)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-transparent bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 md:w-auto"
        >
          <ArrowDownWideNarrow size={16} />
          <span>
            {directionLabel}: {sort === 'newest' ? newestFirstLabel : oldestFirstLabel}
          </span>
          <ChevronDown
            size={14}
            className={`transition-transform duration-300 ${isSortOpen ? 'rotate-180' : ''}`}
          />
        </button>
        {isSortOpen && (
          <div className="absolute top-full right-0 z-20 mt-2 w-52 animate-in slide-in-from-top-2 rounded-2xl border border-slate-200 bg-white py-2 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            {[
              { id: 'newest' as TimelineSort, label: newestFirstLabel },
              { id: 'oldest' as TimelineSort, label: oldestFirstLabel },
            ].map((option) => (
              <button
                key={option.id}
                onClick={() => {
                  onSortChange(option.id);
                  setIsSortOpen(false);
                }}
                className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-xs font-bold transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 ${
                  sort === option.id ? 'text-primary' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {option.label}
                {sort === option.id && <Check size={14} />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
