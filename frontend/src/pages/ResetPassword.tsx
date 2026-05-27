import { useState } from 'react';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Button } from '../components/ui/Button';
import { sileo } from 'sileo';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { useConfirmPasswordReset } from '../features/auth/hooks/useAuth';
import { getPasswordErrorMessage, validatePasswordForAuth } from '../lib/passwordStrength';

export default function ResetPassword() {
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const confirmMutation = useConfirmPasswordReset();
  const email = useRouterState({ select: (s) => String((s.location.search as any).email || '') });
  const passwordValidation = validatePasswordForAuth(password, { email });
  const normalizedCode = code.trim();
  const canSubmit = normalizedCode.length === 9 && passwordValidation.isValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    await sileo.promise(confirmMutation.mutateAsync({ email, code, password }), {
      loading: { title: "Verifying Key..." },
      success: () => {
        navigate({ to: '/auth' });
        return { title: "Access Restored", description: "Your vault key has been updated." };
      },
      error: (error: unknown) => ({
        title: "Reset Failed",
        description: getPasswordErrorMessage(error) || "The recovery key is incorrect or expired.",
      })
    });
  };

  return (
    <AuthLayout title="RESET KEY" subtitle="Create a new entry">
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div>
          <label className="font-ui text-[11px] uppercase tracking-widest text-[var(--clr-fog)] mb-2 block">Recovery Key</label>
          <input type="text" required maxLength={9} value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="####-####" className="w-full text-center tracking-widest bg-[rgba(0,0,0,0.3)] border border-[rgba(184,143,91,0.3)] rounded-full px-6 py-4 text-[var(--clr-linen)] outline-none focus:border-[var(--clr-gold)] font-ui mb-4" />

          <label className="font-ui text-[11px] uppercase tracking-widest text-[var(--clr-fog)] mb-2 block">New Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            aria-invalid={password.length > 0 && !passwordValidation.isValid}
            aria-describedby="reset-password-rules"
            className="w-full bg-[rgba(0,0,0,0.3)] border border-[rgba(184,143,91,0.3)] rounded-full px-6 py-4 text-[var(--clr-linen)] outline-none focus:border-[var(--clr-gold)] font-ui"
          />
          {password.length > 0 && (
            <div id="reset-password-rules" className="mt-3 rounded-[var(--radius-md)] border border-[rgba(184,143,91,0.24)] bg-[rgba(0,0,0,0.24)] px-4 py-3">
              <p className="mb-2 font-ui text-[9px] font-black uppercase tracking-[0.18em] text-[var(--clr-gold)]">
                Password Requirements
              </p>
              <div className="space-y-1.5">
                {passwordValidation.checks.map((check) => (
                  <p key={check.id} className={`font-ui text-[11px] leading-relaxed ${check.passed ? 'text-[rgb(149,198,143)]' : 'text-[var(--clr-fog)]'}`}>
                    <span className="mr-2 font-black">{check.passed ? 'OK' : '--'}</span>
                    {check.label}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
        <Button
          variant="primary"
          className="w-full disabled:!bg-[rgba(148,139,120,0.45)] disabled:!text-[rgba(247,244,239,0.58)] disabled:!shadow-none"
          disabled={confirmMutation.isPending || !canSubmit}
        >
          {confirmMutation.isPending ? 'UPDATING...' : 'UPDATE ACCESS'}
        </Button>
      </form>
    </AuthLayout>
  );
}
