
import React, { useEffect, useMemo } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { 
  createRootRoute, 
  createRoute, 
  createRouter, 
  RouterProvider, 
  Outlet, 
  useNavigate,
  createMemoryHistory,
  useSearch
} from '@tanstack/react-router';
import { Toaster } from 'sonner';
import { useAuthStore } from './stores/authStore';
import { useUIStore, applyPrimaryColor } from './stores/uiStore';
import { LanguageProvider } from './i18n/LanguageContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Vault from './pages/Vault';
import Timeline from './pages/Timeline';
import FamilyTree from './pages/FamilyTree';
import AuditLogs from './pages/AuditLogs';
import Members from './pages/Members';
import Settings from './pages/Settings';
import HelpCenter from './pages/HelpCenter';
import Landing from './pages/Landing';
import Auth from './pages/Auth';

// Initialize QueryClient for archival data management
const queryClient = new QueryClient();

// Memory History is more reliable in sandboxed/blob-origin environments where pushState is restricted.
const memoryHistory = createMemoryHistory({
  initialEntries: ['/landing'],
});

// Root Route & Router Definition
const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

// Auth Guard Layout
const ProtectedLayout: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const { theme, toggleTheme } = useUIStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: '/landing' });
    }
  }, [isAuthenticated, navigate]);

  const activeTab = useMemo(() => {
    const path = router.state.location.pathname;
    switch (path) {
      case '/': return 'Dashboard';
      case '/vault': return 'Vault';
      case '/timeline': return 'Timeline';
      case '/tree': return 'Family Tree';
      case '/members': return 'Members';
      case '/logs': return 'Audit Logs';
      case '/help': return 'Help Center';
      case '/settings': return 'Settings';
      default: return 'Dashboard';
    }
  }, [router.state.location.pathname]);

  if (!isAuthenticated) return null;

  return (
    <Layout 
      activeTab={activeTab} 
      theme={theme} 
      onToggleTheme={toggleTheme}
    >
      <Outlet />
    </Layout>
  );
};

const landingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/landing',
  component: Landing,
});

const authRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: Auth,
});

const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/signup',
  component: Auth,
});

const protectedRoot = createRoute({
  getParentRoute: () => rootRoute,
  id: 'protected',
  component: ProtectedLayout,
});

const dashboardRoute = createRoute({
  getParentRoute: () => protectedRoot,
  path: '/',
  component: Dashboard,
});

const vaultRoute = createRoute({
  getParentRoute: () => protectedRoot,
  path: '/vault',
  validateSearch: (search: Record<string, unknown>) => ({
    q: (search.q as string) || undefined,
    action: (search.action as string) || undefined,
    person: (search.person as string) || undefined,
  }),
  component: () => {
    const { q, action, person } = useSearch({ from: vaultRoute.id });
    return <Vault initialSearch={q} initialAction={action} initialPerson={person} />;
  },
});

const timelineRoute = createRoute({
  getParentRoute: () => protectedRoot,
  path: '/timeline',
  component: Timeline,
});

const treeRoute = createRoute({
  getParentRoute: () => protectedRoot,
  path: '/tree',
  component: FamilyTree,
});

const membersRoute = createRoute({
  getParentRoute: () => protectedRoot,
  path: '/members',
  component: Members,
});

const logsRoute = createRoute({
  getParentRoute: () => protectedRoot,
  path: '/logs',
  component: AuditLogs,
});

const helpRoute = createRoute({
  getParentRoute: () => protectedRoot,
  path: '/help',
  component: HelpCenter,
});

const settingsRoute = createRoute({
  getParentRoute: () => protectedRoot,
  path: '/settings',
  component: Settings,
});

const routeTree = rootRoute.addChildren([
  landingRoute,
  authRoute,
  signupRoute,
  protectedRoot.addChildren([
    dashboardRoute,
    vaultRoute,
    timelineRoute,
    treeRoute,
    membersRoute,
    logsRoute,
    helpRoute,
    settingsRoute,
  ]),
]);

const router = createRouter({ 
  routeTree,
  history: memoryHistory,
  defaultPreload: 'intent',
} as any);

// Expose router globally so non-component code can navigate safely
(window as any).router = router;

const App: React.FC = () => {
  const { theme, primaryColor } = useUIStore();

  // Global Theme & Color Sync
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
