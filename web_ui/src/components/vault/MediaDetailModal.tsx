import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Calendar, Plus, Trash2, Share2, Heart, MapPin, Download, Loader2, FileText, Music2, Film, Pencil, Save, Lock, Users, CheckCircle2 } from 'lucide-react';
import { MediaExifStatus, MediaItem, PersonProfile } from '../../types';
import { useProfiles } from '../../hooks/useProfiles';
import { useAuthStore } from '../../stores/authStore';
import { hasPermission } from '@/config/permissions';
import { useCreateMediaTag, useDeleteMediaTag, useMediaTags, useDownloadMedia } from '../../hooks/useMediaTags';
import { useConfirmMediaExif, useMediaExifStatus } from '../../hooks/useMedia';
import { toast } from 'sonner';
import DatePicker from '../DatePicker';
import type { UpdateMediaMetadataPayload } from '../../services/mediaApi';

interface MediaDetailModalProps {
  media: MediaItem;
  relatedMedia?: MediaItem[];
  isFavorite: boolean;
  isTagInputVisible: boolean;
  manualTagValue: string;
  onClose: () => void;
  onSelectRelatedMedia?: (media: MediaItem) => void;
  onToggleFavorite: (e: React.MouseEvent, id: string) => void;
  onDelete: (id: string) => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onTagInputChange: (val: string) => void;
  setTagInputVisible: (visible: boolean) => void;
  onManualTagSubmit: (e?: React.FormEvent) => void;
  onUpdateMedia: (payload: UpdateMediaMetadataPayload, onSuccess?: (updatedMedia: MediaItem) => void) => void;
  onSyncMedia?: (updatedMedia: MediaItem) => void;
  shouldPollExif?: boolean;
  isUpdatingMedia?: boolean;
}

interface EditDraft {
  title: string;
  story: string;
  location: string;
  tags: string;
  visibility: 'private' | 'family';
  dateTaken?: Date;
}

const MAX_MEMORY_FILES = 10;
const EXIF_STATUS_LABELS: Record<MediaExifStatus, string> = {
  [MediaExifStatus.NOT_STARTED]: 'Not started',
  [MediaExifStatus.QUEUED]: 'Queued',
  [MediaExifStatus.PROCESSING]: 'Processing',
  [MediaExifStatus.AWAITING_CONFIRMATION]: 'Awaiting your confirmation',
  [MediaExifStatus.CONFIRMED]: 'Confirmed',
  [MediaExifStatus.REJECTED]: 'Rejected',
  [MediaExifStatus.NOT_AVAILABLE]: 'No EXIF found',
  [MediaExifStatus.FAILED]: 'Failed',
};

const toEditDraft = (media: MediaItem): EditDraft => {
  const parsedDate = media.dateTaken ? new Date(media.dateTaken) : undefined;
  return {
    title: media.title || '',
    story: media.description || '',
    location: media.location || '',
    tags: (media.tags || []).join(', '),
    visibility: media.visibility || 'family',
    dateTaken: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : undefined,
  };
};

const MediaDetailModal: React.FC<MediaDetailModalProps> = ({
  media,
  isFavorite,
  isTagInputVisible,
  manualTagValue,
  onClose,
  onToggleFavorite,
  onDelete,
  onTagInputChange,
  onManualTagSubmit,
  onRemoveTag,
  setTagInputVisible,
  onUpdateMedia,
  onSyncMedia,
  shouldPollExif = false,
  isUpdatingMedia = false,
}) => {
  const [taggingFaceId, setTaggingFaceId] = useState<string | null>(null);
  const [localFaces, setLocalFaces] = useState(media.detectedFaces || []);
  const [isLinkPickerOpen, setIsLinkPickerOpen] = useState(false);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editDraft, setEditDraft] = useState<EditDraft>(() => toEditDraft(media));
  const [pendingRemovedFileIds, setPendingRemovedFileIds] = useState<Set<string>>(new Set());
  const [pendingNewFiles, setPendingNewFiles] = useState<File[]>([]);
  const [selectedExifCandidateFileId, setSelectedExifCandidateFileId] = useState<string>('');
  const [exifDecision, setExifDecision] = useState({ applyDateTaken: true, applyGps: true });
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const { currentUser } = useAuthStore();

  const { data: profilesData } = useProfiles();
  const profiles = useMemo(() => {
    if (!profilesData) return [];
    return profilesData.pages.flatMap(page => page.items);
  }, [profilesData]);

  const { data: mediaTags } = useMediaTags(media.id);
  const createMediaTagMutation = useCreateMediaTag();
  const deleteMediaTagMutation = useDeleteMediaTag();
  const downloadMediaMutation = useDownloadMedia();
  const confirmMediaExifMutation = useConfirmMediaExif();
  const { data: exifStatusData, isFetching: isFetchingExifStatus } = useMediaExifStatus(media.id, {
    enabled:
      media.type === 'PHOTO' ||
      (media.exifStatus !== MediaExifStatus.NOT_STARTED && media.exifStatus !== MediaExifStatus.NOT_AVAILABLE),
    poll: shouldPollExif,
  });

  const canEdit = currentUser ? hasPermission(currentUser.role, 'EDIT_MEDIA') : false;
  const canDelete = currentUser ? hasPermission(currentUser.role, 'DELETE_MEDIA') : false;
  const isUploader = currentUser?.id === media.uploaderId;

  const effectiveExifStatus = exifStatusData?.status || media.exifStatus || MediaExifStatus.NOT_STARTED;
  const effectiveExifError = (exifStatusData?.error || media.exifError || '').trim();
  const exifCandidates = useMemo(() => {
    if (exifStatusData?.candidates?.length) return exifStatusData.candidates;
    return exifStatusData?.candidate ? [exifStatusData.candidate] : [];
  }, [exifStatusData?.candidate, exifStatusData?.candidates]);
  const selectedExifCandidate = useMemo(() => {
    if (!exifCandidates.length) return undefined;
    if (selectedExifCandidateFileId) {
      const matched = exifCandidates.find((candidate) => candidate.fileId === selectedExifCandidateFileId);
      if (matched) return matched;
    }
    return exifCandidates[0];
  }, [exifCandidates, selectedExifCandidateFileId]);
  const exifNeedsConfirmation =
    (exifStatusData?.requiresConfirmation ?? false) || effectiveExifStatus === MediaExifStatus.AWAITING_CONFIRMATION;
  const exifDateCandidateText =
    selectedExifCandidate?.dateTaken && !Number.isNaN(new Date(selectedExifCandidate.dateTaken).getTime())
      ? new Date(selectedExifCandidate.dateTaken).toLocaleString()
      : '';
  const hasExifDateCandidate = Boolean(exifDateCandidateText);
  const exifGpsCandidateText =
    selectedExifCandidate?.gps &&
    typeof selectedExifCandidate.gps.latitude === 'number' &&
    typeof selectedExifCandidate.gps.longitude === 'number'
      ? `${selectedExifCandidate.gps.latitude.toFixed(6)}, ${selectedExifCandidate.gps.longitude.toFixed(6)}`
      : '';
  const hasExifGpsCandidate = Boolean(exifGpsCandidateText);
  const exifIsInProgress =
    effectiveExifStatus === MediaExifStatus.QUEUED || effectiveExifStatus === MediaExifStatus.PROCESSING;
  const exifWarnings = exifStatusData?.warnings || [];
  const exifSourceName = useMemo(() => {
    const metadata = media.metadata && typeof media.metadata === 'object' ? media.metadata : {};
    const exifSource = (metadata as Record<string, unknown>).exifSource;
    if (!exifSource || typeof exifSource !== 'object') return '';
    const originalName = String((exifSource as Record<string, unknown>).originalName || '').trim();
    return originalName;
  }, [media.metadata]);
  const memoryFiles = useMemo(() => {
    if (media.files?.length) {
      const files = [...media.files];
      files.sort((first, second) => {
        if (first.isPrimary && !second.isPrimary) return -1;
        if (!first.isPrimary && second.isPrimary) return 1;
        return 0;
      });
      return files;
    }

    if (!media.fileUrl) return [];
    return [
      {
        id: `fallback-${media.id}`,
        fileUrl: media.fileUrl,
        fileSize: 0,
        fileType: media.type === 'VIDEO' ? 'VIDEO' : media.type === 'PHOTO' ? 'PHOTO' : 'DOCUMENT',
        originalName: media.title || 'Memory file',
        isPrimary: true,
      },
    ];
  }, [media]);
  const exifCandidateItems = useMemo(() => {
    return exifCandidates.map((candidate) => {
      const matchedFile = memoryFiles.find((file) => file.id === candidate.fileId);
      return {
        candidate,
        fileType: matchedFile?.fileType || 'DOCUMENT',
        previewUrl: matchedFile?.fileType === 'PHOTO' ? matchedFile.fileUrl : undefined,
      };
    });
  }, [exifCandidates, memoryFiles]);

  useEffect(() => {
    setLocalFaces(media.detectedFaces || []);
    setTaggingFaceId(null);
    setIsLinkPickerOpen(false);
    setIsEditMode(false);
    setEditDraft(toEditDraft(media));
    setPendingRemovedFileIds(new Set());
    setPendingNewFiles([]);
    setSelectedExifCandidateFileId('');
  }, [media.id, media.detectedFaces]);

  useEffect(() => {
    if (!exifCandidates.length) {
      setSelectedExifCandidateFileId('');
      return;
    }
    const selectedFromServer = exifStatusData?.selectedFileId || exifStatusData?.candidate?.fileId;
    const defaultCandidateId = selectedFromServer || exifCandidates[0]?.fileId || '';
    setSelectedExifCandidateFileId((current) => {
      if (current && exifCandidates.some((candidate) => candidate.fileId === current)) {
        return current;
      }
      return defaultCandidateId;
    });
  }, [exifCandidates, exifStatusData?.candidate?.fileId, exifStatusData?.selectedFileId]);

  useEffect(() => {
    setExifDecision({
      applyDateTaken: hasExifDateCandidate,
      applyGps: hasExifGpsCandidate,
    });
  }, [media.id, hasExifDateCandidate, hasExifGpsCandidate]);

  const linkedPersonIds = useMemo(() => new Set((mediaTags || []).map((tag) => tag.personId)), [mediaTags]);

  const linkedProfiles = useMemo(
    () => (profiles || []).filter((profile) => linkedPersonIds.has(profile.id)),
    [linkedPersonIds, profiles]
  );

  const availableProfiles = useMemo(
    () => (profiles || []).filter((profile) => !linkedPersonIds.has(profile.id)),
    [linkedPersonIds, profiles]
  );

  const activeExistingFiles = useMemo(
    () => memoryFiles.filter((file) => !pendingRemovedFileIds.has(file.id)),
    [memoryFiles, pendingRemovedFileIds],
  );

  const projectedFileCount = activeExistingFiles.length + pendingNewFiles.length;

  const activeFile = useMemo(() => {
    const candidateFiles = isEditMode ? activeExistingFiles : memoryFiles;
    if (!candidateFiles.length) return null;
    if (activeFileId) {
      const matched = candidateFiles.find((file) => file.id === activeFileId);
      if (matched) return matched;
    }
    return candidateFiles.find((file) => file.isPrimary) || candidateFiles[0];
  }, [activeExistingFiles, activeFileId, isEditMode, memoryFiles]);

  useEffect(() => {
    const candidateFiles = isEditMode ? activeExistingFiles : memoryFiles;
    if (!candidateFiles.length) {
      setActiveFileId(null);
      return;
    }
    const primary = candidateFiles.find((file) => file.isPrimary) || candidateFiles[0];
    setActiveFileId(primary.id);
  }, [activeExistingFiles, isEditMode, media.id, memoryFiles]);

  const mergePendingNewFiles = (incoming: File[]) => {
    if (!incoming.length) return;

    const existingRoom = MAX_MEMORY_FILES - activeExistingFiles.length;
    if (existingRoom <= 0) {
      toast.error('A memory can contain up to 10 files.');
      return;
    }

    const merged = [...pendingNewFiles];
    for (const file of incoming) {
      const exists = merged.some(
        (candidate) =>
          candidate.name === file.name &&
          candidate.size === file.size &&
          candidate.lastModified === file.lastModified,
      );
      if (exists) continue;
      if (activeExistingFiles.length + merged.length >= MAX_MEMORY_FILES) break;
      merged.push(file);
    }
    setPendingNewFiles(merged);
  };

  const toggleFileRemoval = (fileId: string) => {
    setPendingRemovedFileIds((current) => {
      const next = new Set(current);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  };

  const handleEditFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    mergePendingNewFiles(files);
    event.target.value = '';
  };

  const removePendingNewFile = (index: number) => {
    setPendingNewFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
  };

  useEffect(() => {
    if (!activeFileId) return;
    if (!isEditMode) return;
    if (activeExistingFiles.some((file) => file.id === activeFileId)) return;
    const next = activeExistingFiles.find((file) => file.isPrimary) || activeExistingFiles[0];
    setActiveFileId(next?.id || null);
  }, [activeExistingFiles, activeFileId, isEditMode]);


  const handleDownload = () => {
    const targetUrl = activeFile?.fileUrl || media.fileUrl;
    if (!targetUrl) return;
    downloadMediaMutation.mutate({
      mediaItem: { ...media, fileUrl: targetUrl },
      fileName: activeFile?.originalName || undefined,
    });
  };

  const copyShareLink = async (url: string) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      return true;
    }

    const textarea = document.createElement('textarea');
    textarea.value = url;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    return copied;
  };

  const handleShare = async () => {
    const shareUrl = activeFile?.fileUrl || media.fileUrl;
    if (!shareUrl) {
      toast.error('No file link available to share.');
      return;
    }

    const shareData: ShareData = {
      title: media.title || 'Memory',
      text: activeFile?.originalName || 'Shared memory file',
      url: shareUrl,
    };

    setIsSharing(true);
    try {
      if (typeof navigator.share === 'function') {
        if (typeof navigator.canShare === 'function' && !navigator.canShare(shareData)) {
          const copied = await copyShareLink(shareUrl);
          if (!copied) throw new Error('Copy failed');
          toast.success('Link copied to clipboard');
          return;
        }

        await navigator.share(shareData);
        return;
      }

      const copied = await copyShareLink(shareUrl);
      if (!copied) throw new Error('Copy failed');
      toast.success('Link copied to clipboard');
    } catch (error: any) {
      if (error?.name === 'AbortError') return;
      toast.error('Unable to share right now. Try copying the link manually.');
    } finally {
      setIsSharing(false);
    }
  };

  const linkProfileToFace = (faceId: string, profile: PersonProfile) => {
    if (!canEdit) return;

    if (linkedPersonIds.has(profile.id)) {
      setLocalFaces((prev) =>
        prev.map((face) => (face.id === faceId ? { ...face, personId: profile.id, name: profile.fullName } : face))
      );
      setTaggingFaceId(null);
      toast.info('Relative already linked to this media');
      return;
    }

    createMediaTagMutation.mutate(
      {
        mediaId: media.id,
        personId: profile.id,
      },
      {
        onSuccess: () => {
          setLocalFaces((prev) =>
            prev.map((face) => (face.id === faceId ? { ...face, personId: profile.id, name: profile.fullName } : face))
          );
          setTaggingFaceId(null);
        },
      }
    );
  };

  const linkProfileToMedia = (profile: PersonProfile) => {
    if (!canEdit || linkedPersonIds.has(profile.id)) return;

    createMediaTagMutation.mutate(
      {
        mediaId: media.id,
        personId: profile.id,
      },
      {
        onSuccess: () => {
          setIsLinkPickerOpen(false);
        },
      }
    );
  };

  const unlinkProfileFromMedia = (profile: PersonProfile) => {
    if (!canEdit || !mediaTags) return;
    const matchingTag = mediaTags.find((tag) => tag.personId === profile.id);
    if (!matchingTag) return;

    deleteMediaTagMutation.mutate(
      { tagId: matchingTag.id, mediaId: media.id },
      {
        onSuccess: () => {
          setLocalFaces((prev) =>
            prev.map((face) =>
              face.personId === profile.id ? { ...face, personId: undefined, name: undefined } : face
            )
          );
        },
      }
    );
  };

  const handleSaveMediaEdits = () => {
    if (!canEdit) return;

    const normalizedTitle = editDraft.title.trim();
    if (!normalizedTitle) {
      toast.error('Title is required.');
      return;
    }

    const normalizedTags = Array.from(
      new Set(
        editDraft.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      ),
    );

    if (projectedFileCount <= 0) {
      toast.error('At least one file must remain attached to this memory.');
      return;
    }

    if (projectedFileCount > MAX_MEMORY_FILES) {
      toast.error('A memory can contain up to 10 files.');
      return;
    }

    const hasFileMutations = pendingRemovedFileIds.size > 0 || pendingNewFiles.length > 0;

    onUpdateMedia(
      {
        id: media.id,
        title: normalizedTitle,
        description: editDraft.story.trim(),
        location: editDraft.location.trim(),
        tags: normalizedTags,
        dateTaken: editDraft.dateTaken ? editDraft.dateTaken.toISOString() : null,
        visibility: editDraft.visibility,
        removeFileIds: Array.from(pendingRemovedFileIds),
        newFiles: pendingNewFiles,
      },
      (updatedMedia) => {
        setIsEditMode(false);
        setEditDraft(toEditDraft(updatedMedia));
        setPendingRemovedFileIds(new Set());
        setPendingNewFiles([]);
        if (
          updatedMedia.type === 'PHOTO' &&
          (updatedMedia.exifStatus === MediaExifStatus.QUEUED ||
            updatedMedia.exifStatus === MediaExifStatus.PROCESSING)
        ) {
          toast.info('Memory updated. EXIF extraction restarted in the background for this photo set.');
        }
      },
    );
  };

  const handleExifDecision = (action: 'accept' | 'reject') => {
    if (!isUploader || confirmMediaExifMutation.isPending) return;

    const applyDateTaken = action === 'accept' ? exifDecision.applyDateTaken && hasExifDateCandidate : false;
    const applyGps = action === 'accept' ? exifDecision.applyGps && hasExifGpsCandidate : false;

    if (action === 'accept' && !applyDateTaken && !applyGps) {
      toast.error('Select at least one EXIF field to apply, or reject this metadata.');
      return;
    }

    confirmMediaExifMutation.mutate(
      {
        mediaId: media.id,
        payload: {
          action,
          applyDateTaken,
          applyGps,
          candidateFileId: selectedExifCandidate?.fileId,
        },
      },
      {
        onSuccess: (updatedMedia) => {
          onSyncMedia?.(updatedMedia);
        },
      },
    );
  };

  return (
    <div className="fixed inset-0 z-110 flex items-center justify-center p-4 backdrop-blur-xl bg-slate-950/60 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 w-full max-w-6xl h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row animate-in zoom-in-95 duration-500">
        <div className="flex-1 bg-slate-50 dark:bg-slate-950 relative overflow-hidden flex items-center justify-center group p-4 border-r border-slate-100 dark:border-slate-800">
          {activeFile?.fileType === 'PHOTO' && (
            <img src={activeFile.fileUrl} className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-lg" alt={activeFile.originalName} />
          )}
          {activeFile?.fileType === 'VIDEO' && (
            <video
              src={activeFile.fileUrl}
              controls
              className="max-w-full max-h-[80vh] rounded-xl shadow-lg bg-black"
            />
          )}
          {activeFile?.fileType === 'AUDIO' && (
            <div className="w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 space-y-4">
              <div className="flex items-center gap-3 text-slate-700 dark:text-slate-200">
                <Music2 size={20} className="text-primary" />
                <p className="font-semibold truncate">{activeFile.originalName}</p>
              </div>
              <audio src={activeFile.fileUrl} controls className="w-full" />
            </div>
          )}
          {activeFile?.fileType === 'DOCUMENT' && (
            <div className="w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 text-center space-y-4">
              <FileText size={28} className="mx-auto text-primary" />
              <p className="font-semibold text-slate-700 dark:text-slate-200 truncate">{activeFile.originalName}</p>
              <a
                href={activeFile.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold uppercase tracking-widest hover:border-primary"
              >
                Open File
              </a>
            </div>
          )}
          {!activeFile && (
            <div className="w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 text-center">
              <p className="text-sm text-slate-500">No preview available.</p>
            </div>
          )}

        </div>

        <div className="w-full md:w-112.5 flex flex-col h-full bg-white dark:bg-slate-900">
          <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white leading-tight break-words">{media.title}</h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Calendar size={12} /> {new Date(media.dateTaken).toLocaleString()}
                </p>
                {media.location && (
                  <p className="max-w-full sm:max-w-[240px] text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-2 truncate">
                    <MapPin size={12} /> {media.location}
                  </p>
                )}
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-300 inline-flex items-center gap-1.5">
                  {media.visibility === 'private' ? <Lock size={11} /> : <Users size={11} />}
                  {media.visibility === 'private' ? 'Private' : 'Family'}
                </p>
                {exifSourceName && (
                  <p className="max-w-full sm:max-w-[240px] text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-1.5 truncate">
                    <CheckCircle2 size={11} />
                    EXIF Source: {exifSourceName}
                  </p>
                )}
              </div>
            </div>
            <div className="flex w-full sm:w-auto flex-wrap items-center justify-end gap-2">
              {canEdit && (
                isEditMode ? (
                  <>
                    <button
                      onClick={() => {
                        setIsEditMode(false);
                        setEditDraft(toEditDraft(media));
                        setPendingRemovedFileIds(new Set());
                        setPendingNewFiles([]);
                      }}
                      disabled={isUpdatingMedia}
                      className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:border-primary transition-colors disabled:opacity-60"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveMediaEdits}
                      disabled={isUpdatingMedia}
                      className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-primary bg-primary text-white flex items-center gap-1.5 shadow-lg shadow-primary/20 disabled:opacity-60"
                    >
                      {isUpdatingMedia ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                      Save
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditMode(true)}
                    className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:border-primary hover:text-primary transition-colors flex items-center gap-1.5"
                  >
                    <Pencil size={12} />
                    Edit
                  </button>
                )
              )}
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all"><X size={20} /></button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar p-8 space-y-8">
            {isEditMode && (
              <div className="space-y-4 rounded-2xl border border-primary/20 bg-primary/[0.03] p-4">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Edit Memory</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      Title <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      aria-required="true"
                      value={editDraft.title}
                      onChange={(event) =>
                        setEditDraft((current) => ({
                          ...current,
                          title: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date Taken</label>
                    <DatePicker
                      date={editDraft.dateTaken}
                      onChange={(date) =>
                        setEditDraft((current) => ({
                          ...current,
                          dateTaken: date,
                        }))
                      }
                    />
                    {editDraft.dateTaken && (
                      <button
                        type="button"
                        onClick={() =>
                          setEditDraft((current) => ({
                            ...current,
                            dateTaken: undefined,
                          }))
                        }
                        className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-primary transition-colors"
                      >
                        Clear Date
                      </button>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Location</label>
                    <input
                      type="text"
                      value={editDraft.location}
                      onChange={(event) =>
                        setEditDraft((current) => ({
                          ...current,
                          location: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Privacy</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setEditDraft((current) => ({
                            ...current,
                            visibility: 'private',
                          }))
                        }
                        className={`rounded-xl border px-2.5 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors ${
                          editDraft.visibility === 'private'
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300'
                        }`}
                      >
                        Private
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setEditDraft((current) => ({
                            ...current,
                            visibility: 'family',
                          }))
                        }
                        className={`rounded-xl border px-2.5 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors ${
                          editDraft.visibility === 'family'
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300'
                        }`}
                      >
                        Family
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tags (comma-separated)</label>
                    <input
                      type="text"
                      value={editDraft.tags}
                      onChange={(event) =>
                        setEditDraft((current) => ({
                          ...current,
                          tags: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Story</label>
                    <textarea
                      rows={4}
                      value={editDraft.story}
                      onChange={(event) =>
                        setEditDraft((current) => ({
                          ...current,
                          story: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {(media.type === 'PHOTO' || effectiveExifStatus !== MediaExifStatus.NOT_STARTED) && !isEditMode && (
              <div className="space-y-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/50 p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">EXIF Metadata</h3>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                    {EXIF_STATUS_LABELS[effectiveExifStatus]}
                  </span>
                </div>

                {exifIsInProgress && (
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <Loader2 size={14} className="animate-spin text-primary" />
                    <span>Extracting photo metadata in the background...</span>
                  </div>
                )}

                {effectiveExifStatus === MediaExifStatus.FAILED && (
                  <p className="text-xs text-rose-600">
                    {effectiveExifError || 'EXIF extraction failed. Please edit and re-save the memory file to retry.'}
                  </p>
                )}

                {exifNeedsConfirmation && (
                  <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-900/10 p-3">
                    <p className="text-xs text-slate-700 dark:text-slate-200">
                      We found metadata in the original file. Confirm to apply it to this memory.
                    </p>
                    {exifCandidateItems.length > 1 && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                          Choose Source File
                        </p>
                        <div className="grid grid-cols-1 gap-2">
                          {exifCandidateItems.map(({ candidate, fileType, previewUrl }) => {
                            const isSelectedCandidate = candidate.fileId === selectedExifCandidate?.fileId;
                            const candidateDate =
                              candidate.dateTaken && !Number.isNaN(new Date(candidate.dateTaken).getTime())
                                ? new Date(candidate.dateTaken).toLocaleString()
                                : null;
                            const candidateGps =
                              candidate.gps &&
                              typeof candidate.gps.latitude === 'number' &&
                              typeof candidate.gps.longitude === 'number'
                                ? `${candidate.gps.latitude.toFixed(6)}, ${candidate.gps.longitude.toFixed(6)}`
                                : null;

                            return (
                              <button
                                key={candidate.fileId}
                                type="button"
                                onClick={() => setSelectedExifCandidateFileId(candidate.fileId)}
                                className={`w-full rounded-lg border px-2.5 py-2 text-left transition-colors ${
                                  isSelectedCandidate
                                    ? 'border-primary bg-primary/10'
                                    : 'border-amber-200/70 dark:border-amber-900/50 hover:border-primary/60'
                                }`}
                              >
                                <div className="flex items-center gap-2.5">
                                  <div className={`h-11 w-11 rounded-lg border bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0 relative ${
                                    isSelectedCandidate
                                      ? 'border-primary ring-2 ring-primary/40'
                                      : 'border-slate-200 dark:border-slate-700'
                                  }`}>
                                    {previewUrl ? (
                                      <img src={previewUrl} alt={candidate.originalName} className="h-full w-full object-cover" />
                                    ) : fileType === 'VIDEO' ? (
                                      <Film size={14} className="text-primary" />
                                    ) : fileType === 'AUDIO' ? (
                                      <Music2 size={14} className="text-primary" />
                                    ) : (
                                      <FileText size={14} className="text-primary" />
                                    )}
                                    {isSelectedCandidate && (
                                      <span className="absolute -top-1 -right-1 rounded-full bg-white dark:bg-slate-900 text-primary">
                                        <CheckCircle2 size={14} />
                                      </span>
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate">
                                      {candidate.originalName}
                                      {candidate.isPrimary ? ' (Primary)' : ''}
                                    </p>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                      {previewUrl ? 'Image preview' : fileType} • {candidateDate || 'No date'} • {candidateGps || 'No GPS'}
                                    </p>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                      {selectedExifCandidate?.originalName && (
                        <p><strong>Source file:</strong> {selectedExifCandidate.originalName}</p>
                      )}
                      {exifDateCandidateText && <p><strong>Date taken:</strong> {exifDateCandidateText}</p>}
                      {exifGpsCandidateText && <p><strong>GPS:</strong> {exifGpsCandidateText}</p>}
                      {!exifDateCandidateText && !exifGpsCandidateText && (
                        <p>No usable date or GPS value was found.</p>
                      )}
                    </div>
                    {exifWarnings.length > 0 && (
                      <p className="text-[11px] text-amber-700 dark:text-amber-300">
                        Some files could not provide EXIF metadata. You can still confirm available values.
                      </p>
                    )}
                    {isUploader ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <label className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                            <input
                              type="checkbox"
                              className="h-3.5 w-3.5"
                              checked={exifDecision.applyDateTaken && hasExifDateCandidate}
                              disabled={confirmMediaExifMutation.isPending || !hasExifDateCandidate}
                              onChange={(event) =>
                                setExifDecision((current) => ({
                                  ...current,
                                  applyDateTaken: event.target.checked,
                                }))
                              }
                            />
                            Apply date taken
                          </label>
                          <label className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                            <input
                              type="checkbox"
                              className="h-3.5 w-3.5"
                              checked={exifDecision.applyGps && hasExifGpsCandidate}
                              disabled={confirmMediaExifMutation.isPending || !hasExifGpsCandidate}
                              onChange={(event) =>
                                setExifDecision((current) => ({
                                  ...current,
                                  applyGps: event.target.checked,
                                }))
                              }
                            />
                            Apply GPS location
                          </label>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleExifDecision('accept')}
                            disabled={confirmMediaExifMutation.isPending}
                            className="px-3 py-1.5 rounded-lg bg-primary text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-60"
                          >
                            {confirmMediaExifMutation.isPending ? 'Saving...' : 'Accept EXIF'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExifDecision('reject')}
                            disabled={confirmMediaExifMutation.isPending}
                            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-300 disabled:opacity-60"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Waiting for the uploader to confirm this metadata.
                      </p>
                    )}
                  </div>
                )}

                {effectiveExifStatus === MediaExifStatus.CONFIRMED && (
                  <p className="text-xs text-emerald-600">
                    EXIF metadata has been confirmed and applied to this memory.
                  </p>
                )}

                {effectiveExifStatus === MediaExifStatus.REJECTED && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Extracted EXIF metadata was rejected and not applied.
                  </p>
                )}

                {!exifIsInProgress && isFetchingExifStatus && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Refreshing EXIF status...</p>
                )}
              </div>
            )}

            {memoryFiles.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Files In This Memory ({isEditMode ? projectedFileCount : memoryFiles.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {memoryFiles.map((file) => {
                    const isRemoved = pendingRemovedFileIds.has(file.id);
                    const isActiveItem = file.id === activeFile?.id;
                    const isCardDisabled = !isEditMode && isActiveItem;
                    return (
                      <button
                        key={file.id}
                        type="button"
                        onClick={() => {
                          if (isEditMode && isRemoved) return;
                          setActiveFileId(file.id);
                        }}
                        disabled={isCardDisabled}
                        className={`w-full text-left rounded-2xl border p-2.5 flex items-center gap-3 transition-all ${
                          isEditMode && isRemoved
                            ? 'border-rose-200 bg-rose-50/70 dark:border-rose-900/50 dark:bg-rose-950/20 opacity-70'
                          : isActiveItem
                              ? 'border-primary bg-primary/5'
                              : 'border-slate-200 dark:border-slate-700 hover:border-primary/60'
                        }`}
                      >
                        <div className="h-14 w-14 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                          {file.fileType === 'PHOTO' && (
                            <img src={file.fileUrl} alt={file.originalName} className="h-full w-full object-cover" />
                          )}
                          {file.fileType === 'VIDEO' && <Film size={18} className="text-primary" />}
                          {file.fileType === 'AUDIO' && <Music2 size={18} className="text-primary" />}
                          {file.fileType === 'DOCUMENT' && <FileText size={18} className="text-primary" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate">
                            {file.originalName}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {file.fileType}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isEditMode ? (
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(event) => {
                                event.stopPropagation();
                                toggleFileRemoval(file.id);
                              }}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  toggleFileRemoval(file.id);
                                }
                              }}
                              className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors ${
                                isRemoved
                                  ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'
                                  : 'text-rose-600 bg-rose-50 dark:bg-rose-900/20'
                              }`}
                            >
                              {isRemoved ? 'Undo' : 'Remove'}
                            </span>
                          ) : null}
                          {isActiveItem && !isRemoved && (
                            <span className="text-[9px] font-black uppercase tracking-widest text-primary">
                              Viewing
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {isEditMode && (
                  <div className="space-y-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 p-3">
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Updating files re-runs background processing for photo memories.
                    </p>
                    <input
                      ref={editFileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleEditFileInputChange}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => editFileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-[10px] font-black uppercase tracking-widest"
                      >
                        Add More Files
                      </button>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        {projectedFileCount}/{MAX_MEMORY_FILES} files
                      </span>
                    </div>
                    {pendingNewFiles.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {pendingNewFiles.map((file, index) => (
                          <div
                            key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                            className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-2"
                          >
                            <FileText size={14} className="text-slate-400 shrink-0" />
                            <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-slate-700 dark:text-slate-200">
                              {file.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => removePendingNewFile(index)}
                              className="text-slate-400 hover:text-rose-500 transition-colors"
                              aria-label={`Remove ${file.name}`}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {projectedFileCount <= 0 && (
                      <p className="text-[10px] font-bold text-rose-600">
                        At least one file must remain attached to this memory.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {localFaces.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">Tagged Figures ({localFaces.length})</h3>
                <div className="grid grid-cols-4 gap-4">
                  {localFaces.map((face) => (
                    <div key={face.id} className="relative group/face">
                      <button
                        onClick={() => canEdit && setTaggingFaceId(taggingFaceId === face.id ? null : face.id)}
                        className={`w-full aspect-square rounded-2xl overflow-hidden border-2 transition-all ${face.personId ? 'border-primary shadow-md' : 'border-slate-200 dark:border-slate-800'}`}
                      >
                        <img src={face.thumbnailUrl} className="w-full h-full object-cover" alt="Face" />
                      </button>
                      {face.name && <p className="text-[8px] font-bold text-center mt-1 truncate uppercase text-slate-500">{face.name.split(' ')[0]}</p>}
                      {taggingFaceId === face.id && canEdit && (
                        <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-2 min-w-50 animate-in slide-in-from-top-2">
                          {profiles?.map((profile) => (
                            <button key={profile.id} onClick={() => linkProfileToFace(face.id, profile)} className="w-full flex items-center gap-2 p-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-left transition-colors">
                              <img src={profile.photoUrl} className="w-5 h-5 rounded-full object-cover" alt="" />
                              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 truncate">{profile.fullName}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Linked Relatives ({linkedProfiles.length})</h3>
              <div className="flex flex-wrap gap-2">
                {linkedProfiles.map((profile) => (
                  <span key={profile.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl text-[10px] font-bold text-slate-600 dark:text-slate-300">
                    {profile.fullName}
                    {canEdit && (
                      <button onClick={() => unlinkProfileFromMedia(profile)} className="text-slate-300 hover:text-rose-500">
                        <X size={12} />
                      </button>
                    )}
                  </span>
                ))}
                {canEdit && (
                  <button
                    onClick={() => setIsLinkPickerOpen((open) => !open)}
                    className="px-3 py-1.5 flex gap-1.5 items-center border border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-[10px] font-bold text-slate-400 hover:text-primary transition-all"
                  >
                    <Plus size={12} /> Link Relative
                  </button>
                )}
              </div>
              {canEdit && isLinkPickerOpen && (
                <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl p-2 max-h-40 overflow-y-auto no-scrollbar">
                  {availableProfiles.length === 0 ? (
                    <p className="text-[10px] text-slate-500 px-2 py-1">All relatives are already linked.</p>
                  ) : (
                    availableProfiles.map((profile) => (
                      <button key={profile.id} onClick={() => linkProfileToMedia(profile)} className="w-full flex items-center gap-2 p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-left transition-colors">
                        <img src={profile.photoUrl} className="w-5 h-5 rounded-full object-cover" alt="" />
                        <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 truncate">{profile.fullName}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {!isEditMode && (
              <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">The Story</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic border-l-2 border-primary/20 pl-4 py-1">
                  {media.description || 'No archival story recorded.'}
                </p>
              </div>
            )}

            {!isEditMode && (
              <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Preservation Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {media.tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl text-[10px] font-bold text-slate-600 dark:text-slate-300">
                      {tag}
                      {canEdit && <button onClick={() => onRemoveTag(tag)} className="text-slate-300 hover:text-rose-500"><X size={12} /></button>}
                    </span>
                  ))}
                  {canEdit && (
                    <button onClick={() => setTagInputVisible(true)} className="px-3 flex gap-1.5 items-center py-1.5 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-[10px] font-bold text-slate-400 hover:text-primary transition-all">
                      <Plus size={12} /> Add Tag
                    </button>
                  )}
                </div>
                {canEdit && isTagInputVisible && (
                  <form onSubmit={onManualTagSubmit} className="flex flex-col sm:flex-row gap-2">
                    <input
                      autoFocus
                      value={manualTagValue}
                      onChange={(event) => onTagInputChange(event.target.value)}
                      placeholder="Enter a tag"
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setTagInputVisible(false)}
                      className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-500"
                    >
                      Cancel
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>

          <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center gap-3">
            <button
              onClick={(e) => onToggleFavorite(e, media.id)}
              className={`flex-1 py-3 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all border ${
                isFavorite ? 'bg-rose-500 border-rose-400 text-white' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-primary'
              }`}
            >
              <Heart size={14} fill={isFavorite ? 'currentColor' : 'none'} /> {isFavorite ? 'Essential' : 'Mark Essential'}
            </button>
            <button 
              onClick={handleDownload}
              disabled={downloadMediaMutation.isPending}
              className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-400 hover:text-primary transition-all disabled:opacity-50"
              title="Download original file"
            >
              {downloadMediaMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            </button>
            <button
              onClick={handleShare}
              disabled={isSharing}
              className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-400 hover:text-primary transition-all disabled:opacity-50"
              title="Share file link"
            >
              <Share2 size={18} />
            </button>
            {canDelete && <button onClick={() => onDelete(media.id)} className="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/20 rounded-2xl text-rose-500 hover:bg-rose-500 hover:text-white transition-all"><Trash2 size={18} /></button>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaDetailModal;
