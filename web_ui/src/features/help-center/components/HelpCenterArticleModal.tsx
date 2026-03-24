import type { FC } from 'react';
import { BookOpen, Lightbulb, X } from 'lucide-react';
import type { HelpArticle } from '@/features/help-center/types';

interface HelpCenterArticleModalProps {
  article: HelpArticle;
  overviewLabel: string;
  procedureLabel: string;
  closeLabel: string;
  onClose: () => void;
}

export const HelpCenterArticleModal: FC<HelpCenterArticleModalProps> = ({
  article,
  overviewLabel,
  procedureLabel,
  closeLabel,
  onClose,
}) => (
  <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 backdrop-blur-xl bg-slate-950/60 animate-in fade-in duration-300">
    <div className="bg-white dark:bg-slate-900 w-full max-w-3xl max-h-[85vh] rounded-[3rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col animate-in zoom-in-95 duration-500">
      <div className="px-10 py-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/20">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 text-primary rounded-2xl">
            <article.icon size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-0.5">
              {article.category}
            </p>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
              {article.title}
            </h2>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 rounded-2xl transition-all"
        >
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-10 space-y-10">
        <div className="space-y-4">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
            <BookOpen size={14} />
            {overviewLabel}
          </h4>
          <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
            {article.content}
          </p>
        </div>

        <div className="space-y-6">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
            <Lightbulb size={14} />
            {procedureLabel}
          </h4>
          <div className="space-y-4">
            {article.steps.map((step, idx) => (
              <div key={idx} className="flex gap-6 group">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 flex items-center justify-center text-[10px] font-black text-primary transition-all group-hover:bg-primary group-hover:text-white shadow-sm">
                  {idx + 1}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 pt-1.5 leading-relaxed">
                  {step}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-10 py-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 flex justify-end">
        <button
          onClick={onClose}
          className="px-8 py-3 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:opacity-90 transition-all shadow-lg glow-primary"
        >
          {closeLabel}
        </button>
      </div>
    </div>
  </div>
);
