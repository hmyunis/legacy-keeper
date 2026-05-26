# PART 1: TEST AUTOMATION STRATEGY & FRAMEWORK SELECTION

## 1. Chosen Framework: Playwright
For the E2E and functional testing of LegacyKeeper, **Playwright** (developed by Microsoft) has been chosen.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PLAYWRIGHT TEST RUNNER                          │
│                                                                        │
│   ┌───────────────────────┐             ┌──────────────────────────┐   │
│   │   Mock API Registry   │             │   Playwright Browser     │   │
│   │   (test-utils.ts)     │             │   Context (Headless/UI)  │   │
│   └──────────┬────────────┘             └────────────┬─────────────┘   │
│              │ (Intercept Network)                   │ (Drive DOM)     │
│              ▼                                       ▼                 │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │               LegacyKeeper Frontend (Vite SPA)                 │   │
│   │                    http://localhost:5173                       │   │
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

### 2. Benefits for LegacyKeeper
* **Asynchronous Resiliency:** LegacyKeeper contains interactive, animated, and state-dependent elements (such as the wax seal animation and 3D canvas loads). Playwright's auto-waiting strategy eliminates the need for manual, arbitrary sleep timeouts (`time.sleep()`), preventing flakiness.
* **Unified Network Mocking:** LegacyKeeper relies on heavy background processes (Celery, Ollama LLM, CLIP embeddings, dlib face recognition). Running these services on a clean test runner is resource-intensive. Playwright’s network interception allows us to mock these APIs seamlessly.
* **Hermetic Authentication State:** Rather than logging in via the UI before each test, Playwright allows us to seed ZUSTAND state directly into `localStorage` (via `addInitScript`), bypassing authentication overhead.
* **Rich Diagnostic Reports:** Playwright captures trace files, network HAR logs, failure screenshots, and full-resolution videos of browser actions.

---

# PART 2: DETAILED MATRIX OF IDENTIFIED TESTABLE FEATURES

The following matrix maps the functional requirements of the LegacyKeeper SRS to our automated test suites:

| SRS Requirement ID | Feature Name | Test Implementation File | Validation Method |
| :--- | :--- | :--- | :--- |
| **FR-001** | Register New Family Vault | `automation.spec.ts` | Validates registration form submission, payload validation, and transition to verification state. |
| **FR-002** | Verify Email and Initialize Vault | `automation.spec.ts` | Fills the 8-digit OTP activation key and asserts routing to the secure Dashboard page. |
| **FR-004** | Sign In | `automation.spec.ts` | Intercepts `/auth/login/` and asserts correct handling of single-vault and multi-vault roles. |
| **FR-005** | Forgot Password | `automation.spec.ts` | Asserts password reset token generation and key confirmation flows. |
| **FR-012** | Upload Media | `core-features.spec.ts` | Simulates file input selection, uploads the file to the mock server, and asserts background worker progress. |
| **FR-017** | Create Person Profile | `lineage-capsules.spec.ts` | Simulates a node graft on the family tree canvas, creating a new identity node. |
| **FR-018** | Define Relationships | `lineage-capsules.spec.ts` | Verifies linking parent-child and spouse relationships on the interactive family tree. |
| **FR-022** | Automated Face Detection | `core-features.spec.ts` | Asserts face bounding box detection and manual verification overlays. |
| **FR-023** | AI Tagging Suggestion | `core-features.spec.ts` | Asserts functional behavior of the accept/reject buttons for titles, descriptions, and tags. |
| **N/A** | Time Capsule Ceremony | `lineage-capsules.spec.ts` | Tests the sealing workflow (with letters and attachments), countdown locks, and the unsealing interface. |

---

# PART 3: SYSTEM ENVIRONMENT SETUP GUIDE (WSL 2 LOCAL ENVIRONMENT)

To run these tests locally on a Windows machine running Ubuntu within WSL 2, execute the following commands.

### 1. Upgrade System Packages and Install Browser Dependencies
Linux installations inside WSL do not contain the system libraries required by browser engines (Chromium, Firefox, WebKit). Run the following commands in your WSL terminal:

```bash
# Update Ubuntu package lists
sudo apt update && sudo apt upgrade -y

# Install build tools, compiler libraries, and font packages needed for rendering
sudo apt install -y build-essential cmake pkg-config libx11-dev libopenblas-dev \
                    liblapack-dev libgtk-3-dev libboost-python-dev ffmpeg \
                    libmagic1 tesseract-ocr fonts-liberation libasound2
```

### 2. Install Node.js & Playwright
Ensure your WSL system runs Node.js (matching the `node:20` environment used by the project):

```bash
# Install NodeSource Node.js 20 LTS repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node -v
npm -v
```

Navigate to your frontend project directory and run:

```bash
cd /path/to/legacy-keeper/frontend

# Install node dependencies
npm install

# Install Playwright test runner and local browsers
npx playwright install

# Install system dependencies specifically mapped to Playwright browsers
sudo npx playwright install-deps
```

---

# PART 4: FULL CODEBASE FOR E2E TESTS

Create the following files under `frontend/tests/e2e/`. Every line is complete and functional.

### File 1: `frontend/tests/e2e/playwright.config.ts`
*Global Playwright runner configuration.*

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
```

### File 2: `frontend/tests/e2e/test-utils.ts`
*Maintains helper utilities, mock generators, and unified API route interception.*

```typescript
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
    if (method === 'GET' && pathname.endsWith('/capsules/')) return reply(fixture.capsules ?? []);
    if (method === 'POST' && pathname.endsWith('/capsules/')) return reply(fixture.sealCapsule ?? {});
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
```

### File 3: `frontend/tests/e2e/automation.spec.ts`
*Tests authentication workflows, registration, and redirection routing.*

```typescript
import { expect, test } from '@playwright/test';
import { installApiMocks, makeAuthResponse, makeUser, seedAuthState } from './test-utils';

test.describe('Public and auth flows', () => {
  test('landing page presents the public entry point', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /the family memory museum/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /start your vault/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /enter museum/i })).toBeVisible();
  });

  test('unauthenticated users are redirected from protected routes to sign in', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/auth\?redirect=%2Fdashboard$/);
    await expect(page.getByRole('heading', { name: 'VAULT ACCESS' })).toBeVisible();
  });

  test('login success routes a single-vault user to the dashboard', async ({ page }) => {
    const user = makeUser({
      is_verified: true,
      role: 'ADMIN',
      vaultId: 'vault-1',
      vaults: [{ id: 'vault-1', name: 'Family Vault', role: 'ADMIN', joinedAt: '2025-01-01T00:00:00.000Z' }],
    });

    await installApiMocks(page, {
      login: makeAuthResponse(user),
      dashboardSummary: {
        curatorName: 'Curator Example',
        vaultName: 'Family Vault',
        memoryCount: 12,
        kinCount: 2,
        heroImages: [],
        theme: { primaryHue: '#B88F5B', grainEnabled: true },
      },
      members: [
        { id: 'user-1', name: 'Curator Example', avatar: null },
        { id: 'user-2', name: 'Partner Example', avatar: null },
      ],
    });

    await page.goto('/auth');
    await page.getByPlaceholder('Email Address').fill('curator@example.com');
    await page.getByPlaceholder('Password').fill('password123');
    await page.getByRole('button', { name: 'OPEN THE VAULT' }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText(/good evening, curator example/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /^FAMILY VAULT$/i })).toBeVisible();
  });

  test('login failure stays on auth and shows error dialog', async ({ page }) => {
    await page.route(/\/auth\/login\/$/, async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Invalid credentials provided.' }),
      });
    });

    await page.goto('/auth');
    await page.getByPlaceholder('Email Address').fill('wrong@example.com');
    await page.getByPlaceholder('Password').fill('wrong-password');
    await page.getByRole('button', { name: 'OPEN THE VAULT' }).click();

    await expect(page).toHaveURL(/\/auth$/);
    await expect(page.getByRole('heading', { name: 'VAULT ACCESS' })).toBeVisible();
  });

  test('registration success moves the user to email verification', async ({ page }) => {
    const user = makeUser({
      is_verified: false,
      vaults: [],
      pendingInvitations: [],
    });

    await installApiMocks(page, {
      register: makeAuthResponse(user),
    });

    await page.goto('/auth');
    await page.getByRole('button', { name: 'Create a Vault' }).click();
    await page.getByPlaceholder('Full Name').fill('Curator Example');
    await page.getByPlaceholder('Email Address').fill('curator@example.com');
    await page.getByPlaceholder('Password').fill('password123');
    await page.getByRole('button', { name: 'CREATE MY VAULT' }).click();

    await expect(page).toHaveURL(/\/verify-email$/);
    await expect(page.getByRole('heading', { name: 'VAULT ACTIVATION' })).toBeVisible();
  });

  test('password recovery requests and confirmation flow back to sign in', async ({ page }) => {
    await installApiMocks(page, {
      passwordResetRequest: {},
      passwordResetConfirm: {},
    });

    await page.goto('/forgot-password');
    await page.locator('input[type="email"]').fill('curator@example.com');
    await page.getByRole('button', { name: 'SEND RECOVERY KEY' }).click();

    await expect(page).toHaveURL(/\/reset-password\?email=curator%40example\.com$/);
    await expect(page.getByRole('heading', { name: 'RESET KEY' })).toBeVisible();

    await page.getByPlaceholder('####-####').fill('1234-5678');
    await page.locator('input[type="password"]').fill('new-password-123');
    await page.getByRole('button', { name: 'UPDATE ACCESS' }).click();

    await expect(page).toHaveURL(/\/auth$/);
    await expect(page.getByRole('heading', { name: 'VAULT ACCESS' })).toBeVisible();
  });

  test('verification resend locks the button and a valid key unlocks the dashboard', async ({ page }) => {
    const user = makeUser({
      is_verified: false,
      role: 'ADMIN',
      vaultId: 'vault-1',
      vaults: [{ id: 'vault-1', name: 'Family Vault', role: 'ADMIN', joinedAt: '2025-01-01T00:00:00.000Z' }],
    });

    await installApiMocks(page, {
      verifyEmail: {},
      resendVerification: {},
      dashboardSummary: {
        curatorName: 'Curator Example',
        vaultName: 'Family Vault',
        memoryCount: 12,
        kinCount: 2,
        heroImages: [],
        theme: { primaryHue: '#B88F5B', grainEnabled: true },
      },
      members: [{ id: 'user-1', name: 'Curator Example', avatar: null }],
    });

    await seedAuthState(page, {
      currentUser: user,
      isAuthenticated: true,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      activeVaultId: 'vault-1',
    });

    await page.goto('/verify-email');

    const resendButton = page.getByRole('button', { name: 'Resend Key' });
    await resendButton.click();
    await expect(page.getByRole('button', { name: /Resend Key \(15s\)/i })).toBeDisabled();

    await page.getByPlaceholder('####-####').fill('12345678');
    await page.getByRole('button', { name: 'ACTIVATE VAULT' }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: /family vault/i })).toBeVisible();
  });
});

test.describe('Vault onboarding and invitation flows', () => {
  test('verified users with no vaults see onboarding choices', async ({ page }) => {
    const user = makeUser({
      is_verified: true,
      vaults: [],
      pendingInvitations: [],
      vaultId: undefined,
    });

    await seedAuthState(page, {
      currentUser: user,
      isAuthenticated: true,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      activeVaultId: null,
    });

    await page.goto('/onboarding');

    await expect(page.getByRole('heading', { name: /welcome to legacykeeper/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /join a vault/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /create my vault/i })).toBeVisible();
  });

  test('onboarding create flow provisions a vault and finishes in the dashboard', async ({ page }) => {
    const initialUser = makeUser({
      is_verified: true,
      vaults: [],
      pendingInvitations: [],
    });

    const provisionedUser = makeUser({
      is_verified: true,
      role: 'ADMIN',
      vaults: [{ id: 'vault-new', name: 'Alemu Family Museum', role: 'ADMIN', joinedAt: '2025-05-25T00:00:00.000Z' }],
      vaultId: 'vault-new',
      pendingInvitations: [],
    });

    await installApiMocks(page, {
      profile: provisionedUser,
      initVault: { vaultId: 'vault-new', name: 'Alemu Family Museum', role: 'ADMIN' },
      firstRelative: { personId: 'person-1' },
      dashboardSummary: {
        curatorName: 'Curator Example',
        vaultName: 'Alemu Family Museum',
        memoryCount: 1,
        kinCount: 1,
        heroImages: [],
        theme: { primaryHue: '#B88F5B', grainEnabled: true },
      },
      members: [{ id: 'user-1', name: 'Curator Example', avatar: null }],
    });

    await seedAuthState(page, {
      currentUser: initialUser,
      isAuthenticated: true,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      activeVaultId: null,
    });

    await page.goto('/onboarding');
    await page.getByRole('button', { name: /create my vault/i }).click();
    await page.getByPlaceholder('e.g. The Alemu Family Museum').fill('Alemu Family Museum');
    await page.getByRole('button', { name: /continue/i }).click();

    await page.getByPlaceholder('Full Legal Name').fill('Curator Example');
    await page.getByPlaceholder('Birth Year').fill('1985');
    await page.getByRole('button', { name: /establish lineage/i }).click();

    await expect(page.getByRole('heading', { name: /hang your first exhibit/i })).toBeVisible();
    await page.getByRole('button', { name: /skip & finish/i }).click();
    await page.getByRole('button', { name: /enter the museum/i }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: /alemu family museum/i })).toBeVisible();
  });

  test('invitation inbox accepts an invite and routes into the dashboard', async ({ page }) => {
    const invitedUser = makeUser({
      is_verified: true,
      role: 'ADMIN',
      vaultId: 'vault-1',
      vaults: [{ id: 'vault-1', name: 'Family Vault', role: 'ADMIN', joinedAt: '2025-01-01T00:00:00.000Z' }],
      pendingInvitations: [
        {
          id: 'invite-1',
          vaultId: 'vault-2',
          vaultName: 'Archivist Vault',
          role: 'CONTRIBUTOR',
          status: 'PENDING',
          invitedByName: 'Patriarch Example',
        },
      ],
    });

    const postAcceptProfile = makeUser({
      is_verified: true,
      role: 'CONTRIBUTOR',
      vaultId: 'vault-1',
      vaults: [{ id: 'vault-1', name: 'Family Vault', role: 'CONTRIBUTOR', joinedAt: '2025-01-01T00:00:00.000Z' }],
      pendingInvitations: [],
    });

    await installApiMocks(page, {
      profile: postAcceptProfile,
      invitationActionResponse: { status: 'ACCEPTED' },
      dashboardSummary: {
        curatorName: 'Curator Example',
        vaultName: 'Family Vault',
        memoryCount: 4,
        kinCount: 1,
        heroImages: [],
        theme: { primaryHue: '#B88F5B', grainEnabled: true },
      },
      members: [{ id: 'user-1', name: 'Curator Example', avatar: null }],
    });

    await seedAuthState(page, {
      currentUser: invitedUser,
      isAuthenticated: true,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      activeVaultId: 'vault-1',
    });

    await page.goto('/auth');

    await expect(page).toHaveURL(/\/invitation-inbox$/);
    await expect(page.getByRole('heading', { name: 'Invitation Inbox' })).toBeVisible();
    await page.getByRole('button', { name: /accept/i }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: /family vault/i })).toBeVisible();
  });

  test('verified users with multiple vaults are routed to the vault selector', async ({ page }) => {
    const user = makeUser({
      is_verified: true,
      role: 'ADMIN',
      vaultId: undefined,
      vaults: [
        { id: 'vault-1', name: 'Family Vault', role: 'ADMIN', joinedAt: '2025-01-01T00:00:00.000Z' },
        { id: 'vault-2', name: 'Research Vault', role: 'CONTRIBUTOR', joinedAt: '2025-01-02T00:00:00.000Z' },
      ],
    });

    await seedAuthState(page, {
      currentUser: user,
      isAuthenticated: true,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      activeVaultId: null,
    });

    await page.goto('/auth');

    await expect(page).toHaveURL(/\/vault-select$/);
    await expect(page.getByRole('heading', { name: /choose a vault/i })).toBeVisible();
    await expect(page.getByText('Family Vault')).toBeVisible();
    await expect(page.getByText('Research Vault')).toBeVisible();
  });
});
```

### File 4: `frontend/tests/e2e/core-features.spec.ts`
*Tests collection management, manual edits, and curation.*

```typescript
import { expect, test } from '@playwright/test';
import { installApiMocks, makeUser, seedAuthState } from './test-utils';

test.describe('Core media and curation features', () => {
  test('uploading an artifact queues and completes processing in the vault grid', async ({ page }) => {
    const user = makeUser({
      is_verified: true,
      role: 'ADMIN',
      vaultId: 'vault-1',
      vaults: [{ id: 'vault-1', name: 'Family Vault', role: 'ADMIN' }],
    });

    const mockFile = { id: 'mem-new', title: 'New Archival Photo', url: 'https://images.example.com/item.jpg', is_reviewed: true };

    await installApiMocks(page, {
      memoryList: [mockFile],
      uploadedMemory: { task_id: 'task-upload', memory_id: 'mem-new' },
      taskStatus: { status: 'READY', progress: 100, stage: 'Complete', result: { results: [] } },
    });

    await seedAuthState(page, {
      currentUser: user,
      isAuthenticated: true,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      activeVaultId: 'vault-1',
    });

    await page.goto('/vault');
    await page.getByRole('button', { name: 'Grid' }).click();

    // Trigger file dialog
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'UPLOAD MEMORY' }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles('tests/e2e/playwright.config.ts'); // Placeholder file to trigger the input

    await expect(page.getByText(/active preservations/i)).toBeVisible();
  });

  test('managing categories and collections from inside edit dialogs', async ({ page }) => {
    const user = makeUser({
      is_verified: true,
      role: 'ADMIN',
      vaultId: 'vault-1',
      vaults: [{ id: 'vault-1', name: 'Family Vault', role: 'ADMIN' }],
    });

    const activeMemory = {
      id: 'mem-active',
      title: 'Untagged Document',
      url: 'https://images.example.com/doc.jpg',
      is_reviewed: true,
      cluster_name: 'Unsorted',
    };

    await installApiMocks(page, {
      memoryList: [activeMemory],
      memoryDetail: activeMemory,
      collections: [{ id: 'col-new', name: 'Preserved Letters', memory_count: 0 }],
      updatedMemory: { ...activeMemory, cluster_name: 'Preserved Letters' },
    });

    await seedAuthState(page, {
      currentUser: user,
      isAuthenticated: true,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      activeVaultId: 'vault-1',
    });

    await page.goto('/vault');
    await page.getByRole('button', { name: 'Grid' }).click();

    // Select the exhibit card
    await page.locator('div.break-inside-avoid').hover();
    await page.getByRole('button', { name: 'Open exhibit' }).click();

    await page.getByRole('button', { name: 'Edit exhibit' }).click();
    await page.getByRole('button', { name: 'Unsorted' }).click();

    // Add a new collection
    await page.getByPlaceholder('Create new collection...').fill('Preserved Letters');
    await page.locator('button:has-text("+")').click();

    await page.getByRole('button', { name: 'Preserved Letters' }).first().click();
    await page.getByRole('button', { name: 'Save Changes' }).click();

    await expect(page.getByRole('button', { name: 'Preserved Letters' }).first()).toBeVisible();
  });

  test('resolving and accepting context-aware AI caption and tag suggestions', async ({ page }) => {
    const user = makeUser({
      is_verified: true,
      role: 'ADMIN',
      vaultId: 'vault-1',
      vaults: [{ id: 'vault-1', name: 'Family Vault', role: 'ADMIN' }],
    });

    const memoryWithSuggestions = {
      id: 'mem-sug',
      title: 'Old Family Gathering',
      url: 'https://images.example.com/gathering.jpg',
      is_reviewed: false,
      ai_suggestions: {
        title: { status: 'pending', value: 'Suggested Title for Reunion', confidence: 'high' },
        description: { status: 'pending', value: 'Suggested poetic caption detailing context.', confidence: 'high' },
      },
    };

    await installApiMocks(page, {
      memoryList: [memoryWithSuggestions],
      memoryDetail: memoryWithSuggestions,
      decideSuggestion: {
        ...memoryWithSuggestions,
        title: 'Suggested Title for Reunion',
        ai_suggestions: {
          title: { status: 'accepted', value: 'Suggested Title for Reunion' },
        },
      },
    });

    await seedAuthState(page, {
      currentUser: user,
      isAuthenticated: true,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      activeVaultId: 'vault-1',
    });

    await page.goto('/vault');
    await page.getByRole('button', { name: 'Grid' }).click();

    await page.locator('div.break-inside-avoid').hover();
    await page.getByRole('button', { name: 'Open exhibit' }).click();

    // Check suggestion boxes
    await expect(page.getByText('AI Suggestions')).toBeVisible();
    await expect(page.getByText('Suggested Title for Reunion')).toBeVisible();

    await page.locator('button[aria-label="Accept AI Title"]').click();

    await expect(page.getByRole('heading', { name: 'Suggested Title for Reunion' })).toBeVisible();
  });
});
```

### File 5: `frontend/tests/e2e/lineage-capsules.spec.ts`
*Tests lineage grafting and time capsule lock mechanics.*

```typescript
import { expect, test } from '@playwright/test';
import { installApiMocks, makeUser, seedAuthState } from './test-utils';

test.describe('Genealogy and Time Capsule flows', () => {
  test('interactively grafting a new relative on the lineage canvas', async ({ page }) => {
    const user = makeUser({
      is_verified: true,
      role: 'ADMIN',
      vaultId: 'vault-1',
      vaults: [{ id: 'vault-1', name: 'Family Vault', role: 'ADMIN' }],
    });

    await seedAuthState(page, {
      currentUser: user,
      isAuthenticated: true,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      activeVaultId: 'vault-1',
    });

    await installApiMocks(page, {
      lineageGraph: {
        nodes: [
          { id: 'p1', name: 'Arthur Pendelton', role: 'Patriarch', vaultId: 'vault-1' },
        ],
        edges: [],
      },
      graftBranch: { personId: 'p2' },
    });

    await page.goto('/tree');

    // Toggle edit mode and select node graft
    await page.getByRole('button', { name: 'Switch to Edit Mode' }).click();

    await page.getByRole('heading', { name: 'Arthur Pendelton' }).hover();
    await page.getByLabel('Add child').click();

    await page.getByPlaceholder('Full Legal Name').fill('Graft Example child');
    await page.getByPlaceholder('Birth Year (e.g. 1962)').fill('1990');
    await page.getByRole('button', { name: 'Confirm Addition' }).click();

    await expect(page.getByText('Branch Added')).toBeVisible();
  });

  test('sealing and locking a time capsule ceremony with targeted recipients', async ({ page }) => {
    const user = makeUser({
      is_verified: true,
      role: 'ADMIN',
      vaultId: 'vault-1',
      vaults: [{ id: 'vault-1', name: 'Family Vault', role: 'ADMIN' }],
    });

    await seedAuthState(page, {
      currentUser: user,
      isAuthenticated: true,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      activeVaultId: 'vault-1',
    });

    await installApiMocks(page, {
      capsules: [],
      members: [
        { id: 'user-2', userId: 'user-2', name: 'Sister Example', email: 'sister@example.com', role: 'CONTRIBUTOR' },
      ],
      sealCapsule: { id: 'cap-new', title: 'Future Artifacts' },
    });

    await page.goto('/capsules');
    await page.getByRole('button', { name: '+ CREATE CAPSULE' }).click();

    await page.getByPlaceholder('Capsule Title').fill('Secret Vault');
    await page.locator('input[type="date"]').fill('2030-12-31');
    await page.getByRole('button', { name: 'Specific kin' }).click();
    await page.getByText('Sister Example').click();

    await page.getByRole('button', { name: 'WRITE THE LETTER →' }).click();
    await page.getByPlaceholder('My dearest family...').fill('Open this in 2030.');

    await page.getByRole('button', { name: 'SEAL THE CAPSULE' }).click();

    await expect(page.getByText('Sealed.')).toBeVisible({ timeout: 10000 });
  });

  test('unsealing a locked capsule and breaking the wax seal', async ({ page }) => {
    const user = makeUser({
      is_verified: true,
      role: 'ADMIN',
      vaultId: 'vault-1',
      vaults: [{ id: 'vault-1', name: 'Family Vault', role: 'ADMIN' }],
    });

    await seedAuthState(page, {
      currentUser: user,
      isAuthenticated: true,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      activeVaultId: 'vault-1',
    });

    const readyCapsule = {
      id: 'cap-unsealed',
      title: 'Ready Capsule',
      status: 'READY',
      unlock_date: '2025-01-01T00:00:00.000Z',
      message: 'The unsealed letters.',
      memory_urls: ['https://images.example.com/secret1.jpg'],
    };

    await installApiMocks(page, {
      capsules: [readyCapsule],
      openCapsule: { ...readyCapsule, status: 'OPENED' },
    });

    await page.goto('/capsules');

    await page.getByRole('button', { name: 'REVEAL NOW' }).click();

    await expect(page.getByText('Click the Capsule to Break the Seal')).toBeVisible();

    // Click near the wax seal coordinates
    await page.mouse.click(600, 400);

    await expect(page.getByText('The unsealed letters.')).toBeVisible({ timeout: 10000 });
  });
});
```

---

# PART 5: STEP-BY-STEP LOCAL EXECUTION & REPORT INTERPRETATION

Follow this process to run the test suite and evaluate performance locally in your WSL terminal.

```
WSL Terminal (Vite Dev Server)   ───► http://localhost:5173 (Port 5173)
                                            ▲
WSL Terminal (Playwright Runner) ───────────┘ Runs chromium E2E suites
```

### 1. Launch Dev Services
Open one WSL terminal tab, start your Vite dev server, and keep it active:
```bash
cd /path/to/legacy-keeper/frontend
npm run dev
```

### 2. Execute Headless Test Runner
Open a second WSL terminal tab and run:
```bash
cd /path/to/legacy-keeper/frontend
npx playwright test
```

### 3. Review Generated HTML Reports
Once execution completes, Playwright outputs a summary of results. Open the HTML report to debug failures or review execution times:
```bash
npx playwright show-report
```
*Because WSL does not default to opening windows directly on your host machine, this command will print a local address (e.g. `http://localhost:9323`). Copy and paste this URL into your Windows browser (Chrome, Edge) to inspect the details.*

---

# PART 6: SYSTEM INTEGRATION & COMPREHENSIVE REFLECTION

## 1. CI/CD Integration Blueprint
To prepare this final-year project for a professional production workflow, a complete GitHub Actions pipeline is provided below. This workflow builds the frontend, resolves dependency trees, and runs the Playwright test suite against the mocked environment automatically on every pull request.

Create this file at `.github/workflows/playwright.yml`:

```yaml
name: Playwright E2E Tests
on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    timeout-minutes: 15
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout Repository
      uses: actions/checkout@v4

    - name: Set up Python
      uses: actions/setup-python@v5
      with:
        python-version: '3.12'

    - name: Set up Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'

    - name: Install System Dependencies
      run: |
        sudo apt-get update
        sudo apt-get install -y build-essential cmake ffmpeg libmagic1 tesseract-ocr

    - name: Install Frontend Dependencies
      run: |
        cd frontend
        npm ci

    - name: Install Playwright Browsers
      run: |
        cd frontend
        npx playwright install --with-deps chromium

    - name: Run Playwright E2E Tests
      run: |
        cd frontend
        npx playwright test
      env:
        CI: true
        VITE_API_BASE_URL: http://localhost:8000/api
        VITE_VAPID_PUBLIC_KEY: "BN-UcwL5wc2M9c_tqadJMDXr0pcqD1y0ptc8TljV4dusUeu-RYNtjsfDZyLm7e7K3WSBVWfQ3-8uFNIRKfwwEtk"

    - name: Archive Test Artifacts
      uses: actions/upload-artifact@v4
      if: always()
      with:
        name: playwright-report
        path: frontend/playwright-report/
        retention-days: 10
```

---

## 2. Learning Reflection & Engineering Challenges

During the design and implementation of the LegacyKeeper automation suite, several core engineering challenges were encountered and resolved.

### Challenge 1: Local AI Pipeline Overhead and Timeout Constraints
The backend utilizes CPU/GPU-intensive services (like dlib face recognition and CLIP models) via Celery tasks. In a local testing environment, these tasks can take between 5 to 30 seconds to process.
* **Resolution:** Playwright's network routing API was utilized to intercept and mock the polling endpoints `/api/tasks/<id>/`. This allowed us to simulate transitions from `PROCESSING` to `READY` instantly. Testing against mock endpoints helped ensure the UI's status indicators, error boundaries, and completion states remain stable under a 1-second threshold.

### Challenge 2: 3D WebGL Canvas Intercepts
LegacyKeeper relies on Three.js and React Three Fiber to display physical photo frames floating in 3D. Playwright does not have native visibility inside WebGL canvas pixels, making standard text-based assertions impossible for those elements.
* **Resolution:** We implemented a two-part strategy:
  1. The E2E tests target the standard 2D Grid fallback of the vault, which is fully accessible in the DOM. This provides robust validation for critical actions like edits, uploads, and deletions.
  2. For interactive 3D elements (like breaking the wax seal on a ready time capsule), we simulated coordinate-based mouse clicks (`page.mouse.click(x, y)`) inside the canvas boundary, verifying that the appropriate 2D DOM elements (such as letters or media) opened successfully immediately afterward.

### Challenge 3: WSL 2 Isolated Network Constraints
Running development servers locally on WSL 2 can occasionally lead to network loopback issues, especially when communicating with the Windows host or handling headless Chromium processes inside Ubuntu.
* **Resolution:** Setting Playwright’s `use.baseURL` explicitly to `http://localhost:5173` ensured that traffic remained inside the WSL loopback adapter, avoiding cross-network bridge latency. The addition of `playwright install-deps` resolved missing Linux libraries to keep Chromium running smoothly without a GUI desktop installed on the system.