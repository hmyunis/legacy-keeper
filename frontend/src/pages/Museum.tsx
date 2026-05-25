import { Suspense, useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from '@tanstack/react-router';
import { FunnelSimple, HouseLine } from '@phosphor-icons/react';
import MuseumHall, { type ExhibitData } from '../features/museum/MuseumHall';
import MemoryDetailModal from '../features/vault/MemoryDetailModal';
import { useVaultMemories } from '../features/vault/hooks/useVault';
import { useAuthStore } from '../stores/authStore';
import { appEnv } from '../services/env';

const MAX_INSTALLED_EXHIBITS = 12;
const WALL_OFFSETS = [-6.35, -2.15, 2.15, 6.35];
const WALL_DISTANCE = 10.35;
const DEFAULT_EXHIBIT_TEXTURE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1200">
      <defs>
        <linearGradient id="paper" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#d9caa9"/>
          <stop offset="0.55" stop-color="#9f7a48"/>
          <stop offset="1" stop-color="#2a201b"/>
        </linearGradient>
      </defs>
      <rect width="900" height="1200" fill="#171311"/>
      <rect x="72" y="72" width="756" height="1056" rx="28" fill="url(#paper)"/>
      <path d="M126 876 C 276 708, 396 742, 522 612 S 708 456, 786 520 L 786 1062 L 126 1062 Z" fill="#251c18" opacity="0.72"/>
      <circle cx="656" cy="282" r="86" fill="#d4a96a" opacity="0.42"/>
      <path d="M164 174 H736 M164 224 H552 M164 996 H736" stroke="#f4d59b" stroke-width="12" stroke-linecap="round" opacity="0.42"/>
    </svg>
  `);

function decadeForMemory(memory: any) {
  const rawYear = String(memory.year || memory.date?.split('-')[0] || '');
  const match = rawYear.match(/\d{4}/);
  return match ? `${match[0].substring(0, 3)}0s` : 'Undated';
}

function yearForMemory(memory: any) {
  const rawYear = String(memory.year || memory.date?.split('-')[0] || '');
  return rawYear.match(/\d{4}/)?.[0] || '';
}

function resolveMemoryImageUrl(memory: any) {
  const rawUrl = memory.restoredUrl || memory.url || memory.original_file || DEFAULT_EXHIBIT_TEXTURE;
  if (!rawUrl || rawUrl.startsWith('data:') || rawUrl.startsWith('blob:') || /^https?:\/\//i.test(rawUrl)) {
    return rawUrl || DEFAULT_EXHIBIT_TEXTURE;
  }

  try {
    const apiOrigin = /^https?:\/\//i.test(appEnv.apiBaseUrl)
      ? new URL(appEnv.apiBaseUrl).origin
      : window.location.origin;
    return new URL(rawUrl, apiOrigin).toString();
  } catch {
    return rawUrl;
  }
}

function positionForIndex(index: number): Pick<ExhibitData, 'position' | 'rotation'> {
  const side = Math.floor(index / WALL_OFFSETS.length) % 4;
  const offset = WALL_OFFSETS[index % WALL_OFFSETS.length];
  const tier = Math.floor(index / (WALL_OFFSETS.length * 4));
  const y = tier % 2 === 0 ? 0.72 : 0.88;

  if (side === 0) {
    return { position: [offset, y, -WALL_DISTANCE], rotation: [0, 0, 0] };
  }
  if (side === 1) {
    return { position: [WALL_DISTANCE, y, offset], rotation: [0, -Math.PI / 2, 0] };
  }
  if (side === 2) {
    return { position: [-offset, y, WALL_DISTANCE], rotation: [0, Math.PI, 0] };
  }
  return { position: [-WALL_DISTANCE, y, -offset], rotation: [0, Math.PI / 2, 0] };
}

function canUseWebGL() {
  if (typeof document === 'undefined') return false;

  const canvas = document.createElement('canvas');
  return Boolean(
    canvas.getContext('webgl2') ||
    canvas.getContext('webgl') ||
    canvas.getContext('experimental-webgl')
  );
}

function GalleryCard({
  exhibit,
  onSelect,
}: {
  exhibit: ExhibitData;
  onSelect: (exhibit: ExhibitData) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(exhibit)}
      className="group overflow-hidden rounded-[var(--radius-lg)] border border-[rgba(184,143,91,0.24)] bg-[rgba(20,18,17,0.82)] text-left shadow-[0_16px_48px_rgba(0,0,0,0.32)] transition-all hover:-translate-y-1 hover:border-[rgba(184,143,91,0.45)] hover:shadow-[0_20px_64px_rgba(0,0,0,0.42)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[#171311]">
        <img
          src={exhibit.url}
          alt={exhibit.title}
          className="h-full w-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-105 group-hover:opacity-100"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#100D0C] via-transparent to-transparent opacity-90" />
      </div>
      <div className="p-4">
        <p className="font-ui text-[9px] uppercase tracking-[0.2em] text-[var(--clr-gold)]">
          {exhibit.year || 'Undated'}
        </p>
        <h3 className="mt-2 font-display text-[1.2rem] uppercase tracking-wide text-[var(--clr-linen)]">
          {exhibit.title}
        </h3>
        <p className="mt-1 line-clamp-2 font-ui text-[12px] leading-relaxed text-[var(--clr-fog)]">
          {exhibit.location || 'No location set'}
        </p>
      </div>
    </button>
  );
}

export default function Museum() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedMemory, setSelectedMemory] = useState<any | null>(null);
  const [isWebglAvailable] = useState(() => canUseWebGL());
  const { data: memories = [], isLoading } = useVaultMemories();
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

  const decades = useMemo(() => {
    const values = new Set<string>();
    memories.forEach((memory: any) => values.add(decadeForMemory(memory)));
    return Array.from(values).sort((a, b) => {
      if (a === 'Undated') return 1;
      if (b === 'Undated') return -1;
      return a.localeCompare(b);
    });
  }, [memories]);

  const filteredMemories = useMemo(() => {
    if (activeFilter === 'All') return memories;
    return memories.filter((memory: any) => decadeForMemory(memory) === activeFilter);
  }, [activeFilter, memories]);

  const exhibits: ExhibitData[] = useMemo(() => filteredMemories.map((mem: any, index: number) => ({
    id: String(mem.id),
    url: resolveMemoryImageUrl(mem),
    title: mem.title || 'Untitled Exhibit',
    location: mem.location || '',
    year: yearForMemory(mem),
    faces: mem.people?.map((p: string) => ({ name: p, avatar: `https://ui-avatars.com/api/?name=${p}&background=B88F5B&color=fff` })) || [],
    ...positionForIndex(index),
  })), [filteredMemories]);

  const activeLabel = activeFilter === 'All' ? 'Complete Collection' : activeFilter;
  const installedCount = Math.min(exhibits.length, MAX_INSTALLED_EXHIBITS);
  const sharedMemoryId = new URLSearchParams(window.location.search).get('memoryId');

  useEffect(() => {
    if (!sharedMemoryId || memories.length === 0) return;

    const sharedMemory = memories.find((memory: any) => String(memory.id) === sharedMemoryId);
    if (sharedMemory) {
      setSelectedMemory((current: any | null) => (current && String(current.id) === sharedMemoryId ? current : sharedMemory));
    }
  }, [memories, sharedMemoryId]);

  return (
    <div className="w-screen h-screen bg-[#100D0C] overflow-hidden fixed inset-0 z-50 text-[var(--clr-linen)] font-ui">
      <MemoryDetailModal isOpen={!!selectedMemory} onClose={() => setSelectedMemory(null)} memory={selectedMemory} onUpdate={setSelectedMemory} />

      {isWebglAvailable ? (
        <Suspense fallback={<div className="flex items-center justify-center h-full w-full"><p className="font-script text-[48px] text-[var(--clr-gold)] animate-pulse">"Lighting the gallery..."</p></div>}>
          <Canvas
            shadows
            dpr={[1, 1.6]}
            camera={{ position: [0, 1.05, 8.2], fov: 58 }}
            gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          >
            <color attach="background" args={['#100D0C']} />
            <ambientLight intensity={0.28} />
            <directionalLight position={[4, 5, 3]} intensity={1.1} color="#F4D59B" castShadow shadow-mapSize={[2048, 2048]} />
            <pointLight position={[-4, 1.6, 3]} intensity={0.7} distance={7} color="#8FA98A" />
            <pointLight position={[4, 1.2, -3]} intensity={0.55} distance={7} color="#B88F5B" />
            <MuseumHall exhibits={exhibits} onSelectExhibit={(exhibit) => {
              const memory = filteredMemories.find((item: any) => String(item.id) === exhibit.id);
              setSelectedMemory(memory || exhibit);
            }} />
            <OrbitControls
              makeDefault
              target={[0, 0.1, 0]}
              enableDamping
              dampingFactor={0.07}
              rotateSpeed={0.48}
              zoomSpeed={0.7}
              enablePan={false}
              minDistance={3.1}
              maxDistance={9.25}
              minPolarAngle={Math.PI * 0.24}
              maxPolarAngle={Math.PI * 0.58}
            />
          </Canvas>
        </Suspense>
      ) : (
        <div className="absolute inset-0 overflow-y-auto px-4 pb-28 pt-20 sm:px-6">
          <div className="mx-auto max-w-[1200px]">
            <div className="mb-6 rounded-[var(--radius-lg)] border border-[rgba(184,143,91,0.24)] bg-[rgba(20,18,17,0.84)] px-5 py-4 shadow-[0_16px_48px_rgba(0,0,0,0.32)] backdrop-blur-md">
              <p className="font-display text-[1.1rem] uppercase tracking-wide text-[var(--clr-gold)]">
                3D gallery unavailable in this browser
              </p>
              <p className="mt-1 font-ui text-[12px] leading-relaxed text-[var(--clr-fog)]">
                WebGL is blocked or disabled here, so the museum is showing a static gallery instead.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {exhibits.map((exhibit) => (
                <GalleryCard
                  key={exhibit.id}
                  exhibit={exhibit}
                  onSelect={(selected) => {
                    const memory = filteredMemories.find((item: any) => String(item.id) === selected.id);
                    setSelectedMemory(memory || selected);
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {(isLoading || (!isLoading && memories.length === 0)) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-x-4 top-1/2 z-10 mx-auto flex max-w-[520px] -translate-y-1/2 flex-col items-center border border-[rgba(184,143,91,0.32)] bg-[rgba(20,18,17,0.72)] px-6 py-7 text-center shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:px-8"
          >
            <p className="font-display text-[20px] uppercase text-[var(--clr-gold)] sm:text-[24px]">
              {isLoading ? 'Preparing the gallery' : 'No exhibits installed'}
            </p>
            <p className="mt-2 max-w-[420px] text-[12px] leading-relaxed text-[var(--clr-fog)]">
              {isLoading ? 'The room is being arranged from your vault memories.' : 'Add memories to the vault and they will appear here as framed gallery pieces.'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute right-4 top-4 z-10 flex max-w-[calc(100vw-32px)] items-center gap-2 pointer-events-auto sm:right-6 sm:top-6 sm:gap-3">
        <div className="hidden sm:flex items-center gap-2 rounded-full border border-[rgba(184,143,91,0.3)] bg-[rgba(20,18,17,0.62)] px-2 py-1 backdrop-blur-md">
          <img src={avatarUrl} alt="Curator" className="w-8 h-8 rounded-full border border-[var(--clr-gold)] object-cover" />
          <span className="rounded-full bg-[var(--clr-gold)] px-2.5 py-1 font-ui text-[8px] font-black uppercase text-[var(--clr-charcoal)]">
            {roleLabel}
          </span>
        </div>
        <button onClick={leaveMuseum} className="inline-flex items-center gap-2 px-5 py-2 border border-[rgba(184,143,91,0.3)] rounded-full text-[11px] uppercase text-[var(--clr-fog)] hover:text-[var(--clr-linen)] hover:border-[var(--clr-gold)] backdrop-blur-md bg-[rgba(20,18,17,0.58)] cursor-pointer transition-colors">
          <HouseLine size={15} weight="bold" /> Leave
        </button>
      </div>

      <div className="absolute left-4 top-4 z-10 max-w-[calc(100vw-148px)] pointer-events-none sm:left-6 sm:top-6 sm:max-w-[52vw]">
        <AnimatePresence mode="wait">
          <motion.div key={activeLabel} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 0.95, y: 0 }} exit={{ opacity: 0, y: 10 }}>
            <h2 className="truncate font-script text-[34px] leading-none text-[var(--clr-gold)] drop-shadow-md sm:text-[48px]">{activeLabel}</h2>
            <p className="mt-1 text-[10px] uppercase text-[var(--clr-fog)] drop-shadow-md">
              {installedCount} {installedCount === 1 ? 'exhibit' : 'exhibits'} installed
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="absolute bottom-4 left-1/2 z-10 w-[min(920px,calc(100vw-24px))] -translate-x-1/2 rounded-[var(--radius-lg)] border border-[rgba(184,143,91,0.32)] bg-[rgba(20,18,17,0.74)] p-2 shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:bottom-5 sm:w-[min(920px,calc(100vw-32px))]">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[rgba(184,143,91,0.35)] text-[var(--clr-gold)]">
            <FunnelSimple size={17} weight="bold" />
          </div>
          {['All', ...decades].map((decade) => (
            <button
              key={decade}
              onClick={() => setActiveFilter(decade)}
              aria-pressed={activeFilter === decade}
              className={`shrink-0 rounded-full px-4 py-2 font-ui text-[10px] font-black uppercase transition-colors ${activeFilter === decade ? 'bg-[var(--clr-gold)] text-[var(--clr-charcoal)]' : 'border border-[rgba(184,143,91,0.24)] text-[var(--clr-fog)] hover:border-[var(--clr-gold)] hover:text-[var(--clr-linen)]'}`}
            >
              {decade}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
