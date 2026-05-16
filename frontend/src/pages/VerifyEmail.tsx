import { useState } from 'react';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Button } from '../components/ui/Button';
import { sileo } from 'sileo';
import { useNavigate } from '@tanstack/react-router';

export default function VerifyEmail() {
  const [code, setCode] = useState('');
  const navigate = useNavigate();

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 4) return sileo.error({ title: "Incomplete", description: "Please enter your 8-digit key." });

    const p = new Promise(res => setTimeout(res, 1000));
    sileo.promise(p, {
      loading: { title: "Validating Key..." },
      success: () => {
        navigate({ to: '/onboarding' });
        return { title: "Vault Activated", description: "Access granted to the museum." };
      },
      error: { title: "Invalid Key" }
    });
  };

  return (
    <AuthLayout title="VAULT ACTIVATION" subtitle="Confirm your identity">
      <form onSubmit={handleVerify} className="text-center space-y-6">
        <p className="font-ui text-[14px] text-[var(--clr-fog)] leading-relaxed">
          An activation key has been sent to your email. Enter it below to initialize your family museum.
        </p>
        <input
          type="text"
          maxLength={8}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="####-####"
          className="w-full text-center bg-[rgba(0,0,0,0.3)] border border-[rgba(184,143,91,0.3)] rounded-full px-6 py-4 text-[var(--clr-linen)] tracking-[0.5em] text-xl font-display outline-none focus:border-[var(--clr-gold)]"
        />
        <Button variant="primary" className="w-full">ACTIVATE VAULT</Button>
        <button
          type="button"
          onClick={() => sileo.success({ title: "Key Dispatched", description: "A new activation key has been sent to your email." })}
          className="font-ui text-[11px] text-[var(--clr-gold)] uppercase tracking-widest hover:underline"
        >
          Resend Key
        </button>
      </form>
    </AuthLayout>
  );
}
