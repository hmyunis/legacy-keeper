export type AuthMode = 'login' | 'signup';

export interface AuthFormState {
  fullName: string;
  email: string;
  password: string;
}

export interface AuthSearchState {
  joinToken?: string;
  redirectPath?: string;
}

export type AuthRedirectTarget =
  | { to: '/join/$token'; params: { token: string } }
  | { to: string; search?: Record<string, string> };
