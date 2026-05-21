import { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { ScrollControls } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from '@tanstack/react-router';
import MuseumHall, { type ExhibitData } from '../features/museum/MuseumHall';
import MemoryDetailModal from '../features/vault/MemoryDetailModal';
import { useVaultMemories } from '../features/vault/hooks/useVault';
import { useAuthStore } from '../stores/authStore';

export default function Museum() {
  const [activeDecade, setActiveDecade] = useState('1970s');
  const [selectedExhibit, setSelectedExhibit] = useState<any | null>(null);
  const { data: memories = [] } = useVaultMemories();
  const navigate = useNavigate();
  const currentUser = useAuthStore(s => s.currentUser);
  const avatarUrl = currentUser?.avatar || `https://ui-avatars.com/api/?name=${(currentUser?.fullName || 'Curator').replace(/ /g, '+')}&background=B88F5B&color=fff`;
  const roleLabel = currentUser?.role || 'CURATOR';

  const leaveMuseum = () => {
    const referrerPath = document.referrer ? new URL(document.referrer).pathname : '';
    if (referrerPath && referrerPath !== '/') {
      window.history.back();
      return;
    }
    navigate({ to: currentUser?.vaultId ? '/dashboard' : '/vault' });
  };

  const exhibits: ExhibitData[] = memories.map((mem: any, index: number) => ({
      id: mem.id,
      url: mem.url || mem.original_file,
      title: mem.title,
      location: mem.location || '',
      year: mem.year || mem.date?.split('-')[0] || '',
      position: [index % 2 === 0 ? -2.5 : 2.5, 0, -(index * 4)] as [number, number, number],
      faces: mem.people?.map((p: string) => ({ name: p, avatar: `https://ui-avatars.com/api/?name=${p}&background=B88F5B&color=fff` })) || []
  }));

  return (
    <div className="w-screen h-screen bg-[#0E0C0B] overflow-hidden fixed inset-0 z-50 text-[var(--clr-linen)] font-ui">
      <MemoryDetailModal isOpen={!!selectedExhibit} onClose={() => setSelectedExhibit(null)} memory={selectedExhibit} />

      <Suspense fallback={<div className="flex items-center justify-center h-full w-full"><p className="font-script text-[48px] text-[var(--clr-gold)] animate-pulse">"Lighting the gallery..."</p></div>}>
        <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
          <color attach="background" args={['#0E0C0B']} />
          <ambientLight intensity={0.5} />
          <ScrollControls pages={Math.max(1, exhibits.length / 2)} damping={0.25} distance={1}>
            <MuseumHall onDecadeChange={setActiveDecade} exhibits={exhibits} onSelectExhibit={setSelectedExhibit} />
          </ScrollControls>
        </Canvas>
      </Suspense>

      <div className="absolute top-8 right-8 z-10 pointer-events-auto flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 rounded-full border border-[rgba(184,143,91,0.3)] bg-[rgba(20,18,17,0.55)] px-2 py-1 backdrop-blur-md">
          <img src={avatarUrl} alt="Curator" className="w-8 h-8 rounded-full border border-[var(--clr-gold)] object-cover" />
          <span className="rounded-full bg-[var(--clr-gold)] px-2.5 py-1 font-ui text-[8px] font-black uppercase tracking-[0.14em] text-[var(--clr-charcoal)]">
            {roleLabel}
          </span>
        </div>
        <button onClick={leaveMuseum} className="px-5 py-2 border border-[rgba(184,143,91,0.3)] rounded-full text-[11px] uppercase tracking-widest text-[var(--clr-fog)] hover:text-[var(--clr-linen)] hover:border-[var(--clr-gold)] backdrop-blur-md bg-[rgba(20,18,17,0.5)] cursor-pointer transition-colors">
          LEAVE MUSEUM
        </button>
      </div>

      <div className="absolute top-8 left-8 z-10 pointer-events-none">
        <AnimatePresence mode="wait">
          <motion.div key={activeDecade} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 0.9, y: 0 }} exit={{ opacity: 0, y: 10 }}>
            <h2 className="font-script text-[52px] text-[var(--clr-gold)] leading-none drop-shadow-md">{activeDecade}</h2>
            <p className="text-[11px] uppercase tracking-widest text-[var(--clr-fog)] mt-1 drop-shadow-md">EXHIBIT WING</p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
