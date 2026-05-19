import { useState } from 'react';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Button } from '../components/ui/Button';
import { sileo } from 'sileo';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { useConfirmPasswordReset } from '../features/auth/hooks/useAuth';

export default function ResetPassword() {
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const confirmMutation = useConfirmPasswordReset();
  const email = useRouterState({ select: (s) => (s.location.search as any).email });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sileo.promise(confirmMutation.mutateAsync({ email, code, password }), {
      loading: { title: "Verifying Key..." },
      success: () => {
        navigate({ to: '/auth' });
        return { title: "Access Restored", description: "Your vault key has been updated." };
      },
      error: { title: "Invalid Key", description: "The recovery key is incorrect or expired." }
    });
  };

  return (
    <AuthLayout title="RESET KEY" subtitle="Create a new entry">
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div>
          <label className="font-ui text-[11px] uppercase tracking-widest text-[var(--clr-fog)] mb-2 block">Recovery Key</label>
          <input type="text" required maxLength={9} value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="####-####" className="w-full text-center tracking-widest bg-[rgba(0,0,0,0.3)] border border-[rgba(184,143,91,0.3)] rounded-full px-6 py-4 text-[var(--clr-linen)] outline-none focus:border-[var(--clr-gold)] font-ui mb-4" />

          <label className="font-ui text-[11px] uppercase tracking-widest text-[var(--clr-fog)] mb-2 block">New Password</label>
          <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-[rgba(0,0,0,0.3)] border border-[rgba(184,143,91,0.3)] rounded-full px-6 py-4 text-[var(--clr-linen)] outline-none focus:border-[var(--clr-gold)] font-ui" />
        </div>
        <Button variant="primary" className="w-full" disabled={confirmMutation.isPending}>
          {confirmMutation.isPending ? 'UPDATING...' : 'UPDATE ACCESS'}
        </Button>
      </form>
    </AuthLayout>
  );
}