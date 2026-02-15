import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { Toaster } from 'sonner';
import { router } from '@/app/router';
import { useAuthBootstrap } from '@/hooks/useAuthBootstrap';
import { LanguageProvider } from '@/i18n/LanguageContext';
import { useUIStore, applyPrimaryColor } from '@/stores/uiStore';

const queryClient = new QueryClient();

const App: React.FC = () => {
  const { theme, primaryColor } = useUIStore();
  useAuthBootstrap();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    applyPrimaryColor(primaryColor);
  }, [primaryColor]);

  return (
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster position="top-right" expand={false} richColors theme={theme} closeButton />
      </QueryClientProvider>
    </LanguageProvider>
  );
};

export default App;
