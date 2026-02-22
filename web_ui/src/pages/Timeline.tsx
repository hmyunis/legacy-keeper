import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowDownWideNarrow, Check, ChevronDown, History, Clock } from 'lucide-react';
import TimelineCard from '../components/timeline/TimelineCard';
import { useTranslation } from '../i18n/LanguageContext';
import { MediaItem } from '../types';
import MediaDetailModal from '../components/vault/MediaDetailModal';
import { useMedia, useDeleteMedia, useUpdateMediaMetadata, useMediaFilters } from '../hooks/useMedia';
import { InfiniteScroll } from '../components/ui/Pagination';
import { Skeleton } from '../components/Skeleton';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useAuthStore } from '../stores/authStore';
import { useVault } from '../hooks/useVaults';

const TimelineEntrySkeleton: React.FC<{ isEven: boolean }> = ({ isEven }) => (
  <div className={`relative flex flex-col items-stretch gap-6 sm:gap-8 md:flex-row md:items-center md:gap-16 ${isEven ? 'md:flex-row-reverse' : ''}`}>
    <div className="absolute left-5 z-10 h-4 w-4 -translate-x-1/2 rounded-full border-4 border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 sm:left-8 md:left-1/2"></div>
    <div className={`flex w-full pl-10 sm:pl-16 md:w-[calc(50%-2rem)] md:pl-0 ${isEven ? 'justify-start' : 'justify-end'}`}>
      <div className="w-full overflow-hidden rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 sm:p-6 lg:p-8">
        <Skeleton className="aspect-video w-full rounded-2xl" />
        <div className="mt-4 space-y-3 sm:mt-5">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
            <Skeleton className="h-3 w-40" />
            <div className="mt-3 flex items-center gap-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-8 w-8 rounded-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
    <div className="hidden md:block w-[calc(50%-2rem)]"></div>
  </div>
);

const Timeline: React.FC = () => {
  const { t } = useTranslation();
  const { activeVaultId } = useAuthStore();
  const { data: activeVault } = useVault(activeVaultId || '');
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const searchParams = useSearch({ strict: false }) as { decade?: string; sort?: 'newest' | 'oldest' };
  const timelineSort = searchParams.sort === 'newest' ? 'newest' : 'oldest';
  const activeDecade = typeof searchParams.decade === 'string' && searchParams.decade.trim()
    ? searchParams.decade.trim()
    : null;
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
  const [tagState, setTagState] = useState({ visible: false, value: '' });
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const deleteMutation = useDeleteMedia();
  const updateMediaMetadataMutation = useUpdateMediaMetadata();
  const { data: filterSummary } = useMediaFilters();

  const allMedia = useMemo(() => {
    if (!mediaData) return [];
    return mediaData.pages.flatMap(page => page.items);
  }, [mediaData]);

  const decades = useMemo(
    () => (filterSummary?.eras || []).map((era) => era.value),
    [filterSummary?.eras],
  );

  const setActiveDecade = (decade: string | null) => {
    navigate({
      to: '/timeline',
      search: (prev: Record<string, unknown>) => {
        const next = { ...prev };
        if (decade) next.decade = decade;
        else delete next.decade;
        return next;
      },
    } as any);
  };

  const setTimelineSort = (sort: 'newest' | 'oldest') => {
    navigate({
      to: '/timeline',
      search: (prev: Record<string, unknown>) => {
        const next = { ...prev, sort };
        return next;
      },
    } as any);
  };

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const currentTimelineCount = mediaData?.pages[0]?.totalCount ?? allMedia.length;
  const totalTimelineCount = filterSummary?.totalCount ?? currentTimelineCount;
  const activeDecadeCount = useMemo(() => {
    if (!activeDecade) return totalTimelineCount;
    const matched = filterSummary?.eras.find((era) => era.value === activeDecade)?.count;
    return typeof matched === 'number' ? matched : currentTimelineCount;
  }, [activeDecade, currentTimelineCount, filterSummary?.eras, totalTimelineCount]);

  const progressPercent = useMemo(() => {
    if (totalTimelineCount <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((activeDecadeCount / totalTimelineCount) * 100)));
  }, [activeDecadeCount, totalTimelineCount]);

  const rangeLabel = useMemo(() => {
    if (activeDecade) {
      const startYear = parseInt(activeDecade, 10);
      if (Number.isNaN(startYear)) return activeDecade;
      return `${startYear} - ${startYear + 9}`;
    }

    const startDate = filterSummary?.dateRange?.start;
    const endDate = filterSummary?.dateRange?.end;
    if (startDate && endDate) {
      const startYear = new Date(startDate).getFullYear();
      const endYear = new Date(endDate).getFullYear();
      if (!Number.isNaN(startYear) && !Number.isNaN(endYear)) {
        return `${startYear} - ${endYear}`;
      }
    }

    if (!allMedia.length) return 'No timeline data';
    const years = allMedia
      .map((item) => new Date(item.dateTaken).getFullYear())
      .filter((year) => !Number.isNaN(year));
    if (!years.length) return 'Unknown range';
    return `${Math.min(...years)} - ${Math.max(...years)}`;
  }, [activeDecade, allMedia, filterSummary?.dateRange?.end, filterSummary?.dateRange?.start]);

  const familyName = (activeVault?.familyName || t.timeline.defaultFamilyName || 'Family').trim();
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

  const persistTags = (nextTags: string[]) => {
    if (!selectedMedia) return;

    const normalizedTags = Array.from(new Set(nextTags.map((tag) => tag.trim()).filter(Boolean)));
    updateMediaMetadataMutation.mutate(
      {
        id: selectedMedia.id,
        tags: normalizedTags,
        location: selectedMedia.location,
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
      <div className="flex flex-col gap-4 border-b pb-6 sm:gap-6 sm:pb-8 md:flex-row md:items-end md:justify-between lg:pb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
            <History size={14} /> {t.timeline.label}
          </div>
          <h1 className="text-2xl font-black leading-tight sm:text-3xl lg:text-4xl">{timelineTitle}</h1>
        </div>
        <div className="relative w-full md:w-auto" ref={sortRef}>
          <button
            onClick={() => setIsSortOpen((open) => !open)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-transparent bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 md:w-auto"
          >
            <ArrowDownWideNarrow size={16} />
            <span>
              {t.timeline.directionLabel}:{' '}
              {timelineSort === 'newest' ? t.timeline.newestFirst : t.timeline.oldestFirst}
            </span>
            <ChevronDown size={14} className={`transition-transform duration-300 ${isSortOpen ? 'rotate-180' : ''}`} />
          </button>
          {isSortOpen && (
            <div className="absolute top-full right-0 z-20 mt-2 w-52 animate-in slide-in-from-top-2 rounded-2xl border border-slate-200 bg-white py-2 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              {[
                { id: 'newest', label: t.timeline.newestFirst },
                { id: 'oldest', label: t.timeline.oldestFirst },
              ].map((option) => (
                <button
                  key={option.id}
                  onClick={() => {
                    setTimelineSort(option.id as 'newest' | 'oldest');
                    setIsSortOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-xs font-bold transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 ${
                    timelineSort === option.id ? 'text-primary' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {option.label}
                  {timelineSort === option.id && <Check size={14} />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar sm:gap-3 sm:pb-4">
        <button
          onClick={() => setActiveDecade(null)}
          className={`rounded-full border px-4 py-2 text-[10px] font-black uppercase transition-all sm:px-5 sm:py-2.5 ${!activeDecade ? 'border-primary bg-primary text-white shadow-lg' : 'border-slate-200 bg-white text-slate-500 hover:border-primary dark:border-slate-800 dark:bg-slate-900'}`}
        >
          {t.timeline.allEras}
        </button>
        {decades.map((d) => (
          <button
            key={d}
            onClick={() => setActiveDecade(d)}
            className={`rounded-full border px-4 py-2 text-[10px] font-black uppercase transition-all sm:px-5 sm:py-2.5 ${activeDecade === d ? 'border-primary bg-primary text-white shadow-lg' : 'border-slate-200 bg-white text-slate-500 hover:border-primary dark:border-slate-800 dark:bg-slate-900'}`}
          >
            {d}
          </button>
        ))}
      </div>

      <div className="relative pt-6 sm:pt-8 lg:pt-10">
        <div className="absolute bottom-0 top-0 left-5 w-[1px] -translate-x-1/2 bg-gradient-to-b from-primary via-slate-200 to-slate-200 dark:via-slate-800 dark:to-slate-800 sm:left-8 md:left-1/2"></div>
        {isLoadingTimeline ? (
          <div className="space-y-10 sm:space-y-14 lg:space-y-20">
            {Array.from({ length: 6 }).map((_, index) => (
              <TimelineEntrySkeleton key={`timeline-skeleton-${index}`} isEven={index % 2 === 0} />
            ))}
          </div>
        ) : (
          <InfiniteScroll
            hasNextPage={hasNextPage || false}
            isFetchingNextPage={isFetchingNextPage}
            onLoadMore={fetchNextPage}
          >
            <div className="space-y-10 sm:space-y-14 lg:space-y-20">
              {allMedia.map((item, i) => (
                <TimelineCard 
                  key={item.id} 
                  item={item} 
                  isEven={i % 2 === 0} 
                  onSelect={() => setSelectedMedia(item)} 
                />
              ))}
            </div>
          </InfiniteScroll>
        )}
      </div>

      <div className="fixed bottom-4 left-1/2 z-[100] flex w-[calc(100%-1rem)] max-w-md -translate-x-1/2 items-center gap-3 rounded-2xl border border-slate-100 bg-white/80 px-4 py-2.5 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-10 dark:border-slate-800 dark:bg-slate-900/80 sm:bottom-10 sm:w-auto sm:max-w-none sm:gap-6 sm:rounded-full sm:px-6 sm:py-3">
        <div className="flex shrink-0 items-center gap-2 text-[10px] font-black uppercase text-slate-500">
          <Clock size={14} /> {t.timeline.progress}
        </div>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 sm:w-40 sm:flex-none">
          <div className="h-full bg-primary transition-all" style={{ width: `${progressPercent}%` }}></div>
        </div>
        <span className="shrink-0 text-[10px] font-black text-primary">{rangeLabel}</span>
      </div>

      {selectedMedia && (
        <MediaDetailModal 
          media={selectedMedia} 
          relatedMedia={allMedia}
          isFavorite={false} 
          isTagInputVisible={tagState.visible} 
          manualTagValue={tagState.value} 
          onClose={() => setSelectedMedia(null)} 
          onSelectRelatedMedia={setSelectedMedia}
          onToggleFavorite={() => {}} 
          onDelete={(id) => deleteMutation.mutate(id)} 
          onAddTag={(tag) => {
            persistTags([...selectedMedia.tags, tag]);
          }}
          onRemoveTag={(tag) => {
            persistTags(selectedMedia.tags.filter((existingTag) => existingTag !== tag));
          }}
          onTagInputChange={(v) => setTagState(s => ({ ...s, value: v }))} 
          setTagInputVisible={(v) => setTagState(s => ({ ...s, visible: v, value: '' }))} 
          onManualTagSubmit={(e) => {
            e?.preventDefault(); if (!tagState.value.trim()) return;
            persistTags([...selectedMedia.tags, tagState.value.trim()]);
            setTagState({ visible: false, value: '' });
          }}
          onUpdateMedia={(payload, onSuccess) =>
            updateMediaMetadataMutation.mutate(payload, {
              onSuccess: (updatedMedia) => {
                syncMediaRecord(updatedMedia);
                onSuccess?.(updatedMedia);
              },
            })
          }
          isUpdatingMedia={updateMediaMetadataMutation.isPending}
        />
      )}
    </div>
  );
};

export default Timeline;
