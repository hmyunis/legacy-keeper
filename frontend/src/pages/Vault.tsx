import { useState, useRef, Suspense, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadSimple, MagicWand, X, ArrowRight, CheckCircle,
  Binoculars, Vault as VaultIcon, MagnifyingGlass, FunnelSimple, Heart} from '@phosphor-icons/react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Float, OrbitControls, useTexture, SpotLight, Grid } from '@react-three/drei';
import { sileo } from 'sileo';
import * as THREE from 'three';
import { useAuthStore } from '../stores/authStore';
import { Button } from '../components/ui/Button';
import { CustomDatePicker } from '../components/ui/CustomDatePicker';
import { Tooltip } from '../components/ui/Tooltip';
import { AiMarker } from '../components/ui/AiMarker';
import MemoryCard from '../components/vault/MemoryCard';
import MemoryDetailModal from '../features/vault/MemoryDetailModal';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { useMemorySuggestionDecision, useUploadMemory, useVaultClusters, useFilteredMemories, useMemoryFilters, useUpdateMemory } from '../features/vault/hooks/useVault';
import { useDashboardSummary } from '../features/dashboard/hooks/useDashboard';
import type { VaultMemory } from '../features/vault/types';
import { pollTask } from '../lib/tasks';
import { useDebouncedValue } from '../lib/debounce';
import { useQueryClient } from '@tanstack/react-query';
import axiosClient from '../services/axiosClient';
import { getPendingSuggestion, isAiGeneratedTag } from '../features/vault/lib/aiMarkers';

const ORBIT_RADIUS = 16;
const FRAME_CORNERS = [
  { key: 'top-left', x: -1.12, y: 1.34, accentX: -0.98, accentY: 1.22, rotate: Math.PI / 4 },
  { key: 'top-right', x: 1.12, y: 1.34, accentX: 0.98, accentY: 1.22, rotate: -Math.PI / 4 },
  { key: 'bottom-left', x: -1.12, y: -1.34, accentX: -0.98, accentY: -1.22, rotate: -Math.PI / 4 },
  { key: 'bottom-right', x: 1.12, y: -1.34, accentX: 0.98, accentY: -1.22, rotate: Math.PI / 4 },
];

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

  useEffect(() => {
    return () => {
      texture.dispose();
    };
  }, [texture]);

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
        <mesh castShadow receiveShadow position={[0, 0, -0.03]}>
          <boxGeometry args={[2.58, 3.08, 0.06]} />
          <meshStandardMaterial color="#1E1A17" roughness={0.85} metalness={0.05} />
        </mesh>

        <mesh receiveShadow position={[0, -0.02, 0.01]}>
          <boxGeometry args={[2.36, 2.76, 0.03]} />
          <meshStandardMaterial color="#E8DFCB" roughness={0.95} metalness={0.02} />
        </mesh>

        <mesh castShadow position={[0, 1.44, 0.055]}>
          <boxGeometry args={[2.58, 0.13, 0.1]} />
          <meshStandardMaterial color="#B88F5B" roughness={0.28} metalness={0.8} />
        </mesh>
        <mesh castShadow position={[0, -1.44, 0.055]}>
          <boxGeometry args={[2.58, 0.13, 0.1]} />
          <meshStandardMaterial color="#8C6738" roughness={0.32} metalness={0.78} />
        </mesh>
        <mesh castShadow position={[-1.22, 0, 0.055]}>
          <boxGeometry args={[0.13, 2.86, 0.1]} />
          <meshStandardMaterial color="#9A7340" roughness={0.3} metalness={0.8} />
        </mesh>
        <mesh castShadow position={[1.22, 0, 0.055]}>
          <boxGeometry args={[0.13, 2.86, 0.1]} />
          <meshStandardMaterial color="#D4A96A" roughness={0.26} metalness={0.82} />
        </mesh>

        <mesh position={[0, 1.24, 0.12]}>
          <boxGeometry args={[2.16, 0.035, 0.055]} />
          <meshStandardMaterial color="#F1D08A" roughness={0.22} metalness={0.88} />
        </mesh>
        <mesh position={[0, -1.24, 0.12]}>
          <boxGeometry args={[2.16, 0.035, 0.055]} />
          <meshStandardMaterial color="#F1D08A" roughness={0.22} metalness={0.88} />
        </mesh>
        <mesh position={[-1.04, 0, 0.12]}>
          <boxGeometry args={[0.035, 2.42, 0.055]} />
          <meshStandardMaterial color="#F1D08A" roughness={0.22} metalness={0.88} />
        </mesh>
        <mesh position={[1.04, 0, 0.12]}>
          <boxGeometry args={[0.035, 2.42, 0.055]} />
          <meshStandardMaterial color="#F1D08A" roughness={0.22} metalness={0.88} />
        </mesh>

        {FRAME_CORNERS.map((corner) => (
          <group key={corner.key}>
            <mesh castShadow position={[corner.x, corner.y, 0.14]}>
              <torusGeometry args={[0.085, 0.014, 10, 28]} />
              <meshStandardMaterial color="#F1D08A" roughness={0.2} metalness={0.9} />
            </mesh>
            <mesh castShadow position={[corner.x, corner.y, 0.16]}>
              <sphereGeometry args={[0.032, 12, 12]} />
              <meshStandardMaterial color="#D4A96A" roughness={0.18} metalness={0.92} />
            </mesh>
            <mesh position={[corner.accentX, corner.accentY, 0.145]} rotation={[0, 0, corner.rotate]}>
              <boxGeometry args={[0.22, 0.022, 0.035]} />
              <meshStandardMaterial color="#F1D08A" roughness={0.24} metalness={0.88} />
            </mesh>
          </group>
        ))}

        <mesh castShadow position={[0, 1.57, 0.145]}>
          <sphereGeometry args={[0.05, 12, 12]} />
          <meshStandardMaterial color="#F1D08A" roughness={0.2} metalness={0.9} />
        </mesh>
        <mesh castShadow position={[-0.13, 1.52, 0.135]}>
          <sphereGeometry args={[0.028, 10, 10]} />
          <meshStandardMaterial color="#D4A96A" roughness={0.22} metalness={0.88} />
        </mesh>
        <mesh castShadow position={[0.13, 1.52, 0.135]}>
          <sphereGeometry args={[0.028, 10, 10]} />
          <meshStandardMaterial color="#D4A96A" roughness={0.22} metalness={0.88} />
        </mesh>

        <mesh position={[0, 0.12, 0.155]}>
          <planeGeometry args={[2.2, 2.2]} />
          <meshBasicMaterial map={texture} toneMapped={false} />
        </mesh>
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
  cluster: any;
  radius: number;
  isFaded: boolean;
  onSelect: (memory: any) => void;
}) {
  const x = Math.sin(cluster.angle) * radius;
  const z = Math.cos(cluster.angle) * radius;

  const ROWS = 2;
  const count = cluster.memories.length;
  const cols = Math.ceil(count / ROWS);
  const SPACING_X = 3.05;
  const SPACING_Y = 3.7;

  return (
    <group position={[x, 0, z]} rotation={[0, cluster.angle, 0]}>
      {!isFaded && <SpotLight position={[0, 5, 4]} angle={0.9} penumbra={0.6} intensity={4} color="#D4A96A" distance={20} />}

      {cluster.memories.map((mem: VaultMemory, i: number) => {
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
  clusters,
  onSelectMemory,
  activeCategory
}: {
  clusters: any[];
  onSelectMemory: (mem: any) => void;
  activeCategory: string;
}) {
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

      <Grid
        position={[0, -8, 0]}
        args={[100, 100]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="rgba(184, 143, 91, 0.15)"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="rgba(212, 169, 106, 0.25)"
        fadeDistance={50}
        fadeStrength={2}
      />

      <group ref={groupRef}>
        {clusters.map((cluster) => (
          <OrbitingCluster
            key={cluster.name}
            cluster={cluster}
            radius={ORBIT_RADIUS}
            onSelect={onSelectMemory}
            isFaded={activeCategory !== 'All' && activeCategory !== cluster.name}
          />
        ))}
      </group>

      <OrbitControls
        enablePan={false}
        enableZoom={true}
        maxDistance={35}
        minDistance={6}
        autoRotate={activeCategory === 'All'}
        autoRotateSpeed={0.4}
        maxPolarAngle={Math.PI / 2 - 0.05}
      />
    </>
  );
}


function GridLoader() {
  return (
    <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-[var(--space-6)] space-y-[var(--space-6)]">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="break-inside-avoid bg-[var(--clr-soot)] rounded-2xl overflow-hidden animate-pulse">
          <div className="aspect-[4/3] bg-[rgba(184,143,91,0.08)]" />
          <div className="p-4 space-y-3">
            <div className="h-4 bg-[rgba(184,143,91,0.08)] rounded-full w-3/4" />
            <div className="h-3 bg-[rgba(184,143,91,0.08)] rounded-full w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SceneLoader() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-[var(--clr-charcoal)]">
      <div className="text-center space-y-6">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-[var(--clr-gold)] border-t-transparent rounded-full mx-auto"
        />
        <p className="font-script text-[36px] text-[var(--clr-gold)] animate-pulse">"Unlocking the Archive..."</p>
      </div>
    </div>
  );
}

export default function Vault() {
  const [viewMode, setViewMode] = useState<'3D' | '2D'>('3D');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<any[]>([]);
  const [isReviewPanelOpen, setIsReviewPanelOpen] = useState(false);
  const [isConfirmingReview, setIsConfirmingReview] = useState(false);
  const [pendingCuration, setPendingCuration] = useState<any>(null);
  const [selectedMemory, setSelectedMemory] = useState<VaultMemory | null>(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchInput, setSearchInput] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showFavorites, setShowFavorites] = useState(() => new URLSearchParams(window.location.search).get('favorites') === 'true');
  const [selectedDecade, setSelectedDecade] = useState('');

  const debouncedSearch = useDebouncedValue(searchInput, 400);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: dynamicClusters = [] } = useVaultClusters();
  const { data: filters = { clusters: [], decades: [] } } = useMemoryFilters();
  const { data: summary } = useDashboardSummary();

  const activeVaultId = useAuthStore(s => s.activeVaultId);
  const currentUser = useAuthStore(s => s.currentUser);
  const canContribute = currentUser?.role === 'ADMIN' || currentUser?.role === 'CONTRIBUTOR';
  const uploadMutation = useUploadMemory();
  const updateMutation = useUpdateMemory();
  const suggestionDecision = useMemorySuggestionDecision();
  const queryClient = useQueryClient();

  const pendingTitleValue = pendingCuration ? getPendingSuggestion(pendingCuration, 'title') : null;
  const pendingDescriptionValue = pendingCuration ? getPendingSuggestion(pendingCuration, 'description') : null;
  const pendingTagsValue = pendingCuration ? getPendingSuggestion(pendingCuration, 'tags') : null;
  const pendingTitleSuggestion = typeof pendingTitleValue === 'string' ? pendingTitleValue : null;
  const pendingDescriptionSuggestion = typeof pendingDescriptionValue === 'string' ? pendingDescriptionValue : null;
  const pendingTagSuggestion = Array.isArray(pendingTagsValue) ? pendingTagsValue.map(String).filter(Boolean) : null;

  const filterParams = {
    q: debouncedSearch || undefined,
    cluster: activeCategory !== 'All' ? activeCategory : undefined,
    decade: selectedDecade || undefined,
    reviewed: true,
    is_favorite: showFavorites ? true : undefined,
  };

  const { data: filteredMemories = [], isFetching: isFetchingMemories } = useFilteredMemories(filterParams);

  const filterClusters = Array.isArray(filters.clusters) ? filters.clusters : [];
  const filterDecades = Array.isArray(filters.decades) ? filters.decades : [];
  const allCategories = ['All', ...filterClusters];

  useEffect(() => {
    const url = new URL(window.location.href);
    if (showFavorites) {
      url.searchParams.set('favorites', 'true');
    } else {
      url.searchParams.delete('favorites');
    }
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }, [showFavorites]);

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const isBatch = fileArray.length > 1;

    const promises = fileArray.map(async (file, index) => {
      const tempId = `up-${Date.now()}-${index}`;

      setUploadQueue(prev => [...prev, {
        id: tempId,
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
        progress: 10,
        status: 'PROCESSING'
      }]);

      try {
        const { task_id, memory_id } = await uploadMutation.mutateAsync({ file });

        if (task_id) {
          const processingPromise = pollTask(task_id).then(() => true).catch(() => false);
          await sileo.promise(processingPromise, {
            loading: { title: `Processing ${file.name}`, description: "AI is analyzing faces & context..." },
            success: (processed) => {
              setUploadQueue(curr => curr.map(q => q.id === tempId ? { ...q, progress: 100, status: 'READY' } : q));
              return processed
                ? { title: "Ready for Review", description: `${file.name} needs curator verification.` }
                : { title: "Manual Review Ready", description: "AI processing failed, but the memory can still be verified." };
            },
            error: { title: "Upload Failed", description: "The memory could not be queued." }
          });
        } else {
          setUploadQueue(curr => curr.map(q => q.id === tempId ? { ...q, progress: 100, status: 'READY' } : q));
          sileo.info({ title: "Manual Review Ready", description: "AI worker is unavailable, so verify this memory manually." });
        }

        if (!isBatch && memory_id) {
          const fullMemory = await axiosClient.get(`/vaults/${activeVaultId}/memories/${memory_id}/`);
          setPendingCuration(fullMemory.data);
          setReviewNote(fullMemory.data.human_caption || '');
          setIsReviewPanelOpen(true);
        }
      } catch (err) {
        setUploadQueue(curr => curr.map(q => q.id === tempId ? { ...q, status: 'FAILED' } : q));
        setTimeout(() => setUploadQueue(curr => curr.filter(q => q.id !== tempId)), 3500);
      }
    });

    await Promise.all(promises);

    queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
    queryClient.invalidateQueries({ queryKey: ['filteredMemories'] });
    queryClient.invalidateQueries({ queryKey: ['vaultClusters'] });
    queryClient.invalidateQueries({ queryKey: ['memoryFilters'] });

    setTimeout(() => {
      setUploadQueue(curr => curr.filter(q => q.status !== 'READY'));
    }, 3000);
  };

  const handleConfirmReview = async () => {
    if (!pendingCuration) return;
    setIsConfirmingReview(true);
    await sileo.promise(
      updateMutation.mutateAsync({
        memoryId: pendingCuration.id,
        data: {
          human_caption: reviewNote,
          is_reviewed: true,
          date: pendingCuration.date || null,
          location: pendingCuration.location || ''
        }
      }),
      {
        loading: { title: "Preserving..." },
        success: () => {
          setIsReviewPanelOpen(false);
          return { title: "Memory Verified" };
        },
        error: { title: "Failed to verify memory" }
      }
    ).finally(() => setIsConfirmingReview(false));
  };

  const handleReviewSuggestionDecision = async (field: string, action: 'accept' | 'reject') => {
    if (!pendingCuration) return;
    try {
      const updated = await suggestionDecision.mutateAsync({ memoryId: pendingCuration.id, field, action });
      setPendingCuration(updated);
      sileo.success({
        title: action === 'accept' ? "Suggestion Accepted" : "Suggestion Dismissed",
        description: `${field === 'description' ? 'Description' : field} has been ${action === 'accept' ? 'applied' : 'left unchanged'}.`
      });
    } catch {
      sileo.error({ title: "Suggestion Review Failed" });
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
          {viewMode === '2D' && (
            <p className="font-script text-[48px] text-[var(--clr-gold)] leading-[1] mt-4 drop-shadow-md">
              &ldquo;{filteredMemories.length} exhibits curated&rdquo;
            </p>
          )}
        </motion.div>

        <div className={`mt-6 md:mt-0 flex flex-wrap items-center gap-4 ${viewMode === '3D' ? 'pointer-events-auto' : ''}`}>
          <div className="flex bg-[rgba(20,18,17,0.6)] backdrop-blur-md p-1 rounded-full border border-[rgba(184,143,91,0.3)] shadow-inner">
            <button onClick={() => setViewMode('3D')} className={`px-5 py-2 rounded-full text-[11px] font-bold tracking-widest uppercase transition-all ${viewMode === '3D' ? 'bg-[var(--clr-gold)] text-black shadow-md' : 'text-[var(--clr-fog)] hover:text-white'}`}>Orbit</button>
            <button onClick={() => setViewMode('2D')} className={`px-5 py-2 rounded-full text-[11px] font-bold tracking-widest uppercase transition-all ${viewMode === '2D' ? 'bg-[var(--clr-gold)] text-black shadow-md' : 'text-[var(--clr-fog)] hover:text-white'}`}>Grid</button>
          </div>
          {canContribute && (
            <>
              <Button variant="primary" onClick={() => fileInputRef.current?.click()} className="shadow-[var(--shadow-gold)] px-6 md:px-10">
                <UploadSimple size={20} weight="bold" /> <span className="hidden md:inline">UPLOAD MEMORY</span><span className="md:hidden">UPLOAD</span>
              </Button>
              <input type="file" ref={fileInputRef} className="hidden" multiple onChange={(e) => e.target.files && handleFiles(e.target.files)} />
            </>
          )}
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
            <Suspense fallback={<SceneLoader />}>
              <Canvas camera={{ position: [0, 5, 22], fov: 50, near: 0.1, far: 100 }}>
                <VaultScene clusters={dynamicClusters} onSelectMemory={setSelectedMemory} activeCategory={activeCategory} />
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
                  <input
                    type="text"
                    placeholder="Search exhibits..."
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                    className="w-full bg-[var(--clr-charcoal)] border border-[rgba(184,143,91,0.4)] rounded-full pl-12 pr-6 py-3.5 text-[var(--clr-linen)] font-ui text-[14px] outline-none focus:border-[var(--clr-gold)] shadow-inner"
                  />
                  {isFetchingMemories && debouncedSearch && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-[var(--clr-gold)] border-t-transparent rounded-full"
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowFavorites(!showFavorites)}
                    className={`flex items-center gap-2 px-5 py-3 rounded-full font-ui text-[11px] font-bold uppercase border transition-all ${showFavorites ? 'bg-[var(--clr-gold)] text-black border-[var(--clr-gold)]' : 'bg-[var(--clr-charcoal)] text-[var(--clr-fog)] border-[rgba(184,143,91,0.2)]'}`}
                  >
                    <Heart size={14} weight={showFavorites ? "fill" : "bold"} /> Favorites
                  </button>

                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-5 py-3 rounded-full font-ui text-[11px] font-bold uppercase border transition-all ${showFilters ? 'bg-[var(--clr-gold)] text-black border-[var(--clr-gold)]' : 'bg-[var(--clr-charcoal)] text-[var(--clr-fog)] border-[rgba(184,143,91,0.2)]'}`}
                  >
                    <FunnelSimple size={14} weight="fill" /> Filters
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-[rgba(30,26,23,0.6)] backdrop-blur-xl border border-[rgba(184,143,91,0.15)] rounded-2xl p-5 space-y-4">
                      <div>
                        <p className="font-ui text-[9px] uppercase tracking-[0.2em] text-[var(--clr-gold)] font-bold mb-2">Era</p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => setSelectedDecade('')}
                            className={`px-4 py-2 rounded-full font-ui text-[10px] font-bold uppercase border transition-all ${!selectedDecade ? 'bg-[var(--clr-gold)] text-black border-[var(--clr-gold)]' : 'bg-[var(--clr-charcoal)] text-[var(--clr-fog)] border-[rgba(184,143,91,0.2)]'}`}
                          >
                            All Eras
                          </button>
                          {filterDecades.map(dec => (
                            <button
                              key={dec}
                              onClick={() => setSelectedDecade(selectedDecade === dec ? '' : dec)}
                              className={`px-4 py-2 rounded-full font-ui text-[10px] font-bold uppercase border transition-all ${selectedDecade === dec ? 'bg-[var(--clr-gold)] text-black border-[var(--clr-gold)]' : 'bg-[var(--clr-charcoal)] text-[var(--clr-fog)] border-[rgba(184,143,91,0.2)]'}`}
                            >
                              {dec}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="font-ui text-[9px] uppercase tracking-[0.2em] text-[var(--clr-gold)] font-bold mb-2">Collection</p>
                        <div className="flex flex-wrap gap-2">
                          {allCategories.map(cat => (
                            <button
                              key={cat}
                              onClick={() => setActiveCategory(cat)}
                              className={`px-4 py-2 rounded-full font-ui text-[10px] font-bold uppercase border transition-all whitespace-nowrap ${activeCategory === cat ? 'bg-[var(--clr-gold)] text-black border-[var(--clr-gold)]' : 'bg-[var(--clr-charcoal)] text-[var(--clr-fog)] border-[rgba(184,143,91,0.2)]'}`}
                            >
                              {cat === 'All' ? 'All Collections' : cat}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="relative z-10 px-[clamp(24px,5vw,80px)] pb-32 max-w-[var(--max-width)] mx-auto">
              {isFetchingMemories && !filteredMemories.length ? (
                <GridLoader />
              ) : filteredMemories.length > 0 ? (
                <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-[var(--space-6)] space-y-[var(--space-6)]">
                  {filteredMemories.map((mem: VaultMemory) => (
                    <motion.div
                      key={mem.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="break-inside-avoid shadow-lg rounded-2xl cursor-pointer"
                      onClick={() => setSelectedMemory(mem)}
                    >
                      <MemoryCard memory={{ id: mem.id, url: mem.url, title: mem.title, location: mem.location, date: mem.date, tags: (mem.tags || []).slice(0, 3), exif_json: mem.exif_json, is_favorite: mem.is_favorite }} />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-24">
                  <Binoculars size={64} className="mx-auto text-[var(--clr-gold)] opacity-30 mb-6" weight="thin" />
                  <h3 className="font-display text-[2rem] text-[var(--clr-linen)] mb-2">No Exhibits Found</h3>
                  <p className="font-ui text-[14px] text-[var(--clr-fog)]">
                    {debouncedSearch ? `Nothing matches "${debouncedSearch}". Try a different search.` : 'This collection is empty.'}
                  </p>
                </div>
              )}
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
            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[40] flex items-center gap-2 p-2 bg-[rgba(20,18,17,0.85)] backdrop-blur-xl border border-[rgba(184,143,91,0.3)] rounded-full shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-x-auto max-w-[90vw] no-scrollbar pointer-events-auto"
          >
            <div className="flex items-center text-[var(--clr-gold)] px-4 opacity-50 shrink-0">
              <Binoculars size={20} weight="fill" />
            </div>
            {allCategories.map((cat) => (
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
                    {item.status === 'READY' ? (
                      <CheckCircle size={18} weight="fill" className="text-[var(--clr-success)]"/>
                    ) : item.status === 'FAILED' ? (
                      <X size={18} weight="bold" className="text-[var(--clr-danger)]"/>
                    ) : (
                      <div className="w-4 h-4 border-2 border-[var(--clr-gold)] border-t-transparent rounded-full animate-spin"/>
                    )}
                  </div>
                  <div className="h-1.5 w-full bg-[rgba(255,255,255,0.1)] rounded-full overflow-hidden">
                    <motion.div className={`h-full ${item.status === 'FAILED' ? 'bg-[var(--clr-danger)]' : 'bg-[var(--clr-gold)]'}`} initial={{ width: 0 }} animate={{ width: `${item.status === 'FAILED' ? 100 : item.progress}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Curation Ready Banner */}
      <AnimatePresence>
        {(summary?.unreviewedCount > 0) && !isReviewPanelOpen && (
          <motion.div initial={{ opacity: 0, y: -100 }} animate={{ opacity: 1, y: 0 }} className="absolute top-10 left-1/2 -translate-x-1/2 z-[150] w-[min(92vw,680px)] bg-[var(--clr-soot)] border border-[rgba(212,169,106,0.55)] shadow-[0_18px_60px_rgba(0,0,0,0.45)] rounded-[var(--radius-lg)] py-3 px-4 sm:px-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-5 pointer-events-auto">
            <div className="flex min-w-0 flex-1 items-center gap-3 text-[var(--clr-linen)]">
              <MagicWand size={24} className="text-[var(--clr-gold)] animate-pulse" weight="fill" />
              <span className="font-ui text-[13px] sm:text-[14px] font-bold tracking-wide truncate">
                {summary.unreviewedCount} Artifacts Need Your Review
              </span>
            </div>
            <Button
                variant="primary"
                className="py-2 px-6 text-[11px] shrink-0"
                onClick={async () => {
                    const { data: fetchRes } = await axiosClient.get(`/vaults/${activeVaultId}/memories/`, { params: { reviewed: false, limit: 1 } });
                    const unreviewed = fetchRes.results?.[0] || fetchRes[0];
                    if (unreviewed) {
                        setPendingCuration(unreviewed);
                        setReviewNote(unreviewed.human_caption || '');
                        setIsReviewPanelOpen(true);
                    } else {
                        queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
                    }
                }}
            >
                START REVIEW
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Memory Details Modal */}
      <MemoryDetailModal
        isOpen={!!selectedMemory}
        onClose={() => setSelectedMemory(null)}
        memory={selectedMemory}
        onUpdate={(updated) => setSelectedMemory(updated)}
      />

      {/* Full Screen Review Panel */}
      <AnimatePresence>
        {isReviewPanelOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[400] bg-[rgba(20,18,17,0.92)] backdrop-blur-md flex items-center justify-center p-3 sm:p-5 md:p-8 pointer-events-auto">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="w-full max-w-5xl bg-[var(--clr-parchment)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] border border-[rgba(184,143,91,0.3)] overflow-hidden grid grid-rows-[minmax(220px,38vh)_1fr] md:grid-rows-1 md:grid-cols-[minmax(320px,0.95fr)_minmax(360px,1.05fr)] max-h-[92vh]">
              <div className="bg-[var(--clr-soot)] relative flex items-center justify-center p-4 sm:p-6 overflow-hidden">
                <div className="absolute top-4 right-4 z-20">
                  <Tooltip content="Close">
                    <button aria-label="Close review" onClick={() => setIsReviewPanelOpen(false)} className="w-10 h-10 rounded-full bg-[rgba(20,18,17,0.82)] border border-[rgba(184,143,91,0.45)] text-[var(--clr-linen)] flex items-center justify-center hover:border-[var(--clr-gold)] hover:text-[var(--clr-gold)] transition-colors">
                      <X size={18} />
                    </button>
                  </Tooltip>
                </div>
                <img src={pendingCuration?.url || "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=1200"} className="max-w-full max-h-full object-contain shadow-[0_20px_60px_rgba(0,0,0,0.4)] rounded-sm border-4 border-white/10" alt="Review" />
              </div>

              <div className="p-5 sm:p-6 md:p-8 overflow-y-auto no-scrollbar flex flex-col bg-[var(--clr-linen)] min-h-0">
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-9 h-9 rounded-full bg-[var(--clr-gold-muted)] text-[var(--clr-gold)] flex items-center justify-center">
                    <MagicWand size={18} weight="fill" />
                  </span>
                  <div>
                    <span className="font-ui text-[10px] uppercase font-black tracking-widest text-[var(--clr-gold)]">Digital Curation</span>
                    <h3 className="font-display font-extrabold text-[1.65rem] text-[var(--clr-ink)] leading-none uppercase tracking-wider">Verify Artifact</h3>
                  </div>
                </div>

                <div className="space-y-4 pb-1">
                  <div className="bg-[rgba(184,143,91,0.05)] border border-[rgba(184,143,91,0.2)] p-4 rounded-xl shadow-inner">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <label className="font-ui text-[9px] uppercase tracking-[0.2em] text-[var(--clr-gold-dark)] font-bold">AI Insight</label>
                      <AiMarker label="AI-generated description" />
                    </div>
                    <p className="font-ui text-[13px] text-[var(--clr-ink)] leading-relaxed italic">
                      {pendingCuration?.ai_caption || 'AI has not added a caption yet. You can verify this memory manually.'}
                    </p>
                  </div>

                  {(pendingTitleSuggestion || pendingDescriptionSuggestion || (pendingTagSuggestion && pendingTagSuggestion.length > 0)) && (
                    <div className="space-y-3 rounded-xl border border-[rgba(184,143,91,0.22)] bg-[rgba(184,143,91,0.06)] p-4">
                      <p className="font-ui text-[9px] font-black uppercase tracking-[0.2em] text-[var(--clr-gold-dark)]">Review AI Suggestions</p>
                      {[
                        pendingTitleSuggestion ? { field: 'title', label: 'Title', value: pendingTitleSuggestion } : null,
                        pendingDescriptionSuggestion ? { field: 'description', label: 'Description', value: pendingDescriptionSuggestion } : null,
                      ].filter(Boolean).map((item: any) => (
                        <div key={item.field} className="rounded-lg bg-[var(--clr-paper)] p-3">
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <AiMarker label={`AI suggestion for ${item.label.toLowerCase()}`} />
                              <span className="font-ui text-[10px] font-bold uppercase tracking-widest text-[var(--clr-ink)]">{item.label}</span>
                            </div>
                            <div className="flex gap-2">
                              <button disabled={suggestionDecision.isPending} onClick={() => handleReviewSuggestionDecision(item.field, 'accept')} className="rounded-full border border-[rgba(82,120,82,0.35)] px-3 py-1 font-ui text-[9px] font-black uppercase tracking-widest text-[rgb(82,120,82)] hover:bg-[rgb(82,120,82)] hover:text-white disabled:opacity-50">Accept</button>
                              <button disabled={suggestionDecision.isPending} onClick={() => handleReviewSuggestionDecision(item.field, 'reject')} className="rounded-full border border-[rgba(139,58,58,0.35)] px-3 py-1 font-ui text-[9px] font-black uppercase tracking-widest text-[var(--clr-danger)] hover:bg-[var(--clr-danger)] hover:text-white disabled:opacity-50">Reject</button>
                            </div>
                          </div>
                          <p className="font-ui text-[12px] leading-relaxed text-[var(--clr-dust)]">{item.value}</p>
                        </div>
                      ))}
                      {pendingTagSuggestion && pendingTagSuggestion.length > 0 && (
                        <div className="rounded-lg bg-[var(--clr-paper)] p-3">
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <AiMarker label="AI suggestion for tags" />
                              <span className="font-ui text-[10px] font-bold uppercase tracking-widest text-[var(--clr-ink)]">Tags</span>
                            </div>
                            <div className="flex gap-2">
                              <button disabled={suggestionDecision.isPending} onClick={() => handleReviewSuggestionDecision('tags', 'accept')} className="rounded-full border border-[rgba(82,120,82,0.35)] px-3 py-1 font-ui text-[9px] font-black uppercase tracking-widest text-[rgb(82,120,82)] hover:bg-[rgb(82,120,82)] hover:text-white disabled:opacity-50">Accept</button>
                              <button disabled={suggestionDecision.isPending} onClick={() => handleReviewSuggestionDecision('tags', 'reject')} className="rounded-full border border-[rgba(139,58,58,0.35)] px-3 py-1 font-ui text-[9px] font-black uppercase tracking-widest text-[var(--clr-danger)] hover:bg-[var(--clr-danger)] hover:text-white disabled:opacity-50">Reject</button>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {pendingTagSuggestion.map((tag) => (
                              <span key={tag} className="rounded-full border border-[var(--clr-aged)] px-3 py-1 font-ui text-[11px] font-semibold text-[var(--clr-ink)]">{tag}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="font-ui text-[9px] uppercase tracking-[0.2em] text-[var(--clr-dust)] font-bold mb-1.5 block">Curator's Note (Optional)</label>
                    <textarea
                      rows={3}
                      value={reviewNote}
                      onChange={e => setReviewNote(e.target.value)}
                      placeholder="Add your personal insights..."
                      className="w-full bg-[var(--clr-paper)] border border-[var(--clr-aged)] rounded-xl p-4 font-ui text-[13px] text-[var(--clr-ink)] outline-none focus:border-[var(--clr-gold)] transition-all resize-none shadow-inner"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-ui text-[9px] uppercase tracking-[0.2em] text-[var(--clr-dust)] font-bold mb-1.5 block">Date</label>
                      <CustomDatePicker
                        value={pendingCuration?.date || ''}
                        onChange={(val) => setPendingCuration((prev: any) => ({ ...prev, date: val }))}
                        className="[&>div]:rounded-[var(--radius-md)] [&>div]:bg-[var(--clr-paper)]"
                      />
                    </div>
                    <div>
                      <label className="font-ui text-[9px] uppercase tracking-[0.2em] text-[var(--clr-dust)] font-bold mb-1.5 block">Location</label>
                      <input
                        type="text"
                        value={pendingCuration?.location || ''}
                        onChange={(e) => setPendingCuration((prev: any) => ({ ...prev, location: e.target.value }))}
                        className="w-full bg-[var(--clr-paper)] shadow-inner border border-[var(--clr-aged)] rounded-[var(--radius-md)] px-4 py-3 font-ui text-[13px] outline-none focus:border-[var(--clr-gold)] transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-ui text-[9px] uppercase tracking-[0.2em] text-[var(--clr-dust)] font-bold mb-1.5 block">Lineage Tags</label>
                    <div className="flex flex-wrap gap-2">
                      {(pendingCuration?.tags || []).map((tag: string) => (
                        <span key={tag} className="inline-flex items-center gap-1.5 bg-[var(--clr-paper)] border border-[var(--clr-aged)] text-[var(--clr-ink)] px-3 py-1.5 rounded-full font-ui text-[11px] font-semibold shadow-sm">
                          {tag}
                          {pendingCuration && isAiGeneratedTag(pendingCuration, tag) && <AiMarker compact label="AI-generated tag" />}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-5 mt-6 border-t border-[var(--clr-aged)] flex flex-col-reverse sm:flex-row justify-between sm:items-center gap-3">
                  <button onClick={() => setIsReviewPanelOpen(false)} className="font-ui text-[10px] font-bold uppercase tracking-widest text-[var(--clr-dust)] hover:text-[var(--clr-ink)] transition-colors px-2 py-2">Review Later</button>
                  <Button variant="primary" className="px-6 py-3 w-full sm:w-auto" disabled={isConfirmingReview} onClick={handleConfirmReview}>
                    {isConfirmingReview ? 'PRESERVING...' : 'CONFIRM & PRESERVE'} <ArrowRight weight="bold" />
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
