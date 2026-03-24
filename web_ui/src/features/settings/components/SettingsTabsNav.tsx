import type { FC } from 'react';
import { Bell, ChevronRight, Database, Palette, User as UserIcon } from 'lucide-react';
import type { SettingsTab, SettingsTabIconKey, SettingsTabItem } from '@/features/settings/types';

interface SettingsTabsNavProps {
  activeTab: SettingsTab;
  items: SettingsTabItem[];
  onSelectTab: (tab: SettingsTab) => void;
}

const ICONS: Record<SettingsTabIconKey, FC<{ size?: number }>> = {
  profile: UserIcon,
  vault: Database,
  appearance: Palette,
  notifications: Bell,
};

export const SettingsTabsNav: FC<SettingsTabsNavProps> = ({ activeTab, items, onSelectTab }) => (
  <div className="space-y-2">
    {items.map((item) => {
      const Icon = ICONS[item.iconKey];
      return (
        <button
          key={item.id}
          onClick={() => onSelectTab(item.id)}
          className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all border text-left group ${
            activeTab === item.id
              ? 'bg-white border-primary shadow-sm dark:bg-slate-900 dark:border-primary/50'
              : 'bg-transparent border-transparent hover:bg-white/50 dark:hover:bg-slate-800/50 text-slate-500 dark:text-slate-400'
          }`}
        >
          <div
            className={`p-2.5 rounded-xl transition-colors ${
              activeTab === item.id
                ? 'bg-primary text-white shadow-lg'
                : 'bg-slate-100 dark:bg-slate-800 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'
            }`}
          >
            <Icon size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p
              className={`text-xs font-bold uppercase tracking-widest ${
                activeTab === item.id ? 'text-slate-900 dark:text-slate-100' : ''
              }`}
            >
              {item.label}
            </p>
            <p className="text-[10px] text-slate-400 truncate">{item.description}</p>
          </div>
          {activeTab === item.id && (
            <ChevronRight size={14} className="text-primary animate-in slide-in-from-left-2" />
          )}
        </button>
      );
    })}
  </div>
);
