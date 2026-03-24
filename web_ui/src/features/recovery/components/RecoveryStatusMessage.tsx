import type { FC } from 'react';
import { CheckCircle2, CircleX, Loader2 } from 'lucide-react';
import type { RecoveryStatus } from '@/features/recovery/types';

interface RecoveryStatusMessageProps {
  status: RecoveryStatus;
  message: string;
}

export const RecoveryStatusMessage: FC<RecoveryStatusMessageProps> = ({ status, message }) => (
  <div className="flex items-start gap-3 text-sm">
    {status === 'loading' && <Loader2 className="animate-spin text-primary mt-0.5" size={20} />}
    {status === 'success' && <CheckCircle2 className="text-emerald-600 mt-0.5" size={20} />}
    {status === 'error' && <CircleX className="text-rose-600 mt-0.5" size={20} />}
    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{message}</p>
  </div>
);
