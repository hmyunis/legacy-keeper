import type { FC } from 'react';
import VaultFilters from '@/components/vault/VaultFilters';
import type { MediaFilterSummary } from '@/services/mediaApi';
import {
  toggleStringItem,
  toggleTypeItem,
  type VaultFiltersState,
} from '@/features/vault/utils';

interface VaultFiltersPanelProps {
  isExpanded: boolean;
  filterSummary?: MediaFilterSummary;
  isLoadingOptions: boolean;
  filters: VaultFiltersState;
  onApplyFilterChange: (
    updater: (current: VaultFiltersState) => VaultFiltersState,
  ) => void;
  onClearFilters: () => void;
}

export const VaultFiltersPanel: FC<VaultFiltersPanelProps> = ({
  isExpanded,
  filterSummary,
  isLoadingOptions,
  filters,
  onApplyFilterChange,
  onClearFilters,
}) => {
  if (!isExpanded) return null;

  return (
    <VaultFilters
      peopleOptions={filterSummary?.people || []}
      tagOptions={filterSummary?.tags || []}
      locationOptions={filterSummary?.locations || []}
      eraOptions={filterSummary?.eras || []}
      typeOptions={filterSummary?.types || []}
      isLoadingOptions={isLoadingOptions}
      selectedPeople={filters.people}
      onPeopleChange={(person) =>
        onApplyFilterChange((current) => ({
          ...current,
          people: toggleStringItem(current.people, person),
        }))
      }
      selectedTags={filters.tags}
      onTagChange={(tag) =>
        onApplyFilterChange((current) => ({
          ...current,
          tags: toggleStringItem(current.tags, tag),
        }))
      }
      selectedLocations={filters.locations}
      onLocationChange={(location) =>
        onApplyFilterChange((current) => ({
          ...current,
          locations: toggleStringItem(current.locations, location),
        }))
      }
      selectedEra={filters.era}
      onEraChange={(era) =>
        onApplyFilterChange((current) => ({
          ...current,
          era,
        }))
      }
      selectedTypes={filters.types}
      onTypeChange={(type) =>
        onApplyFilterChange((current) => ({
          ...current,
          types: toggleTypeItem(current.types, type),
        }))
      }
      startDate={filters.startDate}
      onStartDateChange={(date) =>
        onApplyFilterChange((current) => ({
          ...current,
          startDate: date,
        }))
      }
      endDate={filters.endDate}
      onEndDateChange={(date) =>
        onApplyFilterChange((current) => ({
          ...current,
          endDate: date,
        }))
      }
      onClear={onClearFilters}
    />
  );
};

