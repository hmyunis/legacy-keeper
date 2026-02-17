import React, { useState } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { ArrowLeft, Loader2, Mail } from 'lucide-react';
import { useForgotPassword } from '../hooks/useAuth';
import { getApiErrorMessage } from '../services/httpError';

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { email?: string };
  const forgotPasswordMutation = useForgotPassword();
  const [email, setEmail] = useState((search.email || '').trim());
  const [message, setMessage] = useState('Enter your account email to receive a password reset link.');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    forgotPasswordMutation.mutate(
      { email: email.trim() },
      {
        onSuccess: (response) => {
          setMessage(response.message || 'If an account exists for this email, a reset link has been sent.');
        },
        onError: (error) => {
          setMessage(getApiErrorMessage(error, 'Unable to send reset link. Please try again.'));
        },
      },
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl space-y-6">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Forgot Password</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{message}</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Email</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-slate-100"
            />
          </div>

          <button
            type="submit"
            disabled={forgotPasswordMutation.isPending}
            className="w-full inline-flex items-center justify-center rounded-2xl bg-primary text-white px-5 py-3 text-xs font-black uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {forgotPasswordMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Send Reset Link'}
          </button>
        </form>

        <div className="flex gap-3">
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 dark:border-slate-700 px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft size={14} />
            Back To Login
          </Link>
          <button
            type="button"
            onClick={() => navigate({ to: '/' })}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-300 dark:border-slate-700 px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Back To Landing
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
