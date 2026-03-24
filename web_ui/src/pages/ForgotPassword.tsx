import React, { useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { ForgotPasswordActions } from '@/features/recovery/components/ForgotPasswordActions';
import { ForgotPasswordForm } from '@/features/recovery/components/ForgotPasswordForm';
import { resolveRecoveryEmail } from '@/features/recovery/selectors';
import { useForgotPassword } from '@/hooks/useAuth';
import { useTranslation } from '@/i18n/LanguageContext';
import { getApiErrorMessage } from '@/services/httpError';

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { email?: string };
  const forgotPasswordMutation = useForgotPassword();
  const { t } = useTranslation();
  const [email, setEmail] = useState(resolveRecoveryEmail(search.email));
  const [message, setMessage] = useState(t.common.recovery.forgotPasswordIntro);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    forgotPasswordMutation.mutate(
      { email: email.trim() },
      {
        onSuccess: (response) => {
          setMessage(response.message || t.common.recovery.forgotPasswordSuccess);
        },
        onError: (error) => {
          setMessage(getApiErrorMessage(error, t.common.recovery.forgotPasswordError));
        },
      },
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl space-y-6">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{t.common.recovery.forgotPasswordTitle}</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{message}</p>

        <ForgotPasswordForm
          email={email}
          isPending={forgotPasswordMutation.isPending}
          labels={{
            email: t.common.auth.email,
            emailPlaceholder: t.common.auth.emailPlaceholder,
            submit: t.common.recovery.sendResetLink,
          }}
          onSubmit={handleSubmit}
          onEmailChange={setEmail}
        />

        <ForgotPasswordActions
          backToLoginLabel={t.common.auth.backToLogin}
          backToLandingLabel={t.common.auth.backToLanding}
          onBackToLanding={() => navigate({ to: '/' })}
        />
      </div>
    </div>
  );
};

export default ForgotPassword;
