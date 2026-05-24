import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Vault, UserPlus, CheckCircle, ArrowRight, Camera, Users, XCircle } from '@phosphor-icons/react';
import { Button } from '../components/ui/Button';
import { PlatformSelect } from '../components/ui/Select';
import { useNavigate } from '@tanstack/react-router';
import { sileo } from 'sileo';
import { useInitVault, useFirstRelative } from '../features/auth/hooks/useAuth';
import { useAuthStore } from '../stores/authStore';
import { useUploadMemory } from '../features/vault/hooks/useVault';
import { useGovernanceActions } from '../features/governance/hooks/useGovernance';
import axiosClient from '../services/axiosClient';
import { getAccessibleVaults } from '../lib/authRouting';

type JourneyMode = 'chooser' | 'join' | 'create';

export default function Onboarding() {
  const [journey, setJourney] = useState<JourneyMode>('chooser');
  const [step, setStep] = useState(1);
  const [vaultName, setVaultName] = useState('');
  const [relativeName, setRelativeName] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [relationship, setRelationship] = useState('Myself');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [inviteBusyId, setInviteBusyId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const initVaultMutation = useInitVault();
  const firstRelativeMutation = useFirstRelative();
  const uploadMutation = useUploadMemory();
  const { respondToInvitation } = useGovernanceActions();
  const login = useAuthStore((s) => s.login);
  const { currentUser, accessToken, refreshToken } = useAuthStore();

  const pendingInvitations = currentUser?.pendingInvitations || [];
  const hasPendingInvitations = pendingInvitations.length > 0;

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

  const rejectPendingInvitations = async () => {
    for (const invitation of pendingInvitations) {
      if (invitation.status !== 'PENDING') continue;
      await respondToInvitation.mutateAsync({
        vaultId: invitation.vaultId,
        invitationId: invitation.id,
        action: 'REJECT',
      });
    }
  };

  const handleInvitationAction = async (invitation: any, action: 'ACCEPT' | 'REJECT') => {
    setInviteBusyId(invitation.id);
    try {
      await sileo.promise(
        respondToInvitation.mutateAsync({
          vaultId: invitation.vaultId,
          invitationId: invitation.id,
          action,
        }),
        {
          loading: { title: action === 'ACCEPT' ? 'Joining Vault...' : 'Declining Invitation...' },
          success: action === 'ACCEPT'
            ? { title: 'Invitation Accepted', description: `You can now enter ${invitation.vaultName}.` }
            : { title: 'Invitation Declined', description: 'The inviter can see the rejection.' },
          error: (err: any) => ({
            title: 'Unable to Update Invitation',
            description: err?.response?.data?.error || 'Could not process the invitation.',
          }),
        }
      );

      const refreshed = await refreshProfile();
      const accessibleVaults = getAccessibleVaults(refreshed as any);
      if (action === 'ACCEPT') {
        const nextRoute = accessibleVaults.length > 1 ? '/vault-select' : '/dashboard';
        void navigate({ to: nextRoute as any });
        return;
      }

      if ((refreshed?.pendingInvitations || []).length === 0) {
        setJourney('chooser');
      }
    } catch (error) {
      console.error(error);
      sileo.error({ title: 'Could not continue', description: 'Please refresh and try again.' });
    } finally {
      setInviteBusyId(null);
    }
  };

  const nextStep = async () => {
    try {
      if (journey !== 'create') return;

      if (step === 1) {
        if (!vaultName.trim()) {
          return sileo.error({ title: 'Name Required', description: 'Your museum needs a name to proceed.' });
        }

        if (hasPendingInvitations) {
          await rejectPendingInvitations();
        }

        const res = await sileo.promise(initVaultMutation.mutateAsync(vaultName.trim()), {
          loading: { title: 'Forging Vault...' },
          success: { title: 'Vault Established' },
          error: { title: 'Failed to create vault' },
        });

        await refreshProfile();
        setStep(2);
        return res;
      }

      if (step === 2) {
        if (!relativeName.trim()) {
          return sileo.error({ title: 'Identity Required', description: 'Please identify your first relative.' });
        }
        const vaultId = useAuthStore.getState().activeVaultId;
        if (!vaultId) return sileo.error({ title: 'Error', description: 'Vault ID missing.' });

        await sileo.promise(firstRelativeMutation.mutateAsync({
          vaultId,
          name: relativeName,
          birthYear: birthYear || '1900',
          relationship: relationship || 'Myself',
        }), {
          loading: { title: 'Grafting Lineage...' },
          success: { title: 'Lineage Rooted' },
          error: { title: 'Failed to save relative' },
        });
        setStep(3);
        return;
      }

      if (step === 3) {
        if (selectedFile) {
          try {
            await uploadMutation.mutateAsync({ file: selectedFile });
            sileo.info({ title: 'Processing', description: 'Image is being processed.' });
          } catch (err) {
            console.error(err);
          }
        }
        setStep(4);
        return;
      }

      setStep((s) => s + 1);
    } catch (e) {
      sileo.error({ title: 'Could not continue', description: 'Please try again.' });
      console.error(e);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
        sileo.success({ title: 'Artifact Ready', description: 'Your memory is queued for preservation.' });
      };
      reader.readAsDataURL(file);
    }
  };

  const renderChooser = () => (
    <motion.div key="chooser" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-5xl mx-auto">
      <div className="text-center space-y-5 mb-10">
        <div className="w-20 h-20 bg-[var(--clr-gold)] rounded-full flex items-center justify-center mx-auto text-[var(--clr-charcoal)] shadow-2xl">
          <Vault size={40} weight="fill" />
        </div>
        <h1 className="font-display text-[clamp(2.2rem,4vw,3.8rem)] tracking-widest uppercase">Welcome to LegacyKeeper</h1>
        <p className="font-ui text-[13px] text-[var(--clr-fog)] uppercase tracking-[0.2em] max-w-2xl mx-auto">
          Decide whether this account is joining an existing vault or founding a new one.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <motion.button
          whileHover={{ y: -4 }}
          onClick={() => navigate({ to: '/invitation-inbox' })}
          className="text-left rounded-[28px] border border-[rgba(184,143,91,0.24)] bg-[rgba(255,255,255,0.04)] p-7 transition-all hover:border-[var(--clr-gold)] hover:bg-[rgba(184,143,91,0.08)]"
        >
          <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 rounded-2xl bg-[rgba(184,143,91,0.18)] flex items-center justify-center text-[var(--clr-gold)] border border-[rgba(184,143,91,0.25)]">
              <Users size={28} weight="fill" />
            </div>
            <div>
              <h2 className="font-display text-2xl uppercase tracking-widest">Join a Vault</h2>
              <p className="font-ui text-[11px] uppercase tracking-[0.18em] text-[var(--clr-fog)]">Accept or decline invitations</p>
            </div>
          </div>
          <p className="font-ui text-sm text-[var(--clr-linen)]/80 leading-relaxed">
            Use this if someone invited you to an existing vault. You can accept a vault invitation or reject it directly from onboarding.
          </p>
          <div className="mt-5 inline-flex items-center gap-2 font-ui text-[10px] uppercase tracking-[0.2em] text-[var(--clr-gold)]">
            Review invitations <ArrowRight size={14} />
          </div>
        </motion.button>

        <motion.button
          whileHover={{ y: -4 }}
          onClick={() => {
            setJourney('create');
            setStep(1);
          }}
          className="text-left rounded-[28px] border border-[rgba(184,143,91,0.24)] bg-[rgba(255,255,255,0.04)] p-7 transition-all hover:border-[var(--clr-gold)] hover:bg-[rgba(184,143,91,0.08)]"
        >
          <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 rounded-2xl bg-[rgba(184,143,91,0.18)] flex items-center justify-center text-[var(--clr-gold)] border border-[rgba(184,143,91,0.25)]">
              <Vault size={28} weight="fill" />
            </div>
            <div>
              <h2 className="font-display text-2xl uppercase tracking-widest">Create My Vault</h2>
              <p className="font-ui text-[11px] uppercase tracking-[0.18em] text-[var(--clr-fog)]">Start your own archive</p>
            </div>
          </div>
          <p className="font-ui text-sm text-[var(--clr-linen)]/80 leading-relaxed">
            Create a fresh vault for your own family history, then add the first relative and your first memory.
          </p>
          <div className="mt-5 inline-flex items-center gap-2 font-ui text-[10px] uppercase tracking-[0.2em] text-[var(--clr-gold)]">
            Start building <ArrowRight size={14} />
          </div>
        </motion.button>
      </div>
    </motion.div>
  );

  const renderJoin = () => (
    <motion.div key="join" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} className="w-full max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-[clamp(2rem,3.6vw,3.4rem)] uppercase tracking-widest">Join a Vault</h1>
          <p className="font-ui text-[13px] text-[var(--clr-fog)] uppercase tracking-[0.16em] mt-2">
            Choose an invitation to accept or reject.
          </p>
        </div>
        <Button variant="ghost" onClick={() => setJourney('chooser')}>BACK</Button>
      </div>

      {hasPendingInvitations ? (
        <div className="space-y-4">
          {pendingInvitations.map((invitation) => (
            <div key={invitation.id} className="rounded-[26px] border border-[rgba(184,143,91,0.22)] bg-[rgba(255,255,255,0.05)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.16)]">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <p className="font-display text-[1.35rem] uppercase tracking-[0.12em]">{invitation.vaultName}</p>
                  <p className="font-ui text-[12px] text-[var(--clr-fog)] uppercase tracking-[0.18em] mt-1">
                    Invited as {invitation.role}
                  </p>
                  {invitation.invitedByName && (
                    <p className="font-ui text-[12px] text-[var(--clr-fog)] mt-2">Invited by {invitation.invitedByName}</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="primary"
                    onClick={() => handleInvitationAction(invitation, 'ACCEPT')}
                    disabled={inviteBusyId === invitation.id}
                  >
                    {inviteBusyId === invitation.id ? 'WORKING...' : 'JOIN VAULT'}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => handleInvitationAction(invitation, 'REJECT')}
                    disabled={inviteBusyId === invitation.id}
                  >
                    DECLINE
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-[26px] border border-[rgba(184,143,91,0.22)] bg-[rgba(255,255,255,0.05)] p-8 text-center">
          <XCircle size={56} className="mx-auto text-[var(--clr-fog)] mb-4" />
          <h2 className="font-display text-2xl uppercase tracking-widest">No pending invitations</h2>
          <p className="font-ui text-sm text-[var(--clr-fog)] mt-3">
            There is nothing to join yet. You can create your own vault instead.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="primary" onClick={() => { setJourney('create'); setStep(1); }}>CREATE MY VAULT</Button>
            <Button variant="ghost" onClick={() => setJourney('chooser')}>BACK</Button>
          </div>
        </div>
      )}
    </motion.div>
  );

  const renderCreate = () => (
    <motion.div key="create" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-5xl mx-auto">
      <div className="absolute top-12 left-0 right-0 z-20 flex justify-center items-center gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full transition-all duration-500 ${step >= i ? 'bg-[var(--clr-gold)] shadow-[0_0_10px_var(--clr-gold)]' : 'bg-[var(--clr-soot)] border border-[var(--clr-aged)] opacity-30'}`} />
            {i < 4 && <div className={`w-12 h-[1px] ${step > i ? 'bg-[var(--clr-gold)]' : 'bg-[var(--clr-aged)] opacity-20'}`} />}
          </div>
        ))}
      </div>

      <div className="text-center mb-10 space-y-4">
        <div className="w-20 h-20 bg-[var(--clr-gold)] rounded-full flex items-center justify-center mx-auto text-[var(--clr-charcoal)] shadow-2xl">
          <Vault size={40} weight="fill" />
        </div>
        <h1 className="font-display text-[clamp(2.2rem,4vw,3.8rem)] tracking-widest uppercase">Create Your Vault</h1>
        <p className="font-ui text-[13px] text-[var(--clr-fog)] uppercase tracking-[0.2em] max-w-2xl mx-auto">
          Build a new vault from scratch. If you had pending invitations, they are declined as part of this choice.
        </p>
      </div>

      <main className="flex-1 flex items-center justify-center p-0 md:p-6">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }} className="max-w-lg text-center space-y-8">
              <p className="font-script text-[44px] text-[var(--clr-gold)] leading-none">"Give your family a home"</p>
              <input
                type="text"
                value={vaultName}
                onChange={(e) => setVaultName(e.target.value)}
                placeholder="e.g. The Alemu Family Museum"
                className="w-full bg-[var(--clr-soot)] border border-[rgba(184,143,91,0.3)] rounded-full px-8 py-5 text-xl font-ui text-center outline-none focus:border-[var(--clr-gold)] shadow-[var(--shadow-inset)]"
              />
              <div className="flex flex-col gap-3">
                <Button variant="primary" onClick={nextStep} className="w-full py-5" disabled={initVaultMutation.isPending}>
                  CONTINUE <ArrowRight />
                </Button>
                <Button variant="ghost" onClick={() => setJourney('chooser')}>BACK</Button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="max-w-lg text-center space-y-8">
              <div className="w-20 h-20 border-2 border-dashed border-[var(--clr-gold)] rounded-full flex items-center justify-center mx-auto text-[var(--clr-gold)]">
                <UserPlus size={40} weight="thin" />
              </div>
              <h1 className="font-display text-[2.25rem] tracking-widest uppercase leading-tight">Add Your First Relative</h1>
              <div className="space-y-4 text-left">
                <input type="text" value={relativeName} onChange={(e) => setRelativeName(e.target.value)} placeholder="Full Legal Name" className="w-full bg-[var(--clr-soot)] border border-[rgba(184,143,91,0.3)] rounded-full px-6 py-4 font-ui outline-none focus:border-[var(--clr-gold)]" />
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" value={birthYear} onChange={e => setBirthYear(e.target.value)} placeholder="Birth Year" className="w-full bg-[var(--clr-soot)] border border-[rgba(184,143,91,0.3)] rounded-full px-6 py-4 font-ui outline-none focus:border-[var(--clr-gold)]" />
                  <PlatformSelect
                    value={relationship}
                    onValueChange={setRelationship}
                    className="bg-[var(--clr-soot)] text-[var(--clr-linen)]"
                    options={[
                      { value: 'Myself', label: 'Myself' },
                      { value: 'Parent', label: 'Parent' },
                      { value: 'Child', label: 'Child' },
                      { value: 'Spouse', label: 'Spouse' },
                    ]}
                  />
                </div>
              </div>
              <Button variant="primary" onClick={nextStep} className="w-full py-5" disabled={firstRelativeMutation.isPending}>ESTABLISH LINEAGE</Button>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8 }} className="max-w-xl text-center space-y-8">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="relative border-2 border-dashed border-[rgba(184,143,91,0.4)] bg-[var(--clr-soot)] rounded-[var(--radius-lg)] p-12 flex flex-col items-center group cursor-pointer hover:border-[var(--clr-gold)] transition-colors overflow-hidden"
              >
                {previewUrl ? (
                  <div className="absolute inset-0">
                    <img src={previewUrl} className="w-full h-full object-cover opacity-60" alt="Preview" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <Camera size={48} className="text-white" />
                    </div>
                  </div>
                ) : (
                  <>
                    <Camera size={64} className="text-[var(--clr-gold)] opacity-40 mb-6" />
                    <h2 className="font-display text-xl uppercase tracking-widest">Hang Your First Exhibit</h2>
                    <p className="font-ui text-sm text-[var(--clr-fog)] mt-2">Upload a photo to initialize the AI Curator</p>
                  </>
                )}
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept="image/*" />
              </div>
              <Button variant="primary" onClick={nextStep} className="w-full py-5" disabled={uploadMutation.isPending}>
                {previewUrl ? (uploadMutation.isPending ? 'PROCESSING...' : 'PRESERVE & FINISH') : 'SKIP & FINISH'}
              </Button>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="s4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-12">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1, rotate: [0, 10, -10, 0] }} transition={{ type: 'spring', delay: 0.5 }}>
                <CheckCircle size={100} weight="fill" className="text-[var(--clr-gold)] mx-auto filter drop-shadow-[0_0_20px_rgba(184,143,91,0.5)]" />
              </motion.div>
              <div className="space-y-4">
                <h1 className="font-display text-[3rem] tracking-[0.2em] text-[var(--clr-linen)] uppercase">The Vault is Open</h1>
                <p className="font-script text-[56px] text-[var(--clr-gold)]">"Your legacy begins now"</p>
              </div>
              <Button variant="primary" className="px-16 py-6 text-lg shadow-[var(--shadow-gold)]" onClick={() => navigate({ to: '/dashboard' })}>
                ENTER THE MUSEUM
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-[var(--clr-charcoal)] text-[var(--clr-linen)] flex flex-col relative overflow-hidden">
      {journey === 'chooser' && (
        <main className="flex-1 flex items-center justify-center p-6">
          {renderChooser()}
        </main>
      )}

      {journey === 'join' && (
        <main className="flex-1 flex items-center justify-center p-6">
          {renderJoin()}
        </main>
      )}

      {journey === 'create' && renderCreate()}

      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')]" />
    </div>
  );
}
