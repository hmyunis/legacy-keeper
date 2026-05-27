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
      sealCapsule: {
        id: 'cap-new',
        title: 'Secret Vault',
        status: 'LOCKED',
        unlock_date: '2030-12-31T00:00:00.000Z',
        message: 'Open this in 2030.',
        memory_urls: [],
      },
    });

    await page.goto('/capsules');
    await page.getByRole('button', { name: '+ CREATE CAPSULE' }).click();

    // Wait until the title input of the create capsule form is visible
    const titleInput = page.getByPlaceholder('e.g. Letters to the Future');
    await expect(titleInput).toBeVisible({ timeout: 10000 });

    await titleInput.fill('Secret Vault');

    await page.getByRole('button', { name: 'YYYY-MM-DD' }).click();
    await page.getByRole('button', { name: 'Today' }).click();

    // The capsule page uses a custom date picker, so this test selects a valid date through the picker.
    await page.getByRole('button', { name: 'Specific kin' }).click();
    await page.getByText('Sister Example').click();

    await page.getByRole('button', { name: 'WRITE THE LETTER →' }).click();
    await page.getByPlaceholder('My dearest family...').fill('Open this in 2030.');

    await page.getByRole('button', { name: 'SEAL THE CAPSULE' }).click();

    // After sealing, the capsule should be created and visible in the capsule list.
    await expect(page.getByText('Secret Vault')).toBeVisible({ timeout: 10000 });
  });

});