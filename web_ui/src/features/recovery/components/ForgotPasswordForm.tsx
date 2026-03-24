import type { FC, FormEvent } from 'react';
import { Loader2, Mail } from 'lucide-react';

interface ForgotPasswordFormProps {
  email: string;
  isPending: boolean;
  labels: {
    email: string;
    emailPlaceholder: string;
    submit: string;
  };
  onSubmit: (event: FormEvent) => void;
  onEmailChange: (value: string) => void;
}

export const ForgotPasswordForm: FC<ForgotPasswordFormProps> = ({
  email,
  isPending,
  labels,
  onSubmit,
  onEmailChange,
}) => (
  <form onSubmit={onSubmit} className="space-y-3">
    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">{labels.email}</label>
    <div className="relative">
      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
      <input
        type="email"
        required
        value={email}
        onChange={(event) => onEmailChange(event.target.value)}
        placeholder={labels.emailPlaceholder}
        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-slate-100"
      />
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
