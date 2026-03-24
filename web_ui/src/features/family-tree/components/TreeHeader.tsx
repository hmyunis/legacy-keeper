import type { FC } from 'react';
import { GitMerge, UserPlus } from 'lucide-react';

interface TreeHeaderProps {
  title: string;
  subtitle: string;
  canEdit: boolean;
  addRelativeLabel: string;
  linkKinLabel: string;
  onAddRelative: () => void;
  onLinkKin: () => void;
}

export const TreeHeader: FC<TreeHeaderProps> = ({
  title,
  subtitle,
  canEdit,
  addRelativeLabel,
  linkKinLabel,
  onAddRelative,
  onLinkKin,
}) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div>
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{title}</h1>
      <p className="text-slate-500 dark:text-slate-400 text-sm">{subtitle}</p>
    </div>
    {canEdit && (
      <div className="flex gap-2 w-full sm:w-auto">
        <button
          onClick={onAddRelative}
          className="flex-1 sm:flex-none px-4 py-3 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm hover:border-primary/50"
        >
          <UserPlus size={16} className="text-primary" />
          {addRelativeLabel}
        </button>
        <button
          onClick={onLinkKin}
          className="flex-1 sm:flex-none px-4 py-3 bg-primary text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:opacity-90 glow-primary shadow-lg shadow-primary/10"
        >
          <GitMerge size={16} />
          {linkKinLabel}
        </button>
      </div>
    )}
  </div>
);
