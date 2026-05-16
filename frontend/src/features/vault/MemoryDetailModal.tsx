import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, CalendarBlank, Faders, MagicWand, DownloadSimple, ShareNetwork, Trash } from '@phosphor-icons/react';
import { sileo } from 'sileo';
import RestorationSlider from '../../components/vault/RestorationSlider';
import { Button } from '../../components/ui/Button';

interface MemoryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  memory: any;
}

export default function MemoryDetailModal({ isOpen, onClose, memory }: MemoryDetailModalProps) {
  if (!memory) return null;

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    sileo.success({ title: "Link Dispatched", description: "Artifact address copied to clipboard." });
  };

  const handleDownload = () => {
    sileo.success({ title: "Archiving", description: "Downloading high-resolution artifact." });
  };

  const handleDelete = () => {
    sileo.error({ title: "Artifact Expunged", description: "Memory removed from the current wing." });
    onClose();
  };

  const peopleList = memory.people && memory.people.length > 0
    ? memory.people
    : ['Abebe Kebede', 'Fatima Haile'];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-[clamp(16px,4vw,64px)]">
          <motion.div 
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(12px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 bg-[rgba(20,18,17,0.85)]"
            onClick={onClose}
          />

          <motion.div 
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[1200px] h-[90vh] bg-[var(--clr-parchment)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] border border-[rgba(184,143,91,0.3)] overflow-hidden flex flex-col md:flex-row z-10"
          >
            <div className="w-full md:w-[60%] h-1/2 md:h-full bg-[var(--clr-soot)] relative flex flex-col p-[var(--space-6)]">
              <div className="flex-1 flex items-center justify-center relative">
                {memory.restoredUrl ? (
                  <RestorationSlider originalSrc={memory.url} restoredSrc={memory.restoredUrl} />
                ) : (
                  <img src={memory.url} alt={memory.title} className="max-w-full max-h-full object-contain drop-shadow-2xl border-4 border-white/10 rounded-sm" />
                )}
              </div>
            </div>

            <div className="w-full md:w-[40%] h-1/2 md:h-full bg-[var(--clr-linen)] overflow-y-auto no-scrollbar p-[var(--space-8)] border-l border-[var(--clr-aged)] relative">
              <button 
                onClick={onClose}
                className="absolute top-6 right-6 w-10 h-10 rounded-full bg-[var(--clr-paper)] border border-[var(--clr-aged)] flex items-center justify-center text-[var(--clr-ink)] hover:text-[var(--clr-gold)] hover:border-[var(--clr-gold)] transition-colors"
              >
                <X size={20} />
              </button>

              <p className="font-ui text-[11px] uppercase tracking-widest text-[var(--clr-gold)] mb-2">Exhibit Details</p>
              <h2 className="font-display font-semibold text-[2rem] text-[var(--clr-ink)] leading-tight mb-1">
                {memory.title}
              </h2>
              <p className="font-script text-[44px] text-[var(--clr-dust)] leading-[0.5] mb-8">
                "{memory.date}"
              </p>

              <div className="w-full h-[1px] bg-[var(--clr-gold)] opacity-30 mb-8" />

              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3 text-[var(--clr-dust)] font-ui text-[14px]">
                  <CalendarBlank size={20} className="text-[var(--clr-gold)]" />
                  <span>{memory.date}</span>
                </div>
                <div className="flex items-center gap-3 text-[var(--clr-dust)] font-ui text-[14px]">
                  <MapPin size={20} className="text-[var(--clr-gold)]" />
                  <span>{memory.location}</span>
                </div>
                <div className="flex items-center gap-3 text-[var(--clr-dust)] font-ui text-[14px]">
                  <Faders size={20} className="text-[var(--clr-gold)]" />
                  <span>Canon AE-1 &middot; f/2.8 &middot; 1/250s (From EXIF)</span>
                </div>
              </div>

              <div className="bg-[var(--clr-paper)] border-l-4 border-[var(--clr-gold)] p-4 rounded-r-[var(--radius-md)] mb-8">
                <div className="flex items-center gap-2 mb-2 text-[var(--clr-ink)] font-semibold font-ui text-[12px] uppercase tracking-widest">
                  <MagicWand size={16} className="text-[var(--clr-gold)]" /> AI Caption
                </div>
                <p className="font-ui text-[14px] text-[var(--clr-dust)] leading-relaxed italic">
                  "{memory.aiCaption || "A nostalgic family gathering outdoors in warm sunlight, sitting on a blanket on the grass."}"
                </p>
              </div>

              <div className="mb-8">
                <p className="font-ui text-[11px] uppercase tracking-widest text-[var(--clr-gold)] mb-3">People In This Memory</p>
                <div className="flex flex-wrap gap-2">
                  {peopleList.map((person: string) => (
                    <div key={person} className="inline-flex items-center gap-2 pr-3 py-1 bg-[var(--clr-paper)] border border-[var(--clr-aged)] rounded-full">
                      <img src={`https://ui-avatars.com/api/?name=${person.replace(' ', '+')}&background=B88F5B&color=fff`} alt={person} className="w-6 h-6 rounded-full" />
                      <span className="font-ui text-[11px] font-semibold text-[var(--clr-ink)]">{person}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-3 mt-auto pt-8 border-t border-[var(--clr-aged)]">
                <Button variant="primary" onClick={handleShare} className="flex-1 text-[10px] px-0"><ShareNetwork size={16} /> Share</Button>
                <Button variant="ghost" onClick={handleDownload} className="flex-1 text-[10px] px-0"><DownloadSimple size={16} /> Save</Button>
                <Button variant="danger" onClick={handleDelete} className="px-4"><Trash size={16} /></Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}