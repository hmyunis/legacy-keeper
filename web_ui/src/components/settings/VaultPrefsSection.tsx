
import React, { useEffect, useState } from 'react';
import { Database, HardDrive, Share2, AlertCircle, LogOut } from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext';
import { Select, SelectContent, SelectItem, SelectTrigger } from '../ui/Select';

interface TransferCandidate {
  id: string;
  label: string;
}

interface VaultPrefsSectionProps {
  settings: {
    quality: 'original' | 'high' | 'balanced';
    defaultVisibility: 'private' | 'family';
    safetyWindowMinutes: number;
  };
  storageUsedBytes: number;
  storageLimitGb?: number | null;
  isUpdatingSettings: boolean;
  onUpdate: (key: string, value: any) => void;
  familyName: string;
  onFamilyNameChange: (value: string) => void;
  onSaveFamilyName: () => void;
  isSavingFamilyName: boolean;
  canManage: boolean;
  onLeaveVault: () => void;
  isLeaving: boolean;
  isLeaveDisabled?: boolean;
  leaveDisabledReason?: string;
  canTransferOwnership: boolean;
  transferCandidates: TransferCandidate[];
  selectedTransferMembershipId: string;
  onSelectTransferMembership: (membershipId: string) => void;
  onTransferOwnership: () => void;
  isTransferringOwnership: boolean;
  isHealthLoading: boolean;
  healthSummary?: {
    duplicateGroupsCount: number;
    duplicateItemsCount: number;
    reclaimableBytes: number;
  } | null;
  onOpenHealthAnalysis: () => void;
}

const VaultPrefsSection: React.FC<VaultPrefsSectionProps> = ({
  settings,
  storageUsedBytes,
  storageLimitGb,
  isUpdatingSettings,
  onUpdate,
  familyName,
  onFamilyNameChange,
  onSaveFamilyName,
  isSavingFamilyName,
  canManage,
  onLeaveVault,
  isLeaving,
  isLeaveDisabled = false,
  leaveDisabledReason,
  canTransferOwnership,
  transferCandidates,
  selectedTransferMembershipId,
  onSelectTransferMembership,
  onTransferOwnership,
  isTransferringOwnership,
  isHealthLoading,
  healthSummary,
  onOpenHealthAnalysis,
}) => {
  const { t } = useTranslation();
  const selectedTransferCandidateLabel =
    transferCandidates.find((candidate) => candidate.id === selectedTransferMembershipId)?.label || '';
  const [safetyWindowDraft, setSafetyWindowDraft] = useState(settings.safetyWindowMinutes);

  useEffect(() => {
    setSafetyWindowDraft(settings.safetyWindowMinutes);
  }, [settings.safetyWindowMinutes]);

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

  const usedBytes = Number.isFinite(storageUsedBytes) ? Math.max(0, storageUsedBytes) : 0;
  const storagePercent =
    storageLimitGb && storageLimitGb > 0
      ? Math.min((usedBytes / (storageLimitGb * 1024 * 1024 * 1024)) * 100, 100)
      : null;
  
  return (
    <div className="bg-white dark:bg-slate-900/60 rounded-[2.5rem] border p-6 sm:p-12 shadow-sm space-y-10 glow-card animate-in slide-in-from-right-4">
      <div className="space-y-1">
        <h3 className="text-xl font-bold">{t.settings.vault.title}</h3>
        <p className="text-sm text-slate-500">{t.settings.vault.subtitle}</p>
      </div>

      <div className="space-y-8">
        <div className="p-6 rounded-4xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${storagePercent !== null && storagePercent > 90 ? 'bg-rose-500/10 text-rose-600' : 'bg-primary/10 text-primary'}`}>
                <HardDrive size={18} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t.dashboard.archivalStorage}</p>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {formatBytes(usedBytes)} Used So Far
                </p>
              </div>
            </div>
            {storageLimitGb ? (
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {storageLimitGb} GB Plan
              </p>
            ) : null}
          </div>
          {storagePercent !== null ? (
            <>
              <div className="w-full h-2.5 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800">
                <div
                  className={`h-full transition-all duration-700 ${storagePercent > 90 ? 'bg-rose-500' : 'bg-primary'}`}
                  style={{ width: `${storagePercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400">
                <span>{storagePercent > 90 ? 'Near Capacity' : 'Capacity Healthy'}</span>
                <span>{Math.round(storagePercent)}% used</span>
              </div>
            </>
          ) : null}
        </div>

        {canManage ? (
          <>
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">{t.settings.vault.familyName.title}</h4>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={familyName}
                  onChange={(event) => onFamilyNameChange(event.target.value)}
                  placeholder={t.settings.vault.familyName.placeholder}
                  className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm"
                />
                <button
                  type="button"
                  onClick={onSaveFamilyName}
                  disabled={isSavingFamilyName || !familyName.trim()}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary text-white hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSavingFamilyName ? t.settings.vault.familyName.saving : t.settings.vault.familyName.save}
                </button>
              </div>
              <p className="text-[11px] text-slate-500">{t.settings.vault.familyName.description}</p>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">{t.settings.vault.quality}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {(['balanced', 'high', 'original'] as const).map((q) => (
                  <button
                    key={q}
                    disabled={isUpdatingSettings}
                    onClick={() => onUpdate('quality', q)}
                    className={`p-5 rounded-3xl border transition-all text-left space-y-2 disabled:opacity-60 ${settings.quality === q ? 'border-primary bg-primary/5 ring-2 ring-primary/10' : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                  >
                    <HardDrive size={18} className={settings.quality === q ? 'text-primary' : 'text-slate-400'} />
                    <div>
                      <p className={`text-[10px] font-black uppercase tracking-widest ${settings.quality === q ? 'text-primary' : 'text-slate-500'}`}>{t.settings.vault.qualities[q].label}</p>
                      <p className="text-[9px] text-slate-400 mt-0.5 leading-tight">
                        {t.settings.vault.qualities[q].desc}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">{t.settings.vault.privacy}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  disabled={isUpdatingSettings}
                  onClick={() => onUpdate('defaultVisibility', 'private')}
                  className={`flex items-center gap-4 p-5 rounded-4xl border transition-all disabled:opacity-60 ${settings.defaultVisibility === 'private' ? 'border-primary bg-primary/5' : 'border-slate-100 dark:border-slate-800'}`}
                >
                  <div className={`p-3 rounded-2xl ${settings.defaultVisibility === 'private' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}><Database size={18} /></div>
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase tracking-widest">{t.settings.vault.privacies.private.label}</p>
                    <p className="text-[9px] text-slate-500 mt-0.5">{t.settings.vault.privacies.private.desc}</p>
                  </div>
                </button>
                <button
                  disabled={isUpdatingSettings}
                  onClick={() => onUpdate('defaultVisibility', 'family')}
                  className={`flex items-center gap-4 p-5 rounded-4xl border transition-all disabled:opacity-60 ${settings.defaultVisibility === 'family' ? 'border-primary bg-primary/5' : 'border-slate-100 dark:border-slate-800'}`}
                >
                  <div className={`p-3 rounded-2xl ${settings.defaultVisibility === 'family' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}><Share2 size={18} /></div>
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase tracking-widest">{t.settings.vault.privacies.family.label}</p>
                    <p className="text-[9px] text-slate-500 mt-0.5">{t.settings.vault.privacies.family.desc}</p>
                  </div>
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">{t.settings.vault.safetyWindow.title}</h4>
              <div className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 space-y-3">
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                  <input
                    type="number"
                    min={0}
                    max={10080}
                    step={1}
                    value={safetyWindowDraft}
                    onChange={(event) => {
                      const next = Number.parseInt(event.target.value, 10);
                      setSafetyWindowDraft(Number.isFinite(next) ? next : 0);
                    }}
                    className="w-full sm:w-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm"
                  />
                  <span className="text-xs text-slate-500">{t.settings.vault.safetyWindow.minutesLabel}</span>
                  <button
                    type="button"
                    disabled={
                      isUpdatingSettings ||
                      safetyWindowDraft < 0 ||
                      safetyWindowDraft > 10080 ||
                      safetyWindowDraft === settings.safetyWindowMinutes
                    }
                    onClick={() => onUpdate('safetyWindowMinutes', safetyWindowDraft)}
                    className="sm:ml-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary text-white hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isUpdatingSettings ? t.settings.vault.safetyWindow.saving : t.settings.vault.safetyWindow.save}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {t.settings.vault.safetyWindow.description}
                </p>
              </div>
            </div>
          </>
        ) : null}

        {canManage && (
          <button
            type="button"
            onClick={onOpenHealthAnalysis}
            className="w-full text-left p-6 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-4xl flex items-start gap-4 hover:border-amber-300 transition-all group"
          >
            <div className="relative">
              <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black text-amber-800 dark:text-amber-400 uppercase tracking-widest">{t.settings.vault.health}</p>
              <p className="text-[10px] text-amber-600 dark:text-amber-500/80 mt-0.5 leading-relaxed">{t.settings.vault.healthDesc}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[9px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded-full">
                  {t.settings.vault.healthClickHint}
                </span>
                {isHealthLoading ? (
                  <span className="text-[9px] text-amber-600">Analyzing...</span>
                ) : (
                  <span className="text-[9px] text-amber-600 dark:text-amber-400">
                    Last scan: {healthSummary?.duplicateGroupsCount ? `${healthSummary.duplicateGroupsCount} groups found` : 'No issues'}
                  </span>
                )}
              </div>
            </div>
          </button>
        )}

        {canManage && (
        <div className="p-6 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/20 rounded-4xl space-y-4">
          <div>
            <p className="text-[10px] font-black text-indigo-800 dark:text-indigo-400 uppercase tracking-widest">{t.settings.vault.transfer.title}</p>
            <p className="text-[11px] text-indigo-700 dark:text-indigo-300/80 mt-1 leading-relaxed">{t.settings.vault.transfer.description}</p>
          </div>
          {canTransferOwnership ? (
            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={selectedTransferMembershipId} onValueChange={onSelectTransferMembership}>
                <SelectTrigger className="flex-1 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-xl px-4 py-2.5 text-sm">
                  <span
                    className={
                      selectedTransferCandidateLabel
                        ? 'text-slate-700 dark:text-slate-200 truncate'
                        : 'text-slate-400 truncate'
                    }
                  >
                    {selectedTransferCandidateLabel || t.settings.vault.transfer.selectPlaceholder}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {transferCandidates.map((candidate) => (
                    <SelectItem key={candidate.id} value={candidate.id}>
                      {candidate.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                type="button"
                onClick={onTransferOwnership}
                disabled={isTransferringOwnership || !selectedTransferMembershipId}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isTransferringOwnership ? t.settings.vault.transfer.loading : t.settings.vault.transfer.button}
              </button>
            </div>
          ) : (
            <p className="text-[11px] text-indigo-700 dark:text-indigo-300/80">{t.settings.vault.transfer.ownerOnly}</p>
          )}
        </div>
        )}

        <div className="p-6 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/20 rounded-4xl space-y-4">
          <div>
            <p className="text-[10px] font-black text-rose-800 dark:text-rose-400 uppercase tracking-widest">{t.settings.vault.leave.title}</p>
            <p className="text-[11px] text-rose-700 dark:text-rose-300/80 mt-1 leading-relaxed">{t.settings.vault.leave.description}</p>
          </div>
          <button
            type="button"
            onClick={onLeaveVault}
            disabled={isLeaving || isLeaveDisabled}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <LogOut size={14} />
            {isLeaving ? t.settings.vault.leave.loading : t.settings.vault.leave.button}
          </button>
          {isLeaveDisabled && leaveDisabledReason ? (
            <p className="text-[11px] text-rose-700 dark:text-rose-300/80">{leaveDisabledReason}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default VaultPrefsSection;
