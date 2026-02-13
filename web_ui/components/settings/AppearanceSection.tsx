import React from 'react';
import { Sun, Moon, Palette, Check, RefreshCw } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { useTranslation } from '../../i18n/LanguageContext';

const COLOR_PRESETS = [
  { name: 'Legacy Blue', hex: '#2563eb' },
  { name: 'Royal Indigo', hex: '#4f46e5' },
  { name: 'Emerald', hex: '#059669' },
  { name: 'Amber', hex: '#d97706' },
  { name: 'Rose', hex: '#e11d48' },
  { name: 'Slate', hex: '#475569' },
];

const AppearanceSection: React.FC = () => {
  const { theme, setTheme, primaryColor, setPrimaryColor } = useUIStore();
  const { t } = useTranslation();

  return (
    <div className="bg-white dark:bg-slate-900/60 rounded-[2.5rem] border p-6 sm:p-12 shadow-sm space-y-12 glow-card animate-in slide-in-from-right-4">
      <div className="space-y-1">
        <h3 className="text-xl font-bold">{t.settings.appearance.title}</h3>
        <p className="text-sm text-slate-500">{t.settings.appearance.subtitle}</p>
      </div>

      <div className="space-y-6">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">{t.settings.appearance.mode}</h4>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setTheme('light')}
            className={`flex flex-col items-center gap-4 p-6 rounded-[2rem] border transition-all ${theme === 'light' ? 'border-primary bg-primary/5 ring-4 ring-primary/10' : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          >
            <div className={`p-4 rounded-2xl ${theme === 'light' ? 'bg-primary text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
              <Sun size={24} />
            </div>
            <span className={`text-xs font-bold uppercase tracking-widest ${theme === 'light' ? 'text-primary' : 'text-slate-500'}`}>{t.settings.appearance.light}</span>
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`flex flex-col items-center gap-4 p-6 rounded-[2rem] border transition-all ${theme === 'dark' ? 'border-primary bg-primary/5 ring-4 ring-primary/10' : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          >
            <div className={`p-4 rounded-2xl ${theme === 'dark' ? 'bg-primary text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
              <Moon size={24} />
            </div>
            <span className={`text-xs font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-primary' : 'text-slate-500'}`}>{t.settings.appearance.dark}</span>
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">{t.settings.appearance.palette}</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {COLOR_PRESETS.map((color) => (
            <button
              key={color.hex}
              onClick={() => setPrimaryColor(color.hex)}
              className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${primaryColor === color.hex ? 'border-primary bg-primary/5' : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              <div className="w-8 h-8 rounded-xl shadow-inner flex items-center justify-center text-white" style={{ backgroundColor: color.hex }}>
                {primaryColor === color.hex && <Check size={14} strokeWidth={3} />}
              </div>
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-tighter truncate">{color.name}</span>
            </button>
          ))}
        </div>

        <div className="pt-6 space-y-4">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2">
            <Palette size={14} /> {t.settings.appearance.custom}
          </label>
          <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-[1.5rem]">
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="w-12 h-12 bg-transparent border-none cursor-pointer rounded-xl overflow-hidden"
            />
            <div className="flex-1">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{t.settings.appearance.hex}</p>
              <p className="text-[10px] text-slate-500 font-mono uppercase">{primaryColor}</p>
            </div>
            <button 
              onClick={() => setPrimaryColor('#2563eb')}
              className="p-2 text-slate-400 hover:text-primary transition-colors"
              title={t.settings.appearance.reset}
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppearanceSection;