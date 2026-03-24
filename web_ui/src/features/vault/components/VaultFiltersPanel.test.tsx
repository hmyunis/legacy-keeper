import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MediaType } from '@/types';
import { VaultFiltersPanel } from './VaultFiltersPanel';
import type { VaultFiltersState } from '@/features/vault/utils';

vi.mock('@/components/vault/VaultFilters', () => ({
  default: (props: any) => (
    <div data-testid="vault-filters">
      <button onClick={() => props.onPeopleChange('Ada')}>people</button>
      <button onClick={() => props.onTagChange('Family')}>tags</button>
      <button onClick={() => props.onTypeChange(MediaType.PHOTO)}>types</button>
      <button onClick={() => props.onEraChange('1990s')}>era</button>
      <button onClick={() => props.onClear()}>clear</button>
    </div>
  ),
}));

const baseFilters: VaultFiltersState = {
  people: [],
  tags: [],
  locations: [],
  era: null,
  types: [],
  startDate: undefined,
  endDate: undefined,
};

describe('VaultFiltersPanel', () => {
  it('does not render when collapsed', () => {
    render(
      <VaultFiltersPanel
        isExpanded={false}
        isLoadingOptions={false}
        filters={baseFilters}
        onApplyFilterChange={vi.fn()}
        onClearFilters={vi.fn()}
      />,
    );

    expect(screen.queryByTestId('vault-filters')).not.toBeInTheDocument();
  });

  it('maps filter adapter callbacks to state updater functions', () => {
    const onApplyFilterChange = vi.fn();
    const onClearFilters = vi.fn();

    render(
      <VaultFiltersPanel
        isExpanded
        isLoadingOptions={false}
        filters={baseFilters}
        onApplyFilterChange={onApplyFilterChange}
        onClearFilters={onClearFilters}
      />,
    );

    fireEvent.click(screen.getByText('people'));
    fireEvent.click(screen.getByText('tags'));
    fireEvent.click(screen.getByText('types'));
    fireEvent.click(screen.getByText('era'));
    fireEvent.click(screen.getByText('clear'));

    const peopleUpdate = onApplyFilterChange.mock.calls[0][0] as (
      current: VaultFiltersState,
    ) => VaultFiltersState;
    const tagsUpdate = onApplyFilterChange.mock.calls[1][0] as (
      current: VaultFiltersState,
    ) => VaultFiltersState;
    const typesUpdate = onApplyFilterChange.mock.calls[2][0] as (
      current: VaultFiltersState,
    ) => VaultFiltersState;
    const eraUpdate = onApplyFilterChange.mock.calls[3][0] as (
      current: VaultFiltersState,
    ) => VaultFiltersState;

    expect(peopleUpdate(baseFilters).people).toEqual(['Ada']);
    expect(tagsUpdate(baseFilters).tags).toEqual(['Family']);
    expect(typesUpdate(baseFilters).types).toEqual([MediaType.PHOTO]);
    expect(eraUpdate(baseFilters).era).toBe('1990s');
    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });
});
