import React, { useEffect, useMemo, useState } from 'react';
import { Mail, Lock, User, ArrowRight, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate, useLocation, Link, useSearch } from '@tanstack/react-router';
import { AxiosError } from 'axios';
import GoogleSignInButton from '../components/auth/GoogleSignInButton';
import { useLogin, useRegister, useGoogleLogin } from '../hooks/useAuth';
import { useAuthStore } from '../stores/authStore';
import { appEnv, isGoogleOAuthEnabled } from '../services/env';

const Auth: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const search = useSearch({ strict: false }) as { joinToken?: string; redirect?: string };
  const joinToken = typeof search.joinToken === 'string' && search.joinToken.trim() ? search.joinToken : undefined;
  const redirectPath = typeof search.redirect === 'string' && search.redirect.startsWith('/') ? search.redirect : undefined;

  const [mode, setMode] = useState<'login' | 'signup'>(location.pathname === '/signup' ? 'signup' : 'login');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
  });

  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const googleLoginMutation = useGoogleLogin();

  const isLoading = useMemo(
    () => loginMutation.isPending || registerMutation.isPending || googleLoginMutation.isPending,
    [googleLoginMutation.isPending, loginMutation.isPending, registerMutation.isPending]
  );

  const isEmailNotVerifiedError = (error: unknown) => {
    if (!(error instanceof AxiosError)) return false;

    const data: any = error.response?.data || {};
    const code = String(data?.code || '').toUpperCase();
    if (code === 'EMAIL_NOT_VERIFIED') return true;

    const detail = typeof data?.detail === 'string' ? data.detail.toLowerCase() : '';
    const message = typeof data?.message === 'string' ? data.message.toLowerCase() : '';
    const errorText = typeof data?.error === 'string' ? data.error.toLowerCase() : '';

    return (
      detail.includes('not verified') ||
      message.includes('not verified') ||
      errorText.includes('not verified')
    );
  };

  const redirectAfterAuth = () => {
    if (joinToken) {
      navigate({ to: '/join/$token', params: { token: joinToken } } as any);
      return;
    }
    if (redirectPath) {
      const [path, query] = redirectPath.split('?');
      const parsedSearch = query ? Object.fromEntries(new URLSearchParams(query).entries()) : undefined;
      navigate({ to: path as any, search: parsedSearch as any });
      return;
    }
    navigate({ to: '/dashboard' });
  };

  useEffect(() => {
    setMode(location.pathname === '/signup' ? 'signup' : 'login');
  }, [location.pathname]);

  useEffect(() => {
    if (isAuthenticated) {
      redirectAfterAuth();
    }
  }, [isAuthenticated, joinToken, navigate]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (mode === 'login') {
      loginMutation.mutate(
        { email: formData.email, password: formData.password },
        {
          onSuccess: () => redirectAfterAuth(),
          onError: (error) => {
            if (!isEmailNotVerifiedError(error)) return;

            navigate(
              {
                to: '/verify',
                search: {
                  email: formData.email,
                  ...(joinToken ? { joinToken } : {}),
                  ...(redirectPath ? { redirect: redirectPath } : {}),
                },
              } as any,
            );
          },
        }
      );
      return;
    }

    registerMutation.mutate(
      {
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        ...(joinToken ? { joinToken } : {}),
      },
      {
        onSuccess: () => {
          setMode('login');
          navigate(
            {
              to: '/verify',
              search: {
                email: formData.email,
                ...(joinToken ? { joinToken } : {}),
                ...(redirectPath ? { redirect: redirectPath } : {}),
              },
            } as any
          );
        },
      }
    );
  };

  const handleGoogleCredential = (idToken: string) => {
    googleLoginMutation.mutate({ idToken }, { onSuccess: () => redirectAfterAuth() });
  };

  const handleGoogleError = (message: string) => {
    toast.error('Google sign-in unavailable.', { description: message });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col lg:flex-row transition-colors duration-500 overflow-x-hidden">
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-16 bg-primary text-white relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.1)_0%,transparent_50%)]" />
        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-3 mb-16 transition-opacity hover:opacity-80">
            <div className="w-12 h-12 bg-white text-primary rounded-2xl flex items-center justify-center font-black text-2xl shadow-2xl">L</div>
            <span className="font-bold text-2xl tracking-tighter">LegacyKeeper</span>
          </Link>
          <div className="max-w-md space-y-6">
            <h1 className="text-6xl font-black leading-tight tracking-tighter">Safeguard your family&apos;s future today.</h1>
            <p className="text-white/90 text-lg leading-relaxed italic opacity-80 border-l-4 border-white/30 pl-6">
              Keep your family's precious memories safe and secure. Sign in to access your private digital vault.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center p-6 sm:p-12 lg:p-20 relative overflow-y-auto min-h-screen lg:min-h-0">
        <div className="max-w-md w-full mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700 py-10 lg:py-0">
          <Link to="/" className="lg:hidden flex items-center gap-3 mb-4 transition-opacity hover:opacity-80">
            <div className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center font-black shadow-lg">L</div>
            <span className="font-bold text-xl text-slate-900 dark:text-white tracking-tighter">LegacyKeeper</span>
          </Link>

          <div className="space-y-2">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
              {mode === 'login' ? 'Welcome back' : 'Create an Account'}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm sm:text-base">
              {mode === 'login'
                ? "Sign in to your family's digital heritage."
                : 'Create an account, then verify your email to activate your vault.'}
            </p>
          </div>

          <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => {
                setMode('login');
                navigate(
                  {
                    to: '/login',
                    search: {
                      ...(joinToken ? { joinToken } : {}),
                      ...(redirectPath ? { redirect: redirectPath } : {}),
                    },
                  } as any
                );
              }}
              className={`flex-1 py-3 text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-xl transition-all ${
                mode === 'login' ? 'bg-white dark:bg-slate-800 text-primary shadow-md' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => {
                setMode('signup');
                navigate(
                  {
                    to: '/signup',
                    search: {
                      ...(joinToken ? { joinToken } : {}),
                      ...(redirectPath ? { redirect: redirectPath } : {}),
                    },
                  } as any
                );
              }}
              className={`flex-1 py-3 text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-xl transition-all ${
                mode === 'signup' ? 'bg-white dark:bg-slate-800 text-primary shadow-md' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
            {mode === 'signup' && (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Full Name</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
                  <input
                    type="text"
                    required={mode === 'signup'}
                    value={formData.fullName}
                    onChange={(event) => setFormData((prev) => ({ ...prev, fullName: event.target.value }))}
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
                  onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
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
                  onChange={(event) => setFormData((prev) => ({ ...prev, password: event.target.value }))}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all dark:text-white shadow-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
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

          {isGoogleOAuthEnabled && (
            <div className="space-y-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200 dark:border-slate-800" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-400 bg-slate-50 dark:bg-slate-950 px-2 tracking-widest">Or continue with</div>
              </div>
              <GoogleSignInButton
                clientId={appEnv.googleClientId}
                onCredential={handleGoogleCredential}
                onError={handleGoogleError}
              />
            </div>
          )}

          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-full text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-widest">
              <ShieldCheck size={14} /> Secure & Protected
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
