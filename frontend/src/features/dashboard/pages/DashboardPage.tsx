import { memo, Suspense, useRef, useState, type MouseEvent } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { UploadSimple, UserPlus, Timer, MagnifyingGlass, UsersThree, PlayCircle } from '@phosphor-icons/react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sparkles, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { TornEdge } from '../../../components/ui/TornEdge';
import MemoryDetailModal from '../../vault/components/MemoryDetailModal';
import { useVaultClusters } from '../../vault/hooks/useVault';
import { useCapsules } from '../../capsules/hooks/useCapsules';
import { useTimeline } from '../../chronicles/hooks/useChronicles';

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
  memoryCount,
}: {
  textX: ReturnType<typeof useTransform<number, number>>;
  textY: ReturnType<typeof useTransform<number, number>>;
  bgX: ReturnType<typeof useTransform<number, number>>;
  bgY: ReturnType<typeof useTransform<number, number>>;
  memoryCount: number;
}) {
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
          <img src="https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=600&q=80" alt="" className="w-full h-64 object-cover" />
          <img src="https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=600&q=80" alt="" className="w-full h-64 object-cover translate-y-12" />
          <img src="https://images.unsplash.com/photo-1511895426328-dc8714191300?w=600&q=80" alt="" className="w-full h-64 object-cover" />
          <img src="https://images.unsplash.com/photo-1532274402911-5a369e4c4bb5?w=600&q=80" alt="" className="w-full h-64 object-cover -translate-y-8" />
        </div>
      </motion.div>

      <motion.div style={{ x: textX, y: textY }} className="dashboard-hero-copy relative z-[2] max-w-[800px] w-full">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="font-ui text-[11px] uppercase text-[var(--clr-gold)] tracking-[0.2em] mb-4 font-bold drop-shadow-md">
            <span className="w-2 h-2 rounded-full bg-[var(--clr-gold)] inline-block mr-2 animate-pulse" />
            Good Evening, Abebe
          </p>
          <h1 className="font-display font-extrabold text-[clamp(2.5rem,6vw,4.5rem)] text-[var(--clr-linen)] leading-[1.05] tracking-wide mb-2 drop-shadow-lg">
            THE KEBEDE <br className="hidden md:block" />
            FAMILY VAULT
          </h1>
          <p className="font-script text-[56px] md:text-[72px] text-[var(--clr-gold-light)] leading-[1] mb-12 drop-shadow-md">
            &ldquo;{memoryCount} memories preserved&rdquo;
          </p>

          <div className="flex items-center gap-4 bg-[rgba(255,255,255,0.03)] border border-[rgba(184,143,91,0.2)] w-max px-4 py-2.5 rounded-full backdrop-blur-sm shadow-lg">
            <div className="flex -space-x-4">
              <img src="https://ui-avatars.com/api/?name=Abebe&background=B88F5B&color=fff" alt="" className="w-12 h-12 rounded-full border-[3px] border-[var(--clr-charcoal)] shadow-md relative z-30" />
              <img src="https://ui-avatars.com/api/?name=Fatima&background=DBCFB5&color=2A2522" alt="" className="w-12 h-12 rounded-full border-[3px] border-[var(--clr-charcoal)] shadow-md relative z-20" />
              <img src="https://ui-avatars.com/api/?name=Yohannes&background=3A5F7A&color=fff" alt="" className="w-12 h-12 rounded-full border-[3px] border-[var(--clr-charcoal)] shadow-md relative z-10" />
            </div>
            <span className="font-ui text-[11px] text-[var(--clr-fog)] uppercase tracking-widest font-bold pr-2">
              Abebe, Fatima + 3 kin
            </span>
          </div>
        </motion.div>
      </motion.div>

      <motion.div className="absolute right-[-10%] top-1/2 -translate-y-1/2 hidden lg:block opacity-[0.04] text-[var(--clr-gold)] pointer-events-none z-[1]">
        <UsersThree size={600} weight="thin" />
      </motion.div>
    </section>
  );
}

export default function DashboardPage() {
  const [isHovered, setIsHovered] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<any>(null);
  const navigate = useNavigate();

  const { data: clusters = [] } = useVaultClusters();
  const { data: capsules = [] } = useCapsules();
  const { data: events = [] } = useTimeline();

  const memoryCount = clusters.reduce((acc, c) => acc + c.memories.length, 0);

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

  const onThisDayMemory = {
    title: "Summer in the Hills",
    date: "July 15, 1994",
    location: "Entoto Park",
    url: "https://images.unsplash.com/photo-1511895426328-dc8714191300?q=80&w=800",
    aiCaption: "Thirty years ago today, the family gathered at Entoto Park for Abebe's 50th birthday. The sun was shining, and everyone brought their favorite dishes.",
    people: ["Abebe Kebede", "Fatima Haile"]
  };

  return (
    <div className="min-h-screen bg-[var(--clr-charcoal)] flex flex-col relative overflow-hidden" onMouseMove={handleMouseMove}>

      <MemoryDetailModal
        isOpen={!!selectedMemory}
        onClose={() => setSelectedMemory(null)}
        memory={selectedMemory}
      />

      <DashboardHero textX={textX} textY={textY} bgX={bgX} bgY={bgY} memoryCount={memoryCount} />

      <div className="flex-1 bg-[var(--clr-parchment)] flex flex-col relative w-full zone-light">

        <div className="relative w-full z-30 pointer-events-none mt-[-1px]">
          <TornEdge direction="dark-to-light" />

          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[60%] w-full px-4 flex justify-center pointer-events-auto z-40">
            <motion.div
              initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.8, type: 'spring' }}
              className="bg-[rgba(20,18,17,0.88)] backdrop-blur-xl border border-[rgba(184,143,91,0.4)] rounded-full px-3 py-3 flex flex-wrap justify-center gap-3 shadow-[0_16px_40px_rgba(20,18,17,0.7)]"
            >
              <Link to="/vault" className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-[var(--clr-gold-light)] to-[var(--clr-gold-dark)] text-[var(--clr-charcoal)] font-ui font-extrabold text-[10px] uppercase tracking-widest hover:brightness-110 shadow-[var(--shadow-gold)] transition-all hover:scale-105 active:scale-95">
                <UploadSimple size={18} weight="bold" /> Upload Exhibit
              </Link>
              <button onClick={() => navigate({ to: '/members' })} className="flex items-center gap-2 px-6 py-3 rounded-full border border-[var(--clr-gold)] text-[var(--clr-gold-light)] font-ui font-bold text-[10px] uppercase tracking-widest hover:bg-[rgba(184,143,91,0.15)] transition-all hover:scale-105 active:scale-95">
                <UserPlus size={18} weight="bold" /> Add Kin
              </button>
              <Link to="/capsules" className="hidden sm:flex items-center gap-2 px-6 py-3 rounded-full border border-[var(--clr-gold)] text-[var(--clr-gold-light)] font-ui font-bold text-[10px] uppercase tracking-widest hover:bg-[rgba(184,143,91,0.15)] transition-all hover:scale-105 active:scale-95">
                <Timer size={18} weight="bold" /> Seal Capsule
              </Link>
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
                  <span className="font-ui text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--clr-gold-dark)]">July 15</span>
                </div>

                <motion.div
                  onClick={() => setSelectedMemory(onThisDayMemory)}
                  whileHover={{ y: -8 }}
                  className="bg-[var(--clr-linen)] rounded-[var(--radius-lg)] shadow-[var(--shadow-md)] border border-[var(--clr-aged)] flex flex-col sm:flex-row overflow-hidden group cursor-pointer hover:border-[var(--clr-gold)] transition-colors duration-500"
                >
                  <div className="sm:w-1/2 overflow-hidden relative">
                    <div className="absolute inset-0 bg-[var(--clr-charcoal)] opacity-20 group-hover:opacity-0 transition-opacity duration-700 z-10" />
                    <img src="https://images.unsplash.com/photo-1511895426328-dc8714191300?q=80&w=800" className="w-full h-full min-h-[300px] object-cover sepia-[0.4] group-hover:sepia-0 group-hover:scale-105 transition-all duration-1000" />
                    <div className="absolute bottom-4 left-4 z-20 w-12 h-12 bg-[rgba(20,18,17,0.6)] backdrop-blur-md rounded-full flex items-center justify-center text-[var(--clr-gold)] border border-[rgba(184,143,91,0.5)] opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-500">
                      <PlayCircle size={24} weight="fill" />
                    </div>
                  </div>

                  <div className="p-8 sm:w-1/2 flex flex-col justify-center relative bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')]">
                    <p className="font-ui text-[10px] uppercase font-bold text-[var(--clr-dust)] tracking-[0.2em] mb-2">1994 &middot; Entoto Park</p>
                    <h3 className="font-display font-bold text-[2rem] text-[var(--clr-ink)] leading-tight mb-2 group-hover:text-[var(--clr-gold-dark)] transition-colors">Summer in the Hills</h3>
                    <p className="font-script text-[44px] text-[var(--clr-dust)] leading-[0.5] mb-8">"A picnic to remember"</p>

                    <p className="font-ui text-[14px] text-[var(--clr-ink)] leading-[1.8] mb-8 font-medium">
                      Thirty years ago today, the family gathered at Entoto Park for Abebe's 50th birthday. The sun was shining, and everyone brought their favorite dishes.
                    </p>

                    <div className="flex items-center gap-2 mt-auto">
                       <span className="font-ui text-[9px] uppercase tracking-widest font-bold text-[var(--clr-dust)] px-4 py-2 border border-[var(--clr-aged)] rounded-full bg-[var(--clr-paper)] group-hover:border-[var(--clr-gold)] group-hover:text-[var(--clr-gold-dark)] transition-colors">
                         View Exhibition →
                       </span>
                    </div>
                  </div>
                </motion.div>
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
                    <h3 className="font-ui text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--clr-gold)]">Unlocking Soon</h3>
                  </div>

                  <p className="font-display font-semibold text-[1.5rem] mb-6 relative z-10 tracking-wide leading-tight">Wedding<br/>Anniversary</p>

                  <div className="flex gap-6 relative z-10 border-t border-[rgba(184,143,91,0.2)] pt-6">
                    <div>
                      <span className="block font-display font-extrabold text-[2rem] text-[var(--clr-gold-light)] leading-none mb-1">12</span>
                      <span className="font-ui text-[9px] uppercase tracking-[0.2em] font-bold text-[var(--clr-fog)]">Days</span>
                    </div>
                    <div className="w-px h-10 bg-[rgba(184,143,91,0.2)]" />
                    <div>
                      <span className="block font-display font-extrabold text-[2rem] text-[var(--clr-gold-light)] leading-none mb-1">04</span>
                      <span className="font-ui text-[9px] uppercase tracking-[0.2em] font-bold text-[var(--clr-fog)]">Hours</span>
                    </div>
                  </div>
                </motion.div>
              </Link>

            </div>
          </div>
        </section>
      </div>
    </div>
  );
}