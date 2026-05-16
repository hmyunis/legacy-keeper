import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UsersThree, UserPlus, LinkBreak, ShieldCheck, ArrowsMerge } from '@phosphor-icons/react';
import { sileo } from 'sileo';
import { Button } from '../components/ui/Button';
import { useMembers, useGovernanceActions } from '../features/governance/hooks/useGovernance';

export default function Members() {
  const [showInvite, setShowInvite] = useState(false);
  const [showPactModal, setShowPactModal] = useState(false);

  const { data: members = [] } = useMembers();
  const { inviteMember, removeMember, requestPact } = useGovernanceActions();

  const handleInviteSubmit = async (e: any) => {
    e.preventDefault();
    const email = e.target.email.value;
    const role = e.target.role.value;

    await sileo.promise(inviteMember.mutateAsync({ email, role }), {
      loading: { title: "Dispatching..." },
      success: () => { setShowInvite(false); return { title: "Invitation Sent", description: `Registry keys sent to ${email}.` }; },
      error: { title: "Failed to Invite" }
    });
  };

  const handlePactRequest = async (e: any) => {
    e.preventDefault();
    await sileo.promise(requestPact.mutateAsync({ email: e.target.email.value }), {
      loading: { title: "Requesting Federation..." },
      success: () => { setShowPactModal(false); return { title: "Pact Dispatched", description: "Lineage connection requested." }; },
      error: { title: "Request Failed" }
    });
  };

  const handleRemoveMember = (id: string, name: string) => {
    sileo.promise(removeMember.mutateAsync(id), {
      loading: { title: "Revoking Access..." },
      success: { title: "Access Revoked", description: `Keys disabled for ${name}.` },
      error: { title: "Error", description: "Cannot remove vault admin." }
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
            <Button variant="ghost" onClick={() => setShowPactModal(true)}><ArrowsMerge size={18} /> LINEAGE PACT</Button>
            <Button variant="primary" onClick={() => setShowInvite(true)}><UserPlus size={18} weight="bold" /> INVITE KIN</Button>
          </div>
        </header>

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
                  <button onClick={() => handleRemoveMember(member.user.id, member.name)} className="text-[var(--clr-dust)] hover:text-[var(--clr-danger)] opacity-0 group-hover:opacity-100 transition-all"><LinkBreak size={20} /></button>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        <AnimatePresence>
          {showInvite && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowInvite(false)} />
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-lg bg-[var(--clr-parchment)] border-2 border-[var(--clr-gold)] rounded-[var(--radius-lg)] p-10 shadow-2xl">
                <h2 className="font-display text-2xl uppercase tracking-widest mb-6">Invite Relative</h2>
                <form onSubmit={handleInviteSubmit} className="space-y-4">
                  <input required type="email" name="email" placeholder="Email Address" className="w-full bg-[var(--clr-linen)] border border-[var(--clr-aged)] rounded-full px-6 py-4 outline-none focus:border-[var(--clr-gold)]" />
                  <select name="role" className="w-full bg-[var(--clr-linen)] border border-[var(--clr-aged)] rounded-full px-6 py-4 outline-none focus:border-[var(--clr-gold)] appearance-none">
                    <option value="VIEWER">Viewer (See only)</option>
                    <option value="CONTRIBUTOR">Contributor (Upload & Label)</option>
                  </select>
                  <Button variant="primary" type="submit" className="w-full" disabled={inviteMember.isPending}>
                    {inviteMember.isPending ? 'SENDING...' : 'SEND INVITATION'}
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
      </div>
    </div>
  );
}