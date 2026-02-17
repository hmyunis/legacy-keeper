import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { CheckCircle2, CircleX, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';
import { useResetPassword } from '../hooks/useAuth';
import { getApiErrorMessage } from '../services/httpError';

type ResetStatus = 'idle' | 'loading' | 'success' | 'error';

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { token?: string; email?: string };
  const resetPasswordMutation = useResetPassword();
  const [status, setStatus] = useState<ResetStatus>('idle');
  const [message, setMessage] = useState('Set a new password for your account.');
  const [emailInput, setEmailInput] = useState((search.email || '').trim());
  const [tokenInput, setTokenInput] = useState((search.token || '').trim());
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const resetAttemptIdRef = useRef(0);

  useEffect(() => {
    const email = (search.email || '').trim();
    if (email) {
      setEmailInput(email);
    }
  }, [search.email]);

  useEffect(() => {
    const token = (search.token || '').trim();
    if (token) {
      setTokenInput(token);
    }
  }, [search.token]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const email = emailInput.trim();
    const token = tokenInput.trim();
    if (!email || !token) {
      setStatus('error');
      setMessage('Email and reset token are required.');
      return;
    }

    if (!newPassword.trim()) {
      setStatus('error');
      setMessage('New password is required.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatus('error');
      setMessage('Passwords do not match.');
      return;
    }

    const attemptId = ++resetAttemptIdRef.current;
    setStatus('loading');
    try {
      const response = await resetPasswordMutation.mutateAsync({
        email,
        token,
        newPassword: newPassword.trim(),
      });
      if (resetAttemptIdRef.current !== attemptId) {
        return;
      }
      setStatus('success');
      setMessage(response.message || 'Password reset successful. You can now log in.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      if (resetAttemptIdRef.current !== attemptId) {
        return;
      }
      setStatus('error');
      setMessage(getApiErrorMessage(error, 'Unable to reset password. The link may be invalid or expired.'));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl space-y-6">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Reset Password</h1>

        <div className="flex items-start gap-3 text-sm">
          {status === 'loading' && <Loader2 className="animate-spin text-primary mt-0.5" size={20} />}
          {status === 'success' && <CheckCircle2 className="text-emerald-600 mt-0.5" size={20} />}
          {status === 'error' && <CircleX className="text-rose-600 mt-0.5" size={20} />}
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{message}</p>
        </div>

        {status !== 'success' && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="email"
                value={emailInput}
                onChange={(event) => setEmailInput(event.target.value)}
                placeholder="you@example.com"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-slate-100"
              />
            </div>

            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Reset Token</label>
            <input
              type="text"
              value={tokenInput}
              onChange={(event) => setTokenInput(event.target.value)}
              placeholder="Paste reset token"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-slate-100"
            />

            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">New Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Enter new password"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-11 pr-11 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((prev) => !prev)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm new password"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-11 pr-11 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <button
              type="submit"
              disabled={resetPasswordMutation.isPending}
              className="w-full inline-flex items-center justify-center rounded-2xl bg-primary text-white px-5 py-3 text-xs font-black uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {resetPasswordMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Reset Password'}
            </button>
          </form>
        )}

        <div className="flex gap-3">
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-2xl bg-primary text-white px-5 py-3 text-xs font-black uppercase tracking-widest hover:opacity-90 transition-opacity"
          >
            Go To Login
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

export default ResetPassword;
