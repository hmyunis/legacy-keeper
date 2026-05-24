import { useEffect, useState } from 'react';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Button } from '../components/ui/Button';
import { sileo } from 'sileo';
import { useNavigate } from '@tanstack/react-router';
import { useResendVerification, useVerifyEmail } from '../features/auth/hooks/useAuth';
import { useAuthStore } from '../stores/authStore';
import { getPostAuthRoute } from '../lib/authRouting';

const RESEND_COOLDOWN_SECONDS = 15;
const RESEND_COOLDOWN_KEY = 'legacy_keeper_verify_resend_cooldown_until';
const ACTIVATION_KEY_EXPIRY_MINUTES = 15;

function formatActivationCodeInput(raw: string) {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) return digits;
  return `${digits.slice(0, 4)}-${digits.slice(4)}`;
}

function getRemainingCooldownSeconds() {
  const cooldownUntilRaw = localStorage.getItem(RESEND_COOLDOWN_KEY);
  if (!cooldownUntilRaw) return 0;

  const cooldownUntil = Number(cooldownUntilRaw);
  if (!Number.isFinite(cooldownUntil) || cooldownUntil <= Date.now()) {
    localStorage.removeItem(RESEND_COOLDOWN_KEY);
    return 0;
  }

  return Math.ceil((cooldownUntil - Date.now()) / 1000);
}

export default function VerifyEmail() {
  const [code, setCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const navigate = useNavigate();
  const verifyMutation = useVerifyEmail();
  const resendVerificationMutation = useResendVerification();

  useEffect(() => {
    const tick = () => {
      setResendCooldown(getRemainingCooldownSeconds());
    };
    tick();
    const interval = window.setInterval(tick, 500);
    return () => window.clearInterval(interval);
  }, []);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const digitsOnly = code.replace(/\D/g, '');
    if (digitsOnly.length !== 8) {
      return sileo.error({ title: "Incomplete", description: "Please enter your 8-digit key." });
    }

    const promise = verifyMutation.mutateAsync(code);

    sileo.promise(promise, {
      loading: { title: "Validating Key..." },
      success: () => {
        const currentUser = useAuthStore.getState().currentUser;
        useAuthStore.setState((state) => {
          if (state.currentUser) {
             return { currentUser: { ...state.currentUser, is_verified: true } as any };
          }
          return state;
        });
        const nextRoute = getPostAuthRoute(currentUser ? ({ ...currentUser, is_verified: true } as any) : currentUser);
        navigate({ to: nextRoute as any });
        return { title: "Vault Activated", description: "Access granted to the museum." };
      },
      error: { title: "Invalid or Expired Key", description: "Please check your email and try again." }
    });
  };

  const handleResendKey = () => {
    if (resendCooldown > 0) return;

    const promise = resendVerificationMutation.mutateAsync();
    sileo.promise(promise, {
      loading: { title: "Dispatching New Key..." },
      success: () => {
        const cooldownUntil = Date.now() + (RESEND_COOLDOWN_SECONDS * 1000);
        localStorage.setItem(RESEND_COOLDOWN_KEY, String(cooldownUntil));
        setResendCooldown(RESEND_COOLDOWN_SECONDS);
        return { title: "Key Dispatched", description: "A new activation key has been sent to your email." };
      },
      error: { title: "Resend Failed", description: "Could not send a new key. Please try again." }
    });
  };

  return (
    <AuthLayout title="VAULT ACTIVATION" subtitle="Confirm your identity">
      <form onSubmit={handleVerify} className="text-center space-y-6">
        <p className="font-ui text-[14px] text-[var(--clr-fog)] leading-relaxed">
          An activation key has been sent to your email. Enter it below to initialize your family museum.
        </p>
        <p className="font-ui text-[11px] text-[var(--clr-dust)] uppercase tracking-widest">
          Key expires in {ACTIVATION_KEY_EXPIRY_MINUTES} minutes.
        </p>
        <input
          type="text"
          maxLength={9}
          value={code}
          onChange={(e) => setCode(formatActivationCodeInput(e.target.value))}
          placeholder="####-####"
          className="w-full text-center bg-[rgba(0,0,0,0.3)] border border-[rgba(184,143,91,0.3)] rounded-full px-6 py-4 text-[var(--clr-linen)] tracking-[0.5em] text-xl font-display outline-none focus:border-[var(--clr-gold)]"
        />
        <Button variant="primary" className="w-full" disabled={verifyMutation.isPending}>ACTIVATE VAULT</Button>
        <button
          type="button"
          onClick={handleResendKey}
          disabled={resendVerificationMutation.isPending || resendCooldown > 0}
          className="font-ui text-[11px] text-[var(--clr-gold)] uppercase tracking-widest hover:underline"
        >
          {resendCooldown > 0 ? `Resend Key (${resendCooldown}s)` : 'Resend Key'}
        </button>
      </form>
    </AuthLayout>
  );
}
