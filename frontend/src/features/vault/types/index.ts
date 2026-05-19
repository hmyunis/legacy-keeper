export interface VaultMemory {
  id: string;
  url: string;
  restoredUrl?: string;
  title: string;
  location: string;
  date: string;
  year: string;
  cluster_name: string;
  ai_caption: string;
  human_caption: string;
  tags: string[];
  people: string[];
  detected_faces?: { id: string; person_id: string; person_name: string; person_avatar: string }[];
  exif_json?: Record<string, unknown>;
  is_reviewed: boolean;
  is_indexed: boolean;
  is_favorite: boolean;
}

export interface VaultCluster {
  name: string;
  angle: number;
  memories: VaultMemory[];
}