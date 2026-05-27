import { describe, it, expect, vi } from 'vitest';

describe('appEnv', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('normalizes api base url and trims values', async () => {
    vi.stubEnv('VITE_API_BASE_URL', ' https://api.example.com/v1 ');
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', ' key ');
    const module = await import('./env');
    expect(module.appEnv.apiBaseUrl).toBe('https://api.example.com/v1/');
    expect(module.appEnv.vapidPublicKey).toBe('key');
  });

  it('falls back to /api when env var missing', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', '');
    const module = await import('./env');
    expect(module.appEnv.apiBaseUrl).toBe('/api/');
    expect(module.appEnv.vapidPublicKey).toBe('');
  });
});
