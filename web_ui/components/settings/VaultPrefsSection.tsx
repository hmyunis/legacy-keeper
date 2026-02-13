
import React from 'react';
import { Database, HardDrive, Share2, AlertCircle } from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext';

interface VaultPrefsSectionProps {
  settings: {
    quality: 'original' | 'high' | 'balanced';
    defaultVisibility: 'private' | 'family';
  };
  onUpdate: (key: string, value: any) => void;
}

const VaultPrefsSection: React.FC<VaultPrefsSectionProps> = ({ settings, onUpdate }) => {
  const { t } = useTranslation();
  
  return (
    <div className="bg-white dark:bg-slate-900/60 rounded-[2.5rem] border p-6 sm:p-12 shadow-sm space-y-10 glow-card animate-in slide-in-from-right-4">
      <div className="space-y-1">
        <h3 className="text-xl font-bold">{t.settings.vault.title}</h3>
        <p className="text-sm text-slate-500">{t.settings.vault.subtitle}</p>
      </div>

      <div className="space-y-8">
        <div className="space-y-4">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">{t.settings.vault.quality}</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(['balanced', 'high', 'original'] as const).map((q) => (
              <button
                key={q}
                onClick={() => onUpdate('quality', q)}
                className={`p-5 rounded-3xl border transition-all text-left space-y-2 ${settings.quality === q ? 'border-primary bg-primary/5 ring-2 ring-primary/10' : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                <HardDrive size={18} className={settings.quality === q ? 'text-primary' : 'text-slate-400'} />
                <div>
                  <p className={`text-[10px] font-black uppercase tracking-widest ${settings.quality === q ? 'text-primary' : 'text-slate-500'}`}>{t.settings.vault.qualities[q].label}</p>
                  <p className="text-[9px] text-slate-400 mt-0.5 leading-tight">
                    {t.settings.vault.qualities[q].desc}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">{t.settings.vault.privacy}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => onUpdate('defaultVisibility', 'private')}
              className={`flex items-center gap-4 p-5 rounded-[2rem] border transition-all ${settings.defaultVisibility === 'private' ? 'border-primary bg-primary/5' : 'border-slate-100 dark:border-slate-800'}`}
            >
              <div className={`p-3 rounded-2xl ${settings.defaultVisibility === 'private' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}><Database size={18} /></div>
              <div className="text-left">
                <p className="text-[10px] font-black uppercase tracking-widest">{t.settings.vault.privacies.private.label}</p>
                <p className="text-[9px] text-slate-500 mt-0.5">{t.settings.vault.privacies.private.desc}</p>
              </div>
            </button>
            <button
              onClick={() => onUpdate('defaultVisibility', 'family')}
              className={`flex items-center gap-4 p-5 rounded-[2rem] border transition-all ${settings.defaultVisibility === 'family' ? 'border-primary bg-primary/5' : 'border-slate-100 dark:border-slate-800'}`}
            >
              <div className={`p-3 rounded-2xl ${settings.defaultVisibility === 'family' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}><Share2 size={18} /></div>
              <div className="text-left">
                <p className="text-[10px] font-black uppercase tracking-widest">{t.settings.vault.privacies.family.label}</p>
                <p className="text-[9px] text-slate-500 mt-0.5">{t.settings.vault.privacies.family.desc}</p>
              </div>
            </button>
          </div>
        </div>

        <div className="p-6 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-[2rem] flex items-start gap-4">
          <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
          <div>
            <p className="text-[10px] font-black text-amber-800 dark:text-amber-400 uppercase tracking-widest">{t.settings.vault.health}</p>
            <p className="text-[10px] text-amber-600 dark:text-amber-500/80 mt-0.5 leading-relaxed">{t.settings.vault.healthDesc}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VaultPrefsSection;
