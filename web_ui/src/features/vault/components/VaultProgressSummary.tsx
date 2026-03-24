import type { FC } from 'react';
import type { VaultExifProgressSummary } from '@/features/vault/utils';

interface VaultProgressSummaryProps {
  summary: VaultExifProgressSummary;
  photoProcessingExifLabel: string;
  photosProcessingExifLabel: string;
  awaitingUploaderConfirmationLabel: string;
  exifExtractionFailedLabel: string;
  photoProcessingFacesLabel: string;
  photosProcessingFacesLabel: string;
  faceDetectionFailedLabel: string;
}

export const VaultProgressSummary: FC<VaultProgressSummaryProps> = ({
  summary,
  photoProcessingExifLabel,
  photosProcessingExifLabel,
  awaitingUploaderConfirmationLabel,
  exifExtractionFailedLabel,
  photoProcessingFacesLabel,
  photosProcessingFacesLabel,
  faceDetectionFailedLabel,
}) => {
  const hasAnySummary =
    summary.active > 0 ||
    summary.awaitingConfirmation > 0 ||
    summary.failed > 0 ||
    summary.faceProcessing > 0 ||
    summary.faceFailed > 0;

  if (!hasAnySummary) return null;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/70 p-3 text-xs text-slate-600 dark:text-slate-300 flex flex-wrap items-center gap-3">
      {summary.active > 0 && (
        <span className="inline-flex items-center gap-2 rounded-full bg-sky-50 dark:bg-sky-900/30 px-3 py-1 font-semibold text-sky-700 dark:text-sky-300">
          {summary.active} {summary.active === 1 ? photoProcessingExifLabel : photosProcessingExifLabel}
        </span>
      )}
      {summary.awaitingConfirmation > 0 && (
        <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 dark:bg-amber-900/30 px-3 py-1 font-semibold text-amber-700 dark:text-amber-300">
          {summary.awaitingConfirmation} {awaitingUploaderConfirmationLabel}
        </span>
      )}
      {summary.failed > 0 && (
        <span className="inline-flex items-center gap-2 rounded-full bg-rose-50 dark:bg-rose-900/30 px-3 py-1 font-semibold text-rose-700 dark:text-rose-300">
          {summary.failed} {exifExtractionFailedLabel}
        </span>
      )}
      {summary.faceProcessing > 0 && (
        <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 font-semibold text-indigo-700 dark:text-indigo-300">
          {summary.faceProcessing}{' '}
          {summary.faceProcessing === 1 ? photoProcessingFacesLabel : photosProcessingFacesLabel}
        </span>
      )}
      {summary.faceFailed > 0 && (
        <span className="inline-flex items-center gap-2 rounded-full bg-rose-50 dark:bg-rose-900/30 px-3 py-1 font-semibold text-rose-700 dark:text-rose-300">
          {summary.faceFailed} {faceDetectionFailedLabel}
        </span>
      )}
    </div>
  );
};

