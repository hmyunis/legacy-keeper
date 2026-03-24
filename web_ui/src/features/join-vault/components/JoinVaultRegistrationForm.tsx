import type { FC, FormEvent } from 'react';
import { Eye, EyeOff, Loader2, Lock, Mail, User } from 'lucide-react';

interface JoinVaultRegistrationFormProps {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  requiresEmail: boolean;
  showPassword: boolean;
  showConfirmPassword: boolean;
  inlineError: string | null;
  showLoginAction: boolean;
  isSubmitting: boolean;
  fullNameLabel: string;
  emailLabel: string;
  passwordLabel: string;
  confirmPasswordLabel: string;
  fullNamePlaceholder: string;
  emailPlaceholder: string;
  passwordPlaceholder: string;
  confirmPasswordPlaceholder: string;
  loginInsteadLabel: string;
  submitLabel: string;
  onSubmit: (event: FormEvent) => void;
  onFullNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onTogglePassword: () => void;
  onToggleConfirmPassword: () => void;
  onLoginInstead: () => void;
}

export const JoinVaultRegistrationForm: FC<JoinVaultRegistrationFormProps> = ({
  fullName,
  email,
  password,
  confirmPassword,
  requiresEmail,
  showPassword,
  showConfirmPassword,
  inlineError,
  showLoginAction,
  isSubmitting,
  fullNameLabel,
  emailLabel,
  passwordLabel,
  confirmPasswordLabel,
  fullNamePlaceholder,
  emailPlaceholder,
  passwordPlaceholder,
  confirmPasswordPlaceholder,
  loginInsteadLabel,
  submitLabel,
  onSubmit,
  onFullNameChange,
  onEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onTogglePassword,
  onToggleConfirmPassword,
  onLoginInstead,
}) => (
  <form onSubmit={onSubmit} className="space-y-3">
    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">{fullNameLabel}</label>
    <div className="relative">
      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
      <input
        type="text"
        value={fullName}
        onChange={(event) => onFullNameChange(event.target.value)}
        placeholder={fullNamePlaceholder}
        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-slate-100"
      />
    </div>

    {requiresEmail && (
      <>
        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">{emailLabel}</label>
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="email"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            placeholder={emailPlaceholder}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-slate-100"
          />
        </div>
      </>
    )}

    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">{passwordLabel}</label>
    <div className="relative">
      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
      <input
        type={showPassword ? 'text' : 'password'}
        value={password}
        onChange={(event) => onPasswordChange(event.target.value)}
        placeholder={passwordPlaceholder}
        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-11 pr-11 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-slate-100"
      />
      <button
        type="button"
        onClick={onTogglePassword}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
      >
        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>

    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">{confirmPasswordLabel}</label>
    <div className="relative">
      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
      <input
        type={showConfirmPassword ? 'text' : 'password'}
        value={confirmPassword}
        onChange={(event) => onConfirmPasswordChange(event.target.value)}
        placeholder={confirmPasswordPlaceholder}
        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-11 pr-11 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-slate-100"
      />
      <button
        type="button"
        onClick={onToggleConfirmPassword}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
      >
        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>

    {inlineError && <p className="text-sm text-rose-600 dark:text-rose-400">{inlineError}</p>}
    {showLoginAction && (
      <button
        type="button"
        onClick={onLoginInstead}
        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 hover:border-primary transition-all"
      >
        {loginInsteadLabel}
      </button>
    )}

    <button
      type="submit"
      disabled={isSubmitting}
      className="w-full bg-primary text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-60"
    >
      {isSubmitting ? <Loader2 size={16} className="animate-spin mx-auto" /> : submitLabel}
    </button>
  </form>
);
