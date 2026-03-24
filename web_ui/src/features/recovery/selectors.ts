import type { ResetSearchState, ResetValidationMessages, VerifySearchState } from '@/features/recovery/types';

export const resolveRecoveryEmail = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

export const resolveResetSearch = (search: { email?: unknown; token?: unknown }): ResetSearchState => ({
  email: resolveRecoveryEmail(search.email),
  token: resolveRecoveryEmail(search.token),
});

export const resolveVerifySearch = (search: {
  email?: unknown;
  token?: unknown;
  joinToken?: unknown;
  redirect?: unknown;
}): VerifySearchState => ({
  email: resolveRecoveryEmail(search.email),
  token: resolveRecoveryEmail(search.token),
  joinToken: resolveRecoveryEmail(search.joinToken) || undefined,
  redirectPath:
    typeof search.redirect === 'string' && search.redirect.startsWith('/')
      ? search.redirect
      : undefined,
});

export const buildVerifyLoginSearch = (params: {
  joinToken?: string;
  redirectPath?: string;
}): Record<string, string> | undefined => {
  const next: Record<string, string> = {};
  if (params.joinToken) next.joinToken = params.joinToken;
  if (params.redirectPath) next.redirect = params.redirectPath;
  return Object.keys(next).length ? next : undefined;
};

export const validateResetSubmission = (params: {
  email: string;
  token: string;
  newPassword: string;
  confirmPassword: string;
  messages: ResetValidationMessages;
}): string | null => {
  const { email, token, newPassword, confirmPassword, messages } = params;
  if (!email.trim() || !token.trim()) {
    return messages.emailAndTokenRequired;
  }
  if (!newPassword.trim()) {
    return messages.newPasswordRequired;
  }
  if (newPassword !== confirmPassword) {
    return messages.passwordsDoNotMatch;
  }
  return null;
};

export const validateRecoveryEmail = (params: {
  email: string;
  requiredMessage: string;
}): string | null => {
  if (!params.email.trim()) {
    return params.requiredMessage;
  }
  return null;
};
