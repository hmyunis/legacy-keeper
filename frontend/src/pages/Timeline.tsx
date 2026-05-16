import { useState } from 'react';
import { motion } from 'framer-motion';
import MemoryDetailModal from '../features/vault/MemoryDetailModal';
import { useVaultMemories } from '../features/vault/hooks/useVault';

export default function Timeline() {
  const [activeFilter, setActiveFilter] = useState('All Eras');
  const [selectedMemory, setSelectedMemory] = useState<any>(null);
  const { data: memories = [] } = useVaultMemories();

  const groupedData = [...memories]
    .sort((a, b) => parseInt(a.year || '0') - parseInt(b.year || '0'))
    .reduce((acc, mem) => {
      if (!mem.year) return acc;
      const decade = Math.floor(parseInt(mem.year) / 10) * 10 + 's';
      if (!acc[decade]) acc[decade] = [];
      acc[decade].push(mem);
      return acc;
    }, {} as Record<string, any[]>);

  const availableDecades = Object.keys(groupedData).sort();
  const displayData = activeFilter === 'All Eras' ? groupedData : { [activeFilter]: groupedData[activeFilter] };

  return (
    <div className="min-h-screen bg-[var(--clr-parchment)] flex flex-col zone-light pt-[var(--space-8)] relative overflow-hidden">
      <MemoryDetailModal isOpen={!!selectedMemory} onClose={() => setSelectedMemory(null)} memory={selectedMemory} />

      <div className="px-[clamp(24px,5vw,80px)] max-w-[var(--max-width)] mx-auto w-full mb-16 relative z-10">
        <h1 className="font-display font-semibold text-[var(--type-h1)] text-[var(--clr-ink)] tracking-[0.03em] uppercase text-center mb-2">CHRONOLOGY</h1>
        <div className="flex justify-center flex-wrap gap-3 mt-8">
          <button onClick={() => setActiveFilter('All Eras')} className={`px-6 py-2.5 rounded-[var(--radius-pill)] font-ui text-[11px] font-bold uppercase border ${activeFilter === 'All Eras' ? 'bg-[var(--clr-gold)] text-[var(--clr-linen)]' : 'bg-[var(--clr-paper)] text-[var(--clr-dust)] border-[var(--clr-aged)]'}`}>All Eras</button>
          {availableDecades.map(dec => (
            <button key={dec} onClick={() => setActiveFilter(dec)} className={`px-6 py-2.5 rounded-[var(--radius-pill)] font-ui text-[11px] font-bold uppercase border ${activeFilter === dec ? 'bg-[var(--clr-gold)] text-[var(--clr-linen)]' : 'bg-[var(--clr-paper)] text-[var(--clr-dust)] border-[var(--clr-aged)]'}`}>{dec}</button>
          ))}
        </div>
      </div>

      <div className="relative max-w-[1000px] mx-auto w-full px-4 pb-40 z-10">
        <div className="absolute left-[36px] md:left-1/2 top-0 bottom-0 w-[4px] bg-[var(--clr-aged)] -translate-x-1/2 z-0 rounded-full shadow-inner" />

        {Object.entries(displayData).map(([decade, items]) => (
          <div key={decade} className="relative mb-32">
            <div className="flex items-center justify-start md:justify-center mb-20 relative z-20">
              <div className="w-[20px] h-[20px] bg-[var(--clr-gold)] rounded-full border-[3px] border-[var(--clr-parchment)] absolute left-[36px] md:left-1/2 -translate-x-1/2 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-white rounded-full" /></div>
              <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="ml-[70px] md:ml-0 md:absolute md:left-[calc(50%+40px)] font-script text-[56px] text-[var(--clr-dust)] leading-[0.5]">"The {decade}"</motion.div>
            </div>

            <div className="space-y-24">
              {items.map((item, index) => {
                const isEven = index % 2 === 0;
                return (
                  <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} key={item.id} className={`relative flex items-center justify-start ${isEven ? 'md:flex-row-reverse md:justify-end' : 'md:flex-row md:justify-end'} z-10 pl-[70px] md:pl-0 w-full group`}>
                    <div className="w-[12px] h-[12px] bg-[var(--clr-parchment)] border-2 border-[var(--clr-aged)] rounded-full absolute left-[36px] md:left-1/2 -translate-x-1/2 group-hover:border-[var(--clr-gold)] group-hover:bg-[var(--clr-gold)] transition-colors z-20" />
                    <div className={`absolute top-1/2 -translate-y-1/2 h-[2px] bg-[var(--clr-aged)] group-hover:bg-[var(--clr-gold)] w-[40px] md:w-[60px] left-[36px] ${isEven ? 'md:right-1/2 md:left-auto' : 'md:left-1/2'} z-10`} />
                    <div className={`w-full md:w-[calc(50%-80px)] ${isEven ? 'md:pr-0' : 'md:pl-0'}`}>
                      <div onClick={() => setSelectedMemory(item)} className="bg-[var(--clr-linen)] p-5 rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] border border-[var(--clr-aged)] hover:border-[var(--clr-gold)] cursor-pointer hover:-translate-y-1">
                        <img src={item.url} alt={item.title} className="w-full aspect-[4/3] object-cover rounded-[var(--radius-sm)] mb-5" />
                        <h3 className="font-display font-semibold text-[1.375rem] text-[var(--clr-ink)] mb-3">{item.title}</h3>
                        <p className="font-ui text-[14px] text-[var(--clr-dust)] leading-relaxed line-clamp-3">{item.ai_caption}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}