import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  Clock,
  GitBranch,
  HelpCircle,
  ShieldCheck,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { TranslationSchema } from '../i18n/locales/en';
import { useTranslation } from '../i18n/LanguageContext';
import { helpApi } from '../services/helpApi';
import { useAuthStore } from '../stores/authStore';
import type { ApiHelpArticleMeta } from '../types/api.types';
import { UserRole } from '../types';

const ARTICLE_KEYS = ['upload', 'ai', 'tree', 'invite', 'audit', 'timeline'] as const;
const CATEGORY_KEYS = ['vault', 'lineage', 'members', 'security', 'timeline'] as const;

type ArticleKey = (typeof ARTICLE_KEYS)[number];
type CategoryKey = (typeof CATEGORY_KEYS)[number];

const isArticleKey = (value: string): value is ArticleKey =>
  (ARTICLE_KEYS as readonly string[]).includes(value);

const isCategoryKey = (value: string): value is CategoryKey =>
  (CATEGORY_KEYS as readonly string[]).includes(value);

const normalizeIconKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

const ICON_MAP: Record<string, LucideIcon> = {
  book_open: BookOpen,
  sparkles: Sparkles,
  git_branch: GitBranch,
  users: Users,
  shield_check: ShieldCheck,
  clock: Clock,
};

const VALID_ROLES = new Set<UserRole>([UserRole.ADMIN, UserRole.CONTRIBUTOR, UserRole.VIEWER]);

const normalizeRoles = (roles: unknown): UserRole[] => {
  if (!Array.isArray(roles)) return [UserRole.ADMIN];

  const normalized = roles
    .map((value) => (typeof value === 'string' ? value.toUpperCase() : ''))
    .filter((value): value is UserRole => VALID_ROLES.has(value as UserRole));

  return normalized.length ? normalized : [UserRole.ADMIN];
};

export interface HelpArticle {
  id: string;
  category: string;
  title: string;
  content: string;
  icon: LucideIcon;
  steps: string[];
  allowedRoles: UserRole[];
  order: number;
}

const mapArticle = (
  meta: ApiHelpArticleMeta,
  t: TranslationSchema,
): HelpArticle | null => {
  if (!isArticleKey(meta.id) || !isCategoryKey(meta.categoryKey)) {
    return null;
  }

  const icon = ICON_MAP[normalizeIconKey(meta.iconKey)] || HelpCircle;
  const articleCopy = t.helpCenter.articles[meta.id];
  const category = t.helpCenter.categories[meta.categoryKey];

  return {
    id: meta.id,
    category,
    title: articleCopy.title,
    content: articleCopy.content,
    icon,
    steps: articleCopy.steps || [],
    allowedRoles: normalizeRoles(meta.allowedRoles),
    order: Number.isFinite(meta.order) ? meta.order : 0,
  };
};

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

  const articles = useMemo(() => {
    const mapped = (articlesQuery.data || [])
      .map((meta) => mapArticle(meta, t))
      .filter(Boolean) as HelpArticle[];

    const roleFiltered = !role
      ? mapped
      : mapped.filter((article) => article.allowedRoles.includes(role));

    return roleFiltered.sort((a, b) => {
      const orderDelta = a.order - b.order;
      if (orderDelta !== 0) return orderDelta;
      return a.title.localeCompare(b.title);
    });
  }, [articlesQuery.data, role, t]);

  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) return articles;
    const query = searchQuery.toLowerCase();

    return articles.filter((article) => {
      if (article.title.toLowerCase().includes(query)) return true;
      if (article.category.toLowerCase().includes(query)) return true;
      if (article.content.toLowerCase().includes(query)) return true;
      return article.steps.some((step) => step.toLowerCase().includes(query));
    });
  }, [articles, searchQuery]);

  const categories = useMemo(() => Array.from(new Set(articles.map((a) => a.category))), [articles]);

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
