import { useState } from 'react';
import { motion } from 'framer-motion';
import MemoryDetailModal from '../../vault/components/MemoryDetailModal';
import { useTimeline } from '../hooks/useChronicles';

const DECADES = ['1960s', '1970s', '1980s', '1990s'];

export default function TimelinePage() {
  const { data: timelineData = [] } = useTimeline();
  const [activeFilter, setActiveFilter] = useState('All Eras');
  const [selectedMemory, setSelectedMemory] = useState<any>(null);

  const filteredData = activeFilter === 'All Eras'
    ? timelineData
    : timelineData.filter((item: any) => item.decade === activeFilter);

  const groupedData = filteredData.reduce((acc: Record<string, any[]>, item: any) => {
    if (!acc[item.decade]) acc[item.decade] = [];
    acc[item.decade].push(item);
    return acc;
  }, {} as Record<string, typeof timelineData>);

  return (
    <div className="min-h-screen bg-[var(--clr-parchment)] flex flex-col zone-light pt-[var(--space-8)] relative overflow-hidden">

      <MemoryDetailModal
        isOpen={!!selectedMemory}
        onClose={() => setSelectedMemory(null)}
        memory={selectedMemory}
      />

      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03] flex items-center justify-center">
        <svg viewBox="0 0 100 100" className="w-[800px] h-[800px] absolute -right-[200px] top-[10%]">
          <circle cx="50" cy="50" r="48" fill="none" stroke="var(--clr-ink)" strokeWidth="0.5" strokeDasharray="2 4"/>
          <circle cx="50" cy="50" r="40" fill="none" stroke="var(--clr-ink)" strokeWidth="0.2"/>
        </svg>
      </div>

      <div className="px-[clamp(24px,5vw,80px)] max-w-[var(--max-width)] mx-auto w-full mb-16 relative z-10">
        <h1 className="font-display font-semibold text-[var(--type-h1)] text-[var(--clr-ink)] tracking-[0.03em] uppercase text-center mb-2">CHRONOLOGY</h1>
        <p className="font-script text-[44px] text-[var(--clr-dust)] leading-[0.5] text-center mb-10">"Through the ages"</p>

        <div className="flex justify-center flex-wrap gap-3">
          <button
            onClick={() => setActiveFilter('All Eras')}
            className={`px-6 py-2.5 rounded-[var(--radius-pill)] font-ui text-[11px] font-bold uppercase tracking-widest transition-all border ${activeFilter === 'All Eras' ? 'bg-[var(--clr-gold)] text-[var(--clr-linen)] border-[var(--clr-gold)] shadow-[var(--shadow-md)]' : 'bg-[var(--clr-paper)] text-[var(--clr-dust)] border-[var(--clr-aged)] hover:border-[var(--clr-gold)]'}`}
          >
            All Eras
          </button>
          {DECADES.map(dec => (
            <button
              key={dec}
              onClick={() => setActiveFilter(dec)}
              className={`px-6 py-2.5 rounded-[var(--radius-pill)] font-ui text-[11px] font-bold uppercase tracking-widest transition-all border ${activeFilter === dec ? 'bg-[var(--clr-gold)] text-[var(--clr-linen)] border-[var(--clr-gold)] shadow-[var(--shadow-md)]' : 'bg-[var(--clr-paper)] text-[var(--clr-dust)] border-[var(--clr-aged)] hover:border-[var(--clr-gold)]'}`}
            >
              {dec}
            </button>
          ))}
        </div>
      </div>

      <div className="relative max-w-[1000px] mx-auto w-full px-4 pb-40 z-10">

        <div className="absolute left-[36px] md:left-1/2 top-0 bottom-0 w-[4px] bg-[var(--clr-aged)] -translate-x-1/2 z-0 rounded-full shadow-inner" />

        {Object.entries(groupedData).map(([decade, items]) => (
          <div key={decade} className="relative mb-32">

            <div className="flex items-center justify-start md:justify-center mb-20 relative z-20">
              <div className="w-[20px] h-[20px] bg-[var(--clr-gold)] rounded-full border-[3px] border-[var(--clr-parchment)] shadow-[0_0_16px_rgba(184,143,91,0.6)] absolute left-[36px] md:left-1/2 -translate-x-1/2 flex items-center justify-center">
                 <div className="w-1.5 h-1.5 bg-white rounded-full" />
              </div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
                className="ml-[70px] md:ml-0 md:absolute md:left-[calc(50%+40px)] font-script text-[56px] md:text-[72px] text-[var(--clr-dust)] leading-[0.5] drop-shadow-md origin-left"
              >
                "The {decade}"
              </motion.div>
            </div>

            <div className="space-y-24">
              {items.map((item: any, index: number) => {
                const isEven = index % 2 === 0;
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    key={item.id}
                    className={`relative flex items-center justify-start ${isEven ? 'md:flex-row-reverse md:justify-end' : 'md:flex-row md:justify-end'} z-10 pl-[70px] md:pl-0 w-full group`}
                  >
                    <div className="w-[12px] h-[12px] bg-[var(--clr-parchment)] border-2 border-[var(--clr-aged)] rounded-full absolute left-[36px] md:left-1/2 -translate-x-1/2 group-hover:border-[var(--clr-gold)] group-hover:bg-[var(--clr-gold)] transition-colors duration-300 z-20" />

                    <div className={`absolute top-1/2 -translate-y-1/2 h-[2px] bg-[var(--clr-aged)] group-hover:bg-[var(--clr-gold)] transition-colors duration-300 w-[40px] md:w-[60px] left-[36px] ${isEven ? 'md:right-1/2 md:left-auto' : 'md:left-1/2'} z-10`} />

                    <div className={`w-full md:w-[calc(50%-80px)] ${isEven ? 'md:pr-0' : 'md:pl-0'}`}>
                      <div
                        onClick={() => setSelectedMemory({
                          title: item.title,
                          date: item.year,
                          location: item.location,
                          url: item.url,
                          aiCaption: item.desc,
                          people: ['Abebe Kebede', 'Yohannes Kebede']
                        })}
                        className="bg-[var(--clr-linen)] p-5 rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] border border-[var(--clr-aged)] hover:border-[var(--clr-gold)] hover:shadow-[var(--shadow-md)] transition-all duration-300 cursor-pointer hover:-translate-y-1"
                      >
                        <div className="aspect-[4/3] overflow-hidden rounded-[var(--radius-sm)] mb-5 relative">
                          <img src={item.url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 sepia-[0.2] group-hover:sepia-0" />
                          <div className="absolute inset-0 border border-white/20 rounded-[var(--radius-sm)] pointer-events-none" />
                        </div>

                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-display text-[28px] text-[var(--clr-gold-dark)] leading-none">{item.year}</span>
                          <div className="h-4 w-px bg-[var(--clr-aged)]" />
                          <span className="font-ui text-[10px] uppercase tracking-widest text-[var(--clr-dust)] font-bold">{item.location}</span>
                        </div>

                        <h3 className="font-display font-semibold text-[1.375rem] text-[var(--clr-ink)] mb-3 leading-tight">{item.title}</h3>
                        <p className="font-ui text-[14px] text-[var(--clr-dust)] leading-relaxed">{item.desc}</p>
                      </div>
                    </div>

                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="absolute left-[36px] md:left-1/2 bottom-0 w-[12px] h-[12px] bg-[var(--clr-aged)] rounded-full -translate-x-1/2 shadow-inner" />
      </div>
    </div>
  );
}