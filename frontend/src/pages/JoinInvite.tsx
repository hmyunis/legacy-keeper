import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, SealWarning, Spinner, UsersThree, Vault } from '@phosphor-icons/react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { Button } from '../components/ui/Button';
import { useInviteLink, useGovernanceActions } from '../features/governance/hooks/useGovernance';
import { useAuthStore } from '../stores/authStore';
import axiosClient from '../services/axiosClient';
import { sileo } from 'sileo';

function formatLimit(invite: any) {
  if (!invite?.maxUses) return 'Unlimited joins';
  return `${invite.usesCount || 0} of ${invite.maxUses} used`;
}

function formatExpiry(invite: any) {
  if (!invite?.expiresAt) return 'No expiry date';
  return `Expires ${new Date(invite.expiresAt).toLocaleString()}`;
}

function statusCopy(status?: string) {
  if (status === 'ACTIVE') return 'Ready to join';
  if (status === 'FULL') return 'This invite link has reached its join limit.';
  if (status === 'EXPIRED') return 'This invite link has expired.';
  if (status === 'REVOKED') return 'This invite link has been revoked.';
  if (status === 'DELETED') return 'This invite link has been deleted.';
  return 'This invite link is unavailable.';
}

export default function JoinInvite() {
  const { token } = useParams({ strict: false });
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { data: invite, isLoading, isError } = useInviteLink(token);
  const { claimInviteLink } = useGovernanceActions();
  const { isAuthenticated, currentUser, accessToken, refreshToken, login, setActiveVaultId } = useAuthStore();

  const redirectPath = useMemo(() => `/join/${token || ''}`, [token]);
  const canClaim = invite?.status === 'ACTIVE' && isAuthenticated && currentUser?.is_verified;

  const refreshProfile = async (preferredVaultId?: string) => {
    if (!accessToken || !refreshToken) return;
    setIsRefreshing(true);
    const res = await axiosClient.get('/auth/profile/');
    login({
      user: res.data,
      accessToken,
      refreshToken,
      activeVaultId: preferredVaultId,
    });
    if (preferredVaultId) {
      setActiveVaultId(preferredVaultId);
    }
    setIsRefreshing(false);
  };

  const handleClaim = async () => {
    if (!token) return;

    const result = await sileo.promise(claimInviteLink.mutateAsync(token), {
      loading: { title: 'Joining Vault...' },
      success: (res: any) => ({
        title: res?.status === 'ALREADY_MEMBER' ? 'Already Connected' : 'Vault Joined',
        description: res?.vaultName ? `Access ready for ${res.vaultName}.` : 'Access ready.',
      }),
      error: (err: any) => ({
        title: 'Could Not Join',
        description: err?.response?.data?.error || 'This invite link cannot be used.',
      }),
    });

    await refreshProfile(result?.vaultId);
    void navigate({ to: '/dashboard' });
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[radial-gradient(circle_at_top,#2d251f_0%,#151110_42%,#090706_100%)] text-[var(--clr-linen)] flex items-center justify-center px-6 py-12">
      <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')]" />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-2xl rounded-[32px] border border-[rgba(184,143,91,0.35)] bg-[rgba(20,18,17,0.86)] p-8 shadow-[0_30px_100px_rgba(0,0,0,0.45)] backdrop-blur-md md:p-12"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 inline-flex h-16 w-16 items-center justify-center rounded-full border border-[rgba(184,143,91,0.35)] bg-[rgba(184,143,91,0.12)]">
            <UsersThree size={30} weight="fill" className="text-[var(--clr-gold)]" />
          </div>
          <p className="font-ui text-[11px] font-black uppercase tracking-[0.24em] text-[var(--clr-gold)]">Kin Invite</p>
          <h1 className="mt-3 font-display text-[clamp(2rem,5vw,3.5rem)] uppercase tracking-[0.16em]">
            Join a Vault
          </h1>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-14 text-[var(--clr-gold)]">
            <Spinner size={28} className="animate-spin" />
          </div>
        )}

        {(isError || !invite) && !isLoading && (
          <div className="rounded-3xl border border-[rgba(139,58,58,0.4)] bg-[rgba(139,58,58,0.12)] p-6 text-center">
            <SealWarning size={42} className="mx-auto mb-3 text-[var(--clr-danger)]" />
            <p className="font-ui text-sm text-[var(--clr-fog)]">This invite link could not be found.</p>
          </div>
        )}

        {invite && !isLoading && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-[rgba(184,143,91,0.22)] bg-[rgba(255,255,255,0.05)] p-6">
              <div className="mb-4 flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[rgba(184,143,91,0.16)] text-[var(--clr-gold)]">
                  <Vault size={24} weight="fill" />
                </div>
                <div>
                  <p className="font-display text-2xl uppercase tracking-widest text-[var(--clr-linen)]">{invite.vaultName}</p>
                  <p className="font-ui text-[12px] uppercase tracking-[0.18em] text-[var(--clr-fog)]">
                    Role: {invite.role} · {statusCopy(invite.status)}
                  </p>
                </div>
              </div>
              <div className="grid gap-3 font-ui text-[12px] uppercase tracking-[0.14em] text-[var(--clr-fog)] md:grid-cols-2">
                <span className="rounded-2xl bg-black/20 px-4 py-3">{formatLimit(invite)}</span>
                <span className="rounded-2xl bg-black/20 px-4 py-3">{formatExpiry(invite)}</span>
              </div>
            </div>

            {!isAuthenticated && (
              <Button
                variant="primary"
                className="w-full"
                onClick={() => navigate({ to: '/auth', search: { redirect: redirectPath } as any })}
              >
                SIGN IN OR CREATE ACCOUNT <ArrowRight size={18} weight="bold" />
              </Button>
            )}

            {isAuthenticated && !currentUser?.is_verified && (
              <Button
                variant="primary"
                className="w-full"
                onClick={() => navigate({ to: '/verify-email', search: { redirect: redirectPath } as any })}
              >
                VERIFY EMAIL TO JOIN <ArrowRight size={18} weight="bold" />
              </Button>
            )}

            {isAuthenticated && currentUser?.is_verified && invite.status !== 'ACTIVE' && (
              <Button variant="ghost" className="w-full" onClick={() => navigate({ to: '/dashboard' })}>
                RETURN TO DASHBOARD
              </Button>
            )}

            {canClaim && (
              <Button
                variant="primary"
                className="w-full"
                onClick={handleClaim}
                disabled={claimInviteLink.isPending || isRefreshing}
              >
                {claimInviteLink.isPending || isRefreshing ? 'JOINING...' : 'JOIN THIS VAULT'}
              </Button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
