import { describe, it, expect } from 'vitest';
import {
  getAccessibleVaults,
  getPendingInvitations,
  getDefaultVaultId,
  shouldShowVaultPicker,
  shouldShowOnboarding,
  shouldShowInvitationInbox,
  getPostAuthRoute,
  getPostInvitationRoute,
} from './authRouting';

const makeUser = (overrides = {}) => ({
  is_verified: true,
  vaults: [],
  pendingInvitations: [],
  ...overrides,
});

describe('authRouting helpers', () => {
  it('returns accessible vaults from explicit vaults or vaultId', () => {
    expect(getAccessibleVaults(null)).toEqual([]);
    expect(getAccessibleVaults(makeUser({ vaultId: 'v1' }))).toEqual([{ id: 'v1', name: 'Vault', role: 'CURATOR', joinedAt: undefined }]);
    expect(getAccessibleVaults(makeUser({ vaults: [{ id: 'a' }] }))).toEqual([{ id: 'a' }]);
  });

  it('filters pending invitations', () => {
    const user = makeUser({ pendingInvitations: [{ id: 1, status: 'PENDING' }, { id: 2, status: 'ACCEPTED' }] });
    expect(getPendingInvitations(user).length).toBe(1);
  });

  it('default vault id when single', () => {
    expect(getDefaultVaultId(makeUser({ vaults: [{ id: 'only' }] }))).toBe('only');
    expect(getDefaultVaultId(makeUser({ vaults: [] }))).toBeNull();
  });

  it('picker/onboarding/inbox logic', () => {
    expect(shouldShowVaultPicker(makeUser({ vaults: [{ id: 1 }, { id: 2 }] }))).toBe(true);
    expect(shouldShowOnboarding(makeUser({ vaults: [] }))).toBe(true);
    expect(shouldShowInvitationInbox(makeUser({ pendingInvitations: [{ status: 'PENDING' }], vaults: [{ id: 1 }] }))).toBe(true);
  });

  it('post auth route decisions', () => {
    expect(getPostAuthRoute(makeUser({ is_verified: false }))).toBe('/verify-email');
    expect(getPostAuthRoute(makeUser({ vaults: [{ id: 1 }], pendingInvitations: [{ status: 'PENDING' }] }))).toBe('/invitation-inbox');
    expect(getPostAuthRoute(makeUser({ vaults: [{ id: 1 }, { id: 2 }] }))).toBe('/vault-select');
    expect(getPostAuthRoute(makeUser({ vaults: [{ id: 1 }] }), '/pref')).toBe('/pref');
  });

  it('post invitation route', () => {
    expect(getPostInvitationRoute(makeUser({ vaults: [] }))).toBe('/onboarding');
    expect(getPostInvitationRoute(makeUser({ vaults: [{ id: 1 }] }))).toBe('/dashboard');
    expect(getPostInvitationRoute(makeUser({ vaults: [{ id: 1 }, { id: 2 }] }))).toBe('/vault-select');
    expect(getPostInvitationRoute(makeUser({ vaults: [{ id: 1 }] }), '/x')).toBe('/x');
  });
});
