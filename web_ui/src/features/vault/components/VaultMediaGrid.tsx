import type { FC, MouseEvent } from 'react';
import MediaCard from '@/components/vault/MediaCard';
import { MediaCardSkeleton } from '@/components/Skeleton';
import { InfiniteScroll } from '@/components/ui/Pagination';
import type { MediaItem } from '@/types';
import type { VaultTab, VaultViewMode } from '@/features/vault/utils';

interface VaultMediaGridProps {
  mediaItems: MediaItem[];
  view: VaultViewMode;
  isLoading: boolean;
  activeTab: VaultTab;
  isSelectionMode: boolean;
  selectedIds: Set<string>;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  noFavoritesLabel: string;
  noMatchingRecordsLabel: string;
  onLoadMore: () => void;
  onToggleSelection: (id: string) => void;
  onSelectMedia: (media: MediaItem) => void;
  onToggleFavorite: (event: MouseEvent, id: string) => void;
}

export const VaultMediaGrid: FC<VaultMediaGridProps> = ({
  mediaItems,
  view,
  isLoading,
  activeTab,
  isSelectionMode,
  selectedIds,
  hasNextPage,
  isFetchingNextPage,
  noFavoritesLabel,
  noMatchingRecordsLabel,
  onLoadMore,
  onToggleSelection,
  onSelectMedia,
  onToggleFavorite,
}) => (
  <>
    <InfiniteScroll
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      onLoadMore={onLoadMore}
    >
      <div
        className={`grid gap-4 sm:gap-6 ${
          view === 'grid' ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'grid-cols-1'
        }`}
      >
        {isLoading
          ? Array.from({ length: 10 }).map((_, index) => <MediaCardSkeleton key={index} />)
          : mediaItems.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              isSelectionMode={isSelectionMode}
              isSelected={selectedIds.has(item.id)}
              isFavorite={Boolean(item.isFavorite)}
              onToggleSelection={onToggleSelection}
              onSelect={onSelectMedia}
              onToggleFavorite={onToggleFavorite}
            />
            ))}
      </div>
    </InfiniteScroll>

    {!isLoading && mediaItems.length === 0 && (
      <div className="py-16 text-center text-xs uppercase tracking-widest text-slate-400 font-bold">
        {activeTab === 'favorites' ? noFavoritesLabel : noMatchingRecordsLabel}
      </div>
    )}
  </>
);
