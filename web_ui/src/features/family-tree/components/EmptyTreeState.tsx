import type { FC } from 'react';
import { Sparkles, UserPlus } from 'lucide-react';

interface EmptyTreeStateProps {
  title: string;
  description: string;
  cta: string;
  canEdit: boolean;
  onAddRelative: () => void;
}

export const EmptyTreeState: FC<EmptyTreeStateProps> = ({
  title,
  description,
  cta,
  canEdit,
  onAddRelative,
}) => (
  <div className="mx-auto my-auto max-w-xl text-center bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-4xl p-8 sm:p-10 shadow-lg backdrop-blur-sm">
    <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
      <Sparkles size={22} />
    </div>
    <h3 className="mt-5 text-xl font-black text-slate-900 dark:text-slate-100">{title}</h3>
    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{description}</p>
    {canEdit && (
      <button
        type="button"
        onClick={onAddRelative}
        className="mt-6 inline-flex items-center gap-2 px-5 py-3 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all"
      >
        <UserPlus size={14} />
        {cta}
      </button>
    )}
  </div>
);
