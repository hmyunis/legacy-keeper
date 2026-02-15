import React, { useMemo, useState } from 'react';
import { AlertTriangle, RefreshCw, ShieldCheck, Trash2, X } from 'lucide-react';
import type { VaultHealthReport } from '../../types';
import ConfirmModal from '../ui/ConfirmModal';

interface VaultHealthDialogProps {
  isOpen: boolean;
  report?: VaultHealthReport;
  isLoading: boolean;
  isCleaning: boolean;
  preview?: {
    duplicateItemsCount?: number;
    reclaimableBytes?: number;
  } | null;
  selectedHashes: string[];
  onToggleHash: (hash: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onRefresh: () => void;
  onDryRun: () => void;
  onCleanupSelected: () => void;
  onClose: () => void;
}

const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

const VaultHealthDialog: React.FC<VaultHealthDialogProps> = ({
  isOpen,
  report,
  isLoading,
  isCleaning,
  preview,
  selectedHashes,
  onToggleHash,
  onSelectAll,
  onClearSelection,
  onRefresh,
  onDryRun,
  onCleanupSelected,
  onClose,
}) => {
  const [confirmCleanup, setConfirmCleanup] = useState(false);

  const selectedReclaimableBytes = useMemo(() => {
    if (!report?.groups?.length) return 0;
    const selected = new Set(selectedHashes);
    return report.groups
      .filter((group) => selected.has(group.hash))
      .reduce((total, group) => total + group.reclaimableBytes, 0);
  }, [report?.groups, selectedHashes]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[120] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl flex flex-col">
          <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">Archival Health Analysis</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Review duplicate groups and clean safely while preserving metadata and tags.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={20} />
            </button>
          </div>

          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button
              type="button"
              onClick={onSelectAll}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={onClearSelection}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest"
            >
              Clear Selection
            </button>
            <button
              type="button"
              onClick={onDryRun}
              disabled={!selectedHashes.length || isLoading || isCleaning}
              className="px-4 py-2 rounded-xl border border-primary/40 text-primary bg-primary/5 text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
            >
              Safe Preview
            </button>
            <button
              type="button"
              onClick={() => setConfirmCleanup(true)}
              disabled={!selectedHashes.length || isLoading || isCleaning}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
            >
              <Trash2 size={14} /> Clean Selected
            </button>
          </div>

          <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-4 gap-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Groups</p>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{report?.duplicateGroupsCount || 0}</p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Duplicates</p>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{report?.duplicateItemsCount || 0}</p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Recoverable</p>
              <p className="text-lg font-bold text-emerald-600">{formatBytes(report?.reclaimableBytes || 0)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Selected</p>
              <p className="text-lg font-bold text-primary">{formatBytes(selectedReclaimableBytes)}</p>
            </div>
          </div>

          {preview && (
            <div className="mx-6 mt-4 p-4 rounded-2xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/70 dark:bg-blue-950/20 text-xs text-blue-700 dark:text-blue-300">
              Preview: {preview.duplicateItemsCount || 0} duplicate files can be cleaned, recovering{' '}
              {formatBytes(preview.reclaimableBytes || 0)}.
            </div>
          )}

          <div className="flex-1 overflow-auto px-6 py-4 space-y-3">
            {isLoading && <p className="text-sm text-slate-500">Analyzing vault files...</p>}
            {!isLoading && !report?.groups?.length && (
              <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/70 dark:bg-emerald-950/20 p-5 text-sm text-emerald-700 dark:text-emerald-300 flex items-start gap-3">
                <ShieldCheck size={18} className="mt-0.5 shrink-0" />
                <span>No redundant files found. Your vault is healthy.</span>
              </div>
            )}

            {!isLoading &&
              report?.groups?.map((group) => {
                const checked = selectedHashes.includes(group.hash);
                return (
                  <label
                    key={group.hash}
                    className={`block rounded-2xl border p-4 transition-all ${checked ? 'border-primary bg-primary/5' : 'border-slate-200 dark:border-slate-800'}`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggleHash(group.hash)}
                        className="mt-1 h-4 w-4"
                      />
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                            Hash {group.hash.slice(0, 10)}...
                          </p>
                          <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
                            {group.duplicateCount} duplicates
                          </span>
                          <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                            {formatBytes(group.reclaimableBytes)} reclaimable
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-2">
                          Keep: {group.primary.title}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Remove: {group.duplicates.map((item) => item.title).join(', ')}
                        </p>
                      </div>
                    </div>
                  </label>
                );
              })}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmCleanup}
        title="Clean Selected Duplicates?"
        message={`This will remove ${selectedHashes.length} duplicate groups while preserving one canonical file per group and merging metadata/tags.`}
        confirmLabel="Run Cleanup"
        onConfirm={() => {
          setConfirmCleanup(false);
          onCleanupSelected();
        }}
        onCancel={() => setConfirmCleanup(false)}
        isPending={isCleaning}
      />
    </>
  );
};

export default VaultHealthDialog;

