import type { VaultMemory } from '../../vault/types';

export interface TimelineEvent extends VaultMemory {
  event_type?: string;
}

export interface PersonProfile {
  id: string;
  name: string;
  photo?: string;
  biography: string;
  role: string;
  birthYear: string;
  deathYear?: string;
  memoryCount: number;
  memories: VaultMemory[];
  kinship: { id: string; name: string; role: string; relationship?: string; avatar: string }[];
  active_story_task_id: string | null;
}
