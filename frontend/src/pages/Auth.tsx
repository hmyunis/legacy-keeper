import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeClosed, Spinner } from '@phosphor-icons/react';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Button } from '../components/ui/Button';
import { useAuthStore } from '../stores/authStore';
import { sileo } from 'sileo';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const redirectTo = useRouterState({
    select: (s) => {
      const search = s.location.search as { redirect?: string };
      return search.redirect;
    },
  });
  const login = useAuthStore((s) => s.login);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const authPromise = new Promise((resolve) => setTimeout(resolve, 1500));

    const p = new Promise((resolve) => setTimeout(resolve, 1500));

    sileo.promise(p, {
      loading: { title: isLogin ? "Accessing Vault..." : "Establishing Lineage..." },
      success: () => {
        login({
          user: { id: '1', fullName: 'Guest Curator', email: 'guest@legacykeeper.app', role: 'curator' },
          accessToken: 'demo-access',
          refreshToken: 'demo-refresh',
        });

        const destination = isLogin ? "/dashboard" : "/onboarding";
        void navigate({ to: destination });

        return {
          title: isLogin ? "Welcome Back" : "Welcome, Curator",
          description: "Your session is now cryptographically secured."
        };
      },
      error: { title: "Access Denied", description: "Invalid credentials provided." }
    });
  };

  return (
    <AuthLayout
      title={isLogin ? "VAULT ACCESS" : "ESTABLISH LINEAGE"}
      subtitle={isLogin ? '"Open the archives"' : '"Start your history"'}
    >
      <motion.div
        key={isLogin ? 'login' : 'signup'}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          {!isLogin && (
            <input
              type="text"
              placeholder="Full Name"
              className="w-full px-6 py-4 rounded-full bg-[rgba(0,0,0,0.3)] text-[var(--clr-linen)] font-ui text-[16px] placeholder-[var(--clr-fog)] outline-none border border-[rgba(184,143,91,0.3)] focus:border-[var(--clr-gold)] transition-all"
            />
          )}
          <input
            type="email"
            placeholder="Email Address"
            className="w-full px-6 py-4 rounded-full bg-[rgba(0,0,0,0.3)] text-[var(--clr-linen)] font-ui text-[16px] placeholder-[var(--clr-fog)] outline-none border border-[rgba(184,143,91,0.3)] focus:border-[var(--clr-gold)] transition-all"
          />
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              className="w-full px-6 py-4 rounded-full bg-[rgba(0,0,0,0.3)] text-[var(--clr-linen)] font-ui text-[16px] placeholder-[var(--clr-fog)] outline-none border border-[rgba(184,143,91,0.3)] focus:border-[var(--clr-gold)] transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--clr-fog)] hover:text-[var(--clr-gold)] transition-colors p-2"
            >
              {showPassword ? <EyeClosed size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {isLogin && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => navigate({ to: '/forgot-password' })}
                className="font-ui text-[11px] text-[var(--clr-gold)] hover:underline"
              >
                Forgot your key?
              </button>
            </div>
          )}

          <Button variant="primary" className="w-full mt-4" disabled={isLoading}>
            {isLoading ? <Spinner className="animate-spin" size={20} /> : (isLogin ? 'OPEN THE VAULT' : 'CREATE MY VAULT')}
          </Button>
        </form>

        <div className="text-center mt-8 font-ui text-[13px] text-[var(--clr-fog)]">
          {isLogin ? "New to LegacyKeeper? " : "Already have a vault? "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-[var(--clr-gold)] font-semibold hover:underline"
          >
            {isLogin ? "Create a Vault" : "Sign In"}
          </button>
        </div>
      </motion.div>
    </AuthLayout>
  );
}