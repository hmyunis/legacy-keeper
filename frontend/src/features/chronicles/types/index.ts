import type { VaultMemory } from '../../vault/types';

export interface TimelineEvent extends VaultMemory {
  event_type?: string;
}

export interface PersonProfile {
  id: string;
  name: string;
  biography: string;
  role: string;
  birthYear: string;
  deathYear?: string;
  memoryCount: number;
}