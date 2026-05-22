import { useState, useRef, useEffect, type MouseEvent as ReactMouseEvent, type TouchEvent as ReactTouchEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Image as ImageIcon, PencilSimple, Trash, Check, MagnifyingGlassPlus,
  MagnifyingGlassMinus, ArrowsOut, IdentificationCard, Spinner
} from '@phosphor-icons/react';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { sileo } from 'sileo';
import { TreeCanvas } from '../features/family-tree/TreeCanvas';
import { Button } from '../components/ui/Button';
import { PlatformSelect } from '../components/ui/Select';
import { useFamilyTreeData } from '../features/family-tree/hooks/useFamilyTree';
import { useAuthStore } from '../stores/authStore';
import axiosClient from '../services/axiosClient';

export default function FamilyTree() {
  const [scale, setScale] = useState(0.85);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [graftState, setGraftState] = useState<{ targetId: string; type: 'PARENT_OF' | 'CHILD_OF' | 'SPOUSE_OF' } | null>(null);
  const [graftMode, setGraftMode] = useState<'create' | 'link'>('create');
  const [graftExistingId, setGraftExistingId] = useState('');

  const [isEditingPerson, setIsEditingPerson] = useState(false);
  const [editPersonForm, setEditPersonForm] = useState({ name: '', role: '', birthYear: '', deathYear: '', biography: '' });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [shouldRemoveAvatar, setShouldRemoveAvatar] = useState(false);

  const [isSafeDeleteOpen, setIsSafeDeleteOpen] = useState(false);
  const [reparentId, setReparentId] = useState('__sever__');

  const isDragging = useRef(false);
  const lastX = useRef(0);
  const lastY = useRef(0);

  const lastTouchX = useRef(0);
  const lastTouchY = useRef(0);
  const lastTouchDistance = useRef<number | null>(null);

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: treeData } = useFamilyTreeData();
  const currentUser = useAuthStore(s => s.currentUser);
  const canContribute = currentUser?.role === 'ADMIN' || currentUser?.role === 'CONTRIBUTOR';

  const nodes = treeData?.nodes || [];
  const edges = treeData?.edges || [];
  const selectedNode = nodes.find((n: any) => n.id === selectedNodeId);

  const reparentOptions = nodes.filter((n: any) => n.id !== selectedNodeId);
  const graftExistingOptions = nodes.filter((n: any) => n.id !== graftState?.targetId);

  const resetView = () => {
    setScale(window.innerWidth < 640 ? 0.65 : 0.85);
    setOffsetX(0);
    setOffsetY(0);
  };

  const updatePersonMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const vaultId = useAuthStore.getState().activeVaultId;
      await axiosClient.patch(`/vaults/${vaultId}/lineage/person/${selectedNodeId}/`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['familyTree'] });
      setIsEditingPerson(false);
      setAvatarFile(null);
      setAvatarPreviewUrl(null);
      setShouldRemoveAvatar(false);
    }
  });

  const graftMutation = useMutation({
    mutationFn: async (payload: any) => {
      const vaultId = useAuthStore.getState().activeVaultId;
      await axiosClient.post(`/vaults/${vaultId}/lineage/graft/`, payload);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['familyTree'] })
  });

  const deletePersonMutation = useMutation({
    mutationFn: async (payload: any) => {
      const vaultId = useAuthStore.getState().activeVaultId;
      await axiosClient.delete(`/vaults/${vaultId}/lineage/person/${selectedNodeId}/`, { data: payload });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['familyTree'] });
      setSelectedNodeId(null);
      setIsSafeDeleteOpen(false);
      setReparentId('__sever__');
    }
  });

  const handleAction = () => {
    if (selectedNode) navigate({ to: `/person/${selectedNode.id}` });
  };

  const startEditPerson = () => {
    if (!selectedNode) return;
    setEditPersonForm({
      name: selectedNode.name || '',
      role: selectedNode.role || '',
      birthYear: selectedNode.birthYear || '',
      deathYear: selectedNode.deathYear || '',
      biography: selectedNode.biography || '',
    });
    setAvatarFile(null);
    setAvatarPreviewUrl(selectedNode.photo || null);
    setShouldRemoveAvatar(false);
    setIsEditingPerson(true);
  };

  const handleUpdatePerson = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('name', editPersonForm.name);
    fd.append('role', editPersonForm.role);
    fd.append('birthYear', editPersonForm.birthYear);
    fd.append('deathYear', editPersonForm.deathYear);
    fd.append('biography', editPersonForm.biography);
    if (avatarFile) fd.append('avatar', avatarFile);
    if (shouldRemoveAvatar) fd.append('avatarRemove', 'true');

    await sileo.promise(updatePersonMutation.mutateAsync(fd), {
      loading: { title: 'Updating Identity...' },
      success: { title: 'Identity Preserved' },
      error: { title: 'Update Failed' }
    });
  };

  const handleAvatarChange = (file: File | null) => {
    setAvatarFile(file);
    setShouldRemoveAvatar(false);
    setAvatarPreviewUrl(file ? URL.createObjectURL(file) : selectedNode?.photo || null);
  };

  const handleAvatarRemove = () => {
    setAvatarFile(null);
    setShouldRemoveAvatar(true);
    setAvatarPreviewUrl(null);
  };

  const openSafeDelete = () => {
    setIsSafeDeleteOpen(true);
  };

  const confirmSafeDelete = async () => {
    await sileo.promise(deletePersonMutation.mutateAsync({ reparentId: reparentId === '__sever__' ? null : reparentId }), {
      loading: { title: 'Removing Relative...' },
      success: { title: 'Removed' },
      error: { title: 'Remove Failed' }
    });
  };

  const submitGraft = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    const name = String(form.get('name') || '').trim();
    const role = String(form.get('role') || '').trim();
    const birthYear = String(form.get('birthYear') || '').trim();
    const deathYear = String(form.get('deathYear') || '').trim();

    if (!graftState) return;
    if (graftMode === 'link' && !graftExistingId) {
      sileo.error({ title: 'Choose Existing Relative', description: 'Select a person to link to this node.' });
      return;
    }

    await sileo.promise(
      graftMutation.mutateAsync({
        targetId: graftState.targetId,
        relationshipType: graftState.type,
        ...(graftMode === 'link'
          ? { existingPersonId: graftExistingId }
          : { name, role, birthYear, deathYear }),
      }),
      {
        loading: { title: 'Grafting...' },
        success: { title: 'Branch Added' },
        error: { title: 'Graft Failed' },
      }
    );

    setGraftState(null);
    setGraftMode('create');
    setGraftExistingId('');
  };

  const onMouseDown = (e: ReactMouseEvent) => {
    isDragging.current = true;
    lastX.current = e.clientX;
    lastY.current = e.clientY;
  };

  const onMouseMove = (e: ReactMouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastX.current;
    const dy = e.clientY - lastY.current;
    lastX.current = e.clientX;
    lastY.current = e.clientY;
    setOffsetX(v => v + dx);
    setOffsetY(v => v + dy);
  };

  const onMouseUp = () => {
    isDragging.current = false;
  };

  const getTouchDistance = (touches: ReactTouchEvent<HTMLDivElement>['touches']) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const onTouchStart = (e: ReactTouchEvent) => {
    if (e.touches.length === 1) {
      lastTouchX.current = e.touches[0].clientX;
      lastTouchY.current = e.touches[0].clientY;
    }
    if (e.touches.length === 2) {
      lastTouchDistance.current = getTouchDistance(e.touches);
    }
  };

  const onTouchMove = (e: ReactTouchEvent) => {
    e.preventDefault();

    if (e.touches.length === 1) {
      const dx = e.touches[0].clientX - lastTouchX.current;
      const dy = e.touches[0].clientY - lastTouchY.current;
      lastTouchX.current = e.touches[0].clientX;
      lastTouchY.current = e.touches[0].clientY;
      setOffsetX(v => v + dx);
      setOffsetY(v => v + dy);
    }

    if (e.touches.length === 2) {
      const dist = getTouchDistance(e.touches);
      if (lastTouchDistance.current) {
        const delta = dist - lastTouchDistance.current;
        setScale(s => {
          const next = s + delta * 0.0012;
          return Math.min(1.4, Math.max(0.45, next));
        });
      }
      lastTouchDistance.current = dist;
    }
  };

  const onTouchEnd = () => {
    lastTouchDistance.current = null;
  };

  // Keyboard: esc closes modals
  useEffect(() => {
    resetView();

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setGraftState(null);
        setGraftMode('create');
        setGraftExistingId('');
        setIsEditingPerson(false);
        setIsSafeDeleteOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  return (
    <div className="relative h-full min-h-[100svh] w-full overflow-hidden bg-[var(--clr-parchment)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(232,223,203,1),rgba(247,244,239,0.9)_42%,rgba(219,207,181,0.92)),radial-gradient(circle_at_18%_18%,rgba(212,169,106,0.26),transparent_30%),radial-gradient(circle_at_84%_72%,rgba(154,115,64,0.16),transparent_34%)]" />
        <div className="absolute inset-0 opacity-[0.18] [background-image:url('data:image/svg+xml,%3Csvg_viewBox=%220_0_200_200%22_xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter_id=%22noise%22%3E%3CfeTurbulence_type=%22fractalNoise%22_baseFrequency=%220.85%22_numOctaves=%224%22_stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect_width=%22100%25%22_height=%22100%25%22_filter=%22url(%23noise)%22_opacity=%220.42%22/%3E%3C/svg%3E')]" />
        <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(154,115,64,0.22)_1px,transparent_1px),linear-gradient(90deg,rgba(154,115,64,0.18)_1px,transparent_1px)] [background-size:64px_64px]" />
        <motion.div
          className="absolute left-[8%] top-[18%] h-40 w-40 rounded-full border border-[rgba(184,143,91,0.24)]"
          animate={{ y: [0, -12, 0], rotate: [0, 8, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-[14%] right-[10%] h-56 w-56 rounded-full border border-[rgba(74,124,89,0.16)]"
          animate={{ y: [0, 14, 0], rotate: [0, -10, 0] }}
          transition={{ duration: 19, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-[88px] z-40 flex flex-col gap-3 px-3 sm:top-[96px] sm:flex-row sm:items-start sm:justify-between sm:px-[clamp(20px,4vw,40px)]">
        <div className="pointer-events-auto flex max-w-full gap-2 overflow-x-auto rounded-[var(--radius-lg)] border border-[rgba(154,115,64,0.34)] bg-[rgba(232,223,203,0.92)] p-2 shadow-[0_12px_32px_rgba(20,18,17,0.14)] backdrop-blur-md">
          <Button variant={isEditMode ? 'primary' : 'ghost'} onClick={() => setIsEditMode(v => !v)} className="shrink-0 px-4 py-2 text-[10px] sm:px-[32px] sm:py-[14px]">
          <PencilSimple size={18} /> {isEditMode ? 'Edit Mode' : 'View Mode'}
          </Button>
          <Button variant="ghost" onClick={resetView} className="shrink-0 px-4 py-2 text-[10px] sm:px-[31px] sm:py-[13px]"><ArrowsOut size={18} /> Reset</Button>
        </div>

        <div className="pointer-events-auto flex self-end gap-2 rounded-[var(--radius-lg)] border border-[rgba(154,115,64,0.34)] bg-[rgba(232,223,203,0.92)] p-2 shadow-[0_12px_32px_rgba(20,18,17,0.14)] backdrop-blur-md sm:self-auto">
          <Button variant="icon" aria-label="Zoom in" onClick={() => setScale(s => Math.min(1.4, s + 0.08))}><MagnifyingGlassPlus size={18} /></Button>
          <Button variant="icon" aria-label="Zoom out" onClick={() => setScale(s => Math.max(0.45, s - 0.08))}><MagnifyingGlassMinus size={18} /></Button>
        </div>
      </div>

      {/* Canvas wrapper (pan/zoom) */}
      <div
        className="absolute inset-0 cursor-grab active:cursor-grabbing touch-none"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {nodes.length > 0 ? (
          <TreeCanvas
            nodes={nodes}
            edges={edges}
            onNodeClick={setSelectedNodeId}
            selectedNodeId={selectedNodeId}
            isEditMode={isEditMode}
            onAddRelative={(targetId, relationshipType) => setGraftState({ targetId, type: relationshipType })}
            scale={scale}
            offsetX={offsetX}
            offsetY={offsetY}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center px-6 pt-24 text-center">
            <div className="max-w-md rounded-[var(--radius-lg)] border border-[var(--clr-aged)] bg-[rgba(247,244,239,0.88)] p-6 shadow-[var(--shadow-md)] backdrop-blur-md">
              <h2 className="font-display text-2xl font-bold uppercase tracking-widest text-[var(--clr-ink)]">No Relatives Yet</h2>
              <p className="mt-3 font-ui text-sm leading-relaxed text-[var(--clr-dust)]">
                Add a first relative from edit mode to start building this vault's lineage.
              </p>
              {canContribute && (
                <Button variant="primary" className="mt-5 w-full px-4 py-3 text-[10px]" onClick={() => setGraftState({ targetId: '', type: 'CHILD_OF' })}>
                  <PencilSimple size={16} /> Add First Relative
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Selection panel */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute inset-x-3 bottom-24 z-30 mx-auto max-h-[calc(100svh-190px)] w-auto max-w-[380px] overflow-y-auto bg-[rgba(247,244,239,0.94)] border border-[var(--clr-aged)] rounded-[var(--radius-lg)] shadow-2xl backdrop-blur-md sm:inset-x-auto sm:bottom-6 sm:right-6 sm:max-h-[calc(100svh-160px)] sm:w-[360px]"
          >
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 gap-3 items-center">
                  <div className="h-14 w-14 shrink-0 rounded-full overflow-hidden border-2 border-[var(--clr-gold)] bg-[var(--clr-paper)] flex items-center justify-center">
                    {selectedNode.photo ? (
                      <img src={selectedNode.photo} className="w-full h-full object-cover" draggable={false} />
                    ) : (
                      <ImageIcon size={24} className="text-[var(--clr-gold)]" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="break-words font-display text-xl leading-tight tracking-wide">{selectedNode.name}</h3>
                    <p className="mt-1 break-words font-ui text-[10px] uppercase tracking-widest text-[var(--clr-dust)]">{selectedNode.role}</p>
                  </div>
                </div>

                <button onClick={() => setSelectedNodeId(null)} className="text-[var(--clr-dust)] hover:text-[var(--clr-ink)]">
                  <X size={18} />
                </button>
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button variant="primary" onClick={handleAction} className="flex-1 px-4 py-3 text-[10px]"><IdentificationCard size={16} /> Profile</Button>
                {canContribute && (
                  <Button variant="ghost" onClick={startEditPerson} className="px-4 py-3 text-[10px]"><PencilSimple size={16} /> Edit</Button>
                )}
              </div>

              {canContribute && (
                <div className="mt-3">
                  <Button variant="danger" onClick={openSafeDelete} className="w-full"><Trash size={16} /> Remove</Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit person modal */}
      <AnimatePresence>
        {isEditingPerson && selectedNode && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto p-3 sm:p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsEditingPerson(false)} />
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} className="relative my-auto max-h-[calc(100svh-24px)] w-full max-w-xl overflow-y-auto bg-[var(--clr-parchment)] border border-[rgba(184,143,91,0.4)] rounded-[var(--radius-lg)] p-5 shadow-2xl sm:max-h-[calc(100svh-48px)] sm:p-8">
              <h2 className="font-display text-xl uppercase tracking-widest text-[var(--clr-ink)] mb-5 text-center sm:text-2xl sm:mb-6">Edit Identity</h2>

              <form onSubmit={handleUpdatePerson} className="space-y-4">
                <div className="flex flex-col items-center gap-3 pb-2">
                  <label className="group relative h-28 w-28 cursor-pointer overflow-hidden rounded-full border-2 border-[var(--clr-gold)] bg-[var(--clr-paper)] shadow-[var(--shadow-md)] transition-transform hover:scale-105 hover:shadow-[var(--shadow-gold)]">
                    {avatarPreviewUrl ? (
                      <img src={avatarPreviewUrl} alt={`${selectedNode.name} avatar preview`} className="h-full w-full object-cover" draggable={false} />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[var(--clr-gold)]">
                        <ImageIcon size={34} />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-[rgba(20,18,17,0.62)] opacity-0 transition-opacity group-hover:opacity-100">
                      <span className="font-ui text-[10px] font-black uppercase tracking-widest text-white">Change</span>
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleAvatarChange(e.target.files?.[0] || null)} />
                  </label>
                  {(avatarPreviewUrl || avatarFile) && (
                    <button
                      type="button"
                      onClick={handleAvatarRemove}
                      className="rounded-full border border-[rgba(139,58,58,0.35)] px-4 py-1.5 font-ui text-[10px] font-black uppercase tracking-widest text-[var(--clr-danger)] transition-colors hover:bg-[var(--clr-danger)] hover:text-white"
                    >
                      Remove Avatar
                    </button>
                  )}
                </div>

                <div>
                  <label className="font-ui text-[9px] uppercase tracking-[0.2em] text-[var(--clr-dust)] font-bold mb-1.5 block">Full Name</label>
                  <input type="text" value={editPersonForm.name} onChange={e => setEditPersonForm({ ...editPersonForm, name: e.target.value })} className="w-full bg-[var(--clr-linen)] border border-[var(--clr-aged)] rounded-full px-5 py-3 font-ui text-[14px] text-[var(--clr-ink)] outline-none focus:border-[var(--clr-gold)] focus:shadow-[0_0_0_3px_rgba(184,143,91,0.16)]" required />
                </div>
                <div>
                  <label className="font-ui text-[9px] uppercase tracking-[0.2em] text-[var(--clr-dust)] font-bold mb-1.5 block">Role</label>
                  <input type="text" value={editPersonForm.role} onChange={e => setEditPersonForm({ ...editPersonForm, role: e.target.value })} className="w-full bg-[var(--clr-linen)] border border-[var(--clr-aged)] rounded-full px-5 py-3 font-ui text-[14px] text-[var(--clr-ink)] outline-none focus:border-[var(--clr-gold)] focus:shadow-[0_0_0_3px_rgba(184,143,91,0.16)]" required />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="font-ui text-[9px] uppercase tracking-[0.2em] text-[var(--clr-dust)] font-bold mb-1.5 block">Birth Year</label>
                    <input type="text" value={editPersonForm.birthYear} onChange={e => setEditPersonForm({ ...editPersonForm, birthYear: e.target.value })} className="w-full bg-[var(--clr-linen)] border border-[var(--clr-aged)] rounded-full px-5 py-3 font-ui text-[14px] text-[var(--clr-ink)] outline-none focus:border-[var(--clr-gold)] focus:shadow-[0_0_0_3px_rgba(184,143,91,0.16)]" />
                  </div>
                  <div>
                    <label className="font-ui text-[9px] uppercase tracking-[0.2em] text-[var(--clr-dust)] font-bold mb-1.5 block">Death Year</label>
                    <input type="text" value={editPersonForm.deathYear} onChange={e => setEditPersonForm({ ...editPersonForm, deathYear: e.target.value })} className="w-full bg-[var(--clr-linen)] border border-[var(--clr-aged)] rounded-full px-5 py-3 font-ui text-[14px] text-[var(--clr-ink)] outline-none focus:border-[var(--clr-gold)] focus:shadow-[0_0_0_3px_rgba(184,143,91,0.16)]" />
                  </div>
                </div>

                <div>
                  <label className="font-ui text-[9px] uppercase tracking-[0.2em] text-[var(--clr-dust)] font-bold mb-1.5 block">Biography</label>
                  <textarea value={editPersonForm.biography} onChange={e => setEditPersonForm({ ...editPersonForm, biography: e.target.value })} className="w-full min-h-[110px] bg-[var(--clr-linen)] border border-[var(--clr-aged)] rounded-[var(--radius-lg)] px-5 py-3 font-ui text-[14px] text-[var(--clr-ink)] outline-none focus:border-[var(--clr-gold)] focus:shadow-[0_0_0_3px_rgba(184,143,91,0.16)]" />
                </div>

                <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                  <Button variant="ghost" type="button" onClick={() => setIsEditingPerson(false)} className="flex-1 py-3 text-[10px] text-[var(--clr-gold-dark)]">Cancel</Button>
                  <Button variant="primary" type="submit" disabled={updatePersonMutation.isPending} className="flex-1 py-3 text-[10px] !text-[var(--clr-charcoal)]">
                    {updatePersonMutation.isPending ? <Spinner className="animate-spin" size={16} /> : <Check size={16} />} Save
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Multi-Directional Grafting Modal */}
      <AnimatePresence>
        {graftState && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto p-3 sm:p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setGraftState(null); setGraftMode('create'); setGraftExistingId(''); }} />
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} className="relative my-auto max-h-[calc(100svh-24px)] w-full max-w-lg overflow-y-auto bg-[var(--clr-parchment)] border-2 border-[var(--clr-gold)] rounded-[var(--radius-lg)] p-5 shadow-2xl sm:max-h-[calc(100svh-48px)] sm:p-10">
              <h2 className="font-display text-xl uppercase tracking-widest mb-5 text-[var(--clr-ink)] sm:text-2xl sm:mb-6">Graft Relative</h2>
              <p className="font-ui text-[10px] uppercase tracking-widest text-[var(--clr-gold-dark)] mb-4 font-bold">Fusing as {graftState.type.replace('_', ' ')}</p>

              <div className="mb-5 grid grid-cols-2 rounded-full border border-[var(--clr-aged)] bg-[var(--clr-linen)] p-1">
                <button
                  type="button"
                  onClick={() => setGraftMode('create')}
                  className={`rounded-full px-4 py-2 font-ui text-[10px] font-black uppercase tracking-widest transition-colors ${graftMode === 'create' ? 'bg-[var(--clr-gold)] text-[var(--clr-charcoal)]' : 'text-[var(--clr-dust)] hover:text-[var(--clr-ink)]'}`}
                >
                  New Node
                </button>
                <button
                  type="button"
                  onClick={() => setGraftMode('link')}
                  className={`rounded-full px-4 py-2 font-ui text-[10px] font-black uppercase tracking-widest transition-colors ${graftMode === 'link' ? 'bg-[var(--clr-gold)] text-[var(--clr-charcoal)]' : 'text-[var(--clr-dust)] hover:text-[var(--clr-ink)]'}`}
                >
                  Existing
                </button>
              </div>

              <form onSubmit={submitGraft} className="space-y-4">
                {graftMode === 'link' ? (
                  <PlatformSelect
                    value={graftExistingId}
                    onValueChange={setGraftExistingId}
                    placeholder="Choose existing relative"
                    options={graftExistingOptions.map((person: any) => ({
                      value: person.id,
                      label: `${person.name}${person.role ? ` - ${person.role}` : ''}`,
                    }))}
                  />
                ) : (
                  <>
                    <input required type="text" name="name" placeholder="Full Legal Name" className="w-full bg-[var(--clr-linen)] border border-[var(--clr-aged)] rounded-full px-6 py-4 outline-none focus:border-[var(--clr-gold)]" />
                    <input type="text" name="role" placeholder="Curator Identity Role (e.g. Scholar, Matriarch)" className="w-full bg-[var(--clr-linen)] border border-[var(--clr-aged)] rounded-full px-6 py-4 outline-none focus:border-[var(--clr-gold)]" />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <input type="text" name="birthYear" placeholder="Birth Year (e.g. 1962)" className="w-full bg-[var(--clr-linen)] border border-[var(--clr-aged)] rounded-full px-6 py-4 outline-none focus:border-[var(--clr-gold)]" />
                      <input type="text" name="deathYear" placeholder="Death Year (Optional)" className="w-full bg-[var(--clr-linen)] border border-[var(--clr-aged)] rounded-full px-6 py-4 outline-none focus:border-[var(--clr-gold)]" />
                    </div>
                  </>
                )}
                <Button variant="primary" type="submit" className="w-full mt-4" disabled={graftMutation.isPending || (graftMode === 'link' && !graftExistingId)}>
                  {graftMutation.isPending ? 'PLANTING...' : graftMode === 'link' ? 'CONFIRM LINK' : 'CONFIRM ADDITION'}
                </Button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Safe Deletion Orphan Protection Modal */}
      <AnimatePresence>
        {isSafeDeleteOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto p-3 sm:p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsSafeDeleteOpen(false)} />
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} className="relative my-auto max-h-[calc(100svh-24px)] w-full max-w-lg overflow-y-auto bg-[var(--clr-parchment)] border-2 border-[var(--clr-danger)] rounded-[var(--radius-lg)] p-5 shadow-2xl sm:max-h-[calc(100svh-48px)] sm:p-10">
              <h2 className="font-display text-xl uppercase tracking-widest mb-4 text-[var(--clr-danger)] sm:text-2xl">Protect Orphaned Branches</h2>
              <p className="font-ui text-xs text-[var(--clr-dust)] leading-relaxed mb-6">
                Removing <strong>{selectedNode?.name}</strong> leaves descending lineage fragments with no parental node. Choose a parental delegation route below.
              </p>
              <div className="space-y-4">
                <PlatformSelect
                  value={reparentId}
                  onValueChange={setReparentId}
                  className="w-full bg-[var(--clr-linen)] border border-[var(--clr-aged)] rounded-full px-6 py-4 outline-none focus:border-[var(--clr-gold)] text-sm"
                  options={[
                    { value: '__sever__', label: 'Sever lineage permanently (create isolated nodes)' },
                    ...reparentOptions.map((p: any) => ({ value: p.id, label: `Delegate children to: ${p.name}` })),
                  ]}
                />

                <div className="flex flex-col gap-3 pt-4 sm:flex-row">
                  <Button variant="ghost" onClick={() => setIsSafeDeleteOpen(false)} className="flex-1 text-xs">Cancel</Button>
                  <Button variant="danger" onClick={confirmSafeDelete} className="flex-1 text-xs">Remove & Re-route</Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
