import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MagnifyingGlassPlus, MagnifyingGlassMinus, CornersOut, Plus, X, MagicWand, Image as ImageIcon, User, TreeStructure } from '@phosphor-icons/react';
import { useNavigate } from '@tanstack/react-router';
import { sileo } from 'sileo';

import { TreeCanvas } from '../components/TreeCanvas';
import { Button } from '../../../components/ui/Button';
import { useFamilyTreeData } from '../hooks/useFamilyTree';

function TreeBackground() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  const particles = Array.from({ length: 60 });
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      <div className="absolute w-[1000px] h-[1000px] bg-[var(--clr-gold)] rounded-full blur-[150px] opacity-[0.06] animate-pulse top-[-20%] left-[-10%]" />
      <div className="absolute w-[800px] h-[800px] bg-[#4A7C59] rounded-full blur-[150px] opacity-[0.04] animate-pulse top-[50%] right-[-20%]" style={{ animationDelay: '2s' }} />
      {particles.map((_, i) => {
        const size = Math.random() * 3 + 1;
        return (
          <motion.div key={i} className="absolute rounded-full bg-[var(--clr-gold)] shadow-[0_0_8px_var(--clr-gold)]" style={{ width: size, height: size }} initial={{ x: `${Math.random() * 100}vw`, y: `${Math.random() * 100}vh`, opacity: 0, scale: Math.random() * 0.5 + 0.5 }} animate={{ y: [null, `${Math.random() * 100}vh`], x: [null, `${Math.random() * 100}vw`], opacity: [0, Math.random() * 0.6 + 0.2, 0] }} transition={{ duration: Math.random() * 40 + 20, repeat: Infinity, ease: "linear" }} />
        );
      })}
    </div>
  );
}

export default function FamilyTreePage() {
  const { data: { nodes, edges } } = useFamilyTreeData();

  const [scale, setScale] = useState(0.9);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const navigate = useNavigate();

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  const handleAction = () => {
    if (selectedNode) navigate({ to: `/person/${selectedNode.id}` });
  };

  const handleAddRelative = (parentId: string) => {
    sileo.info({ title: "Preparing Lineage Registry", description: `Adding a new descendant for ${nodes.find(n => n.id === parentId)?.name || 'the family'}.` });
  };

  return (
    <div className="w-screen h-screen bg-[var(--clr-parchment)] relative overflow-hidden flex flex-col zone-light">
      <TreeBackground />

      <div aria-hidden className="lineage-tree-watermark absolute inset-0 pointer-events-none z-[1] flex items-center justify-center opacity-[0.055]">
        <svg viewBox="0 0 640 720" className="w-[min(92vw,720px)] h-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="320" cy="680" rx="220" ry="28" stroke="var(--clr-gold)" strokeWidth="1.2" opacity="0.5" />
          <path d="M320 680 V420 Q320 280 300 200 Q280 120 320 48" stroke="var(--clr-ink)" strokeWidth="3" strokeLinecap="round" />
          <path d="M300 200 Q220 168 148 148 Q76 128 40 118" stroke="var(--clr-ink)" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M300 200 Q400 168 472 148 Q544 128 600 118" stroke="var(--clr-ink)" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M320 320 Q248 288 188 268 Q128 248 88 238" stroke="var(--clr-ink)" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M320 320 Q392 288 452 268 Q512 248 552 238" stroke="var(--clr-ink)" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M320 420 Q260 400 210 388 Q160 376 120 368" stroke="var(--clr-ink)" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M320 420 Q380 400 430 388 Q480 376 520 368" stroke="var(--clr-ink)" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M320 520 Q280 508 248 500 M320 520 Q360 508 392 500" stroke="var(--clr-gold-dark)" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
          <circle cx="320" cy="48" r="18" stroke="var(--clr-gold)" strokeWidth="2" />
          <circle cx="148" cy="148" r="10" stroke="var(--clr-gold)" strokeWidth="1.5" />
          <circle cx="472" cy="148" r="10" stroke="var(--clr-gold)" strokeWidth="1.5" />
          <circle cx="188" cy="268" r="8" stroke="var(--clr-gold)" strokeWidth="1.2" />
          <circle cx="452" cy="268" r="8" stroke="var(--clr-gold)" strokeWidth="1.2" />
          <circle cx="210" cy="388" r="6" stroke="var(--clr-gold)" strokeWidth="1" />
          <circle cx="430" cy="388" r="6" stroke="var(--clr-gold)" strokeWidth="1" />
          <path d="M248 118 Q320 90 392 118" stroke="var(--clr-gold)" strokeWidth="1" strokeDasharray="4 6" opacity="0.6" />
        </svg>
      </div>

      <div className="absolute top-[120px] left-12 z-20 pointer-events-none">
        <h1 className="font-display font-semibold text-[3rem] text-[var(--clr-ink)] tracking-[0.05em] uppercase drop-shadow-md leading-none">The Lineage</h1>
        <p className="font-script text-[48px] text-[var(--clr-gold)] leading-[0.6] drop-shadow-md">"Roots and branches"</p>
        {isEditMode && (
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="mt-8 flex items-center gap-3 bg-[var(--clr-gold)] text-white px-5 py-2 rounded-full shadow-lg">
             <MagicWand size={20} weight="fill" />
             <span className="font-ui text-[10px] font-bold uppercase tracking-widest">Expansion Mode Active</span>
          </motion.div>
        )}
      </div>

      <div className="absolute inset-0 z-10 overflow-hidden cursor-grab active:cursor-grabbing">
        <motion.div drag dragConstraints={{ top: -2000, left: -2000, right: 2000, bottom: 2000 }} dragElastic={0.3} animate={{ scale }} className="absolute w-[6000px] h-[6000px] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 origin-center bg-black/0">
          <TreeCanvas nodes={nodes} edges={edges} onNodeClick={setSelectedNodeId} selectedNodeId={selectedNodeId} isEditMode={isEditMode} onAddRelative={handleAddRelative} />
        </motion.div>
      </div>

      <div className="absolute bottom-12 left-12 z-20 flex gap-4 pointer-events-auto">
        <button onClick={() => { setIsEditMode(!isEditMode); sileo.info({ title: isEditMode ? "Lineage locked" : "Grafting points revealed", icon: isEditMode ? <X /> : <TreeStructure weight="fill" /> }); }} className={`flex items-center gap-3 px-8 py-4 rounded-full font-ui font-bold text-[11px] uppercase tracking-[0.15em] shadow-xl transition-all ${isEditMode ? 'bg-[var(--clr-charcoal)] text-[var(--clr-gold)]' : 'bg-[var(--clr-gold)] text-[var(--clr-charcoal)] hover:bg-[var(--clr-gold-light)]'}`}>
          {isEditMode ? <><X size={20} weight="bold" /> Close Registry</> : <><Plus size={20} weight="bold" /> Graft Branch</>}
        </button>
      </div>

      <div className="absolute bottom-12 right-12 z-20 flex flex-col gap-3 pointer-events-auto">
        <button onClick={() => setScale(s => Math.min(s + 0.2, 2))} className="w-12 h-12 rounded-full bg-[rgba(247,244,239,0.9)] backdrop-blur-md border border-[var(--clr-aged)] text-[var(--clr-ink)] flex items-center justify-center hover:text-[var(--clr-gold)] hover:border-[var(--clr-gold)] shadow-[var(--shadow-sm)] transition-all"><MagnifyingGlassPlus size={20} weight="bold" /></button>
        <button onClick={() => setScale(s => Math.max(s - 0.2, 0.4))} className="w-12 h-12 rounded-full bg-[rgba(247,244,239,0.9)] backdrop-blur-md border border-[var(--clr-aged)] text-[var(--clr-ink)] flex items-center justify-center hover:text-[var(--clr-gold)] hover:border-[var(--clr-gold)] shadow-[var(--shadow-sm)] transition-all"><MagnifyingGlassMinus size={20} weight="bold" /></button>
        <button onClick={() => setScale(1)} className="w-12 h-12 rounded-full bg-[rgba(247,244,239,0.9)] backdrop-blur-md border border-[var(--clr-aged)] text-[var(--clr-ink)] flex items-center justify-center hover:text-[var(--clr-gold)] hover:border-[var(--clr-gold)] shadow-[var(--shadow-sm)] transition-all"><CornersOut size={20} weight="bold" /></button>
      </div>

      <AnimatePresence>
        {selectedNode && (
          <motion.div initial={{ x: '100%', opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '100%', opacity: 0 }} transition={{ type: 'spring', damping: 30, stiffness: 250 }} className="absolute top-0 right-0 h-full w-[440px] bg-[var(--clr-charcoal)] border-l border-[var(--clr-gold)] shadow-[-20px_0_60px_rgba(20,18,17,0.5)] z-[60] flex flex-col">
            <div className="relative h-[240px] w-full flex items-center justify-center bg-[var(--clr-soot)] border-b border-[rgba(184,143,91,0.2)] overflow-hidden">
              {selectedNode.photo && <div className="absolute inset-0 opacity-20 blur-md pointer-events-none"><img src={selectedNode.photo} className="w-full h-full object-cover" alt="" /></div>}
              <button onClick={() => setSelectedNodeId(null)} className="absolute top-8 right-8 w-10 h-10 rounded-full border border-[var(--clr-gold)] text-[var(--clr-gold)] flex items-center justify-center hover:bg-[var(--clr-gold)] hover:text-[var(--clr-charcoal)] transition-colors z-10"><X size={18} weight="bold" /></button>
              <div className="w-[120px] h-[120px] rounded-full border-[3px] border-[var(--clr-gold)] shadow-[var(--shadow-gold)] relative z-10 bg-[var(--clr-paper)] overflow-hidden flex items-center justify-center text-[var(--clr-gold)]">
                 {selectedNode.photo ? <img src={selectedNode.photo} className="w-full h-full object-cover" alt={selectedNode.name} /> : <User size={48} weight="thin" />}
              </div>
            </div>
            <div className="flex-1 p-10 overflow-y-auto no-scrollbar text-center text-[var(--clr-linen)]">
              <h2 className="font-display font-bold text-[2.5rem] uppercase tracking-widest leading-none mb-2">{selectedNode.name}</h2>
              <p className="font-script text-[40px] text-[var(--clr-gold)] leading-[0.5] mb-8">"{selectedNode.role}"</p>
              <div className="w-16 h-px bg-[var(--clr-gold)] opacity-40 mx-auto mb-8" />
              <div className="space-y-4 mb-10 text-left px-4">
                <div className="flex justify-between border-b border-[rgba(184,143,91,0.15)] pb-3"><span className="font-ui text-[11px] uppercase tracking-[0.2em] text-[var(--clr-fog)]">Born</span><span className="font-ui text-[13px] text-[var(--clr-linen)]">1942 · Harar</span></div>
                {selectedNode.deathYear && <div className="flex justify-between border-b border-[rgba(184,143,91,0.15)] pb-3"><span className="font-ui text-[11px] uppercase tracking-[0.2em] text-[var(--clr-fog)]">Passed</span><span className="font-ui text-[13px] text-[var(--clr-linen)]">{selectedNode.deathYear}</span></div>}
              </div>
              <div className="space-y-4 w-full">
                <Button variant="primary" onClick={handleAction} className="w-full py-4 text-[10px]"><ImageIcon size={18} /> View Exhibition</Button>
                <Button variant="ghost" onClick={handleAction} className="w-full py-4 text-[10px]"><MagicWand size={18} /> Generate Chronicle</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}