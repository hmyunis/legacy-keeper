import { describe, expect, it } from 'vitest';
import { AxiosError } from 'axios';
import {
  buildAuthRouteSearch,
  buildVerifyRouteSearch,
  getPostAuthNavigationTarget,
  isEmailNotVerifiedError,
  resolveAuthMode,
  resolveAuthSearch,
} from '@/features/auth/selectors';

describe('auth selectors', () => {
  it('resolves auth mode from pathname', () => {
    expect(resolveAuthMode('/login')).toBe('login');
    expect(resolveAuthMode('/signup')).toBe('signup');
    expect(resolveAuthMode('/anything')).toBe('login');
  });

  it('normalizes auth search values', () => {
    expect(resolveAuthSearch({ joinToken: 'abc', redirect: '/vault' })).toEqual({
      joinToken: 'abc',
      redirectPath: '/vault',
    });
    expect(resolveAuthSearch({ joinToken: '   ', redirect: 'vault' })).toEqual({
      joinToken: undefined,
      redirectPath: undefined,
    });
  });

  it('builds search objects for auth routes and verify routes', () => {
    expect(buildAuthRouteSearch({ joinToken: 'abc', redirectPath: '/join/abc' })).toEqual({
      joinToken: 'abc',
      redirect: '/join/abc',
    });
    expect(buildAuthRouteSearch({})).toBeUndefined();
    expect(
      buildVerifyRouteSearch({ email: 'a@b.com', joinToken: 'abc', redirectPath: '/join/abc' }),
    ).toEqual({
      email: 'a@b.com',
      joinToken: 'abc',
      redirect: '/join/abc',
    });
  });

  it('builds post-auth redirect target in priority order', () => {
    expect(getPostAuthNavigationTarget({ joinToken: 'abc' })).toEqual({
      to: '/join/$token',
      params: { token: 'abc' },
    });
    expect(getPostAuthNavigationTarget({ redirectPath: '/settings?tab=vault' })).toEqual({
      to: '/settings',
      search: { tab: 'vault' },
    });
    expect(getPostAuthNavigationTarget({})).toEqual({ to: '/dashboard' });
  });

  it('detects email-not-verified API errors', () => {
    const codedError = new AxiosError(
      'x',
      undefined,
      undefined,
      undefined,
      { data: { code: 'EMAIL_NOT_VERIFIED' } } as any,
    );
    expect(isEmailNotVerifiedError(codedError)).toBe(true);

    const detailError = new AxiosError(
      'x',
      undefined,
      undefined,
      undefined,
      { data: { detail: 'Email is not verified yet' } } as any,
    );
    expect(isEmailNotVerifiedError(detailError)).toBe(true);

    const otherError = new AxiosError(
      'x',
      undefined,
      undefined,
      undefined,
      { data: { detail: 'Invalid credentials' } } as any,
    );
    expect(isEmailNotVerifiedError(otherError)).toBe(false);
  });
});
