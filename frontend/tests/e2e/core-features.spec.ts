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
    const collectionInput = page.getByPlaceholder('Create new collection.');
    await collectionInput.fill('Preserved Letters');
    await collectionInput.press('Enter');

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