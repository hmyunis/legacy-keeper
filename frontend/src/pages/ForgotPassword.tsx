import { useState } from 'react';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Button } from '../components/ui/Button';
import { sileo } from 'sileo';
import { useNavigate } from '@tanstack/react-router';
import { useRequestPasswordReset } from '../features/auth/hooks/useAuth';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const navigate = useNavigate();
  const resetMutation = useRequestPasswordReset();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sileo.promise(resetMutation.mutateAsync(email), {
      loading: { title: "Dispatching Key..." },
      success: () => {
        navigate({ to: '/reset-password', search: { email } });
        return { title: "Key Dispatched", description: "If the account exists, recovery instructions have been sent." };
      },
      error: { title: "Error", description: "Failed to dispatch key." }
    });
  };

  return (
    <AuthLayout title="VAULT RECOVERY" subtitle="Retrieve your access">
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div>
          <label className="font-ui text-[11px] uppercase tracking-widest text-[var(--clr-fog)] mb-2 block">Account Email</label>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-[rgba(0,0,0,0.3)] border border-[rgba(184,143,91,0.3)] rounded-full px-6 py-4 text-[var(--clr-linen)] outline-none focus:border-[var(--clr-gold)] font-ui" />
        </div>
        <Button variant="primary" className="w-full" disabled={resetMutation.isPending}>
          {resetMutation.isPending ? 'DISPATCHING...' : 'SEND RECOVERY KEY'}
        </Button>
      </form>
    </AuthLayout>
  );
}