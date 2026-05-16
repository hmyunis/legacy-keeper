import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouterState } from '@tanstack/react-router';
import { AuthLayout } from '../components/AuthLayout';
import { LoginForm } from '../components/LoginForm';
import { RegisterForm } from '../components/RegisterForm';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);

  const redirectTo = useRouterState({
    select: (s) => {
      const search = s.location.search as { redirect?: string };
      return search.redirect;
    },
  });

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
        {isLogin ? <LoginForm redirectTo={redirectTo} /> : <RegisterForm />}

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