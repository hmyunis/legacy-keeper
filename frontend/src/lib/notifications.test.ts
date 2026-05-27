import { describe, it, expect, vi } from 'vitest';
import { getPushState } from './notifications';
import axiosClient from '../services/axiosClient';

describe('notifications.getPushState', () => {
  afterEach(() => vi.restoreAllMocks());

  it('reports unsupported browser when service worker missing', async () => {
    // ensure navigator has no serviceWorker
    // @ts-ignore
    delete global.navigator.serviceWorker;
    // @ts-ignore
    delete (global as any).PushManager;
    const res = await getPushState();
    expect(res.browserSupported).toBe(false);
    expect(res.enabled).toBe(false);
  });

  it('returns enabled state when registration and server enabled', async () => {
    // mock support
    // @ts-ignore
    global.PushManager = function() {} as any;
    const fakeRegistration = {
      pushManager: {
        getSubscription: vi.fn().mockResolvedValue(null),
      },
    } as any;

    // @ts-ignore
    global.navigator.serviceWorker = { register: vi.fn().mockResolvedValue(fakeRegistration), ready: Promise.resolve(fakeRegistration) };
    vi.spyOn(axiosClient, 'get').mockResolvedValue({ data: { enabled: true } } as any);
    // Notification.permission should reflect browser support
    // @ts-ignore
    global.Notification = { permission: 'granted' } as any;

    const res = await getPushState();
    expect(res.browserSupported).toBe(true);
    expect(res.permission).toBe('granted');
    expect(res.enabled).toBe(false); // localSubscription is null so enabled=false even if server enabled
  });
});
