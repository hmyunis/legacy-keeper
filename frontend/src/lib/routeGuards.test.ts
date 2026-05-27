import { beforeEach, describe, expect, it, vi } from 'vitest';

const redirectMock = vi.hoisted(() => vi.fn((payload) => payload));

vi.mock('@tanstack/react-router', () => ({
  redirect: redirectMock,
}));

import * as authStore from '../stores/authStore';
import { requireAuth, redirectIfAuthenticated, requirePendingVerification, requireAdmin } from './routeGuards';

describe('routeGuards', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    redirectMock.mockClear();
  });

  it('requires auth when user is not signed in', () => {
    vi.spyOn(authStore.useAuthStore, 'getState').mockReturnValue({ isAuthenticated: false } as any);
    window.history.pushState({}, '', '/vault?foo=1');

    expect(() => requireAuth({ location: { pathname: '/vault' } })).toThrow();
    expect(redirectMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: '/auth', search: expect.objectContaining({ redirect: '/vault?foo=1' }) }),
    );
  });

  it('requires verification before authenticated access', () => {
    vi.spyOn(authStore.useAuthStore, 'getState').mockReturnValue({
      isAuthenticated: true,
      currentUser: { is_verified: false },
      activeVaultId: null,
      setActiveVaultId: vi.fn(),
    } as any);

    expect(() => requireAuth({ location: { pathname: '/vault' } })).toThrow();
    expect(redirectMock).toHaveBeenCalledWith(expect.objectContaining({ to: '/verify-email' }));
  });

  it('redirects verified auth users to their post auth route', () => {
    vi.spyOn(authStore.useAuthStore, 'getState').mockReturnValue({
      isAuthenticated: true,
      currentUser: { is_verified: true, vaults: [{ id: 'one' }] },
      activeVaultId: null,
      setActiveVaultId: vi.fn(),
    } as any);

    expect(() => redirectIfAuthenticated({ location: { search: { redirect: '/target' } } })).toThrow();
    expect(redirectMock).toHaveBeenCalledWith(expect.objectContaining({ to: '/target' }));
  });

  it('requires pending verification users to be authenticated', () => {
    vi.spyOn(authStore.useAuthStore, 'getState').mockReturnValue({ isAuthenticated: false } as any);

    expect(() => requirePendingVerification()).toThrow();
    expect(redirectMock).toHaveBeenCalledWith(expect.objectContaining({ to: '/auth' }));
  });

  it('blocks non-admin users from governance routes', () => {
    vi.spyOn(authStore.useAuthStore, 'getState').mockReturnValue({
      isAuthenticated: true,
      currentUser: { is_verified: true, role: 'CURATOR', vaults: [{ id: 'one' }] },
      activeVaultId: null,
      setActiveVaultId: vi.fn(),
    } as any);

    expect(() => requireAdmin({ location: { pathname: '/admin' } })).toThrow();
    expect(redirectMock).toHaveBeenCalledWith(expect.objectContaining({ to: '/dashboard' }));
  });

  it('forces invitation inbox when there are pending invitations', () => {
    vi.spyOn(authStore.useAuthStore, 'getState').mockReturnValue({
      isAuthenticated: true,
      currentUser: {
        is_verified: true,
        pendingInvitations: [{ status: 'PENDING' }],
        vaults: [{ id: 'one' }],
      },
      activeVaultId: 'one',
      setActiveVaultId: vi.fn(),
    } as any);

    expect(() => requireAuth({ location: { pathname: '/dashboard' } })).toThrow();
    expect(redirectMock).toHaveBeenCalledWith(expect.objectContaining({ to: '/invitation-inbox' }));
  });

  it('selects the only available vault automatically', () => {
    const setActiveVaultId = vi.fn();
    vi.spyOn(authStore.useAuthStore, 'getState').mockReturnValue({
      isAuthenticated: true,
      currentUser: { is_verified: true, vaults: [{ id: 'solo', role: 'CURATOR' }] },
      activeVaultId: null,
      setActiveVaultId,
    } as any);

    requireAuth({ location: { pathname: '/dashboard' } });
    expect(setActiveVaultId).toHaveBeenCalledWith('solo');
  });
});
