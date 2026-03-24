import type { FC, FormEvent } from 'react';
import { Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';

interface ResetPasswordFormProps {
  emailInput: string;
  tokenInput: string;
  newPassword: string;
  confirmPassword: string;
  showNewPassword: boolean;
  showConfirmPassword: boolean;
  isPending: boolean;
  labels: {
    email: string;
    resetToken: string;
    newPassword: string;
    confirmPassword: string;
    emailPlaceholder: string;
    pasteResetToken: string;
    enterNewPassword: string;
    confirmNewPassword: string;
    submit: string;
  };
  onSubmit: (event: FormEvent) => void;
  onEmailChange: (value: string) => void;
  onTokenChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onToggleNewPassword: () => void;
  onToggleConfirmPassword: () => void;
}

export const ResetPasswordForm: FC<ResetPasswordFormProps> = ({
  emailInput,
  tokenInput,
  newPassword,
  confirmPassword,
  showNewPassword,
  showConfirmPassword,
  isPending,
  labels,
  onSubmit,
  onEmailChange,
  onTokenChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onToggleNewPassword,
  onToggleConfirmPassword,
}) => (
  <form onSubmit={onSubmit} className="space-y-3">
    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">{labels.email}</label>
    <div className="relative">
      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
      <input
        type="email"
        value={emailInput}
        onChange={(event) => onEmailChange(event.target.value)}
        placeholder={labels.emailPlaceholder}
        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-slate-100"
      />
    </div>

    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">{labels.resetToken}</label>
    <input
      type="text"
      value={tokenInput}
      onChange={(event) => onTokenChange(event.target.value)}
      placeholder={labels.pasteResetToken}
      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-slate-100"
    />

    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">{labels.newPassword}</label>
    <div className="relative">
      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
      <input
        type={showNewPassword ? 'text' : 'password'}
        value={newPassword}
        onChange={(event) => onNewPasswordChange(event.target.value)}
        placeholder={labels.enterNewPassword}
        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-11 pr-11 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-slate-100"
      />
      <button
        type="button"
        onClick={onToggleNewPassword}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
      >
        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>

    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">{labels.confirmPassword}</label>
    <div className="relative">
      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
      <input
        type={showConfirmPassword ? 'text' : 'password'}
        value={confirmPassword}
        onChange={(event) => onConfirmPasswordChange(event.target.value)}
        placeholder={labels.confirmNewPassword}
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

    <button
      type="submit"
      disabled={isPending}
      className="w-full inline-flex items-center justify-center rounded-2xl bg-primary text-white px-5 py-3 text-xs font-black uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-60"
    >
      {isPending ? <Loader2 className="animate-spin" size={16} /> : labels.submit}
    </button>
  </form>
);
