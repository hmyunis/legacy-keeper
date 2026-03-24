import { useCallback, useEffect, useRef, useState } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  MediaExifStatus,
  MediaFaceDetectionStatus,
  MediaType,
  type MediaItem,
} from '@/types';
import {
  EXIF_POLL_WINDOW_MS,
  EXIF_STATUS_TOAST_DURATION_MS,
  isExifRunning,
  isFaceDetectionRunning,
} from '@/features/vault/utils';

interface UseVaultExifOrchestrationInput {
  allMedia: MediaItem[];
  queryClient: QueryClient;
}

export const useVaultExifOrchestration = ({
  allMedia,
  queryClient,
}: UseVaultExifOrchestrationInput) => {
  const hasInitializedExifStatusRef = useRef(false);
  const previousExifStatusRef = useRef<Map<string, MediaExifStatus>>(new Map());
  const exifPollingTimeoutsRef = useRef<Map<string, number>>(new Map());
  const [exifPollingMediaIds, setExifPollingMediaIds] = useState<Set<string>>(new Set());

  const clearExifPollingTimeout = useCallback((mediaId: string) => {
    const timeoutId = exifPollingTimeoutsRef.current.get(mediaId);
    if (timeoutId === undefined) return;
    window.clearTimeout(timeoutId);
    exifPollingTimeoutsRef.current.delete(mediaId);
  }, []);

  const stopExifPollingForMedia = useCallback(
    (mediaId: string) => {
      clearExifPollingTimeout(mediaId);
      setExifPollingMediaIds((current) => {
        if (!current.has(mediaId)) return current;
        const next = new Set(current);
        next.delete(mediaId);
        return next;
      });
    },
    [clearExifPollingTimeout],
  );

  const startExifPollingForMedia = useCallback(
    (
      mediaId: string,
      exifStatus?: MediaExifStatus,
      faceDetectionStatus?: MediaFaceDetectionStatus,
    ) => {
      if (!mediaId) return;
      const hasActiveBackgroundTask =
        isExifRunning(exifStatus) || isFaceDetectionRunning(faceDetectionStatus);
      if (!hasActiveBackgroundTask) {
        stopExifPollingForMedia(mediaId);
        return;
      }

      clearExifPollingTimeout(mediaId);
      setExifPollingMediaIds((current) => {
        if (current.has(mediaId)) return current;
        const next = new Set(current);
        next.add(mediaId);
        return next;
      });

      const timeoutId = window.setTimeout(() => {
        setExifPollingMediaIds((current) => {
          if (!current.has(mediaId)) return current;
          const next = new Set(current);
          next.delete(mediaId);
          return next;
        });
        exifPollingTimeoutsRef.current.delete(mediaId);
      }, EXIF_POLL_WINDOW_MS);
      exifPollingTimeoutsRef.current.set(mediaId, timeoutId);
    },
    [clearExifPollingTimeout, stopExifPollingForMedia],
  );

  useEffect(() => {
    if (!allMedia.length) {
      for (const mediaId of previousExifStatusRef.current.keys()) {
        toast.dismiss(`exif-bg-${mediaId}`);
      }
      previousExifStatusRef.current = new Map();
      hasInitializedExifStatusRef.current = false;
      return;
    }

    const statusSnapshot = new Map<string, MediaExifStatus>();
    for (const item of allMedia) {
      statusSnapshot.set(item.id, item.exifStatus);
    }

    if (!hasInitializedExifStatusRef.current) {
      previousExifStatusRef.current = statusSnapshot;
      hasInitializedExifStatusRef.current = true;
      return;
    }

    for (const item of allMedia) {
      if (item.type !== MediaType.PHOTO) continue;

      const previousStatus = previousExifStatusRef.current.get(item.id);
      const currentStatus = item.exifStatus;
      if (!previousStatus) {
        if (isExifRunning(currentStatus)) {
          toast.loading(`Extracting EXIF metadata for "${item.title}"...`, {
            id: `exif-bg-${item.id}`,
            duration: Infinity,
          });
        }
        continue;
      }

      const wasRunning = isExifRunning(previousStatus);
      const isRunning = isExifRunning(currentStatus);
      const toastId = `exif-bg-${item.id}`;

      if (!wasRunning && isRunning) {
        toast.loading(`Extracting EXIF metadata for "${item.title}"...`, {
          id: toastId,
          duration: Infinity,
        });
        continue;
      }

      if (!wasRunning || isRunning || previousStatus === currentStatus) {
        continue;
      }

      if (currentStatus === MediaExifStatus.CONFIRMED) {
        toast.dismiss(toastId);
        toast.success(`EXIF metadata applied for "${item.title}".`, {
          duration: EXIF_STATUS_TOAST_DURATION_MS,
        });
      } else if (currentStatus === MediaExifStatus.FAILED) {
        toast.dismiss(toastId);
        toast.error(`EXIF extraction failed for "${item.title}".`, {
          duration: EXIF_STATUS_TOAST_DURATION_MS,
          description: item.exifError || 'Please retry by editing and re-saving the memory.',
        });
      } else if (currentStatus === MediaExifStatus.AWAITING_CONFIRMATION) {
        toast.dismiss(toastId);
        toast.info(`EXIF ready for "${item.title}". Confirm to apply extracted date/GPS.`, {
          duration: EXIF_STATUS_TOAST_DURATION_MS,
        });
      } else if (currentStatus === MediaExifStatus.NOT_AVAILABLE) {
        toast.dismiss(toastId);
        toast.info(`No EXIF date/GPS found for "${item.title}".`, {
          duration: EXIF_STATUS_TOAST_DURATION_MS,
        });
      } else if (currentStatus === MediaExifStatus.REJECTED) {
        toast.dismiss(toastId);
        toast.info(`Extracted EXIF was rejected for "${item.title}".`, {
          duration: EXIF_STATUS_TOAST_DURATION_MS,
        });
      } else {
        toast.dismiss(toastId);
      }
    }

    for (const mediaId of previousExifStatusRef.current.keys()) {
      if (!statusSnapshot.has(mediaId)) {
        toast.dismiss(`exif-bg-${mediaId}`);
      }
    }

    previousExifStatusRef.current = statusSnapshot;
  }, [allMedia]);

  useEffect(
    () => () => {
      for (const timeoutId of exifPollingTimeoutsRef.current.values()) {
        window.clearTimeout(timeoutId);
      }
      exifPollingTimeoutsRef.current.clear();
    },
    [],
  );

  useEffect(() => {
    if (!allMedia.length || exifPollingMediaIds.size === 0) return;

    const settledIds = allMedia
      .filter((item) => {
        if (!exifPollingMediaIds.has(item.id)) return false;
        if (item.type !== MediaType.PHOTO) return true;
        return !isExifRunning(item.exifStatus) && !isFaceDetectionRunning(item.faceDetectionStatus);
      })
      .map((item) => item.id);

    if (!settledIds.length) return;
    for (const mediaId of settledIds) {
      stopExifPollingForMedia(mediaId);
    }
  }, [allMedia, exifPollingMediaIds, stopExifPollingForMedia]);

  useEffect(() => {
    if (exifPollingMediaIds.size === 0) return;

    const timer = window.setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      queryClient.invalidateQueries({ queryKey: ['mediaFavorites'] });
      for (const mediaId of exifPollingMediaIds) {
        queryClient.invalidateQueries({ queryKey: ['mediaExifStatus', mediaId] });
        queryClient.invalidateQueries({ queryKey: ['mediaFaceDetectionStatus', mediaId] });
      }
    }, 3000);

    return () => window.clearInterval(timer);
  }, [exifPollingMediaIds, queryClient]);

  const shouldPollExif = useCallback(
    (mediaId?: string | null) => Boolean(mediaId && exifPollingMediaIds.has(mediaId)),
    [exifPollingMediaIds],
  );

  return {
    exifPollingMediaIds,
    startExifPollingForMedia,
    stopExifPollingForMedia,
    shouldPollExif,
  };
};
