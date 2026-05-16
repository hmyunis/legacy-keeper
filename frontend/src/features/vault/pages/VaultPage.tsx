import { useState, useRef, Suspense, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadSimple, MagicWand, X, ArrowRight, CheckCircle,
  Binoculars, Vault as VaultIcon, MagnifyingGlass
} from '@phosphor-icons/react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Text, Float, OrbitControls, useTexture, SpotLight, Grid } from '@react-three/drei';
import { sileo } from 'sileo';
import * as THREE from 'three';

import { Button } from '../../../components/ui/Button';
import MemoryCard from '../components/MemoryCard';
import { Breadcrumbs } from '../../../components/ui/Breadcrumbs';
import { useVaultClusters } from '../hooks/useVault';
import type { VaultMemory, VaultCluster } from '../types';

const ORBIT_RADIUS = 16;

function Memory3DFrame({ memory, position, isFaded, onClick }: { memory: VaultMemory; position: [number, number, number]; isFaded: boolean; onClick: (memory: VaultMemory) => void; }) {
  const meshRef = useRef<THREE.Group>(null);
  const texture = useTexture(memory.url);
  const [hovered, setHovered] = useState(false);

  useFrame((_, delta) => {
    if (meshRef.current) {
      const targetScale = isFaded ? 0.001 : (hovered ? 1.08 : 1);
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 8 * delta);
    }
  });

  return (
    <Float speed={hovered ? 0.5 : 2} rotationIntensity={0.05} floatIntensity={0.1}>
      <group
        ref={meshRef}
        position={position}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'auto'; }}
        onClick={(e) => { e.stopPropagation(); onClick(memory); }}
      >
        <mesh castShadow receiveShadow>
          <boxGeometry args={[2.6, 3.2, 0.05]} />
          <meshStandardMaterial color="#F7F4EF" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.3, 0.028]}>
          <planeGeometry args={[2.2, 2.2]} />
          <meshBasicMaterial map={texture} toneMapped={false} />
        </mesh>
        <Text position={[0, -1.1, 0.028]} fontSize={0.16} color="#141211" font="/fonts/Montserrat-Regular.ttf" anchorX="center" anchorY="middle" maxWidth={2.2} textAlign="center" letterSpacing={0.05}>
          {memory.title.toUpperCase()}
        </Text>
      </group>
    </Float>
  );
}

function OrbitingCluster({ cluster, radius, isFaded, onSelect }: { cluster: VaultCluster; radius: number; isFaded: boolean; onSelect: (memory: VaultMemory) => void; }) {
  const x = Math.sin(cluster.angle) * radius;
  const z = Math.cos(cluster.angle) * radius;

  const ROWS = 2;
  const count = cluster.memories.length;
  const cols = Math.ceil(count / ROWS);
  const SPACING_X = 2.9;
  const SPACING_Y = 3.6;

  return (
    <group position={[x, 0, z]} rotation={[0, cluster.angle, 0]}>
      {!isFaded && <SpotLight position={[0, 5, 4]} angle={0.9} penumbra={0.6} intensity={4} color="#D4A96A" distance={20} />}
      {!isFaded && (
        <Text position={[0, 2.6, 0]} fontSize={0.5} color="#B88F5B" font="/fonts/Montserrat-Regular.ttf" anchorX="center" anchorY="middle" letterSpacing={0.15}>
          {cluster.name.toUpperCase()}
        </Text>
      )}
      {cluster.memories.map((mem, i) => {
        const r = i % ROWS;
        const c = Math.floor(i / ROWS);
        const xOffset = -((cols - 1) * SPACING_X) / 2 + c * SPACING_X;
        const yOffset = ((ROWS - 1) * SPACING_Y) / 2 - r * SPACING_Y;
        return <Memory3DFrame key={mem.id} memory={mem} position={[xOffset, yOffset, 0]} isFaded={isFaded} onClick={onSelect} />;
      })}
    </group>
  );
}

function VaultScene({ clusters, onSelectMemory, activeCategory }: { clusters: VaultCluster[]; onSelectMemory: (mem: VaultMemory) => void; activeCategory: string; }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (activeCategory !== 'All' && groupRef.current) {
      const targetAngle = clusters.find(c => c.name === activeCategory)?.angle || 0;
      let diff = -targetAngle - groupRef.current.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      groupRef.current.rotation.y += diff * 3 * delta;
    }
  });

  return (
    <>
      <fog attach="fog" args={['#141211', 12, 45]} />
      <ambientLight intensity={0.6} />
      <Environment preset="city" />
      <Grid position={[0, -8, 0]} args={[100, 100]} cellSize={1} cellThickness={0.5} cellColor="#B88F5B" sectionSize={5} sectionThickness={1} sectionColor="#D4A96A" fadeDistance={50} fadeStrength={2} opacity={0.15} transparent />
      <group ref={groupRef}>
        {clusters.map((cluster) => (
          <OrbitingCluster key={cluster.name} cluster={cluster} radius={ORBIT_RADIUS} onSelect={onSelectMemory} isFaded={activeCategory !== 'All' && activeCategory !== cluster.name} />
        ))}
      </group>
      <OrbitControls enablePan={false} enableZoom={true} maxDistance={35} minDistance={6} autoRotate={activeCategory === 'All'} autoRotateSpeed={0.4} maxPolarAngle={Math.PI / 2 - 0.05} />
    </>
  );
}

export default function VaultPage() {
  const { data: vaultClusters } = useVaultClusters();

  const [viewMode, setViewMode] = useState<'3D' | '2D'>('3D');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<any[]>([]);
  const [showAIReviewBanner, setShowAIReviewBanner] = useState(false);
  const [isReviewPanelOpen, setIsReviewPanelOpen] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<VaultMemory | null>(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const categories = ['All', ...vaultClusters.map(c => c.name)];

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'g') {
        const next = viewMode === '3D' ? '2D' : '3D';
        setViewMode(next);
        sileo.info({ title: "Perspective Switched", description: `Now viewing in ${next === '3D' ? 'Orbital' : 'Archive'} mode.` });
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [viewMode]);

  const allMemories = useMemo(() => vaultClusters.flatMap(c => c.memories), [vaultClusters]);
  const filteredMemories = useMemo(() => {
    return allMemories.filter(m => {
      const clusterMatch = activeCategory === 'All' || vaultClusters.find(c => c.name === activeCategory)?.memories.includes(m);
      const searchMatch = !searchQuery || `${m.title} ${m.location} ${m.caption} ${m.tags.join(' ')}`.toLowerCase().includes(searchQuery.toLowerCase());
      return clusterMatch && searchMatch;
    });
  }, [allMemories, activeCategory, searchQuery, vaultClusters]);

  const handleFiles = (files: FileList | File[]) => {
    const newItems = Array.from(files).map((file, i) => ({ id: `up-${Date.now()}-${i}`, name: file.name, size: (file.size / (1024 * 1024)).toFixed(1) + ' MB', progress: 0, status: 'PROCESSING' }));
    setUploadQueue(prev => [...prev, ...newItems]);
    newItems.forEach(item => {
      let prog = 0;
      const interval = setInterval(() => {
        prog += 15;
        if (prog >= 100) {
          clearInterval(interval);
          setUploadQueue(curr => curr.map(q => q.id === item.id ? { ...q, progress: 100, status: 'READY' } : q));
          setShowAIReviewBanner(true);
        } else {
          setUploadQueue(curr => curr.map(q => q.id === item.id ? { ...q, progress: prog } : q));
        }
      }, 200);
    });
  };

  const vaultHeader = (
    <div className={`flex flex-col ${viewMode === '3D' ? 'pointer-events-none' : ''}`}>
      <div className={viewMode === '3D' ? 'pointer-events-auto' : ''}><Breadcrumbs /></div>
      <div className="px-[clamp(24px,5vw,80px)] flex flex-col md:flex-row justify-between items-start pb-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className={viewMode === '3D' ? 'pointer-events-auto' : ''}>
          <div className="inline-flex items-center gap-2 px-4 py-1 bg-[rgba(184,143,91,0.15)] border border-[rgba(184,143,91,0.3)] rounded-full text-[var(--clr-gold)] font-ui text-[10px] uppercase font-bold tracking-[0.2em] mb-4 shadow-[var(--shadow-md)]">
            <VaultIcon size={14} weight="fill" /> Core Repository
          </div>
          <h1 className="font-display font-semibold text-[3.5rem] text-[var(--clr-linen)] tracking-widest uppercase leading-none drop-shadow-2xl">The Archive</h1>
          <p className="font-script text-[48px] text-[var(--clr-gold)] leading-[1] mt-4 drop-shadow-md">&ldquo;{allMemories.length} exhibits curated&rdquo;</p>
        </motion.div>
        <div className={`mt-6 md:mt-0 flex flex-wrap items-center gap-4 ${viewMode === '3D' ? 'pointer-events-auto' : ''}`}>
          <div className="flex bg-[rgba(20,18,17,0.6)] backdrop-blur-md p-1 rounded-full border border-[rgba(184,143,91,0.3)] shadow-inner">
            <button onClick={() => setViewMode('3D')} className={`px-5 py-2 rounded-full text-[11px] font-bold tracking-widest uppercase transition-all ${viewMode === '3D' ? 'bg-[var(--clr-gold)] text-black shadow-md' : 'text-[var(--clr-fog)] hover:text-white'}`}>Orbit</button>
            <button onClick={() => setViewMode('2D')} className={`px-5 py-2 rounded-full text-[11px] font-bold tracking-widest uppercase transition-all ${viewMode === '2D' ? 'bg-[var(--clr-gold)] text-black shadow-md' : 'text-[var(--clr-fog)] hover:text-white'}`}>Grid</button>
          </div>
          <Button variant="primary" onClick={() => fileInputRef.current?.click()} className="shadow-[var(--shadow-gold)] px-6 md:px-10">
            <UploadSimple size={20} weight="bold" /> <span className="hidden md:inline">UPLOAD MEMORY</span><span className="md:hidden">UPLOAD</span>
          </Button>
          <input type="file" ref={fileInputRef} className="hidden" multiple onChange={(e) => e.target.files && handleFiles(e.target.files)} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-[100vh] w-full bg-[var(--clr-charcoal)] relative overflow-hidden flex flex-col" onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files) handleFiles(e.dataTransfer.files); }}>
      {viewMode === '3D' && (
        <>
          <div className="absolute inset-0 z-0">
            <Suspense fallback={<div className="w-full h-full flex items-center justify-center bg-[var(--clr-charcoal)]"><p className="font-script text-[44px] text-[var(--clr-gold)] animate-pulse">"Unlocking the Archive..."</p></div>}>
              <Canvas camera={{ position: [0, 5, 22], fov: 50, near: 0.1, far: 100 }}>
                <VaultScene clusters={vaultClusters} onSelectMemory={setSelectedMemory} activeCategory={activeCategory} />
              </Canvas>
            </Suspense>
          </div>
          <div className="absolute top-0 left-0 right-0 z-20 pt-[90px]">{vaultHeader}</div>
        </>
      )}

      <AnimatePresence>
        {viewMode === '2D' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-10 overflow-y-auto no-scrollbar bg-[var(--clr-charcoal)]">
            <div className="fixed inset-0 z-0 pointer-events-none opacity-10"><svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="grid2d" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="#B88F5B" strokeWidth="0.5"/></pattern></defs><rect width="100%" height="100%" fill="url(#grid2d)" /></svg></div>
            <div className="relative z-10 pt-[90px] w-full">{vaultHeader}</div>
            <div className="relative z-10 px-[clamp(24px,5vw,80px)] max-w-[var(--max-width)] mx-auto w-full mb-12 flex flex-col gap-6">
              <div className="flex flex-col lg:flex-row gap-6 items-center justify-between bg-[rgba(30,26,23,0.8)] backdrop-blur-xl border border-[rgba(184,143,91,0.2)] p-4 rounded-3xl shadow-2xl">
                <div className="relative w-full lg:w-[350px]">
                  <MagnifyingGlass className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--clr-gold)]" size={20} />
                  <input type="text" placeholder="Search exhibits..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-[var(--clr-charcoal)] border border-[rgba(184,143,91,0.4)] rounded-full pl-12 pr-6 py-3.5 text-[var(--clr-linen)] font-ui text-[14px] outline-none focus:border-[var(--clr-gold)] shadow-inner" />
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                  {categories.map((cat) => (
                    <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-5 py-3 rounded-full font-ui text-[11px] font-bold uppercase border whitespace-nowrap ${activeCategory === cat ? 'bg-[var(--clr-gold)] text-black border-[var(--clr-gold)]' : 'bg-[var(--clr-charcoal)] text-[var(--clr-fog)] border-[rgba(184,143,91,0.2)]'}`}>{cat}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="relative z-10 px-[clamp(24px,5vw,80px)] pb-32 max-w-[var(--max-width)] mx-auto columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-[var(--space-6)] space-y-[var(--space-6)]">
              {filteredMemories.map((mem) => (
                <div key={mem.id} className="break-inside-avoid shadow-lg rounded-2xl cursor-pointer" onClick={() => setSelectedMemory(mem)}>
                  <MemoryCard memory={{ url: mem.url as string, title: mem.title, location: mem.location, date: mem.date, tags: mem.tags.slice(0, 3) }} />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewMode === '3D' && (
          <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[40] flex items-center gap-2 p-2 bg-[rgba(20,18,17,0.85)] backdrop-blur-xl border border-[rgba(184,143,91,0.3)] rounded-full shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-x-auto max-w-[90vw] no-scrollbar pointer-events-auto">
            <div className="flex items-center text-[var(--clr-gold)] px-4 opacity-50 shrink-0"><Binoculars size={20} weight="fill" /></div>
            {categories.map((cat) => (
              <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-6 py-3 rounded-full font-ui text-[11px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeCategory === cat ? 'bg-[var(--clr-gold)] text-black shadow-[var(--shadow-gold)] scale-105' : 'text-[var(--clr-fog)] hover:text-white hover:bg-[rgba(255,255,255,0.05)]'}`}>{cat === 'All' ? 'All Eras' : cat}</button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}