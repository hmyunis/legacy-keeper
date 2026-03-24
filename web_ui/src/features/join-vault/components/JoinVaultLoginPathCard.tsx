import type { FC } from 'react';
import { CircleX } from 'lucide-react';

interface JoinVaultLoginPathCardProps {
  message: string;
  actionLabel: string;
  onAction: () => void;
}

export const JoinVaultLoginPathCard: FC<JoinVaultLoginPathCardProps> = ({
  message,
  actionLabel,
  onAction,
}) => (
  <div className="space-y-3">
    <div className="flex items-start gap-3 text-amber-700 dark:text-amber-400">
      <CircleX size={20} className="mt-0.5" />
      <p className="text-sm font-medium">{message}</p>
    </div>
    <button
      onClick={onAction}
      className="w-full bg-primary text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all"
    >
      {actionLabel}
    </button>
  </div>
);
