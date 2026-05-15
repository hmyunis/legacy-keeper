/**
 * LegacyKeeper — Landing Page
 *
 * Required packages (add to your project):
 *   npm install @react-three/fiber @react-three/drei three
 *   npm install -D @types/three
 */

import { Link, useNavigate } from '@tanstack/react-router';
import { Button } from '../components/ui/Button';
import { TornEdge } from '../components/ui/TornEdge';
import { motion } from 'framer-motion';
import { Image, TreeStructure, TextAa, MagicWand } from '@phosphor-icons/react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sparkles } from '@react-three/drei';
import { useRef, useMemo, Suspense, type ReactNode, type CSSProperties } from 'react';
import * as THREE from 'three';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const GOLD     = '#B88F5B';
const LINEN    = '#F7F4EF';
const CHARCOAL = '#141211';

// ─────────────────────────────────────────────────────────────────────────────
// THREE.JS — Single floating photo frame
// ─────────────────────────────────────────────────────────────────────────────

interface FrameProps {
  position: [number, number, number];
  rotation: [number, number, number];
  scale?  : number;
  drift?  : number;
}

function PhotoFrame({ position, rotation, scale = 1, drift = 0.02 }: FrameProps) {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame((_, dt) => {
    groupRef.current.rotation.y += dt * drift;
  });

  const W = 3.2, H = 2.2, D = 0.09, B = 0.16;

  type Bar = [number, number, number, number, number, number];
  const bars: Bar[] = [
    [0,              H / 2 - B / 2,  0, W,         B,          D],
    [0,            -(H / 2 - B / 2), 0, W,         B,          D],
    [-(W / 2 - B / 2), 0,            0, B, H - B * 2, D],
    [  W / 2 - B / 2,  0,            0, B, H - B * 2, D],
  ];

  const studs: [number, number][] = [
    [-(W / 2 - B / 2),  H / 2 - B / 2],
    [  W / 2 - B / 2,   H / 2 - B / 2],
    [-(W / 2 - B / 2), -(H / 2 - B / 2)],
    [  W / 2 - B / 2,  -(H / 2 - B / 2)],
  ];

  return (
    <Float speed={0.65} rotationIntensity={0.07} floatIntensity={0.24}>
      <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
        {/* Four frame bars */}
        {bars.map(([x, y, z, w, h, d], i) => (
          <mesh key={i} position={[x, y, z]}>
            <boxGeometry args={[w, h, d]} />
            <meshStandardMaterial color={GOLD} metalness={0.88} roughness={0.12} />
          </mesh>
        ))}

        {/* Corner sphere studs */}
        {studs.map(([x, y], i) => (
          <mesh key={`s${i}`} position={[x, y, D / 2 + 0.028]}>
            <sphereGeometry args={[0.09, 10, 10]} />
            <meshStandardMaterial color={GOLD} metalness={0.95} roughness={0.07} />
          </mesh>
        ))}

        {/* Dark canvas surface */}
        <mesh position={[0, 0, -(D / 2) + 0.004]}>
          <planeGeometry args={[W - B * 2, H - B * 2]} />
          <meshStandardMaterial color="#0B0907" roughness={0.98} metalness={0} />
        </mesh>

        {/* Linen inner mat — very subtle */}
        <mesh position={[0, 0, -(D / 2) + 0.007]}>
          <planeGeometry args={[W - B * 2 - 0.14, H - B * 2 - 0.14]} />
          <meshStandardMaterial color="#1C1410" roughness={1} transparent opacity={0.55} />
        </mesh>
      </group>
    </Float>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// THREE.JS — Full hero scene
// ─────────────────────────────────────────────────────────────────────────────

function HeroLights() {
  const keyRef = useRef<THREE.PointLight>(null!);
  const fillRef = useRef<THREE.PointLight>(null!);
  const rimRef = useRef<THREE.PointLight>(null!);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (keyRef.current) {
      keyRef.current.position.x = Math.sin(t * 0.32) * 5.5;
      keyRef.current.position.y = 3.8 + Math.cos(t * 0.24) * 1.8;
      keyRef.current.intensity = 3.5 + Math.sin(t * 0.55) * 1.0;
    }
    if (fillRef.current) {
      fillRef.current.position.x = Math.cos(t * 0.2) * 4.5;
      fillRef.current.position.z = 1.5 + Math.sin(t * 0.17) * 2;
      fillRef.current.intensity = 2.2 + Math.cos(t * 0.38) * 0.8;
    }
    if (rimRef.current) {
      rimRef.current.position.y = 5 + Math.sin(t * 0.15) * 2;
      rimRef.current.intensity = 1.2 + Math.sin(t * 0.42) * 0.5;
    }
  });

  return (
    <>
      <ambientLight intensity={0.25} color="#2A1B0A" />
      <pointLight ref={keyRef}  position={[-5, 4, 2]}  intensity={3.5} color="#E5C185" distance={30} decay={1.5} />
      <pointLight ref={fillRef} position={[5, -2, 1]} intensity={2.2} color="#D4A96A" distance={24} decay={1.5} />
      <pointLight ref={rimRef}  position={[0, 6, -7]}  intensity={1.2} color="#FFFFFF" distance={40} decay={1.5} />
      <pointLight position={[0, -5, -3]} intensity={0.6} color="#5A3E1B" distance={20} decay={2} />
    </>
  );
}

function HeroScene() {
  return (
    <>
      <fog attach="fog" args={[CHARCOAL, 20, 60]} />
      <HeroLights />

      {/* Foreground frames — visible at the edges of the hero */}
      <PhotoFrame position={[-6.2,  0.8,  -2.5]} rotation={[ 0.04,  0.48,  0.03]} scale={0.68} drift={ 0.032} />
      <PhotoFrame position={[ 6.0, -1.2,  -3.0]} rotation={[-0.06, -0.44,  0.02]} scale={0.74} drift={-0.028} />
      <PhotoFrame position={[-4.5,  1.5,  -4]} rotation={[ 0.05,  0.35,  0.02]} scale={0.82} drift={ 0.022} />
      <PhotoFrame position={[ 4.2, -0.6,  -6]} rotation={[-0.04, -0.30,  0.03]} scale={1.00} drift={-0.018} />
      <PhotoFrame position={[-1.5, -2.0,  -9]} rotation={[ 0.08,  0.12, -0.04]} scale={1.15} drift={ 0.014} />
      <PhotoFrame position={[ 5.5,  2.5,  -9]} rotation={[ 0.06, -0.42,  0.05]} scale={0.72} drift={ 0.028} />
      <PhotoFrame position={[-5.5, -1.2, -13]} rotation={[-0.05,  0.38, -0.03]} scale={1.08} drift={-0.016} />
      <PhotoFrame position={[ 1.0,  3.5, -13]} rotation={[ 0.03,  0.18,  0.01]} scale={0.88} drift={ 0.020} />
      <PhotoFrame position={[-2.5,  0.5, -18]} rotation={[-0.07, -0.25,  0.04]} scale={1.20} drift={-0.012} />
      <PhotoFrame position={[ 3.5, -2.5, -18]} rotation={[ 0.10,  0.30, -0.06]} scale={0.75} drift={ 0.025} />

      <Sparkles count={200} scale={[30, 20, 26]} position={[0, 0, -9]}  size={2.8} speed={0.15} color={GOLD}     opacity={0.65} />
      <Sparkles count={100} scale={[16, 12, 12]} position={[0, 1, -3]}  size={1.5} speed={0.10} color="#E5C185" opacity={0.45} />
      <Sparkles count={40}  scale={[8,  6,  6]}  position={[3, -1, -1]} size={1.0} speed={0.20} color="#FFFFFF" opacity={0.35} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG — Ornate corner flourish
// ─────────────────────────────────────────────────────────────────────────────

function CornerFlourish({
  className = '',
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 80 80"
      className={className}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Primary L-bracket */}
      <path d="M3 48 L3 3 L48 3"
            stroke={GOLD} strokeWidth="1.7" strokeLinecap="round" opacity="0.65" />
      {/* Secondary inner bracket */}
      <path d="M11 36 L11 11 L36 11"
            stroke={GOLD} strokeWidth="0.75" strokeLinecap="round" opacity="0.38" />
      {/* Tertiary micro bracket */}
      <path d="M18 28 L18 18 L28 18"
            stroke={GOLD} strokeWidth="0.4" strokeLinecap="round" opacity="0.22" />
      {/* Corner jewel */}
      <circle cx="3" cy="3" r="3.4" fill={GOLD} opacity="0.72" />
      <circle cx="3" cy="3" r="1.4" fill="none" stroke={LINEN} strokeWidth="0.7" opacity="0.45" />
      {/* End-of-arm dots */}
      <circle cx="3"  cy="48" r="1.6" fill={GOLD} opacity="0.38" />
      <circle cx="48" cy="3"  r="1.6" fill={GOLD} opacity="0.38" />
      {/* Tick marks — top edge */}
      <line x1="18" y1="3" x2="18" y2="7.5" stroke={GOLD} strokeWidth="0.85" opacity="0.42" />
      <line x1="28" y1="3" x2="28" y2="5.5" stroke={GOLD} strokeWidth="0.55" opacity="0.28" />
      <line x1="38" y1="3" x2="38" y2="7.5" stroke={GOLD} strokeWidth="0.85" opacity="0.42" />
      {/* Tick marks — left edge */}
      <line x1="3" y1="18" x2="7.5" y2="18" stroke={GOLD} strokeWidth="0.85" opacity="0.42" />
      <line x1="3" y1="28" x2="5.5" y2="28" stroke={GOLD} strokeWidth="0.55" opacity="0.28" />
      <line x1="3" y1="38" x2="7.5" y2="38" stroke={GOLD} strokeWidth="0.85" opacity="0.42" />
      {/* Calligraphic inward sweep */}
      <path d="M3 3 Q24 5 34 26 Q44 48 48 3"
            stroke={GOLD} strokeWidth="0.38" opacity="0.15" fill="none" />
      {/* Trailing dot chains */}
      <circle cx="3"  cy="56" r="1"   fill={GOLD} opacity="0.18" />
      <circle cx="3"  cy="64" r="0.7" fill={GOLD} opacity="0.12" />
      <circle cx="56" cy="3"  r="1"   fill={GOLD} opacity="0.18" />
      <circle cx="64" cy="3"  r="0.7" fill={GOLD} opacity="0.12" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG — Decorative gold divider with centre medallion
// ─────────────────────────────────────────────────────────────────────────────

function GoldDivider() {
  return (
    <div className="flex items-center gap-3 my-10">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[#B88F5B] opacity-35" />
      <svg viewBox="0 0 56 28" className="w-14 h-7 flex-shrink-0" fill="none">
        <circle cx="28" cy="14" r="6"   fill={GOLD} opacity="0.75" />
        <circle cx="28" cy="14" r="10"  stroke={GOLD} strokeWidth="0.65" opacity="0.38" fill="none" />
        <circle cx="28" cy="14" r="13"  stroke={GOLD} strokeWidth="0.35" opacity="0.20" fill="none" />
        <circle cx="4"  cy="14" r="2.4" fill={GOLD} opacity="0.38" />
        <circle cx="52" cy="14" r="2.4" fill={GOLD} opacity="0.38" />
        <line x1="7"  y1="14" x2="18" y2="14" stroke={GOLD} strokeWidth="0.9" opacity="0.48" />
        <line x1="38" y1="14" x2="49" y2="14" stroke={GOLD} strokeWidth="0.9" opacity="0.48" />
        <path d="M22 14 L24 12 L26 14 L24 16 Z" fill={GOLD} opacity="0.30" />
        <path d="M30 14 L32 12 L34 14 L32 16 Z" fill={GOLD} opacity="0.30" />
      </svg>
      <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[#B88F5B] opacity-35" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG — Museum wax-seal medallion (background decoration)
// ─────────────────────────────────────────────────────────────────────────────

function MuseumSeal({ size = 220 }: { size?: number }) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 220 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="opacity-[0.07]"
      aria-hidden
    >
      <circle cx="110" cy="110" r="106" stroke={GOLD} strokeWidth="1.4" />
      <circle cx="110" cy="110" r="98"  stroke={GOLD} strokeWidth="0.5" />
      <circle cx="110" cy="110" r="84"  stroke={GOLD} strokeWidth="2.0" />
      <circle cx="110" cy="110" r="76"  stroke={GOLD} strokeWidth="0.5" />
      {/* 20-spoke sunburst */}
      {Array.from({ length: 20 }, (_, i) => {
        const a = (i / 20) * Math.PI * 2;
        return (
          <line key={i}
            x1={110 + Math.cos(a) * 78}  y1={110 + Math.sin(a) * 78}
            x2={110 + Math.cos(a) * 90}  y2={110 + Math.sin(a) * 90}
            stroke={GOLD} strokeWidth="1.4"
          />
        );
      })}
      {/* Outer dot ring — 36 dots */}
      {Array.from({ length: 36 }, (_, i) => {
        const a = (i / 36) * Math.PI * 2;
        return (
          <circle key={i}
            cx={110 + Math.cos(a) * 101}
            cy={`${110 + Math.sin(a) * 101}`}
            r="2" fill={GOLD}
          />
        );
      })}
      {/* 8-point inner star */}
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <line key={i}
            x1={110 + Math.cos(a) * 32}  y1={110 + Math.sin(a) * 32}
            x2={110 + Math.cos(a) * 70}  y2={110 + Math.sin(a) * 70}
            stroke={GOLD} strokeWidth="0.8" opacity="0.55"
          />
        );
      })}
      <text x="110" y="120" textAnchor="middle" fontSize="32"
            fontFamily="Georgia, serif" fill={GOLD} letterSpacing="7">LK</text>
      <text x="110" y="142" textAnchor="middle" fontSize="8"
            fontFamily="sans-serif" fill={GOLD} letterSpacing="5">EST. 2025</text>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG — Neoclassical arch watermark (hero background layer)
// ─────────────────────────────────────────────────────────────────────────────

function HeroAmbientLayers() {
  const dust = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        left: `${(i * 13.7 + 4) % 96}%`,
        top: `${(i * 19.3 + 2) % 94}%`,
        size: 2 + (i % 4),
        dur: `${14 + (i % 10)}s`,
        delay: `${-(i * 1.3) % 16}s`,
        dx: `${-40 + (i % 9) * 12}px`,
        dy: `${-90 - (i % 7) * 18}px`,
      })),
    [],
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 2.2 }}
      className="absolute inset-0 pointer-events-none overflow-hidden"
      aria-hidden
    >
      {/* Pulsing gold ambience — left & right washes */}
      <motion.div
        className="hero-glow-orb absolute top-[28%] left-[8%] w-[min(52vw,420px)] h-[min(52vw,420px)] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(184,143,91,0.35) 0%, rgba(184,143,91,0.12) 42%, transparent 70%)',
          transform: 'translate(-50%, -50%)',
        }}
      />
      <motion.div
        className="hero-glow-orb hero-glow-orb--delayed absolute top-[62%] right-[6%] w-[min(44vw,360px)] h-[min(44vw,360px)] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(212,169,106,0.3) 0%, rgba(184,143,91,0.1) 45%, transparent 72%)',
          transform: 'translate(50%, -50%)',
        }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: 'min(90vw, 720px)',
          height: 'min(70vh, 520px)',
          background: 'radial-gradient(ellipse at center, rgba(184,143,91,0.15) 0%, transparent 68%)',
        }}
      />

      {/* Slow sweeping light beams */}
      <motion.div
        className="hero-light-beam absolute -left-[20%] top-[18%] w-[140%] h-[38%]"
        style={{
          background: 'linear-gradient(105deg, transparent 0%, rgba(212,169,106,0.14) 48%, transparent 100%)',
          transformOrigin: 'center center',
        }}
      />
      <motion.div
        className="hero-light-beam absolute -right-[15%] bottom-[12%] w-[120%] h-[28%]"
        style={{
          background: 'linear-gradient(75deg, transparent 0%, rgba(184,143,91,0.10) 52%, transparent 100%)',
          transformOrigin: 'center center',
          animationDelay: '-7s',
        }}
      />

      {/* Centre seal — slow rotation */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 120, repeat: Infinity, ease: 'linear' }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.055]"
      >
        <MuseumSeal size={560} />
      </motion.div>

      {/* Corner flourishes */}
      <CornerFlourish className="absolute top-0 left-0 w-20 h-20 opacity-22" />
      <CornerFlourish className="absolute top-0 right-0 w-20 h-20 opacity-22" style={{ transform: 'scaleX(-1)' }} />
      <CornerFlourish className="absolute bottom-0 left-0 w-20 h-20 opacity-18" style={{ transform: 'scaleY(-1)' }} />
      <CornerFlourish className="absolute bottom-0 right-0 w-20 h-20 opacity-18" style={{ transform: 'scale(-1,-1)' }} />

      {/* Rising gold dust */}
      {dust.map((p, i) => (
        <span
          key={i}
          className="hero-dust-particle"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            ['--hero-dur' as string]: p.dur,
            ['--hero-delay' as string]: p.delay,
            ['--hero-dx' as string]: p.dx,
            ['--hero-dy' as string]: p.dy,
          }}
        />
      ))}

      {/* Film grain */}
      <motion.div
        animate={{ opacity: [0.04, 0.07, 0.04] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute inset-0 mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")",
          backgroundSize: '180px 180px',
        }}
      />
    </motion.div>
  );
}

function ArchWatermark() {
  return (
    <svg
      className="hero-arch-watermark absolute right-0 top-0 h-full w-auto pointer-events-none select-none"
      style={{ maxWidth: '52%' }}
      viewBox="0 0 400 960"
      fill="none"
      preserveAspectRatio="xMaxYMid meet"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* Outer arch */}
      <path d="M44 960 L44 470 Q44 44 200 44 Q356 44 356 470 L356 960"
            stroke={GOLD} strokeWidth="2.5" />
      {/* Inner arch */}
      <path d="M78 960 L78 488 Q78 96 200 96 Q322 96 322 488 L322 960"
            stroke={GOLD} strokeWidth="1.1" />
      {/* Tertiary arch */}
      <path d="M108 960 L108 504 Q108 148 200 148 Q292 148 292 504 L292 960"
            stroke={GOLD} strokeWidth="0.5" opacity="0.6" />
      {/* Keystone block */}
      <rect x="170" y="34" width="60" height="44" fill={GOLD} />
      <rect x="180" y="41" width="40" height="32" fill={CHARCOAL} />
      <line x1="200" y1="41" x2="200" y2="73" stroke={GOLD} strokeWidth="0.6" opacity="0.5" />
      {/* Pillar fill */}
      <rect x="36"  y="460" width="20" height="500" fill={GOLD} opacity="0.10" />
      <rect x="344" y="460" width="20" height="500" fill={GOLD} opacity="0.10" />
      {/* Column fluting — left */}
      {[50, 58, 66, 74].map(x => (
        <line key={x} x1={x} y1="472" x2={x} y2="960" stroke={GOLD} strokeWidth="0.6" opacity="0.36" />
      ))}
      {/* Column fluting — right */}
      {[326, 334, 342, 350].map(x => (
        <line key={x} x1={x} y1="472" x2={x} y2="960" stroke={GOLD} strokeWidth="0.6" opacity="0.36" />
      ))}
      {/* Capital volutes */}
      <path d="M44 470 Q64 456 84 476"  stroke={GOLD} strokeWidth="1.8" fill="none" opacity="0.65" />
      <path d="M356 470 Q336 456 316 476" stroke={GOLD} strokeWidth="1.8" fill="none" opacity="0.65" />
      {/* Base moulding */}
      <rect x="28"  y="920" width="52" height="8"  stroke={GOLD} strokeWidth="1.5" fill="none" />
      <rect x="320" y="920" width="52" height="8"  stroke={GOLD} strokeWidth="1.5" fill="none" />
      <rect x="20"  y="928" width="68" height="14" stroke={GOLD} strokeWidth="1"   fill="none" />
      <rect x="312" y="928" width="68" height="14" stroke={GOLD} strokeWidth="1"   fill="none" />
      {/* Arch spandrel rosette dots */}
      {[120, 160, 240, 280].map((cx, i) => (
        <circle key={i} cx={cx} cy={`${200 + Math.abs(i - 1.5) * 42}`}
                r="4" fill={GOLD} opacity="0.32" />
      ))}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT — Ornate SVG-bordered panel wrapper
// ─────────────────────────────────────────────────────────────────────────────

function OrnatePanel({
  children,
  className = '',
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={`relative ${className}`} style={style}>
      {/* Corner flourishes, mirrored to each corner */}
      <CornerFlourish className="absolute top-0 left-0 w-16 h-16 pointer-events-none z-10" />
      <CornerFlourish
        className="absolute top-0 right-0 w-16 h-16 pointer-events-none z-10"
        style={{ transform: 'scaleX(-1)' }}
      />
      <CornerFlourish
        className="absolute bottom-0 left-0 w-16 h-16 pointer-events-none z-10"
        style={{ transform: 'scaleY(-1)' }}
      />
      <CornerFlourish
        className="absolute bottom-0 right-0 w-16 h-16 pointer-events-none z-10"
        style={{ transform: 'scale(-1,-1)' }}
      />

      {/* Border lines — fade in/out gracefully at corners */}
      <div className="absolute top-0    left-16 right-16 h-px  bg-gradient-to-r from-transparent via-[#B88F5B] to-transparent opacity-45 pointer-events-none z-10" />
      <div className="absolute bottom-0 left-16 right-16 h-px  bg-gradient-to-r from-transparent via-[#B88F5B] to-transparent opacity-45 pointer-events-none z-10" />
      <div className="absolute left-0   top-16 bottom-16 w-px  bg-gradient-to-b from-transparent via-[#B88F5B] to-transparent opacity-45 pointer-events-none z-10" />
      <div className="absolute right-0  top-16 bottom-16 w-px  bg-gradient-to-b from-transparent via-[#B88F5B] to-transparent opacity-45 pointer-events-none z-10" />

      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DATA — Feature exhibits
// ─────────────────────────────────────────────────────────────────────────────

interface FeatureItem {
  num  : string;
  Icon : any;
  title: string;
  sub  : string;
  desc : string;
  link : string;
}

const features: FeatureItem[] = [
  {
    num  : '01',
    Icon : MagicWand,
    title: 'AI RESTORATION',
    sub  : 'Revival of the Past',
    desc : 'Breathe new life into faded heirlooms. Denoise, sharpen, and colorize historical photographs — surfacing details that time tried to erase.',
    link : '/vault'
  },
  {
    num  : '02',
    Icon : TreeStructure,
    title: 'FEDERATED LINEAGE',
    sub  : 'Two Families, One Story',
    desc : "When families unite, so do their trees. Link your vault with your partner's lineage and watch two independent histories grow toward each other — seamlessly, securely.",
    link : '/tree'
  },
  {
    num  : '03',
    Icon : TextAa,
    title: 'GENERATIVE CHRONICLES',
    sub  : 'Stories Written From Memory',
    desc : 'A single button weaves tagged photos, EXIF locations, and dates into a beautifully narrated, multi-chapter biography no one had time to write before.',
    link : '/person/1'
  },
  {
    num  : '04',
    Icon : Image,
    title: 'FACIAL UNIVERSE',
    sub  : 'Name Once. Tagged Forever.',
    desc : 'Upload a shoebox of unsorted decades. AI clusters every face it finds. You name one person — and all 47 photos of Grandfather are tagged in a single keystroke.',
    link : '/search'
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT — Individual exhibit card
// ─────────────────────────────────────────────────────────────────────────────

function ExhibitCard({ num, Icon, title, sub, desc, link, index }: FeatureItem & { index: number }) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 56 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{
        duration: 0.95,
        delay   : index * 0.13,
        ease    : [0.16, 1, 0.3, 1],
      }}
      whileHover={{ y: -9, transition: { duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] } }}
      className="group cursor-pointer"
      onClick={() => navigate({ to: link })}
    >
      <OrnatePanel className="h-full bg-[#141211] overflow-hidden">
        <div className="relative p-10 flex flex-col h-full min-h-[440px]">

          {/* Huge watermark exhibit number */}
          <span
            aria-hidden
            className="absolute bottom-3 right-5 font-display font-extrabold leading-none text-[#B88F5B] select-none pointer-events-none"
            style={{ fontSize: 'clamp(5rem, 12vw, 9.5rem)', opacity: 0.058 }}
          >
            {num}
          </span>

          {/* Exhibit label */}
          <p className="font-ui text-[10px] tracking-[0.16em] uppercase text-[#B88F5B] mb-8">
            Exhibit {num}
          </p>

          {/* Icon — circular frame with hover glow */}
          <div
            className="
              relative w-[78px] h-[78px] rounded-full border border-[#B88F5B]
              bg-[rgba(184,143,91,0.06)] flex items-center justify-center
              text-[#B88F5B] mb-8 transition-all duration-500
              group-hover:bg-[rgba(184,143,91,0.15)]
              group-hover:shadow-[0_0_32px_rgba(184,143,91,0.25),inset_0_0_16px_rgba(184,143,91,0.08)]
            "
          >
            {/* Expanding pulse ring on hover */}
            <div
              className="
                absolute inset-[-8px] rounded-full border border-[#B88F5B]
                opacity-0 group-hover:opacity-28
                scale-90 group-hover:scale-100
                transition-all duration-700
              "
            />
            <Icon weight="thin" size={38} />
          </div>

          {/* Script subtitle */}
          <p
            className="font-script text-[#B88F5B] leading-none mb-2"
            style={{ fontSize: 'clamp(32px, 4vw, 40px)', opacity: 0.52 }}
          >
            {sub}
          </p>

          {/* Main title */}
          <h3
            className="font-display font-semibold text-[#F7F4EF] tracking-[0.04em] mb-4"
            style={{ fontSize: 'clamp(1.1rem, 2vw, 1.3rem)' }}
          >
            {title}
          </h3>

          {/* Gold rule */}
          <div className="w-10 h-px bg-[#B88F5B] opacity-32 mb-5" />

          {/* Description */}
          <p className="font-ui text-[13.5px] text-[#B0A898] leading-[1.82] mb-auto">
            {desc}
          </p>

          {/* Hover-reveal CTA */}
          <div
            className="
              mt-8 flex items-center gap-2.5 text-[#B88F5B]
              opacity-0 group-hover:opacity-100
              translate-y-3 group-hover:translate-y-0
              transition-all duration-300
            "
          >
            <span className="font-ui text-[10px] tracking-[0.14em] uppercase">
              Explore feature
            </span>
            <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
              <path d="M1 5h14M10 1l5 4-5 4" stroke={GOLD} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </OrnatePanel>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT — Stat pillar (hero social-proof row)
// ─────────────────────────────────────────────────────────────────────────────

function StatPillar({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 px-7 border-x border-[rgba(184,143,91,0.16)] first:border-l-0 last:border-r-0">
      <span className="font-display font-bold text-[1.5rem] text-[#F7F4EF] tracking-[0.03em]">
        {value}
      </span>
      <span className="font-ui text-[10px] text-[#B0A898] uppercase tracking-[0.12em]">
        {label}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE — Landing
// ─────────────────────────────────────────────────────────────────────────────

export default function Landing() {
  return (
    <>
      {/* ════════════════════════════════════════════════════════════════════
          HERO — full-viewport, Dark Zone, Three.js canvas background
      ════════════════════════════════════════════════════════════════════ */}
      <section
        className="relative flex items-center justify-center overflow-hidden bg-[#141211]"
        style={{ minHeight: '100svh' }}
      >
        {/* ── Three.js canvas ── */}
        <div className="absolute inset-0 z-0">
          <Canvas
            camera={{ position: [0, 0.5, 8], fov: 62, near: 0.1, far: 60 }}
            gl={{ antialias: true, alpha: false }}
            dpr={[1, 1.5]}
            style={{ background: CHARCOAL }}
          >
            <Suspense fallback={null}>
              <HeroScene />
            </Suspense>
          </Canvas>
        </div>

        {/* ── Ambient motion, glows, dust, seal (over 3D) ── */}
        <motion.div className="absolute inset-0 z-[1]">
          <HeroAmbientLayers />
        </motion.div>

        {/* ── Neoclassical arch watermarks — mirrored flanking columns ── */}
        <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden">
          <motion.div className="absolute left-0 top-0 h-full w-auto" style={{ transform: 'scaleX(-1)', maxWidth: '52%' }}>
            <ArchWatermark />
          </motion.div>
          <ArchWatermark />
        </div>

        {/* ── Layered vignette — readable centre, alive edges ── */}
        <motion.div
          className="absolute inset-0 z-[2] pointer-events-none"
          animate={{ opacity: [0.92, 1, 0.92] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            background: `
              radial-gradient(ellipse 42% 50% at 50% 48%, rgba(20,18,17,0.58) 0%, rgba(20,18,17,0) 72%),
              radial-gradient(ellipse 55% 45% at 14% 38%, rgba(184,143,91,0.09) 0%, transparent 55%),
              radial-gradient(ellipse 50% 50% at 86% 62%, rgba(212,169,106,0.07) 0%, transparent 50%),
              radial-gradient(ellipse 100% 100% at 50% 50%, transparent 35%, rgba(20,18,17,0.45) 100%)
            `,
          }}
        />

        {/* ── Bottom fade to charcoal (matches torn edge) ── */}
        <div
          className="absolute bottom-0 left-0 right-0 z-[2] pointer-events-none"
          style={{ height: '150px', background: `linear-gradient(to bottom, transparent, ${CHARCOAL})` }}
        />

        {/* ══ HERO CONTENT ══ */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 flex flex-col items-center text-center px-[clamp(24px,5vw,80px)] max-w-[920px] pb-20 pt-4"
        >
          {/* Top ornament — animated scale-in */}
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 1.1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-4 mb-10"
          >
            <div className="w-20 h-px bg-[#B88F5B] opacity-45" />
            <svg viewBox="0 0 24 12" className="w-6 h-3 flex-shrink-0" fill="none">
              <circle cx="12" cy="6" r="3"   fill={GOLD} opacity="0.78" />
              <circle cx="3"  cy="6" r="1.4" fill={GOLD} opacity="0.38" />
              <circle cx="21" cy="6" r="1.4" fill={GOLD} opacity="0.38" />
            </svg>
            <div className="w-20 h-px bg-[#B88F5B] opacity-45" />
          </motion.div>

          {/* Script headline */}
          <motion.p
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
            className="font-script text-[#B88F5B] leading-none mb-7"
            style={{ fontSize: 'clamp(42px, 7.5vw, 70px)' }}
          >
            "Where Families Live Forever"
          </motion.p>

          {/* H1 */}
          <motion.h1
            initial={{ opacity: 0, y: 34 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
            className="font-display font-extrabold text-[#F7F4EF] leading-[1.02] tracking-[0.022em] uppercase mb-9"
            style={{ fontSize: 'clamp(2.6rem, 7.5vw, 5.8rem)' }}
          >
            The Family<br />Memory Museum
          </motion.h1>

          {/* Body copy */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.95, duration: 1.0 }}
            className="font-ui text-[#F7F4EF] opacity-80 mb-12 max-w-[600px] leading-[1.75] font-light"
            style={{ fontSize: 'clamp(16px, 2.2vw, 19px)' }}
          >
            LegacyKeeper preserves your family's stories, faces, and memories —
            not as files on a hard drive, but as a living museum that grows with
            every generation.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.15, duration: 0.9 }}
            className="flex flex-wrap justify-center gap-5 mb-16"
          >
            <Link to="/auth">
              <Button
                variant="primary"
                className="text-[13px] px-11 py-[15px]"
                style={{ boxShadow: '0 6px 28px rgba(184,143,91,0.40), 0 2px 8px rgba(184,143,91,0.18)' }}
              >
                START YOUR VAULT
              </Button>
            </Link>
            <Link to="/museum">
              <Button
                variant="ghost"
                className="text-[13px] px-11 py-[15px]"
                style={{ backdropFilter: 'blur(12px)', background: 'rgba(184,143,91,0.07)' }}
              >
                ENTER MUSEUM →
              </Button>
            </Link>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.38, duration: 0.9 }}
            className="flex items-stretch gap-0 mb-10"
          >
            <StatPillar value="2,400+"  label="Family Vaults"  />
            <StatPillar value="340K+"   label="Memories Stored" />
            <StatPillar value="12 Gen." label="Deepest Lineage" />
          </motion.div>

          {/* Social proof avatars */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.58, duration: 0.8 }}
            className="flex items-center gap-4"
          >
            <div className="flex -space-x-3">
              {(
                [
                  ['A', '#7C5C3B'], ['F', '#4E6E52'],
                  ['Y', '#3A5570'], ['H', '#6E3A55'], ['M', '#5C4E3A'],
                ] as [string, string][]
              ).map(([initial, bg], i) => (
                <div
                  key={i}
                  className="w-9 h-9 rounded-full border-2 border-[#141211] flex items-center justify-center font-ui font-semibold text-[#F7F4EF] text-[11px]"
                  style={{ background: bg }}
                >
                  {initial}
                </div>
              ))}
            </div>
            <p className="font-ui text-[12px] text-[#B0A898]">
              Trusted by <span className="text-[#B88F5B] font-semibold">2,400+</span> families worldwide
            </p>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 opacity-36"
          aria-hidden
        >
          <svg width="22" height="36" viewBox="0 0 22 36" fill="none">
            <rect x="1.5" y="1.5" width="19" height="33" rx="9.5" stroke={GOLD} strokeWidth="1.2" />
            <motion.circle
              cx="11" r="3" fill={GOLD}
              initial={{ cy: 10 }}
              animate={{ cy: [10, 22, 10], opacity: [1, 0, 1] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
            />
          </svg>
        </motion.div>
      </section>

      {/* ─── ZONE TRANSITION ──────────────────────────────────────────────── */}
      <TornEdge direction="dark-to-light" />

      {/* ════════════════════════════════════════════════════════════════════
          FEATURES — Light Zone (parchment) with dark exhibit panels
      ════════════════════════════════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden py-[clamp(72px,10vw,128px)] px-[clamp(24px,5vw,80px)]"
        style={{ background: '#E8DFCB' }}
      >
        {/* Parchment noise texture */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            opacity: 0.55,
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.88' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.045'/%3E%3C/svg%3E\")",
          }}
        />

        {/* Low-opacity botanical branch watermark */}
        <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ opacity: 0.04 }}>
          <svg viewBox="0 0 800 600" className="w-full h-full" preserveAspectRatio="xMidYMid slice" fill="none">
            <path d="M400 600 Q400 400 378 300 Q356 200 318 150 Q280 100 198 82" stroke="#2A2522" strokeWidth="3.5" />
            <path d="M378 300 Q422 252 464 222 Q506 192 548 184" stroke="#2A2522" strokeWidth="2.5" />
            <path d="M356 200 Q398 168 432 140 Q466 112 488 90"  stroke="#2A2522" strokeWidth="1.8" />
            <path d="M398 352 Q454 320 496 300 Q538 280 578 272" stroke="#2A2522" strokeWidth="2.2" />
            <path d="M378 300 Q348 260 328 228 Q308 198 288 180" stroke="#2A2522" strokeWidth="1.8" />
            <path d="M318 150 Q292 128 268 118 Q244 108 220 112" stroke="#2A2522" strokeWidth="1.2" />
          </svg>
        </div>

        <div className="max-w-[1280px] mx-auto relative z-10">

          {/* Section heading */}
          <div className="text-center mb-16">
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="font-ui text-[10px] tracking-[0.20em] uppercase text-[#B88F5B] mb-5"
            >
              The Collection
            </motion.p>

            <motion.h2
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
              className="font-display font-bold text-[#2A2522] tracking-[0.04em] uppercase"
              style={{ fontSize: 'clamp(1.8rem, 4.5vw, 2.9rem)' }}
            >
              What Lives Inside
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.18 }}
              className="font-script text-[#7A6E62] leading-none mt-2"
              style={{ fontSize: 'clamp(40px, 6vw, 54px)' }}
            >
              "Your family's entire world"
            </motion.p>

            <GoldDivider />
          </div>

          {/* 2×2 Exhibit grid — 1px gold gap between cells */}
          <div
            className="grid md:grid-cols-2 gap-px"
            style={{ background: 'rgba(184,143,91,0.20)' }}
          >
            {features.map((f, i) => (
              <ExhibitCard key={f.num} {...f} index={i} />
            ))}
          </div>

          {/* Feature teaser strip */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="mt-14 relative overflow-hidden"
          >
            <OrnatePanel
              className="flex flex-col sm:flex-row items-center justify-between gap-6 px-8 py-6"
              style={{ background: 'rgba(20,18,17,0.05)' } as CSSProperties}
            >
              <div>
                <p className="font-ui text-[10px] uppercase tracking-[0.14em] text-[#B88F5B] mb-1">
                  And much more
                </p>
                <p className="font-display text-[1.05rem] text-[#2A2522] tracking-[0.015em]">
                  Smart Deduplication · Time Capsules · Vibe Search · Memory Atlas
                </p>
              </div>
              <Link to="/auth" className="flex-shrink-0">
                <Button variant="ghost" className="text-[11px] px-8 py-[11px]">
                  SEE ALL FEATURES
                </Button>
              </Link>
            </OrnatePanel>
          </motion.div>
        </div>
      </section>

      {/* ─── ZONE TRANSITION ──────────────────────────────────────────────── */}
      <TornEdge direction="light-to-dark" />

      {/* ════════════════════════════════════════════════════════════════════
          FINAL CTA — Dark Zone, ceremonial, centred
      ════════════════════════════════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden py-[clamp(80px,12vw,160px)] px-[clamp(24px,5vw,80px)] text-center"
        style={{ background: CHARCOAL }}
      >
        {/* Ambient radial glow */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 56% 66% at 50% 50%, rgba(184,143,91,0.058) 0%, transparent 72%)',
          }}
        />

        {/* Museum seal watermark */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none">
          <MuseumSeal size={480} />
        </div>

        {/* Section corner flourishes */}
        <CornerFlourish className="absolute top-0 left-0 w-20 h-20 opacity-28 pointer-events-none" />
        <CornerFlourish className="absolute top-0 right-0 w-20 h-20 opacity-28 pointer-events-none" style={{ transform: 'scaleX(-1)' }} />
        <CornerFlourish className="absolute bottom-0 left-0 w-20 h-20 opacity-28 pointer-events-none" style={{ transform: 'scaleY(-1)' }} />
        <CornerFlourish className="absolute bottom-0 right-0 w-20 h-20 opacity-28 pointer-events-none" style={{ transform: 'scale(-1,-1)' }} />

        {/* Ornate centred panel */}
        <div className="relative z-10 max-w-[720px] mx-auto">
          <OrnatePanel className="py-16 px-10 md:px-18">
            <motion.div
              initial={{ opacity: 0, y: 38 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center"
            >
              {/* Top ornament */}
              <div className="flex items-center gap-4 mb-10">
                <div className="w-14 h-px bg-[#B88F5B] opacity-40" />
                <svg viewBox="0 0 24 12" className="w-6 h-3" fill="none">
                  <circle cx="12" cy="6" r="3"   fill={GOLD} opacity="0.75" />
                  <circle cx="3"  cy="6" r="1.4" fill={GOLD} opacity="0.36" />
                  <circle cx="21" cy="6" r="1.4" fill={GOLD} opacity="0.36" />
                </svg>
                <div className="w-14 h-px bg-[#B88F5B] opacity-40" />
              </div>

              {/* Script */}
              <p
                className="font-script text-[#B88F5B] leading-none mb-7"
                style={{ fontSize: 'clamp(40px, 6vw, 64px)' }}
              >
                "Begin your legacy today"
              </p>

              {/* Heading */}
              <h2
                className="font-display font-bold text-[#F7F4EF] tracking-[0.04em] uppercase mb-6"
                style={{ fontSize: 'clamp(1.5rem, 4vw, 2.7rem)' }}
              >
                Preserve What<br />Matters Most
              </h2>

              {/* Body */}
              <p className="font-ui text-[15px] text-[#B0A898] mb-12 font-light max-w-[440px] leading-[1.8]">
                Free forever for your family. No subscriptions, no cloud lock-in.
                <br />Your memories, in a museum worthy of them.
              </p>

              {/* Primary CTA */}
              <Link to="/auth">
                <Button
                  variant="primary"
                  className="px-16 py-[16px] text-[13px]"
                  style={{ boxShadow: '0 8px 38px rgba(184,143,91,0.44), 0 2px 10px rgba(184,143,91,0.20)' }}
                >
                  CREATE YOUR VAULT FREE
                </Button>
              </Link>

              <div className="flex flex-wrap justify-center gap-3 mt-10">
                {['✦ Private Vaults', '✦ Family-First', '✦ Deep Heritage'].map(label => (
                  <span
                    key={label}
                    className="font-ui text-[10px] tracking-[0.1em] uppercase text-[#B88F5B] border border-[rgba(184,143,91,0.22)] rounded-full px-4 py-1.5"
                  >
                    {label}
                  </span>
                ))}
              </div>

              {/* Bottom ornament */}
              <div className="flex items-center gap-4 mt-12">
                <div className="w-14 h-px bg-[#B88F5B] opacity-40" />
                <svg viewBox="0 0 24 12" className="w-6 h-3" fill="none">
                  <circle cx="12" cy="6" r="3"   fill={GOLD} opacity="0.75" />
                  <circle cx="3"  cy="6" r="1.4" fill={GOLD} opacity="0.36" />
                  <circle cx="21" cy="6" r="1.4" fill={GOLD} opacity="0.36" />
                </svg>
                <div className="w-14 h-px bg-[#B88F5B] opacity-40" />
              </div>
            </motion.div>
          </OrnatePanel>
        </div>
      </section>
    </>
  );
}