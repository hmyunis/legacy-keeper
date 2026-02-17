import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { CheckCircle2, CircleX, Loader2 } from 'lucide-react';
import { useResendVerification, useVerifyEmail } from '../hooks/useAuth';
import { getApiErrorMessage } from '../services/httpError';
import { toast } from 'sonner';

type VerifyStatus = 'idle' | 'loading' | 'success' | 'error';

const VerifyEmail: React.FC = () => {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as {
    token?: string;
    email?: string;
    joinToken?: string;
    redirect?: string;
  };
  const verifyMutation = useVerifyEmail();
  const resendMutation = useResendVerification();
  const [status, setStatus] = useState<VerifyStatus>('idle');
  const [message, setMessage] = useState('Provide your verification token to activate your account.');
  const [tokenInput, setTokenInput] = useState((search.token || '').trim());
  const [emailInput, setEmailInput] = useState((search.email || '').trim());
  const autoVerifiedTokenRef = useRef<string | null>(null);
  const verifyAttemptIdRef = useRef(0);

  const joinToken = typeof search.joinToken === 'string' && search.joinToken.trim() ? search.joinToken : undefined;
  const redirectPath = typeof search.redirect === 'string' && search.redirect.startsWith('/') ? search.redirect : undefined;

  const verifyWithToken = async (token: string) => {
    const normalized = token.trim();
    if (!normalized) {
      setStatus('error');
      setMessage('Verification token is required.');
      return;
    }

    const attemptId = ++verifyAttemptIdRef.current;
    setStatus('loading');
    try {
      const data = await verifyMutation.mutateAsync({ token: normalized });
      if (verifyAttemptIdRef.current !== attemptId) {
        return;
      }
      setStatus('success');
      setMessage(data.message || 'Your email has been verified. You can now log in.');
    } catch (error) {
      if (verifyAttemptIdRef.current !== attemptId) {
        return;
      }
      setStatus('error');
      setMessage(getApiErrorMessage(error, 'Verification failed. The link may be invalid or expired.'));
    }
  };

  useEffect(() => {
    const token = (search.token || '').trim();
    setTokenInput(token);

    if (!token || autoVerifiedTokenRef.current === token) {
      return;
    }

    autoVerifiedTokenRef.current = token;
    void verifyWithToken(token);
  }, [search.token]);

  useEffect(() => {
    const email = (search.email || '').trim();
    if (!email) return;
    setEmailInput(email);
  }, [search.email]);

  const handleManualVerify = (event: React.FormEvent) => {
    event.preventDefault();
    void verifyWithToken(tokenInput);
  };

  const handleResend = () => {
    const email = emailInput.trim();
    if (!email) {
      toast.error('Email is required to resend verification.');
      return;
    }

    resendMutation.mutate(
      {
        email,
        ...(joinToken ? { joinToken } : {}),
      },
      {
        onSuccess: (data) => {
          setMessage(data.message || 'Verification email sent. Please check your inbox.');
          if (status !== 'success') {
            setStatus('idle');
          }
        },
      },
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl space-y-6">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-4">Email Verification</h1>

        <div className="flex items-start gap-3 text-sm">
          {status === 'loading' && <Loader2 className="animate-spin text-primary mt-0.5" size={20} />}
          {status === 'success' && <CheckCircle2 className="text-emerald-600 mt-0.5" size={20} />}
          {status === 'error' && <CircleX className="text-rose-600 mt-0.5" size={20} />}
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{message}</p>
        </div>

        {status !== 'success' && (
          <form onSubmit={handleManualVerify} className="space-y-3">
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Verification Token</label>
            <input
              type="text"
              value={tokenInput}
              onChange={(event) => setTokenInput(event.target.value)}
              placeholder="Paste verification token"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-slate-100"
            />
            <button
              type="submit"
              disabled={verifyMutation.isPending}
              className="w-full inline-flex items-center justify-center rounded-2xl bg-primary text-white px-5 py-3 text-xs font-black uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {verifyMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Verify Token'}
            </button>
          </form>
        )}

        {status !== 'success' && (
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Resend Verification Email</label>
            <input
              type="email"
              value={emailInput}
              onChange={(event) => setEmailInput(event.target.value)}
              placeholder="you@example.com"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-slate-100"
            />
            <button
              type="button"
              onClick={handleResend}
              disabled={resendMutation.isPending}
              className="w-full inline-flex items-center justify-center rounded-2xl border border-slate-300 dark:border-slate-700 px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-60"
            >
              {resendMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Resend Email'}
            </button>
          </div>
        )}

        <div className="mt-8 flex gap-3">
          <Link
            to="/login"
            search={
              {
                ...(joinToken ? { joinToken } : {}),
                ...(redirectPath ? { redirect: redirectPath } : {}),
              } as any
            }
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

export default VerifyEmail;
