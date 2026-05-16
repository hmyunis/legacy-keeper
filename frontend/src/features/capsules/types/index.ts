export type CapsuleStatus = 'locked' | 'ready' | 'unlocking' | 'opened';

export interface Capsule {
  id: string;
  title: string;
  unlockDate: string;
  daysRemaining: number;
  status: CapsuleStatus;
  sealedBy: string;
  message?: string;
}