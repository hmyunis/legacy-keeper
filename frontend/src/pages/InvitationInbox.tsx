import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Vault, Users, CheckCircle, XCircle, ArrowRight } from '@phosphor-icons/react';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { Button } from '../components/ui/Button';
import { useAuthStore } from '../stores/authStore';
import { useGovernanceActions } from '../features/governance/hooks/useGovernance';
import axiosClient from '../services/axiosClient';
import { getAccessibleVaults, getPostInvitationRoute } from '../lib/authRouting';
import { parseRouteTarget } from '../lib/deepLinks';
import { sileo } from 'sileo';

export default function InvitationInbox() {
  const navigate = useNavigate();
  const redirectTo = useRouterState({
    select: (s) => {
      const search = s.location.search as { redirect?: string };
      return search.redirect;
    },
  });
  const { currentUser, accessToken, refreshToken, login } = useAuthStore();
  const { respondToInvitation } = useGovernanceActions();
  const [busyInvitationId, setBusyInvitationId] = useState<string | null>(null);

  const pendingInvitations = currentUser?.pendingInvitations || [];
  const pendingOnly = pendingInvitations.filter((invitation) => invitation.status === 'PENDING');
  const accessibleVaults = getAccessibleVaults(currentUser);

  const refreshProfile = async () => {
    if (!accessToken || !refreshToken) return currentUser;
    const res = await axiosClient.get('/auth/profile/');
    login({
      user: res.data,
      accessToken,
      refreshToken,
    });
    return res.data;
  };

  useEffect(() => {
    if (!currentUser?.is_verified) return;

    if (pendingOnly.length === 0) {
      const nextRoute = getPostInvitationRoute(currentUser, redirectTo);
      if (nextRoute !== '/invitation-inbox') {
        const target = parseRouteTarget(nextRoute);
        void navigate({ to: target.to as any, search: target.search as any });
      }
    }
  }, [currentUser, navigate, pendingOnly.length, redirectTo]);

  const handleInvitationAction = async (invitation: any, action: 'ACCEPT' | 'REJECT') => {
    setBusyInvitationId(invitation.id);
    try {
      await sileo.promise(
        respondToInvitation.mutateAsync({
          vaultId: invitation.vaultId,
          invitationId: invitation.id,
          action,
        }),
        {
          loading: { title: action === 'ACCEPT' ? 'Accepting Invitation...' : 'Rejecting Invitation...' },
          success: action === 'ACCEPT'
            ? { title: 'Invitation Accepted', description: `Access granted to ${invitation.vaultName}.` }
            : { title: 'Invitation Rejected', description: 'The inviter can see this response.' },
          error: (err: any) => ({
            title: 'Could Not Update Invitation',
            description: err?.response?.data?.error || 'Please try again.',
          }),
        }
      );

      const refreshed = await refreshProfile();
      const remainingInvites = (refreshed?.pendingInvitations || []).filter((inv: any) => inv.status === 'PENDING');
      const refreshedVaults = getAccessibleVaults(refreshed as any);

      if (remainingInvites.length > 0) {
        return;
      }

      const nextRoute = getPostInvitationRoute(refreshed as any, redirectTo);
      if (nextRoute !== '/invitation-inbox') {
        const target = parseRouteTarget(nextRoute);
        void navigate({ to: target.to as any, search: target.search as any });
      } else if (refreshedVaults.length === 0) {
        void navigate({ to: '/onboarding' });
      }
    } catch (err) {
      console.error(err);
      sileo.error({ title: 'Action Failed', description: 'Please refresh and try again.' });
    } finally {
      setBusyInvitationId(null);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[radial-gradient(circle_at_top,#2d251f_0%,#151110_40%,#090706_100%)] text-[var(--clr-linen)] flex items-center justify-center px-6 py-12">
      <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')]" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-5xl"
      >
        <div className="text-center mb-10 space-y-4">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full border border-[rgba(184,143,91,0.35)] bg-[rgba(20,18,17,0.85)] shadow-[0_0_40px_rgba(184,143,91,0.18)]">
            <Vault size={30} weight="fill" className="text-[var(--clr-gold)]" />
          </div>
          <h1 className="font-display text-[clamp(2.2rem,4vw,4rem)] uppercase tracking-[0.22em]">Invitation Inbox</h1>
          <p className="font-ui text-[13px] text-[var(--clr-fog)] uppercase tracking-[0.18em]">
            Review the vaults that have invited this account.
          </p>
        </div>

        {pendingOnly.length > 0 ? (
          <div className="space-y-4">
            {pendingOnly.map((invitation: any, index: number) => (
              <motion.div
                key={invitation.id}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.07, duration: 0.35 }}
                className="rounded-[28px] border border-[rgba(184,143,91,0.22)] bg-[rgba(255,255,255,0.05)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)]"
              >
                <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[rgba(184,143,91,0.22)] bg-black/25 text-[var(--clr-gold)]">
                        <Users size={22} weight="fill" />
                      </div>
                      <div>
                        <h2 className="font-display text-[1.4rem] uppercase tracking-[0.14em]">{invitation.vaultName}</h2>
                        <p className="font-ui text-[11px] uppercase tracking-[0.18em] text-[var(--clr-fog)]">
                          Invited as {invitation.role}
                        </p>
                      </div>
                    </div>
                    {invitation.invitedByName && (
                      <p className="font-ui text-[12px] text-[var(--clr-fog)] mt-3">
                        Invited by {invitation.invitedByName}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="primary"
                      onClick={() => handleInvitationAction(invitation, 'ACCEPT')}
                      disabled={busyInvitationId === invitation.id}
                    >
                      <CheckCircle size={18} /> ACCEPT
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => handleInvitationAction(invitation, 'REJECT')}
                      disabled={busyInvitationId === invitation.id}
                    >
                      <XCircle size={18} /> REJECT
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="rounded-[28px] border border-[rgba(184,143,91,0.22)] bg-[rgba(255,255,255,0.05)] p-8 text-center">
            <XCircle size={56} className="mx-auto text-[var(--clr-fog)] mb-4" />
            <h2 className="font-display text-2xl uppercase tracking-widest">No Pending Invitations</h2>
            <p className="font-ui text-sm text-[var(--clr-fog)] mt-3">
              {accessibleVaults.length > 0
                ? 'You have already cleared all invitations.'
                : 'You can join a vault or create your own archive from onboarding.'}
            </p>
            <div className="mt-6 flex justify-center gap-3 flex-wrap">
              <Button variant="primary" onClick={() => navigate({ to: '/onboarding' })}>
                GO TO ONBOARDING <ArrowRight size={16} />
              </Button>
              {accessibleVaults.length > 0 && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    const target = parseRouteTarget(getPostInvitationRoute(currentUser, redirectTo));
                    void navigate({ to: target.to as any, search: target.search as any });
                  }}
                >
                  CONTINUE
                </Button>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
