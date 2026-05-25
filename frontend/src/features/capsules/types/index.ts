export interface Capsule {
  id: string;
  title: string;
  unlock_date: string;
  status: 'LOCKED' | 'READY' | 'OPENED';
  daysRemaining: number;
  message?: string;
  sealedById?: string | null;
  is_public?: boolean;
  targetUsers?: { id: string; name: string; email: string }[];
  addedToVault?: boolean;
  memory_urls?: string[];
}
