export type RecoveryStatus = 'idle' | 'loading' | 'success' | 'error';

export interface ResetSearchState {
  email: string;
  token: string;
}

export interface VerifySearchState {
  email: string;
  token: string;
  joinToken?: string;
  redirectPath?: string;
}

export interface ResetValidationMessages {
  emailAndTokenRequired: string;
  newPasswordRequired: string;
  passwordsDoNotMatch: string;
}
