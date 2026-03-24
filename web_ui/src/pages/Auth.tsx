import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useLocation, useNavigate, useSearch } from '@tanstack/react-router';
import { AuthCredentialsForm } from '@/features/auth/components/AuthCredentialsForm';
import { AuthGoogleSection } from '@/features/auth/components/AuthGoogleSection';
import { AuthMarketingPanel } from '@/features/auth/components/AuthMarketingPanel';
import { AuthMobileBrand } from '@/features/auth/components/AuthMobileBrand';
import { AuthModeHeader } from '@/features/auth/components/AuthModeHeader';
import { AuthModeToggle } from '@/features/auth/components/AuthModeToggle';
import { AuthSecurityBadge } from '@/features/auth/components/AuthSecurityBadge';
import {
  buildAuthRouteSearch,
  buildVerifyRouteSearch,
  getPostAuthNavigationTarget,
  isEmailNotVerifiedError,
  resolveAuthMode,
  resolveAuthSearch,
} from '@/features/auth/selectors';
import type { AuthFormState, AuthMode } from '@/features/auth/types';
import { useGoogleLogin, useLogin, useRegister } from '@/hooks/useAuth';
import { appEnv, isGoogleOAuthEnabled } from '@/services/env';
import { useAuthStore } from '@/stores/authStore';

const Auth: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const search = useSearch({ strict: false }) as { joinToken?: string; redirect?: string };
  const { joinToken, redirectPath } = resolveAuthSearch(search);

  const [mode, setMode] = useState<AuthMode>(resolveAuthMode(location.pathname));
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<AuthFormState>({
    fullName: '',
    email: '',
    password: '',
  });

  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const googleLoginMutation = useGoogleLogin();
  const authRouteSearch = buildAuthRouteSearch({ joinToken, redirectPath });

  const isLoading = useMemo(
    () => loginMutation.isPending || registerMutation.isPending || googleLoginMutation.isPending,
    [googleLoginMutation.isPending, loginMutation.isPending, registerMutation.isPending],
  );

  const navigateAfterAuth = () => {
    const target = getPostAuthNavigationTarget({ joinToken, redirectPath });
    navigate(target as any);
  };

  useEffect(() => {
    setMode(resolveAuthMode(location.pathname));
  }, [location.pathname]);

  useEffect(() => {
    if (!isAuthenticated) return;
    navigateAfterAuth();
  }, [isAuthenticated, joinToken, navigate, redirectPath]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (mode === 'login') {
      loginMutation.mutate(
        { email: formData.email, password: formData.password },
        {
          onSuccess: () => navigateAfterAuth(),
          onError: (error) => {
            if (!isEmailNotVerifiedError(error)) return;

            navigate(
              {
                to: '/verify',
                search: buildVerifyRouteSearch({
                  email: formData.email,
                  joinToken,
                  redirectPath,
                }),
              } as any,
            );
          },
        },
      );
      return;
    }

    registerMutation.mutate(
      {
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        ...(joinToken ? { joinToken } : {}),
      },
      {
        onSuccess: () => {
          setMode('login');
          navigate(
            {
              to: '/verify',
              search: buildVerifyRouteSearch({
                email: formData.email,
                joinToken,
                redirectPath,
              }),
            } as any,
          );
        },
      },
    );
  };

  const handleGoogleCredential = (idToken: string) => {
    googleLoginMutation.mutate({ idToken }, { onSuccess: () => navigateAfterAuth() });
  };

  const handleGoogleError = (message: string) => {
    toast.error('Google sign-in unavailable.', { description: message });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col lg:flex-row transition-colors duration-500 overflow-x-hidden">
      <AuthMarketingPanel />

      <div className="flex-1 flex flex-col justify-center p-6 sm:p-12 lg:p-20 relative overflow-y-auto min-h-screen lg:min-h-0">
        <div className="max-w-md w-full mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700 py-10 lg:py-0">
          <AuthMobileBrand />
          <AuthModeHeader mode={mode} />
          <AuthModeToggle
            mode={mode}
            onSelectLogin={() => {
              setMode('login');
              navigate({
                to: '/login',
                search: authRouteSearch,
              } as any);
            }}
            onSelectSignup={() => {
              setMode('signup');
              navigate({
                to: '/signup',
                search: authRouteSearch,
              } as any);
            }}
          />

          <AuthCredentialsForm
            mode={mode}
            formData={formData}
            showPassword={showPassword}
            isLoading={isLoading}
            onSubmit={handleSubmit}
            onFullNameChange={(fullName) => setFormData((previous) => ({ ...previous, fullName }))}
            onEmailChange={(email) => setFormData((previous) => ({ ...previous, email }))}
            onPasswordChange={(password) => setFormData((previous) => ({ ...previous, password }))}
            onTogglePassword={() => setShowPassword((previous) => !previous)}
          />

          {isGoogleOAuthEnabled && (
            <AuthGoogleSection
              clientId={appEnv.googleClientId}
              onCredential={handleGoogleCredential}
              onError={handleGoogleError}
            />
          )}

          <AuthSecurityBadge />
        </div>
      </div>
    </div>
  );
};

export default Auth;
