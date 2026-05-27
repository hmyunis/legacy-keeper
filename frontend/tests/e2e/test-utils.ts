import { type Page } from '@playwright/test';

export const AUTH_STORAGE_KEY = 'legacy_keeper_auth_v6';

export type VaultSummary = {
  id: string;
  name: string;
  role: string;
  joinedAt?: string;
};

export type InvitationSummary = {
  id: string;
  vaultId: string;
  vaultName: string;
  role: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  invitedByName?: string | null;
  createdAt?: string;
};

export type UserFixture = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  is_verified?: boolean;
  vaultId?: string;
  avatar?: string;
  vaults?: VaultSummary[];
  pendingInvitations?: InvitationSummary[];
};

export type AuthResponseFixture = {
  user: UserFixture;
  accessToken: string;
  refreshToken: string;
};

export type ApiFixture = {
  login?: AuthResponseFixture;
  register?: AuthResponseFixture;
  profile?: UserFixture;
  profileUpdate?: UserFixture;
  dashboardSummary?: Record<string, unknown>;
  members?: unknown[];
  searchTags?: string[];
  searchResults?: unknown[];
  memoryList?: unknown[];
  verifyEmail?: Record<string, unknown>;
  resendVerification?: Record<string, unknown>;
  passwordResetRequest?: Record<string, unknown>;
  passwordResetConfirm?: Record<string, unknown>;
  initVault?: Record<string, unknown>;
  firstRelative?: Record<string, unknown>;
  invitationActionResponse?: Record<string, unknown>;
  settingsUpdate?: Record<string, unknown>;
  pushStatus?: { enabled: boolean };
  taskStatus?: Record<string, unknown>;
  collections?: Array<{ id: string | null; name: string; memory_count?: number }>;
  uploadedMemory?: unknown;
  memoryDetail?: unknown;
  updatedMemory?: unknown;
  decideSuggestion?: Record<string, unknown>;
  lineageGraph?: { nodes: any[]; edges: any[] };
  graftBranch?: { personId: string };
  capsules?: any[];
  sealCapsule?: any;
  openCapsule?: any;
};

export function makeUser(overrides: Partial<UserFixture> = {}): UserFixture {
  return {
    id: 'user-1',
    fullName: 'Curator Example',
    email: 'curator@example.com',
    role: 'CURATOR',
    is_verified: true,
    vaults: [],
    pendingInvitations: [],
    ...overrides,
  };
}

export function makeAuthResponse(user: UserFixture): AuthResponseFixture {
  return {
    user,
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
  };
}

export async function seedAuthState(
  page: Page,
  state: {
    currentUser: UserFixture | null;
    isAuthenticated: boolean;
    accessToken: string | null;
    refreshToken: string | null;
    activeVaultId: string | null;
  }
) {
  await page.addInitScript(({ key, value }) => {
    localStorage.setItem(key, JSON.stringify(value));
  }, {
    key: AUTH_STORAGE_KEY,
    value: {
      state,
      version: 0,
    },
  });
}

export async function installApiMocks(page: Page, fixture: ApiFixture = {}) {
  const capsules = Array.isArray(fixture.capsules) ? [...fixture.capsules] : [];

  await page.route(/\/api\/(auth|vaults|tasks|shares|invite-links)\//, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const { pathname } = url;
    const method = request.method();

    const reply = async (payload: unknown, status = 200) => {
      await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(payload),
      });
    };

    const notFound = async () => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: `No mock configured for ${method} ${pathname}` }),
      });
    };

    // Authentication Mocks
    if (method === 'POST' && pathname.endsWith('/auth/login/')) return reply(fixture.login ?? makeAuthResponse(makeUser()));
    if (method === 'POST' && pathname.endsWith('/auth/register/')) return reply(fixture.register ?? makeAuthResponse(makeUser({ is_verified: false })));
    if (method === 'POST' && pathname.endsWith('/auth/verify-email/')) return reply(fixture.verifyEmail ?? {});
    if (method === 'POST' && pathname.endsWith('/auth/verify-email/resend/')) return reply(fixture.resendVerification ?? {});
    if (method === 'POST' && pathname.endsWith('/auth/password-reset/request/')) return reply(fixture.passwordResetRequest ?? {});
    if (method === 'POST' && pathname.endsWith('/auth/password-reset/confirm/')) return reply(fixture.passwordResetConfirm ?? {});
    if (method === 'GET' && pathname.endsWith('/auth/profile/')) return reply(fixture.profile ?? makeUser());
    if (method === 'PUT' && pathname.endsWith('/auth/profile/')) return reply(fixture.profileUpdate ?? fixture.profile ?? makeUser());
    if (method === 'GET' && pathname.endsWith('/auth/push-status/')) return reply(fixture.pushStatus ?? { enabled: false });
    if (method === 'POST' && pathname.endsWith('/auth/push-test/')) return reply({ sent: 1, failed: 0, deleted: 0 });

    // Onboarding Mocks
    if (method === 'POST' && pathname.endsWith('/auth/onboarding/init-vault/')) return reply(fixture.initVault ?? { vaultId: 'vault-new', name: 'Family Vault', role: 'ADMIN' });
    if (method === 'POST' && pathname.endsWith('/auth/onboarding/first-relative/')) return reply(fixture.firstRelative ?? { personId: 'person-1' });

    // Governance & Pacts
    if (method === 'POST' && pathname.includes('/members/invitations/') && !pathname.endsWith('/members/invitations/')) return reply(fixture.invitationActionResponse ?? {});
    if (method === 'PUT' && pathname.includes('/settings/')) return reply(fixture.settingsUpdate ?? {});
    if (method === 'GET' && pathname.endsWith('/members/')) return reply(fixture.members ?? []);
    if (method === 'GET' && pathname.endsWith('/pacts/')) return reply([]);
    if (method === 'GET' && pathname.endsWith('/pacts/history/')) return reply([]);

    // Search Mocks
    if (method === 'GET' && pathname.endsWith('/search/tags/')) return reply(fixture.searchTags ?? []);
    if (method === 'GET' && pathname.endsWith('/search/vibe/')) return reply(fixture.searchResults ?? []);
    if (method === 'POST' && pathname.endsWith('/search/vibe/')) return reply({ task_id: 'task-1', status: 'PROCESSING', progress: 5, stage: 'Queued for deep search' });

    // Lineage Graph Mocks
    if (method === 'GET' && pathname.endsWith('/lineage/')) return reply(fixture.lineageGraph ?? { nodes: [], edges: [] });
    if (method === 'POST' && pathname.endsWith('/lineage/graft/')) return reply(fixture.graftBranch ?? { personId: 'person-new' });

    // Capsules
    if (method === 'GET' && pathname.endsWith('/capsules/')) return reply(capsules);
    if (method === 'POST' && pathname.endsWith('/capsules/')) {
      const createdCapsule = fixture.sealCapsule ?? {};
      if (createdCapsule && typeof createdCapsule === 'object') {
        capsules.unshift(createdCapsule);
      }
      return reply(createdCapsule);
    }
    if (method === 'POST' && pathname.includes('/capsules/') && pathname.endsWith('/open/')) return reply(fixture.openCapsule ?? {});

    // General Memories Mocks
    if (method === 'GET' && pathname.endsWith('/dashboard/summary/')) return reply(fixture.dashboardSummary ?? {});
    if (method === 'GET' && pathname.endsWith('/memories/')) return reply({ count: (fixture.memoryList as any[])?.length || 0, next: null, previous: null, results: fixture.memoryList ?? [] });
    if (method === 'POST' && pathname.match(/\/vaults\/[^/]+\/memories\/$/)) return reply(fixture.uploadedMemory ?? { id: 'mem-1', title: 'Uploaded Memory', url: '/placeholder-museum.jpg' });
    if (method === 'GET' && pathname.match(/\/vaults\/[^/]+\/memories\/[^/]+\/$/)) return reply(fixture.memoryDetail ?? { id: 'mem-1', title: 'Uploaded Memory', url: '/placeholder-museum.jpg', ai_suggestions: {} });
    if (method === 'PATCH' && pathname.match(/\/vaults\/[^/]+\/memories\/[^/]+\/$/)) return reply(fixture.updatedMemory ?? fixture.memoryDetail ?? { id: 'mem-1', title: 'Updated Memory', url: '/placeholder-museum.jpg', ai_suggestions: {} });
    if (method === 'POST' && pathname.match(/\/vaults\/[^/]+\/memories\/[^/]+\/suggestions\/[a-zA-Z_]+\/$/)) return reply(fixture.decideSuggestion ?? {});
    if (method === 'GET' && pathname.endsWith('/memories/collections/')) return reply({ count: 0, next: null, previous: null, results: fixture.collections ?? [] });
    if (method === 'POST' && pathname.endsWith('/memories/collections/')) return reply(fixture.collections && fixture.collections[0] ? fixture.collections[0] : { id: 'col-1', name: 'New Collection', memory_count: 0 });
    if (method === 'DELETE' && pathname.match(/\/memories\/collections\/[^/]+\/$/)) return reply({}, 204);
    if (method === 'GET' && pathname.endsWith('/memories/filters/')) return reply({ clusters: [], decades: [] });

    // Task & Worker Mocks
    if (method === 'GET' && /\/tasks\/[^/]+\/$/.test(pathname)) return reply(fixture.taskStatus ?? { status: 'READY', progress: 100, stage: 'Complete', result: { results: [] }, error: null });
    if (method === 'POST' && /\/tasks\/[^/]+\/cancel\/$/.test(pathname)) return reply({ status: 'CANCELLED', progress: 0, stage: 'Cancelled', result: null, error: null });

    return notFound();
  });
}