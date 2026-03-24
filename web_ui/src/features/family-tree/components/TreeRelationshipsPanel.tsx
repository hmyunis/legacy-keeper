import type { FC } from 'react';
import { Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/Skeleton';
import type { TreeRelationRow } from '@/features/family-tree/types';

interface TreeRelationshipsPanelProps {
  isLoading: boolean;
  rows: TreeRelationRow[];
  canEdit: boolean;
  isDeleting: boolean;
  title: string;
  totalLabel: string;
  emptyLabel: string;
  onRemoveRelationship: (relationshipId: string, summary: string) => void;
}

export const TreeRelationshipsPanel: FC<TreeRelationshipsPanelProps> = ({
  isLoading,
  rows,
  canEdit,
  isDeleting,
  title,
  totalLabel,
  emptyLabel,
  onRemoveRelationship,
}) => (
  <div className="bg-white dark:bg-slate-900/40 rounded-4xl sm:rounded-[2.5rem] border dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-4">
    <div className="flex items-center justify-between gap-4">
      <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">{title}</h2>
      <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
        {rows.length} {totalLabel}
      </span>
    </div>

    {isLoading ? (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    ) : rows.length === 0 ? (
      <p className="text-xs text-slate-500 dark:text-slate-400">{emptyLabel}</p>
    ) : (
      <div className="space-y-2">
        {rows.map((relationship) => (
          <div
            key={relationship.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/30 px-4 py-3"
          >
            <p className="text-xs text-slate-700 dark:text-slate-200">{relationship.summary}</p>
            {canEdit && (
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => onRemoveRelationship(relationship.id, relationship.summary)}
                className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all disabled:opacity-50"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
    )}
  </div>
);
