import { useMemo } from 'react';
import * as d3 from 'd3-hierarchy';
import { motion } from 'framer-motion';
import { User, Plus } from '@phosphor-icons/react';

export interface TreeNode {
  id: string;
  name: string;
  role: string;
  photo?: string;
  deathYear?: string;
  invisible?: boolean;
  isGhost?: boolean;
}

export interface TreeEdge {
  from: string;
  to: string;
}

interface TreeCanvasProps {
  nodes: TreeNode[];
  edges: TreeEdge[];
  onNodeClick: (nodeId: string) => void;
  selectedNodeId: string | null;
  isEditMode?: boolean;
  onAddRelative?: (parentId: string) => void;
}

export const TreeCanvas = ({ nodes, edges, onNodeClick, selectedNodeId, isEditMode, onAddRelative }: TreeCanvasProps) => {
  const { treeNodes, treeLinks, cx, cy } = useMemo(() => {
    let processedNodes = [...nodes];
    let processedEdges = [...edges];

    if (isEditMode) {
      nodes.forEach((node) => {
        if (!node.invisible) {
          const ghostId = `ghost-${node.id}`;
          processedNodes.push({
            id: ghostId,
            name: 'New Kin',
            role: 'Add Relative',
            isGhost: true,
          });
          processedEdges.push({ from: node.id, to: ghostId });
        }
      });
    }

    const root = d3.stratify<TreeNode>()
      .id((d) => d.id)
      .parentId((d) => processedEdges.find((e) => e.to === d.id)?.from || null)(processedNodes);

    const layout = d3.tree<TreeNode>().nodeSize([240, 260])(root);
    const visibleNodes = layout.descendants().filter(d => !d.data.invisible);

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    visibleNodes.forEach((d) => {
      if (d.x < minX) minX = d.x;
      if (d.x > maxX) maxX = d.x;
      if (d.y < minY) minY = d.y;
      if (d.y > maxY) maxY = d.y;
    });

    return {
      treeNodes: layout.descendants(),
      treeLinks: layout.links(),
      cx: isFinite(minX) ? (minX + maxX) / 2 : 0,
      cy: isFinite(minY) ? (minY + maxY) / 2 : 0,
    };
  }, [nodes, edges, isEditMode]);

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ animation: 'ambient-sway 14s ease-in-out infinite alternate' }}>

      <svg className="absolute inset-0 w-full h-full overflow-visible">
        <g transform={`translate(${-cx}, ${-cy})`}>
          {treeLinks.map((link, i) => {
            if (link.source.data.invisible || link.target.data.invisible) return null;

            const isGhostPath = link.target.data.isGhost;
            const d = `M ${link.source.x} ${link.source.y}
                       C ${link.source.x} ${(link.source.y + link.target.y) / 2},
                         ${link.target.x} ${(link.source.y + link.target.y) / 2},
                         ${link.target.x} ${link.target.y}`;

            return (
              <motion.path
                key={`link-${i}`}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: isGhostPath ? 0.15 : 0.4 }}
                d={d}
                stroke="var(--clr-gold)"
                strokeWidth={isGhostPath ? 2 : 6}
                strokeDasharray={isGhostPath ? "4 4" : "none"}
                fill="none"
              />
            );
          })}
        </g>
      </svg>

      <div className="absolute inset-0 overflow-visible">
        {treeNodes.map((node) => {
          if (node.data.invisible) return null;

          const isSelected = selectedNodeId === node.id;
          const isDeceased = !!node.data.deathYear;
          const isGhost = node.data.isGhost;

          return (
            <motion.div
              key={node.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute flex flex-col items-center pointer-events-auto group cursor-pointer"
              style={{ left: `calc(50% + ${node.x - cx}px)`, top: `calc(50% + ${node.y - cy}px)`, transform: 'translate(-50%, -50%)' }}
              onClick={() => {
                if (isGhost) {
                  const parentId = node.parent?.id;
                  if (parentId) onAddRelative?.(parentId);
                } else {
                  if (node.id) onNodeClick(node.id);
                }
              }}
            >
              {isGhost ? (
                <div className="w-[60px] h-[60px] rounded-full border-2 border-dashed border-[var(--clr-gold)] opacity-40 hover:opacity-100 hover:scale-110 transition-all flex items-center justify-center bg-[rgba(184,143,91,0.05)] text-[var(--clr-gold)]">
                  <Plus size={24} weight="bold" />
                </div>
              ) : (
                <>
                  <motion.div
                    whileHover={{ scale: 1.1, y: -5 }}
                    animate={isSelected ? { scale: 1.15, y: -5 } : {}}
                    className={`w-[90px] h-[90px] rounded-full p-1.5 border-[3px] transition-colors duration-500 shadow-2xl relative z-10 ${
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
                    </div>
                  </motion.div>

                  <div className={`mt-4 text-center px-4 py-2 rounded-[var(--radius-sm)] border backdrop-blur-md transition-all duration-300 ${
                    isSelected ? 'bg-[var(--clr-charcoal)] border-[var(--clr-gold)] text-[var(--clr-linen)] shadow-[var(--shadow-gold)] scale-110 z-20' : 'bg-[rgba(247,244,239,0.85)] border-[var(--clr-aged)] text-[var(--clr-ink)] shadow-[var(--shadow-sm)]'
                  }`}>
                    <h3 className="font-display font-bold text-[15px] leading-none tracking-wide whitespace-nowrap">{node.data.name}</h3>
                    <p className={`font-ui text-[9px] uppercase tracking-widest mt-1.5 ${isSelected ? 'text-[var(--clr-gold)]' : 'text-[var(--clr-dust)]'}`}>{node.data.role}</p>
                  </div>
                </>
              )}
            </motion.div>
          );
        })}
      </div>

      <style>{`
        @keyframes ambient-sway {
          0% { transform: rotate(-1.5deg); }
          100% { transform: rotate(1.5deg); }
        }
      `}</style>
    </div>
  );
};