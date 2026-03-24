import type { FC } from 'react';
import type { AuthMode } from '@/features/auth/types';

interface AuthModeToggleProps {
  mode: AuthMode;
  onSelectLogin: () => void;
  onSelectSignup: () => void;
}

export const AuthModeToggle: FC<AuthModeToggleProps> = ({
  mode,
  onSelectLogin,
  onSelectSignup,
}) => (
  <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
    <button
      onClick={onSelectLogin}
      className={`flex-1 py-3 text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-xl transition-all ${
        mode === 'login' ? 'bg-white dark:bg-slate-800 text-primary shadow-md' : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      Login
    </button>
    <button
      onClick={onSelectSignup}
      className={`flex-1 py-3 text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-xl transition-all ${
        mode === 'signup' ? 'bg-white dark:bg-slate-800 text-primary shadow-md' : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      Sign Up
    </button>
  </div>
);
