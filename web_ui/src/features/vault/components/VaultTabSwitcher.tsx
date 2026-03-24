import type { FC } from 'react';
import { Heart } from 'lucide-react';
import type { VaultTab } from '@/features/vault/utils';

interface VaultTabSwitcherProps {
  activeTab: VaultTab;
  allItemsLabel: string;
  favoritesLabel: string;
  onChangeTab: (tab: VaultTab) => void;
}

export const VaultTabSwitcher: FC<VaultTabSwitcherProps> = ({
  activeTab,
  allItemsLabel,
  favoritesLabel,
  onChangeTab,
}) => (
  <div className="inline-flex items-center gap-2 bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 p-1.5">
    <button
      type="button"
      onClick={() => onChangeTab('all')}
      className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-colors ${
        activeTab === 'all'
          ? 'bg-primary text-white'
          : 'text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white'
      }`}
    >
      {allItemsLabel}
    </button>
    <button
      type="button"
      onClick={() => onChangeTab('favorites')}
      className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-colors flex items-center gap-2 ${
        activeTab === 'favorites'
          ? 'bg-rose-500 text-white'
          : 'text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white'
      }`}
    >
      <Heart size={14} fill={activeTab === 'favorites' ? 'currentColor' : 'none'} />
      {favoritesLabel}
    </button>
  </div>
);

