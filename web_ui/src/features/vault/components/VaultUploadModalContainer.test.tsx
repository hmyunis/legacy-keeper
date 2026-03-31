import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { VaultUploadModalContainer } from './VaultUploadModalContainer';
import type { VaultUploadState } from '@/features/vault/utils';

vi.mock('@/components/vault/UploadModal', () => ({
  default: (props: any) => (
    <div data-testid="upload-modal">
      <button
        onClick={() =>
          props.onFilesChange(
            Array.from({ length: 12 }).map((_, index) => new File(['x'], `file-${index}.jpg`)),
            99,
          )
        }
      >
        files-change
      </button>
      <button onClick={() => props.onPrimaryFileChange(5)}>primary-change</button>
      <button onClick={() => props.onStartUpload()}>start-upload</button>
      <button onClick={() => props.onClose()}>close</button>
    </div>
  ),
}));

const buildUploadState = (overrides: Partial<VaultUploadState> = {}): VaultUploadState => ({
  open: true,
  progress: 0,
  date: new Date('2025-01-01T00:00:00.000Z'),
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
  ...overrides,
});

describe('VaultUploadModalContainer', () => {
  it('does not render when upload modal is closed or user cannot upload', () => {
    const { rerender } = render(
      <VaultUploadModalContainer
        canUpload
        uploadState={buildUploadState({ open: false })}
        lockTargetCandidates={[]}
        setUploadState={vi.fn()}
        isUploading={false}
        onClose={vi.fn()}
        onStartUpload={vi.fn()}
      />,
    );

    expect(screen.queryByTestId('upload-modal')).not.toBeInTheDocument();

    rerender(
      <VaultUploadModalContainer
        canUpload={false}
        uploadState={buildUploadState({ open: true })}
        lockTargetCandidates={[]}
        setUploadState={vi.fn()}
        isUploading={false}
        onClose={vi.fn()}
        onStartUpload={vi.fn()}
      />,
    );

    expect(screen.queryByTestId('upload-modal')).not.toBeInTheDocument();
  });

  it('limits files to 10 and clamps primary index to filtered file list bounds', () => {
    const setUploadState = vi.fn();
    const onStartUpload = vi.fn();
    const onClose = vi.fn();

    render(
      <VaultUploadModalContainer
        canUpload
        uploadState={buildUploadState()}
        lockTargetCandidates={[]}
        setUploadState={setUploadState}
        isUploading={false}
        onClose={onClose}
        onStartUpload={onStartUpload}
      />,
    );

    fireEvent.click(screen.getByText('files-change'));

    const updateState = setUploadState.mock.calls[0][0] as (
      current: VaultUploadState,
    ) => VaultUploadState;
    const nextState = updateState(buildUploadState());

    expect(nextState.files).toHaveLength(10);
    expect(nextState.primaryFileIndex).toBe(9);
  });
});
