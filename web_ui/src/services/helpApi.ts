import axiosClient from './axiosClient';
import type { ApiHelpArticleMeta } from '../types/api.types';
import { UserRole } from '../types';

const HELP_ENDPOINT = 'help/articles/';

interface HelpArticlesResponse {
  role?: UserRole | null;
  articles?: ApiHelpArticleMeta[];
}

export interface HelpArticlesQueryParams {
  vaultId?: string;
  role?: UserRole;
}

const sortArticles = (articles: ApiHelpArticleMeta[]) =>
  [...articles].sort((a, b) => {
    const orderDelta = (a.order || 0) - (b.order || 0);
    if (orderDelta !== 0) return orderDelta;
    return a.id.localeCompare(b.id);
  });

export const helpApi = {
  getArticles: async (params?: HelpArticlesQueryParams): Promise<ApiHelpArticleMeta[]> => {
    const queryParams: Record<string, string> = {};
    if (params?.vaultId) queryParams.vault = params.vaultId;
    if (params?.role) queryParams.role = params.role;

    const response = await axiosClient.get<HelpArticlesResponse | ApiHelpArticleMeta[]>(HELP_ENDPOINT, {
      params: queryParams,
    });

    const payload = response.data;
    if (Array.isArray(payload)) {
      return sortArticles(payload);
    }

    return sortArticles(payload?.articles || []);
  },
};
