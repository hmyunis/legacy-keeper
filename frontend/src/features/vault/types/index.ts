export interface VaultMemory {
  id: number;
  url: string;
  title: string;
  location: string;
  year: string;
  date: string;
  caption: string;
  people: string[];
  tags: string[];
  aiCaption?: string;
  restoredUrl?: string;
}

export interface VaultCluster {
  name: string;
  angle: number;
  memories: VaultMemory[];
}