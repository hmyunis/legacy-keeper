import { AxiosError } from 'axios';
import type { AuthMode, AuthRedirectTarget, AuthSearchState } from '@/features/auth/types';

export const resolveAuthMode = (pathname: string): AuthMode =>
  pathname === '/signup' ? 'signup' : 'login';

export const resolveAuthSearch = (search: { joinToken?: unknown; redirect?: unknown }): AuthSearchState => {
  const joinToken =
    typeof search.joinToken === 'string' && search.joinToken.trim()
      ? search.joinToken
      : undefined;
  const redirectPath =
    typeof search.redirect === 'string' && search.redirect.startsWith('/')
      ? search.redirect
      : undefined;

  return { joinToken, redirectPath };
};

export const buildAuthRouteSearch = (params: AuthSearchState): Record<string, string> | undefined => {
  const next: Record<string, string> = {};
  if (params.joinToken) next.joinToken = params.joinToken;
  if (params.redirectPath) next.redirect = params.redirectPath;
  return Object.keys(next).length ? next : undefined;
};

export const buildVerifyRouteSearch = (params: {
  email: string;
  joinToken?: string;
  redirectPath?: string;
}): Record<string, string> => {
  const next: Record<string, string> = {
    email: params.email,
  };
  if (params.joinToken) next.joinToken = params.joinToken;
  if (params.redirectPath) next.redirect = params.redirectPath;
  return next;
};

export const getPostAuthNavigationTarget = (params: AuthSearchState): AuthRedirectTarget => {
  if (params.joinToken) {
    return {
      to: '/join/$token',
      params: { token: params.joinToken },
    };
  }

  if (params.redirectPath) {
    const [path, query] = params.redirectPath.split('?');
    const parsedSearch = query ? Object.fromEntries(new URLSearchParams(query).entries()) : undefined;
    return {
      to: path,
      ...(parsedSearch ? { search: parsedSearch } : {}),
    };
  }

  return { to: '/dashboard' };
};

export const isEmailNotVerifiedError = (error: unknown): boolean => {
  if (!(error instanceof AxiosError)) return false;

  const data: any = error.response?.data || {};
  const code = String(data?.code || '').toUpperCase();
  if (code === 'EMAIL_NOT_VERIFIED') return true;

  const detail = typeof data?.detail === 'string' ? data.detail.toLowerCase() : '';
  const message = typeof data?.message === 'string' ? data.message.toLowerCase() : '';
  const errorText = typeof data?.error === 'string' ? data.error.toLowerCase() : '';

  return (
    detail.includes('not verified') ||
    message.includes('not verified') ||
    errorText.includes('not verified')
  );
};
