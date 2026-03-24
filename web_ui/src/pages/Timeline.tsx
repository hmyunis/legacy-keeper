import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { TimelineEraFilters } from '@/features/timeline/components/TimelineEraFilters';
import { TimelineFeed } from '@/features/timeline/components/TimelineFeed';
import { TimelineHeader } from '@/features/timeline/components/TimelineHeader';
import { TimelineMediaDetailModalContainer } from '@/features/timeline/components/TimelineMediaDetailModalContainer';
import { TimelineProgressFooter } from '@/features/timeline/components/TimelineProgressFooter';
import {
  flattenTimelineMedia,
  getActiveDecadeCount,
  getCurrentTimelineCount,
  getTimelineDecades,
  getTimelineProgressPercent,
  getTimelineRangeLabel,
  getTotalTimelineCount,
  resolveActiveDecade,
  resolveTimelineSort,
  withTimelineDecadeSearch,
  withTimelineSortSearch,
} from '@/features/timeline/selectors';
import type { TimelineSearchState, TimelineSort } from '@/features/timeline/types';
import { useDeleteMedia, useMedia, useMediaFilters, useUpdateMediaMetadata } from '@/hooks/useMedia';
import { useVault } from '@/hooks/useVaults';
import { useTranslation } from '@/i18n/LanguageContext';
import { useAuthStore } from '@/stores/authStore';
import type { MediaItem } from '@/types';

const Timeline = () => {
  const { t } = useTranslation();
  const { activeVaultId } = useAuthStore();
  const { data: activeVault } = useVault(activeVaultId || '');
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const searchParams = useSearch({ strict: false }) as TimelineSearchState;
  const timelineSort = resolveTimelineSort(searchParams.sort);
  const activeDecade = resolveActiveDecade(searchParams.decade);

  const {
    data: mediaData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingTimeline,
  } = useMedia({
    sortBy: timelineSort,
    sortField: 'date_taken',
    era: activeDecade || undefined,
  });
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const deleteMutation = useDeleteMedia();
  const updateMediaMetadataMutation = useUpdateMediaMetadata();
  const { data: filterSummary } = useMediaFilters();

  const allMedia = useMemo(() => flattenTimelineMedia(mediaData), [mediaData]);

  const decades = useMemo(() => getTimelineDecades(filterSummary), [filterSummary]);

  const setActiveDecade = (decade: string | null): void => {
    navigate({
      to: '/timeline',
      search: (prev: Record<string, unknown>) => withTimelineDecadeSearch(prev, decade),
    } as any);
  };

  const setTimelineSort = (sort: TimelineSort): void => {
    navigate({
      to: '/timeline',
      search: (prev: Record<string, unknown>) => withTimelineSortSearch(prev, sort),
    } as any);
  };

  const currentTimelineCount = getCurrentTimelineCount(mediaData, allMedia);
  const totalTimelineCount = getTotalTimelineCount(filterSummary, currentTimelineCount);
  const activeDecadeCount = useMemo(() => {
    return getActiveDecadeCount({
      activeDecade,
      filterSummary,
      currentTimelineCount,
      totalTimelineCount,
    });
  }, [activeDecade, currentTimelineCount, filterSummary, totalTimelineCount]);

  const progressPercent = useMemo(() => {
    return getTimelineProgressPercent(activeDecadeCount, totalTimelineCount);
  }, [activeDecadeCount, totalTimelineCount]);

  const rangeLabel = useMemo(() => {
    return getTimelineRangeLabel({ activeDecade, filterSummary, allMedia });
  }, [activeDecade, allMedia, filterSummary]);

  const familyName = (activeVault?.familyName || t.timeline.defaultFamilyName).trim();
  const timelineTitle = `${familyName} ${t.timeline.title}`;

  const syncMediaRecord = (updatedMedia: MediaItem) => {
    setSelectedMedia(updatedMedia);
    queryClient.setQueryData(['media'], (old: any) => {
      if (!old?.pages) return old;
      return {
        ...old,
        pages: old.pages.map((page: any) => ({
          ...page,
          items: page.items.map((item: any) => 
            item.id === updatedMedia.id ? updatedMedia : item
          ),
        })),
      };
    });
  };

  const persistTags = (media: MediaItem, nextTags: string[]) => {
    const normalizedTags = Array.from(new Set(nextTags.map((tag) => tag.trim()).filter(Boolean)));
    updateMediaMetadataMutation.mutate(
      {
        id: media.id,
        tags: normalizedTags,
        location: media.location,
      },
      {
        onSuccess: (updatedMedia) => {
          syncMediaRecord(updatedMedia);
        },
      }
    );
  };

  return (
    <div className="relative mx-auto max-w-6xl animate-in slide-in-from-bottom-4 space-y-8 pb-28 sm:space-y-10 sm:pb-32 lg:space-y-12">
      <TimelineHeader
        label={t.timeline.label}
        title={timelineTitle}
        directionLabel={t.timeline.directionLabel}
        newestFirstLabel={t.timeline.newestFirst}
        oldestFirstLabel={t.timeline.oldestFirst}
        sort={timelineSort}
        onSortChange={setTimelineSort}
      />

      <TimelineEraFilters
        allLabel={t.timeline.allEras}
        decades={decades}
        activeDecade={activeDecade}
        onChange={setActiveDecade}
      />

      <TimelineFeed
        isLoading={isLoadingTimeline}
        items={allMedia}
        hasNextPage={hasNextPage || false}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={() => {
          void fetchNextPage();
        }}
        onSelectItem={setSelectedMedia}
      />

      <TimelineProgressFooter
        progressLabel={t.timeline.progress}
        progressPercent={progressPercent}
        rangeLabel={rangeLabel}
      />

      <TimelineMediaDetailModalContainer
        media={selectedMedia}
        relatedMedia={allMedia}
        isUpdatingMedia={updateMediaMetadataMutation.isPending}
        onClose={() => setSelectedMedia(null)}
        onSelectRelatedMedia={setSelectedMedia}
        onDelete={(id) => deleteMutation.mutate(id)}
        onPersistTags={persistTags}
        onUpdateMedia={(payload, onSuccess) =>
          updateMediaMetadataMutation.mutate(payload, {
            onSuccess: (updatedMedia) => {
              syncMediaRecord(updatedMedia);
              onSuccess?.(updatedMedia);
            },
          })
        }
      />
    </div>
  );
};

export default Timeline;
