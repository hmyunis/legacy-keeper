import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeClosed, Spinner } from '@phosphor-icons/react';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Button } from '../components/ui/Button';
import { useAuthStore } from '../stores/authStore';
import { sileo } from 'sileo';
import { useLogin, useRegister } from '../features/auth/hooks/useAuth';
import { getPostAuthRoute } from '../lib/authRouting';
import { parseRouteTarget } from '../lib/deepLinks';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const navigate = useNavigate();
  const redirectTo = useRouterState({
    select: (s) => {
      const search = s.location.search as { redirect?: string };
      return search.redirect;
    },
  });
  
  const login = useAuthStore((s) => s.login);
  const loginMutation = useLogin();
  const registerMutation = useRegister();
  
  const isLoading = loginMutation.isPending || registerMutation.isPending;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (isLogin) {
      sileo.promise(loginMutation.mutateAsync({ email, password }), {
        loading: { title: "Accessing Vault..." },
        success: (data) => {
          login({
            user: data.user,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
          });
          const destination = getPostAuthRoute(data.user as any, redirectTo);
          if ((destination === '/vault-select' || destination === '/invitation-inbox') && redirectTo) {
            void navigate({ to: destination as any, search: { redirect: redirectTo } as any });
            return { title: "Welcome Back", description: "Your session is now cryptographically secured." };
          }

          const resolvedDestination = parseRouteTarget(destination);
          void navigate({ to: resolvedDestination.to as any, search: resolvedDestination.search as any });
          return { title: "Welcome Back", description: "Your session is now cryptographically secured." };
        },
        error: { title: "Access Denied", description: "Invalid credentials provided." }
      });
    } else {
      sileo.promise(registerMutation.mutateAsync({ email, password, fullName }), {
        loading: { title: "Establishing Lineage..." },
        success: (data) => {
          login({
            user: data.user,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
          });
          void navigate({ to: '/verify-email' });
          return { title: "Welcome, Curator", description: "Your account is created. Please verify your email." };
        },
        error: { title: "Registration Failed", description: "Email may already be in use." }
      });
    }
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
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
              className="w-full px-6 py-4 rounded-full bg-[rgba(0,0,0,0.3)] text-[var(--clr-linen)] font-ui text-[16px] placeholder-[var(--clr-fog)] outline-none border border-[rgba(184,143,91,0.3)] focus:border-[var(--clr-gold)] transition-all"
            />
          )}
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full px-6 py-4 rounded-full bg-[rgba(0,0,0,0.3)] text-[var(--clr-linen)] font-ui text-[16px] placeholder-[var(--clr-fog)] outline-none border border-[rgba(184,143,91,0.3)] focus:border-[var(--clr-gold)] transition-all"
          />
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
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
