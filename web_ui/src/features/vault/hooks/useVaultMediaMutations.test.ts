import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { QueryClient } from '@tanstack/react-query';
import { useVaultMediaMutations } from './useVaultMediaMutations';
import type { VaultUploadState } from '@/features/vault/utils';

const toastMocks = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
  info: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: toastMocks,
}));

const buildUploadState = (overrides: Partial<VaultUploadState> = {}): VaultUploadState => ({
  open: true,
  progress: 0,
  date: new Date('2026-01-01T00:00:00.000Z'),
  files: [new File(['binary'], 'memory.jpg', { type: 'image/jpeg' })],
  primaryFileIndex: 0,
  title: 'Grandma story',
  location: '',
  tags: 'family, legacy',
  story: '',
  visibility: 'family',
  lockRule: 'none',
  lockReleaseAt: '',
  lockTargetUserIds: [],
  ...overrides,
});

const setup = (
  overrides: Partial<Parameters<typeof useVaultMediaMutations>[0]> = {},
) => {
  const setSelectedMedia = vi.fn();
  const setUploadState = vi.fn();
  const toggleFavoriteMutate = vi.fn();
  const uploadMediaMutate = vi.fn();
  const updateMediaMutate = vi.fn();
  const startExifPollingForMedia = vi.fn();

  const queryClient = {
    setQueriesData: vi.fn(),
  } as unknown as QueryClient;

  const hook = renderHook(() =>
    useVaultMediaMutations({
      queryClient,
      allMedia: [],
      selectedMedia: null,
      setSelectedMedia,
      setUploadState,
      vaultDefaultVisibility: 'family',
      canUpload: true,
      isUploadPending: false,
      toggleFavoriteMutate,
      uploadMediaMutate,
      updateMediaMutate,
      startExifPollingForMedia,
      favoriteAddedMessage: 'added',
      favoriteRemovedMessage: 'removed',
      ...overrides,
    }),
  );

  return {
    ...hook,
    setSelectedMedia,
    setUploadState,
    uploadMediaMutate,
  };
};

describe('useVaultMediaMutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resets upload state with lock defaults', () => {
    const { result, setUploadState } = setup();

    act(() => {
      result.current.resetUploadState();
    });

    expect(setUploadState).toHaveBeenCalledWith({
      open: false,
      progress: 0,
      date: expect.any(Date),
      files: [],
      primaryFileIndex: 0,
      title: '',
      location: '',
      tags: '',
      story: '',
      visibility: 'family',
      lockRule: 'none',
      lockReleaseAt: '',
      lockTargetUserIds: [],
    });
  });

  it('blocks upload when TIME lock rule is missing unlock datetime', () => {
    const { result, uploadMediaMutate } = setup();

    act(() => {
      result.current.handleStartUpload(
        buildUploadState({
          lockRule: 'time',
          lockReleaseAt: '',
        }),
      );
    });

    expect(toastMocks.error).toHaveBeenCalledWith(
      'Unlock date-time is required for this lock rule.',
    );
    expect(uploadMediaMutate).not.toHaveBeenCalled();
  });

  it('blocks upload when TARGETED lock rule has no users', () => {
    const { result, uploadMediaMutate } = setup();

    act(() => {
      result.current.handleStartUpload(
        buildUploadState({
          lockRule: 'targeted',
          lockTargetUserIds: [],
        }),
      );
    });

    expect(toastMocks.error).toHaveBeenCalledWith(
      'Select at least one target user for this lock rule.',
    );
    expect(uploadMediaMutate).not.toHaveBeenCalled();
  });

  it('submits lock payload when TIME_AND_TARGET lock inputs are valid', () => {
    const { result, uploadMediaMutate } = setup();

    act(() => {
      result.current.handleStartUpload(
        buildUploadState({
          lockRule: 'time_and_target',
          lockReleaseAt: '2026-04-01T09:30:00.000Z',
          lockTargetUserIds: ['11', '22'],
          tags: 'history, family',
        }),
      );
    });

    expect(uploadMediaMutate).toHaveBeenCalledTimes(1);

    const firstCall = uploadMediaMutate.mock.calls[0][0] as {
      payload: Record<string, unknown>;
    };
    expect(firstCall.payload.lockRule).toBe('time_and_target');
    expect(firstCall.payload.lockReleaseAt).toBe('2026-04-01T09:30:00.000Z');
    expect(firstCall.payload.lockTargetUserIds).toEqual(['11', '22']);
    expect(firstCall.payload.tags).toEqual(['history', 'family']);
  });
});
