import { describe, expect, it } from 'vitest';
import {
  buildVerifyLoginSearch,
  resolveRecoveryEmail,
  resolveResetSearch,
  resolveVerifySearch,
  validateRecoveryEmail,
  validateResetSubmission,
} from '@/features/recovery/selectors';

const messages = {
  emailAndTokenRequired: 'email-and-token',
  newPasswordRequired: 'new-password',
  passwordsDoNotMatch: 'mismatch',
};

describe('recovery selectors', () => {
  it('normalizes recovery email values', () => {
    expect(resolveRecoveryEmail(' test@example.com ')).toBe('test@example.com');
    expect(resolveRecoveryEmail(undefined)).toBe('');
  });

  it('resolves reset search values with trimming', () => {
    expect(resolveResetSearch({ email: ' test@example.com ', token: ' abc ' })).toEqual({
      email: 'test@example.com',
      token: 'abc',
    });
    expect(resolveResetSearch({ email: 1, token: null })).toEqual({
      email: '',
      token: '',
    });
  });

  it('validates reset submission fields', () => {
    expect(
      validateResetSubmission({
        email: '',
        token: 'abc',
        newPassword: '123456',
        confirmPassword: '123456',
        messages,
      }),
    ).toBe('email-and-token');

    expect(
      validateResetSubmission({
        email: 'a@b.com',
        token: 'abc',
        newPassword: '',
        confirmPassword: '',
        messages,
      }),
    ).toBe('new-password');

    expect(
      validateResetSubmission({
        email: 'a@b.com',
        token: 'abc',
        newPassword: '123456',
        confirmPassword: '654321',
        messages,
      }),
    ).toBe('mismatch');

    expect(
      validateResetSubmission({
        email: 'a@b.com',
        token: 'abc',
        newPassword: '123456',
        confirmPassword: '123456',
        messages,
      }),
    ).toBeNull();
  });

  it('resolves verify search and login search params', () => {
    expect(
      resolveVerifySearch({
        email: ' test@example.com ',
        token: ' abc ',
        joinToken: 'join-1',
        redirect: '/vault?tab=all',
      }),
    ).toEqual({
      email: 'test@example.com',
      token: 'abc',
      joinToken: 'join-1',
      redirectPath: '/vault?tab=all',
    });

    expect(buildVerifyLoginSearch({ joinToken: 'join-1', redirectPath: '/vault' })).toEqual({
      joinToken: 'join-1',
      redirect: '/vault',
    });
    expect(buildVerifyLoginSearch({})).toBeUndefined();
  });

  it('validates required recovery email', () => {
    expect(validateRecoveryEmail({ email: '', requiredMessage: 'required' })).toBe('required');
    expect(validateRecoveryEmail({ email: 'a@b.com', requiredMessage: 'required' })).toBeNull();
  });
});
