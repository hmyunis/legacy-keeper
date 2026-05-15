import { MapPin, Calendar, Sparkle } from '@phosphor-icons/react';

interface Memory {
  id: string;
  title: string;
  year: string;
  location: string;
  url: string;
  restored: boolean;
}

interface MemoryCardProps {
  memory: Memory;
  viewMode: 'grid' | 'list';
  onClick: () => void;
}

export default function MemoryCard({ memory, viewMode, onClick }: MemoryCardProps) {
  if (viewMode === 'list') {
    return (
      <div 
        onClick={onClick}
        className="bg-[var(--clr-linen)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] border border-[var(--clr-aged)] overflow-hidden cursor-pointer hover:shadow-[var(--shadow-md)] transition-all hover:-translate-y-0.5 flex flex-row"
      >
        <div className="w-48 h-32 overflow-hidden flex-shrink-0">
          <img src={memory.url} alt={memory.title} className="w-full h-full object-cover sepia-[0.2]" />
        </div>
        <div className="p-4 flex flex-col justify-center flex-1">
          <div className="flex items-center gap-2 mb-1">
            {memory.restored && <Sparkle size={14} className="text-[var(--clr-gold)]" />}
            <h3 className="font-display font-semibold text-lg text-[var(--clr-ink)]">{memory.title}</h3>
          </div>
          <div className="flex items-center gap-4 text-[var(--clr-dust)] font-ui text-sm">
            <span className="flex items-center gap-1"><MapPin size={14} /> {memory.location}</span>
            <span className="flex items-center gap-1"><Calendar size={14} /> {memory.year}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={onClick}
      className="bg-[var(--clr-linen)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] border border-[var(--clr-aged)] overflow-hidden cursor-pointer hover:shadow-[var(--shadow-md)] transition-all hover:-translate-y-1 group"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img 
          src={memory.url} 
          alt={memory.title} 
          className="w-full h-full object-cover sepia-[0.25] group-hover:sepia-[0] group-hover:scale-105 transition-all duration-700" 
        />
        <div className="absolute top-3 right-3">
          {memory.restored && (
            <div className="bg-[rgba(20,18,17,0.85)] backdrop-blur-sm text-[var(--clr-gold)] px-2 py-1 rounded-full text-[10px] font-ui font-bold uppercase tracking-wider flex items-center gap-1">
              <Sparkle size={10} weight="fill" /> Restored
            </div>
          )}
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-display font-semibold text-lg text-[var(--clr-ink)] mb-2 group-hover:text-[var(--clr-gold)] transition-colors">{memory.title}</h3>
        <div className="flex items-center gap-3 text-[var(--clr-dust)] font-ui text-xs">
          <span className="flex items-center gap-1"><MapPin size={12} /> {memory.location}</span>
          <span className="flex items-center gap-1"><Calendar size={12} /> {memory.year}</span>
        </div>
      </div>
    </div>
  );
}