import type { FC, FormEvent } from 'react';
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, User } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import type { AuthFormState, AuthMode } from '@/features/auth/types';

interface AuthCredentialsFormProps {
  mode: AuthMode;
  formData: AuthFormState;
  showPassword: boolean;
  isLoading: boolean;
  onSubmit: (event: FormEvent) => void;
  onFullNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onTogglePassword: () => void;
}

export const AuthCredentialsForm: FC<AuthCredentialsFormProps> = ({
  mode,
  formData,
  showPassword,
  isLoading,
  onSubmit,
  onFullNameChange,
  onEmailChange,
  onPasswordChange,
  onTogglePassword,
}) => (
  <form onSubmit={onSubmit} className="space-y-5 sm:space-y-6">
    {mode === 'signup' && (
      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Full Name</label>
        <div className="relative group">
          <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
          <input
            type="text"
            required
            value={formData.fullName}
            onChange={(event) => onFullNameChange(event.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all dark:text-white shadow-sm"
            placeholder="Abebe Tadesse"
          />
        </div>
      </div>
    )}

    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Email</label>
      <div className="relative group">
        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
        <input
          type="email"
          required
          value={formData.email}
          onChange={(event) => onEmailChange(event.target.value)}
          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all dark:text-white shadow-sm"
          placeholder="you@example.com"
        />
      </div>
    </div>

    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Password</label>
      <div className="relative group">
        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
        <input
          type={showPassword ? 'text' : 'password'}
          required
          value={formData.password}
          onChange={(event) => onPasswordChange(event.target.value)}
          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all dark:text-white shadow-sm"
          placeholder="••••••••"
        />
        <button
          type="button"
          onClick={onTogglePassword}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {mode === 'login' && (
        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            search={formData.email.trim() ? ({ email: formData.email.trim() } as any) : undefined}
            className="text-[11px] font-bold tracking-wide text-primary hover:opacity-80 transition-opacity"
          >
            Forgot password?
          </Link>
        </div>
      )}
    </div>

    <button
      disabled={isLoading}
      type="submit"
      className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-2xl shadow-primary/30 hover:opacity-90 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-3"
    >
      {isLoading ? (
        <Loader2 size={20} className="animate-spin" />
      ) : (
        <>
          {mode === 'login' ? 'Sign In' : 'Create Account'}
          <ArrowRight size={20} />
        </>
      )}
    </button>
  </form>
);
