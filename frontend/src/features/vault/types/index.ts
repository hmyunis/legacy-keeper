export interface VaultMemory {
  id: number;
  url: string;
  restoredUrl?: string;
  title: string;
  location: string;
  date: string;
  year: string;
  cluster_name: string;
  ai_caption: string;
  tags: string[];
  people: string[];
}

export interface VaultCluster {
  name: string;
  angle: number;
  memories: VaultMemory[];
}
