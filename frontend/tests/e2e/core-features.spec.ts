import { expect, test } from '@playwright/test';
import { installApiMocks, makeAuthResponse, makeUser, seedAuthState } from './test-utils';

test.describe('Core feature flows: memories & collections & AI suggestions', () => {
  test('uploading a memory queues and displays the new memory', async ({ page }) => {
    const user = makeUser({ is_verified: true, role: 'ADMIN', vaultId: 'vault-1', vaults: [{ id: 'vault-1', name: 'Family Vault', role: 'ADMIN' }] });

    await installApiMocks(page, {
      login: makeAuthResponse(user),
      memoryList: [],
      uploadedMemory: { id: 'mem-1', title: 'Uploaded Memory', url: '/placeholder-museum.jpg' },
      // ensure the list returns the uploaded item
      memoryList: [{ id: 'mem-1', title: 'Uploaded Memory', url: '/placeholder-museum.jpg' }],
    });

    await seedAuthState(page, {
      currentUser: user,
      isAuthenticated: true,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      activeVaultId: 'vault-1',
    });

    // seed memory list and open the vault in Grid view
    await page.goto('/vault');
    await page.getByRole('button', { name: 'Grid' }).click();

    // make sure seeded memory is visible
    await expect(page.getByTestId('memory-card-mem-1')).toBeVisible({ timeout: 10000 });

    // trigger the hidden file input and set a sample file while waiting for the outgoing POST request
    const [uploadRequest] = await Promise.all([
      page.waitForRequest((req) => req.url().includes('/api/vaults/vault-1/memories/') && req.method() === 'POST'),
      page.locator('input[type="file"]').setInputFiles('tests/e2e/fixtures/sample.png'),
    ]);

    expect(uploadRequest).toBeTruthy();
  });

  test('creating a new collection from the memory modal', async ({ page }) => {
    const user = makeUser({ is_verified: true, role: 'ADMIN', vaultId: 'vault-1', vaults: [{ id: 'vault-1', name: 'Family Vault', role: 'ADMIN' }] });

    const memory = { id: 'mem-2', title: 'Memory For Collections', url: '/placeholder-museum.jpg' };

    await installApiMocks(page, {
      login: makeAuthResponse(user),
      memoryList: [memory],
      collections: [],
      // POST collections will return the first collection in `collections` if provided
      collections: [{ id: 'col-1', name: 'My Collection', memory_count: 0 }],
    });

    await seedAuthState(page, {
      currentUser: user,
      isAuthenticated: true,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      activeVaultId: 'vault-1',
    });

    await page.goto('/vault');
    // switch to Grid view to surface the memory cards
    await page.getByRole('button', { name: 'Grid' }).click();
    // wait for the card to render
    await expect(page.getByTestId(`memory-card-${memory.id}`)).toBeVisible({ timeout: 10000 });

    // open the memory modal by hovering the card and clicking the exhibit button
    const card = page.getByTestId(`memory-card-${memory.id}`);
    await card.hover();
    const openBtn = card.getByRole('button', { name: 'Open exhibit' });
    await expect(openBtn).toBeVisible({ timeout: 5000 });
    await openBtn.click();

    // wait for modal to be visible, switch to edit mode, then open collection menu
    await expect(page.getByRole('button', { name: 'Close' })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Edit exhibit' }).click();
    await expect(page.getByTestId('collection-button')).toBeVisible({ timeout: 5000 });
    await page.getByTestId('collection-button').click();

    const input = page.getByTestId('new-collection-input');
    await input.fill('My Collection');
    // press enter to create
    await input.press('Enter');

    // the collection label on the button should update to the new name
    await expect(page.getByRole('button', { name: /My Collection/i })).toBeVisible();
  });

  test('accepting an AI suggestion updates the UI', async ({ page }) => {
    const user = makeUser({ is_verified: true, role: 'ADMIN', vaultId: 'vault-1', vaults: [{ id: 'vault-1', name: 'Family Vault', role: 'ADMIN' }] });

    const memoryWithSuggestion = {
      id: 'mem-3',
      title: 'Memory With Suggestion',
      url: '/placeholder-museum.jpg',
      ai_suggestions: { title: { status: 'pending', value: 'AI Title Suggestion' } },
    };

    await installApiMocks(page, {
      login: makeAuthResponse(user),
      memoryList: [memoryWithSuggestion],
      memoryDetail: memoryWithSuggestion,
      decideSuggestion: {},
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
    await expect(page.getByTestId(`memory-card-${memoryWithSuggestion.id}`)).toBeVisible({ timeout: 10000 });

    const card2 = page.getByTestId(`memory-card-${memoryWithSuggestion.id}`);
    await card2.hover();
    const openBtn2 = card2.getByRole('button', { name: 'Open exhibit' });
    await expect(openBtn2).toBeVisible({ timeout: 5000 });
    await openBtn2.click();

    // ensure suggestion UI is visible
    await expect(page.getByText('AI Suggestions')).toBeVisible();
    const accept = page.locator('button[aria-label="Accept AI Title"]');
    await expect(accept).toBeVisible();

    // click accept and wait for the suggestion POST
    await Promise.all([
      accept.click(),
      page.waitForResponse((resp) => resp.url().includes('/api/vaults/vault-1/memories/') && resp.request().method() === 'POST' && resp.url().includes('/suggestions/')),
    ]);

    // after accepting, the suggestion accept button should disappear
    await expect(page.locator('button[aria-label="Accept AI Title"]')).toHaveCount(0);
  });

  test('saving an edited title updates the memory view', async ({ page }) => {
    const user = makeUser({ is_verified: true, role: 'ADMIN', vaultId: 'vault-1', vaults: [{ id: 'vault-1', name: 'Family Vault', role: 'ADMIN' }] });

    const memory = {
      id: 'mem-4',
      title: 'Before Edit',
      url: '/placeholder-museum.jpg',
      ai_suggestions: {},
    };

    const updatedMemory = {
      ...memory,
      title: 'After Edit',
    };

    await installApiMocks(page, {
      login: makeAuthResponse(user),
      memoryList: [memory],
      memoryDetail: memory,
      updatedMemory,
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
    const card = page.getByTestId(`memory-card-${memory.id}`);
    await expect(card).toBeVisible({ timeout: 10000 });
    await card.hover();
    await card.getByRole('button', { name: 'Open exhibit' }).click();

    await expect(page.getByRole('button', { name: 'Edit exhibit' })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Edit exhibit' }).click();

    const titleInput = page.locator('input[type="text"]').first();
    await titleInput.fill('After Edit');

    await Promise.all([
      page.waitForRequest((req) => req.url().includes('/api/vaults/vault-1/memories/mem-4/') && req.method() === 'PATCH'),
      page.getByRole('button', { name: 'Save changes' }).click(),
    ]);

    await expect(page.getByRole('heading', { name: 'After Edit' })).toBeVisible({ timeout: 10000 });
  });

  test('rejecting an AI suggestion removes the pending controls', async ({ page }) => {
    const user = makeUser({ is_verified: true, role: 'ADMIN', vaultId: 'vault-1', vaults: [{ id: 'vault-1', name: 'Family Vault', role: 'ADMIN' }] });

    const memoryWithSuggestion = {
      id: 'mem-5',
      title: 'Memory With Suggestion To Reject',
      url: '/placeholder-museum.jpg',
      ai_suggestions: { title: { status: 'pending', value: 'Reject Me Title' } },
    };

    await installApiMocks(page, {
      login: makeAuthResponse(user),
      memoryList: [memoryWithSuggestion],
      memoryDetail: memoryWithSuggestion,
      decideSuggestion: {},
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
    const card = page.getByTestId(`memory-card-${memoryWithSuggestion.id}`);
    await expect(card).toBeVisible({ timeout: 10000 });
    await card.hover();
    await card.getByRole('button', { name: 'Open exhibit' }).click();

    await expect(page.getByText('AI Suggestions')).toBeVisible();
    const reject = page.locator('button[aria-label="Reject AI Title"]');
    await expect(reject).toBeVisible();

    await Promise.all([
      reject.click(),
      page.waitForResponse((resp) => resp.url().includes('/api/vaults/vault-1/memories/') && resp.request().method() === 'POST' && resp.url().includes('/suggestions/')),
    ]);

    await expect(page.locator('button[aria-label="Reject AI Title"]')).toHaveCount(0);
  });
});
