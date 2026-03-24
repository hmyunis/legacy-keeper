import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  MediaExifStatus,
  MediaFaceDetectionStatus,
  MediaRestorationStatus,
  MediaStatus,
  MediaType,
  type MediaItem,
} from '@/types';
import {
  VaultMediaDetailModalContainer,
} from './VaultMediaDetailModalContainer';

vi.mock('@/components/vault/MediaDetailModal', () => ({
  default: (props: any) => (
    <div data-testid="media-detail-modal">
      <button onClick={() => props.onAddTag('new')}>add-tag</button>
      <button onClick={() => props.onRemoveTag('old')}>remove-tag</button>
      <button onClick={() => props.onManualTagSubmit()}>manual-submit</button>
      <button onClick={() => props.onTagInputChange('updated')}>input-change</button>
      <button onClick={() => props.setTagInputVisible(true)}>show-input</button>
    </div>
  ),
}));

const buildMedia = (overrides: Partial<MediaItem> = {}): MediaItem => ({
  id: 'media-1',
  vaultId: 'vault-1',
  uploaderId: 'user-1',
  isFavorite: false,
  type: MediaType.PHOTO,
  visibility: 'family',
  title: 'Memory',
  description: '',
  dateTaken: '2020-01-01T00:00:00.000Z',
  uploadTimestamp: '2020-01-01T00:00:00.000Z',
  thumbnailUrl: 'https://example.com/thumb.jpg',
  tags: ['old'],
  status: MediaStatus.COMPLETED,
  exifStatus: MediaExifStatus.CONFIRMED,
  faceDetectionStatus: MediaFaceDetectionStatus.COMPLETED,
  restorationStatus: MediaRestorationStatus.NOT_STARTED,
  metadata: {},
  files: [],
  ...overrides,
});

describe('VaultMediaDetailModalContainer', () => {
  it('does not render when no media is selected', () => {
    render(
      <VaultMediaDetailModalContainer
        media={null}
        relatedMedia={[]}
        tagState={{ visible: false, value: '' }}
        setTagState={vi.fn()}
        onClose={vi.fn()}
        onSelectRelatedMedia={vi.fn()}
        onToggleFavorite={vi.fn()}
        onDelete={vi.fn()}
        onPersistTags={vi.fn()}
        onUpdateMedia={vi.fn()}
        onSyncMedia={vi.fn()}
        shouldPollExif={false}
        isUpdatingMedia={false}
      />,
    );

    expect(screen.queryByTestId('media-detail-modal')).not.toBeInTheDocument();
  });

  it('maps modal tag interactions to persistence callbacks and tag state updates', () => {
    const onPersistTags = vi.fn();
    const setTagState = vi.fn();

    render(
      <VaultMediaDetailModalContainer
        media={buildMedia()}
        relatedMedia={[]}
        tagState={{ visible: true, value: '  extra  ' }}
        setTagState={setTagState}
        onClose={vi.fn()}
        onSelectRelatedMedia={vi.fn()}
        onToggleFavorite={vi.fn()}
        onDelete={vi.fn()}
        onPersistTags={onPersistTags}
        onUpdateMedia={vi.fn()}
        onSyncMedia={vi.fn()}
        shouldPollExif
        isUpdatingMedia={false}
      />,
    );

    fireEvent.click(screen.getByText('add-tag'));
    fireEvent.click(screen.getByText('remove-tag'));
    fireEvent.click(screen.getByText('manual-submit'));
    fireEvent.click(screen.getByText('input-change'));
    fireEvent.click(screen.getByText('show-input'));

    expect(onPersistTags).toHaveBeenNthCalledWith(1, ['old', 'new']);
    expect(onPersistTags).toHaveBeenNthCalledWith(2, []);
    expect(onPersistTags).toHaveBeenNthCalledWith(3, ['old', 'extra']);

    expect(setTagState).toHaveBeenCalledWith({ visible: false, value: '' });

    const inputChangeUpdater = setTagState.mock.calls[1][0] as (state: {
      visible: boolean;
      value: string;
    }) => { visible: boolean; value: string };
    const visibleUpdater = setTagState.mock.calls[2][0] as (state: {
      visible: boolean;
      value: string;
    }) => { visible: boolean; value: string };

    expect(inputChangeUpdater({ visible: false, value: '' })).toEqual({
      visible: false,
      value: 'updated',
    });
    expect(visibleUpdater({ visible: false, value: 'keep' })).toEqual({
      visible: true,
      value: '',
    });
  });
});
