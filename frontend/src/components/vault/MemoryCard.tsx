import { useState } from 'react';
import { Heart, CornersOut } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUpdateMemory } from '../../features/vault/hooks/useVault';

interface MemoryCardProps {
  memory: {
    id: string;
    url: string;
    title: string;
    location: string;
    date: string;
    tags: string[];
    is_duplicate?: boolean;
    is_favorite?: boolean;
  };
}

export default function MemoryCard({ memory }: MemoryCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const updateMutation = useUpdateMemory();

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateMutation.mutate({
      memoryId: memory.id,
      data: { is_favorite: !memory.is_favorite }
    });
  };

  return (
    <motion.div 
      whileHover={{ y: -6, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="bg-[var(--clr-linen)] border border-[var(--clr-aged)] rounded-[var(--radius-md)] overflow-hidden shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-lg)] hover:border-[var(--clr-gold)] relative group cursor-pointer z-10 hover:z-20"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[var(--clr-soot)]">
        <motion.img
          src={memory.url}
          animate={{ scale: isHovered ? 1.08 : 1 }}
          transition={{ duration: 6, ease: "linear" }}
          className="w-full h-full object-cover"
          alt={memory.title}
        />

        {memory.is_duplicate && (
          <div className="absolute top-3 left-3 bg-amber-600/90 text-white px-2 py-1 rounded text-[9px] font-bold uppercase tracking-tighter backdrop-blur-md">
            Potential Duplicate
          </div>
        )}

        {memory.is_favorite && !isHovered && (
          <div className="absolute top-3 right-3 text-[var(--clr-gold)] drop-shadow-md">
            <Heart size={20} weight="fill" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(20,18,17,0.8)] via-transparent to-transparent opacity-60" />

        <AnimatePresence>
          {isHovered && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[rgba(20,18,17,0.2)] flex items-center justify-center gap-4 backdrop-blur-[2px]"
            >
              <motion.button 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 10, opacity: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.05 }}
                whileHover={{ scale: 1.15, backgroundColor: 'var(--clr-gold)', borderColor: 'var(--clr-gold)', color: '#141211' }}
                whileTap={{ scale: 0.9 }}
                onClick={handleToggleFavorite}
                className={`w-[48px] h-[48px] rounded-full bg-[rgba(247,244,239,0.15)] border border-[rgba(247,244,239,0.5)] text-[var(--clr-linen)] flex items-center justify-center backdrop-blur-md shadow-lg ${memory.is_favorite ? "text-[var(--clr-gold)] border-[var(--clr-gold)]" : ""}`}
              >
                <Heart size={24} weight={memory.is_favorite ? "fill" : "bold"} />
              </motion.button>

              <motion.button 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 10, opacity: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.1 }}
                whileHover={{ scale: 1.15, backgroundColor: 'var(--clr-gold)', borderColor: 'var(--clr-gold)', color: '#141211' }}
                whileTap={{ scale: 0.9 }}
                className="w-[48px] h-[48px] rounded-full bg-[rgba(247,244,239,0.15)] border border-[rgba(247,244,239,0.5)] text-[var(--clr-linen)] flex items-center justify-center backdrop-blur-md shadow-lg"
              >
                <CornersOut size={24} weight="bold" />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="p-[var(--space-4)] relative bg-[var(--clr-linen)]">
        <motion.h3 
          animate={{ color: isHovered ? 'var(--clr-gold)' : 'var(--clr-ink)' }}
          className="font-display text-[var(--type-h3)] font-semibold tracking-[0.015em] mb-1 truncate"
        >
          {memory.title}
        </motion.h3>
        <p className="font-ui text-[var(--type-body-sm)] text-[var(--clr-dust)] mb-4">
          {memory.date} &middot; {memory.location}
        </p>

        <div className="flex gap-2 flex-wrap">
          {(memory.tags || []).map((tag, i) => (
            <motion.span
              key={tag}
              initial={{ y: 0 }}
              animate={{ y: isHovered ? -2 : 0 }}
              transition={{ delay: i * 0.05, type: 'spring' }}
              className="font-ui text-[10px] uppercase font-bold tracking-widest text-[var(--clr-dust)] bg-[var(--clr-paper)] border border-[var(--clr-aged)] px-2.5 py-1 rounded-[var(--radius-sm)] shadow-sm"
            >
              {tag}
            </motion.span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}