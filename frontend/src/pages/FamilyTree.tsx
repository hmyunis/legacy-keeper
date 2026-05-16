import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Image as ImageIcon } from '@phosphor-icons/react';
import { useNavigate } from '@tanstack/react-router';
import { sileo } from 'sileo';
import { TreeCanvas } from '../features/family-tree/TreeCanvas';
import { Button } from '../components/ui/Button';
import { useFamilyTreeData, useGraftBranch } from '../features/family-tree/hooks/useFamilyTree';

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
  const navigate = useNavigate();

  const { data: treeData } = useFamilyTreeData();
  const graftMutation = useGraftBranch();

  const nodes = treeData?.nodes || [];
  const edges = treeData?.edges || [];
  const selectedNode = nodes.find((n: any) => n.id === selectedNodeId);

  const handleAction = () => {
    if (selectedNode) navigate({ to: `/person/${selectedNode.id}` });
  };

  const handleAddRelative = (parentId: string) => {
    const name = prompt("Enter new relative's name:");
    if (!name) return;
    sileo.promise(graftMutation.mutateAsync({ parentId, name, role: 'Kin' }), {
      loading: { title: "Grafting..." },
      success: { title: "Lineage Rooted", description: `${name} has been added to the family tree.` },
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
        <button onClick={() => setIsEditMode(!isEditMode)} className={`flex items-center gap-3 px-8 py-4 rounded-full font-ui font-bold text-[11px] uppercase tracking-[0.15em] shadow-xl ${isEditMode ? 'bg-[var(--clr-charcoal)] text-[var(--clr-gold)]' : 'bg-[var(--clr-gold)] text-[var(--clr-charcoal)]'}`}>
          {isEditMode ? <><X size={20} weight="bold" /> Close Registry</> : <><Plus size={20} weight="bold" /> Graft Branch</>}
        </button>
      </div>

      <AnimatePresence>
        {selectedNode && (
          <motion.div initial={{ x: '100%', opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '100%', opacity: 0 }} className="absolute top-0 right-0 h-full w-[440px] bg-[var(--clr-charcoal)] border-l border-[var(--clr-gold)] z-[60] flex flex-col">
            <div className="flex-1 p-10 overflow-y-auto text-center text-[var(--clr-linen)] mt-20">
              <button onClick={() => setSelectedNodeId(null)} className="absolute top-8 right-8 w-10 h-10 rounded-full border border-[var(--clr-gold)] text-[var(--clr-gold)] flex items-center justify-center hover:bg-[var(--clr-gold)] hover:text-[var(--clr-charcoal)]"><X size={18} weight="bold" /></button>
              <h2 className="font-display font-bold text-[2.5rem] uppercase tracking-widest leading-none mb-2">{selectedNode.name}</h2>
              <p className="font-script text-[40px] text-[var(--clr-gold)] leading-[0.5] mb-8">"{selectedNode.role}"</p>
              <div className="space-y-4 w-full mt-10">
                <Button variant="primary" onClick={handleAction} className="w-full py-4 text-[10px]"><ImageIcon size={18} /> View Exhibition</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}