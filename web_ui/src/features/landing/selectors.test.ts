import { describe, expect, it } from 'vitest';
import { getCurrentYear, getDisplayFirstName } from '@/features/landing/selectors';

describe('landing selectors', () => {
  it('extracts first name from full name', () => {
    expect(getDisplayFirstName('Abebe Tadesse')).toBe('Abebe');
    expect(getDisplayFirstName('  Selam   ')).toBe('Selam');
    expect(getDisplayFirstName('')).toBe('');
  });

  it('returns current year', () => {
    expect(getCurrentYear()).toBe(new Date().getFullYear());
  });
});
