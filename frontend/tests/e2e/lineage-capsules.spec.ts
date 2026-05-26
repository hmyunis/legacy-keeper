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