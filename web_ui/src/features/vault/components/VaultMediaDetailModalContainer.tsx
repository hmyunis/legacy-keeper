import type { Dispatch, FC, FormEvent, MouseEvent, SetStateAction } from 'react';
import MediaDetailModal from '@/components/vault/MediaDetailModal';
import type { UpdateMediaMetadataPayload } from '@/services/mediaApi';
import type { MediaItem } from '@/types';
import type { VaultTagState } from '@/features/vault/utils';

interface VaultMediaDetailModalContainerProps {
  media: MediaItem | null;
  relatedMedia: MediaItem[];
  tagState: VaultTagState;
  setTagState: Dispatch<SetStateAction<VaultTagState>>;
  onClose: () => void;
  onSelectRelatedMedia: (media: MediaItem) => void;
  onToggleFavorite: (event: MouseEvent, id: string) => void;
  onDelete: (id: string) => void;
  onPersistTags: (tags: string[]) => void;
  onUpdateMedia: (
    payload: UpdateMediaMetadataPayload,
    onSuccess?: (updatedMedia: MediaItem) => void,
  ) => void;
  onSyncMedia: (updatedMedia: MediaItem) => void;
  shouldPollExif: boolean;
  isUpdatingMedia: boolean;
}

export const VaultMediaDetailModalContainer: FC<VaultMediaDetailModalContainerProps> = ({
  media,
  relatedMedia,
  tagState,
  setTagState,
  onClose,
  onSelectRelatedMedia,
  onToggleFavorite,
  onDelete,
  onPersistTags,
  onUpdateMedia,
  onSyncMedia,
  shouldPollExif,
  isUpdatingMedia,
}) => {
  if (!media) return null;

  const handleManualTagSubmit = (event?: FormEvent) => {
    event?.preventDefault();
    const normalizedTag = tagState.value.trim();
    if (!normalizedTag) return;
    onPersistTags([...media.tags, normalizedTag]);
    setTagState({ visible: false, value: '' });
  };

  return (
    <MediaDetailModal
      media={media}
      relatedMedia={relatedMedia}
      isFavorite={Boolean(media.isFavorite)}
      isTagInputVisible={tagState.visible}
      manualTagValue={tagState.value}
      onClose={onClose}
      onSelectRelatedMedia={onSelectRelatedMedia}
      onToggleFavorite={onToggleFavorite}
      onDelete={onDelete}
      onAddTag={(tag) => onPersistTags([...media.tags, tag])}
      onRemoveTag={(tag) => onPersistTags(media.tags.filter((existingTag) => existingTag !== tag))}
      onTagInputChange={(value) => setTagState((state) => ({ ...state, value }))}
      setTagInputVisible={(visible) =>
        setTagState((state) => ({ ...state, visible, value: '' }))
      }
      onManualTagSubmit={handleManualTagSubmit}
      onUpdateMedia={onUpdateMedia}
      onSyncMedia={onSyncMedia}
      shouldPollExif={shouldPollExif}
      isUpdatingMedia={isUpdatingMedia}
    />
  );
};

