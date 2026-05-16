import { useState } from 'react';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Button } from '../components/ui/Button';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');

  return (
    <AuthLayout title="VAULT RECOVERY" subtitle="Retrieve your access">
      <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label className="font-ui text-[11px] uppercase tracking-widest text-[var(--clr-fog)] mb-2 block">Account Email</label>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            className="w-full bg-[rgba(0,0,0,0.3)] border border-[rgba(184,143,91,0.3)] rounded-full px-6 py-4 text-[var(--clr-linen)] outline-none focus:border-[var(--clr-gold)] font-ui"
          />
        </div>
        <Button variant="primary" className="w-full">SEND RECOVERY KEY</Button>
      </form>
    </AuthLayout>
  );
}