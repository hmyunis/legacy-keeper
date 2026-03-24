import { useEffect, useMemo, useState } from 'react';
import { HelpCenterArticleGrid } from '@/features/help-center/components/HelpCenterArticleGrid';
import { HelpCenterArticleModal } from '@/features/help-center/components/HelpCenterArticleModal';
import { HelpCenterEmptyState } from '@/features/help-center/components/HelpCenterEmptyState';
import { HelpCenterErrorState } from '@/features/help-center/components/HelpCenterErrorState';
import { HelpCenterHero } from '@/features/help-center/components/HelpCenterHero';
import { HelpCenterLoadingGrid } from '@/features/help-center/components/HelpCenterLoadingGrid';
import {
  getHelpArticleById,
  getHelpArticleGroups,
  isValidHelpArticleId,
} from '@/features/help-center/selectors';
import { useHelp } from '@/hooks/useHelp';
import { useTranslation } from '@/i18n/LanguageContext';

const HelpCenter = () => {
  const { t } = useTranslation();
  const {
    searchQuery,
    setSearchQuery,
    articles,
    filteredArticles,
    categories,
    isLoading,
    isError,
    refetch,
  } = useHelp();
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedArticleId) return;
    if (isValidHelpArticleId(articles, selectedArticleId)) return;
    setSelectedArticleId(null);
  }, [articles, selectedArticleId]);

  const selectedArticle = useMemo(
    () => getHelpArticleById(articles, selectedArticleId),
    [articles, selectedArticleId],
  );

  const groupedArticles = useMemo(
    () => getHelpArticleGroups(categories, filteredArticles),
    [categories, filteredArticles],
  );

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-4">
      <HelpCenterHero
        badgeLabel={t.helpCenter.header.badge}
        title={t.helpCenter.header.title}
        subtitle={t.helpCenter.header.subtitle}
        searchPlaceholder={t.helpCenter.searchPlaceholder}
        searchQuery={searchQuery}
        clearLabel={t.helpCenter.actions.clear}
        onSearchQueryChange={setSearchQuery}
        onClear={() => setSearchQuery('')}
      />

      <div className="space-y-16">
        {isLoading && <HelpCenterLoadingGrid />}

        {!isLoading && isError && (
          <HelpCenterErrorState
            message={t.helpCenter.errors.loadFailed}
            retryLabel={t.helpCenter.errors.retry}
            onRetry={() => {
              void refetch();
            }}
          />
        )}

        {!isLoading && !isError && filteredArticles.length === 0 && (
          <HelpCenterEmptyState
            searchQuery={searchQuery}
            title={t.helpCenter.empty.title}
            subtitle={t.helpCenter.empty.subtitle}
          />
        )}

        {!isLoading && !isError && (
          <HelpCenterArticleGrid
            groups={groupedArticles}
            learnLabel={t.helpCenter.actions.learn}
            onSelectArticle={setSelectedArticleId}
          />
        )}
      </div>

      {selectedArticle && (
        <HelpCenterArticleModal
          article={selectedArticle}
          overviewLabel={t.helpCenter.modal.overview}
          procedureLabel={t.helpCenter.modal.procedure}
          closeLabel={t.helpCenter.actions.gotIt}
          onClose={() => setSelectedArticleId(null)}
        />
      )}
    </div>
  );
};

export default HelpCenter;
