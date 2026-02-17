import React, { useEffect, useState } from 'react';
import { CheckCircle2, CircleX, Eye, EyeOff, Loader2, Lock, Mail, User } from 'lucide-react';
import { AxiosError } from 'axios';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useAcceptJoinInvite, useJoinInvitePreview, useJoinVault } from '../hooks/useMembers';
import { mapApiUserToUser } from '../services/authApi';
import { getApiErrorMessage } from '../services/httpError';
import { useAuthStore } from '../stores/authStore';
import { UserRole } from '../types';

const JoinVault: React.FC = () => {
  const { token } = useParams({ strict: false }) as { token?: string };
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
  const missingToken = !token;
  const isPreviewLoading = !missingToken && previewQuery.isPending;
  const previewError = missingToken
    ? 'The invitation token is missing from this link.'
    : previewQuery.isError
      ? getApiErrorMessage(previewQuery.error, 'Unable to validate this invitation link.')
      : null;

  const isAccountExistsPath = !!preview?.accountExists || !!preview?.alreadyMember;
  const showRegistrationForm = !missingToken && !isPreviewLoading && !previewError && !!preview && !isAuthenticated && !isAccountExistsPath;
  const showLoginPath = !missingToken && !isPreviewLoading && !previewError && !!preview && !isAuthenticated && isAccountExistsPath;
  const showAuthenticatedJoinStatus = !missingToken && !!preview && isAuthenticated;
  const isSuccess = acceptInviteMutation.isSuccess || joinExistingMutation.isSuccess;
  const authenticatedJoinError =
    !isSuccess && showAuthenticatedJoinStatus && joinExistingMutation.isError
      ? getApiErrorMessage(joinExistingMutation.error, 'Unable to process this invitation for your account.')
      : null;
  const joinedRole = acceptInviteMutation.data?.role || joinExistingMutation.data?.role || preview?.role || null;
  const joinedVaultName = acceptInviteMutation.data?.vaultName || joinExistingMutation.data?.vaultName || preview?.vaultName || null;

  useEffect(() => {
    if (!preview?.inviteEmail) {
      return;
    }
    setEmail(preview.inviteEmail);
  }, [preview?.inviteEmail]);

  useEffect(() => {
    if (
      !token ||
      !isAuthenticated ||
      !preview ||
      previewQuery.isPending ||
      isAccountExistsPath ||
      acceptInviteMutation.isSuccess ||
      acceptInviteMutation.isPending
    ) {
      return;
    }

    if (joinExistingMutation.status === 'idle') {
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
    }
  }, [
    isAuthenticated,
    isAccountExistsPath,
    acceptInviteMutation.isPending,
    acceptInviteMutation.isSuccess,
    joinExistingMutation,
    preview,
    previewQuery.isPending,
    setActiveVault,
    token,
    updateUser,
  ]);

  const extractErrorCode = (error: unknown) => {
    if (!(error instanceof AxiosError)) {
      return undefined;
    }
    return typeof error.response?.data?.code === 'string' ? error.response?.data?.code : undefined;
  };

  const handleAcceptInvite = (event: React.FormEvent) => {
    event.preventDefault();
    setInlineError(null);
    setShowLoginAction(false);

    if (!token) {
      setInlineError('Invitation token is missing.');
      return;
    }
    if (!fullName.trim()) {
      setInlineError('Full name is required.');
      return;
    }
    if (preview?.requiresEmail && !email.trim()) {
      setInlineError('Email is required for this invite.');
      return;
    }
    if (password.length < 6) {
      setInlineError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setInlineError('Passwords do not match.');
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
          const errorCode = extractErrorCode(error);
          if (errorCode === 'ACCOUNT_EXISTS') {
            setInlineError('An account already exists for this invite email. Please log in to continue.');
            setShowLoginAction(true);
            return;
          }
          if (errorCode === 'ALREADY_MEMBER') {
            setInlineError('This email is already a member of this vault. Log in to continue.');
            setShowLoginAction(true);
            return;
          }
          setInlineError(getApiErrorMessage(error, 'Unable to complete invitation.'));
        },
      },
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-8 space-y-5">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Join Family Vault</h1>

        {(isPreviewLoading || (showAuthenticatedJoinStatus && joinExistingMutation.isPending)) && (
          <div className="flex items-start gap-3 text-slate-600 dark:text-slate-300">
            <Loader2 size={20} className="animate-spin mt-0.5" />
            <p className="text-sm font-medium">
              {isAuthenticated ? 'Processing your invitation...' : 'Validating invitation link...'}
            </p>
          </div>
        )}

        {isSuccess && (
          <div className="flex items-start gap-3 text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 size={20} className="mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {acceptInviteMutation.data?.message || joinExistingMutation.data?.message || 'You have joined the vault.'}
              </p>
              {joinedVaultName && <p className="text-xs opacity-80">Vault: {joinedVaultName}</p>}
            </div>
          </div>
        )}

        {previewError && (
          <div className="flex items-start gap-3 text-rose-700 dark:text-rose-400">
            <CircleX size={20} className="mt-0.5" />
            <p className="text-sm font-medium">{previewError}</p>
          </div>
        )}

        {authenticatedJoinError && (
          <div className="flex items-start gap-3 text-rose-700 dark:text-rose-400">
            <CircleX size={20} className="mt-0.5" />
            <p className="text-sm font-medium">{authenticatedJoinError}</p>
          </div>
        )}

        {preview && !previewError && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-4 space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Invited Vault</p>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{preview.vaultName}</p>
            <p className="text-xs text-slate-500 dark:text-slate-300">Role: {preview.role}</p>
            {preview.inviteEmail && (
              <p className="text-xs text-slate-500 dark:text-slate-300">Invite Email: {preview.inviteEmail}</p>
            )}
          </div>
        )}

        {showRegistrationForm && (
          <form onSubmit={handleAcceptInvite} className="space-y-3">
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Full Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Your full name"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-slate-100"
              />
            </div>

            {preview?.requiresEmail && (
              <>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-slate-100"
                  />
                </div>
              </>
            )}

            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Create password"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-11 pr-11 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm password"
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

            {inlineError && <p className="text-sm text-rose-600 dark:text-rose-400">{inlineError}</p>}
            {showLoginAction && (
              <button
                type="button"
                onClick={() =>
                  navigate({
                    to: '/login',
                    search: { joinToken: token!, redirect: `/join/${token}` } as Record<string, string>,
                  })
                }
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 hover:border-primary transition-all"
              >
                Log In Instead
              </button>
            )}

            <button
              type="submit"
              disabled={acceptInviteMutation.isPending}
              className="w-full bg-primary text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-60"
            >
              {acceptInviteMutation.isPending ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Join Vault'}
            </button>
          </form>
        )}

        {showLoginPath && (
          <div className="space-y-3">
            <div className="flex items-start gap-3 text-amber-700 dark:text-amber-400">
              <CircleX size={20} className="mt-0.5" />
              <p className="text-sm font-medium">
                An account already exists for this invite. Log in with your invited email to join this vault.
              </p>
            </div>
            <button
              onClick={() =>
                navigate({
                  to: '/login',
                  search: { joinToken: token!, redirect: `/join/${token}` } as Record<string, string>,
                })
              }
              className="w-full bg-primary text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all"
            >
              Go To Login
            </button>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          {isSuccess ? (
            <>
              <button
                onClick={() => navigate({ to: '/vault' })}
                className="flex-1 bg-primary text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all"
              >
                Open Vault
              </button>
              {joinedRole === UserRole.ADMIN ? (
                <button
                  onClick={() => navigate({ to: '/members' })}
                  className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 hover:border-primary transition-all"
                >
                  Manage Members
                </button>
              ) : (
                <button
                  onClick={() => navigate({ to: '/' })}
                  className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 hover:border-primary transition-all"
                >
                  Go Back
                </button>
              )}
            </>
          ) : (
            <button
              onClick={() => navigate({ to: '/' })}
              className="flex-1 bg-primary text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all"
            >
              Go Back
            </button>
          )}
          {(previewError || authenticatedJoinError) && !missingToken && (
            <button
              onClick={() => {
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
                previewQuery.refetch();
              }}
              className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 hover:border-primary transition-all"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default JoinVault;
