import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Image as ImageIcon, PencilSimple, Trash, Check } from '@phosphor-icons/react';
import { useNavigate } from '@tanstack/react-router';
import { sileo } from 'sileo';
import { TreeCanvas } from '../features/family-tree/TreeCanvas';
import { Button } from '../components/ui/Button';
import { useFamilyTreeData, useGraftBranch } from '../features/family-tree/hooks/useFamilyTree';
import { useAuthStore } from '../stores/authStore';
import axiosClient from '../services/axiosClient';
import { useQueryClient, useMutation } from '@tanstack/react-query';

function TreeBackground() {
  const [mounted, setMounted] = useState(false);
  useState(() => setMounted(true));

  if (!mounted) return null;

  const particles = Array.from({ length: 60 });

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      <div className="absolute w-[1000px] h-[1000px] bg-[var(--clr-gold)] rounded-full blur-[150px] opacity-[0.06] animate-pulse top-[-20%] left-[-10%]" />
      <div className="absolute w-[800px] h-[800px] bg-[#4A7C59] rounded-full blur-[150px] opacity-[0.04] animate-pulse top-[50%] right-[-20%]" style={{ animationDelay: '2s' }} />

      {particles.map((_, i) => {
        const size = Math.random() * 3 + 1;
        return (
          <motion.div
            key={i}
            className="absolute rounded-full bg-[var(--clr-gold)] shadow-[0_0_8px_var(--clr-gold)]"
            style={{ width: size, height: size }}
            initial={{
              x: `${Math.random() * 100}vw`,
              y: `${Math.random() * 100}vh`,
              opacity: 0,
              scale: Math.random() * 0.5 + 0.5,
            }}
            animate={{
              y: [null, `${Math.random() * 100}vh`],
              x: [null, `${Math.random() * 100}vw`],
              opacity: [0, Math.random() * 0.6 + 0.2, 0],
            }}
            transition={{
              duration: Math.random() * 40 + 20,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        );
      })}
    </div>
  );
}

export default function FamilyTree() {
  const [scale] = useState(0.9);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [graftParentId, setGraftParentId] = useState<string | null>(null);
  const [isEditingPerson, setIsEditingPerson] = useState(false);
  const [editPersonForm, setEditPersonForm] = useState({ name: '', role: '', birthYear: '', deathYear: '' });

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: treeData } = useFamilyTreeData();
  const graftMutation = useGraftBranch();
  const currentUser = useAuthStore(s => s.currentUser);
  const canContribute = currentUser?.role === 'ADMIN' || currentUser?.role === 'CONTRIBUTOR';

  const nodes = treeData?.nodes || [];
  const edges = treeData?.edges || [];
  const selectedNode = nodes.find((n: any) => n.id === selectedNodeId);

  const updatePersonMutation = useMutation({
    mutationFn: async (data: any) => {
      const vaultId = useAuthStore.getState().activeVaultId;
      await axiosClient.patch(`/vaults/${vaultId}/lineage/person/${selectedNodeId}/`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['familyTree'] });
      setIsEditingPerson(false);
    }
  });

  const deletePersonMutation = useMutation({
    mutationFn: async () => {
      const vaultId = useAuthStore.getState().activeVaultId;
      await axiosClient.delete(`/vaults/${vaultId}/lineage/person/${selectedNodeId}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['familyTree'] });
      setSelectedNodeId(null);
    }
  });

  const handleAction = () => {
    if (selectedNode) navigate({ to: `/person/${selectedNode.id}` });
  };

  const handleAddRelative = (parentId: string) => {
    setGraftParentId(parentId);
  };

  const startEditPerson = () => {
    if (selectedNode) {
      setEditPersonForm({
        name: selectedNode.name || '',
        role: selectedNode.role || '',
        birthYear: selectedNode.birthYear || '',
        deathYear: selectedNode.deathYear || ''
      });
      setIsEditingPerson(true);
    }
  };

  const handleUpdatePerson = async (e: React.FormEvent) => {
    e.preventDefault();
    await sileo.promise(updatePersonMutation.mutateAsync(editPersonForm), {
      loading: { title: "Updating Identity..." },
      success: { title: "Identity Preserved" },
      error: { title: "Update Failed" }
    });
  };

  const handleDeletePerson = async () => {
    if (confirm("Remove this relative from the lineage? This action cannot be undone.")) {
      await sileo.promise(deletePersonMutation.mutateAsync(), {
        loading: { title: "Removing Relative..." },
        success: { title: "Relative Removed" },
        error: { title: "Deletion Failed" }
      });
    }
  };

  const submitGraft = async (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    await sileo.promise(graftMutation.mutateAsync({
      parentId: graftParentId,
      name: formData.get('name') as string,
      role: formData.get('role') as string,
      birthYear: formData.get('birthYear') as string,
      deathYear: formData.get('deathYear') as string,
    }), {
      loading: { title: "Grafting..." },
      success: () => {
        setGraftParentId(null);
        return { title: "Lineage Rooted", description: "Relative has been added to the tree." };
      },
      error: { title: "Error", description: "Failed to add relative." }
    });
  };

  return (
    <div className="w-screen h-screen bg-[var(--clr-parchment)] relative overflow-hidden flex flex-col zone-light">
      <TreeBackground />

      <div className="absolute top-[120px] left-12 z-20 pointer-events-none">
        <h1 className="font-display font-semibold text-[3rem] text-[var(--clr-ink)] tracking-[0.05em] uppercase leading-none">The Lineage</h1>
      </div>

      <div className="absolute inset-0 z-10 overflow-hidden cursor-grab active:cursor-grabbing">
        <motion.div drag dragConstraints={{ top: -2000, left: -2000, right: 2000, bottom: 2000 }} animate={{ scale }} className="absolute w-[6000px] h-[6000px] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 origin-center bg-black/0">
          {nodes.length > 0 && (
            <TreeCanvas nodes={nodes} edges={edges} onNodeClick={setSelectedNodeId} selectedNodeId={selectedNodeId} isEditMode={isEditMode} onAddRelative={handleAddRelative} />
          )}
        </motion.div>
      </div>

      <div className="absolute bottom-12 left-12 z-20 flex gap-4 pointer-events-auto">
        {canContribute && (
          <button onClick={() => setIsEditMode(!isEditMode)} className={`flex items-center gap-3 px-8 py-4 rounded-full font-ui font-bold text-[11px] uppercase tracking-[0.15em] shadow-xl ${isEditMode ? 'bg-[var(--clr-charcoal)] text-[var(--clr-gold)]' : 'bg-[var(--clr-gold)] text-[var(--clr-charcoal)]'}`}>
            {isEditMode ? <><X size={20} weight="bold" /> Close Registry</> : <><Plus size={20} weight="bold" /> Graft Branch</>}
          </button>
        )}
      </div>

      <AnimatePresence>
        {selectedNode && (
          <motion.div initial={{ x: '100%', opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '100%', opacity: 0 }} className="absolute top-0 right-0 h-full w-[440px] bg-[var(--clr-charcoal)] border-l border-[var(--clr-gold)] z-[60] flex flex-col">
            <div className="flex-1 p-10 overflow-y-auto text-center text-[var(--clr-linen)] mt-20 relative no-scrollbar">
              <button onClick={() => { setSelectedNodeId(null); setIsEditingPerson(false); }} className="absolute top-8 right-8 w-10 h-10 rounded-full border border-[var(--clr-gold)] text-[var(--clr-gold)] flex items-center justify-center hover:bg-[var(--clr-gold)] hover:text-[var(--clr-charcoal)]"><X size={18} weight="bold" /></button>

              {!isEditingPerson ? (
                <>
                  {canContribute && (
                    <button onClick={startEditPerson} className="absolute top-8 left-8 w-10 h-10 rounded-full border border-[var(--clr-aged)] text-[var(--clr-dust)] flex items-center justify-center hover:bg-[var(--clr-paper)] hover:text-[var(--clr-ink)]"><PencilSimple size={18} weight="bold" /></button>
                  )}

                  <h2 className="font-display font-bold text-[2.5rem] uppercase tracking-widest leading-none mb-2">{selectedNode.name}</h2>
                  <p className="font-script text-[40px] text-[var(--clr-gold)] leading-[0.5] mb-8">"{selectedNode.role}"</p>

                  <div className="flex items-center justify-center gap-6 text-[var(--clr-dust)] font-ui text-[12px] uppercase tracking-widest mb-10">
                     <span>{selectedNode.birthYear || '?'}</span>
                     <span className="w-4 h-px bg-[var(--clr-gold)] opacity-50"></span>
                     <span>{selectedNode.deathYear || 'Present'}</span>
                  </div>

                  <div className="space-y-4 w-full mt-10">
                    <Button variant="primary" onClick={handleAction} className="w-full py-4 text-[10px]"><ImageIcon size={18} /> View Exhibition</Button>
                    {canContribute && (
                      <Button variant="danger" onClick={handleDeletePerson} className="w-full py-4 text-[10px]"><Trash size={18} /> Remove Relative</Button>
                    )}
                  </div>
                </>
              ) : (
                <form onSubmit={handleUpdatePerson} className="text-left mt-8 space-y-6">
                  <h3 className="font-display text-2xl uppercase tracking-widest text-[var(--clr-gold)] mb-6 text-center">Edit Identity</h3>
                  <div>
                    <label className="font-ui text-[9px] uppercase tracking-[0.2em] text-[var(--clr-dust)] font-bold mb-1.5 block">Full Name</label>
                    <input type="text" value={editPersonForm.name} onChange={e => setEditPersonForm({...editPersonForm, name: e.target.value})} className="w-full bg-[var(--clr-soot)] border border-[rgba(184,143,91,0.3)] rounded-full px-5 py-3 font-ui text-[14px] text-[var(--clr-linen)] outline-none focus:border-[var(--clr-gold)]" required />
                  </div>
                  <div>
                    <label className="font-ui text-[9px] uppercase tracking-[0.2em] text-[var(--clr-dust)] font-bold mb-1.5 block">Role</label>
                    <input type="text" value={editPersonForm.role} onChange={e => setEditPersonForm({...editPersonForm, role: e.target.value})} className="w-full bg-[var(--clr-soot)] border border-[rgba(184,143,91,0.3)] rounded-full px-5 py-3 font-ui text-[14px] text-[var(--clr-linen)] outline-none focus:border-[var(--clr-gold)]" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="font-ui text-[9px] uppercase tracking-[0.2em] text-[var(--clr-dust)] font-bold mb-1.5 block">Birth Year</label>
                      <input type="text" value={editPersonForm.birthYear} onChange={e => setEditPersonForm({...editPersonForm, birthYear: e.target.value})} className="w-full bg-[var(--clr-soot)] border border-[rgba(184,143,91,0.3)] rounded-full px-5 py-3 font-ui text-[14px] text-[var(--clr-linen)] outline-none focus:border-[var(--clr-gold)]" />
                    </div>
                    <div>
                      <label className="font-ui text-[9px] uppercase tracking-[0.2em] text-[var(--clr-dust)] font-bold mb-1.5 block">Death Year</label>
                      <input type="text" value={editPersonForm.deathYear} onChange={e => setEditPersonForm({...editPersonForm, deathYear: e.target.value})} className="w-full bg-[var(--clr-soot)] border border-[rgba(184,143,91,0.3)] rounded-full px-5 py-3 font-ui text-[14px] text-[var(--clr-linen)] outline-none focus:border-[var(--clr-gold)]" />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-4">
                     <Button variant="ghost" type="button" onClick={() => setIsEditingPerson(false)} className="flex-1 py-3 text-[10px]">Cancel</Button>
                     <Button variant="primary" type="submit" disabled={updatePersonMutation.isPending} className="flex-1 py-3 text-[10px]"><Check size={16} /> Save</Button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {graftParentId && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setGraftParentId(null)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-lg bg-[var(--clr-parchment)] border-2 border-[var(--clr-gold)] rounded-[var(--radius-lg)] p-10 shadow-2xl">
              <h2 className="font-display text-2xl uppercase tracking-widest mb-6 text-[var(--clr-ink)]">Graft New Branch</h2>
              <form onSubmit={submitGraft} className="space-y-4">
                <input required type="text" name="name" placeholder="Full Name" className="w-full bg-[var(--clr-linen)] border border-[var(--clr-aged)] rounded-full px-6 py-4 outline-none focus:border-[var(--clr-gold)]" />
                <input required type="text" name="role" placeholder="Role (e.g. Uncle, Daughter)" className="w-full bg-[var(--clr-linen)] border border-[var(--clr-aged)] rounded-full px-6 py-4 outline-none focus:border-[var(--clr-gold)]" />
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" name="birthYear" placeholder="Birth Year (e.g. 1962)" className="w-full bg-[var(--clr-linen)] border border-[var(--clr-aged)] rounded-full px-6 py-4 outline-none focus:border-[var(--clr-gold)]" />
                  <input type="text" name="deathYear" placeholder="Death Year (Optional)" className="w-full bg-[var(--clr-linen)] border border-[var(--clr-aged)] rounded-full px-6 py-4 outline-none focus:border-[var(--clr-gold)]" />
                </div>
                <Button variant="primary" type="submit" className="w-full mt-4" disabled={graftMutation.isPending}>
                  {graftMutation.isPending ? 'PLANTING...' : 'CONFIRM ADDITION'}
                </Button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}