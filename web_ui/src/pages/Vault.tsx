import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  Filter as FilterIcon,
  UploadCloud,
  Grid,
  List,
  Heart,
  CheckSquare,
  Square,
  ArrowDownWideNarrow,
  ChevronDown,
  Check,
  Trash2,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { MediaItem, MediaType } from '../types';
import { toast } from 'sonner';
import MediaCard from '../components/vault/MediaCard';
import VaultFilters from '../components/vault/VaultFilters';
import MediaDetailModal from '../components/vault/MediaDetailModal';
import UploadModal from '../components/vault/UploadModal';
import { MediaCardSkeleton } from '../components/Skeleton';
import {
  useMedia,
  useFavoriteMedia,
  useMediaFilters,
  useDeleteMedia,
  useBulkDeleteMedia,
  useToggleMediaFavorite,
  useUploadMedia,
  useUpdateMediaMetadata,
} from '../hooks/useMedia';
import { useTranslation } from '../i18n/LanguageContext';
import { useAuthStore } from '../stores/authStore';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { hasPermission } from '@/config/permissions';
import { InfiniteScroll } from '../components/ui/Pagination';
import { useNavigate, useSearch } from '@tanstack/react-router';
import ConfirmModal from '../components/ui/ConfirmModal';

type VaultConfirmState =
  | { kind: 'single'; mediaId: string; title: string; message: string; confirmLabel: string }
  | { kind: 'bulk'; mediaIds: string[]; title: string; message: string; confirmLabel: string };

type VaultTab = 'all' | 'favorites';

const toDateValue = (value?: string): Date | undefined => {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed;
};

const toDateParam = (value?: Date): string | undefined => {
  if (!value) return undefined;
  return value.toISOString().split('T')[0];
};

const toggleStringItem = (items: string[], value: string) =>
  items.includes(value) ? items.filter((item) => item !== value) : [...items, value];

const toggleTypeItem = (items: MediaType[], value: MediaType) =>
  items.includes(value) ? items.filter((item) => item !== value) : [...items, value];

const uniqueStrings = (items: string[]) => Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));

const Vault: React.FC<{
  initialSearch?: string;
  initialAction?: string | null;
  initialPerson?: string;
  initialSort?: 'newest' | 'oldest' | 'title';
  initialView?: 'grid' | 'list';
  initialTab?: VaultTab;
  initialPeople?: string[];
  initialTags?: string[];
  initialLocations?: string[];
  initialTypes?: MediaType[];
  initialEra?: string | null;
  initialStartDate?: string;
  initialEndDate?: string;
}> = ({
  initialSearch = '',
  initialAction,
  initialPerson,
  initialSort = 'newest',
  initialView = 'grid',
  initialTab = 'all',
  initialPeople = [],
  initialTags = [],
  initialLocations = [],
  initialTypes = [],
  initialEra = null,
  initialStartDate,
  initialEndDate,
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const searchParams = useSearch({ strict: false }) as { sort?: string; view?: string; tab?: VaultTab };
  const { currentUser } = useAuthStore();

  const normalizedInitialPeople = useMemo(
    () => uniqueStrings([...(initialPeople || []), ...(initialPerson ? [initialPerson] : [])]),
    [initialPeople, initialPerson],
  );
  const normalizedInitialTags = useMemo(() => uniqueStrings(initialTags || []), [initialTags]);
  const normalizedInitialLocations = useMemo(() => uniqueStrings(initialLocations || []), [initialLocations]);
  const normalizedInitialTypes = useMemo(
    () => (initialTypes || []).filter((type) => Object.values(MediaType).includes(type)),
    [initialTypes],
  );

  const [view, setView] = useState<'grid' | 'list'>(initialView);
  const [activeTab, setActiveTab] = useState<VaultTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const debouncedSearchQuery = useDebouncedValue(searchQuery, {
    delay: 400,
    normalize: (value: string) => value.trim(),
  });
  const [filters, setFilters] = useState({
    people: normalizedInitialPeople,
    tags: normalizedInitialTags,
    locations: normalizedInitialLocations,
    era: initialEra as string | null,
    types: normalizedInitialTypes,
    startDate: toDateValue(initialStartDate),
    endDate: toDateValue(initialEndDate),
  });
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title'>(initialSort);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [bulkSelection, setBulkSelection] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [tagState, setTagState] = useState({ visible: false, value: '' });
  const [uploadState, setUploadState] = useState({
    open: false,
    progress: 0,
    date: new Date(),
    files: [] as File[],
    title: '',
    location: '',
    tags: '',
    story: '',
  });
  const [confirmState, setConfirmState] = useState<VaultConfirmState | null>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  const syncVaultSearch = (
    nextSearch: string,
    nextSort: 'newest' | 'oldest' | 'title',
    nextView: 'grid' | 'list',
    nextFilters: typeof filters,
    replace = false,
    nextTab: VaultTab = activeTab,
  ) => {
    navigate({
      to: '/vault',
      replace,
      search: (prev: Record<string, unknown>) => {
        const next = { ...prev, sort: nextSort, view: nextView };
        if (nextTab === 'favorites') next.tab = 'favorites';
        else delete next.tab;
        const trimmedSearch = nextSearch.trim();
        if (trimmedSearch) next.q = trimmedSearch;
        else delete next.q;

        if (nextFilters.people.length) next.people = nextFilters.people.join(',');
        else delete next.people;

        if (nextFilters.tags.length) next.tags = nextFilters.tags.join(',');
        else delete next.tags;

        if (nextFilters.locations.length) next.locations = nextFilters.locations.join(',');
        else delete next.locations;

        if (nextFilters.types.length) next.types = nextFilters.types.join(',');
        else delete next.types;

        if (nextFilters.era) next.era = nextFilters.era;
        else delete next.era;

        const startDate = toDateParam(nextFilters.startDate);
        if (startDate) next.startDate = startDate;
        else delete next.startDate;

        const endDate = toDateParam(nextFilters.endDate);
        if (endDate) next.endDate = endDate;
        else delete next.endDate;

        // Canonicalize to `people` and keep `person` as legacy-only input.
        delete next.person;
        return next;
      },
    } as any);
  };

  const applyFilterChange = (updater: (current: typeof filters) => typeof filters) => {
    const next = updater(filters);
    setFilters(next);
    syncVaultSearch(searchQuery, sortBy, view, next, false, activeTab);
  };

  const mediaQueryParams = useMemo(
    () => ({
      sortBy,
      search: debouncedSearchQuery || undefined,
      people: filters.people.length ? filters.people : undefined,
      tags: filters.tags.length ? filters.tags : undefined,
      locations: filters.locations.length ? filters.locations : undefined,
      types: filters.types.length ? filters.types : undefined,
      era: filters.era || undefined,
      dateFrom: toDateParam(filters.startDate),
      dateTo: toDateParam(filters.endDate),
    }),
    [debouncedSearchQuery, filters.era, filters.endDate, filters.locations, filters.people, filters.startDate, filters.tags, filters.types, sortBy],
  );
  const isFavoritesTab = activeTab === 'favorites';

  const {
    data: mediaData,
    isLoading: isLoadingMedia,
    fetchNextPage: fetchNextMediaPage,
    hasNextPage: hasNextMediaPage,
    isFetchingNextPage: isFetchingNextMediaPage,
  } = useMedia(mediaQueryParams, { enabled: !isFavoritesTab });

  const {
    data: favoriteMediaData,
    isLoading: isLoadingFavoriteMedia,
    fetchNextPage: fetchNextFavoriteMediaPage,
    hasNextPage: hasNextFavoriteMediaPage,
    isFetchingNextPage: isFetchingNextFavoriteMediaPage,
  } = useFavoriteMedia(mediaQueryParams, { enabled: isFavoritesTab });

  const filterSummaryParams = useMemo(
    () => ({
      search: mediaQueryParams.search,
      dateFrom: mediaQueryParams.dateFrom,
      dateTo: mediaQueryParams.dateTo,
    }),
    [
      mediaQueryParams.dateFrom,
      mediaQueryParams.dateTo,
      mediaQueryParams.search,
    ],
  );

  const {
    data: filterSummary,
    isFetching: isFetchingFilters,
  } = useMediaFilters(filterSummaryParams, { enabled: isFilterExpanded });
  const isLoadingFilters = isFetchingFilters && !filterSummary;

  const deleteMutation = useDeleteMedia();
  const bulkDeleteMutation = useBulkDeleteMedia();
  const toggleFavoriteMutation = useToggleMediaFavorite();
  const uploadMutation = useUploadMedia();
  const updateMediaMetadataMutation = useUpdateMediaMetadata();

  const canUpload = currentUser ? hasPermission(currentUser.role, 'UPLOAD_MEDIA') : false;
  const canDelete = currentUser ? hasPermission(currentUser.role, 'DELETE_MEDIA') : false;

  const activeMediaData = isFavoritesTab ? favoriteMediaData : mediaData;
  const isLoading = isFavoritesTab ? isLoadingFavoriteMedia : isLoadingMedia;
  const hasNextPage = isFavoritesTab ? hasNextFavoriteMediaPage : hasNextMediaPage;
  const isFetchingNextPage =
    isFavoritesTab ? isFetchingNextFavoriteMediaPage : isFetchingNextMediaPage;
  const fetchNextPage = isFavoritesTab ? fetchNextFavoriteMediaPage : fetchNextMediaPage;

  const allMedia = useMemo(() => {
    if (!activeMediaData) return [];
    return activeMediaData.pages.flatMap((page) => page.items);
  }, [activeMediaData]);

  const totalCount = useMemo(() => {
    if (!activeMediaData) return 0;
    return activeMediaData.pages[0]?.totalCount || 0;
  }, [activeMediaData]);

  useEffect(() => {
    setSearchQuery(initialSearch);
  }, [initialSearch]);

  useEffect(() => {
    setSortBy(initialSort);
  }, [initialSort]);

  useEffect(() => {
    setView(initialView);
  }, [initialView]);

  useEffect(() => {
    setActiveTab(initialTab);
    setBulkSelection(new Set());
    setIsSelectionMode(false);
  }, [initialTab]);

  useEffect(() => {
    setFilters({
      people: normalizedInitialPeople,
      tags: normalizedInitialTags,
      locations: normalizedInitialLocations,
      era: initialEra,
      types: normalizedInitialTypes,
      startDate: toDateValue(initialStartDate),
      endDate: toDateValue(initialEndDate),
    });
  }, [
    initialEndDate,
    initialEra,
    initialStartDate,
    normalizedInitialLocations,
    normalizedInitialPeople,
    normalizedInitialTags,
    normalizedInitialTypes,
  ]);

  useEffect(() => {
    if (initialAction === 'upload' && canUpload) {
      setUploadState((state) => ({ ...state, open: true }));
    }
  }, [initialAction, canUpload]);

  useEffect(() => {
    const click = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setIsSortOpen(false);
    };
    document.addEventListener('mousedown', click);
    return () => document.removeEventListener('mousedown', click);
  }, []);

  useEffect(() => {
    const currentSearchTab: VaultTab = searchParams.tab === 'favorites' ? 'favorites' : 'all';
    if (searchParams.sort && searchParams.view && currentSearchTab === activeTab) return;
    syncVaultSearch(searchQuery, sortBy, view, filters, true, activeTab);
  }, [activeTab, filters, searchParams.sort, searchParams.tab, searchParams.view, searchQuery, sortBy, view]);

  useEffect(() => {
    const currentSearch = initialSearch.trim();
    if (debouncedSearchQuery === currentSearch) return;
    syncVaultSearch(debouncedSearchQuery, sortBy, view, filters, true, activeTab);
  }, [activeTab, debouncedSearchQuery, filters, initialSearch, sortBy, view]);

  const toggleFav = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const target = allMedia.find((item) => item.id === id) || (selectedMedia?.id === id ? selectedMedia : null);
    const nextFavorite = !target?.isFavorite;

    toggleFavoriteMutation.mutate(
      { mediaId: id, isFavorite: nextFavorite },
      {
        onSuccess: (result) => {
          setSelectedMedia((current) =>
            current && current.id === result.mediaId ? { ...current, isFavorite: result.isFavorite } : current,
          );

          if (result.isFavorite) toast.success(t.vault.feedback.added);
          else toast.info(t.vault.feedback.removed);
        },
      },
    );
  };

  const handleBulkDel = () => {
    if (bulkSelection.size === 0 || !canDelete) return;

    const mediaIds = Array.from(bulkSelection);
    setConfirmState({
      kind: 'bulk',
      mediaIds,
      title: 'Delete Selected Artifacts?',
      message: `Permanently delete ${mediaIds.length} selected media items from this vault?`,
      confirmLabel: 'Delete Selected',
    });
  };

  const resetUploadState = () =>
    setUploadState({
      open: false,
      progress: 0,
      date: new Date(),
      files: [],
      title: '',
      location: '',
      tags: '',
      story: '',
    });

  const handleStartUpload = () => {
    if (!canUpload || uploadMutation.isPending) return;

    if (!uploadState.files.length) {
      toast.error('Please select at least one file to upload.');
      return;
    }

    if (uploadState.files.length > 10) {
      toast.error('You can upload up to 10 files at a time.');
      return;
    }

    const parsedTags = uploadState.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    uploadMutation.mutate(
      {
        payload: {
          files: uploadState.files,
          title: uploadState.title,
          description: uploadState.story,
          dateTaken: uploadState.date?.toISOString(),
          location: uploadState.location,
          tags: parsedTags,
        },
        onUploadProgress: (progress) => {
          setUploadState((state) => ({ ...state, progress }));
        },
      },
      {
        onSuccess: () => {
          resetUploadState();
        },
      },
    );
  };

  const syncMediaRecord = (updatedMedia: MediaItem) => {
    setSelectedMedia(updatedMedia);
    queryClient.setQueriesData({ queryKey: ['media'] }, (old: any) => {
      if (!old?.pages) return old;
      return {
        ...old,
        pages: old.pages.map((page: any) => ({
          ...page,
          items: page.items.map((item: any) => (item.id === updatedMedia.id ? updatedMedia : item)),
        })),
      };
    });
    queryClient.setQueriesData({ queryKey: ['mediaFavorites'] }, (old: any) => {
      if (!old?.pages) return old;
      return {
        ...old,
        pages: old.pages.map((page: any) => ({
          ...page,
          items: page.items.map((item: any) => (item.id === updatedMedia.id ? updatedMedia : item)),
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
      },
    );
  };

  const requestDeleteMedia = (mediaId: string) => {
    const media = allMedia.find((item) => item.id === mediaId);
    const label = media?.title || 'this media item';
    setConfirmState({
      kind: 'single',
      mediaId,
      title: 'Delete Media Item?',
      message: `Permanently delete "${label}" from this vault?`,
      confirmLabel: 'Delete Media',
    });
  };

  const handleConfirmAction = async () => {
    if (!confirmState) return;

    if (confirmState.kind === 'single') {
      deleteMutation.mutate(confirmState.mediaId);
      setSelectedMedia(null);
      setConfirmState(null);
      return;
    }

    try {
      await bulkDeleteMutation.mutateAsync(confirmState.mediaIds);
      setBulkSelection(new Set());
      setIsSelectionMode(false);
      setConfirmState(null);
    } catch {
      // Error toast is handled by mutation hook; keep modal open for explicit retry/cancel.
    }
  };

  return (
    <div className="space-y-6 pb-20 relative px-1 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold">{t.vault.title}</h1>
          <p className="text-slate-500 text-sm">
            {isLoading
              ? t.vault.scanning
              : activeTab === 'favorites'
                ? `${totalCount} favorite memories`
                : `${totalCount} ${t.vault.subtitle}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {canDelete && (
            <button
              onClick={() => {
                setIsSelectionMode(!isSelectionMode);
                setBulkSelection(new Set());
              }}
              className={`flex-1 sm:flex-none px-4 py-3 rounded-xl font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 border transition-all ${
                isSelectionMode
                  ? 'bg-primary border-primary text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {isSelectionMode ? <CheckSquare size={14} /> : <Square size={14} />}
              {isSelectionMode ? t.vault.actions.cancel : t.vault.actions.select}
            </button>
          )}
          <button
            onClick={() => setIsFilterExpanded(!isFilterExpanded)}
            className={`flex-1 sm:flex-none px-4 py-3 rounded-xl font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 border transition-all ${
              isFilterExpanded
                ? 'bg-slate-900 dark:bg-slate-700 text-white shadow-lg'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <FilterIcon size={14} />
            {t.vault.actions.filter}
          </button>
          {canUpload && (
            <button
              onClick={() => setUploadState((state) => ({ ...state, open: true }))}
              className="w-full sm:w-auto bg-primary text-white px-6 py-3 rounded-xl font-bold text-[10px] uppercase flex items-center justify-center gap-2 hover:opacity-90 glow-primary transition-all shadow-lg shadow-primary/20"
            >
              <UploadCloud size={16} />
              {t.vault.actions.preserve}
            </button>
          )}
        </div>
      </div>

      <div className="inline-flex items-center gap-2 bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 p-1.5">
        <button
          onClick={() => {
            setActiveTab('all');
            setBulkSelection(new Set());
            setIsSelectionMode(false);
            syncVaultSearch(searchQuery, sortBy, view, filters, false, 'all');
          }}
          className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-colors ${
            activeTab === 'all'
              ? 'bg-primary text-white'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white'
          }`}
        >
          All Items
        </button>
        <button
          onClick={() => {
            setActiveTab('favorites');
            setBulkSelection(new Set());
            setIsSelectionMode(false);
            syncVaultSearch(searchQuery, sortBy, view, filters, false, 'favorites');
          }}
          className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-colors flex items-center gap-2 ${
            activeTab === 'favorites'
              ? 'bg-rose-500 text-white'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white'
          }`}
        >
          <Heart size={14} fill={activeTab === 'favorites' ? 'currentColor' : 'none'} />
          Favorites
        </button>
      </div>

      {isSelectionMode && bulkSelection.size > 0 && canDelete && (
        <div className="bg-white dark:bg-slate-900 border-2 border-primary rounded-[1.5rem] p-4 flex flex-col sm:flex-row items-center justify-between shadow-xl animate-in slide-in-from-top-4 gap-3">
          <span className="text-[10px] font-black text-primary uppercase tracking-widest sm:pl-2">
            {bulkSelection.size} {t.vault.actions.artifactSelected}
          </span>
          <div className="flex w-full sm:w-auto gap-2">
            <button
              onClick={() => setBulkSelection(new Set(allMedia.map((media) => media.id)))}
              className="flex-1 sm:flex-none px-4 py-2 text-[10px] font-bold text-slate-500 hover:text-primary transition-colors"
            >
              {t.vault.actions.selectAll}
            </button>
            <button
              onClick={handleBulkDel}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20"
            >
              <Trash2 size={14} /> {t.vault.actions.purge}
            </button>
          </div>
        </div>
      )}

      {isFilterExpanded && (
        <VaultFilters
          peopleOptions={filterSummary?.people || []}
          tagOptions={filterSummary?.tags || []}
          locationOptions={filterSummary?.locations || []}
          eraOptions={filterSummary?.eras || []}
          typeOptions={filterSummary?.types || []}
          isLoadingOptions={isLoadingFilters}
          selectedPeople={filters.people}
          onPeopleChange={(person) =>
            applyFilterChange((current) => ({
              ...current,
              people: toggleStringItem(current.people, person),
            }))
          }
          selectedTags={filters.tags}
          onTagChange={(tag) =>
            applyFilterChange((current) => ({
              ...current,
              tags: toggleStringItem(current.tags, tag),
            }))
          }
          selectedLocations={filters.locations}
          onLocationChange={(location) =>
            applyFilterChange((current) => ({
              ...current,
              locations: toggleStringItem(current.locations, location),
            }))
          }
          selectedEra={filters.era}
          onEraChange={(era) =>
            applyFilterChange((current) => ({
              ...current,
              era,
            }))
          }
          selectedTypes={filters.types}
          onTypeChange={(type) =>
            applyFilterChange((current) => ({
              ...current,
              types: toggleTypeItem(current.types, type),
            }))
          }
          startDate={filters.startDate}
          onStartDateChange={(date) =>
            applyFilterChange((current) => ({
              ...current,
              startDate: date,
            }))
          }
          endDate={filters.endDate}
          onEndDateChange={(date) =>
            applyFilterChange((current) => ({
              ...current,
              endDate: date,
            }))
          }
          onClear={() => {
            const next = {
              people: [] as string[],
              tags: [] as string[],
              locations: [] as string[],
              era: null as string | null,
              types: [] as MediaType[],
              startDate: undefined as Date | undefined,
              endDate: undefined as Date | undefined,
            };
            setFilters(next);
            syncVaultSearch(searchQuery, sortBy, view, next);
          }}
        />
      )}

      <div className="bg-white dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-4 justify-between sticky top-16 sm:top-20 z-10 backdrop-blur-md shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              const nextValue = e.target.value;
              setSearchQuery(nextValue);
            }}
            placeholder={t.vault.searchPlaceholder}
            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/20 dark:text-slate-200"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex p-1 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <button
              onClick={() => {
                setView('grid');
                syncVaultSearch(searchQuery, sortBy, 'grid', filters);
              }}
              className={`p-2 rounded-lg transition-all ${
                view === 'grid'
                  ? 'bg-white dark:bg-slate-700 shadow-sm text-primary'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Grid size={18} />
            </button>
            <button
              onClick={() => {
                setView('list');
                syncVaultSearch(searchQuery, sortBy, 'list', filters);
              }}
              className={`p-2 rounded-lg transition-all ${
                view === 'list'
                  ? 'bg-white dark:bg-slate-700 shadow-sm text-primary'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <List size={18} />
            </button>
          </div>
          <div className="relative" ref={sortRef}>
            <button
              onClick={() => setIsSortOpen(!isSortOpen)}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-transparent"
            >
              <ArrowDownWideNarrow size={16} />
              <span className="hidden sm:inline">
                {t.vault.sorting.label}:{' '}
                {sortBy === 'newest'
                  ? t.vault.sorting.newest
                  : sortBy === 'oldest'
                    ? t.vault.sorting.oldest
                    : t.vault.sorting.alphabetical}
              </span>
              <ChevronDown size={14} className={`transition-transform duration-300 ${isSortOpen ? 'rotate-180' : ''}`} />
            </button>
            {isSortOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-20 py-2 animate-in slide-in-from-top-2">
                {[
                  { id: 'newest', label: t.vault.sorting.newest },
                  { id: 'oldest', label: t.vault.sorting.oldest },
                  { id: 'title', label: t.vault.sorting.alphabetical },
                ].map((option) => (
                  <button
                    key={option.id}
                    onClick={() => {
                      const nextSort = option.id as 'newest' | 'oldest' | 'title';
                      setSortBy(nextSort);
                      setIsSortOpen(false);
                      syncVaultSearch(searchQuery, nextSort, view, filters);
                    }}
                    className={`w-full px-4 py-2.5 text-left text-xs font-bold flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                      sortBy === option.id ? 'text-primary' : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {option.label}
                    {sortBy === option.id && <Check size={14} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <InfiniteScroll
        hasNextPage={hasNextPage || false}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={fetchNextPage}
      >
        <div
          className={`grid gap-4 sm:gap-6 ${
            view === 'grid' ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'grid-cols-1'
          }`}
        >
          {isLoading ? (
            Array.from({ length: 10 }).map((_, i) => <MediaCardSkeleton key={i} />)
          ) : (
            allMedia.map((item) => (
              <MediaCard
                key={item.id}
                item={item}
                isSelectionMode={isSelectionMode}
                isSelected={bulkSelection.has(item.id)}
                isFavorite={Boolean(item.isFavorite)}
                onToggleSelection={(id) => {
                  const next = new Set(bulkSelection);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  setBulkSelection(next);
                }}
                onSelect={setSelectedMedia}
                onToggleFavorite={toggleFav}
              />
            ))
          )}
        </div>
      </InfiniteScroll>

      {!isLoading && allMedia.length === 0 && (
        <div className="py-16 text-center text-xs uppercase tracking-widest text-slate-400 font-bold">
          {activeTab === 'favorites' ? 'No favorites yet' : 'No matching records found'}
        </div>
      )}

      {selectedMedia && (
        <MediaDetailModal
          media={selectedMedia}
          relatedMedia={allMedia}
          isFavorite={Boolean(selectedMedia.isFavorite)}
          isTagInputVisible={tagState.visible}
          manualTagValue={tagState.value}
          onClose={() => setSelectedMedia(null)}
          onSelectRelatedMedia={setSelectedMedia}
          onToggleFavorite={toggleFav}
          onDelete={(id) => requestDeleteMedia(id)}
          onAddTag={(tag) => {
            persistTags([...selectedMedia.tags, tag]);
          }}
          onRemoveTag={(tag) => {
            persistTags(selectedMedia.tags.filter((existingTag) => existingTag !== tag));
          }}
          onTagInputChange={(value) => setTagState((state) => ({ ...state, value }))}
          setTagInputVisible={(value) => setTagState((state) => ({ ...state, visible: value, value: '' }))}
          onManualTagSubmit={(e) => {
            e?.preventDefault();
            if (!tagState.value.trim()) return;
            persistTags([...selectedMedia.tags, tagState.value.trim()]);
            setTagState({ visible: false, value: '' });
          }}
        />
      )}

      {uploadState.open && canUpload && (
        <UploadModal
          isUploading={uploadMutation.isPending}
          uploadProgress={uploadState.progress}
          uploadDate={uploadState.date}
          selectedFiles={uploadState.files}
          title={uploadState.title}
          location={uploadState.location}
          tags={uploadState.tags}
          story={uploadState.story}
          onDateChange={(date) => setUploadState((state) => ({ ...state, date }))}
          onFilesChange={(files) =>
            setUploadState((state) => ({
              ...state,
              files: files.slice(0, 10),
            }))
          }
          onTitleChange={(value) => setUploadState((state) => ({ ...state, title: value }))}
          onLocationChange={(value) => setUploadState((state) => ({ ...state, location: value }))}
          onTagsChange={(value) => setUploadState((state) => ({ ...state, tags: value }))}
          onStoryChange={(value) => setUploadState((state) => ({ ...state, story: value }))}
          onClose={() => resetUploadState()}
          onStartUpload={handleStartUpload}
        />
      )}

      <ConfirmModal
        isOpen={Boolean(confirmState)}
        title={confirmState?.title || ''}
        message={confirmState?.message || ''}
        confirmLabel={confirmState?.confirmLabel || 'Confirm'}
        onConfirm={() => {
          void handleConfirmAction();
        }}
        onCancel={() => setConfirmState(null)}
        isPending={deleteMutation.isPending || bulkDeleteMutation.isPending}
      />
    </div>
  );
};

export default Vault;
