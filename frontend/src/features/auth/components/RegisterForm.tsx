import { useState } from 'react';
import { Eye, EyeClosed, Spinner } from '@phosphor-icons/react';
import { useNavigate } from '@tanstack/react-router';
import { sileo } from 'sileo';
import { Button } from '../../../components/ui/Button';
import { useAuthStore } from '../stores/authStore';
import { useRegister } from '../hooks/useAuth';

export const RegisterForm = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const loginAction = useAuthStore((s) => s.login);
  const registerMutation = useRegister();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const promise = registerMutation.mutateAsync({ fullName, email, password });

    sileo.promise(promise, {
      loading: { title: "Establishing Lineage..." },
      success: (data) => {
        loginAction(data);
        void navigate({ to: "/onboarding" });
        return { title: "Welcome, Curator", description: "Your session is now cryptographically secured." };
      },
      error: { title: "Registration Failed", description: "Unable to create your vault." }
    });
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <input
        type="text"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        placeholder="Full Name"
        className="w-full px-6 py-4 rounded-full bg-[rgba(0,0,0,0.3)] text-[var(--clr-linen)] font-ui text-[16px] placeholder-[var(--clr-fog)] outline-none border border-[rgba(184,143,91,0.3)] focus:border-[var(--clr-gold)] transition-all"
      />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email Address"
        className="w-full px-6 py-4 rounded-full bg-[rgba(0,0,0,0.3)] text-[var(--clr-linen)] font-ui text-[16px] placeholder-[var(--clr-fog)] outline-none border border-[rgba(184,143,91,0.3)] focus:border-[var(--clr-gold)] transition-all"
      />
      <div className="relative">
        <input
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full px-6 py-4 rounded-full bg-[rgba(0,0,0,0.3)] text-[var(--clr-linen)] font-ui text-[16px] placeholder-[var(--clr-fog)] outline-none border border-[rgba(184,143,91,0.3)] focus:border-[var(--clr-gold)] transition-all"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--clr-fog)] hover:text-[var(--clr-gold)] transition-colors p-2"
        >
          {showPassword ? <EyeClosed size={20} /> : <Eye size={20} />}
        </button>
      </div>

      <Button variant="primary" className="w-full mt-4" disabled={registerMutation.isPending}>
        {registerMutation.isPending ? <Spinner className="animate-spin" size={20} /> : 'CREATE MY VAULT'}
      </Button>
    </form>
  );
};