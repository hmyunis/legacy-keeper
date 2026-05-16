import { useState, useRef, Suspense, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadSimple, MagicWand, X, ArrowRight, CheckCircle,
  Binoculars, Vault as VaultIcon, MagnifyingGlass} from '@phosphor-icons/react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Text, Float, OrbitControls, useTexture, SpotLight, Grid } from '@react-three/drei';
import { sileo } from 'sileo';
import * as THREE from 'three';
import { Button } from '../components/ui/Button';
import { VAULT_MEMORY_CLUSTERS, type VaultMemory } from '../features/vault/vaultMockData';
import MemoryCard from '../components/vault/MemoryCard';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { useUploadMemory } from '../features/vault/hooks/useVault';
import { pollTask } from '../lib/tasks';
import { useQueryClient } from '@tanstack/react-query';

const ORBIT_RADIUS = 16;

function Memory3DFrame({
  memory,
  position,
  isFaded,
  onClick,
}: {
  memory: VaultMemory;
  position: [number, number, number];
  isFaded: boolean;
  onClick: (memory: VaultMemory) => void;
}) {
  const meshRef = useRef<THREE.Group>(null);
  const texture = useTexture(memory.url as string);
  const [hovered, setHovered] = useState(false);

  useFrame((_, delta) => {
    if (meshRef.current) {
      // Scale to zero if faded (filtering via categories), otherwise pop up beautifully
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
        {/* Physical Polaroid Backing */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[2.6, 3.2, 0.05]} />
          <meshStandardMaterial color="#F7F4EF" roughness={0.9} />
        </mesh>
        
        {/* Actual Image (Pushed to Z=0.028 to fix Z-fighting rendering silver) */}
        <mesh position={[0, 0.3, 0.028]}>
          <planeGeometry args={[2.2, 2.2]} />
          <meshBasicMaterial map={texture} toneMapped={false} />
        </mesh>

        {/* Caption */}
        <Text 
          position={[0, -1.1, 0.028]} 
          fontSize={0.16} 
          color="#141211" 
          font="/fonts/Montserrat-Regular.ttf"
          anchorX="center" 
          anchorY="middle" 
          maxWidth={2.2} 
          textAlign="center"
          letterSpacing={0.05}
        >
          {memory.title.toUpperCase()}
        </Text>
      </group>
    </Float>
  );
}

function OrbitingCluster({
  cluster,
  radius,
  isFaded,
  onSelect,
}: {
  cluster: (typeof VAULT_MEMORY_CLUSTERS)[number];
  radius: number;
  isFaded: boolean;
  onSelect: (memory: VaultMemory) => void;
}) {
  const x = Math.sin(cluster.angle) * radius;
  const z = Math.cos(cluster.angle) * radius;
  
  // Arrange elements into two rows within the cluster
  const ROWS = 2;
  const count = cluster.memories.length;
  const cols = Math.ceil(count / ROWS);
  const SPACING_X = 2.9;
  const SPACING_Y = 3.6;

  return (
    <group position={[x, 0, z]} rotation={[0, cluster.angle, 0]}>
      {/* Illuminate the active items */}
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
        
        return (
          <Memory3DFrame
            key={mem.id}
            memory={mem}
            position={[xOffset, yOffset, 0]}
            isFaded={isFaded}
            onClick={onSelect}
          />
        );
      })}
    </group>
  );
}

function VaultScene({ 
  onSelectMemory, 
  activeCategory 
}: { 
  onSelectMemory: (mem: VaultMemory) => void;
  activeCategory: string;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (activeCategory !== 'All' && groupRef.current) {
      // Swivel the entire structure so the chosen cluster directly faces the camera (z-axis)
      const targetAngle = VAULT_MEMORY_CLUSTERS.find(c => c.name === activeCategory)?.angle || 0;
      let diff = -targetAngle - groupRef.current.rotation.y;
      // Resolve shortest angular path
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      groupRef.current.rotation.y += diff * 3 * delta;
    }
  });

  return (
    <>
      <fog attach="fog" args={['#141211', 12, 45]} />
      <ambientLight intensity={0.6} />
      <Environment preset="city" />
      
      <Grid
        position={[0, -8, 0]}
        args={[100, 100]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#B88F5B"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#D4A96A"
        fadeDistance={50}
        fadeStrength={2}
        opacity={0.15}
        transparent
      />

      <group ref={groupRef}>
        {VAULT_MEMORY_CLUSTERS.map((cluster) => (
          <OrbitingCluster 
            key={cluster.name} 
            cluster={cluster} 
            radius={ORBIT_RADIUS} 
            onSelect={onSelectMemory} 
            isFaded={activeCategory !== 'All' && activeCategory !== cluster.name}
          />
        ))}
      </group>
      
      {/* AutoRotate disabled when focusing a specific category */}
      <OrbitControls 
        enablePan={false} 
        enableZoom={true} 
        maxDistance={35} 
        minDistance={6} 
        autoRotate={activeCategory === 'All'} 
        autoRotateSpeed={0.4}
        maxPolarAngle={Math.PI / 2 - 0.05} // Prevent camera from dropping below grid
      />
    </>
  );
}

export default function Vault() {
  const [viewMode, setViewMode] = useState<'3D' | '2D'>('3D');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<any[]>([]);
  const [showAIReviewBanner, setShowAIReviewBanner] = useState(false);
  const [isReviewPanelOpen, setIsReviewPanelOpen] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<VaultMemory | null>(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const categories = ['All', ...VAULT_MEMORY_CLUSTERS.map(c => c.name)];

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'g') {
        const next = viewMode === '3D' ? '2D' : '3D';
        setViewMode(next);
        sileo.info({
          title: "Perspective Switched",
          description: `Now viewing in ${next === '3D' ? 'Orbital' : 'Archive'} mode.`
        });
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [viewMode]);

  const allMemories = useMemo(() => VAULT_MEMORY_CLUSTERS.flatMap(c => c.memories), []);
  const filteredMemories = useMemo(() => {
    return allMemories.filter(m => {
      const clusterMatch = activeCategory === 'All' || VAULT_MEMORY_CLUSTERS.find(c => c.name === activeCategory)?.memories.includes(m);
      const searchMatch = !searchQuery || `${m.title} ${m.location} ${m.caption} ${m.tags.join(' ')}`.toLowerCase().includes(searchQuery.toLowerCase());
      return clusterMatch && searchMatch;
    });
  }, [allMemories, activeCategory, searchQuery]);

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const uploadMutation = useUploadMemory();
    const queryClient = useQueryClient();

    for (const file of fileArray) {
      const tempId = `up-${Date.now()}`;
      setUploadQueue(prev => [...prev, {
        id: tempId,
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
        progress: 10,
        status: 'PROCESSING'
      }]);

      try {
        const { task_id } = await uploadMutation.mutateAsync({ file });

        await sileo.promise(pollTask(task_id), {
          loading: { title: `Processing ${file.name}`, description: "AI is analyzing faces & vibes..." },
          success: (res) => {
            setUploadQueue(curr => curr.map(q => q.id === tempId ? { ...q, progress: 100, status: 'READY' } : q));
            queryClient.invalidateQueries({ queryKey: ['vaultClusters'] });
            return { title: "Preservation Complete", description: `${file.name} is now in the archive.` };
          },
          error: { title: "AI Pipeline Error", description: "Failed to process the image metadata." }
        });

      } catch (err) {
        setUploadQueue(curr => curr.map(q => q.id === tempId ? { ...q, status: 'FAILED' } : q));
      }
    }
  };

  const vaultHeader = (
    <div className={`flex flex-col ${viewMode === '3D' ? 'pointer-events-none' : ''}`}>
      <div className={viewMode === '3D' ? 'pointer-events-auto' : ''}>
        <Breadcrumbs />
      </div>
      <div className="px-[clamp(24px,5vw,80px)] flex flex-col md:flex-row justify-between items-start pb-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className={viewMode === '3D' ? 'pointer-events-auto' : ''}>
          <div className="inline-flex items-center gap-2 px-4 py-1 bg-[rgba(184,143,91,0.15)] border border-[rgba(184,143,91,0.3)] rounded-full text-[var(--clr-gold)] font-ui text-[10px] uppercase font-bold tracking-[0.2em] mb-4 shadow-[var(--shadow-md)]">
            <VaultIcon size={14} weight="fill" /> Core Repository
          </div>
          <h1 className="font-display font-semibold text-[3.5rem] text-[var(--clr-linen)] tracking-widest uppercase leading-none drop-shadow-2xl">The Archive</h1>
          <p className="font-script text-[48px] text-[var(--clr-gold)] leading-[1] mt-4 drop-shadow-md">
            &ldquo;{allMemories.length} exhibits curated&rdquo;
          </p>
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
    <div
      className="h-[100vh] w-full bg-[var(--clr-charcoal)] relative overflow-hidden flex flex-col"
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files) handleFiles(e.dataTransfer.files); }}
    >

      {/* --- 3D ORBIT VIEW --- */}
      {viewMode === '3D' && (
        <>
          <div className="absolute inset-0 z-0">
            <Suspense fallback={
              <div className="w-full h-full flex items-center justify-center bg-[var(--clr-charcoal)]">
                <p className="font-script text-[44px] text-[var(--clr-gold)] animate-pulse">"Unlocking the Archive..."</p>
              </div>
            }>
              <Canvas camera={{ position: [0, 5, 22], fov: 50, near: 0.1, far: 100 }}>
                <VaultScene onSelectMemory={setSelectedMemory} activeCategory={activeCategory} />
              </Canvas>
            </Suspense>
          </div>

          <div className="absolute top-0 left-0 right-0 z-20 pt-[90px]">
            {vaultHeader}
          </div>
        </>
      )}

      {/* --- 2D GRID VIEW --- */}
      <AnimatePresence>
        {viewMode === '2D' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 overflow-y-auto no-scrollbar bg-[var(--clr-charcoal)]"
          >
            <div className="fixed inset-0 z-0 pointer-events-none opacity-10">
               <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                 <defs>
                   <pattern id="grid2d" width="40" height="40" patternUnits="userSpaceOnUse">
                     <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#B88F5B" strokeWidth="0.5"/>
                   </pattern>
                 </defs>
                 <rect width="100%" height="100%" fill="url(#grid2d)" />
               </svg>
            </div>

            <div className="relative z-10 pt-[90px] w-full">
              {vaultHeader}
            </div>

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
                  <MemoryCard memory={{ url: mem.url, title: mem.title, location: mem.location, date: mem.date, tags: mem.tags.slice(0, 3) }} />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Glassmorphism Category Dock (ONLY IN 3D MODE) */}
      <AnimatePresence>
        {viewMode === '3D' && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            /* Explicitly set pointer-events-auto so it intercepts clicks seamlessly above the Canvas */
            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[40] flex items-center gap-2 p-2 bg-[rgba(20,18,17,0.85)] backdrop-blur-xl border border-[rgba(184,143,91,0.3)] rounded-full shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-x-auto max-w-[90vw] no-scrollbar pointer-events-auto"
          >
            <div className="flex items-center text-[var(--clr-gold)] px-4 opacity-50 shrink-0">
              <Binoculars size={20} weight="fill" />
            </div>
            {categories.map((cat) => (
              <button 
                key={cat}
                onClick={() => setActiveCategory(cat)} 
                className={`px-6 py-3 rounded-full font-ui text-[11px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${
                  activeCategory === cat 
                    ? 'bg-[var(--clr-gold)] text-black shadow-[var(--shadow-gold)] scale-105' 
                    : 'text-[var(--clr-fog)] hover:text-white hover:bg-[rgba(255,255,255,0.05)]'
                }`}
              >
                {cat === 'All' ? 'All Eras' : cat}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drag & Drop Visuals */}
      <AnimatePresence>
        {isDragging && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[300] bg-[rgba(184,143,91,0.15)] backdrop-blur-md flex items-center justify-center pointer-events-none">
            <div className="border-4 border-dashed border-[var(--clr-gold)] bg-[rgba(20,18,17,0.7)] rounded-[var(--radius-lg)] w-[90%] h-[90%] flex flex-col items-center justify-center text-[var(--clr-gold)] shadow-2xl">
               <UploadSimple size={120} weight="thin" className="animate-bounce mb-6" />
               <h2 className="font-display text-[4rem] font-bold tracking-widest uppercase">Drop to Preserve</h2>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preservation Progress Queue */}
      <AnimatePresence>
        {uploadQueue.length > 0 && !isReviewPanelOpen && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="absolute bottom-[100px] right-10 z-[40] w-[360px] bg-[rgba(20,18,17,0.9)] backdrop-blur-xl border border-[rgba(184,143,91,0.3)] rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)] pointer-events-auto">
            <h4 className="font-ui text-[11px] uppercase font-bold text-[var(--clr-gold)] tracking-widest mb-4 border-b border-[rgba(255,255,255,0.1)] pb-2">Active Preservations</h4>
            <div className="space-y-4 max-h-[300px] overflow-y-auto no-scrollbar">
              {uploadQueue.map(item => (
                <div key={item.id} className="group">
                  <div className="flex justify-between items-center mb-2">
                    <p className="font-ui text-[13px] text-[var(--clr-linen)] truncate font-medium">{item.name}</p>
                    {item.status === 'READY' ? <CheckCircle size={18} weight="fill" className="text-[var(--clr-success)]"/> : <div className="w-4 h-4 border-2 border-[var(--clr-gold)] border-t-transparent rounded-full animate-spin"/>}
                  </div>
                  <div className="h-1.5 w-full bg-[rgba(255,255,255,0.1)] rounded-full overflow-hidden">
                    <motion.div className="h-full bg-[var(--clr-gold)]" initial={{ width: 0 }} animate={{ width: `${item.progress}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Curation Ready Banner */}
      <AnimatePresence>
        {showAIReviewBanner && !isReviewPanelOpen && (
          <motion.div initial={{ opacity: 0, y: -100 }} animate={{ opacity: 1, y: 0 }} className="absolute top-10 left-1/2 -translate-x-1/2 z-[150] bg-[var(--clr-soot)] border-2 border-[var(--clr-gold)] shadow-[0_0_50px_rgba(184,143,91,0.3)] rounded-full py-3 px-8 flex items-center gap-8 pointer-events-auto">
            <div className="flex items-center gap-3 text-[var(--clr-linen)]">
              <MagicWand size={24} className="text-[var(--clr-gold)] animate-pulse" weight="fill" />
              <span className="font-ui text-[14px] font-bold tracking-wide">AI Curations Ready ({uploadQueue.length})</span>
            </div>
            <Button variant="primary" className="py-2 px-8 text-[11px]" onClick={() => { setShowAIReviewBanner(false); setIsReviewPanelOpen(true); }}>REVIEW NOW</Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Memory Details Modal (Ceremonial Look) */}
      <AnimatePresence>
        {selectedMemory && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md pointer-events-auto" onClick={() => setSelectedMemory(null)}>
            <motion.div initial={{ scale: 0.95, y: 30 }} animate={{ scale: 1, y: 0 }} className="bg-[var(--clr-charcoal)] border border-[rgba(184,143,91,0.4)] rounded-3xl w-full max-w-[560px] overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <img src={selectedMemory.url} className="w-full aspect-[4/3] object-cover sepia-[0.15]" alt={selectedMemory.title} />
              <div className="p-10">
                <p className="font-ui text-[10px] uppercase text-[var(--clr-fog)] font-bold tracking-[0.25em] mb-2">{selectedMemory.date}</p>
                <h2 className="font-display text-[2.25rem] text-[var(--clr-linen)] uppercase leading-none mb-2">{selectedMemory.title}</h2>
                <p className="font-ui text-[12px] uppercase text-[var(--clr-gold)] font-black tracking-widest mb-4">{selectedMemory.location} &middot; {selectedMemory.year}</p>
                <p className="font-ui text-[15px] text-[var(--clr-fog)] leading-relaxed mb-4">{selectedMemory.caption}</p>
                <p className="font-ui text-[11px] text-[var(--clr-linen)] mb-6">
                  <span className="text-[var(--clr-gold)] font-bold uppercase tracking-widest">Kin: </span>
                  {selectedMemory.people.join(' · ')}
                </p>
                <div className="flex flex-wrap gap-2 mb-8">
                  {selectedMemory.tags.map((tag) => (
                    <span key={tag} className="font-ui text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-full border border-[rgba(184,143,91,0.35)] text-[var(--clr-gold-light)] bg-[rgba(184,143,91,0.05)]">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex gap-4 border-t border-[rgba(255,255,255,0.05)] pt-6">
                  <Button variant="primary" className="flex-1 shadow-[var(--shadow-gold)]">OPEN EXHIBIT</Button>
                  <Button variant="ghost" onClick={() => setSelectedMemory(null)} className="px-6"><X size={20}/></Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Screen Review Panel */}
      <AnimatePresence>
        {isReviewPanelOpen && (
          <motion.div initial={{ opacity: 0, y: '100%' }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 200 }} className="fixed inset-0 z-[400] bg-[var(--clr-parchment)] flex flex-col md:flex-row overflow-hidden pointer-events-auto">
            <div className="w-full md:w-1/2 h-1/2 md:h-full bg-[var(--clr-paper)] flex flex-col relative border-r border-[var(--clr-aged)] shadow-2xl">
              <div className="absolute top-10 left-10 z-10 flex items-center gap-3 bg-[var(--clr-charcoal)] px-5 py-2.5 rounded-full border border-[var(--clr-gold)] shadow-xl text-[var(--clr-linen)]">
                <MagicWand size={20} className="text-[var(--clr-gold)]" weight="fill" />
                <span className="font-ui text-[11px] uppercase font-black tracking-widest">Digital Curation</span>
              </div>
              <div className="flex-1 p-16 flex items-center justify-center">
                <img src="https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=1200" className="max-w-full max-h-full object-contain shadow-[0_30px_100px_rgba(0,0,0,0.4)] rounded-sm border-[12px] border-white/10" alt="Review" />
              </div>
            </div>

            <div className="w-full md:w-1/2 h-1/2 md:h-full bg-[var(--clr-linen)] overflow-y-auto p-12 md:p-20 flex flex-col relative">
               <button onClick={() => setIsReviewPanelOpen(false)} className="absolute top-10 right-10 w-12 h-12 rounded-full bg-[var(--clr-paper)] border border-[var(--clr-aged)] flex items-center justify-center text-[var(--clr-ink)] hover:bg-[var(--clr-gold)] hover:text-white transition-all shadow-md">
                 <X size={24} weight="bold" />
               </button>

               <div className="space-y-12 flex-1 max-w-[500px]">
                 <div>
                    <p className="font-ui text-[11px] uppercase font-black tracking-[0.3em] text-[var(--clr-gold-dark)] mb-4">Verification 1 of {uploadQueue.length}</p>
                    <h3 className="font-display font-extrabold text-[2.5rem] text-[var(--clr-ink)] mb-4 leading-tight uppercase">Analyze Caption</h3>
                    <textarea rows={4} defaultValue="A family gathering outdoors in warm sunlight, sharing a traditional meal in the garden." className="w-full bg-[var(--clr-paper)] border-2 border-[var(--clr-aged)] rounded-3xl p-6 font-ui text-[16px] text-[var(--clr-ink)] outline-none focus:border-[var(--clr-gold)] transition-all resize-none shadow-inner" />
                 </div>

                 <div>
                   <h3 className="font-ui text-[11px] font-black uppercase tracking-[0.2em] text-[var(--clr-dust)] mb-4">Lineage Tags</h3>
                   <div className="flex flex-wrap gap-2">
                     {['Addis Ababa', '1950s', 'Celebration'].map(tag => (
                       <span key={tag} className="inline-flex items-center gap-2 bg-white border border-[var(--clr-aged)] text-[var(--clr-ink)] px-5 py-2.5 rounded-full font-ui text-[12px] font-bold shadow-sm">
                         {tag} <X size={14} className="text-red-800 cursor-pointer" />
                       </span>
                     ))}
                   </div>
                 </div>

                 <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-ui text-[10px] font-black uppercase tracking-widest text-[var(--clr-dust)] mb-2">Preserved Date</h4>
                      <input type="text" defaultValue="July 15, 1954" className="w-full bg-[var(--clr-paper)] border border-[var(--clr-aged)] rounded-full px-6 py-3 font-ui text-[14px] outline-none focus:border-[var(--clr-gold)]" />
                    </div>
                    <div>
                      <h4 className="font-ui text-[10px] font-black uppercase tracking-widest text-[var(--clr-dust)] mb-2">Location</h4>
                      <input type="text" defaultValue="Family Garden" className="w-full bg-[var(--clr-paper)] border border-[var(--clr-aged)] rounded-full px-6 py-3 font-ui text-[14px] outline-none focus:border-[var(--clr-gold)]" />
                    </div>
                 </div>
               </div>

               <div className="pt-12 border-t border-[var(--clr-aged)] flex justify-between items-center mt-16">
                 <button className="font-ui text-[12px] font-black uppercase tracking-widest text-[var(--clr-dust)] hover:text-black transition-colors">Skip Exhibit</button>
                 <Button variant="primary" className="px-12 py-5" onClick={() => setIsReviewPanelOpen(false)}>CONFIRM & PRESERVE <ArrowRight weight="bold" /></Button>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}