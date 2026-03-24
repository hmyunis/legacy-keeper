import type { FC, FormEvent } from 'react';
import { Loader2 } from 'lucide-react';

interface VerifyTokenFormProps {
  tokenInput: string;
  isPending: boolean;
  labels: {
    tokenLabel: string;
    tokenPlaceholder: string;
    submit: string;
  };
  onSubmit: (event: FormEvent) => void;
  onTokenChange: (value: string) => void;
}

export const VerifyTokenForm: FC<VerifyTokenFormProps> = ({
  tokenInput,
  isPending,
  labels,
  onSubmit,
  onTokenChange,
}) => (
  <form onSubmit={onSubmit} className="space-y-3">
    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">{labels.tokenLabel}</label>
    <input
      type="text"
      value={tokenInput}
      onChange={(event) => onTokenChange(event.target.value)}
      placeholder={labels.tokenPlaceholder}
      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-slate-100"
    />
    <button
      type="submit"
      disabled={isPending}
      className="w-full inline-flex items-center justify-center rounded-2xl bg-primary text-white px-5 py-3 text-xs font-black uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-60"
    >
      {isPending ? <Loader2 className="animate-spin" size={16} /> : labels.submit}
    </button>
  </form>
);
