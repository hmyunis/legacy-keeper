import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Vault, UserPlus, CheckCircle, ArrowRight, Camera } from '@phosphor-icons/react';
import { Button } from '../components/ui/Button';
import { useNavigate } from '@tanstack/react-router';
import { sileo } from 'sileo';
import { useInitVault, useFirstRelative } from '../features/auth/hooks/useAuth';
import { useAuthStore } from '../stores/authStore';

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [vaultName, setVaultName] = useState('');
  const [relativeName, setRelativeName] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const initVaultMutation = useInitVault();
  const firstRelativeMutation = useFirstRelative();
  const setAuthStore = useAuthStore(s => s.login);
  const { currentUser, accessToken, refreshToken } = useAuthStore();

  const nextStep = async () => {
    try {
      if (step === 1) {
        if (!vaultName.trim()) {
          return sileo.error({ title: "Name Required", description: "Your museum needs a name to proceed." });
        }
        const res = await sileo.promise(initVaultMutation.mutateAsync(vaultName), {
          loading: { title: "Forging Vault..." },
          success: { title: "Vault Established" },
          error: { title: "Failed to create vault" }
        });

        if (currentUser && accessToken && refreshToken) {
          setAuthStore({ user: currentUser, accessToken, refreshToken, activeVaultId: res.vaultId });
        }
        setStep(2);
        return;
      }

      if (step === 2) {
        if (!relativeName.trim()) {
          return sileo.error({ title: "Identity Required", description: "Please identify your first relative." });
        }
        const vaultId = useAuthStore.getState().activeVaultId;
        if (!vaultId) return sileo.error({ title: "Error", description: "Vault ID missing." });

        await sileo.promise(firstRelativeMutation.mutateAsync({
          vaultId,
          name: relativeName,
          birthYear: '1900',
          relationship: 'Myself'
        }), {
          loading: { title: "Grafting Lineage..." },
          success: { title: "Lineage Rooted" },
          error: { title: "Failed to save relative" }
        });
        setStep(3);
        return;
      }

      setStep(s => s + 1);
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
        sileo.success({ title: "Artifact Ready", description: "Your memory is queued for preservation." });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--clr-charcoal)] text-[var(--clr-linen)] flex flex-col relative overflow-hidden">
      <div className="absolute top-12 left-0 right-0 z-20 flex justify-center items-center gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full transition-all duration-500 ${step >= i ? 'bg-[var(--clr-gold)] shadow-[0_0_10px_var(--clr-gold)]' : 'bg-[var(--clr-soot)] border border-[var(--clr-aged)] opacity-30'}`} />
            {i < 4 && <div className={`w-12 h-[1px] ${step > i ? 'bg-[var(--clr-gold)]' : 'bg-[var(--clr-aged)] opacity-20'}`} />}
          </div>
        ))}
      </div>

      <main className="flex-1 flex items-center justify-center p-6">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }} className="max-w-lg text-center space-y-8">
              <div className="w-20 h-20 bg-[var(--clr-gold)] rounded-full flex items-center justify-center mx-auto text-[var(--clr-charcoal)] shadow-2xl">
                <Vault size={40} weight="fill" />
              </div>
              <h1 className="font-display text-[2.5rem] tracking-widest uppercase">Name Your Vault</h1>
              <p className="font-script text-[44px] text-[var(--clr-gold)] leading-none">"Give your family a home"</p>
              <input
                type="text"
                value={vaultName}
                onChange={(e) => setVaultName(e.target.value)}
                placeholder="e.g. The Kebede Family Museum"
                className="w-full bg-[var(--clr-soot)] border border-[rgba(184,143,91,0.3)] rounded-full px-8 py-5 text-xl font-ui text-center outline-none focus:border-[var(--clr-gold)] shadow-[var(--shadow-inset)]"
              />
              <Button variant="primary" onClick={nextStep} className="w-full py-5">CONTINUE <ArrowRight /></Button>
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
                   <input type="text" placeholder="Birth Year" className="w-full bg-[var(--clr-soot)] border border-[rgba(184,143,91,0.3)] rounded-full px-6 py-4 font-ui outline-none" />
                   <select className="w-full bg-[var(--clr-soot)] border border-[rgba(184,143,91,0.3)] rounded-full px-6 py-4 font-ui outline-none appearance-none">
                     <option>Relationship...</option>
                     <option>Myself</option>
                     <option>Parent</option>
                   </select>
                </div>
              </div>
              <Button variant="primary" onClick={nextStep} className="w-full py-5">ESTABLISH LINEAGE</Button>
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
              <Button variant="primary" onClick={nextStep} className="w-full py-5">
                {previewUrl ? 'PRESERVE & FINISH' : 'SKIP & FINISH'}
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

      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')]" />
    </div>
  );
}