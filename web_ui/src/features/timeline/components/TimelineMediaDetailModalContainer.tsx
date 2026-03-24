import { useEffect, useState, type FC, type FormEvent } from 'react';
import MediaDetailModal from '@/components/vault/MediaDetailModal';
import type { UpdateMediaMetadataPayload } from '@/services/mediaApi';
import type { MediaItem } from '@/types';

interface TagState {
  visible: boolean;
  value: string;
}

interface TimelineMediaDetailModalContainerProps {
  media: MediaItem | null;
  relatedMedia: MediaItem[];
  isUpdatingMedia: boolean;
  onClose: () => void;
  onSelectRelatedMedia: (media: MediaItem) => void;
  onDelete: (mediaId: string) => void;
  onPersistTags: (media: MediaItem, nextTags: string[]) => void;
  onUpdateMedia: (
    payload: UpdateMediaMetadataPayload,
    onSuccess?: (updatedMedia: MediaItem) => void,
  ) => void;
}

export const TimelineMediaDetailModalContainer: FC<TimelineMediaDetailModalContainerProps> = ({
  media,
  relatedMedia,
  isUpdatingMedia,
  onClose,
  onSelectRelatedMedia,
  onDelete,
  onPersistTags,
  onUpdateMedia,
}) => {
  const [tagState, setTagState] = useState<TagState>({ visible: false, value: '' });

  useEffect(() => {
    setTagState({ visible: false, value: '' });
  }, [media?.id]);

  if (!media) return null;

  const handleManualTagSubmit = (event?: FormEvent) => {
    event?.preventDefault();
    const tag = tagState.value.trim();
    if (!tag) return;
    onPersistTags(media, [...media.tags, tag]);
    setTagState({ visible: false, value: '' });
  };

  return (
    <MediaDetailModal
      media={media}
      relatedMedia={relatedMedia}
      isFavorite={false}
      isTagInputVisible={tagState.visible}
      manualTagValue={tagState.value}
      onClose={onClose}
      onSelectRelatedMedia={onSelectRelatedMedia}
      onToggleFavorite={() => {}}
      onDelete={onDelete}
      onAddTag={(tag) => {
        onPersistTags(media, [...media.tags, tag]);
      }}
      onRemoveTag={(tag) => {
        onPersistTags(
          media,
          media.tags.filter((existingTag) => existingTag !== tag),
        );
      }}
      onTagInputChange={(value) => setTagState((state) => ({ ...state, value }))}
      setTagInputVisible={(visible) => setTagState((state) => ({ ...state, visible, value: '' }))}
      onManualTagSubmit={handleManualTagSubmit}
      onUpdateMedia={onUpdateMedia}
      isUpdatingMedia={isUpdatingMedia}
    />
  );
};
