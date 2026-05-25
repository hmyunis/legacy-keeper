import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Buildings, Circle, Vault } from '@phosphor-icons/react';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { Button } from '../components/ui/Button';
import { useAuthStore } from '../stores/authStore';
import { getAccessibleVaults } from '../lib/authRouting';
import { parseRouteTarget } from '../lib/deepLinks';

export default function VaultSelect() {
  const navigate = useNavigate();
  const redirectTo = useRouterState({
    select: (s) => {
      const search = s.location.search as { redirect?: string };
      return search.redirect;
    },
  });
  const { currentUser, activeVaultId, setActiveVaultId } = useAuthStore();
  const vaults = getAccessibleVaults(currentUser);

  useEffect(() => {
    if (vaults.length === 1) {
      setActiveVaultId(vaults[0].id);
      const target = parseRouteTarget(redirectTo || '/dashboard');
      void navigate({ to: target.to as any, search: target.search as any });
    }
  }, [navigate, redirectTo, setActiveVaultId, vaults]);

  const handleSelect = (vaultId: string) => {
    setActiveVaultId(vaultId);
    const target = parseRouteTarget(redirectTo || '/dashboard');
    void navigate({ to: target.to as any, search: target.search as any });
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[radial-gradient(circle_at_top,#2d251f_0%,#151110_40%,#090706_100%)] text-[var(--clr-linen)] flex items-center justify-center px-6 py-12">
      <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')]" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-4xl"
      >
        <div className="text-center mb-10 space-y-4">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full border border-[rgba(184,143,91,0.35)] bg-[rgba(20,18,17,0.85)] shadow-[0_0_40px_rgba(184,143,91,0.18)]">
            <Vault size={30} weight="fill" className="text-[var(--clr-gold)]" />
          </div>
          <h1 className="font-display text-[clamp(2.2rem,4vw,4rem)] uppercase tracking-[0.22em]">Choose a Vault</h1>
          <p className="font-ui text-[13px] text-[var(--clr-fog)] uppercase tracking-[0.18em]">
            Select the archive you want to open for this session.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {vaults.map((vault, index) => {
            const selected = activeVaultId === vault.id;
            return (
              <motion.button
                key={vault.id}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08, duration: 0.35 }}
                onClick={() => handleSelect(vault.id)}
                className={`group text-left rounded-[28px] border p-6 transition-all duration-300 ${
                  selected
                    ? 'border-[var(--clr-gold)] bg-[rgba(184,143,91,0.14)] shadow-[0_0_0_1px_rgba(184,143,91,0.35),0_18px_60px_rgba(0,0,0,0.35)]'
                    : 'border-[rgba(184,143,91,0.18)] bg-[rgba(255,255,255,0.04)] hover:border-[rgba(184,143,91,0.45)] hover:bg-[rgba(255,255,255,0.07)]'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${selected ? 'bg-[var(--clr-gold)] text-black' : 'bg-black/30 text-[var(--clr-gold)] border border-[rgba(184,143,91,0.2)]'}`}>
                      <Buildings size={22} weight="fill" />
                    </div>
                    <div>
                      <h2 className="font-display text-[1.35rem] uppercase tracking-[0.16em] text-[var(--clr-linen)]">{vault.name}</h2>
                      <p className="font-ui text-[11px] uppercase tracking-[0.22em] text-[var(--clr-fog)]">{vault.role}</p>
                    </div>
                  </div>
                  <Circle size={18} weight={selected ? 'fill' : 'regular'} className={selected ? 'text-[var(--clr-gold)]' : 'text-[var(--clr-aged)]'} />
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <div className="font-ui text-[12px] text-[var(--clr-fog)]">
                    {vault.joinedAt ? `Joined ${new Date(vault.joinedAt).toLocaleDateString()}` : 'Vault access available'}
                  </div>
                  <span className={`inline-flex items-center gap-2 font-ui text-[10px] font-black uppercase tracking-[0.18em] ${selected ? 'text-[var(--clr-gold)]' : 'text-[var(--clr-fog)]'}`}>
                    Open <ArrowRight size={14} />
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>

        {vaults.length === 0 && (
          <div className="mt-8 rounded-[28px] border border-[rgba(184,143,91,0.18)] bg-[rgba(255,255,255,0.04)] p-6 text-center">
            <p className="font-ui text-sm text-[var(--clr-fog)]">No vault is linked to this account yet.</p>
            <div className="mt-4">
              <Button variant="primary" onClick={() => navigate({ to: '/onboarding' })}>GO TO ONBOARDING</Button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
