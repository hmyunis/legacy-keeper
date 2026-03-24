import type { FC } from 'react';
import { Loader2 } from 'lucide-react';

interface VerifyResendFormProps {
  emailInput: string;
  isPending: boolean;
  labels: {
    title: string;
    emailPlaceholder: string;
    submit: string;
  };
  onEmailChange: (value: string) => void;
  onSubmit: () => void;
}

export const VerifyResendForm: FC<VerifyResendFormProps> = ({
  emailInput,
  isPending,
  labels,
  onEmailChange,
  onSubmit,
}) => (
  <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">{labels.title}</label>
    <input
      type="email"
      value={emailInput}
      onChange={(event) => onEmailChange(event.target.value)}
      placeholder={labels.emailPlaceholder}
      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-slate-100"
    />
    <button
      type="button"
      onClick={onSubmit}
      disabled={isPending}
      className="w-full inline-flex items-center justify-center rounded-2xl border border-slate-300 dark:border-slate-700 px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-60"
    >
      {isPending ? <Loader2 className="animate-spin" size={16} /> : labels.submit}
    </button>
  </div>
);
