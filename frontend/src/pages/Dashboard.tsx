import { memo, Suspense, useRef, useState, type MouseEvent } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { UploadSimple, UserPlus, Timer, MagnifyingGlass, UsersThree, PlayCircle } from '@phosphor-icons/react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sparkles, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { TornEdge } from '../components/ui/TornEdge';
import MemoryDetailModal from '../features/vault/MemoryDetailModal';
import { useDashboardSummary } from '../features/dashboard/hooks/useDashboard';
import { useMembers } from '../features/governance/hooks/useGovernance';
import { useAuthStore } from '../stores/authStore';

const HERO_CHARCOAL = '#141211';

function AstrolabeRings() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      const t = state.clock.elapsedTime;
      groupRef.current.children[0].rotation.x = t * 0.08;
      groupRef.current.children[0].rotation.y = t * 0.12;
      groupRef.current.children[1].rotation.x = t * -0.1;
      groupRef.current.children[1].rotation.z = t * 0.15;
      groupRef.current.children[2].rotation.y = t * -0.18;
      groupRef.current.children[2].rotation.z = t * -0.08;
      const core = groupRef.current.children[3] as THREE.Mesh;
      (core.material as THREE.MeshBasicMaterial).opacity = 0.6 + Math.sin(t * 2) * 0.2;
    }
  });

  return (
    <Float speed={1} rotationIntensity={0.5} floatIntensity={1.5}>
      <group ref={groupRef} position={[4, 0, -6]} scale={2.2}>
        <mesh>
          <torusGeometry args={[3.5, 0.01, 16, 100]} />
          <meshStandardMaterial color="#B88F5B" metalness={1} roughness={0.2} transparent opacity={0.3} />
        </mesh>
        <mesh>
          <torusGeometry args={[2.6, 0.015, 16, 100]} />
          <meshStandardMaterial color="#D4A96A" metalness={1} roughness={0.1} transparent opacity={0.5} />
        </mesh>
        <mesh>
          <torusGeometry args={[1.6, 0.02, 16, 100]} />
          <meshStandardMaterial color="#F7F4EF" metalness={1} roughness={0.2} emissive="#B88F5B" emissiveIntensity={0.8} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.25, 32, 32]} />
          <meshBasicMaterial color="#D4A96A" transparent opacity={0.8} />
        </mesh>
      </group>
    </Float>
  );
}

function DashboardHeroScene() {
  return (
    <>
      <color attach="background" args={[HERO_CHARCOAL]} />
      <fog attach="fog" args={[HERO_CHARCOAL, 5, 20]} />
      <ambientLight intensity={0.2} />
      <pointLight position={[-5, 5, 5]} intensity={1} color="#D4A96A" />
      <pointLight position={[5, -5, 2]} intensity={2} color="#B88F5B" />
      <Environment preset="city" />

      <AstrolabeRings />

      <Sparkles count={150} scale={[25, 12, 12]} position={[0, 0, -4]} size={1.5} speed={0.2} color="#D4A96A" opacity={0.3} />
      <Sparkles count={50} scale={[12, 6, 6]} position={[4, 0, -2]} size={2.5} speed={0.4} color="#F7F4EF" opacity={0.5} />
    </>
  );
}

/** Isolated from parallax/mouse updates so WebGL does not remount or resize every frame. */
const DashboardHeroCanvas = memo(function DashboardHeroCanvas() {
  return (
    <div
      aria-hidden
      className="dashboard-hero-canvas pointer-events-none absolute inset-0 z-0"
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <DashboardHeroScene />
        </Suspense>
      </Canvas>
    </div>
  );
});

function DashboardHero({
  textX,
  textY,
  bgX,
  bgY,
  summary,
  members,
  isLoading,
}: {
  textX: ReturnType<typeof useTransform<number, number>>;
  textY: ReturnType<typeof useTransform<number, number>>;
  bgX: ReturnType<typeof useTransform<number, number>>;
  bgY: ReturnType<typeof useTransform<number, number>>;
  summary: any;
  members: any[];
  isLoading: boolean;
}) {
  const kinCount = Number(summary?.kinCount ?? members.length ?? 0);
  const leadName = (members[0]?.name || summary?.curatorName || 'Curator').split(' ')[0];
  const kinLabel =
    kinCount > 1
      ? `${leadName} + ${kinCount - 1} kin`
      : kinCount === 1
        ? 'Just You'
        : 'No kin yet';

  return (
    <section className="dashboard-hero relative w-full min-h-[75vh] flex items-center bg-[var(--clr-charcoal)] overflow-hidden pt-12 pb-32 px-[clamp(24px,5vw,80px)] isolate">
      <DashboardHeroCanvas />

      <motion.div style={{ x: bgX, y: bgY }} className="absolute inset-0 z-[1] pointer-events-none">
        <motion.div
          className="absolute inset-0 z-10"
          style={{ background: 'rgba(20, 18, 17, 0.85)' }}
          aria-hidden
        />
        <div className="grid grid-cols-4 gap-2 opacity-20 sepia-[0.5] scale-110">
          {(summary?.heroImages || []).length > 0 ? (
            summary.heroImages.map((url: string, i: number) => (
              <img
                key={i}
                src={url}
                alt=""
                className={`w-full h-64 object-cover ${i % 2 === 0 ? 'translate-y-12' : '-translate-y-8'}`}
              />
            ))
          ) : (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={`w-full h-64 bg-[var(--clr-soot)] ${i % 2 === 0 ? 'translate-y-12' : '-translate-y-8'}`} />
            ))
          )}
        </div>
      </motion.div>

      <motion.div style={{ x: textX, y: textY }} className="dashboard-hero-copy relative z-[2] max-w-[800px] w-full">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          {isLoading ? (
            <div className="space-y-4">
              <div className="h-4 w-48 rounded-full bg-[rgba(184,143,91,0.25)] animate-pulse" />
              <div className="h-14 w-[min(640px,85vw)] rounded-md bg-[rgba(247,244,239,0.14)] animate-pulse" />
              <div className="h-16 w-[min(420px,70vw)] rounded-md bg-[rgba(212,169,106,0.2)] animate-pulse mb-8" />
              <div className="flex items-center gap-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(184,143,91,0.2)] w-max px-4 py-2.5 rounded-full backdrop-blur-sm shadow-lg">
                <div className="flex -space-x-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="w-11 h-11 rounded-full border-2 border-[var(--clr-charcoal)] bg-[rgba(247,244,239,0.2)] animate-pulse" />
                  ))}
                </div>
                <div className="h-3 w-36 rounded-full bg-[rgba(194,186,171,0.35)] animate-pulse" />
              </div>
            </div>
          ) : (
            <>
              <p className="font-ui text-[11px] uppercase text-[var(--clr-gold)] tracking-[0.2em] mb-4 font-bold drop-shadow-md">
                <span className="w-2 h-2 rounded-full bg-[var(--clr-gold)] inline-block mr-2 animate-pulse" />
                Good Evening, {summary?.curatorName || 'Curator'}
              </p>
              <h1 className="font-display font-extrabold text-[clamp(2.5rem,6vw,4.5rem)] text-[var(--clr-linen)] leading-[1.05] tracking-wide mb-2 drop-shadow-lg">
                {summary?.vaultName ? summary.vaultName.toUpperCase() : 'FAMILY VAULT'}
              </h1>
              <p className="font-script text-[56px] md:text-[72px] text-[var(--clr-gold-light)] leading-[1] mb-12 drop-shadow-md">
                &ldquo;{summary?.memoryCount || 0} memories preserved&rdquo;
              </p>

              <div className="flex items-center gap-4 bg-[rgba(255,255,255,0.03)] border border-[rgba(184,143,91,0.2)] w-max px-4 py-2.5 rounded-full backdrop-blur-sm shadow-lg">
                <div className="flex -space-x-4">
                  {members?.slice(0, 3).map((member: any, i: number) => (
                    <img
                      key={member.id}
                      src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name || '')}&background=B88F5B&color=fff`}
                      alt={member.name}
                      className="w-12 h-12 rounded-full border-[3px] border-[var(--clr-charcoal)] shadow-md relative"
                      style={{ zIndex: 30 - i }}
                    />
                  ))}
                </div>
                <span className="font-ui text-[11px] text-[var(--clr-fog)] uppercase tracking-widest font-bold pr-2">
                  {kinLabel}
                </span>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>

      <motion.div className="absolute right-[-10%] top-1/2 -translate-y-1/2 hidden lg:block opacity-[0.04] text-[var(--clr-gold)] pointer-events-none z-[1]">
        <UsersThree size={600} weight="thin" />
      </motion.div>
    </section>
  );
}

export default function Dashboard() {
  const [isHovered, setIsHovered] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<any>(null);
  const navigate = useNavigate();
  const { data: summary, isLoading: isSummaryLoading } = useDashboardSummary();
  const { data: members = [], isLoading: isMembersLoading } = useMembers();
  const { currentUser } = useAuthStore();
  const canContribute = currentUser?.role === 'ADMIN' || currentUser?.role === 'CONTRIBUTOR';
  const isAdmin = currentUser?.role === 'ADMIN';

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springConfig = { damping: 50, stiffness: 400, mass: 0.5 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  const textX = useTransform(smoothX, [-500, 500], [15, -15]);
  const textY = useTransform(smoothY, [-500, 500], [15, -15]);
  const bgX = useTransform(smoothX, [-500, 500], [-10, 10]);
  const bgY = useTransform(smoothY, [-500, 500], [-10, 10]);

  const handleMouseMove = (e: MouseEvent) => {
    const { innerWidth, innerHeight } = window;
    const x = e.clientX - innerWidth / 2;
    const y = e.clientY - innerHeight / 2;
    mouseX.set(x);
    mouseY.set(y);
  };

  const onThisDayMemory = summary?.onThisDay;
  const upcomingCapsule = summary?.upcomingCapsule;
  const upcomingUnlockDate = upcomingCapsule?.unlockDate ? new Date(upcomingCapsule.unlockDate) : null;
  const msUntilUnlock = upcomingUnlockDate ? upcomingUnlockDate.getTime() - Date.now() : 0;
  const hasUpcomingCapsule = msUntilUnlock > 0;
  const daysUntilUnlock = hasUpcomingCapsule ? Math.floor(msUntilUnlock / (1000 * 60 * 60 * 24)) : 0;
  const hoursUntilUnlock = hasUpcomingCapsule ? Math.floor((msUntilUnlock / (1000 * 60 * 60)) % 24) : 0;

  return (
    <div className="min-h-screen bg-[var(--clr-charcoal)] flex flex-col relative overflow-hidden" onMouseMove={handleMouseMove}>

      <MemoryDetailModal
        isOpen={!!selectedMemory}
        onClose={() => setSelectedMemory(null)}
        memory={selectedMemory}
        onUpdate={setSelectedMemory}
      />

      <DashboardHero
        textX={textX}
        textY={textY}
        bgX={bgX}
        bgY={bgY}
        summary={summary}
        members={members}
        isLoading={isSummaryLoading || isMembersLoading}
      />

      <div className="flex-1 bg-[var(--clr-parchment)] flex flex-col relative w-full zone-light">

        <div className="relative w-full z-30 pointer-events-none mt-[-1px]">
          <TornEdge direction="dark-to-light" />

          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[60%] w-full px-4 flex justify-center pointer-events-auto z-40">
            <motion.div
              initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.8, type: 'spring' }}
              className="bg-[rgba(20,18,17,0.88)] backdrop-blur-xl border border-[rgba(184,143,91,0.4)] rounded-full px-3 py-3 flex flex-wrap justify-center gap-3 shadow-[0_16px_40px_rgba(20,18,17,0.7)]"
            >
              {canContribute && (
                <Link to="/vault" className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-[var(--clr-gold-light)] to-[var(--clr-gold-dark)] text-[var(--clr-charcoal)] font-ui font-extrabold text-[10px] uppercase tracking-widest hover:brightness-110 shadow-[var(--shadow-gold)] transition-all hover:scale-105 active:scale-95">
                  <UploadSimple size={18} weight="bold" /> Upload Exhibit
                </Link>
              )}
              {isAdmin && (
                <button onClick={() => navigate({ to: '/members' })} className="flex items-center gap-2 px-6 py-3 rounded-full border border-[var(--clr-gold)] text-[var(--clr-gold-light)] font-ui font-bold text-[10px] uppercase tracking-widest hover:bg-[rgba(184,143,91,0.15)] transition-all hover:scale-105 active:scale-95">
                  <UserPlus size={18} weight="bold" /> Add Kin
                </button>
              )}
              {canContribute && (
                <Link to="/capsules" className="hidden sm:flex items-center gap-2 px-6 py-3 rounded-full border border-[var(--clr-gold)] text-[var(--clr-gold-light)] font-ui font-bold text-[10px] uppercase tracking-widest hover:bg-[rgba(184,143,91,0.15)] transition-all hover:scale-105 active:scale-95">
                  <Timer size={18} weight="bold" /> Seal Capsule
                </Link>
              )}
              <Link to="/search" className="flex items-center gap-2 px-6 py-3 rounded-full border border-[var(--clr-gold)] text-[var(--clr-gold-light)] font-ui font-bold text-[10px] uppercase tracking-widest hover:bg-[rgba(184,143,91,0.15)] transition-all hover:scale-105 active:scale-95">
                <MagnifyingGlass size={18} weight="bold" /> Search
              </Link>
            </motion.div>
          </div>
        </div>

        <section className="relative z-10 pt-32 pb-[200px] px-[clamp(24px,5vw,80px)] flex-1">
          <div className="max-w-[var(--max-width)] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-12">

            <div className="lg:col-span-2 space-y-12">
              <div>
                <div className="flex justify-between items-end mb-8">
                  <h2 className="font-display font-bold text-[1.75rem] text-[var(--clr-ink)] tracking-widest uppercase">On This Day</h2>
                  <span className="font-ui text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--clr-gold-dark)]">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric'})}</span>
                </div>

                {isSummaryLoading ? (
                  <div className="bg-[var(--clr-linen)] rounded-[var(--radius-lg)] shadow-[var(--shadow-md)] border border-[var(--clr-aged)] overflow-hidden animate-pulse">
                    <div className="flex flex-col sm:flex-row">
                      <div className="sm:w-1/2 min-h-[300px] bg-[rgba(20,18,17,0.15)]" />
                      <div className="p-8 sm:w-1/2 space-y-4">
                        <div className="h-3 w-44 rounded-full bg-[rgba(154,115,64,0.2)]" />
                        <div className="h-8 w-3/4 rounded bg-[rgba(20,18,17,0.12)]" />
                        <div className="h-24 w-full rounded bg-[rgba(20,18,17,0.08)]" />
                        <div className="h-8 w-36 rounded-full bg-[rgba(184,143,91,0.2)]" />
                      </div>
                    </div>
                  </div>
                ) : onThisDayMemory ? (
                  <motion.div
                    onClick={() => setSelectedMemory(onThisDayMemory)}
                    whileHover={{ y: -8 }}
                    className="bg-[var(--clr-linen)] rounded-[var(--radius-lg)] shadow-[var(--shadow-md)] border border-[var(--clr-aged)] flex flex-col sm:flex-row overflow-hidden group cursor-pointer hover:border-[var(--clr-gold)] transition-colors duration-500"
                  >
                    <div className="sm:w-1/2 overflow-hidden relative">
                      <div className="absolute inset-0 bg-[var(--clr-charcoal)] opacity-20 group-hover:opacity-0 transition-opacity duration-700 z-10" />
                      <img src={onThisDayMemory.url || onThisDayMemory.original_file} className="w-full h-full min-h-[300px] object-cover sepia-[0.4] group-hover:sepia-0 group-hover:scale-105 transition-all duration-1000" />
                      <div className="absolute bottom-4 left-4 z-20 w-12 h-12 bg-[rgba(20,18,17,0.6)] backdrop-blur-md rounded-full flex items-center justify-center text-[var(--clr-gold)] border border-[rgba(184,143,91,0.5)] opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-500">
                        <PlayCircle size={24} weight="fill" />
                      </div>
                    </div>

                    <div className="p-8 sm:w-1/2 flex flex-col justify-center relative bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')]">
                      <p className="font-ui text-[10px] uppercase font-bold text-[var(--clr-dust)] tracking-[0.2em] mb-2">{onThisDayMemory.year || 'Unknown Year'} &middot; {onThisDayMemory.location}</p>
                      <h3 className="font-display font-bold text-[2rem] text-[var(--clr-ink)] leading-tight mb-2 group-hover:text-[var(--clr-gold-dark)] transition-colors">{onThisDayMemory.title}</h3>

                      <p className="font-ui text-[14px] text-[var(--clr-ink)] leading-[1.8] mt-4 mb-8 font-medium line-clamp-4">
                        {onThisDayMemory.ai_caption || "An artifact from your past, preserved in the vault."}
                      </p>

                      <div className="flex items-center gap-2 mt-auto">
                         <span className="font-ui text-[9px] uppercase tracking-widest font-bold text-[var(--clr-dust)] px-4 py-2 border border-[var(--clr-aged)] rounded-full bg-[var(--clr-paper)] group-hover:border-[var(--clr-gold)] group-hover:text-[var(--clr-gold-dark)] transition-colors">
                           View Exhibition →
                         </span>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="bg-[var(--clr-paper)] border border-[var(--clr-aged)] border-dashed rounded-[var(--radius-lg)] p-12 text-center">
                    <p className="font-script text-[36px] text-[var(--clr-dust)] leading-none mb-2">"A quiet day in history"</p>
                    <p className="font-ui text-[13px] text-[var(--clr-ink)]">No memories were recorded in the archive on this date.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-10 mt-12 lg:mt-0">

              <Link to="/tree" className="block relative group">
                <motion.div
                  whileHover={{ y: -4, borderColor: 'var(--clr-gold)' }}
                  onHoverStart={() => setIsHovered(true)}
                  onHoverEnd={() => setIsHovered(false)}
                  className="bg-[var(--clr-linen)] border border-[var(--clr-aged)] rounded-[var(--radius-lg)] p-8 text-center shadow-[var(--shadow-sm)] cursor-pointer overflow-hidden relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-[rgba(184,143,91,0.05)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  <h3 className="font-ui text-[10px] font-bold uppercase text-[var(--clr-gold-dark)] tracking-[0.2em] mb-6 relative z-10">Living Lineage</h3>

                  <div className="h-[160px] relative z-10 flex items-end justify-center mb-6">
                     <svg viewBox="0 0 100 100" className="w-[120px] h-[120px] overflow-visible">
                       <motion.path
                         initial={{ pathLength: 0.8 }}
                         animate={{ pathLength: isHovered ? 1 : 0.8 }}
                         transition={{ duration: 1.5, ease: "easeInOut" }}
                         d="M50 100 Q50 60 20 40 M50 100 Q50 60 80 40 M50 100 L50 20 M20 40 Q20 20 10 10 M20 40 Q20 20 30 10 M80 40 Q80 20 70 10 M80 40 Q80 20 90 10"
                         stroke="var(--clr-gold)" strokeWidth="3" fill="none" strokeLinecap="round"
                       />
                       <motion.circle animate={{ scale: isHovered ? [1, 1.2, 1] : 1 }} transition={{ repeat: Infinity, duration: 2 }} cx="50" cy="20" r="4" fill="var(--clr-gold-dark)" />
                       <circle cx="20" cy="40" r="3" fill="var(--clr-gold)" />
                       <circle cx="80" cy="40" r="3" fill="var(--clr-gold)" />
                     </svg>
                  </div>

                  <span className="font-ui text-[11px] font-bold text-[var(--clr-ink)] uppercase tracking-widest relative z-10 group-hover:text-[var(--clr-gold-dark)] transition-colors">
                    Expand Roots
                  </span>
                </motion.div>
              </Link>

              <Link to="/capsules" className="block relative group">
                <motion.div whileHover={{ scale: 1.02 }} className="bg-[var(--clr-charcoal)] border border-[rgba(184,143,91,0.5)] rounded-[var(--radius-lg)] p-8 text-[var(--clr-linen)] shadow-[var(--shadow-md)] relative overflow-hidden cursor-pointer">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--clr-gold)] rounded-full blur-[60px] opacity-20 group-hover:opacity-40 transition-opacity" />

                  <div className="flex items-center gap-3 mb-4 relative z-10">
                    <Timer size={20} className="text-[var(--clr-gold)] animate-pulse" weight="fill"/>
                    <h3 className="font-ui text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--clr-gold)]">
                      {hasUpcomingCapsule ? 'Unlocking Soon' : 'No Pending Capsules'}
                    </h3>
                  </div>

                  <p className="font-display font-semibold text-[1.5rem] mb-6 relative z-10 tracking-wide leading-tight">
                    {hasUpcomingCapsule ? upcomingCapsule.title : 'Create a new time capsule'}
                  </p>

                  {isSummaryLoading ? (
                    <div className="flex gap-6 relative z-10 border-t border-[rgba(184,143,91,0.2)] pt-6 animate-pulse">
                      <div className="space-y-2">
                        <div className="h-9 w-14 rounded bg-[rgba(212,169,106,0.25)]" />
                        <div className="h-2.5 w-10 rounded-full bg-[rgba(194,186,171,0.25)]" />
                      </div>
                      <div className="w-px h-10 bg-[rgba(184,143,91,0.2)]" />
                      <div className="space-y-2">
                        <div className="h-9 w-14 rounded bg-[rgba(212,169,106,0.25)]" />
                        <div className="h-2.5 w-12 rounded-full bg-[rgba(194,186,171,0.25)]" />
                      </div>
                    </div>
                  ) : hasUpcomingCapsule ? (
                    <div className="flex gap-6 relative z-10 border-t border-[rgba(184,143,91,0.2)] pt-6">
                      <div>
                        <span className="block font-display font-extrabold text-[2rem] text-[var(--clr-gold-light)] leading-none mb-1">
                          {String(daysUntilUnlock).padStart(2, '0')}
                        </span>
                        <span className="font-ui text-[9px] uppercase tracking-[0.2em] font-bold text-[var(--clr-fog)]">Days</span>
                      </div>
                      <div className="w-px h-10 bg-[rgba(184,143,91,0.2)]" />
                      <div>
                        <span className="block font-display font-extrabold text-[2rem] text-[var(--clr-gold-light)] leading-none mb-1">
                          {String(hoursUntilUnlock).padStart(2, '0')}
                        </span>
                        <span className="font-ui text-[9px] uppercase tracking-[0.2em] font-bold text-[var(--clr-fog)]">Hours</span>
                      </div>
                    </div>
                  ) : (
                    <div className="font-ui text-[11px] uppercase tracking-[0.2em] font-bold text-[var(--clr-fog)] border-t border-[rgba(184,143,91,0.2)] pt-6 relative z-10">
                      Nothing scheduled yet
                    </div>
                  )}
                </motion.div>
              </Link>

            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
