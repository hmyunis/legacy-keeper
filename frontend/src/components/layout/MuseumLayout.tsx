import { type ReactNode } from 'react';
import { MuseumNavbar, type NavMode } from '../nav/MuseumNavbar';
import { useRouterState } from '@tanstack/react-router';

interface MuseumLayoutProps {
  children: ReactNode;
  navMode: NavMode;
}

export const MuseumLayout = ({ children, navMode }: MuseumLayoutProps) => {
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const isLanding = currentPath === '/';

  return (
    <div className="museum-shell min-h-screen text-[var(--clr-ink)] flex flex-col relative">
      <MuseumNavbar mode={navMode} />

      {/* Removed the `z-0` from main so fixed modals in subpages stack above the layout freely */}
      <main className="museum-shell-main flex-1 flex flex-col relative">{children}</main>

      {isLanding ? (
        <footer className="bg-[var(--clr-charcoal)] text-[var(--clr-fog)] py-[var(--space-8)] px-[clamp(24px,5vw,80px)] text-center font-ui text-[var(--type-body-sm)] border-t border-[rgba(184,143,91,0.2)] mt-auto relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none" />
          <div className="relative z-10 flex flex-col items-center justify-center">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[var(--clr-gold)] rounded-xl flex items-center justify-center text-[var(--clr-charcoal)] font-bold text-xl shadow-[var(--shadow-gold)]">
                L
              </div>
              <span className="font-display font-semibold text-2xl text-[var(--clr-linen)] tracking-tight">
                LegacyKeeper
              </span>
            </div>
            <p className="text-[var(--clr-linen)] font-medium text-[16px] tracking-wide mb-4">
              Preserving what matters most.
            </p>
            <p className="text-[var(--clr-fog)] font-semibold">
              &copy; {new Date().getFullYear()} The Family Memory Museum
            </p>
          </div>
        </footer>
      ) : (
        <footer className="bg-[var(--clr-charcoal)] text-[var(--clr-fog)] py-4 px-[clamp(24px,5vw,80px)] text-center font-ui text-[10px] border-t border-[rgba(184,143,91,0.1)] mt-auto relative">
          <p className="text-[var(--clr-fog)] opacity-60 uppercase tracking-widest font-bold">
            &copy; {new Date().getFullYear()} The Family Memory Museum
          </p>
        </footer>
      )}
    </div>
  );
};