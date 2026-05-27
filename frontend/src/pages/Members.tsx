import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UsersThree, UserPlus, LinkBreak, ShieldCheck, ArrowsMerge, LinkSimple, ShareNetwork, Trash, X } from '@phosphor-icons/react';
import { sileo } from 'sileo';
import { Button } from '../components/ui/Button';
import { PlatformSelect } from '../components/ui/Select';
import { useMembers, useInvitations, useInviteLinks, usePacts, usePactHistory, useGovernanceActions } from '../features/governance/hooks/useGovernance';
import { useAuthStore } from '../stores/authStore';

export default function Members() {
  const [showInvite, setShowInvite] = useState(false);
  const [showInviteLink, setShowInviteLink] = useState(false);
  const [showPactModal, setShowPactModal] = useState(false);
  const [showUnlinkModal, setShowUnlinkModal] = useState(false);
  const [inviteRole, setInviteRole] = useState('VIEWER');
  const [inviteLinkRole, setInviteLinkRole] = useState('VIEWER');
  const [inviteLinkMaxUses, setInviteLinkMaxUses] = useState('');
  const [inviteLinkExpiresAt, setInviteLinkExpiresAt] = useState('');
  const [pactError, setPactError] = useState<string | null>(null);
  const [selectedUnlinkPact, setSelectedUnlinkPact] = useState<any | null>(null);
  const currentUser = useAuthStore((s) => s.currentUser);
  const activeVaultId = useAuthStore((s) => s.activeVaultId);
  const canAdmin = currentUser?.role === 'ADMIN';

  const { data: members = [] } = useMembers();
  const { data: invitations = [] } = useInvitations(canAdmin);
  const { data: inviteLinks = [] } = useInviteLinks(canAdmin);
  const { data: allPacts = [], isLoading: isLoadingPacts } = usePacts();
  const { data: pactHistory = [] } = usePactHistory();
  const { inviteMember, removeMember, requestPact, actOnPact, revokeInvitation, createInviteLink, revokeInviteLink, deleteInviteLink } = useGovernanceActions();

  const incomingPacts = allPacts.filter((p: any) => p.is_incoming);
  const outgoingPacts = allPacts.filter((p: any) => !p.is_incoming);
  const invitationGroups = {
    PENDING: invitations.filter((invite: any) => invite.status === 'PENDING'),
    ACCEPTED: invitations.filter((invite: any) => invite.status === 'ACCEPTED'),
    REJECTED: invitations.filter((invite: any) => invite.status === 'REJECTED'),
    REVOKED: invitations.filter((invite: any) => invite.status === 'REVOKED'),
  };

  useEffect(() => {
    if (!showPactModal) {
      setPactError(null);
    }
  }, [showPactModal]);

  const buildInviteLinkUrl = (token: string) => `${window.location.origin}/join/${token}`;

  const getInviteLinkStatus = (link: any) => {
    if (link.isDeleted || link.deletedAt) return 'DELETED';
    if (link.isRevoked || link.revokedAt) return 'REVOKED';
    if (link.isExpired) return 'EXPIRED';
    if (link.maxUses && link.usesCount >= link.maxUses) return 'FULL';
    return 'ACTIVE';
  };

  const handleShareInviteLink = async (link: any) => {
    const url = buildInviteLinkUrl(link.token);
    const shareData = {
      title: 'LegacyKeeper vault invite',
      text: `Join ${link.vaultName || 'my vault'} on LegacyKeeper.`,
      url,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        sileo.success({ title: 'Link Copied', description: 'Invite link copied to clipboard.' });
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(url);
          sileo.success({ title: 'Link Copied', description: 'Sharing was unavailable, so the link was copied.' });
        } catch {
          sileo.error({ title: 'Share Failed', description: 'Could not open sharing options.' });
        }
      }
    }
  };

  const handleInviteLinkSubmit = async (e: any) => {
    e.preventDefault();
    const maxUses = inviteLinkMaxUses ? Number(inviteLinkMaxUses) : undefined;
    const expiresAt = inviteLinkExpiresAt ? new Date(inviteLinkExpiresAt).toISOString() : undefined;

    await sileo.promise(createInviteLink.mutateAsync({
      role: inviteLinkRole,
      maxUses,
      expiresAt,
    }), {
      loading: { title: 'Generating Link...' },
      success: () => {
        setShowInviteLink(false);
        setInviteLinkMaxUses('');
        setInviteLinkExpiresAt('');
        return { title: 'Invite Link Ready', description: 'Use the Share button when you want to send it.' };
      },
      error: (err: any) => ({
        title: 'Failed to Create Link',
        description: err?.response?.data?.error || 'Could not generate invite link.',
      }),
    });
  };

  const handlePactResponse = async (pactId: string, action: 'ACCEPT' | 'REJECT', mode: 'incoming' | 'outgoing') => {
    await sileo.promise(actOnPact.mutateAsync({ pactId, action }), {
      loading: { title: action === 'ACCEPT' ? "Accepting Pact..." : "Updating Pact..." },
      success: action === 'ACCEPT'
        ? { title: "Pact Accepted", description: "Lineages are now connected." }
        : mode === 'incoming'
          ? { title: "Pact Declined" }
          : { title: "Pact Revoked" },
      error: (err: any) => ({
        title: "Failed to Update Pact",
        description: err?.response?.data?.error || "Could not process the pact request."
      })
    });
  };

  const openUnlinkDialog = (pact: any) => {
    setSelectedUnlinkPact(pact);
    setShowUnlinkModal(true);
  };

  const closeUnlinkDialog = () => {
    setShowUnlinkModal(false);
    setSelectedUnlinkPact(null);
  };

  const handleConfirmUnlink = async () => {
    if (!selectedUnlinkPact) return;

    const counterpartName = selectedUnlinkPact.is_incoming ? selectedUnlinkPact.requester_name : selectedUnlinkPact.target_vault_name;
    const isRequestingApproval = selectedUnlinkPact.status === 'UNLINK_PENDING' && selectedUnlinkPact.unlink_requested_by_vault_id !== activeVaultId;

    await sileo.promise(actOnPact.mutateAsync({ pactId: selectedUnlinkPact.id, action: 'UNLINK' }), {
      loading: { title: isRequestingApproval ? 'Approving Unlink...' : 'Requesting Unlink...' },
      success: (res: any) => res?.status === 'UNLINKED'
        ? { title: 'Pact Unlinked', description: `Connection removed with ${counterpartName}.` }
        : { title: 'Unlink Requested', description: `The other vault admin must approve removal with ${counterpartName}.` },
      error: (err: any) => ({
        title: 'Failed to Unlink',
        description: err?.response?.data?.error || 'Could not remove the lineage connection.',
      }),
    });

    closeUnlinkDialog();
  };

  const handleInviteSubmit = async (e: any) => {
    e.preventDefault();
    const email = (e.target.email.value || '').trim().toLowerCase();
    const role = inviteRole;

    await sileo.promise(inviteMember.mutateAsync({ email, role }), {
      loading: { title: "Dispatching..." },
      success: () => {
        setShowInvite(false);
        return { title: "Invitation Sent", description: `Registry keys sent to ${email}.` };
      },
      error: (err: any) => ({
        title: "Failed to Invite",
        description: err?.response?.data?.error || "Could not dispatch invitation."
      })
    });
  };

  const handlePactRequest = async (e: any) => {
    e.preventDefault();
    const email = (e.target.email.value || '').trim().toLowerCase();
    setPactError(null);

    try {
      const res = await sileo.promise(requestPact.mutateAsync({ email }), {
        loading: { title: "Requesting Federation..." },
        success: (successRes: any) => {
          setShowPactModal(false);
          if (successRes?.status === 'INVITATION_SENT') {
            return { title: "Curator Invited", description: "They need to become a vault admin before pacting." };
          }
          return { title: "Pact Dispatched", description: "Lineage connection requested." };
        },
        error: (err: any) => ({
          title: "Request Failed",
          description: err?.response?.data?.error || "Could not dispatch pact request."
        })
      });

      return res;
    } catch (err: any) {
      setPactError(err?.response?.data?.error || "Could not dispatch pact request.");
    }
  };

  const handleRemoveMember = (id: string, name: string) => {
    sileo.promise(removeMember.mutateAsync(id), {
      loading: { title: "Revoking Access..." },
      success: { title: "Access Revoked", description: `Keys disabled for ${name}.` },
      error: { title: "Error", description: "Cannot remove vault admin." }
    });
  };

  const handleRevokeInvite = (invitationId: string, email: string) => {
    sileo.promise(revokeInvitation.mutateAsync(invitationId), {
      loading: { title: "Revoking Invitation..." },
      success: { title: "Invitation Revoked", description: `Invite cancelled for ${email}.` },
      error: { title: "Failed to Revoke" }
    });
  };

  const handleRevokeInviteLink = (link: any) => {
    sileo.promise(revokeInviteLink.mutateAsync(link.id), {
      loading: { title: 'Revoking Link...' },
      success: { title: 'Invite Link Revoked', description: 'This link can no longer be used.' },
      error: { title: 'Failed to Revoke Link' },
    });
  };

  const handleDeleteInviteLink = (link: any) => {
    sileo.promise(deleteInviteLink.mutateAsync(link.id), {
      loading: { title: 'Deleting Link...' },
      success: { title: 'Invite Link Deleted', description: 'The link was removed from governance.' },
      error: { title: 'Failed to Delete Link' },
    });
  };

  return (
    <div className="min-h-screen zone-light py-16 px-[clamp(24px,5vw,80px)]">
      <div className="max-w-[1000px] mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-end gap-6 mb-16">
          <div>
            <div className="flex items-center gap-3 text-[var(--clr-gold)] mb-2 font-display uppercase tracking-[0.2em] text-sm">
              <UsersThree size={24} weight="fill" /> Family Circle
            </div>
            <h1 className="font-display text-[2.5rem] text-[var(--clr-ink)] uppercase">Vault Governance</h1>
          </div>
          <div className="flex gap-3">
            {canAdmin && (
              <Button variant="ghost" onClick={() => setShowPactModal(true)}><ArrowsMerge size={18} /> LINEAGE PACT</Button>
            )}
            {canAdmin && (
              <Button variant="primary" onClick={() => setShowInvite(true)}><UserPlus size={18} weight="bold" /> INVITE KIN</Button>
            )}
          </div>
        </header>

        {invitations.length > 0 && (
          <div className="mb-8 p-6 bg-[var(--clr-paper)] border border-[var(--clr-aged)] rounded-2xl">
            <h4 className="font-ui text-[10px] font-black text-[var(--clr-dust)] mb-4 uppercase tracking-[0.2em]">Invitations</h4>
            <div className="space-y-4">
              {(['PENDING', 'ACCEPTED', 'REJECTED', 'REVOKED'] as const).map((status) => {
                const items = invitationGroups[status];
                if (items.length === 0) return null;
                return (
                  <div key={status} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-ui text-[10px] font-black text-[var(--clr-dust)] uppercase tracking-[0.2em]">{status}</p>
                      <span className="font-ui text-[10px] font-black text-[var(--clr-gold-dark)] uppercase tracking-widest">{items.length}</span>
                    </div>
                    <div className="space-y-2">
                      {items.map((invite: any) => (
                        <div key={invite.id} className="flex justify-between items-center bg-white/50 p-4 rounded-xl gap-4">
                          <div>
                            <p className="font-ui text-sm text-[var(--clr-ink)]"><strong>{invite.email}</strong></p>
                            <p className="font-ui text-[11px] text-[var(--clr-dust)] uppercase tracking-widest">{invite.role} · {invite.vaultName || 'Vault'}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-ui text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border bg-[var(--clr-paper)] text-[var(--clr-dust)] border-[var(--clr-aged)]">
                              {invite.status}
                            </span>
                            {canAdmin && invite.status === 'PENDING' && (
                              <button
                                onClick={() => handleRevokeInvite(invite.id, invite.email)}
                                className="text-[10px] font-bold text-[var(--clr-danger)] uppercase hover:underline"
                              >
                                Revoke
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {canAdmin && (
          <section className="mb-8 p-6 bg-[var(--clr-paper)] border border-[var(--clr-aged)] rounded-2xl">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
              <div>
                <h4 className="font-ui text-[10px] font-black text-[var(--clr-dust)] uppercase tracking-[0.2em]">Invite Links</h4>
                <p className="mt-1 font-ui text-[12px] text-[var(--clr-dust)]">Bulk-add kin with optional usage and expiry controls.</p>
              </div>
              <Button variant="ghost" className="py-2 px-4 text-[10px]" onClick={() => setShowInviteLink(true)}>
                <LinkSimple size={16} /> Generate Link
              </Button>
            </div>

            {inviteLinks.length === 0 ? (
              <p className="font-ui text-sm text-[var(--clr-dust)]">No invite links have been generated yet.</p>
            ) : (
              <div className="space-y-3">
                {inviteLinks.map((link: any) => {
                  const status = getInviteLinkStatus(link);
                  const url = buildInviteLinkUrl(link.token);
                  return (
                    <div key={link.id} className="bg-white/50 p-4 rounded-xl">
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className={`font-ui text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${status === 'ACTIVE' ? 'bg-[var(--clr-gold-muted)] text-[var(--clr-gold-dark)] border-[var(--clr-gold)]' : 'bg-[var(--clr-paper)] text-[var(--clr-dust)] border-[var(--clr-aged)]'}`}>
                              {status}
                            </span>
                            <span className="font-ui text-[10px] font-black text-[var(--clr-dust)] uppercase tracking-widest">{link.role}</span>
                          </div>
                          <p className="truncate font-ui text-[12px] text-[var(--clr-ink)]">{url}</p>
                          <p className="mt-1 font-ui text-[11px] text-[var(--clr-dust)] uppercase tracking-widest">
                            Uses: {link.usesCount || 0}{link.maxUses ? ` / ${link.maxUses}` : ' / unlimited'} · {link.expiresAt ? `Expires ${new Date(link.expiresAt).toLocaleString()}` : 'No expiry'}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button variant="ghost" className="py-2 px-4 text-[10px]" onClick={() => handleShareInviteLink(link)}>
                            <ShareNetwork size={16} /> Share
                          </Button>
                          {status === 'ACTIVE' && (
                            <Button variant="danger" className="py-2 px-4 text-[10px]" onClick={() => handleRevokeInviteLink(link)}>
                              <X size={16} /> Revoke
                            </Button>
                          )}
                          <Button variant="danger" className="py-2 px-4 text-[10px]" onClick={() => handleDeleteInviteLink(link)}>
                            <Trash size={16} /> Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        <section className="mb-12 p-6 bg-[var(--clr-paper)] border border-[var(--clr-aged)] rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-ui text-[10px] font-black text-[var(--clr-dust)] uppercase tracking-[0.2em]">Lineage Pacts</h4>
            <span className="font-ui text-[10px] font-black text-[var(--clr-gold-dark)] uppercase tracking-widest">
              {incomingPacts.length + outgoingPacts.length} Pending
            </span>
          </div>

          {isLoadingPacts && (
            <p className="font-ui text-sm text-[var(--clr-dust)]">Loading pact requests...</p>
          )}

          {!isLoadingPacts && incomingPacts.length === 0 && outgoingPacts.length === 0 && (
            <p className="font-ui text-sm text-[var(--clr-dust)]">No pending lineage pacts.</p>
          )}

          {incomingPacts.length > 0 && (
            <div className="space-y-3 mb-4">
              {incomingPacts.map((p: any) => (
                <div key={p.id} className="flex justify-between items-center bg-[var(--clr-gold-muted)] border border-[var(--clr-gold)] p-4 rounded-xl">
                  <p className="font-ui text-sm text-[var(--clr-ink)]">Request to merge trees from <strong>{p.requester_name}</strong></p>
                  {canAdmin && (
                    <div className="flex gap-2">
                      <Button variant="primary" className="py-2 px-4 text-[10px]" onClick={() => handlePactResponse(p.id, 'ACCEPT', 'incoming')}>ACCEPT</Button>
                      <Button variant="ghost" className="py-2 px-4 text-[10px]" onClick={() => handlePactResponse(p.id, 'REJECT', 'incoming')}>DECLINE</Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {outgoingPacts.length > 0 && (
            <div className="space-y-2">
              {outgoingPacts.map((p: any) => (
                <div key={p.id} className="flex justify-between items-center opacity-90 bg-white/50 p-4 rounded-xl">
                  <p className="font-ui text-sm text-[var(--clr-ink)]">Request sent to <strong>{p.target_vault_name}</strong></p>
                  {canAdmin && (
                    <button
                      onClick={() => handlePactResponse(p.id, 'REJECT', 'outgoing')}
                      className="text-[10px] font-bold text-[var(--clr-danger)] uppercase hover:underline"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mb-12 p-6 bg-[var(--clr-paper)] border border-[var(--clr-aged)] rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-ui text-[10px] font-black text-[var(--clr-dust)] uppercase tracking-[0.2em]">Connected Vaults</h4>
            <span className="font-ui text-[10px] font-black text-[var(--clr-gold-dark)] uppercase tracking-widest">
              {pactHistory.length} Active
            </span>
          </div>

          {pactHistory.length === 0 ? (
            <p className="font-ui text-sm text-[var(--clr-dust)]">No active lineage pacts yet.</p>
          ) : (
            <div className="space-y-2">
              {pactHistory.map((p: any) => {
                const counterpartName = p.is_incoming ? p.requester_name : p.target_vault_name;
                const connectedOn = p.created_at ? new Date(p.created_at).toLocaleDateString() : 'Unknown';
                const isUnlinkPending = p.status === 'UNLINK_PENDING';
                const requestedByCurrentVault = !!activeVaultId && p.unlink_requested_by_vault_id === activeVaultId;
                return (
                  <div key={p.id} className="flex items-center justify-between bg-white/50 p-4 rounded-xl">
                    <div>
                      <p className="font-ui text-sm text-[var(--clr-ink)]">
                        Linked with <strong>{counterpartName}</strong>
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="block font-ui text-[10px] font-black text-[var(--clr-dust)] uppercase tracking-widest">
                          Since {connectedOn}
                        </span>
                        {isUnlinkPending && (
                          <span className="inline-flex items-center rounded-full border border-[rgba(184,143,91,0.35)] bg-[rgba(184,143,91,0.1)] px-2 py-1 font-ui text-[9px] font-black uppercase tracking-[0.16em] text-[var(--clr-gold-dark)]">
                            {requestedByCurrentVault ? 'Awaiting approval' : 'Approval requested'}
                          </span>
                        )}
                      </div>
                    </div>
                    {canAdmin && (
                      requestedByCurrentVault && isUnlinkPending ? (
                        <span className="font-ui text-[10px] font-black uppercase tracking-widest text-[var(--clr-dust)]">
                          Waiting on the other admin
                        </span>
                      ) : (
                        <Button
                          variant={isUnlinkPending ? 'primary' : 'danger'}
                          className="py-2 px-4 text-[10px]"
                          onClick={() => openUnlinkDialog(p)}
                        >
                          <LinkBreak size={16} /> {isUnlinkPending ? 'Approve unlink' : 'Unlink'}
                        </Button>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <div className="space-y-4">
          {members.map((member: any, i: number) => (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} key={member.id} className="bg-[var(--clr-linen)] border border-[var(--clr-aged)] rounded-2xl p-5 flex items-center gap-6 group hover:border-[var(--clr-gold)] transition-all">
              <img src={member.avatar || `https://ui-avatars.com/api/?name=${member.name}&background=B88F5B&color=fff`} className="w-14 h-14 rounded-full border-2 border-[var(--clr-gold)]" alt={member.name} />
              <div className="flex-1">
                <h3 className="font-display font-bold text-lg text-[var(--clr-ink)]">{member.name}</h3>
                <p className="font-ui text-[12px] text-[var(--clr-dust)]">{member.email}</p>
              </div>
              <div className="flex items-center gap-6">
                <span className={`font-ui text-[10px] font-black tracking-widest px-3 py-1 rounded-full border ${member.role === 'ADMIN' ? 'bg-[var(--clr-gold)] text-white border-[var(--clr-gold)]' : 'bg-[var(--clr-paper)] text-[var(--clr-dust)] border-[var(--clr-aged)]'}`}>{member.role}</span>
                {member.role !== 'ADMIN' && (
                  <button onClick={() => handleRemoveMember(member.id, member.name)} className="text-[var(--clr-dust)] hover:text-[var(--clr-danger)] opacity-0 group-hover:opacity-100 transition-all"><LinkBreak size={20} /></button>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        <AnimatePresence>
          {showInvite && canAdmin && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowInvite(false)} />
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-lg bg-[var(--clr-parchment)] border-2 border-[var(--clr-gold)] rounded-[var(--radius-lg)] p-10 shadow-2xl">
                <h2 className="font-display text-2xl uppercase tracking-widest mb-6">Invite Relative</h2>
                <form onSubmit={handleInviteSubmit} className="space-y-4">
                  <input required type="email" name="email" placeholder="Email Address" className="w-full bg-[var(--clr-linen)] border border-[var(--clr-aged)] rounded-full px-6 py-4 outline-none focus:border-[var(--clr-gold)]" />
                  <PlatformSelect
                    name="role"
                    value={inviteRole}
                    onValueChange={setInviteRole}
                    options={[
                      { value: 'VIEWER', label: 'Viewer (See only)' },
                      { value: 'CONTRIBUTOR', label: 'Contributor (Upload & Label)' },
                    ]}
                  />
                  <Button variant="primary" type="submit" className="w-full" disabled={inviteMember.isPending}>
                    {inviteMember.isPending ? 'SENDING...' : 'SEND INVITATION'}
                  </Button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showInviteLink && canAdmin && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowInviteLink(false)} />
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-lg bg-[var(--clr-parchment)] border-2 border-[var(--clr-gold)] rounded-[var(--radius-lg)] p-10 shadow-2xl">
                <h2 className="font-display text-2xl uppercase tracking-widest mb-2">Generate Invite Link</h2>
                <p className="font-ui text-sm text-[var(--clr-dust)] mb-6">Leave usage and expiry blank for an unlimited link.</p>
                <form onSubmit={handleInviteLinkSubmit} className="space-y-4">
                  <PlatformSelect
                    name="role"
                    value={inviteLinkRole}
                    onValueChange={setInviteLinkRole}
                    options={[
                      { value: 'VIEWER', label: 'Viewer (See only)' },
                      { value: 'CONTRIBUTOR', label: 'Contributor (Upload & Label)' },
                    ]}
                  />
                  <input
                    type="number"
                    min={1}
                    value={inviteLinkMaxUses}
                    onChange={(e) => setInviteLinkMaxUses(e.target.value)}
                    placeholder="Max joins (optional)"
                    className="w-full bg-[var(--clr-linen)] border border-[var(--clr-aged)] rounded-full px-6 py-4 outline-none focus:border-[var(--clr-gold)]"
                  />
                  <input
                    type="datetime-local"
                    value={inviteLinkExpiresAt}
                    onChange={(e) => setInviteLinkExpiresAt(e.target.value)}
                    className="w-full bg-[var(--clr-linen)] border border-[var(--clr-aged)] rounded-full px-6 py-4 outline-none focus:border-[var(--clr-gold)]"
                  />
                  <Button variant="primary" type="submit" className="w-full" disabled={createInviteLink.isPending}>
                    {createInviteLink.isPending ? 'GENERATING...' : 'GENERATE & SHARE LINK'}
                  </Button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showPactModal && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowPactModal(false)} />
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-lg bg-[var(--clr-parchment)] border-2 border-[var(--clr-gold)] rounded-[var(--radius-lg)] p-10 shadow-2xl">
                <div className="text-center space-y-6">
                  <ArrowsMerge size={64} weight="thin" className="mx-auto text-[var(--clr-gold)]" />
                  <h2 className="font-display text-2xl uppercase tracking-widest">Establish a Lineage Pact</h2>
                  <p className="font-ui text-sm text-[var(--clr-dust)] leading-relaxed">
                    Link your vault with a spouse or partner's vault. Your family trees will grow together, and you will both be able to view each other's memories seamlessly.
                  </p>
                  <form onSubmit={handlePactRequest} className="space-y-4">
                    <input type="email" name="email" placeholder="Partner's Email Address" required className="w-full bg-[var(--clr-linen)] border border-[var(--clr-aged)] rounded-full px-6 py-4 outline-none focus:border-[var(--clr-gold)]" />
                    {pactError && (
                      <p className="rounded-2xl border border-[rgba(139,58,58,0.35)] bg-[rgba(139,58,58,0.08)] px-4 py-3 text-left font-ui text-[12px] text-[var(--clr-danger)]">
                        {pactError}
                      </p>
                    )}
                    <div className="bg-[var(--clr-paper)] p-4 rounded-xl text-left flex gap-3">
                      <ShieldCheck size={32} className="text-[var(--clr-gold)] shrink-0" />
                      <p className="font-ui text-[11px] text-[var(--clr-ink)] leading-tight">
                        <strong>Privacy Note:</strong> Pacts are view-only. You cannot delete or edit memories in a linked vault without explicit permission.
                      </p>
                    </div>
                    <Button variant="primary" type="submit" className="w-full" disabled={requestPact.isPending}>
                      {requestPact.isPending ? 'PROCESSING...' : 'SEND PACT REQUEST'}
                    </Button>
                  </form>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showUnlinkModal && selectedUnlinkPact && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-md"
                onClick={closeUnlinkDialog}
              />
              <motion.div
                initial={{ scale: 0.92, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.92, opacity: 0, y: 10 }}
                className="relative w-full max-w-lg bg-[var(--clr-parchment)] border-2 border-[var(--clr-gold)] rounded-[var(--radius-lg)] p-10 shadow-2xl"
              >
                <div className="text-center space-y-5">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[rgba(184,143,91,0.35)] bg-[rgba(184,143,91,0.08)] text-[var(--clr-gold)]">
                    <LinkBreak size={34} weight="bold" />
                  </div>
                  <h2 className="font-display text-2xl uppercase tracking-widest">
                    {selectedUnlinkPact.status === 'UNLINK_PENDING' && selectedUnlinkPact.unlink_requested_by_vault_id !== activeVaultId
                      ? 'Approve Lineage Unlink'
                      : 'Request Lineage Unlink'}
                  </h2>
                  <p className="font-ui text-sm text-[var(--clr-dust)] leading-relaxed">
                    {selectedUnlinkPact.status === 'UNLINK_PENDING' && selectedUnlinkPact.unlink_requested_by_vault_id !== activeVaultId
                      ? 'The other vault admin already requested this unlink. Approving it will permanently remove the pact after this confirmation.'
                      : 'This will request removal of the pact. The other vault admin must also agree before the connection is removed.'}
                  </p>
                  <div className="rounded-2xl border border-[var(--clr-aged)] bg-[var(--clr-paper)] px-4 py-3 text-left">
                    <p className="font-ui text-[10px] font-black uppercase tracking-[0.18em] text-[var(--clr-dust)]">Connection</p>
                    <p className="mt-1 font-ui text-sm text-[var(--clr-ink)]">
                      Linked with <strong>{selectedUnlinkPact.is_incoming ? selectedUnlinkPact.requester_name : selectedUnlinkPact.target_vault_name}</strong>
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <Button variant="ghost" onClick={closeUnlinkDialog} className="w-full sm:w-auto">
                      Cancel
                    </Button>
                    <Button
                      variant="danger"
                      onClick={handleConfirmUnlink}
                      className="w-full sm:w-auto"
                      disabled={actOnPact.isPending}
                    >
                      <LinkBreak size={16} />
                      {selectedUnlinkPact.status === 'UNLINK_PENDING' && selectedUnlinkPact.unlink_requested_by_vault_id !== activeVaultId
                        ? 'Approve Unlink'
                        : 'Request Unlink'}
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
