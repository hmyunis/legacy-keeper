import type { FC } from 'react';
import { UserPlus } from 'lucide-react';

interface MembersHeaderProps {
  title: string;
  subtitle: string;
  inviteLabel: string;
  onInvite: () => void;
}

export const MembersHeader: FC<MembersHeaderProps> = ({
  title,
  subtitle,
  inviteLabel,
  onInvite,
}) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
    <div>
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-slate-500 dark:text-slate-400 text-sm">{subtitle}</p>
    </div>
    <button
      onClick={onInvite}
      className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 hover:opacity-90 glow-primary active:scale-95 shadow-lg shadow-primary/20"
    >
      <UserPlus size={18} />
      {inviteLabel}
    </button>
  </div>
);
