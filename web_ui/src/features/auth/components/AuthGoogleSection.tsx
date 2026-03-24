import type { FC } from 'react';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';

interface AuthGoogleSectionProps {
  clientId: string;
  onCredential: (idToken: string) => void;
  onError: (message: string) => void;
}

export const AuthGoogleSection: FC<AuthGoogleSectionProps> = ({
  clientId,
  onCredential,
  onError,
}) => (
  <div className="space-y-4">
    <div className="relative">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-slate-200 dark:border-slate-800" />
      </div>
      <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-400 bg-slate-50 dark:bg-slate-950 px-2 tracking-widest">
        Or continue with
      </div>
    </div>
    <GoogleSignInButton
      clientId={clientId}
      onCredential={onCredential}
      onError={onError}
    />
  </div>
);
