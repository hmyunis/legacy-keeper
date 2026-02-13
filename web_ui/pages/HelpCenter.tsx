
import React, { useState, useMemo } from 'react';
import { Search, ChevronRight, BookOpen, Lightbulb, HelpCircle, X } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';
import { useAuthStore } from '../stores/authStore';
import { UserRole } from '../types';

const HelpCenter: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);

  // Define role permissions for articles
  const articlePermissions: Record<string, UserRole[]> = {
    upload: [UserRole.ADMIN, UserRole.CONTRIBUTOR],
    tree: [UserRole.ADMIN],
    invite: [UserRole.ADMIN],
    audit: [UserRole.ADMIN],
    timeline: [UserRole.ADMIN, UserRole.CONTRIBUTOR, UserRole.VIEWER],
  };

  const helpArticles = useMemo(() => {
    const all = [
      { id: 'upload', ...t.helpCenter.articles.upload, category: t.helpCenter.categories.vault, icon: BookOpen },
      { id: 'tree', ...t.helpCenter.articles.tree, category: t.helpCenter.categories.lineage, icon: HelpCircle },
      { id: 'invite', ...t.helpCenter.articles.invite, category: t.helpCenter.categories.members, icon: HelpCircle },
      { id: 'audit', ...t.helpCenter.articles.audit, category: t.helpCenter.categories.security, icon: HelpCircle },
      { id: 'timeline', ...t.helpCenter.articles.timeline, category: t.helpCenter.categories.timeline, icon: HelpCircle },
    ];

    // Filter by role
    return all.filter(article => {
      const permittedRoles = articlePermissions[article.id] || [UserRole.ADMIN];
      return currentUser && permittedRoles.includes(currentUser.role);
    });
  }, [t, currentUser]);

  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) return helpArticles;
    const query = searchQuery.toLowerCase();
    return helpArticles.filter(article => 
      article.title.toLowerCase().includes(query) || 
      article.category.toLowerCase().includes(query) ||
      article.content.toLowerCase().includes(query)
    );
  }, [helpArticles, searchQuery]);

  const categories = useMemo(() => {
    return Array.from(new Set(helpArticles.map(a => a.category)));
  }, [helpArticles]);

  const selectedArticle = useMemo(() => 
    helpArticles.find(a => a.id === selectedArticleId), 
    [helpArticles, selectedArticleId]
  );

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-4">
      {/* Header & Search */}
      <div className="flex flex-col items-center text-center space-y-8 py-10">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-primary font-bold text-[10px] uppercase tracking-widest">
            <HelpCircle size={14} /> {t.helpCenter.header.badge}
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">{t.helpCenter.header.title}</h1>
          <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto text-sm">
            {t.helpCenter.header.subtitle}
          </p>
        </div>

        <div className="relative w-full max-w-2xl group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={20} />
          <input 
            type="text" 
            placeholder={t.helpCenter.searchPlaceholder} 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] py-5 pl-14 pr-6 text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-xl"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-16">
        {categories.map(category => {
          const articles = filteredArticles.filter(a => a.category === category);
          if (articles.length === 0) return null;

          return (
            <div key={category} className="space-y-6">
              <div className="flex items-center gap-4 px-2">
                <div className="w-1 h-6 bg-primary rounded-full"></div>
                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">{category}</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {articles.map(article => (
                  <button 
                    key={article.id}
                    onClick={() => setSelectedArticleId(article.id)}
                    className="flex flex-col text-left p-8 bg-white dark:bg-slate-900/60 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 hover:border-primary/50 hover:shadow-2xl transition-all group glow-card"
                  >
                    <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-all mb-6">
                      <article.icon size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{article.title}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">{article.content}</p>
                    <div className="mt-8 pt-6 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-primary">
                      {t.helpCenter.actions.learn}
                      <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Article Modal */}
      {selectedArticle && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 backdrop-blur-xl bg-slate-950/60 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-3xl max-h-[85vh] rounded-[3rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col animate-in zoom-in-95 duration-500">
            <div className="px-10 py-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/20">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                  <selectedArticle.icon size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-0.5">{selectedArticle.category}</p>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{selectedArticle.title}</h2>
                </div>
              </div>
              <button 
                onClick={() => setSelectedArticleId(null)}
                className="p-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 rounded-2xl transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar p-10 space-y-10">
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <BookOpen size={14} /> {t.helpCenter.modal.overview}
                </h4>
                <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  {selectedArticle.content}
                </p>
              </div>

              <div className="space-y-6">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Lightbulb size={14} /> {t.helpCenter.modal.procedure}
                </h4>
                <div className="space-y-4">
                  {selectedArticle.steps.map((step, idx) => (
                    <div key={idx} className="flex gap-6 group">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 flex items-center justify-center text-[10px] font-black text-primary transition-all group-hover:bg-primary group-hover:text-white shadow-sm">
                        {idx + 1}
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 pt-1.5 leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-10 py-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 flex justify-end">
              <button 
                onClick={() => setSelectedArticleId(null)}
                className="px-8 py-3 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:opacity-90 transition-all shadow-lg glow-primary"
              >
                {t.helpCenter.actions.gotIt}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HelpCenter;
