import {
  Bell,
  BookOpen,
  Clock,
  GitBranch,
  HelpCircle,
  Link2,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { ApiHelpArticleMeta } from '@/types/api.types';
import { UserRole } from '@/types';
import type {
  HelpArticle,
  HelpArticleGroup,
  HelpCenterArticleCopy,
  HelpCenterTranslationCopy,
} from './types';

export const HELP_ARTICLE_KEYS = [
  'upload',
  'search',
  'ai',
  'restoration',
  'tree',
  'invite',
  'shareLinks',
  'audit',
  'timeline',
  'notifications',
  'vaultPrefs',
  'ownership',
] as const;

export const HELP_CATEGORY_KEYS = [
  'vault',
  'lineage',
  'members',
  'security',
  'timeline',
  'settings',
] as const;

type HelpArticleKey = (typeof HELP_ARTICLE_KEYS)[number];
type HelpCategoryKey = (typeof HELP_CATEGORY_KEYS)[number];

const VALID_ROLES = new Set<UserRole>([UserRole.ADMIN, UserRole.CONTRIBUTOR, UserRole.VIEWER]);

const ICON_MAP: Record<string, LucideIcon> = {
  book_open: BookOpen,
  search: Search,
  sparkles: Sparkles,
  refresh_cw: RefreshCw,
  git_branch: GitBranch,
  users: Users,
  link_2: Link2,
  shield_check: ShieldCheck,
  clock: Clock,
  bell: Bell,
  settings: Settings,
};

export const isHelpArticleKey = (value: string): value is HelpArticleKey =>
  (HELP_ARTICLE_KEYS as readonly string[]).includes(value);

export const isHelpCategoryKey = (value: string): value is HelpCategoryKey =>
  (HELP_CATEGORY_KEYS as readonly string[]).includes(value);

export const normalizeHelpIconKey = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

export const resolveHelpIcon = (iconKey: string): LucideIcon =>
  ICON_MAP[normalizeHelpIconKey(iconKey)] || HelpCircle;

export const normalizeHelpRoles = (roles: unknown): UserRole[] => {
  if (!Array.isArray(roles)) return [UserRole.ADMIN];

  const normalized = roles
    .map((value) => (typeof value === 'string' ? value.toUpperCase() : ''))
    .filter((value): value is UserRole => VALID_ROLES.has(value as UserRole));

  return normalized.length ? normalized : [UserRole.ADMIN];
};

const getHelpArticleCopy = (
  copy: HelpCenterTranslationCopy,
  articleKey: HelpArticleKey,
): HelpCenterArticleCopy | null => {
  const articleCopy = copy.articles[articleKey];
  if (!articleCopy) return null;
  return articleCopy;
};

export const mapHelpArticle = (
  meta: ApiHelpArticleMeta,
  copy: HelpCenterTranslationCopy,
): HelpArticle | null => {
  if (!isHelpArticleKey(meta.id) || !isHelpCategoryKey(meta.categoryKey)) {
    return null;
  }

  const articleCopy = getHelpArticleCopy(copy, meta.id);
  const category = copy.categories[meta.categoryKey];
  if (!articleCopy || !category) return null;

  return {
    id: meta.id,
    category,
    title: articleCopy.title,
    content: articleCopy.content,
    icon: resolveHelpIcon(meta.iconKey),
    steps: articleCopy.steps || [],
    allowedRoles: normalizeHelpRoles(meta.allowedRoles),
    order: Number.isFinite(meta.order) ? meta.order : 0,
  };
};

export const buildHelpArticles = (params: {
  meta?: ApiHelpArticleMeta[];
  copy: HelpCenterTranslationCopy;
  role?: UserRole | null;
}): HelpArticle[] => {
  const { meta, copy, role } = params;
  const mapped = (meta || [])
    .map((item) => mapHelpArticle(item, copy))
    .filter(Boolean) as HelpArticle[];

  const roleFiltered = !role
    ? mapped
    : mapped.filter((article) => article.allowedRoles.includes(role));

  return roleFiltered.sort((a, b) => {
    const orderDelta = a.order - b.order;
    if (orderDelta !== 0) return orderDelta;
    return a.title.localeCompare(b.title);
  });
};

export const filterHelpArticles = (articles: HelpArticle[], searchQuery: string): HelpArticle[] => {
  if (!searchQuery.trim()) return articles;

  const query = searchQuery.toLowerCase();
  return articles.filter((article) => {
    if (article.title.toLowerCase().includes(query)) return true;
    if (article.category.toLowerCase().includes(query)) return true;
    if (article.content.toLowerCase().includes(query)) return true;
    return article.steps.some((step) => step.toLowerCase().includes(query));
  });
};

export const getHelpCategories = (articles: HelpArticle[]): string[] =>
  Array.from(new Set(articles.map((article) => article.category)));

export const getHelpArticleById = (
  articles: HelpArticle[],
  selectedArticleId: string | null,
): HelpArticle | null => {
  if (!selectedArticleId) return null;
  return articles.find((article) => article.id === selectedArticleId) || null;
};

export const isValidHelpArticleId = (
  articles: HelpArticle[],
  selectedArticleId: string | null,
): boolean => {
  if (!selectedArticleId) return false;
  return articles.some((article) => article.id === selectedArticleId);
};

export const getHelpArticleGroups = (
  categories: string[],
  filteredArticles: HelpArticle[],
): HelpArticleGroup[] =>
  categories
    .map((category) => ({
      category,
      articles: filteredArticles.filter((article) => article.category === category),
    }))
    .filter((group) => group.articles.length > 0);
