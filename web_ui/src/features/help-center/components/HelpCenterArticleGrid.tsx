import type { FC } from 'react';
import { ChevronRight } from 'lucide-react';
import type { HelpArticleGroup } from '@/features/help-center/types';

interface HelpCenterArticleGridProps {
  groups: HelpArticleGroup[];
  learnLabel: string;
  onSelectArticle: (articleId: string) => void;
}

export const HelpCenterArticleGrid: FC<HelpCenterArticleGridProps> = ({
  groups,
  learnLabel,
  onSelectArticle,
}) => (
  <>
    {groups.map((group) => (
      <div key={group.category} className="space-y-6">
        <div className="flex items-center gap-4 px-2">
          <div className="w-1 h-6 bg-primary rounded-full"></div>
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">
            {group.category}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {group.articles.map((article) => (
            <button
              key={article.id}
              onClick={() => onSelectArticle(article.id)}
              className="flex flex-col text-left p-8 bg-white dark:bg-slate-900/60 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 hover:border-primary/50 hover:shadow-2xl transition-all group glow-card"
            >
              <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-all mb-6">
                <article.icon size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{article.title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                {article.content}
              </p>
              <div className="mt-8 pt-6 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-primary">
                {learnLabel}
                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          ))}
        </div>
      </div>
    ))}
  </>
);
