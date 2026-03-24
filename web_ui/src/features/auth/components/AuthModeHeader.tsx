import type { FC } from 'react';
import type { AuthMode } from '@/features/auth/types';

interface AuthModeHeaderProps {
  mode: AuthMode;
}

export const AuthModeHeader: FC<AuthModeHeaderProps> = ({ mode }) => (
  <div className="space-y-2">
    <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
      {mode === 'login' ? 'Welcome back' : 'Create an Account'}
    </h2>
    <p className="text-slate-500 dark:text-slate-400 font-medium text-sm sm:text-base">
      {mode === 'login'
        ? "Sign in to your family's digital heritage."
        : 'Create an account, then verify your email to activate your vault.'}
    </p>
  </div>
);
