import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { detectVaultMediaType } from '../features/vault/lib/mediaType';
import MemoryDetailModal from '../features/vault/MemoryDetailModal';
import { useFilteredMemories, useMemoryFilters } from '../features/vault/hooks/useVault';
import type { VaultMemory } from '../features/vault/types';

const ALL_ERAS = 'All Eras';
const UNDATED = 'Undated';

function getSortTimestamp(memory: VaultMemory) {
  if (memory.date) {
    const timestamp = new Date(memory.date).getTime();
    if (!Number.isNaN(timestamp)) return timestamp;
  }

  if (memory.year && /^\d{4}$/.test(memory.year)) {
    return new Date(`${memory.year}-01-01`).getTime();
  }

  return Number.POSITIVE_INFINITY;
}

function getEraLabel(memory: VaultMemory) {
  if (!memory.year || !/^\d{4}$/.test(memory.year)) {
    return UNDATED;
  }

  return `${Math.floor(Number(memory.year) / 10) * 10}s`;
}

function TimelinePreview({ memory }: { memory: VaultMemory }) {
  const mediaType = detectVaultMediaType(memory.url, memory.exif_json);

  if (mediaType === 'video') {
    return (
      <div className="relative w-full aspect-[4/3] rounded-[var(--radius-sm)] overflow-hidden mb-5 bg-[var(--clr-soot)]">
        <video
          src={memory.url}
          className="w-full h-full object-cover"
          muted
          loop
          playsInline
          autoPlay
          preload="metadata"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(20,18,17,0.55)] via-transparent to-transparent" />
        <div className="absolute left-3 top-3 rounded-full bg-[rgba(20,18,17,0.68)] px-2.5 py-1 font-ui text-[9px] uppercase tracking-[0.18em] text-[var(--clr-linen)]">
          Video
        </div>
      </div>
    );
  }

  if (mediaType === 'audio') {
    return (
      <div className="relative w-full aspect-[4/3] rounded-[var(--radius-sm)] overflow-hidden mb-5 border border-[var(--clr-aged)] bg-[radial-gradient(circle_at_20%_20%,rgba(184,143,91,0.28),transparent_45%),linear-gradient(135deg,rgba(30,26,23,0.97),rgba(44,36,32,0.96))] flex items-center justify-center">
        <div className="text-center px-4">
          <p className="font-display text-[1.4rem] uppercase tracking-widest text-[var(--clr-gold-light)]">Audio</p>
          <p className="mt-1 font-ui text-[10px] uppercase tracking-[0.18em] text-[var(--clr-fog)]">Sound Memory</p>
        </div>
      </div>
    );
  }

  if (mediaType === 'pdf') {
    return (
      <div className="relative w-full aspect-[4/3] rounded-[var(--radius-sm)] overflow-hidden mb-5 border border-[rgba(184,143,91,0.18)] bg-[linear-gradient(135deg,rgba(247,244,239,1),rgba(232,223,203,0.95))] flex items-center justify-center">
        <div className="text-center px-4">
          <p className="font-display text-[1.4rem] uppercase tracking-widest text-[var(--clr-gold-dark)]">PDF</p>
          <p className="mt-1 font-ui text-[10px] uppercase tracking-[0.18em] text-[var(--clr-dust)]">Document Preview</p>
        </div>
      </div>
    );
  }

  return (
    <img
      src={memory.url}
      alt={memory.title}
      className="w-full aspect-[4/3] object-cover rounded-[var(--radius-sm)] mb-5"
    />
  );
}

export default function Timeline() {
  const [activeFilter, setActiveFilter] = useState(ALL_ERAS);
  const [selectedMemory, setSelectedMemory] = useState<VaultMemory | null>(null);

  const { data: filters = { clusters: [], decades: [], decadeCounts: {}, undatedCount: 0, totalCount: 0 } } = useMemoryFilters();

  const queryDecade = activeFilter === ALL_ERAS ? undefined : activeFilter === UNDATED ? 'undated' : activeFilter;
  const { data: memories = [], isFetching } = useFilteredMemories(queryDecade ? { decade: queryDecade } : undefined);

  const availableDecades = filters.decades || [];
  const sectionCount = activeFilter === ALL_ERAS
    ? availableDecades.length + (filters.undatedCount > 0 ? 1 : 0)
    : 1;

  const activeCount = activeFilter === ALL_ERAS
    ? filters.totalCount
    : activeFilter === UNDATED
      ? filters.undatedCount
      : filters.decadeCounts?.[activeFilter] ?? memories.length;

  const sections = useMemo(() => {
    const sortedMemories = [...memories].sort((a, b) => getSortTimestamp(a) - getSortTimestamp(b));

    if (activeFilter !== ALL_ERAS) {
      return [{ label: activeFilter, items: sortedMemories }];
    }

    const grouped = sortedMemories.reduce((acc, memory) => {
      const era = getEraLabel(memory);
      if (!acc[era]) {
        acc[era] = [];
      }
      acc[era].push(memory);
      return acc;
    }, {} as Record<string, VaultMemory[]>);

    return [
      ...availableDecades
        .filter((decade) => grouped[decade]?.length)
        .map((decade) => ({ label: decade, items: grouped[decade] })),
      ...(grouped[UNDATED]?.length ? [{ label: UNDATED, items: grouped[UNDATED] }] : []),
    ];
  }, [activeFilter, availableDecades, memories]);

  return (
    <div className="min-h-screen bg-[var(--clr-parchment)] flex flex-col zone-light pt-[var(--space-8)] relative overflow-hidden">
      <MemoryDetailModal
        isOpen={!!selectedMemory}
        onClose={() => setSelectedMemory(null)}
        memory={selectedMemory}
        onUpdate={setSelectedMemory}
      />

      <div className="px-[clamp(24px,5vw,80px)] max-w-[var(--max-width)] mx-auto w-full mb-16 relative z-10">
        <h1 className="font-display font-semibold text-[var(--type-h1)] text-[var(--clr-ink)] tracking-[0.03em] uppercase text-center mb-2">
          CHRONOLOGY
        </h1>
        <p className="text-center font-ui text-[11px] uppercase tracking-[0.24em] text-[var(--clr-dust)]">
          {isFetching
            ? 'Rebuilding the selected era...'
            : `${activeCount} artifact${activeCount === 1 ? '' : 's'} in view`
          }
          {activeFilter === ALL_ERAS && filters.undatedCount > 0 ? `, including ${filters.undatedCount} undated` : ''}
        </p>
        <div className="flex justify-center flex-wrap gap-3 mt-8">
          <button
            onClick={() => setActiveFilter(ALL_ERAS)}
            className={`px-6 py-2.5 rounded-[var(--radius-pill)] font-ui text-[11px] font-bold uppercase border inline-flex items-center gap-2 ${activeFilter === ALL_ERAS ? 'bg-[var(--clr-gold)] text-[var(--clr-linen)]' : 'bg-[var(--clr-paper)] text-[var(--clr-dust)] border-[var(--clr-aged)]'}`}
          >
            <span>All Eras</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] ${activeFilter === ALL_ERAS ? 'bg-[rgba(255,255,255,0.2)]' : 'bg-[rgba(184,143,91,0.12)]'}`}>
              {filters.totalCount}
            </span>
          </button>
          {availableDecades.map((decade) => (
            <button
              key={decade}
              onClick={() => setActiveFilter(decade)}
              className={`px-6 py-2.5 rounded-[var(--radius-pill)] font-ui text-[11px] font-bold uppercase border inline-flex items-center gap-2 ${activeFilter === decade ? 'bg-[var(--clr-gold)] text-[var(--clr-linen)]' : 'bg-[var(--clr-paper)] text-[var(--clr-dust)] border-[var(--clr-aged)]'}`}
            >
              <span>{decade}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] ${activeFilter === decade ? 'bg-[rgba(255,255,255,0.2)]' : 'bg-[rgba(184,143,91,0.12)]'}`}>
                {filters.decadeCounts?.[decade] ?? 0}
              </span>
            </button>
          ))}
          {filters.undatedCount > 0 && (
            <button
              onClick={() => setActiveFilter(UNDATED)}
              className={`px-6 py-2.5 rounded-[var(--radius-pill)] font-ui text-[11px] font-bold uppercase border inline-flex items-center gap-2 ${activeFilter === UNDATED ? 'bg-[var(--clr-gold)] text-[var(--clr-linen)]' : 'bg-[var(--clr-paper)] text-[var(--clr-dust)] border-[var(--clr-aged)]'}`}
            >
              <span>{UNDATED}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] ${activeFilter === UNDATED ? 'bg-[rgba(255,255,255,0.2)]' : 'bg-[rgba(184,143,91,0.12)]'}`}>
                {filters.undatedCount}
              </span>
            </button>
          )}
        </div>
      </div>

      <div className="relative max-w-[1000px] mx-auto w-full px-4 pb-40 z-10">
        <div className="absolute left-[36px] md:left-1/2 top-0 bottom-0 w-[4px] bg-[var(--clr-aged)] -translate-x-1/2 z-0 rounded-full shadow-inner" />

        {sectionCount > 0 ? (
          sections.map((section, sectionIndex) => (
            <div key={section.label} className={sectionIndex === 0 ? 'relative mb-32' : 'relative mb-32'}>
              <div className="flex items-center justify-start md:justify-center mb-20 relative z-20">
                <div className="w-[20px] h-[20px] bg-[var(--clr-gold)] rounded-full border-[3px] border-[var(--clr-parchment)] absolute left-[36px] md:left-1/2 -translate-x-1/2 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                </div>
                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  className="ml-[70px] md:ml-0 md:absolute md:left-[calc(50%+40px)] font-script text-[56px] text-[var(--clr-dust)] leading-[0.5]"
                >
                  {section.label === UNDATED ? '"Undated"' : `"The ${section.label}"`}
                </motion.div>
              </div>

              <div className="space-y-24">
                {section.items.map((item, index) => {
                  const isEven = index % 2 === 0;
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 40 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '-100px' }}
                      key={item.id}
                      className={`relative flex items-center justify-start ${isEven ? 'md:flex-row-reverse md:justify-end' : 'md:flex-row md:justify-end'} z-10 pl-[70px] md:pl-0 w-full group`}
                    >
                      <div className="w-[12px] h-[12px] bg-[var(--clr-parchment)] border-2 border-[var(--clr-aged)] rounded-full absolute left-[36px] md:left-1/2 -translate-x-1/2 group-hover:border-[var(--clr-gold)] group-hover:bg-[var(--clr-gold)] transition-colors z-20" />
                      <div className={`absolute top-1/2 -translate-y-1/2 h-[2px] bg-[var(--clr-aged)] group-hover:bg-[var(--clr-gold)] w-[40px] md:w-[60px] left-[36px] ${isEven ? 'md:right-1/2 md:left-auto' : 'md:left-1/2'} z-10`} />
                      <div className={`w-full md:w-[calc(50%-80px)] ${isEven ? 'md:pr-0' : 'md:pl-0'}`}>
                        <div
                          onClick={() => setSelectedMemory(item)}
                          className="bg-[var(--clr-linen)] p-5 rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] border border-[var(--clr-aged)] hover:border-[var(--clr-gold)] cursor-pointer hover:-translate-y-1"
                        >
                          <TimelinePreview memory={item} />
                          <h3 className="font-display font-semibold text-[1.375rem] text-[var(--clr-ink)] mb-3">{item.title}</h3>
                          <p className="font-ui text-[14px] text-[var(--clr-dust)] leading-relaxed line-clamp-3">{item.ai_caption}</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-24">
            <p className="font-ui text-[12px] uppercase tracking-[0.24em] text-[var(--clr-dust)]">
              No artifacts found for this era.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
