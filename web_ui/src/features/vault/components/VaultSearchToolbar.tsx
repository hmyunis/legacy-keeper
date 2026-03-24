import type { FC, RefObject } from 'react';
import {
  ArrowDownWideNarrow,
  Check,
  ChevronDown,
  Grid,
  List,
  Search,
} from 'lucide-react';
import type { VaultSortOption, VaultViewMode } from '@/features/vault/utils';

interface VaultSearchToolbarProps {
  searchQuery: string;
  searchPlaceholder: string;
  view: VaultViewMode;
  sortBy: VaultSortOption;
  isSortOpen: boolean;
  sortRef: RefObject<HTMLDivElement | null>;
  sortingLabel: string;
  newestLabel: string;
  oldestLabel: string;
  alphabeticalLabel: string;
  onSearchChange: (value: string) => void;
  onViewChange: (view: VaultViewMode) => void;
  onToggleSortOpen: () => void;
  onSortChange: (sort: VaultSortOption) => void;
}

export const VaultSearchToolbar: FC<VaultSearchToolbarProps> = ({
  searchQuery,
  searchPlaceholder,
  view,
  sortBy,
  isSortOpen,
  sortRef,
  sortingLabel,
  newestLabel,
  oldestLabel,
  alphabeticalLabel,
  onSearchChange,
  onViewChange,
  onToggleSortOpen,
  onSortChange,
}) => (
  <div className="bg-white dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-4 justify-between sticky top-16 sm:top-20 z-10 backdrop-blur-md shadow-sm">
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
      <input
        type="text"
        value={searchQuery}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder={searchPlaceholder}
        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-slate-200"
      />
    </div>

    <div className="flex items-center gap-2">
      <div className="flex p-1 bg-slate-50 dark:bg-slate-800 rounded-xl">
        <button
          type="button"
          onClick={() => onViewChange('grid')}
          className={`p-2 rounded-lg transition-all ${
            view === 'grid'
              ? 'bg-white dark:bg-slate-700 shadow-sm text-primary'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Grid size={18} />
        </button>
        <button
          type="button"
          onClick={() => onViewChange('list')}
          className={`p-2 rounded-lg transition-all ${
            view === 'list'
              ? 'bg-white dark:bg-slate-700 shadow-sm text-primary'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <List size={18} />
        </button>
      </div>
      <div className="relative" ref={sortRef}>
        <button
          type="button"
          onClick={onToggleSortOpen}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-transparent"
        >
          <ArrowDownWideNarrow size={16} />
          <span className="hidden sm:inline">
            {sortingLabel}:{' '}
            {sortBy === 'newest'
              ? newestLabel
              : sortBy === 'oldest'
                ? oldestLabel
                : alphabeticalLabel}
          </span>
          <ChevronDown
            size={14}
            className={`transition-transform duration-300 ${isSortOpen ? 'rotate-180' : ''}`}
          />
        </button>
        {isSortOpen && (
          <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-20 py-2 animate-in slide-in-from-top-2">
            {[
              { id: 'newest' as VaultSortOption, label: newestLabel },
              { id: 'oldest' as VaultSortOption, label: oldestLabel },
              { id: 'title' as VaultSortOption, label: alphabeticalLabel },
            ].map((option) => (
              <button
                type="button"
                key={option.id}
                onClick={() => onSortChange(option.id)}
                className={`w-full px-4 py-2.5 text-left text-xs font-bold flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                  sortBy === option.id ? 'text-primary' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {option.label}
                {sortBy === option.id && <Check size={14} />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  </div>
);

