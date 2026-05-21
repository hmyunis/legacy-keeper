import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, CalendarBlank, Faders, MagicWand, DownloadSimple, ShareNetwork, Trash, Fingerprint, PencilSimple, Tag, MagnifyingGlassPlus, MagnifyingGlassMinus, Heart, CaretDown, Plus, WarningCircle, Check } from '@phosphor-icons/react';
import { sileo } from 'sileo';
import { useState, useEffect, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import RestorationSlider from '../../components/vault/RestorationSlider';
import { Button } from '../../components/ui/Button';
import { CustomDatePicker } from '../../components/ui/CustomDatePicker';
import { Tooltip } from '../../components/ui/Tooltip';
import { ConfirmationDialog } from '../../components/ui/ConfirmationDialog';
import { AiMarker } from '../../components/ui/AiMarker';
import { useCollectionActions, useDeleteMemory, useMemoryCollections, useMemorySuggestionDecision, useUpdateMemory } from './hooks/useVault';
import axiosClient from '../../services/axiosClient';
import { useAuthStore } from '../../stores/authStore';
import { useFamilyTreeData } from '../family-tree/hooks/useFamilyTree';
import { downloadArtifact } from '../../lib/files';
import { pollTask } from '../../lib/tasks';
import { getPendingSuggestion, isAiGeneratedTag, isAiGeneratedTitle } from './lib/aiMarkers';
import type { VaultMemory } from './types';

interface MemoryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  memory: VaultMemory | null;
  onUpdate?: (updated: VaultMemory) => void;
}

type MemoryEditForm = Pick<
  VaultMemory,
  'title' | 'location' | 'date' | 'year' | 'cluster_name' | 'human_caption' | 'tags'
>;

function IconTooltip({ label, children }: { label: string; children: ReactNode }) {
  return <Tooltip content={label}>{children}</Tooltip>;
}

function FieldSuggestion({
  label,
  value,
  onAccept,
  onReject,
  isLoading,
}: {
  label: string;
  value: ReactNode;
  onAccept: () => void;
  onReject: () => void;
  isLoading?: boolean;
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[rgba(184,143,91,0.32)] bg-[rgba(184,143,91,0.08)] p-4 shadow-inner">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AiMarker label={`AI suggestion for ${label.toLowerCase()}`} />
          <span className="font-ui text-[10px] font-black uppercase tracking-[0.18em] text-[var(--clr-gold-dark)]">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <IconTooltip label="Accept suggestion">
            <button
              aria-label={`Accept AI ${label}`}
              disabled={isLoading}
              onClick={onAccept}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(82,120,82,0.35)] text-[rgb(82,120,82)] transition-colors hover:bg-[rgb(82,120,82)] hover:text-white disabled:opacity-50"
            >
              <Check size={14} weight="bold" />
            </button>
          </IconTooltip>
          <IconTooltip label="Reject suggestion">
            <button
              aria-label={`Reject AI ${label}`}
              disabled={isLoading}
              onClick={onReject}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(139,58,58,0.35)] text-[var(--clr-danger)] transition-colors hover:bg-[var(--clr-danger)] hover:text-white disabled:opacity-50"
            >
              <X size={14} weight="bold" />
            </button>
          </IconTooltip>
        </div>
      </div>
      <div className="font-ui text-[13px] leading-relaxed text-[var(--clr-ink)]">{value}</div>
    </div>
  );
}

function toMemoryEditForm(memory: VaultMemory): MemoryEditForm {
  return {
    title: memory.title || '',
    location: memory.location || '',
    date: memory.date || '',
    year: memory.year || '',
    cluster_name: memory.cluster_name || '',
    human_caption: memory.human_caption || '',
    tags: memory.tags ? [...memory.tags] : [],
  };
}

export default function MemoryDetailModal({ isOpen, onClose, memory, onUpdate }: MemoryDetailModalProps) {
  if (!memory) return null;

  const [isIdentifying, setIsIdentifying] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [imageZoom, setImageZoom] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);
  const [editForm, setEditForm] = useState<MemoryEditForm>(() => toMemoryEditForm(memory));
  const [tagInput, setTagInput] = useState('');
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isCollectionMenuOpen, setIsCollectionMenuOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [reprocessTaskId, setReprocessTaskId] = useState<string | null>(null);
  const [reprocessError, setReprocessError] = useState<string | null>(null);
  const [isAddingManualKin, setIsAddingManualKin] = useState(false);
  const [manualKinBusyId, setManualKinBusyId] = useState<string | null>(null);

  const { currentUser } = useAuthStore();
  const canContribute = currentUser?.role === 'ADMIN' || currentUser?.role === 'CONTRIBUTOR';

  const queryClient = useQueryClient();
  const vaultId = useAuthStore((s) => s.activeVaultId);
  const { data: treeData } = useFamilyTreeData();
  const { data: collections = [] } = useMemoryCollections();
  const { createCollection, deleteCollection } = useCollectionActions();
  const deleteMutation = useDeleteMemory();
  const updateMutation = useUpdateMemory();
  const suggestionDecision = useMemorySuggestionDecision();

  const derivedYear = editForm.date ? editForm.date.slice(0, 4) : '';
  const titleIsAiGenerated = isAiGeneratedTitle(memory);
  const pendingTitleValue = getPendingSuggestion(memory, 'title');
  const pendingDescriptionValue = getPendingSuggestion(memory, 'description');
  const pendingTagsValue = getPendingSuggestion(memory, 'tags');
  const pendingTitleSuggestion = typeof pendingTitleValue === 'string' ? pendingTitleValue : null;
  const pendingDescriptionSuggestion = typeof pendingDescriptionValue === 'string' ? pendingDescriptionValue : null;
  const pendingTagSuggestion = Array.isArray(pendingTagsValue) ? pendingTagsValue.map(String).filter(Boolean) : null;
  const linkedKinIds = new Set([
    ...(memory.detected_faces || []).map((face) => face.person_id),
    ...(memory.identified_people || []).map((person) => person.id),
  ]);
  const manualKinOptions = (treeData?.nodes || []).filter((person) => !linkedKinIds.has(person.id));

  useEffect(() => {
    setIsFavorite(memory?.is_favorite || false);
    setImageZoom(1);
    setReprocessError(null);
    if (!isEditing && memory) {
      setEditForm(toMemoryEditForm(memory));
    }
  }, [memory, isEditing]);

  const handleIdentify = async (faceId: string, personId: string) => {
    const identifyPromise = (async () => {
      await axiosClient.post(`/vaults/${vaultId}/lineage/identify/`, {
        face_embedding_id: faceId,
        target_person_id: personId
      });
      queryClient.invalidateQueries();
      const res = await axiosClient.get(`/vaults/${vaultId}/memories/${memory.id}/`);
      onUpdate?.(res.data);
      setIsIdentifying(null);
    })();

    await sileo.promise(identifyPromise, {
      loading: { title: "Updating Lineage..." },
      success: { title: "Identity Confirmed" },
      error: { title: "Failed to confirm identity" }
    });
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareData = {
      title: memory.title || 'LegacyKeeper Artifact',
      text: memory.human_caption || memory.ai_caption || 'View this family memory in LegacyKeeper.',
      url: shareUrl,
    };

    try {
      if (navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
        await navigator.share(shareData);
        sileo.success({ title: "Share Sheet Opened", description: "Choose where to send this artifact." });
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      sileo.success({ title: "Link Copied", description: "Native sharing is not available in this browser." });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      sileo.error({ title: "Share Failed", description: "The artifact could not be shared." });
    }
  };

  const handleToggleFavorite = async () => {
    const newVal = !isFavorite;
    setIsFavorite(newVal);
    try {
      const res = await updateMutation.mutateAsync({
        memoryId: memory.id,
        data: { is_favorite: newVal }
      });
      onUpdate?.(res);
      sileo.success({ title: newVal ? "Added to Favorites" : "Removed from Favorites" });
    } catch {
      setIsFavorite(!newVal);
      sileo.error({ title: "Favorite update failed" });
    }
  };

  const handleDownload = () => {
    const url = memory.restoredUrl || memory.url;
    const ext = url.split('.').pop()?.split(/[#?]/)[0] || 'jpg';
    downloadArtifact(url, `legacy_artifact_${memory.id}.${ext}`);
    sileo.success({ title: "Artifact Saved", description: "High-resolution file downloaded." });
  };

  const handleDelete = async () => {
    await sileo.promise(deleteMutation.mutateAsync(memory.id), {
      loading: { title: "Expunging Artifact..." },
      success: () => {
        setIsDeleteConfirmOpen(false);
        onClose();
        return { title: "Artifact Expunged", description: "Memory removed from the current wing." };
      },
      error: { title: "Failed to delete" }
    });
  };

  const handleRetryAI = async () => {
    if (isReprocessing) return;

    const reprocessPromise = (async () => {
      setIsReprocessing(true);
      setReprocessError(null);
      const res = await axiosClient.post(`/vaults/${vaultId}/memories/${memory.id}/reprocess/`);
      const task_id = res.data.task_id;
      setReprocessTaskId(task_id);
      await pollTask(task_id);
      const full = await axiosClient.get(`/vaults/${vaultId}/memories/${memory.id}/`);
      onUpdate?.(full.data);
      queryClient.invalidateQueries();
      return full.data as VaultMemory;
    })();

    const loadingToastId = sileo.show({
      type: 'loading',
      title: "Curator Returning...",
      description: "Retrying AI analysis.",
      duration: null
    });

    try {
      const updatedMemory = await reprocessPromise;
      sileo.dismiss(loadingToastId);
      sileo.success({
        title: "AI Curation Complete",
        description: `${updatedMemory.title || 'This exhibit'} has been refreshed with title, description, tags, and face matches.`
      });
    } catch (error) {
      sileo.dismiss(loadingToastId);
      sileo.error({
        title: "AI unavailable",
        description: "The worker could not reprocess this artifact right now."
      });
      setReprocessError(error instanceof Error ? error.message : 'The worker could not reprocess this artifact right now.');
    } finally {
      setIsReprocessing(false);
      setReprocessTaskId(null);
    }
  };

  const handleSuggestionDecision = async (field: string, action: 'accept' | 'reject') => {
    try {
      const updated = await suggestionDecision.mutateAsync({ memoryId: memory.id, field, action });
      onUpdate?.(updated);
      queryClient.invalidateQueries();
      sileo.success({
        title: action === 'accept' ? "Suggestion Accepted" : "Suggestion Dismissed",
        description: `${field === 'description' ? 'Description' : field.charAt(0).toUpperCase() + field.slice(1)} has been ${action === 'accept' ? 'applied' : 'left unchanged'}.`
      });
    } catch {
      sileo.error({ title: "Suggestion Review Failed", description: "Could not update that AI suggestion." });
    }
  };

  const handleAddManualKin = async (personId: string) => {
    if (!vaultId) return;
    setManualKinBusyId(personId);
    try {
      const res = await axiosClient.post(`/vaults/${vaultId}/memories/${memory.id}/identified-kin/`, { person_id: personId });
      onUpdate?.(res.data);
      queryClient.invalidateQueries();
      setIsAddingManualKin(false);
      sileo.success({ title: "Kin Added", description: "Manual identification saved to this exhibit." });
    } catch {
      sileo.error({ title: "Could Not Add Kin" });
    } finally {
      setManualKinBusyId(null);
    }
  };

  const handleRemoveManualKin = async (personId: string) => {
    if (!vaultId) return;
    setManualKinBusyId(personId);
    try {
      const res = await axiosClient.delete(`/vaults/${vaultId}/memories/${memory.id}/identified-kin/`, { data: { person_id: personId } });
      onUpdate?.(res.data);
      queryClient.invalidateQueries();
      sileo.success({ title: "Kin Removed", description: "Manual identification removed from this exhibit." });
    } catch {
      sileo.error({ title: "Could Not Remove Kin" });
    } finally {
      setManualKinBusyId(null);
    }
  };

  const handleSaveEdit = async () => {
    const payload = {
      ...editForm,
      date: editForm.date || null,
      year: editForm.date ? editForm.date.slice(0, 4) : '',
      cluster_name: editForm.cluster_name || 'Unsorted',
    };

    await sileo.promise(updateMutation.mutateAsync({
      memoryId: memory.id,
      data: payload,
    }), {
      loading: { title: "Preserving Changes..." },
      success: (res) => {
        setIsEditing(false);
        onUpdate?.(res);
        return { title: "Exhibit Updated", description: "Your edits have been archived." };
      },
      error: { title: "Save Failed", description: "Could not update the exhibit." }
    });
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !editForm.tags.includes(trimmed)) {
      setEditForm(prev => ({ ...prev, tags: [...prev.tags, trimmed] }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setEditForm(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  const startEditing = () => {
    setEditForm(toMemoryEditForm(memory));
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setIsCollectionMenuOpen(false);
  };

  const handleCreateCollection = async () => {
    const name = newCollectionName.trim();
    if (!name) return;

    await sileo.promise(createCollection.mutateAsync(name), {
      loading: { title: "Creating Collection..." },
      success: (collection) => {
        setEditForm(prev => ({ ...prev, cluster_name: collection.name }));
        setNewCollectionName('');
        setIsCollectionMenuOpen(false);
        return { title: "Collection Created", description: `"${collection.name}" is ready for curation.` };
      },
      error: { title: "Collection Failed", description: "Could not create that collection." }
    });
  };

  const handleDeleteCollection = async (collection: { id: string | null; name: string; memory_count: number }) => {
    if (collection.memory_count > 0 || !collection.id) {
      sileo.error({
        title: "Collection Still Linked",
        description: `Unlink ${collection.memory_count || 'the'} exhibit${collection.memory_count === 1 ? '' : 's'} from "${collection.name}" before deleting it.`
      });
      return;
    }

    await sileo.promise(deleteCollection.mutateAsync(collection.id), {
      loading: { title: "Deleting Collection..." },
      success: () => {
        if (editForm.cluster_name === collection.name) {
          setEditForm(prev => ({ ...prev, cluster_name: '' }));
        }
        return { title: "Collection Deleted" };
      },
      error: { title: "Delete Blocked", description: "Unlink all exhibits from this collection first." }
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-[clamp(16px,4vw,64px)]">
          <motion.div
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(12px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 bg-[rgba(20,18,17,0.85)]"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className={`relative w-full ${isEditing ? 'max-w-[1380px]' : 'max-w-[1200px]'} h-[90vh] bg-[var(--clr-parchment)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] border border-[rgba(184,143,91,0.3)] overflow-hidden flex flex-col md:flex-row z-10`}
          >
            <div className={`w-full ${isEditing ? 'md:w-[46%]' : 'md:w-[60%]'} h-1/2 md:h-full bg-[var(--clr-soot)] relative flex flex-col p-[var(--space-6)]`}>
              <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
                <IconTooltip label="Zoom out">
                  <button
                    aria-label="Zoom out"
                    onClick={() => setImageZoom(z => Math.max(z - 0.25, 0.5))}
                    className="w-9 h-9 rounded-full bg-[rgba(20,18,17,0.82)] border border-[rgba(184,143,91,0.45)] text-[var(--clr-linen)] flex items-center justify-center hover:border-[var(--clr-gold)] hover:text-[var(--clr-gold)] transition-colors"
                  >
                    <MagnifyingGlassMinus size={16} />
                  </button>
                </IconTooltip>
                <IconTooltip label="Reset zoom">
                  <button
                    aria-label="Reset zoom"
                    onClick={() => setImageZoom(1)}
                    className="h-9 min-w-14 rounded-full bg-[rgba(20,18,17,0.82)] border border-[rgba(184,143,91,0.45)] text-[var(--clr-linen)] flex items-center justify-center hover:text-[var(--clr-gold)] hover:border-[var(--clr-gold)] transition-colors cursor-pointer text-[10px] font-ui font-bold"
                  >
                    {Math.round(imageZoom * 100)}%
                  </button>
                </IconTooltip>
                <IconTooltip label="Zoom in">
                  <button
                    aria-label="Zoom in"
                    onClick={() => setImageZoom(z => Math.min(z + 0.25, 3))}
                    className="w-9 h-9 rounded-full bg-[rgba(20,18,17,0.82)] border border-[rgba(184,143,91,0.45)] text-[var(--clr-linen)] flex items-center justify-center hover:border-[var(--clr-gold)] hover:text-[var(--clr-gold)] transition-colors"
                  >
                    <MagnifyingGlassPlus size={16} />
                  </button>
                </IconTooltip>
              </div>

              <div className="absolute top-4 right-4 z-20">
                <IconTooltip label={isFavorite ? "Remove favorite" : "Add favorite"}>
                  <button
                    aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                    onClick={handleToggleFavorite}
                    disabled={updateMutation.isPending}
                    className="w-9 h-9 rounded-full bg-[rgba(20,18,17,0.82)] border border-[rgba(184,143,91,0.45)] text-[var(--clr-linen)] flex items-center justify-center hover:border-[var(--clr-gold)] hover:text-[var(--clr-gold)] transition-colors disabled:opacity-50"
                  >
                    <Heart size={17} weight={isFavorite ? "fill" : "bold"} className={isFavorite ? "text-[var(--clr-gold)]" : ""} />
                  </button>
                </IconTooltip>
              </div>

              <div className="flex-1 flex items-center justify-center relative overflow-hidden">
                {memory.restoredUrl ? (
                  <RestorationSlider originalSrc={memory.url} restoredSrc={memory.restoredUrl} />
                ) : (
                  <img src={memory.url} alt={memory.title} className="max-w-full max-h-full object-contain drop-shadow-2xl border-4 border-white/10 rounded-sm transition-transform duration-200" style={{ transform: `scale(${imageZoom})` }} />
                )}
              </div>
            </div>

            <div className={`w-full ${isEditing ? 'md:w-[54%]' : 'md:w-[40%]'} h-1/2 md:h-full bg-[var(--clr-linen)] flex flex-col p-[var(--space-8)] border-l border-[var(--clr-aged)] relative`}>
              <div className="absolute top-6 right-6 z-20">
                <IconTooltip label="Close">
                  <button
                    aria-label="Close"
                    onClick={onClose}
                    className="w-10 h-10 rounded-full bg-[var(--clr-paper)] border border-[var(--clr-aged)] flex items-center justify-center text-[var(--clr-ink)] hover:text-[var(--clr-gold)] hover:border-[var(--clr-gold)] transition-colors"
                  >
                    <X size={20} />
                  </button>
                </IconTooltip>
              </div>

              {!isEditing ? (
                <>
                  <div className="flex items-center justify-between mb-2 pr-16 shrink-0">
                    <p className="font-ui text-[11px] uppercase tracking-widest text-[var(--clr-gold)]">Exhibit Details</p>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto no-scrollbar pb-6 pr-2">
                    <div className="mb-1 flex flex-wrap items-start gap-2">
                      <h2 className="min-w-0 font-display font-semibold text-[2rem] text-[var(--clr-ink)] leading-tight">
                        {memory.title || 'Untitled Artifact'}
                      </h2>
                      {titleIsAiGenerated && <AiMarker label="AI-generated title" className="mt-1.5" />}
                    </div>
                    <p className="font-script text-[44px] text-[var(--clr-dust)] leading-[0.5] mb-8">
                      "{memory.date || memory.year || 'Timeless'}"
                    </p>

                    <div className="w-full h-[1px] bg-[var(--clr-gold)] opacity-30 mb-8" />

                    <AnimatePresence>
                      {isReprocessing && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          className="mb-6 rounded-[var(--radius-md)] border border-[rgba(184,143,91,0.35)] bg-[var(--clr-gold-muted)] p-4 shadow-inner"
                        >
                          <div className="flex items-start gap-3">
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
                              className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--clr-gold)] text-[var(--clr-gold-dark)]"
                            >
                              <MagicWand size={18} weight="fill" />
                            </motion.div>
                            <div className="min-w-0">
                              <p className="font-ui text-[10px] font-black uppercase tracking-[0.18em] text-[var(--clr-gold-dark)]">
                                AI curation in progress
                              </p>
                              <p className="mt-1 font-ui text-[12px] leading-relaxed text-[var(--clr-dust)]">
                                Rebuilding captions, metadata, and face matches. You can keep this exhibit open while it runs.
                              </p>
                              {reprocessTaskId && (
                                <p className="mt-2 truncate font-ui text-[9px] uppercase tracking-widest text-[var(--clr-dust)] opacity-75">
                                  Task {reprocessTaskId}
                                </p>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                      {!isReprocessing && reprocessError && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          className="mb-6 rounded-[var(--radius-md)] border border-[rgba(153,58,43,0.35)] bg-[rgba(153,58,43,0.08)] p-4 shadow-inner"
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[rgba(153,58,43,0.45)] text-[var(--clr-danger)]">
                              <WarningCircle size={18} weight="fill" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-ui text-[10px] font-black uppercase tracking-[0.18em] text-[var(--clr-danger)]">
                                AI curation stopped
                              </p>
                              <p className="mt-1 font-ui text-[12px] leading-relaxed text-[var(--clr-dust)]">
                                {reprocessError}
                              </p>
                              <button
                                type="button"
                                onClick={handleRetryAI}
                                className="mt-3 inline-flex items-center gap-2 rounded-full border border-[rgba(153,58,43,0.35)] px-3 py-1.5 font-ui text-[10px] font-black uppercase tracking-[0.14em] text-[var(--clr-danger)] transition-colors hover:bg-[var(--clr-danger)] hover:text-white"
                              >
                                <MagicWand size={13} weight="bold" />
                                Try Again
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {(pendingTitleSuggestion || pendingDescriptionSuggestion || (pendingTagSuggestion && pendingTagSuggestion.length > 0)) && (
                      <div className="mb-6 space-y-3">
                        <p className="font-ui text-[11px] uppercase tracking-widest text-[var(--clr-gold)]">AI Suggestions</p>
                        {pendingTitleSuggestion && (
                          <FieldSuggestion
                            label="Title"
                            value={<span className="font-display text-[1.2rem] font-semibold uppercase tracking-wide">{pendingTitleSuggestion}</span>}
                            isLoading={suggestionDecision.isPending}
                            onAccept={() => handleSuggestionDecision('title', 'accept')}
                            onReject={() => handleSuggestionDecision('title', 'reject')}
                          />
                        )}
                        {pendingDescriptionSuggestion && (
                          <FieldSuggestion
                            label="Description"
                            value={<p className="italic text-[var(--clr-dust)]">{pendingDescriptionSuggestion}</p>}
                            isLoading={suggestionDecision.isPending}
                            onAccept={() => handleSuggestionDecision('description', 'accept')}
                            onReject={() => handleSuggestionDecision('description', 'reject')}
                          />
                        )}
                        {pendingTagSuggestion && pendingTagSuggestion.length > 0 && (
                          <FieldSuggestion
                            label="Tags"
                            value={
                              <div className="flex flex-wrap gap-2">
                                {pendingTagSuggestion.map((tag) => (
                                  <span key={tag} className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(184,143,91,0.28)] bg-[var(--clr-paper)] px-3 py-1.5 font-ui text-[11px] font-semibold text-[var(--clr-ink)]">
                                    <Tag size={10} weight="fill" className="text-[var(--clr-gold)]" />
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            }
                            isLoading={suggestionDecision.isPending}
                            onAccept={() => handleSuggestionDecision('tags', 'accept')}
                            onReject={() => handleSuggestionDecision('tags', 'reject')}
                          />
                        )}
                      </div>
                    )}

                    <div className="space-y-4 mb-8">
                      <div className="flex items-center gap-3 text-[var(--clr-dust)] font-ui text-[14px]">
                        <CalendarBlank size={20} className="text-[var(--clr-gold)]" />
                        <span>{memory.date || memory.year || 'Date unrecorded'}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[var(--clr-dust)] font-ui text-[14px]">
                        <MapPin size={20} className="text-[var(--clr-gold)]" />
                        <span>{memory.location || 'Location unknown'}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[var(--clr-dust)] font-ui text-[14px]">
                        <Faders size={20} className="text-[var(--clr-gold)]" />
                        <span>
                          {memory.exif_json?.Model ?
                            `${memory.exif_json.Make || ''} ${memory.exif_json.Model}${memory.exif_json.FNumber ? ` · f/${memory.exif_json.FNumber}` : ''}` :
                            "Technical metadata unavailable"}
                        </span>
                      </div>
                    </div>

                    {memory.ai_caption && (
                      <div className="bg-[var(--clr-paper)] border-l-4 border-[var(--clr-gold)] p-4 rounded-r-[var(--radius-md)] mb-4">
                        <div className="flex flex-wrap items-center gap-2 mb-2 text-[var(--clr-ink)] font-semibold font-ui text-[12px] uppercase tracking-widest">
                          <MagicWand size={16} className="text-[var(--clr-gold)]" /> AI Insight
                          <AiMarker label="AI-generated description" />
                        </div>
                        <p className="font-ui text-[14px] text-[var(--clr-dust)] leading-relaxed italic">
                          {memory.ai_caption}
                        </p>
                      </div>
                    )}

                    {memory.human_caption && (
                      <div className="bg-[var(--clr-paper)] border-l-4 border-[var(--clr-aged)] p-4 rounded-r-[var(--radius-md)] mb-8">
                        <div className="flex items-center gap-2 mb-2 text-[var(--clr-ink)] font-semibold font-ui text-[12px] uppercase tracking-widest">
                          <PencilSimple size={16} className="text-[var(--clr-aged)]" /> Curator's Note
                        </div>
                        <p className="font-ui text-[14px] text-[var(--clr-dust)] leading-relaxed italic">
                          {memory.human_caption}
                        </p>
                      </div>
                    )}

                    <div className="mb-8">
                      <p className="font-ui text-[11px] uppercase tracking-widest text-[var(--clr-gold)] mb-3">Lineage Tags</p>
                      <div className="flex flex-wrap gap-2">
                        {(memory.tags || []).map((tag) => (
                          <span key={tag} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--clr-paper)] border border-[var(--clr-aged)] rounded-full font-ui text-[11px] font-semibold text-[var(--clr-ink)]">
                            <Tag size={10} weight="fill" className="text-[var(--clr-gold)]" />
                            {tag}
                            {isAiGeneratedTag(memory, tag) && <AiMarker compact label="AI-generated tag" />}
                          </span>
                        ))}
                        {(!memory.tags || memory.tags.length === 0) && (
                          <span className="text-[12px] text-[var(--clr-dust)] italic">No tags assigned.</span>
                        )}
                      </div>
                    </div>

                    <div className="mb-8">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="font-ui text-[11px] uppercase tracking-widest text-[var(--clr-gold)]">Identified Kin</p>
                        {canContribute && (
                          <div className="relative">
                            <IconTooltip label="Add manual kin">
                              <button
                                aria-label="Add manual kin"
                                onClick={() => setIsAddingManualKin(open => !open)}
                                className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--clr-aged)] bg-[var(--clr-paper)] text-[var(--clr-gold-dark)] transition-colors hover:border-[var(--clr-gold)] hover:text-[var(--clr-gold)]"
                              >
                                <Plus size={14} weight="bold" />
                              </button>
                            </IconTooltip>
                            {isAddingManualKin && (
                              <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border border-[var(--clr-aged)] bg-white p-2 shadow-xl">
                                <p className="p-2 font-ui text-[9px] font-bold uppercase tracking-widest text-[var(--clr-dust)]">Add Kin Manually</p>
                                <div className="max-h-64 overflow-y-auto">
                                  {manualKinOptions.map((person) => (
                                    <button
                                      key={person.id}
                                      disabled={manualKinBusyId === person.id}
                                      onClick={() => handleAddManualKin(person.id)}
                                      className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-[11px] hover:bg-[var(--clr-gold-muted)] disabled:opacity-50"
                                    >
                                      <img
                                        src={person.photo || `https://ui-avatars.com/api/?name=${person.name.replace(/ /g, '+')}&background=B88F5B&color=fff`}
                                        alt=""
                                        className="h-6 w-6 rounded-full"
                                      />
                                      <span className="min-w-0 flex-1 truncate">{person.name}</span>
                                      {manualKinBusyId === person.id && <MagicWand size={12} className="animate-spin text-[var(--clr-gold)]" />}
                                    </button>
                                  ))}
                                  {manualKinOptions.length === 0 && (
                                    <p className="px-3 py-2 text-[11px] text-[var(--clr-dust)]">All available relatives are already linked to this exhibit.</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(memory.detected_faces || []).map((face, faceIndex) => (
                          <div key={face.id} className="relative group">
                            <div className="inline-flex items-center gap-2 pr-2 py-1 bg-[var(--clr-paper)] border border-[var(--clr-aged)] rounded-full">
                              <img src={face.person_avatar} className="w-6 h-6 rounded-full" alt={face.person_name} />
                              <span className="font-ui text-[11px] font-semibold">
                                <span className="text-[var(--clr-dust)]">Face {faceIndex + 1}:</span> {face.person_name}
                              </span>
                              {canContribute && (
                                <IconTooltip label={face.person_name?.includes("Unknown") ? "Identify face" : "Change identity"}>
                                  <button
                                    aria-label={face.person_name?.includes("Unknown") ? "Identify face" : "Change identity"}
                                    onClick={() => setIsIdentifying(isIdentifying === face.id ? null : face.id)}
                                    className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-[var(--clr-gold-dark)] hover:bg-[var(--clr-gold-muted)] hover:text-[var(--clr-gold)]"
                                  >
                                    {face.person_name?.includes("Unknown") ? <Fingerprint size={14} weight="bold" /> : <CaretDown size={13} weight="bold" />}
                                  </button>
                                </IconTooltip>
                              )}
                            </div>

                            {isIdentifying === face.id && treeData?.nodes && (
                              <div className="absolute bottom-full left-0 z-50 mb-2 w-60 bg-white border border-[var(--clr-aged)] rounded-lg shadow-xl p-2 max-h-64 overflow-y-auto">
                                <p className="text-[9px] uppercase font-bold tracking-widest text-[var(--clr-dust)] p-2">Assign Identity</p>
                                {treeData.nodes.map((p) => (
                                  <button
                                    key={p.id}
                                    onClick={() => handleIdentify(face.id, p.id)}
                                    className={`flex w-full items-center justify-between gap-2 rounded px-3 py-2 text-left text-[11px] hover:bg-[var(--clr-gold-muted)] ${p.id === face.person_id ? 'bg-[var(--clr-gold-muted)] font-bold text-[var(--clr-gold-dark)]' : ''}`}
                                  >
                                    <span>{p.name}</span>
                                    {p.id === face.person_id && <Check size={12} weight="bold" />}
                                  </button>
                                ))}
                                {treeData.nodes.length === 0 && (
                                  <p className="px-3 py-2 text-[11px] text-[var(--clr-dust)]">Add relatives to the lineage tree before assigning faces.</p>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                        {(memory.identified_people || []).map((person) => (
                          <div key={`manual-${person.id}`} className="inline-flex items-center gap-2 rounded-full border border-[var(--clr-aged)] bg-[var(--clr-paper)] py-1 pl-1 pr-2">
                            <img src={person.person_avatar} className="h-6 w-6 rounded-full" alt={person.name} />
                            <span className="font-ui text-[11px] font-semibold">
                              <span className="text-[var(--clr-dust)]">Manual:</span> {person.name}
                            </span>
                            {canContribute && (
                              <IconTooltip label="Remove manual kin">
                                <button
                                  aria-label={`Remove ${person.name}`}
                                  disabled={manualKinBusyId === person.id}
                                  onClick={() => handleRemoveManualKin(person.id)}
                                  className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[var(--clr-danger)] hover:bg-[rgba(139,58,58,0.1)] disabled:opacity-50"
                                >
                                  <X size={12} weight="bold" />
                                </button>
                              </IconTooltip>
                            )}
                          </div>
                        ))}
                        {(!memory.detected_faces || memory.detected_faces.length === 0) && (!memory.identified_people || memory.identified_people.length === 0) && (
                          <span className="text-[12px] text-[var(--clr-dust)] italic">No identified kin.</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-3 shrink-0 mt-auto pt-4 border-t border-[var(--clr-aged)]">
                    <IconTooltip label="Share artifact"><Button variant="icon" aria-label="Share artifact" onClick={handleShare}><ShareNetwork size={18} /></Button></IconTooltip>
                    <IconTooltip label="Download original"><Button variant="icon" aria-label="Download original" onClick={handleDownload}><DownloadSimple size={18} /></Button></IconTooltip>
                    {canContribute && <IconTooltip label={isReprocessing ? "AI processing" : "Reprocess with AI"}><Button variant="icon" aria-label="Reprocess with AI" disabled={isReprocessing} onClick={handleRetryAI}><MagicWand size={18} className={isReprocessing ? 'animate-spin' : ''} /></Button></IconTooltip>}
                    {canContribute && <IconTooltip label="Edit exhibit"><Button variant="icon" aria-label="Edit exhibit" onClick={startEditing}><PencilSimple size={18} /></Button></IconTooltip>}
                    {canContribute && <IconTooltip label="Expunge artifact"><Button variant="icon" aria-label="Expunge artifact" onClick={() => setIsDeleteConfirmOpen(true)}><Trash size={18} className="text-[var(--clr-danger)]" /></Button></IconTooltip>}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-5 pr-16 shrink-0">
                    <div>
                      <p className="font-ui text-[11px] uppercase tracking-widest text-[var(--clr-gold)]">Editing Exhibit</p>
                      <h3 className="font-display text-[1.7rem] uppercase tracking-wide text-[var(--clr-ink)] leading-none mt-1">Curate Details</h3>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto no-scrollbar pb-6 pr-2">
                    <div className="space-y-5 mt-1">
                      <div className="rounded-[var(--radius-md)] border border-[var(--clr-aged)] bg-[var(--clr-paper)]/45 p-5 shadow-inner">
                        <label className="font-ui text-[9px] uppercase tracking-[0.2em] text-[var(--clr-dust)] font-bold mb-1.5 block">Title</label>
                        <input
                          type="text"
                          value={editForm.title}
                          onChange={e => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                          className="w-full bg-[var(--clr-linen)] border border-[var(--clr-aged)] rounded-[var(--radius-md)] px-4 py-3 font-ui text-[14px] text-[var(--clr-ink)] outline-none focus:border-[var(--clr-gold)] shadow-inner transition-colors"
                        />
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_160px] gap-4">
                        <div>
                          <label className="font-ui text-[9px] uppercase tracking-[0.2em] text-[var(--clr-dust)] font-bold mb-1.5 block">Date</label>
                          <CustomDatePicker
                            value={editForm.date || ''}
                            onChange={val => setEditForm(prev => ({ ...prev, date: val, year: val ? val.slice(0, 4) : '' }))}
                            className="w-full [&>div]:rounded-[var(--radius-md)] [&>div]:bg-[var(--clr-linen)]"
                          />
                        </div>
                        <div>
                          <label className="font-ui text-[9px] uppercase tracking-[0.2em] text-[var(--clr-dust)] font-bold mb-1.5 block">Year</label>
                          <input
                            type="text"
                            value={derivedYear || 'Pick a date'}
                            disabled
                            className="w-full bg-[rgba(219,207,181,0.55)] border border-[var(--clr-aged)] rounded-[var(--radius-md)] px-4 py-3 font-ui text-[13px] text-[var(--clr-dust)] outline-none disabled:cursor-not-allowed"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="font-ui text-[9px] uppercase tracking-[0.2em] text-[var(--clr-dust)] font-bold mb-1.5 block">Location</label>
                          <input
                            type="text"
                            value={editForm.location}
                            onChange={e => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                            className="w-full bg-[var(--clr-linen)] border border-[var(--clr-aged)] rounded-[var(--radius-md)] px-4 py-3 font-ui text-[13px] text-[var(--clr-ink)] outline-none focus:border-[var(--clr-gold)] shadow-inner transition-colors"
                          />
                      </div>

                      <div>
                        <label className="font-ui text-[9px] uppercase tracking-[0.2em] text-[var(--clr-dust)] font-bold mb-1.5 block">Collection</label>
                        <button
                          type="button"
                          onClick={() => setIsCollectionMenuOpen(open => !open)}
                          className="w-full bg-[var(--clr-linen)] border border-[var(--clr-aged)] rounded-[var(--radius-md)] px-4 py-3 font-ui text-[13px] text-[var(--clr-ink)] outline-none hover:border-[var(--clr-gold)] focus:border-[var(--clr-gold)] shadow-inner transition-colors flex items-center justify-between gap-3"
                        >
                          <span className={editForm.cluster_name ? '' : 'text-[var(--clr-dust)]'}>{editForm.cluster_name || 'Unsorted'}</span>
                          <CaretDown size={16} className={`text-[var(--clr-gold)] transition-transform ${isCollectionMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                          {isCollectionMenuOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: -6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -6 }}
                              className="mt-2 overflow-hidden rounded-[var(--radius-md)] border border-[var(--clr-aged)] bg-[var(--clr-paper)] shadow-[var(--shadow-md)]"
                            >
                              <div className="border-b border-[var(--clr-aged)] p-3">
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={newCollectionName}
                                    onChange={(e) => setNewCollectionName(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleCreateCollection();
                                      }
                                    }}
                                    placeholder="Create new collection..."
                                    className="min-w-0 flex-1 rounded-[var(--radius-md)] border border-[var(--clr-aged)] bg-[var(--clr-linen)] px-3 py-2 font-ui text-[12px] text-[var(--clr-ink)] outline-none focus:border-[var(--clr-gold)]"
                                  />
                                  <button
                                    type="button"
                                    onClick={handleCreateCollection}
                                    disabled={!newCollectionName.trim() || createCollection.isPending}
                                    className="w-10 rounded-[var(--radius-md)] bg-[var(--clr-gold)] text-[var(--clr-charcoal)] flex items-center justify-center disabled:opacity-50"
                                  >
                                    <Plus size={16} weight="bold" />
                                  </button>
                                </div>
                              </div>

                              <div className="max-h-52 overflow-y-auto p-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditForm(prev => ({ ...prev, cluster_name: '' }));
                                    setIsCollectionMenuOpen(false);
                                  }}
                                  className="w-full rounded-[var(--radius-sm)] px-3 py-2 text-left font-ui text-[12px] font-semibold text-[var(--clr-ink)] hover:bg-[var(--clr-gold-muted)]"
                                >
                                  Unsorted
                                </button>
                                {collections.map((collection) => (
                                  <div key={`${collection.id || collection.name}`} className="group flex items-center gap-2 rounded-[var(--radius-sm)] hover:bg-[var(--clr-gold-muted)]">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditForm(prev => ({ ...prev, cluster_name: collection.name }));
                                        setIsCollectionMenuOpen(false);
                                      }}
                                      className="min-w-0 flex-1 px-3 py-2 text-left"
                                    >
                                      <span className="block truncate font-ui text-[12px] font-semibold text-[var(--clr-ink)]">{collection.name}</span>
                                      <span className="block font-ui text-[9px] uppercase tracking-widest text-[var(--clr-dust)]">{collection.memory_count} linked</span>
                                    </button>
                                    <button
                                      type="button"
                                      aria-label={`Delete ${collection.name}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteCollection(collection);
                                      }}
                                      disabled={deleteCollection.isPending}
                                      className="mr-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--clr-dust)] opacity-70 hover:bg-[var(--clr-danger)] hover:text-white group-hover:opacity-100 disabled:opacity-40"
                                    >
                                      <Trash size={13} weight="bold" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <div>
                        <label className="font-ui text-[9px] uppercase tracking-[0.2em] text-[var(--clr-dust)] font-bold mb-1.5 block">Curator's Note</label>
                        <textarea
                          value={editForm.human_caption}
                          onChange={e => setEditForm(prev => ({ ...prev, human_caption: e.target.value }))}
                          rows={3}
                          placeholder="Add your personal insights..."
                          className="w-full bg-[var(--clr-linen)] border border-[var(--clr-aged)] rounded-[var(--radius-md)] px-4 py-3 font-ui text-[13px] text-[var(--clr-ink)] outline-none focus:border-[var(--clr-gold)] shadow-inner transition-colors resize-none"
                        />
                      </div>

                      <div>
                        <label className="font-ui text-[9px] uppercase tracking-[0.2em] text-[var(--clr-dust)] font-bold mb-1.5 block">Tags</label>
                        <div className="flex gap-2 mb-3">
                          <input
                            type="text"
                            value={tagInput}
                            onChange={e => setTagInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                            placeholder="Add a tag..."
                            className="flex-1 bg-[var(--clr-linen)] border border-[var(--clr-aged)] rounded-[var(--radius-md)] px-4 py-3 font-ui text-[13px] text-[var(--clr-ink)] outline-none focus:border-[var(--clr-gold)] shadow-inner transition-colors min-w-0"
                          />
                          <button
                            type="button"
                            onClick={handleAddTag}
                            className="px-4 py-2 rounded-full bg-[var(--clr-gold)] text-[var(--clr-charcoal)] font-ui text-[10px] uppercase tracking-widest font-bold hover:bg-[var(--clr-gold-light)] transition-colors"
                          >
                            Add
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {editForm.tags.map((tag) => (
                            <span key={tag} className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--clr-paper)] border border-[var(--clr-aged)] rounded-full font-ui text-[10px] font-semibold text-[var(--clr-ink)] group">
                              <Tag size={10} weight="fill" className="text-[var(--clr-gold)]" />
                              {tag}
                              <button type="button" onClick={() => handleRemoveTag(tag)} className="ml-1 text-[var(--clr-dust)] hover:text-[var(--clr-danger)] transition-colors">
                                <X size={10} weight="bold" />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 shrink-0 mt-auto pt-4 border-t border-[var(--clr-aged)]">
                    <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                      <IconTooltip label="Cancel edits">
                        <Button variant="ghost" aria-label="Cancel edits" onClick={cancelEditing} className="w-full sm:w-auto text-[var(--clr-danger)] border-[var(--clr-danger)] hover:bg-[var(--clr-danger)] hover:text-white">
                          <X size={16} /> Cancel
                        </Button>
                      </IconTooltip>
                      <IconTooltip label="Save changes">
                        <Button variant="primary" aria-label="Save changes" disabled={updateMutation.isPending} onClick={handleSaveEdit} className="w-full sm:w-auto">
                          <DownloadSimple size={18} weight="bold" /> {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                        </Button>
                      </IconTooltip>
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>

          <ConfirmationDialog
            open={isDeleteConfirmOpen}
            onOpenChange={setIsDeleteConfirmOpen}
            variant="danger"
            eyebrow="Permanent Archive Action"
            title="Expunge Exhibit?"
            description={
              <>
                This will permanently remove <strong className="text-[var(--clr-ink)]">{memory.title || 'Untitled Artifact'}</strong> from the vault. This cannot be undone.
              </>
            }
            confirmLabel="Expunge"
            cancelLabel="Keep Exhibit"
            isLoading={deleteMutation.isPending}
            onConfirm={handleDelete}
          />
        </div>
      )}
    </AnimatePresence>
  );
}
