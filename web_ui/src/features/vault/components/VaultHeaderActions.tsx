import type { FC } from 'react';
import { CheckSquare, Filter as FilterIcon, Square, UploadCloud } from 'lucide-react';

interface VaultHeaderActionsProps {
  title: string;
  subtitle: string;
  canDelete: boolean;
  isSelectionMode: boolean;
  canUpload: boolean;
  isFilterExpanded: boolean;
  activeFilterCount: number;
  activeFilterBadgeLabel: string;
  onToggleSelectionMode: () => void;
  onToggleFilters: () => void;
  onOpenUpload: () => void;
  selectLabel: string;
  cancelLabel: string;
  filterLabel: string;
  preserveLabel: string;
}

export const VaultHeaderActions: FC<VaultHeaderActionsProps> = ({
  title,
  subtitle,
  canDelete,
  isSelectionMode,
  canUpload,
  isFilterExpanded,
  activeFilterCount,
  activeFilterBadgeLabel,
  onToggleSelectionMode,
  onToggleFilters,
  onOpenUpload,
  selectLabel,
  cancelLabel,
  filterLabel,
  preserveLabel,
}) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
    <div>
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-slate-500 text-sm">{subtitle}</p>
    </div>
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      {canDelete && (
        <button
          type="button"
          onClick={onToggleSelectionMode}
          className={`flex-1 sm:flex-none px-4 py-3 rounded-xl font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 border transition-all ${
            isSelectionMode
              ? 'bg-primary border-primary text-white'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
        >
          {isSelectionMode ? <CheckSquare size={14} /> : <Square size={14} />}
          {isSelectionMode ? cancelLabel : selectLabel}
        </button>
      )}
      <button
        type="button"
        onClick={onToggleFilters}
        className={`relative flex-1 sm:flex-none px-4 py-3 rounded-xl font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 border transition-all ${
          isFilterExpanded
            ? 'bg-slate-900 dark:bg-slate-700 text-white shadow-lg'
            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
        }`}
      >
        <FilterIcon size={14} />
        {filterLabel}
        {activeFilterCount > 0 && (
          <span className="absolute -top-2 -right-2 min-w-[1.2rem] h-5 px-1.5 rounded-full bg-primary text-white text-[10px] leading-none font-black flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-md">
            {activeFilterBadgeLabel}
          </span>
        )}
      </button>
      {canUpload && (
        <button
          type="button"
          onClick={onOpenUpload}
          className="w-full sm:w-auto bg-primary text-white px-6 py-3 rounded-xl font-bold text-[10px] uppercase flex items-center justify-center gap-2 hover:opacity-90 glow-primary transition-all shadow-lg shadow-primary/20"
        >
          <UploadCloud size={16} />
          {preserveLabel}
        </button>
      )}
    </div>
  </div>
);

