import { Outlet, useLocation } from '@tanstack/react-router';
import { useMemo } from 'react';
import Layout from '@/components/Layout';
import { useUIStore } from '@/stores/uiStore';

const PATH_TO_TAB: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/vault': 'Vault',
  '/timeline': 'Timeline',
  '/tree': 'Family Tree',
  '/members': 'Members',
  '/logs': 'Audit Logs',
  '/help': 'Help Center',
  '/settings': 'Settings',
};

export const ProtectedLayout = () => {
  const { theme, toggleTheme } = useUIStore();
  const location = useLocation();
  const activeTab = useMemo(() => PATH_TO_TAB[location.pathname] || '', [location.pathname]);

  return (
    <Layout activeTab={activeTab} theme={theme} onToggleTheme={toggleTheme}>
      <Outlet />
    </Layout>
  );
};
