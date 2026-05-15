import { Suspense, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { ScrollControls } from '@react-three/drei';
import { Link } from '@tanstack/react-router';
import { motion, AnimatePresence } from 'framer-motion';
import MuseumHall, { type ExhibitData } from '../features/museum/MuseumHall';
import { Button } from '../components/ui/Button';
import MemoryDetailModal from '../features/vault/MemoryDetailModal';

export default function Museum() {
  const [activeDecade, setActiveDecade] = useState('1970s');
  const [selectedExhibit, setSelectedExhibit] = useState<ExhibitData | null>(null);
  const [isDeepDiveOpen, setIsDeepDiveOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isDeepDiveOpen) setIsDeepDiveOpen(false);
        else setSelectedExhibit(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDeepDiveOpen]);

  return (
    <div className="w-screen h-screen bg-[#0E0C0B] overflow-hidden fixed inset-0 z-50 text-[var(--clr-linen)] font-ui">

      <MemoryDetailModal
        isOpen={isDeepDiveOpen}
        onClose={() => setIsDeepDiveOpen(false)}
        memory={selectedExhibit ? {
          ...selectedExhibit,
          date: selectedExhibit.year,
          people: selectedExhibit.faces.map(f => f.name),
          aiCaption: `An immersive view of ${selectedExhibit.title} from the ${activeDecade} wing.`
        } : null}
      />

      <Suspense fallback={
        <div className="flex items-center justify-center h-full w-full">
          <p className="font-script text-[48px] text-[var(--clr-gold)] animate-pulse">"Lighting the gallery..."</p>
        </div>
      }>
        <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
          <color attach="background" args={['#0E0C0B']} />
          <ambientLight intensity={0.5} />
          <ScrollControls pages={4} damping={0.25} distance={1}>
            <MuseumHall
              onDecadeChange={setActiveDecade}
              onSelectExhibit={setSelectedExhibit}
            />
          </ScrollControls>
        </Canvas>
      </Suspense>

      <div className="absolute top-8 right-8 z-10 pointer-events-auto">
        <Link to="/" className="px-5 py-2 border border-[rgba(184,143,91,0.3)] rounded-full text-[11px] uppercase tracking-widest text-[var(--clr-fog)] hover:text-[var(--clr-linen)] hover:border-[var(--clr-gold)] transition-colors backdrop-blur-md bg-[rgba(20,18,17,0.5)]">
          LEAVE MUSEUM
        </Link>
      </div>

      <div className="absolute top-8 left-8 z-10 pointer-events-none">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeDecade}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 0.9, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.4 }}
          >
            <h2 className="font-script text-[52px] text-[var(--clr-gold)] leading-none drop-shadow-md">{activeDecade}</h2>
            <p className="text-[11px] uppercase tracking-widest text-[var(--clr-fog)] mt-1 drop-shadow-md">EXHIBIT WING</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="absolute bottom-8 w-full flex justify-center z-10 pointer-events-none">
        <div className="bg-[rgba(20,18,17,0.82)] backdrop-blur-md border border-[rgba(184,143,91,0.2)] rounded-full px-4 py-2 flex gap-2 pointer-events-auto shadow-2xl">
          {['1950s', '1960s', '1970s', '1980s'].map(dec => (
            <button
              key={dec}
              className={`px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-widest transition-colors ${activeDecade === dec ? 'bg-[rgba(184,143,91,0.15)] text-[var(--clr-gold)]' : 'text-[var(--clr-fog)] hover:text-[var(--clr-linen)]'}`}
            >
              {dec}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {selectedExhibit && !isDeepDiveOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
              animate={{ opacity: 1, backdropFilter: 'blur(12px)' }}
              exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 bg-[rgba(14,12,11,0.7)]"
              onClick={() => setSelectedExhibit(null)}
            />

            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-[480px] bg-[var(--clr-charcoal)] border border-[rgba(184,143,91,0.35)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] overflow-hidden flex flex-col z-10"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden">
                <img src={selectedExhibit.url} className="w-full h-full object-cover" alt={selectedExhibit.title} />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--clr-charcoal)] via-transparent to-transparent opacity-90" />
              </div>

              <div className="p-8 relative -mt-10">
                <h2 className="font-display font-bold text-[2rem] text-[var(--clr-linen)] leading-none mb-1 drop-shadow-md">{selectedExhibit.title}</h2>
                <p className="font-ui text-[11px] uppercase tracking-widest text-[var(--clr-gold)] mb-6 drop-shadow-md">
                  {selectedExhibit.location} &middot; {selectedExhibit.year}
                </p>

                <div className="flex flex-wrap gap-2 mb-8">
                  {selectedExhibit.faces.map((face, i) => (
                    <div key={i} className="inline-flex items-center gap-2 pr-3 py-1 bg-[rgba(255,255,255,0.05)] border border-[rgba(184,143,91,0.2)] rounded-full">
                      <img src={face.avatar} className="w-6 h-6 rounded-full border border-[var(--clr-gold)]" alt={face.name} />
                      <span className="font-ui text-[11px] font-semibold text-[var(--clr-linen)]">{face.name}</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-4">
                  <Button variant="primary" className="flex-1 text-[11px] px-0 shadow-[var(--shadow-gold)]" onClick={() => setIsDeepDiveOpen(true)}>OPEN MEMORY</Button>
                  <Button variant="ghost" onClick={() => setSelectedExhibit(null)} className="flex-1 text-[11px] px-0">BACK TO HALL</Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}