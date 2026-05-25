export interface Capsule {
  id: string;
  title: string;
  unlock_date: string;
  status: 'LOCKED' | 'READY' | 'OPENED';
  daysRemaining: number;
  message?: string;
  sealedById?: string | null;
}
