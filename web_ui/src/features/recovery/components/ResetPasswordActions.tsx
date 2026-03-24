import type { FC } from 'react';
import { Link } from '@tanstack/react-router';

interface ResetPasswordActionsProps {
  loginLabel: string;
  backToLandingLabel: string;
  onBackToLanding: () => void;
}

export const ResetPasswordActions: FC<ResetPasswordActionsProps> = ({
  loginLabel,
  backToLandingLabel,
  onBackToLanding,
}) => (
  <div className="flex gap-3">
    <Link
      to="/login"
      className="inline-flex items-center justify-center rounded-2xl bg-primary text-white px-5 py-3 text-xs font-black uppercase tracking-widest hover:opacity-90 transition-opacity"
    >
      {loginLabel}
    </Link>
    <button
      type="button"
      onClick={onBackToLanding}
      className="inline-flex items-center justify-center rounded-2xl border border-slate-300 dark:border-slate-700 px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
    >
      {backToLandingLabel}
    </button>
  </div>
);
