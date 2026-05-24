import { createRouter, createRoute, createRootRoute, Outlet } from '@tanstack/react-router';
import { PublicLayout } from './components/layout/PublicLayout';
import { AppLayout } from './components/layout/AppLayout';
import { requireAuth, redirectIfAuthenticated, requirePendingVerification, requireAdmin } from './lib/routeGuards';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Museum from './pages/Museum';
import Dashboard from './pages/Dashboard';
import Vault from './pages/Vault';
import FamilyTree from './pages/FamilyTree';
import PersonProfile from './pages/PersonProfile';
import Timeline from './pages/Timeline';
import Capsules from './pages/Capsules';
import Search from './pages/Search';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import Onboarding from './pages/Onboarding';
import VaultSelect from './pages/VaultSelect';
import InvitationInbox from './pages/InvitationInbox';
import Help from './pages/Help';
import Logs from './pages/Logs';
import Members from './pages/Members';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

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
  component: Auth,
  beforeLoad: redirectIfAuthenticated,
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
});

const forgotPasswordRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: 'forgot-password',
  component: ForgotPassword,
  beforeLoad: redirectIfAuthenticated,
});

const resetPasswordRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: 'reset-password',
  component: ResetPassword,
  beforeLoad: redirectIfAuthenticated,
  validateSearch: (search: Record<string, unknown>): { email?: string } => ({
    email: typeof search.email === 'string' ? search.email : undefined,
  }),
});

const verifyEmailRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: 'verify-email',
  component: VerifyEmail,
  beforeLoad: requirePendingVerification,
});

// ── Protected app ─────────────────────────────────────────────────────────

const dashboardRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: 'dashboard',
  component: Dashboard,
});

const vaultRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: 'vault',
  component: Vault,
});

const treeRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: 'tree',
  component: FamilyTree,
});

const personRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: 'person/$personId',
  component: PersonProfile,
});

const timelineRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: 'timeline',
  component: Timeline,
});

const capsulesRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: 'capsules',
  component: Capsules,
});

const searchRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: 'search',
  component: Search,
});

const helpRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: 'help',
  component: Help,
});

const logsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: 'logs',
  component: Logs,
  beforeLoad: requireAdmin,
});

const membersRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: 'members',
  component: Members,
  beforeLoad: requireAdmin,
});

const settingsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: 'settings',
  component: Settings,
  beforeLoad: requireAdmin,
  validateSearch: (search: Record<string, unknown>): { tab?: string } => ({
    tab: typeof search.tab === 'string' ? search.tab : undefined,
  }),
});

// ── Fullscreen immersive (no shell navbar) ────────────────────────────────

const museumRoute = createRoute({
  getParentRoute: () => fullscreenLayoutRoute,
  path: 'museum',
  component: Museum,
  beforeLoad: requireAuth,
});

const onboardingRoute = createRoute({
  getParentRoute: () => fullscreenLayoutRoute,
  path: 'onboarding',
  component: Onboarding,
  beforeLoad: requireAuth,
});

const invitationInboxRoute = createRoute({
  getParentRoute: () => fullscreenLayoutRoute,
  path: 'invitation-inbox',
  component: InvitationInbox,
  beforeLoad: requireAuth,
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
});

const vaultSelectRoute = createRoute({
  getParentRoute: () => fullscreenLayoutRoute,
  path: 'vault-select',
  component: VaultSelect,
  beforeLoad: requireAuth,
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
});

const notFoundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '*',
  component: NotFound,
});

const routeTree = rootRoute.addChildren([
  notFoundRoute,
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
  fullscreenLayoutRoute.addChildren([museumRoute, onboardingRoute, vaultSelectRoute, invitationInboxRoute]),
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
