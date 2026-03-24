import { useCallback, useEffect } from 'react';
import type { NavigateFn } from '@tanstack/react-router';
import {
  buildVaultSearchParams,
  type VaultFiltersState,
  type VaultSortOption,
  type VaultTab,
  type VaultViewMode,
} from '@/features/vault/utils';

interface UseVaultSearchSyncInput {
  navigate: NavigateFn;
  searchParams: {
    sort?: string;
    view?: string;
    tab?: VaultTab;
  };
  activeTab: VaultTab;
  searchQuery: string;
  debouncedSearchQuery: string;
  initialSearch: string;
  sortBy: VaultSortOption;
  view: VaultViewMode;
  filters: VaultFiltersState;
}

interface SyncVaultSearchInput {
  nextSearch: string;
  nextSort: VaultSortOption;
  nextView: VaultViewMode;
  nextFilters: VaultFiltersState;
  replace?: boolean;
  nextTab?: VaultTab;
}

export const useVaultSearchSync = ({
  navigate,
  searchParams,
  activeTab,
  searchQuery,
  debouncedSearchQuery,
  initialSearch,
  sortBy,
  view,
  filters,
}: UseVaultSearchSyncInput) => {
  const syncVaultSearch = useCallback(
    ({
      nextSearch,
      nextSort,
      nextView,
      nextFilters,
      replace = false,
      nextTab = activeTab,
    }: SyncVaultSearchInput) => {
      navigate({
        to: '/vault',
        replace,
        search: (prev: Record<string, unknown>) =>
          buildVaultSearchParams(prev, {
            searchQuery: nextSearch,
            sortBy: nextSort,
            view: nextView,
            tab: nextTab,
            filters: nextFilters,
          }),
      } as any);
    },
    [activeTab, navigate],
  );

  useEffect(() => {
    const currentSearchTab: VaultTab =
      searchParams.tab === 'favorites' ? 'favorites' : 'all';
    if (searchParams.sort && searchParams.view && currentSearchTab === activeTab) return;
    syncVaultSearch({
      nextSearch: searchQuery,
      nextSort: sortBy,
      nextView: view,
      nextFilters: filters,
      replace: true,
      nextTab: activeTab,
    });
  }, [
    activeTab,
    filters,
    searchParams.sort,
    searchParams.tab,
    searchParams.view,
    searchQuery,
    sortBy,
    syncVaultSearch,
    view,
  ]);

  useEffect(() => {
    const currentSearch = initialSearch.trim();
    if (debouncedSearchQuery === currentSearch) return;
    syncVaultSearch({
      nextSearch: debouncedSearchQuery,
      nextSort: sortBy,
      nextView: view,
      nextFilters: filters,
      replace: true,
      nextTab: activeTab,
    });
  }, [
    activeTab,
    debouncedSearchQuery,
    filters,
    initialSearch,
    sortBy,
    syncVaultSearch,
    view,
  ]);

  return { syncVaultSearch };
};
