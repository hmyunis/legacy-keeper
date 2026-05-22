import { useMemo, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Sparkle, Heart, ArrowUp, ArrowDown, UserPlus } from '@phosphor-icons/react';
import { Tooltip } from '../../components/ui/Tooltip';
import type { Person, KinshipEdge } from './types';

interface TreeCanvasProps {
  nodes: Person[];
  edges: KinshipEdge[];
  onNodeClick: (nodeId: string) => void;
  selectedNodeId: string | null;
  isEditMode: boolean;
  onAddRelative: (targetId: string, relationshipType: 'PARENT_OF' | 'CHILD_OF' | 'SPOUSE_OF') => void;
  scale: number;
  offsetX: number;
  offsetY: number;
}

interface ComputedNode {
  id: string;
  data: Person;
  x: number;
  y: number;
  generation: number;
  spouseId?: string;
}

export const TreeCanvas = ({
  nodes,
  edges,
  onNodeClick,
  selectedNodeId,
  isEditMode,
  onAddRelative,
  scale,
  offsetX,
  offsetY,
}: TreeCanvasProps) => {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Compute layered graph positions to support spouses and dual parents
  const layoutData = useMemo(() => {
    if (nodes.length === 0) return { computedNodes: [], spouseLinks: [], parentLinks: [] };

    const nodeMap = new Map<string, Person>(nodes.map((n) => [n.id, n]));
    const computed = new Map<string, ComputedNode>();

    // Step 1: Gen-level assignment using topology traversal
    const generations = new Map<string, number>();

    const assignGen = (nodeId: string, depth: number) => {
      if (generations.has(nodeId) && generations.get(nodeId)! >= depth) return;
      generations.set(nodeId, depth);

      // Trailing descent branches
      edges
        .filter((e) => e.from === nodeId && e.type === 'PARENT_OF')
        .forEach((e) => assignGen(e.to, depth + 1));

      // Upward branches (ancestors)
      edges
        .filter((e) => e.to === nodeId && e.type === 'PARENT_OF')
        .forEach((e) => assignGen(e.from, depth - 1));

      // Spouses stay on the same level
      edges
        .filter((e) => (e.from === nodeId || e.to === nodeId) && e.type === 'SPOUSE_OF')
        .forEach((e) => {
          const spouseId = e.from === nodeId ? e.to : e.from;
          if (!generations.has(spouseId)) {
            generations.set(spouseId, depth);
          }
        });
    };

    // Begin mapping from the oldest found relative (or first node)
    const seed = nodes[0]?.id;
    if (seed) assignGen(seed, 0);

    // Normalize generations to prevent negative indices
    const minGen = Math.min(...Array.from(generations.values()), 0);
    nodes.forEach((n) => {
      const g = (generations.get(n.id) ?? 0) - minGen;
      generations.set(n.id, g);
    });

    // Step 2: Resolve spouse pairings
    const spousePairs = new Map<string, string>();
    edges
      .filter((e) => e.type === 'SPOUSE_OF')
      .forEach((e) => {
        if (!spousePairs.has(e.from) && !spousePairs.has(e.to)) {
          spousePairs.set(e.from, e.to);
          spousePairs.set(e.to, e.from);
        }
      });

    // Step 3: Layered spacing and grouping
    const generationGroups: Record<number, string[]> = {};
    nodes.forEach((n) => {
      const g = generations.get(n.id) ?? 0;
      if (!generationGroups[g]) generationGroups[g] = [];
      if (!generationGroups[g].includes(n.id)) {
        generationGroups[g].push(n.id);
      }
    });

    const NODE_WIDTH = 300;
    const NODE_HEIGHT = 250;

    Object.entries(generationGroups).forEach(([genStr, genNodes]) => {
      const gen = parseInt(genStr);
      const placed = new Set<string>();

      // Group spouses adjacent to each other
      const orderedNodes: string[] = [];
      genNodes.forEach((id) => {
        if (placed.has(id)) return;
        const spouseId = spousePairs.get(id);

        if (spouseId && genNodes.includes(spouseId)) {
          orderedNodes.push(id, spouseId);
          placed.add(id);
          placed.add(spouseId);
        } else {
          orderedNodes.push(id);
          placed.add(id);
        }
      });

      const totalRowWidth = orderedNodes.length * NODE_WIDTH;
      const startX = -totalRowWidth / 2;

      for (let i = 0; i < orderedNodes.length; i++) {
        const id = orderedNodes[i];
        const person = nodeMap.get(id)!;

        computed.set(id, {
          id,
          data: person,
          generation: gen,
          spouseId: spousePairs.get(id),
          x: startX + i * NODE_WIDTH,
          y: gen * NODE_HEIGHT,
        });
      }
    });

    const computedNodes = Array.from(computed.values());

    const spouseLinks = edges
      .filter((e) => e.type === 'SPOUSE_OF')
      .map((e) => ({ from: e.from, to: e.to }));

    const parentLinks = edges
      .filter((e) => e.type === 'PARENT_OF')
      .map((e) => ({ from: e.from, to: e.to }));

    return { computedNodes, spouseLinks, parentLinks };
  }, [nodes, edges]);

  const computedNodes = layoutData.computedNodes;
  const spouseLinks = layoutData.spouseLinks;
  const parentLinks = layoutData.parentLinks;

  const nodeById = useMemo(() => new Map(computedNodes.map((n) => [n.id, n])), [computedNodes]);

  // Centering
  const bounds = useMemo(() => {
    if (computedNodes.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    const xs = computedNodes.map((n) => n.x);
    const ys = computedNodes.map((n) => n.y);
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    };
  }, [computedNodes]);

  const cx = (bounds.minX + bounds.maxX) / 2;
  const cy = (bounds.minY + bounds.maxY) / 2;

  const canvasRef = useRef<HTMLDivElement | null>(null);

  // Mousewheel zoom (trackpad + classic)
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (!isEditMode) return;
      // prevent browser scroll
      e.preventDefault();
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel as any);
  }, [isEditMode]);

  return (
    <div ref={canvasRef} className="absolute inset-0">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          transform: `translate(calc(50% + ${offsetX}px), calc(50% + ${offsetY}px)) scale(${scale}) translate(${-cx}px, ${-cy}px)`,
          transformOrigin: 'center',
        }}
      >
        {/* Edge Layer */}
        <svg className="absolute inset-0 w-full h-full overflow-visible">
          {/* Parent edges */}
          {parentLinks.map((link, i) => {
            const from = nodeById.get(link.from);
            const to = nodeById.get(link.to);
            if (!from || !to) return null;

            const d = `M ${from.x} ${from.y + 40}\n                     C ${from.x} ${(from.y + to.y) / 2},\n                       ${to.x} ${(from.y + to.y) / 2},\n                       ${to.x} ${to.y - 40}`;

            return (
              <motion.path
                key={`parent-${i}`}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.35 }}
                d={d}
                stroke="var(--clr-gold)"
                strokeWidth={6}
                fill="none"
              />
            );
          })}

          {/* Spouse edges */}
          {spouseLinks.map((link, i) => {
            const from = nodeById.get(link.from);
            const to = nodeById.get(link.to);
            if (!from || !to) return null;

            const d = `M ${from.x + 55} ${from.y}\n                     L ${to.x - 55} ${to.y}`;

            return (
              <motion.path
                key={`spouse-${i}`}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.25 }}
                d={d}
                stroke="var(--clr-gold-light)"
                strokeWidth={4}
                strokeDasharray="6 6"
                fill="none"
              />
            );
          })}
        </svg>

        {/* Nodes */}
        <div className="absolute inset-0 overflow-visible">
          {computedNodes.map((node) => {
            const isSelected = selectedNodeId === node.id;
            const isDeceased = !!node.data.deathYear;
            const isHovered = hoveredNodeId === node.id;

            const isCrossVault = !!node.data.vaultId && node.data.vaultId !== nodes[0]?.vaultId;

            return (
              <motion.div
                key={node.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="absolute flex w-[220px] -translate-x-1/2 -translate-y-1/2 flex-col items-center pointer-events-auto group cursor-pointer select-none"
                style={{ left: `${node.x}px`, top: `${node.y}px`, transform: 'translate(-50%, -50%)' }}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                onClick={() => onNodeClick(node.id)}
              >
                <motion.div
                  whileHover={{ scale: 1.1, y: -4 }}
                  animate={isSelected ? { scale: 1.15, y: -6 } : {}}
                  className={`w-[88px] h-[88px] sm:w-[96px] sm:h-[96px] rounded-full p-1.5 border-[3px] transition-colors duration-500 shadow-2xl relative z-10 ${
                    isSelected ? 'border-[var(--clr-gold-light)] bg-[var(--clr-gold)]' : 'border-[var(--clr-gold)] bg-[var(--clr-linen)]'
                  }`}
                >
                  <div className={`w-full h-full rounded-full overflow-hidden relative ${isDeceased ? 'sepia-[0.8] contrast-125' : ''}`}>
                    {node.data.photo ? (
                      <img src={node.data.photo} alt={node.data.name} className="w-full h-full object-cover" draggable={false} />
                    ) : (
                      <div className="w-full h-full bg-[var(--clr-paper)] flex items-center justify-center text-[var(--clr-gold)]">
                        <User size={40} weight="thin" />
                      </div>
                    )}

                    {isCrossVault && (
                      <div className="absolute inset-0 bg-[rgba(0,0,0,0.45)] flex items-center justify-center">
                        <Heart size={22} weight="fill" className="text-[var(--clr-gold)]" />
                      </div>
                    )}
                  </div>
                </motion.div>

                <div
                  className={`mt-3 max-w-full text-center px-3 py-2 rounded-[var(--radius-sm)] border backdrop-blur-md transition-all duration-300 ${
                    isSelected
                      ? 'bg-[var(--clr-charcoal)] border-[var(--clr-gold)] text-[var(--clr-linen)] shadow-[var(--shadow-gold)] scale-110 z-20'
                      : 'bg-[rgba(247,244,239,0.85)] border-[var(--clr-aged)] text-[var(--clr-ink)] shadow-[var(--shadow-sm)]'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1">
                    <h3 className="font-display font-bold text-[14px] leading-tight tracking-wide break-words">{node.data.name}</h3>
                    {node.data.biography && <Sparkle size={10} weight="fill" className="text-[var(--clr-gold)]" />}
                  </div>
                  <p
                    className={`font-ui text-[9px] uppercase tracking-widest mt-1.5 ${
                      isSelected ? 'text-[var(--clr-gold)]' : 'text-[var(--clr-dust)]'
                    }`}
                  >
                    {node.data.role}
                  </p>

                  {isCrossVault && (
                    <p className="font-ui text-[8px] uppercase tracking-widest mt-1 text-[var(--clr-gold-dark)]">
                      Pact: {node.data.vaultName || 'Linked Vault'}
                    </p>
                  )}
                </div>

                {/* Edit-mode graft controls */}
                <AnimatePresence>
                  {isEditMode && isHovered && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                    className="absolute -bottom-16 flex gap-2 bg-[rgba(0,0,0,0.68)] rounded-full px-3 py-2 border border-[rgba(184,143,91,0.35)] shadow-lg"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Tooltip content="Add Parent" side="top">
                        <button
                          aria-label="Add parent"
                          className="w-9 h-9 rounded-full bg-[rgba(184,143,91,0.12)] hover:bg-[rgba(184,143,91,0.22)] border border-[rgba(184,143,91,0.35)] flex items-center justify-center text-[var(--clr-gold-light)]"
                          onClick={() => onAddRelative(node.id, 'PARENT_OF')}
                        >
                          <ArrowUp size={18} weight="bold" />
                        </button>
                      </Tooltip>
                      <Tooltip content="Add Child" side="top">
                        <button
                          aria-label="Add child"
                          className="w-9 h-9 rounded-full bg-[rgba(184,143,91,0.12)] hover:bg-[rgba(184,143,91,0.22)] border border-[rgba(184,143,91,0.35)] flex items-center justify-center text-[var(--clr-gold-light)]"
                          onClick={() => onAddRelative(node.id, 'CHILD_OF')}
                        >
                          <ArrowDown size={18} weight="bold" />
                        </button>
                      </Tooltip>
                      <Tooltip content="Add Spouse" side="top">
                        <button
                          aria-label="Add spouse"
                          className="w-9 h-9 rounded-full bg-[rgba(184,143,91,0.12)] hover:bg-[rgba(184,143,91,0.22)] border border-[rgba(184,143,91,0.35)] flex items-center justify-center text-[var(--clr-gold-light)]"
                          onClick={() => onAddRelative(node.id, 'SPOUSE_OF')}
                        >
                          <UserPlus size={18} weight="bold" />
                        </button>
                      </Tooltip>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes ambient-sway {
          0% { transform: rotate(-1.2deg); }
          100% { transform: rotate(1.2deg); }
        }
      `}</style>
    </div>
  );
};
