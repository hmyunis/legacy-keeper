import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { toast } from 'sonner';
import { VerifyEmailActions } from '@/features/recovery/components/VerifyEmailActions';
import { VerifyResendForm } from '@/features/recovery/components/VerifyResendForm';
import { VerifyTokenForm } from '@/features/recovery/components/VerifyTokenForm';
import { RecoveryStatusMessage } from '@/features/recovery/components/RecoveryStatusMessage';
import { buildVerifyLoginSearch, resolveVerifySearch, validateRecoveryEmail } from '@/features/recovery/selectors';
import type { RecoveryStatus } from '@/features/recovery/types';
import { useResendVerification, useVerifyEmail } from '@/hooks/useAuth';
import { useTranslation } from '@/i18n/LanguageContext';
import { getApiErrorMessage } from '@/services/httpError';

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
  const { t } = useTranslation();
  const initialSearch = resolveVerifySearch(search);

  const [status, setStatus] = useState<RecoveryStatus>('idle');
  const [message, setMessage] = useState(t.common.recovery.verifyEmailIntro);
  const [tokenInput, setTokenInput] = useState(initialSearch.token);
  const [emailInput, setEmailInput] = useState(initialSearch.email);
  const autoVerifiedTokenRef = useRef<string | null>(null);
  const verifyAttemptIdRef = useRef(0);

  const verifySearch = resolveVerifySearch(search);
  const loginSearch = buildVerifyLoginSearch({
    joinToken: verifySearch.joinToken,
    redirectPath: verifySearch.redirectPath,
  });

  const verifyWithToken = async (token: string) => {
    const normalized = token.trim();
    if (!normalized) {
      setStatus('error');
      setMessage(t.common.recovery.verificationTokenRequired);
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
      setMessage(data.message || t.common.recovery.verificationSuccess);
    } catch (error) {
      if (verifyAttemptIdRef.current !== attemptId) {
        return;
      }
      setStatus('error');
      setMessage(getApiErrorMessage(error, t.common.recovery.verificationError));
    }
  };

  useEffect(() => {
    const token = resolveVerifySearch(search).token;
    setTokenInput(token);

    if (!token || autoVerifiedTokenRef.current === token) {
      return;
    }

    autoVerifiedTokenRef.current = token;
    void verifyWithToken(token);
  }, [search.token]);

  useEffect(() => {
    const email = resolveVerifySearch(search).email;
    if (!email) return;
    setEmailInput(email);
  }, [search.email]);

  const handleManualVerify = (event: React.FormEvent) => {
    event.preventDefault();
    void verifyWithToken(tokenInput);
  };

  const handleResend = () => {
    const email = emailInput.trim();
    const validationError = validateRecoveryEmail({
      email,
      requiredMessage: t.common.recovery.resendVerificationEmailRequired,
    });
    if (validationError) {
      toast.error(validationError);
      return;
    }

    resendMutation.mutate(
      {
        email,
        ...(verifySearch.joinToken ? { joinToken: verifySearch.joinToken } : {}),
      },
      {
        onSuccess: (data) => {
          setMessage(data.message || t.common.recovery.verificationEmailSent);
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
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-4">{t.common.recovery.verifyEmailTitle}</h1>

        <RecoveryStatusMessage
          status={status}
          message={message}
        />

        {status !== 'success' && (
          <VerifyTokenForm
            tokenInput={tokenInput}
            isPending={verifyMutation.isPending}
            labels={{
              tokenLabel: t.common.recovery.verificationToken,
              tokenPlaceholder: t.common.recovery.verificationToken,
              submit: t.common.recovery.verifyTokenAction,
            }}
            onSubmit={handleManualVerify}
            onTokenChange={setTokenInput}
          />
        )}

        {status !== 'success' && (
          <VerifyResendForm
            emailInput={emailInput}
            isPending={resendMutation.isPending}
            labels={{
              title: t.common.recovery.resendVerificationEmail,
              emailPlaceholder: t.common.auth.emailPlaceholder,
              submit: t.common.recovery.resendEmailAction,
            }}
            onEmailChange={setEmailInput}
            onSubmit={handleResend}
          />
        )}

        <VerifyEmailActions
          loginLabel={t.common.auth.goToLogin}
          backToLandingLabel={t.common.auth.backToLanding}
          loginSearch={loginSearch}
          onBackToLanding={() => navigate({ to: '/' })}
        />
      </div>
    </div>
  );
};

export default VerifyEmail;
