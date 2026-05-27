import { describe, it, expect, vi } from 'vitest';
import * as tasks from './tasks';
import axiosClient from '../services/axiosClient';

describe('tasks.pollTask', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.restoreAllMocks();
  });
  afterEach(() => vi.useRealTimers());

  it('resolves when task becomes READY', async () => {
    const sequence = [
      { data: { status: 'PROCESSING', result: null } },
      { data: { status: 'PROCESSING', result: null } },
      { data: { status: 'READY', result: 'done' } },
    ];
    const get = vi.spyOn(axiosClient, 'get').mockImplementation(() => Promise.resolve(sequence.shift() as any));

    const promise = tasks.pollTask('id', 1000);

    // advance timers to allow repeated polls
    await vi.advanceTimersByTimeAsync(3000);
    const result = await promise;
    expect(result).toBe('done');
    expect(get).toHaveBeenCalled();
  });

  it('rejects when task fails', async () => {
    vi.spyOn(axiosClient, 'get').mockResolvedValue({ data: { status: 'FAILED', result: null, error: 'no' } } as any);
    await expect(tasks.pollTask('id', 10)).rejects.toThrow();
  });
});
