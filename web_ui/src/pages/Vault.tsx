import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { MediaItem, MediaType } from '../types';
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
import { useVault } from '../hooks/useVaults';
import { useTranslation } from '../i18n/LanguageContext';
import { useAuthStore } from '../stores/authStore';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { hasPermission } from '@/config/permissions';
import { useNavigate, useSearch } from '@tanstack/react-router';
import ConfirmModal from '../components/ui/ConfirmModal';
import { VaultBulkSelectionBar } from '@/features/vault/components/VaultBulkSelectionBar';
import { VaultFiltersPanel } from '@/features/vault/components/VaultFiltersPanel';
import { VaultHeaderActions } from '@/features/vault/components/VaultHeaderActions';
import { VaultMediaGrid } from '@/features/vault/components/VaultMediaGrid';
import { VaultMediaDetailModalContainer } from '@/features/vault/components/VaultMediaDetailModalContainer';
import { VaultProgressSummary } from '@/features/vault/components/VaultProgressSummary';
import { VaultSearchToolbar } from '@/features/vault/components/VaultSearchToolbar';
import { VaultTabSwitcher } from '@/features/vault/components/VaultTabSwitcher';
import { VaultUploadModalContainer } from '@/features/vault/components/VaultUploadModalContainer';
import { useVaultExifOrchestration } from '@/features/vault/hooks/useVaultExifOrchestration';
import { useVaultMediaMutations } from '@/features/vault/hooks/useVaultMediaMutations';
import { useVaultSearchSync } from '@/features/vault/hooks/useVaultSearchSync';
import {
  buildEmptyVaultFilters,
  buildVaultFiltersState,
  buildVaultMediaQueryParams,
  flattenVaultMedia,
  getActiveFilterCount,
  getVaultTotalCount,
  mergeLegacyPersonFilter,
  normalizeInitialTypeFilters,
  normalizeVaultStringFilters,
  summarizeVaultExifProgress,
  type VaultFiltersState,
  type VaultSortOption,
  type VaultTab,
  type VaultTagState,
  type VaultUploadState,
  type VaultViewMode,
} from '@/features/vault/utils';

type VaultConfirmState =
  | { kind: 'single'; mediaId: string; title: string; message: string; confirmLabel: string }
  | { kind: 'bulk'; mediaIds: string[]; title: string; message: string; confirmLabel: string };

const Vault: React.FC<{
  initialSearch?: string;
  initialAction?: string | null;
  initialPerson?: string;
  initialSort?: VaultSortOption;
  initialView?: VaultViewMode;
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
  const searchParams = useSearch({ strict: false }) as {
    sort?: string;
    view?: string;
    tab?: VaultTab;
  };
  const { currentUser, activeVaultId } = useAuthStore();
  const { data: activeVault } = useVault(activeVaultId || '');
  const vaultDefaultVisibility = (activeVault?.defaultVisibility || 'family') as
    | 'private'
    | 'family';

  const normalizedInitialPeople = useMemo(
    () => mergeLegacyPersonFilter(initialPeople, initialPerson),
    [initialPeople, initialPerson],
  );
  const normalizedInitialTags = useMemo(
    () => normalizeVaultStringFilters(initialTags),
    [initialTags],
  );
  const normalizedInitialLocations = useMemo(
    () => normalizeVaultStringFilters(initialLocations),
    [initialLocations],
  );
  const normalizedInitialTypes = useMemo(
    () => normalizeInitialTypeFilters(initialTypes),
    [initialTypes],
  );

  const [view, setView] = useState<VaultViewMode>(initialView);
  const [activeTab, setActiveTab] = useState<VaultTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const debouncedSearchQuery = useDebouncedValue(searchQuery, {
    delay: 400,
    normalize: (value: string) => value.trim(),
  });
  const [filters, setFilters] = useState<VaultFiltersState>(() =>
    buildVaultFiltersState({
      people: normalizedInitialPeople,
      tags: normalizedInitialTags,
      locations: normalizedInitialLocations,
      era: initialEra,
      types: normalizedInitialTypes,
      startDate: initialStartDate,
      endDate: initialEndDate,
    }),
  );
  const [sortBy, setSortBy] = useState<VaultSortOption>(initialSort);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [bulkSelection, setBulkSelection] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [tagState, setTagState] = useState<VaultTagState>({ visible: false, value: '' });
  const [uploadState, setUploadState] = useState<VaultUploadState>({
    open: false,
    progress: 0,
    date: new Date(),
    files: [],
    primaryFileIndex: 0,
    title: '',
    location: '',
    tags: '',
    story: '',
    visibility: 'family',
  });
  const [confirmState, setConfirmState] = useState<VaultConfirmState | null>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  const { syncVaultSearch } = useVaultSearchSync({
    navigate,
    searchParams,
    activeTab,
    searchQuery,
    debouncedSearchQuery,
    initialSearch,
    sortBy,
    view,
    filters,
  });

  const applyFilterChange = (updater: (current: typeof filters) => typeof filters) => {
    setFilters((current) => {
      const next = updater(current);
      syncVaultSearch({
        nextSearch: searchQuery,
        nextSort: sortBy,
        nextView: view,
        nextFilters: next,
        nextTab: activeTab,
      });
      return next;
    });
  };

  const mediaQueryParams = useMemo(
    () =>
      buildVaultMediaQueryParams({
        sortBy,
        searchQuery: debouncedSearchQuery,
        filters,
      }),
    [debouncedSearchQuery, filters, sortBy],
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
    [mediaQueryParams.dateFrom, mediaQueryParams.dateTo, mediaQueryParams.search],
  );

  const { data: filterSummary, isFetching: isFetchingFilters } = useMediaFilters(
    filterSummaryParams,
    { enabled: isFilterExpanded },
  );
  const isLoadingFilters = isFetchingFilters && !filterSummary;

  const deleteMutation = useDeleteMedia();
  const bulkDeleteMutation = useBulkDeleteMedia();
  const toggleFavoriteMutation = useToggleMediaFavorite();
  const uploadMutation = useUploadMedia();
  const updateMediaMetadataMutation = useUpdateMediaMetadata();

  const canUpload = currentUser ? hasPermission(currentUser.role, 'UPLOAD_MEDIA') : false;
  const canDelete = currentUser ? hasPermission(currentUser.role, 'DELETE_MEDIA') : false;
  const activeFilterCount = useMemo(() => getActiveFilterCount(filters), [filters]);
  const activeFilterBadgeLabel = activeFilterCount > 99 ? '99+' : String(activeFilterCount);

  const activeMediaData = isFavoritesTab ? favoriteMediaData : mediaData;
  const isLoading = isFavoritesTab ? isLoadingFavoriteMedia : isLoadingMedia;
  const hasNextPage = isFavoritesTab ? hasNextFavoriteMediaPage : hasNextMediaPage;
  const isFetchingNextPage =
    isFavoritesTab ? isFetchingNextFavoriteMediaPage : isFetchingNextMediaPage;
  const fetchNextPage = isFavoritesTab ? fetchNextFavoriteMediaPage : fetchNextMediaPage;

  const allMedia = useMemo(() => flattenVaultMedia(activeMediaData), [activeMediaData]);
  const totalCount = useMemo(() => getVaultTotalCount(activeMediaData), [activeMediaData]);
  const exifProgressSummary = useMemo(
    () => summarizeVaultExifProgress(allMedia),
    [allMedia],
  );

  const { startExifPollingForMedia, shouldPollExif } = useVaultExifOrchestration({
    allMedia,
    queryClient,
  });

  const {
    toggleFav,
    resetUploadState,
    handleStartUpload,
    persistTags,
    handleUpdateMedia,
    syncMediaRecord,
  } = useVaultMediaMutations({
    queryClient,
    allMedia,
    selectedMedia,
    setSelectedMedia,
    setUploadState,
    vaultDefaultVisibility,
    canUpload,
    isUploadPending: uploadMutation.isPending,
    toggleFavoriteMutate: toggleFavoriteMutation.mutate,
    uploadMediaMutate: uploadMutation.mutate,
    updateMediaMutate: updateMediaMetadataMutation.mutate,
    startExifPollingForMedia,
    favoriteAddedMessage: t.vault.feedback.added,
    favoriteRemovedMessage: t.vault.feedback.removed,
  });

  useEffect(() => {
    setSearchQuery((current) => {
      const currentTrimmed = current.trim();
      const incomingTrimmed = initialSearch.trim();
      if (currentTrimmed === incomingTrimmed) return current;
      return initialSearch;
    });
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
    setFilters(
      buildVaultFiltersState({
        people: normalizedInitialPeople,
        tags: normalizedInitialTags,
        locations: normalizedInitialLocations,
        era: initialEra,
        types: normalizedInitialTypes,
        startDate: initialStartDate,
        endDate: initialEndDate,
      }),
    );
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
      setUploadState((state) => ({ ...state, open: true, visibility: vaultDefaultVisibility }));
    }
  }, [initialAction, canUpload, vaultDefaultVisibility]);

  useEffect(() => {
    setUploadState((state) =>
      state.open ? state : { ...state, visibility: vaultDefaultVisibility },
    );
  }, [vaultDefaultVisibility]);

  useEffect(() => {
    const click = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setIsSortOpen(false);
    };
    document.addEventListener('mousedown', click);
    return () => document.removeEventListener('mousedown', click);
  }, []);

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

  const vaultSubtitle = isLoading
    ? t.vault.scanning
    : activeTab === 'favorites'
      ? `${totalCount} favorite memories`
      : `${totalCount} ${t.vault.subtitle}`;

  const handleToggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setBulkSelection(new Set());
  };

  const handleToggleFilters = () => {
    setIsFilterExpanded(!isFilterExpanded);
  };

  const handleOpenUpload = () => {
    setUploadState((state) => ({
      ...state,
      open: true,
      visibility: vaultDefaultVisibility,
    }));
  };

  const handleChangeTab = (nextTab: VaultTab) => {
    setActiveTab(nextTab);
    setBulkSelection(new Set());
    setIsSelectionMode(false);
    syncVaultSearch({
      nextSearch: searchQuery,
      nextSort: sortBy,
      nextView: view,
      nextFilters: filters,
      nextTab,
    });
  };

  const handleSearchChange = (nextValue: string) => {
    setSearchQuery(nextValue);
  };

  const handleViewChange = (nextView: VaultViewMode) => {
    setView(nextView);
    syncVaultSearch({
      nextSearch: searchQuery,
      nextSort: sortBy,
      nextView,
      nextFilters: filters,
    });
  };

  const handleToggleSortOpen = () => {
    setIsSortOpen(!isSortOpen);
  };

  const handleSortChange = (nextSort: VaultSortOption) => {
    setSortBy(nextSort);
    setIsSortOpen(false);
    syncVaultSearch({
      nextSearch: searchQuery,
      nextSort,
      nextView: view,
      nextFilters: filters,
    });
  };

  const handleToggleMediaSelection = (id: string) => {
    const next = new Set(bulkSelection);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setBulkSelection(next);
  };

  const handleClearFilters = () => {
    const next = buildEmptyVaultFilters();
    setFilters(next);
    syncVaultSearch({
      nextSearch: searchQuery,
      nextSort: sortBy,
      nextView: view,
      nextFilters: next,
    });
  };

  return (
    <div className="space-y-6 pb-20 relative px-1 sm:px-0">
      <VaultHeaderActions
        title={t.vault.title}
        subtitle={vaultSubtitle}
        canDelete={canDelete}
        isSelectionMode={isSelectionMode}
        canUpload={canUpload}
        isFilterExpanded={isFilterExpanded}
        activeFilterCount={activeFilterCount}
        activeFilterBadgeLabel={activeFilterBadgeLabel}
        onToggleSelectionMode={handleToggleSelectionMode}
        onToggleFilters={handleToggleFilters}
        onOpenUpload={handleOpenUpload}
        selectLabel={t.vault.actions.select}
        cancelLabel={t.vault.actions.cancel}
        filterLabel={t.vault.actions.filter}
        preserveLabel={t.vault.actions.preserve}
      />

      <VaultProgressSummary
        summary={exifProgressSummary}
        photoProcessingExifLabel={t.vault.status.photoProcessingExif}
        photosProcessingExifLabel={t.vault.status.photosProcessingExif}
        awaitingUploaderConfirmationLabel={t.vault.status.awaitingUploaderConfirmation}
        exifExtractionFailedLabel={t.vault.status.exifExtractionFailed}
        photoProcessingFacesLabel={t.vault.status.photoProcessingFaces}
        photosProcessingFacesLabel={t.vault.status.photosProcessingFaces}
        faceDetectionFailedLabel={t.vault.status.faceDetectionFailed}
      />

      <VaultTabSwitcher
        activeTab={activeTab}
        allItemsLabel={t.vault.tabs.allItems}
        favoritesLabel={t.vault.tabs.favorites}
        onChangeTab={handleChangeTab}
      />

      {isSelectionMode && bulkSelection.size > 0 && canDelete && (
        <VaultBulkSelectionBar
          selectionCount={bulkSelection.size}
          artifactSelectedLabel={t.vault.actions.artifactSelected}
          selectAllLabel={t.vault.actions.selectAll}
          purgeLabel={t.vault.actions.purge}
          onSelectAll={() => setBulkSelection(new Set(allMedia.map((media) => media.id)))}
          onPurge={handleBulkDel}
        />
      )}

      <VaultFiltersPanel
        isExpanded={isFilterExpanded}
        filterSummary={filterSummary}
        isLoadingOptions={isLoadingFilters}
        filters={filters}
        onApplyFilterChange={applyFilterChange}
        onClearFilters={handleClearFilters}
      />

      <VaultSearchToolbar
        searchQuery={searchQuery}
        searchPlaceholder={t.vault.searchPlaceholder}
        view={view}
        sortBy={sortBy}
        isSortOpen={isSortOpen}
        sortRef={sortRef}
        sortingLabel={t.vault.sorting.label}
        newestLabel={t.vault.sorting.newest}
        oldestLabel={t.vault.sorting.oldest}
        alphabeticalLabel={t.vault.sorting.alphabetical}
        onSearchChange={handleSearchChange}
        onViewChange={handleViewChange}
        onToggleSortOpen={handleToggleSortOpen}
        onSortChange={handleSortChange}
      />

      <VaultMediaGrid
        mediaItems={allMedia}
        view={view}
        isLoading={isLoading}
        activeTab={activeTab}
        isSelectionMode={isSelectionMode}
        selectedIds={bulkSelection}
        hasNextPage={Boolean(hasNextPage)}
        isFetchingNextPage={isFetchingNextPage}
        noFavoritesLabel={t.vault.status.noFavorites}
        noMatchingRecordsLabel={t.vault.status.noMatchingRecords}
        onLoadMore={fetchNextPage}
        onToggleSelection={handleToggleMediaSelection}
        onSelectMedia={setSelectedMedia}
        onToggleFavorite={toggleFav}
      />

      <VaultMediaDetailModalContainer
        media={selectedMedia}
        relatedMedia={allMedia}
        tagState={tagState}
        setTagState={setTagState}
        onClose={() => setSelectedMedia(null)}
        onSelectRelatedMedia={setSelectedMedia}
        onToggleFavorite={toggleFav}
        onDelete={requestDeleteMedia}
        onPersistTags={persistTags}
        onUpdateMedia={handleUpdateMedia}
        onSyncMedia={syncMediaRecord}
        shouldPollExif={shouldPollExif(selectedMedia?.id)}
        isUpdatingMedia={updateMediaMetadataMutation.isPending}
      />

      <VaultUploadModalContainer
        canUpload={canUpload}
        uploadState={uploadState}
        setUploadState={setUploadState}
        isUploading={uploadMutation.isPending}
        onClose={resetUploadState}
        onStartUpload={() => handleStartUpload(uploadState)}
      />

      <ConfirmModal
        isOpen={Boolean(confirmState)}
        title={confirmState?.title || ''}
        message={confirmState?.message || ''}
        confirmLabel={confirmState?.confirmLabel || t.common.actions.confirm}
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
