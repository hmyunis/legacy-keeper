import type { FC } from 'react';
import { Plus } from 'lucide-react';

interface DashboardHeaderProps {
  title: string;
  subtitle: string;
  canUpload: boolean;
  addMemoryLabel: string;
  onAddMemory: () => void;
}

export const DashboardHeader: FC<DashboardHeaderProps> = ({
  title,
  subtitle,
  canUpload,
  addMemoryLabel,
  onAddMemory,
}) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div>
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{title}</h1>
      <p className="text-slate-500 dark:text-slate-400 text-sm">{subtitle}</p>
    </div>
    {canUpload && (
      <button
        type="button"
        onClick={onAddMemory}
        className="w-full sm:w-auto bg-primary text-white px-5 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg glow-primary active:scale-95"
      >
        <Plus size={18} />
        {addMemoryLabel}
      </button>
    )}
  </div>
);
