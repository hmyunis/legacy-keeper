import type { FC } from 'react';
import { Trash2 } from 'lucide-react';

interface VaultBulkSelectionBarProps {
  selectionCount: number;
  artifactSelectedLabel: string;
  selectAllLabel: string;
  purgeLabel: string;
  onSelectAll: () => void;
  onPurge: () => void;
}

export const VaultBulkSelectionBar: FC<VaultBulkSelectionBarProps> = ({
  selectionCount,
  artifactSelectedLabel,
  selectAllLabel,
  purgeLabel,
  onSelectAll,
  onPurge,
}) => (
  <div className="bg-white dark:bg-slate-900 border-2 border-primary rounded-3xl p-4 flex flex-col sm:flex-row items-center justify-between shadow-xl animate-in slide-in-from-top-4 gap-3">
    <span className="text-[10px] font-black text-primary uppercase tracking-widest sm:pl-2">
      {selectionCount} {artifactSelectedLabel}
    </span>
    <div className="flex w-full sm:w-auto gap-2">
      <button
        type="button"
        onClick={onSelectAll}
        className="flex-1 sm:flex-none px-4 py-2 text-[10px] font-bold text-slate-500 hover:text-primary transition-colors"
      >
        {selectAllLabel}
      </button>
      <button
        type="button"
        onClick={onPurge}
        className="flex-1 sm:flex-none px-5 py-2.5 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20"
      >
        <Trash2 size={14} /> {purgeLabel}
      </button>
    </div>
  </div>
);

