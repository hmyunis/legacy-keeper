import type { VaultMemory } from '../../vault/types';

export interface SearchState {
  query: string;
  isSearching: boolean;
  hasSearched: boolean;
  results: VaultMemory[];
  thinkingStep: number;
}