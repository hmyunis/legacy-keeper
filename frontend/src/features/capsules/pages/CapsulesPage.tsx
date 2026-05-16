import { useState, useRef, useMemo, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LockKey, Envelope, X, CalendarBlank, PenNib, Image as ImageIcon } from '@phosphor-icons/react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Float, Sparkles, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { sileo } from 'sileo';
import { Button } from '../../../components/ui/Button';
import type { Capsule } from '../types';

export const ShatteringSeal = ({ isShattered }: { isShattered: boolean }) => {
  const fragments = useMemo(() => Array.from({ length: 25 }).map(() => ({
      position: new THREE.Vector3(0, 0, 1.05),
      velocity: new THREE.Vector3((Math.random() - 0.5) * 6, Math.random() * 6 + 2, Math.random() * 4 + 2),
      rotation: new THREE.Vector3(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI),
      rotVelocity: new THREE.Vector3((Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2),
      scale: Math.random() * 0.15 + 0.05
  })), []);

  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (isShattered && groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        const frag = fragments[i];
        frag.velocity.y -= 9.8 * delta;
        child.position.addScaledVector(frag.velocity, delta);
        child.rotation.x += frag.rotVelocity.x;
        child.rotation.y += frag.rotVelocity.y;
        child.rotation.z += frag.rotVelocity.z;
        if (child.scale.x > 0) {
          const newScale = Math.max(0, child.scale.x - delta * 0.1);
          child.scale.set(newScale, newScale, newScale);
        }
      });
    }
  });

  return (
    <group ref={groupRef}>
      {!isShattered ? (
        <mesh position={[0, 0, 1.05]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 0.05, 32]} />
          <meshStandardMaterial color="#8B3A3A" roughness={0.4} metalness={0.1} />
        </mesh>
      ) : fragments.map((frag, i) => (
          <mesh key={i} position={frag.position} rotation={[frag.rotation.x, frag.rotation.y, frag.rotation.z]} scale={frag.scale}>
            <tetrahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color="#8B3A3A" roughness={0.4} />
          </mesh>
      ))}
    </group>
  );
};

export const FloatingMemories = ({ isOpened }: { isOpened: boolean }) => {
  const texture1 = useTexture('https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=400');
  const texture2 = useTexture('https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?q=80&w=400');
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (isOpened && groupRef.current) {
      groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, 2.5, 0.02);
      groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, 1.5, 0.02);
      groupRef.current.children[0].rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
      groupRef.current.children[1].rotation.y = Math.sin(state.clock.elapsedTime * 0.3 + 1) * 0.2;
    }
  });

  if (!isOpened) return null;

  return (
    <group ref={groupRef} position={[0, -1, 0]}>
      <mesh position={[-0.9, 0, 0]} rotation={[0, 0.2, 0.1]} castShadow>
        <planeGeometry args={[1.4, 1.8]} />
        <meshStandardMaterial map={texture1} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0.9, 0.5, -0.5]} rotation={[0, -0.2, -0.1]} castShadow>
        <planeGeometry args={[1.4, 1.8]} />
        <meshStandardMaterial map={texture2} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

export const Capsule3D = ({ status, onClick }: { status: 'idle' | 'shattering' | 'opened', onClick?: () => void }) => {
  const topRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame(() => {
    if (status === 'opened') {
      if (topRef.current) {
        topRef.current.position.y = THREE.MathUtils.lerp(topRef.current.position.y, 2.8, 0.05);
        topRef.current.rotation.y += 0.05;
        topRef.current.rotation.z = THREE.MathUtils.lerp(topRef.current.rotation.z, 0.2, 0.05);
      }
      if (lightRef.current) {
        lightRef.current.intensity = THREE.MathUtils.lerp(lightRef.current.intensity, 20, 0.05);
      }
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.3}>
      <group onClick={onClick}>
        <pointLight ref={lightRef} position={[0, 1, 0]} color="#D4A96A" intensity={0} distance={15} />

        <mesh ref={topRef} position={[0, 1.2, 0]} castShadow>
          <cylinderGeometry args={[1.05, 1.05, 0.4, 32]} />
          <meshStandardMaterial color="#9A7340" metalness={0.9} roughness={0.2} />
          <mesh position={[0, 0.2, 0]}>
            <torusGeometry args={[0.8, 0.05, 16, 32]} />
            <meshStandardMaterial color="#B88F5B" metalness={1} roughness={0.1} />
          </mesh>
        </mesh>

        <mesh position={[0, 0, 0]} castShadow>
          <cylinderGeometry args={[1, 1, 2, 32]} />
          <meshStandardMaterial color="#1E1A17" metalness={0.6} roughness={0.6} />
        </mesh>

        <mesh position={[0, -1.1, 0]} castShadow>
          <cylinderGeometry args={[1.1, 1.1, 0.2, 32]} />
          <meshStandardMaterial color="#9A7340" metalness={0.9} roughness={0.2} />
        </mesh>

        <ShatteringSeal isShattered={status !== 'idle'} />
        <FloatingMemories isOpened={status === 'opened'} />
      </group>
    </Float>
  );
};

export default function CapsulesPage() {
  const [view, setView] = useState<'gallery' | 'create' | 'unlocking'>('gallery');
  const [ceremonyStatus, setCeremonyStatus] = useState<'idle' | 'shattering' | 'opened'>('idle');
  const [createStep, setCreateStep] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerUnlock = () => {
    setView('unlocking');
    setCeremonyStatus('idle');
  };

  const handleCeremonyClick = () => {
    if (ceremonyStatus === 'idle') {
      setCeremonyStatus('shattering');
      setTimeout(() => {
        setCeremonyStatus('opened');
        sileo.success({ title: "Seal Broken", description: "The time-locked artifacts are now visible." });
      }, 600);
    }
  };

  const handleSealCapsule = () => {
    setCreateStep(4);
    setTimeout(() => {
      sileo.success({ title: "Vault Locked", description: "Capsule secured until December 2028." });
      setView('gallery');
      setCreateStep(1);
    }, 4500);
  };

  const handleBrowseUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      sileo.success({ title: "Artifacts Queued", description: `${e.target.files.length} artifact(s) added to tray.` });
    }
  };

  return (
    <div className="min-h-screen bg-[var(--clr-charcoal)] text-[var(--clr-linen)] pt-[var(--shell-offset-top)] relative overflow-hidden flex flex-col">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none z-0" />

      <AnimatePresence mode="wait">

        {view === 'gallery' && (
          <motion.div
            key="gallery"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 w-full max-w-[var(--max-width)] mx-auto px-[clamp(24px,5vw,80px)] relative z-10 pb-20"
          >
            <div className="text-center mb-16 pt-8">
              <h1 className="font-display font-semibold text-[var(--type-h1)] tracking-[0.03em] uppercase text-[var(--clr-linen)]">SEALED IN TIME</h1>
              <p className="font-script text-[44px] text-[var(--clr-gold)] leading-[0.5] mt-4">"Moments waiting to be opened"</p>
              <Button variant="primary" className="mt-12 shadow-[var(--shadow-gold)]" onClick={() => setView('create')}>
                + CREATE CAPSULE
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bg-[var(--clr-soot)] border border-[rgba(184,143,91,0.2)] rounded-[var(--radius-lg)] p-8 text-center flex flex-col items-center justify-between min-h-[380px] relative overflow-hidden group hover:border-[rgba(184,143,91,0.5)] transition-all duration-500 shadow-[var(--shadow-md)]">
                <div className="w-24 h-24 bg-[var(--clr-danger)] rounded-full flex items-center justify-center text-white mb-6 shadow-[0_0_32px_rgba(139,58,58,0.4)] group-hover:scale-110 transition-transform duration-500">
                  <LockKey size={36} weight="fill" />
                </div>
                <div className="flex-1 flex flex-col justify-center">
                  <h3 className="font-display font-bold text-[1.75rem] mb-2 text-[var(--clr-linen)] tracking-wide">Abebe's 80th</h3>
                  <p className="font-ui text-[11px] uppercase tracking-widest text-[var(--clr-fog)] mb-6 font-bold">SEALED UNTIL DEC 2028</p>
                </div>
                <div className="w-full bg-[rgba(0,0,0,0.4)] rounded-[var(--radius-md)] p-4 border border-[rgba(255,255,255,0.05)]">
                  <span className="font-display text-[2.5rem] text-[var(--clr-gold)] mr-2 leading-none">942</span>
                  <span className="font-ui text-[10px] uppercase tracking-widest text-[var(--clr-fog)]">Days Left</span>
                </div>
              </div>

              <div className="bg-[var(--clr-soot)] border-2 border-[var(--clr-gold)] rounded-[var(--radius-lg)] p-8 text-center flex flex-col items-center justify-between min-h-[380px] relative overflow-hidden group shadow-[var(--shadow-gold)]">
                <div className="absolute inset-0 bg-[var(--clr-gold)] opacity-[0.03] animate-pulse" />
                <div
                  className="w-24 h-24 bg-[var(--clr-gold)] rounded-full flex items-center justify-center text-[var(--clr-charcoal)] mb-6 shadow-[0_0_40px_rgba(184,143,91,0.6)] cursor-pointer hover:scale-110 transition-transform duration-300 relative z-10"
                  onClick={triggerUnlock}
                >
                  <Envelope size={36} weight="fill" />
                </div>
                <div className="flex-1 flex flex-col justify-center relative z-10">
                  <h3 className="font-display font-bold text-[1.75rem] mb-2 text-[var(--clr-linen)] tracking-wide">Graduation Day</h3>
                  <p className="font-ui text-[11px] uppercase tracking-widest text-[var(--clr-gold)] mb-6 font-bold animate-pulse">READY TO OPEN</p>
                </div>
                <Button variant="primary" className="w-full relative z-10" onClick={triggerUnlock}>
                  REVEAL NOW
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {view === 'create' && (
          <motion.div
            key="create"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-[var(--clr-parchment)] overflow-hidden flex flex-col zone-light"
          >
            <div className="flex items-center justify-between px-[clamp(24px,5vw,80px)] py-6 border-b border-[var(--clr-aged)] bg-[rgba(247,244,239,0.9)] backdrop-blur-md relative z-20">
              <div>
                 <h2 className="font-display font-bold text-[1.5rem] text-[var(--clr-ink)] uppercase tracking-widest leading-none">Capsule Ceremony</h2>
                 <p className="font-ui text-[10px] uppercase tracking-widest text-[var(--clr-gold-dark)] font-bold mt-1">Step {createStep} of 3</p>
              </div>
              <button onClick={() => setView('gallery')} className="w-12 h-12 rounded-full border border-[var(--clr-aged)] text-[var(--clr-ink)] flex items-center justify-center hover:bg-[var(--clr-gold)] hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 relative overflow-y-auto">
              <AnimatePresence mode="wait">

                {createStep === 1 && (
                  <motion.div key="s1" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="max-w-[1000px] mx-auto py-12 px-6 flex flex-col lg:flex-row gap-12 h-full">
                    <div className="w-full lg:w-[40%] space-y-8">
                      <div className="w-16 h-16 rounded-full border-[2px] border-[var(--clr-gold)] text-[var(--clr-gold-dark)] flex items-center justify-center shadow-[var(--shadow-sm)] mb-8 bg-white">
                        <LockKey size={32} weight="fill" />
                      </div>
                      <h3 className="font-display font-extrabold text-[2.5rem] leading-none uppercase text-[var(--clr-ink)] tracking-wide">Seal an Era</h3>

                      <div className="space-y-6 pt-4">
                        <div>
                          <label className="font-ui text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--clr-dust)] mb-2 block">Capsule Title</label>
                          <input type="text" placeholder="e.g. Letters to the Future" className="w-full bg-[var(--clr-paper)] border border-[var(--clr-aged)] rounded-[var(--radius-pill)] px-6 py-4 font-ui text-[16px] text-[var(--clr-ink)] outline-none focus:border-[var(--clr-gold)] shadow-inner" />
                        </div>
                        <div>
                          <label className="font-ui text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--clr-dust)] mb-2 block">Unlock Date</label>
                          <div className="relative">
                            <CalendarBlank size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-[var(--clr-gold)]" />
                            <input type="date" className="w-full bg-[var(--clr-paper)] border border-[var(--clr-aged)] rounded-[var(--radius-pill)] pl-14 pr-6 py-4 font-ui text-[16px] text-[var(--clr-ink)] outline-none focus:border-[var(--clr-gold)] shadow-inner" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="w-full lg:w-[60%] bg-[var(--clr-paper)] border border-[var(--clr-aged)] rounded-[var(--radius-lg)] p-8 shadow-inner flex flex-col">
                      <div className="flex justify-between items-center mb-6">
                        <h4 className="font-ui text-[12px] font-bold uppercase tracking-[0.15em] text-[var(--clr-ink)] flex items-center gap-2">
                          <ImageIcon size={18} className="text-[var(--clr-gold-dark)]"/> Contents Tray
                        </h4>
                        <span className="font-ui text-[11px] text-[var(--clr-dust)]">2 Items Selected</span>
                      </div>

                      <div className="flex-1 border-2 border-dashed border-[var(--clr-aged)] rounded-[var(--radius-md)] p-6 bg-[rgba(255,255,255,0.4)] flex flex-wrap gap-4 content-start">
                        <div className="w-[120px] h-[120px] rounded-md shadow-md border border-[var(--clr-aged)] overflow-hidden relative group">
                          <img src="https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=200" className="w-full h-full object-cover sepia-[0.3]" />
                        </div>
                        <div onClick={handleBrowseUpload} className="w-[120px] h-[120px] rounded-md border border-[var(--clr-aged)] bg-[var(--clr-linen)] flex flex-col items-center justify-center cursor-pointer hover:border-[var(--clr-gold)] hover:text-[var(--clr-gold)] transition-colors text-[var(--clr-dust)] shadow-sm">
                          <span className="text-3xl mb-1">+</span>
                          <span className="font-ui text-[9px] uppercase tracking-widest font-bold">Browse</span>
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileChange} />
                      </div>

                      <div className="mt-8 flex justify-end">
                        <Button variant="primary" onClick={() => setCreateStep(2)} className="px-10 shadow-[var(--shadow-gold)]">WRITE THE LETTER →</Button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {createStep === 2 && (
                  <motion.div key="s2" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="max-w-[800px] mx-auto py-12 px-6">
                     <div className="text-center mb-8">
                       <PenNib size={40} className="mx-auto text-[var(--clr-gold)] mb-4" />
                       <h3 className="font-script text-[48px] text-[var(--clr-dust)] leading-[0.5]">"Words across time"</h3>
                     </div>

                     <div className="w-full min-h-[500px] bg-[#fdfbf7] border border-[var(--clr-aged)] rounded-md shadow-2xl p-10 relative overflow-hidden"
                          style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, rgba(184,143,91,0.2) 31px, rgba(184,143,91,0.2) 32px)', lineHeight: '32px' }}>
                        <div className="absolute left-12 top-0 bottom-0 w-px bg-red-800/20 pointer-events-none" />
                        <textarea
                          className="w-full h-full min-h-[400px] bg-transparent border-none outline-none resize-none font-script text-[36px] text-[var(--clr-ink)] pl-8 leading-[32px] pt-[4px]"
                          placeholder="My dearest family..."
                          autoFocus
                        />
                     </div>

                     <div className="mt-10 flex justify-between items-center">
                       <button onClick={() => setCreateStep(1)} className="font-ui text-[11px] uppercase font-bold text-[var(--clr-dust)] tracking-widest hover:text-[var(--clr-ink)]">← Go Back</button>
                       <Button variant="primary" onClick={handleSealCapsule} className="px-12 shadow-[var(--shadow-gold)]">SEAL THE CAPSULE</Button>
                     </div>
                  </motion.div>
                )}

                {createStep === 4 && (
                  <motion.div key="s4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[9999] bg-[#0E0C0B] flex flex-col items-center justify-center">
                    <div className="absolute inset-0 z-0">
                      <Canvas camera={{ position: [0, 0, 7.5] }}>
                        <ambientLight intensity={0.5} />
                        <pointLight position={[2, 2, 2]} intensity={2} color="#D4A96A" />
                        <group position={[0, -0.5, 0]} scale={1.1}>
                          <Capsule3D status="idle" />
                          <mesh position={[0,0,1.2]}>
                             <cylinderGeometry args={[0.35, 0.35, 0.1, 32]} />
                             <meshStandardMaterial color="#8B3A3A" />
                          </mesh>
                        </group>
                      </Canvas>
                    </div>

                    <div className="relative z-10 text-center">
                       <motion.div
                         initial={{ y: -200, scale: 2, opacity: 0 }}
                         animate={{ y: 0, scale: 1, opacity: 1 }}
                         transition={{ type: "spring", damping: 12, stiffness: 100, delay: 0.5 }}
                         className="mb-8"
                       >
                         <svg width="120" height="120" viewBox="0 0 100 100" className="mx-auto drop-shadow-2xl">
                           <circle cx="50" cy="50" r="45" fill="#8B3A3A" />
                           <circle cx="50" cy="50" r="40" fill="none" stroke="#5a2323" strokeWidth="2" />
                           <text x="50" y="58" textAnchor="middle" fill="#5a2323" fontSize="24" fontFamily="Georgia" fontWeight="bold">LK</text>
                         </svg>
                       </motion.div>

                       <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }} className="font-display text-[3rem] text-[var(--clr-gold)] uppercase tracking-[0.2em] drop-shadow-md">Sealed.</motion.h2>
                       <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.0 }} className="font-ui text-[12px] text-[var(--clr-fog)] uppercase tracking-widest mt-2">Locked until December 2028</motion.p>
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {view === 'unlocking' && (
          <motion.div
            key="unlocking"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="fixed inset-0 z-[9999] bg-[#0E0C0B] flex flex-col"
          >
            <div className="absolute inset-0 z-10 pointer-events-none">
              <Canvas camera={{ position: [0, 1.5, 10], fov: 40 }}>
                <color attach="background" args={['#0E0C0B']} />
                <ambientLight intensity={0.5} />
                <Environment preset="city" />
                <spotLight position={[5, 5, 5]} angle={0.4} penumbra={1} intensity={2} color="#D4A96A" />
                <spotLight position={[-5, 5, -5]} angle={0.4} penumbra={1} intensity={1} color="#ffffff" />
                <Sparkles count={800} scale={18} size={1.5} speed={0.2} opacity={0.6} color="#D4A96A" />

                <Suspense fallback={null}>
                  <group position={[0, -1.5, 0]}>
                    <Capsule3D status={ceremonyStatus} onClick={handleCeremonyClick} />
                  </group>
                </Suspense>
              </Canvas>
            </div>

            <div className="absolute top-10 left-10 right-10 z-20 flex justify-between items-start pointer-events-none">
               <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 1 }}>
                 <p className="font-script text-[56px] text-[var(--clr-gold)] leading-[0.5] mb-4">"A Message From The Past"</p>
                 <p className="font-display text-[1.25rem] text-[var(--clr-linen)] tracking-widest uppercase">FROM ABEBE &middot; SEALED 1994</p>
               </motion.div>

               <button onClick={() => setView('gallery')} className="pointer-events-auto text-[var(--clr-fog)] hover:text-[var(--clr-gold)] transition-colors">
                 <X size={32} weight="thin" />
               </button>
            </div>

            <AnimatePresence>
              {ceremonyStatus === 'idle' && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: 1 }} className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                  <div className="bg-[rgba(184,143,91,0.15)] border border-[var(--clr-gold)] px-6 py-3 rounded-full backdrop-blur-md flex items-center gap-3 shadow-[var(--shadow-gold)]">
                    <LockKey size={20} className="text-[var(--clr-gold)]" />
                    <span className="font-ui text-[11px] uppercase tracking-widest text-[var(--clr-gold)] font-bold">Click the capsule to break the seal</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}