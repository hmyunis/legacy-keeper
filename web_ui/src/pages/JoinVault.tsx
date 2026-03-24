import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { JoinVaultActionBar } from '@/features/join-vault/components/JoinVaultActionBar';
import { JoinVaultLoginPathCard } from '@/features/join-vault/components/JoinVaultLoginPathCard';
import { JoinVaultPreviewCard } from '@/features/join-vault/components/JoinVaultPreviewCard';
import { JoinVaultRegistrationForm } from '@/features/join-vault/components/JoinVaultRegistrationForm';
import { JoinVaultStatusMessages } from '@/features/join-vault/components/JoinVaultStatusMessages';
import {
  buildJoinLoginSearch,
  extractJoinErrorCode,
  getJoinedInvitationContext,
  getJoinViewState,
  shouldAutoAcceptJoinInvite,
} from '@/features/join-vault/selectors';
import { useAcceptJoinInvite, useJoinInvitePreview, useJoinVault } from '@/hooks/useMembers';
import { useTranslation } from '@/i18n/LanguageContext';
import { mapApiUserToUser } from '@/services/authApi';
import { getApiErrorMessage } from '@/services/httpError';
import { useAuthStore } from '@/stores/authStore';
import { UserRole } from '@/types';

const JoinVault: React.FC = () => {
  const { token } = useParams({ strict: false }) as { token?: string };
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, setActiveVault, updateUser, login } = useAuthStore();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [showLoginAction, setShowLoginAction] = useState(false);

  const previewQuery = useJoinInvitePreview(token);
  const acceptInviteMutation = useAcceptJoinInvite();
  const joinExistingMutation = useJoinVault();

  const preview = previewQuery.data;
  const previewError = !token
    ? t.common.join.invitationTokenMissingLink
    : previewQuery.isError
      ? getApiErrorMessage(previewQuery.error, t.common.join.invitationValidationError)
      : null;
  const isAccountExistsPath = !!preview?.accountExists || !!preview?.alreadyMember;
  const { missingToken, isPreviewLoading, showRegistrationForm, showLoginPath, showAuthenticatedJoinStatus } =
    getJoinViewState({
      token,
      hasPreview: Boolean(preview),
      isPreviewPending: previewQuery.isPending,
      hasPreviewError: Boolean(previewError),
      isAuthenticated,
      isAccountExistsPath,
    });
  const isSuccess = acceptInviteMutation.isSuccess || joinExistingMutation.isSuccess;
  const authenticatedJoinError =
    !isSuccess && showAuthenticatedJoinStatus && joinExistingMutation.isError
      ? getApiErrorMessage(joinExistingMutation.error, t.common.join.invitationProcessError)
      : null;
  const joinedInvitationContext = getJoinedInvitationContext({
    accepted: acceptInviteMutation.data,
    joined: joinExistingMutation.data,
    preview,
  });
  const joinedRole = joinedInvitationContext.role;
  const joinedVaultName = joinedInvitationContext.vaultName;

  useEffect(() => {
    if (!preview?.inviteEmail) {
      return;
    }
    setEmail(preview.inviteEmail);
  }, [preview?.inviteEmail]);

  useEffect(() => {
    if (
      !shouldAutoAcceptJoinInvite({
        token,
        isAuthenticated,
        hasPreview: Boolean(preview),
        isPreviewPending: previewQuery.isPending,
        isAccountExistsPath,
        isAcceptSuccess: acceptInviteMutation.isSuccess,
        isAcceptPending: acceptInviteMutation.isPending,
        joinStatus: joinExistingMutation.status,
      })
    ) {
      return;
    }

    joinExistingMutation.mutate(token!, {
      onSuccess: (response) => {
        const joinedVaultId = response.vaultId ? String(response.vaultId) : null;
        if (joinedVaultId) {
          setActiveVault(joinedVaultId);
        }
        if (response.role) {
          updateUser({ role: response.role });
        }
      },
    });
  }, [
    acceptInviteMutation.isPending,
    acceptInviteMutation.isSuccess,
    isAccountExistsPath,
    isAuthenticated,
    joinExistingMutation,
    preview,
    previewQuery.isPending,
    setActiveVault,
    token,
    updateUser,
  ]);

  const handleAcceptInvite = (event: React.FormEvent) => {
    event.preventDefault();
    setInlineError(null);
    setShowLoginAction(false);

    if (!token) {
      setInlineError(t.common.join.invitationTokenMissing);
      return;
    }
    if (!fullName.trim()) {
      setInlineError(t.common.join.fullNameRequired);
      return;
    }
    if (preview?.requiresEmail && !email.trim()) {
      setInlineError(t.common.join.inviteEmailRequired);
      return;
    }
    if (password.length < 6) {
      setInlineError(t.common.join.passwordMinLength);
      return;
    }
    if (password !== confirmPassword) {
      setInlineError(t.common.recovery.passwordsDoNotMatch);
      return;
    }

    acceptInviteMutation.mutate(
      {
        token,
        fullName: fullName.trim(),
        password,
        confirmPassword,
        ...(preview?.requiresEmail ? { email: email.trim() } : {}),
      },
      {
        onSuccess: (response) => {
          setInlineError(null);
          setShowLoginAction(false);
          const mappedUser = mapApiUserToUser(response.user);
          const activeVaultId = response.vaultId ? String(response.vaultId) : null;
          login({
            user: mappedUser,
            accessToken: response.access,
            refreshToken: response.refresh,
            activeVaultId,
          });
          if (response.role) {
            updateUser({ role: response.role });
          }
          setPassword('');
          setConfirmPassword('');
        },
        onError: (error) => {
          const errorCode = extractJoinErrorCode(error);
          if (errorCode === 'ACCOUNT_EXISTS') {
            setInlineError(t.common.join.accountExistsForInvite);
            setShowLoginAction(true);
            return;
          }
          if (errorCode === 'ALREADY_MEMBER') {
            setInlineError(t.common.join.alreadyMemberInvite);
            setShowLoginAction(true);
            return;
          }
          setInlineError(getApiErrorMessage(error, t.common.join.inviteCompleteError));
        },
      },
    );
  };

  const navigateToLoginForJoin = () => {
    if (!token) return;
    navigate({
      to: '/login',
      search: buildJoinLoginSearch(token),
    } as any);
  };

  const handleRetry = () => {
    if (authenticatedJoinError && token) {
      joinExistingMutation.reset();
      joinExistingMutation.mutate(token, {
        onSuccess: (response) => {
          const joinedVaultId = response.vaultId ? String(response.vaultId) : null;
          if (joinedVaultId) {
            setActiveVault(joinedVaultId);
          }
          if (response.role) {
            updateUser({ role: response.role });
          }
        },
      });
      return;
    }

    void previewQuery.refetch();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-8 space-y-5">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{t.common.join.title}</h1>

        <JoinVaultStatusMessages
          isLoading={isPreviewLoading || (showAuthenticatedJoinStatus && joinExistingMutation.isPending)}
          isAuthenticated={isAuthenticated}
          isSuccess={isSuccess}
          successMessage={
            acceptInviteMutation.data?.message ||
            joinExistingMutation.data?.message ||
            t.common.join.joinedVaultSuccess
          }
          joinedVaultName={joinedVaultName}
          previewError={previewError}
          authenticatedJoinError={authenticatedJoinError}
          validatingInvitationLabel={t.common.join.validatingInvitation}
          processingInvitationLabel={t.common.join.processingInvitation}
          vaultLabel="Vault"
        />

        {preview && !previewError && (
          <JoinVaultPreviewCard
            preview={preview}
            invitedVaultLabel={t.common.join.invitedVault}
            roleLabel={t.common.join.role}
            inviteEmailLabel={t.common.join.inviteEmail}
          />
        )}

        {showRegistrationForm && (
          <JoinVaultRegistrationForm
            fullName={fullName}
            email={email}
            password={password}
            confirmPassword={confirmPassword}
            requiresEmail={Boolean(preview?.requiresEmail)}
            showPassword={showPassword}
            showConfirmPassword={showConfirmPassword}
            inlineError={inlineError}
            showLoginAction={showLoginAction}
            isSubmitting={acceptInviteMutation.isPending}
            fullNameLabel={t.common.auth.fullName}
            emailLabel={t.common.auth.email}
            passwordLabel={t.common.auth.password}
            confirmPasswordLabel={t.common.auth.confirmPassword}
            fullNamePlaceholder={t.common.join.yourFullName}
            emailPlaceholder={t.common.auth.emailPlaceholder}
            passwordPlaceholder={t.common.join.createPassword}
            confirmPasswordPlaceholder={t.common.join.confirmPassword}
            loginInsteadLabel={t.common.join.logInInstead}
            submitLabel={t.common.join.joinVault}
            onSubmit={handleAcceptInvite}
            onFullNameChange={setFullName}
            onEmailChange={setEmail}
            onPasswordChange={setPassword}
            onConfirmPasswordChange={setConfirmPassword}
            onTogglePassword={() => setShowPassword((prev) => !prev)}
            onToggleConfirmPassword={() => setShowConfirmPassword((prev) => !prev)}
            onLoginInstead={navigateToLoginForJoin}
          />
        )}

        {showLoginPath && (
          <JoinVaultLoginPathCard
            message={t.common.join.accountExistsPrompt}
            actionLabel={t.common.auth.goToLogin}
            onAction={navigateToLoginForJoin}
          />
        )}

        <JoinVaultActionBar
          isSuccess={isSuccess}
          isAdmin={joinedRole === UserRole.ADMIN}
          canRetry={Boolean((previewError || authenticatedJoinError) && !missingToken)}
          openVaultLabel={t.common.join.openVault}
          manageMembersLabel={t.common.join.manageMembers}
          goBackLabel={t.common.auth.goBack}
          retryLabel={t.common.auth.retry}
          onOpenVault={() => navigate({ to: '/vault' })}
          onManageMembers={() => navigate({ to: '/members' })}
          onGoBack={() => navigate({ to: '/' })}
          onRetry={handleRetry}
        />
      </div>
    </div>
  );
};

export default JoinVault;
