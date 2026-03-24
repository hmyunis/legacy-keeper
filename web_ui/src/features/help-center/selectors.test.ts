import { describe, expect, it } from 'vitest';
import type { ApiHelpArticleMeta } from '@/types/api.types';
import { UserRole } from '@/types';
import {
  HELP_ARTICLE_KEYS,
  HELP_CATEGORY_KEYS,
  buildHelpArticles,
  filterHelpArticles,
  getHelpArticleById,
  getHelpArticleGroups,
  getHelpCategories,
  isHelpArticleKey,
  isHelpCategoryKey,
  isValidHelpArticleId,
  mapHelpArticle,
  normalizeHelpIconKey,
  normalizeHelpRoles,
} from './selectors';
import type { HelpCenterTranslationCopy } from './types';

const copy: HelpCenterTranslationCopy = {
  categories: {
    vault: 'Vault Preservation',
    lineage: 'Lineage Mapping',
    members: 'Member Governance',
    security: 'System Security',
    timeline: 'Chronological Navigation',
    settings: 'Vault Settings',
  },
  articles: {
    upload: {
      title: 'Upload Memories',
      content: 'Create a memory with files.',
      steps: ['Open Vault', 'Click Preserve'],
    },
    audit: {
      title: 'Audit Logs and Export',
      content: 'Trace access events.',
      steps: ['Open Audit Logs', 'Download export'],
    },
    invite: {
      title: 'Invite and Manage Members',
      content: 'Invite members by email.',
      steps: ['Open Members', 'Send invite'],
    },
  },
};

const buildMeta = (overrides: Partial<ApiHelpArticleMeta> = {}): ApiHelpArticleMeta => ({
  id: 'upload',
  categoryKey: 'vault',
  iconKey: 'book_open',
  allowedRoles: [UserRole.ADMIN, UserRole.CONTRIBUTOR],
  order: 2,
  ...overrides,
});

describe('help center selectors', () => {
  it('recognizes supported keys', () => {
    expect(isHelpArticleKey('upload')).toBe(true);
    expect(isHelpArticleKey('not-supported')).toBe(false);
    expect(isHelpCategoryKey('security')).toBe(true);
    expect(isHelpCategoryKey('random')).toBe(false);
    expect(HELP_ARTICLE_KEYS).toContain('timeline');
    expect(HELP_CATEGORY_KEYS).toContain('settings');
  });

  it('normalizes icon keys and allowed roles', () => {
    expect(normalizeHelpIconKey('Refresh Cw')).toBe('refresh_cw');
    expect(normalizeHelpIconKey(' link-2 ')).toBe('link_2');
    expect(normalizeHelpRoles([UserRole.VIEWER, 'admin'])).toEqual([
      UserRole.VIEWER,
      UserRole.ADMIN,
    ]);
    expect(normalizeHelpRoles(['invalid'])).toEqual([UserRole.ADMIN]);
    expect(normalizeHelpRoles(undefined)).toEqual([UserRole.ADMIN]);
  });

  it('maps a valid article meta into UI article', () => {
    const mapped = mapHelpArticle(buildMeta(), copy);
    expect(mapped?.id).toBe('upload');
    expect(mapped?.category).toBe('Vault Preservation');
    expect(mapped?.title).toBe('Upload Memories');
    expect(mapped?.steps).toEqual(['Open Vault', 'Click Preserve']);
  });

  it('filters invalid map entries and role-gates build output', () => {
    const meta: ApiHelpArticleMeta[] = [
      buildMeta({
        id: 'upload',
        order: 2,
        allowedRoles: [UserRole.ADMIN, UserRole.CONTRIBUTOR],
      }),
      buildMeta({
        id: 'audit',
        categoryKey: 'security',
        order: 1,
        allowedRoles: [UserRole.ADMIN],
      }),
      buildMeta({
        id: 'invite',
        categoryKey: 'members',
        order: 3,
        allowedRoles: [UserRole.VIEWER],
      }),
      buildMeta({
        id: 'unknown',
        categoryKey: 'security',
      }),
    ];

    const adminArticles = buildHelpArticles({
      meta,
      copy,
      role: UserRole.ADMIN,
    });
    expect(adminArticles.map((article) => article.id)).toEqual(['audit', 'upload']);

    const viewerArticles = buildHelpArticles({
      meta,
      copy,
      role: UserRole.VIEWER,
    });
    expect(viewerArticles.map((article) => article.id)).toEqual(['invite']);
  });

  it('filters by title/category/content/steps and preserves empty query behavior', () => {
    const articles = buildHelpArticles({
      meta: [
        buildMeta({ id: 'upload', categoryKey: 'vault' }),
        buildMeta({ id: 'audit', categoryKey: 'security', allowedRoles: [UserRole.ADMIN] }),
      ],
      copy,
      role: UserRole.ADMIN,
    });

    expect(filterHelpArticles(articles, '')).toEqual(articles);
    expect(filterHelpArticles(articles, '  ')).toEqual(articles);
    expect(filterHelpArticles(articles, 'vault').map((article) => article.id)).toEqual(['upload']);
    expect(filterHelpArticles(articles, 'download').map((article) => article.id)).toEqual([
      'audit',
    ]);
    expect(filterHelpArticles(articles, '  vault').length).toBe(0);
  });

  it('derives categories, groups, and selected article state', () => {
    const articles = buildHelpArticles({
      meta: [
        buildMeta({ id: 'upload', categoryKey: 'vault' }),
        buildMeta({ id: 'audit', categoryKey: 'security' }),
      ],
      copy,
      role: UserRole.ADMIN,
    });

    const categories = getHelpCategories(articles);
    const groups = getHelpArticleGroups(categories, filterHelpArticles(articles, 'audit'));

    expect(categories).toEqual(['System Security', 'Vault Preservation']);
    expect(groups).toEqual([
      {
        category: 'System Security',
        articles: [articles[0]],
      },
    ]);
    expect(getHelpArticleById(articles, articles[0].id)?.id).toBe(articles[0].id);
    expect(getHelpArticleById(articles, 'missing')).toBeNull();
    expect(isValidHelpArticleId(articles, articles[0].id)).toBe(true);
    expect(isValidHelpArticleId(articles, null)).toBe(false);
  });
});
