import {
  createBrowserHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  useSearch,
} from '@tanstack/react-router';
import { ProtectedLayout } from '@/app/ProtectedLayout';
import { requireAuthenticated, requireRoles } from '@/app/routeGuards';
import Auth from '@/pages/Auth';
import AuditLogs from '@/pages/AuditLogs';
import Dashboard from '@/pages/Dashboard';
import FamilyTree from '@/pages/FamilyTree';
import HelpCenter from '@/pages/HelpCenter';
import JoinVault from '@/pages/JoinVault';
import Landing from '@/pages/Landing';
import Members from '@/pages/Members';
import Settings from '@/pages/Settings';
import Timeline from '@/pages/Timeline';
import Unauthorized from '@/pages/Unauthorized';
import Vault from '@/pages/Vault';
import VerifyEmail from '@/pages/VerifyEmail';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import { MediaType, UserRole } from '@/types';

const browserHistory = createBrowserHistory();

const ALL_ROLES = [UserRole.ADMIN, UserRole.CONTRIBUTOR, UserRole.VIEWER] as const;
const SETTINGS_TABS = ['profile', 'vault', 'notifications', 'appearance', 'subscription'] as const;
const LOG_CATEGORIES = ['All', 'Uploads', 'Access', 'System', 'Management'] as const;
const LOG_TIMEFRAMES = ['ALL', 'DAY', 'WEEK', 'MONTH'] as const;
const VAULT_SORT = ['newest', 'oldest', 'title'] as const;
const VAULT_VIEW = ['grid', 'list'] as const;
const VAULT_TAB = ['all', 'favorites'] as const;
const MEMBER_ROLE_FILTER = ['ALL', UserRole.CONTRIBUTOR, UserRole.VIEWER] as const;

const asString = (value: unknown) => (typeof value === 'string' ? value : undefined);
const asDateString = (value: unknown) =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const landingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Landing,
});

const authRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  validateSearch: (search: Record<string, unknown>) => ({
    joinToken: asString(search.joinToken),
    redirect: asString(search.redirect),
  }),
  component: Auth,
});

const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/signup',
  validateSearch: (search: Record<string, unknown>) => ({
    joinToken: asString(search.joinToken),
    redirect: asString(search.redirect),
  }),
  component: Auth,
});

const verifyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/verify',
  component: VerifyEmail,
});

const forgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/forgot-password',
  validateSearch: (search: Record<string, unknown>) => ({
    email: asString(search.email),
  }),
  component: ForgotPassword,
});

const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reset-password',
  validateSearch: (search: Record<string, unknown>) => ({
    token: asString(search.token),
    email: asString(search.email),
  }),
  component: ResetPassword,
});

const joinVaultRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/join/$token',
  component: JoinVault,
});

const protectedRoot = createRoute({
  getParentRoute: () => rootRoute,
  id: 'protected',
  beforeLoad: requireAuthenticated,
  component: ProtectedLayout,
});

const dashboardRoute = createRoute({
  getParentRoute: () => protectedRoot,
  path: '/dashboard',
  beforeLoad: requireRoles(ALL_ROLES),
  component: Dashboard,
});

const vaultRoute = createRoute({
  getParentRoute: () => protectedRoot,
  path: '/vault',
  validateSearch: (search: Record<string, unknown>) => ({
    q: asString(search.q),
    action: asString(search.action),
    person: asString(search.person),
    people: asString(search.people),
    locations: asString(search.locations),
    types:
      typeof search.types === 'string'
        ? search.types
            .split(',')
            .map((value) => value.trim())
            .filter((value) => (Object.values(MediaType) as string[]).includes(value))
            .join(',')
        : undefined,
    era: asString(search.era),
    startDate: asDateString(search.startDate),
    endDate: asDateString(search.endDate),
    sort: VAULT_SORT.includes(search.sort as any) ? (search.sort as string) : 'newest',
    view: VAULT_VIEW.includes(search.view as any) ? (search.view as string) : 'grid',
    tab: VAULT_TAB.includes(search.tab as any) ? (search.tab as 'all' | 'favorites') : 'all',
  }),
  beforeLoad: requireRoles(ALL_ROLES),
  component: () => {
    const { q, action, person, people, locations, types, era, startDate, endDate, sort, view, tab } = useSearch({
      from: vaultRoute.id,
    });

    return (
      <Vault
        initialSearch={q}
        initialAction={action}
        initialPerson={person}
        initialPeople={people ? people.split(',').filter(Boolean) : []}
        initialLocations={locations ? locations.split(',').filter(Boolean) : []}
        initialTypes={
          types
            ? (types
                .split(',')
                .filter((value) => (Object.values(MediaType) as string[]).includes(value)) as MediaType[])
            : []
        }
        initialEra={era || null}
        initialStartDate={startDate}
        initialEndDate={endDate}
        initialSort={sort}
        initialView={view}
        initialTab={tab}
      />
    );
  },
});

const timelineRoute = createRoute({
  getParentRoute: () => protectedRoot,
  path: '/timeline',
  validateSearch: (search: Record<string, unknown>) => ({
    decade: asString(search.decade),
  }),
  beforeLoad: requireRoles(ALL_ROLES),
  component: Timeline,
});

const treeRoute = createRoute({
  getParentRoute: () => protectedRoot,
  path: '/tree',
  beforeLoad: requireRoles(ALL_ROLES),
  component: FamilyTree,
});

const membersRoute = createRoute({
  getParentRoute: () => protectedRoot,
  path: '/members',
  validateSearch: (search: Record<string, unknown>) => ({
    q: asString(search.q),
    role: MEMBER_ROLE_FILTER.includes(search.role as any) ? (search.role as string) : 'ALL',
  }),
  beforeLoad: requireRoles([UserRole.ADMIN]),
  component: Members,
});

const logsRoute = createRoute({
  getParentRoute: () => protectedRoot,
  path: '/logs',
  validateSearch: (search: Record<string, unknown>) => ({
    category: LOG_CATEGORIES.includes(search.category as any) ? (search.category as string) : 'All',
    timeframe: LOG_TIMEFRAMES.includes(search.timeframe as any) ? (search.timeframe as string) : 'ALL',
  }),
  beforeLoad: requireRoles([UserRole.ADMIN]),
  component: AuditLogs,
});

const helpRoute = createRoute({
  getParentRoute: () => protectedRoot,
  path: '/help',
  beforeLoad: requireRoles(ALL_ROLES),
  component: HelpCenter,
});

const settingsRoute = createRoute({
  getParentRoute: () => protectedRoot,
  path: '/settings',
  validateSearch: (search: Record<string, unknown>) => ({
    tab: SETTINGS_TABS.includes(search.tab as any) ? (search.tab as string) : 'profile',
  }),
  beforeLoad: requireRoles(ALL_ROLES),
  component: Settings,
});

const unauthorizedRoute = createRoute({
  getParentRoute: () => protectedRoot,
  path: '/unauthorized',
  component: Unauthorized,
});

const routeTree = rootRoute.addChildren([
  landingRoute,
  authRoute,
  signupRoute,
  verifyRoute,
  forgotPasswordRoute,
  resetPasswordRoute,
  joinVaultRoute,
  protectedRoot.addChildren([
    dashboardRoute,
    vaultRoute,
    timelineRoute,
    treeRoute,
    membersRoute,
    logsRoute,
    helpRoute,
    settingsRoute,
    unauthorizedRoute,
  ]),
]);

export const router = createRouter({
  routeTree,
  history: browserHistory,
  defaultPreload: 'intent',
} as any);

(window as any).router = router;
