import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { ResetPasswordActions } from '@/features/recovery/components/ResetPasswordActions';
import { ResetPasswordForm } from '@/features/recovery/components/ResetPasswordForm';
import { RecoveryStatusMessage } from '@/features/recovery/components/RecoveryStatusMessage';
import { resolveResetSearch, validateResetSubmission } from '@/features/recovery/selectors';
import type { RecoveryStatus } from '@/features/recovery/types';
import { useResetPassword } from '@/hooks/useAuth';
import { useTranslation } from '@/i18n/LanguageContext';
import { getApiErrorMessage } from '@/services/httpError';

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { token?: string; email?: string };
  const resetPasswordMutation = useResetPassword();
  const { t } = useTranslation();
  const initialSearch = resolveResetSearch(search);

  const [status, setStatus] = useState<RecoveryStatus>('idle');
  const [message, setMessage] = useState(t.common.recovery.resetPasswordIntro);
  const [emailInput, setEmailInput] = useState(initialSearch.email);
  const [tokenInput, setTokenInput] = useState(initialSearch.token);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const resetAttemptIdRef = useRef(0);

  useEffect(() => {
    const nextSearch = resolveResetSearch(search);
    if (nextSearch.email) {
      setEmailInput(nextSearch.email);
    }
  }, [search.email]);

  useEffect(() => {
    const nextSearch = resolveResetSearch(search);
    if (nextSearch.token) {
      setTokenInput(nextSearch.token);
    }
  }, [search.token]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const email = emailInput.trim();
    const token = tokenInput.trim();
    const validationError = validateResetSubmission({
      email,
      token,
      newPassword,
      confirmPassword,
      messages: {
        emailAndTokenRequired: t.common.recovery.emailAndTokenRequired,
        newPasswordRequired: t.common.recovery.newPasswordRequired,
        passwordsDoNotMatch: t.common.recovery.passwordsDoNotMatch,
      },
    });

    if (validationError) {
      setStatus('error');
      setMessage(validationError);
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
      setMessage(response.message || t.common.recovery.resetPasswordSuccess);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      if (resetAttemptIdRef.current !== attemptId) {
        return;
      }
      setStatus('error');
      setMessage(getApiErrorMessage(error, t.common.recovery.resetPasswordError));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl space-y-6">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">{t.common.recovery.resetPasswordTitle}</h1>

        <RecoveryStatusMessage
          status={status}
          message={message}
        />

        {status !== 'success' && (
          <ResetPasswordForm
            emailInput={emailInput}
            tokenInput={tokenInput}
            newPassword={newPassword}
            confirmPassword={confirmPassword}
            showNewPassword={showNewPassword}
            showConfirmPassword={showConfirmPassword}
            isPending={resetPasswordMutation.isPending}
            labels={{
              email: t.common.auth.email,
              resetToken: t.common.recovery.resetToken,
              newPassword: t.common.recovery.newPassword,
              confirmPassword: t.common.auth.confirmPassword,
              emailPlaceholder: t.common.auth.emailPlaceholder,
              pasteResetToken: t.common.recovery.pasteResetToken,
              enterNewPassword: t.common.recovery.enterNewPassword,
              confirmNewPassword: t.common.recovery.confirmNewPassword,
              submit: t.common.recovery.resetPasswordAction,
            }}
            onSubmit={handleSubmit}
            onEmailChange={setEmailInput}
            onTokenChange={setTokenInput}
            onNewPasswordChange={setNewPassword}
            onConfirmPasswordChange={setConfirmPassword}
            onToggleNewPassword={() => setShowNewPassword((prev) => !prev)}
            onToggleConfirmPassword={() => setShowConfirmPassword((prev) => !prev)}
          />
        )}

        <ResetPasswordActions
          loginLabel={t.common.auth.goToLogin}
          backToLandingLabel={t.common.auth.backToLanding}
          onBackToLanding={() => navigate({ to: '/' })}
        />
      </div>
    </div>
  );
};

export default ResetPassword;
