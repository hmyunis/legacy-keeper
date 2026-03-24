import type { FC } from 'react';
import { InfiniteScroll } from '@/components/ui/Pagination';
import TimelineCard from '@/components/timeline/TimelineCard';
import type { MediaItem } from '@/types';
import { TimelineEntrySkeleton } from './TimelineEntrySkeleton';

interface TimelineFeedProps {
  isLoading: boolean;
  items: MediaItem[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  onSelectItem: (item: MediaItem) => void;
}

export const TimelineFeed: FC<TimelineFeedProps> = ({
  isLoading,
  items,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  onSelectItem,
}) => (
  <div className="relative pt-6 sm:pt-8 lg:pt-10">
    <div className="absolute bottom-0 top-0 left-5 w-[1px] -translate-x-1/2 bg-gradient-to-b from-primary via-slate-200 to-slate-200 dark:via-slate-800 dark:to-slate-800 sm:left-8 md:left-1/2"></div>
    {isLoading ? (
      <div className="space-y-10 sm:space-y-14 lg:space-y-20">
        {Array.from({ length: 6 }).map((_, index) => (
          <TimelineEntrySkeleton key={`timeline-skeleton-${index}`} isEven={index % 2 === 0} />
        ))}
      </div>
    ) : (
      <InfiniteScroll
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={onLoadMore}
      >
        <div className="space-y-10 sm:space-y-14 lg:space-y-20">
          {items.map((item, index) => (
            <TimelineCard
              key={item.id}
              item={item}
              isEven={index % 2 === 0}
              onSelect={() => onSelectItem(item)}
            />
          ))}
        </div>
      </InfiniteScroll>
    )}
  </div>
);
