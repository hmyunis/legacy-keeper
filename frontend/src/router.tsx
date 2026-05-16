import { createRouter, createRoute, createRootRoute, Outlet } from '@tanstack/react-router';
import { PublicLayout } from './components/layout/PublicLayout';
import { AppLayout } from './components/layout/AppLayout';
import { requireAuth, redirectIfAuthenticated } from './features/auth/utils/routeGuards';
import Landing from './pages/Landing';
import AuthPage from './features/auth/pages/AuthPage';
import MuseumPage from './features/museum/pages/MuseumPage';
import DashboardPage from './features/dashboard/pages/DashboardPage';
import VaultPage from './features/vault/pages/VaultPage';
import FamilyTreePage from './features/family-tree/pages/FamilyTreePage';
import PersonProfilePage from './features/chronicles/pages/PersonProfilePage';
import TimelinePage from './features/chronicles/pages/TimelinePage';
import SearchPage from './features/search/pages/SearchPage';
import ForgotPasswordPage from './features/auth/pages/ForgotPasswordPage';
import ResetPasswordPage from './features/auth/pages/ResetPasswordPage';
import VerifyEmailPage from './features/auth/pages/VerifyEmailPage';
import Onboarding from './pages/Onboarding';
import HelpPage from './features/help/pages/HelpPage';
import LogsPage from './features/logs/pages/LogsPage';
import SettingsPage from './features/settings/pages/SettingsPage';
import CapsulesPage from './features/capsules/pages/CapsulesPage';
import MembersPage from './features/governance/pages/MembersPage';

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const publicLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'public-layout',
  component: PublicLayout,
});

const appLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'app-layout',
  component: AppLayout,
  beforeLoad: requireAuth,
});

const fullscreenLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'fullscreen-layout',
  component: () => <Outlet />,
});

// ── Public (marketing & auth) ─────────────────────────────────────────────

const indexRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: '/',
  component: Landing,
});

const authRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: 'auth',
  component: AuthPage,
  beforeLoad: redirectIfAuthenticated,
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
});

const forgotPasswordRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: 'forgot-password',
  component: ForgotPasswordPage,
  beforeLoad: redirectIfAuthenticated,
});

const resetPasswordRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: 'reset-password',
  component: ResetPasswordPage,
  beforeLoad: redirectIfAuthenticated,
});

const verifyEmailRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: 'verify-email',
  component: VerifyEmailPage,
  beforeLoad: redirectIfAuthenticated,
});

// ── Protected app ─────────────────────────────────────────────────────────

const dashboardRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: 'dashboard',
  component: DashboardPage,
});

const vaultRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: 'vault',
  component: VaultPage,
});

const treeRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: 'tree',
  component: FamilyTreePage,
});

const personRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: 'person/$personId',
  component: PersonProfilePage,
});

const timelineRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: 'timeline',
  component: TimelinePage,
});

const capsulesRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: 'capsules',
  component: CapsulesPage,
});

const searchRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: 'search',
  component: SearchPage,
});

const helpRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: 'help',
  component: HelpPage,
});

const logsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: 'logs',
  component: LogsPage,
});

const membersRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: 'members',
  component: MembersPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: 'settings',
  component: SettingsPage,
});

// ── Fullscreen immersive (no shell navbar) ────────────────────────────────

const museumRoute = createRoute({
  getParentRoute: () => fullscreenLayoutRoute,
  path: 'museum',
  component: MuseumPage,
  beforeLoad: requireAuth,
});

const onboardingRoute = createRoute({
  getParentRoute: () => fullscreenLayoutRoute,
  path: 'onboarding',
  component: Onboarding,
  beforeLoad: requireAuth,
});

const routeTree = rootRoute.addChildren([
  publicLayoutRoute.addChildren([
    indexRoute,
    authRoute,
    forgotPasswordRoute,
    resetPasswordRoute,
    verifyEmailRoute,
  ]),
  appLayoutRoute.addChildren([
    dashboardRoute,
    vaultRoute,
    treeRoute,
    personRoute,
    timelineRoute,
    capsulesRoute,
    searchRoute,
    helpRoute,
    logsRoute,
    membersRoute,
    settingsRoute,
  ]),
  fullscreenLayoutRoute.addChildren([museumRoute, onboardingRoute]),
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
