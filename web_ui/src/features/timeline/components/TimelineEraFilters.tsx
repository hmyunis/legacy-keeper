import type { FC } from 'react';

interface TimelineEraFiltersProps {
  allLabel: string;
  decades: string[];
  activeDecade: string | null;
  onChange: (decade: string | null) => void;
}

export const TimelineEraFilters: FC<TimelineEraFiltersProps> = ({
  allLabel,
  decades,
  activeDecade,
  onChange,
}) => (
  <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar sm:gap-3 sm:pb-4">
    <button
      onClick={() => onChange(null)}
      className={`rounded-full border px-4 py-2 text-[10px] font-black uppercase transition-all sm:px-5 sm:py-2.5 ${
        !activeDecade
          ? 'border-primary bg-primary text-white shadow-lg'
          : 'border-slate-200 bg-white text-slate-500 hover:border-primary dark:border-slate-800 dark:bg-slate-900'
      }`}
    >
      {allLabel}
    </button>
    {decades.map((decade) => (
      <button
        key={decade}
        onClick={() => onChange(decade)}
        className={`rounded-full border px-4 py-2 text-[10px] font-black uppercase transition-all sm:px-5 sm:py-2.5 ${
          activeDecade === decade
            ? 'border-primary bg-primary text-white shadow-lg'
            : 'border-slate-200 bg-white text-slate-500 hover:border-primary dark:border-slate-800 dark:bg-slate-900'
        }`}
      >
        {decade}
      </button>
    ))}
  </div>
);
