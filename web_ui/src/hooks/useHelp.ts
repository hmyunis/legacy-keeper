import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  buildHelpArticles,
  filterHelpArticles,
  getHelpCategories,
} from '@/features/help-center/selectors';
import { useTranslation } from '@/i18n/LanguageContext';
import { helpApi } from '@/services/helpApi';
import { useAuthStore } from '@/stores/authStore';

export const useHelp = () => {
  const { t } = useTranslation();
  const { currentUser, activeVaultId } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');

  const role = currentUser?.role;

  const articlesQuery = useQuery({
    queryKey: ['helpArticles', activeVaultId, role],
    queryFn: () =>
      helpApi.getArticles({
        vaultId: activeVaultId || undefined,
        role: role || undefined,
      }),
    enabled: Boolean(currentUser),
  });

  const articles = useMemo(
    () =>
      buildHelpArticles({
        meta: articlesQuery.data,
        copy: t.helpCenter,
        role,
      }),
    [articlesQuery.data, role, t.helpCenter],
  );

  const filteredArticles = useMemo(
    () => filterHelpArticles(articles, searchQuery),
    [articles, searchQuery],
  );

  const categories = useMemo(() => getHelpCategories(articles), [articles]);

  return {
    searchQuery,
    setSearchQuery,
    articles,
    filteredArticles,
    categories,
    isLoading: articlesQuery.isLoading,
    isError: articlesQuery.isError,
    refetch: articlesQuery.refetch,
  };
};
