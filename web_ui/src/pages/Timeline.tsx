import React, { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Download, History, Clock } from 'lucide-react';
import { toast } from 'sonner';
import TimelineCard from '../components/timeline/TimelineCard';
import { useTranslation } from '../i18n/LanguageContext';
import { MediaItem } from '../types';
import MediaDetailModal from '../components/vault/MediaDetailModal';
import { useMedia, useDeleteMedia, useUpdateMediaMetadata, useMediaFilters } from '../hooks/useMedia';
import { InfiniteScroll } from '../components/ui/Pagination';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useAuthStore } from '../stores/authStore';
import { useVault } from '../hooks/useVaults';
import { mediaApi } from '../services/mediaApi';
import { getApiErrorMessage } from '../services/httpError';

const Timeline: React.FC = () => {
  const { t } = useTranslation();
  const { activeVaultId } = useAuthStore();
  const { data: activeVault } = useVault(activeVaultId || '');
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const searchParams = useSearch({ strict: false }) as { decade?: string };
  const { 
    data: mediaData, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = useMedia({ sortBy: 'oldest' });
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [tagState, setTagState] = useState({ visible: false, value: '' });
  const [isExporting, setIsExporting] = useState(false);
  const deleteMutation = useDeleteMedia();
  const updateMediaMetadataMutation = useUpdateMediaMetadata();
  const { data: filterSummary } = useMediaFilters();

  const allMedia = useMemo(() => {
    if (!mediaData) return [];
    return mediaData.pages.flatMap(page => page.items);
  }, [mediaData]);

  const sortedMedia = useMemo(() => 
    [...allMedia].sort((a, b) => new Date(a.dateTaken).getTime() - new Date(b.dateTaken).getTime()), 
    [allMedia]
  );
  
  const decades = useMemo(() => 
    Array.from(new Set(sortedMedia.map(m => Math.floor(new Date(m.dateTaken).getFullYear() / 10) * 10))).sort().map(d => `${d}s`), 
    [sortedMedia]
  );

  const activeDecade = useMemo(() => {
    const requested = searchParams.decade;
    if (!requested) return null;
    return decades.includes(requested) ? requested : null;
  }, [decades, searchParams.decade]);

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
  
  const filtered = useMemo(() => { 
    if (!activeDecade) return sortedMedia; 
    const start = parseInt(activeDecade, 10); 
    return sortedMedia.filter(m => { 
      const y = new Date(m.dateTaken).getFullYear(); 
      return y >= start && y < (start + 10); 
    }); 
  }, [sortedMedia, activeDecade]);

  const totalTimelineCount = filterSummary?.totalCount ?? sortedMedia.length;
  const activeDecadeCount = useMemo(() => {
    if (!activeDecade) return totalTimelineCount;
    const matched = filterSummary?.eras.find((era) => era.value === activeDecade)?.count;
    return typeof matched === 'number' ? matched : filtered.length;
  }, [activeDecade, filterSummary?.eras, filtered.length, totalTimelineCount]);

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

    if (!sortedMedia.length) return 'No timeline data';
    const years = sortedMedia
      .map((item) => new Date(item.dateTaken).getFullYear())
      .filter((year) => !Number.isNaN(year));
    if (!years.length) return 'Unknown range';
    return `${Math.min(...years)} - ${Math.max(...years)}`;
  }, [activeDecade, filterSummary?.dateRange?.end, filterSummary?.dateRange?.start, sortedMedia]);

  const handleExportTimeline = async () => {
    if (!activeVaultId) {
      toast.error('No active vault selected');
      return;
    }

    setIsExporting(true);
    try {
      const exportPromise = mediaApi.exportTimeline(activeVaultId, {
        sortBy: 'oldest',
        era: activeDecade || undefined,
      });

      toast.promise(exportPromise, {
        loading: 'Preparing timeline export...',
        success: 'Timeline export ready',
        error: 'Failed to export timeline',
      });

      const { blob, fileName } = await exportPromise;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Failed to export timeline', {
        description: getApiErrorMessage(error, 'Please try again.'),
      });
    } finally {
      setIsExporting(false);
    }
  };

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
    <div className="max-w-6xl mx-auto space-y-12 animate-in slide-in-from-bottom-4 pb-32 relative">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b pb-10">
        <div className="space-y-2"><div className="flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-[0.2em]"><History size={14} /> {t.timeline.label}</div><h1 className="text-4xl font-black">{timelineTitle}</h1></div>
        <button onClick={handleExportTimeline} disabled={isExporting || filtered.length === 0} className="px-6 py-3 bg-white dark:bg-slate-900 dark:text-slate-100 border dark:border-slate-800 rounded-2xl text-[10px] font-bold flex items-center gap-2 transition-all hover:border-primary shadow-sm disabled:opacity-60"><Download size={16} />{t.timeline.export}</button>
      </div>

      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-4 sticky top-20 z-20 bg-[#F8FAFC]/80 dark:bg-slate-950/80 backdrop-blur-md">
        <button onClick={() => setActiveDecade(null)} className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase border transition-all ${!activeDecade ? 'bg-primary border-primary text-white shadow-lg' : 'bg-white dark:bg-slate-900 text-slate-500 hover:border-primary border-slate-200 dark:border-slate-800'}`}>{t.timeline.allEras}</button>
        {decades.map(d => (<button key={d} onClick={() => setActiveDecade(d)} className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase border transition-all ${activeDecade === d ? 'bg-primary border-primary text-white shadow-lg' : 'bg-white dark:bg-slate-900 text-slate-500 hover:border-primary border-slate-200 dark:border-slate-800'}`}>{d}</button>))}
      </div>

      <div className="relative pt-10">
        <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-[1px] bg-gradient-to-b from-primary via-slate-200 dark:via-slate-800 to-slate-200 dark:to-slate-800 -translate-x-1/2"></div>
        <InfiniteScroll
          hasNextPage={hasNextPage || false}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={fetchNextPage}
        >
          <div className="space-y-20">
            {filtered.map((item, i) => (
              <TimelineCard 
                key={item.id} 
                item={item} 
                isEven={i % 2 === 0} 
                onSelect={() => setSelectedMedia(item)} 
              />
            ))}
          </div>
        </InfiniteScroll>
      </div>

      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-100 dark:border-slate-800 rounded-full shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-10">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500"><Clock size={14} /> {t.timeline.progress}</div>
        <div className="w-40 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-primary transition-all" style={{ width: `${progressPercent}%` }}></div></div>
        <span className="text-[10px] font-black text-primary">{rangeLabel}</span>
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
        />
      )}
    </div>
  );
};

export default Timeline;
