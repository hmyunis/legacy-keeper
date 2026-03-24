import type { LucideIcon } from 'lucide-react';
import type { UserRole } from '@/types';

export interface HelpCenterArticleCopy {
  title: string;
  content: string;
  steps: string[];
}

export interface HelpCenterTranslationCopy {
  categories: Record<string, string>;
  articles: Record<string, HelpCenterArticleCopy | undefined>;
}

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

export interface HelpArticleGroup {
  category: string;
  articles: HelpArticle[];
}
