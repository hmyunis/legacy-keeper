import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, CalendarBlank, Faders, MagicWand, DownloadSimple, ShareNetwork, Trash, Fingerprint, PencilSimple, Check, Tag, MagnifyingGlassPlus, MagnifyingGlassMinus, Heart, FloppyDisk } from '@phosphor-icons/react';
import { sileo } from 'sileo';
import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import RestorationSlider from '../../components/vault/RestorationSlider';
import { Button } from '../../components/ui/Button';
import { CustomDatePicker } from '../../components/ui/CustomDatePicker';
import { useDeleteMemory, useUpdateMemory } from './hooks/useVault';
import axiosClient from '../../services/axiosClient';
import { useAuthStore } from '../../stores/authStore';
import { useFamilyTreeData } from '../family-tree/hooks/useFamilyTree';
import { downloadArtifact } from '../../lib/files';
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

  const { currentUser } = useAuthStore();
  const canContribute = currentUser?.role === 'ADMIN' || currentUser?.role === 'CONTRIBUTOR';

  const queryClient = useQueryClient();
  const vaultId = useAuthStore((s) => s.activeVaultId);
  const { data: treeData } = useFamilyTreeData();
  const deleteMutation = useDeleteMemory();
  const updateMutation = useUpdateMemory();

  useEffect(() => {
    setIsFavorite(memory?.is_favorite || false);
    if (!isEditing && memory) {
      setEditForm(toMemoryEditForm(memory));
    }
  }, [memory, isEditing]);

  const handleIdentify = async (faceId: string, personId: string) => {
    await sileo.promise(axiosClient.post(`/vaults/${vaultId}/lineage/identify/`, {
      face_embedding_id: faceId,
      target_person_id: personId
    }), {
      loading: { title: "Updating Lineage..." },
      success: async () => {
        queryClient.invalidateQueries();
        const res = await axiosClient.get(`/vaults/${vaultId}/memories/${memory.id}/`);
        onUpdate?.(res.data);
        setIsIdentifying(null);
        return { title: "Identity Confirmed" };
      },
      error: { title: "Failed to confirm identity" }
    });
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    sileo.success({ title: "Link Dispatched", description: "Artifact address copied to clipboard." });
  };

  const handleToggleFavorite = async () => {
    const newVal = !isFavorite;
    setIsFavorite(newVal);
    sileo.success({ title: newVal ? "Added to Favorites" : "Removed from Favorites" });
    const res = await updateMutation.mutateAsync({
      memoryId: memory.id,
      data: { is_favorite: newVal }
    });
    onUpdate?.(res);
  };

  const handleDownload = () => {
    const url = memory.restoredUrl || memory.url;
    const ext = url.split('.').pop()?.split(/[#?]/)[0] || 'jpg';
    downloadArtifact(url, `legacy_artifact_${memory.id}.${ext}`);
    sileo.success({ title: "Artifact Saved", description: "High-resolution file downloaded." });
  };

  const handleDelete = () => {
    sileo.promise(deleteMutation.mutateAsync(memory.id), {
      loading: { title: "Expunging Artifact..." },
      success: () => {
        onClose();
        return { title: "Artifact Expunged", description: "Memory removed from the current wing." };
      },
      error: { title: "Failed to delete" }
    });
  };

  const handleRetryAI = async () => {
    const res = await axiosClient.post(`/vaults/${vaultId}/memories/${memory.id}/reprocess/`);
    const task_id = res.data.task_id;
    sileo.promise(new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const check = await axiosClient.get(`/tasks/${task_id}/`);
          if (check.data.status === 'SUCCESS') resolve(check.data);
          else if (check.data.status === 'FAILURE') reject(new Error('Failed'));
          else setTimeout(poll, 2000);
        } catch (e) {
          reject(e);
        }
      };
      poll();
    }), {
      loading: { title: "Curator Returning...", description: "Retrying AI analysis." },
      success: async () => {
        const full = await axiosClient.get(`/vaults/${vaultId}/memories/${memory.id}/`);
        onUpdate?.(full.data);
        queryClient.invalidateQueries();
        return { title: "Success", description: "AI analysis complete." };
      },
      error: { title: "Error", description: "Failed to retry AI analysis." }
    });
  };

  const handleSaveEdit = async () => {
    const payload = {
      ...editForm,
      date: editForm.date || null,
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
            className="relative w-full max-w-[1200px] h-[90vh] bg-[var(--clr-parchment)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] border border-[rgba(184,143,91,0.3)] overflow-hidden flex flex-col md:flex-row z-10"
          >
            <div className="w-full md:w-[60%] h-1/2 md:h-full bg-[var(--clr-soot)] relative flex flex-col p-[var(--space-6)]">
              <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
                <button
                  onClick={() => setImageZoom(z => Math.max(z - 0.25, 0.5))}
                  className="w-8 h-8 rounded-full bg-[rgba(20,18,17,0.7)] border border-[rgba(184,143,91,0.4)] text-[var(--clr-linen)] flex items-center justify-center hover:border-[var(--clr-gold)] transition-colors"
                  title="Zoom Out"
                >
                  <MagnifyingGlassMinus size={16} />
                </button>
                <button 
                  onClick={() => setImageZoom(1)} 
                  className="w-12 h-8 rounded-full bg-[rgba(20,18,17,0.7)] border border-[rgba(184,143,91,0.4)] text-[var(--clr-linen)] flex items-center justify-center hover:text-[var(--clr-gold)] hover:border-[var(--clr-gold)] transition-colors cursor-pointer text-[10px] font-ui font-bold"
                  title="Reset Zoom"
                >
                  {Math.round(imageZoom * 100)}%
                </button>
                <button
                  onClick={() => setImageZoom(z => Math.min(z + 0.25, 3))}
                  className="w-8 h-8 rounded-full bg-[rgba(20,18,17,0.7)] border border-[rgba(184,143,91,0.4)] text-[var(--clr-linen)] flex items-center justify-center hover:border-[var(--clr-gold)] transition-colors"
                  title="Zoom In"
                >
                  <MagnifyingGlassPlus size={16} />
                </button>
              </div>

              <button
                onClick={handleToggleFavorite}
                className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-[rgba(20,18,17,0.7)] border border-[rgba(184,143,91,0.4)] text-[var(--clr-linen)] flex items-center justify-center hover:border-[var(--clr-gold)] transition-colors"
                title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
              >
                <Heart size={16} weight={isFavorite ? "fill" : "bold"} className={isFavorite ? "text-[var(--clr-gold)]" : ""} />
              </button>

              <div className="flex-1 flex items-center justify-center relative overflow-hidden">
                {memory.restoredUrl ? (
                  <RestorationSlider originalSrc={memory.url} restoredSrc={memory.restoredUrl} />
                ) : (
                  <img src={memory.url} alt={memory.title} className="max-w-full max-h-full object-contain drop-shadow-2xl border-4 border-white/10 rounded-sm transition-transform duration-200" style={{ transform: `scale(${imageZoom})` }} />
                )}
              </div>
            </div>

            <div className="w-full md:w-[40%] h-1/2 md:h-full bg-[var(--clr-linen)] flex flex-col p-[var(--space-8)] border-l border-[var(--clr-aged)] relative">
              <button
                onClick={onClose}
                title="Close"
                className="absolute top-6 right-6 w-10 h-10 rounded-full bg-[var(--clr-paper)] border border-[var(--clr-aged)] flex items-center justify-center text-[var(--clr-ink)] hover:text-[var(--clr-gold)] hover:border-[var(--clr-gold)] transition-colors z-20"
              >
                <X size={20} />
              </button>

              {!isEditing ? (
                <>
                  <div className="flex items-center justify-between mb-2 pr-16 shrink-0">
                    <p className="font-ui text-[11px] uppercase tracking-widest text-[var(--clr-gold)]">Exhibit Details</p>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto no-scrollbar pb-6 pr-2">
                    <h2 className="font-display font-semibold text-[2rem] text-[var(--clr-ink)] leading-tight mb-1">
                      {memory.title || 'Untitled Artifact'}
                    </h2>
                    <p className="font-script text-[44px] text-[var(--clr-dust)] leading-[0.5] mb-8">
                      "{memory.date || memory.year || 'Timeless'}"
                    </p>

                    <div className="w-full h-[1px] bg-[var(--clr-gold)] opacity-30 mb-8" />

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
                        <div className="flex items-center gap-2 mb-2 text-[var(--clr-ink)] font-semibold font-ui text-[12px] uppercase tracking-widest">
                          <MagicWand size={16} className="text-[var(--clr-gold)]" /> AI Insight
                        </div>
                        <p className="font-ui text-[14px] text-[var(--clr-dust)] leading-relaxed italic">
                          "{memory.ai_caption}"
                        </p>
                      </div>
                    )}

                    {memory.human_caption && (
                      <div className="bg-[var(--clr-paper)] border-l-4 border-[var(--clr-aged)] p-4 rounded-r-[var(--radius-md)] mb-8">
                        <div className="flex items-center gap-2 mb-2 text-[var(--clr-ink)] font-semibold font-ui text-[12px] uppercase tracking-widest">
                          <PencilSimple size={16} className="text-[var(--clr-aged)]" /> Curator's Note
                        </div>
                        <p className="font-ui text-[14px] text-[var(--clr-dust)] leading-relaxed italic">
                          "{memory.human_caption}"
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
                          </span>
                        ))}
                        {(!memory.tags || memory.tags.length === 0) && (
                          <span className="text-[12px] text-[var(--clr-dust)] italic">No tags assigned.</span>
                        )}
                      </div>
                    </div>

                    <div className="mb-8">
                      <p className="font-ui text-[11px] uppercase tracking-widest text-[var(--clr-gold)] mb-3">Identified Kin</p>
                      <div className="flex flex-wrap gap-2">
                        {(memory.detected_faces || []).map((face) => (
                          <div key={face.id} className="relative group">
                            <div className="inline-flex items-center gap-2 pr-3 py-1 bg-[var(--clr-paper)] border border-[var(--clr-aged)] rounded-full">
                              <img src={face.person_avatar} className="w-6 h-6 rounded-full" alt={face.person_name} />
                              <span className="font-ui text-[11px] font-semibold">{face.person_name}</span>
                              {face.person_name?.includes("Unknown") && (
                                <button onClick={() => setIsIdentifying(face.id)} className="ml-1 text-[var(--clr-gold-dark)] hover:text-[var(--clr-gold)]">
                                  <Fingerprint size={14} weight="bold" />
                                </button>
                              )}
                            </div>

                            {isIdentifying === face.id && treeData?.nodes && (
                              <div className="absolute bottom-full left-0 z-50 mb-2 w-48 bg-white border border-[var(--clr-aged)] rounded-lg shadow-xl p-2 max-h-48 overflow-y-auto">
                                <p className="text-[9px] uppercase font-bold text-[var(--clr-dust)] p-2">Assign Identity</p>
                                {treeData.nodes.map((p) => (
                                  <button key={p.id} onClick={() => handleIdentify(face.id, p.id)} className="w-full text-left px-3 py-2 text-[11px] hover:bg-[var(--clr-gold-muted)] rounded">
                                    {p.name}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                        {(!memory.detected_faces || memory.detected_faces.length === 0) && (
                          <span className="text-[12px] text-[var(--clr-dust)] italic">No identified kin.</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-3 shrink-0 mt-auto pt-4 border-t border-[var(--clr-aged)]">
                    <Button variant="icon" onClick={handleShare} title="Share Artifact"><ShareNetwork size={18} /></Button>
                    <Button variant="icon" onClick={handleDownload} title="Download Original"><DownloadSimple size={18} /></Button>
                    {canContribute && <Button variant="icon" onClick={handleRetryAI} title="Reprocess via AI"><MagicWand size={18} /></Button>}
                    {canContribute && <Button variant="icon" onClick={startEditing} title="Edit Exhibit"><PencilSimple size={18} /></Button>}
                    {canContribute && <Button variant="icon" onClick={handleDelete} title="Expunge Artifact"><Trash size={18} className="text-[var(--clr-danger)]" /></Button>}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2 pr-16 shrink-0">
                    <p className="font-ui text-[11px] uppercase tracking-widest text-[var(--clr-gold)]">Editing Exhibit</p>
                  </div>

                  <div className="flex-1 overflow-y-auto no-scrollbar pb-6 pr-2">
                    <div className="space-y-5 mt-2">
                      <div>
                        <label className="font-ui text-[9px] uppercase tracking-[0.2em] text-[var(--clr-dust)] font-bold mb-1.5 block">Title</label>
                        <input
                          type="text"
                          value={editForm.title}
                          onChange={e => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                          className="w-full bg-[var(--clr-paper)] border border-[var(--clr-aged)] rounded-[var(--radius-pill)] px-4 py-2 font-ui text-[13px] text-[var(--clr-ink)] outline-none focus:border-[var(--clr-gold)] shadow-inner transition-colors"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="font-ui text-[9px] uppercase tracking-[0.2em] text-[var(--clr-dust)] font-bold mb-1.5 block">Exact Date</label>
                          <CustomDatePicker
                            value={editForm.date || ''}
                            onChange={val => setEditForm(prev => ({ ...prev, date: val }))}
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label className="font-ui text-[9px] uppercase tracking-[0.2em] text-[var(--clr-dust)] font-bold mb-1.5 block">Location</label>
                          <input
                            type="text"
                            value={editForm.location}
                            onChange={e => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                            className="w-full bg-[var(--clr-paper)] border border-[var(--clr-aged)] rounded-[var(--radius-pill)] px-4 py-2 font-ui text-[13px] text-[var(--clr-ink)] outline-none focus:border-[var(--clr-gold)] shadow-inner transition-colors"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="font-ui text-[9px] uppercase tracking-[0.2em] text-[var(--clr-dust)] font-bold mb-1.5 block">Year (Era)</label>
                          <input
                            type="text"
                            value={editForm.year}
                            onChange={e => setEditForm(prev => ({ ...prev, year: e.target.value }))}
                            placeholder="e.g. 1985"
                            className="w-full bg-[var(--clr-paper)] border border-[var(--clr-aged)] rounded-[var(--radius-pill)] px-4 py-2 font-ui text-[13px] text-[var(--clr-ink)] outline-none focus:border-[var(--clr-gold)] shadow-inner transition-colors"
                          />
                        </div>
                        <div>
                          <label className="font-ui text-[9px] uppercase tracking-[0.2em] text-[var(--clr-dust)] font-bold mb-1.5 block">Collection</label>
                          <input
                            type="text"
                            value={editForm.cluster_name}
                            onChange={e => setEditForm(prev => ({ ...prev, cluster_name: e.target.value }))}
                            placeholder="e.g. Summer Vacations"
                            className="w-full bg-[var(--clr-paper)] border border-[var(--clr-aged)] rounded-[var(--radius-pill)] px-4 py-2 font-ui text-[13px] text-[var(--clr-ink)] outline-none focus:border-[var(--clr-gold)] shadow-inner transition-colors"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="font-ui text-[9px] uppercase tracking-[0.2em] text-[var(--clr-dust)] font-bold mb-1.5 block">Curator's Note</label>
                        <textarea
                          value={editForm.human_caption}
                          onChange={e => setEditForm(prev => ({ ...prev, human_caption: e.target.value }))}
                          rows={3}
                          placeholder="Add your personal insights..."
                          className="w-full bg-[var(--clr-paper)] border border-[var(--clr-aged)] rounded-[var(--radius-md)] px-4 py-2 font-ui text-[13px] text-[var(--clr-ink)] outline-none focus:border-[var(--clr-gold)] shadow-inner transition-colors resize-none"
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
                            className="flex-1 bg-[var(--clr-paper)] border border-[var(--clr-aged)] rounded-[var(--radius-pill)] px-4 py-2 font-ui text-[13px] text-[var(--clr-ink)] outline-none focus:border-[var(--clr-gold)] shadow-inner transition-colors"
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
                    <Button variant="ghost" onClick={cancelEditing} title="Cancel Edits" className="w-10 h-10 px-0 rounded-full text-[var(--clr-danger)] border-[var(--clr-danger)] hover:bg-[var(--clr-danger)] hover:text-white">
                      <X size={16} />
                    </Button>
                    <Button variant="primary" disabled={updateMutation.isPending} onClick={handleSaveEdit} title="Save Edits" className="w-10 h-10 px-0 rounded-full">
                      <FloppyDisk size={18} weight="bold" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
