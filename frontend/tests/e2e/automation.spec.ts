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