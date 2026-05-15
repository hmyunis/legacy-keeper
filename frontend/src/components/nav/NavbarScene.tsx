import { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sparkles } from '@react-three/drei';
import * as THREE from 'three';

const GOLD = '#B88F5B';
const GOLD_LIGHT = '#D4A96A';

function MiniFrame() {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame((_, dt) => {
    groupRef.current.rotation.y += dt * 0.35;
    groupRef.current.rotation.x = Math.sin(performance.now() * 0.0004) * 0.08;
  });

  const W = 1.4;
  const H = 1.0;
  const D = 0.06;
  const B = 0.1;

  type Bar = [number, number, number, number, number, number];
  const bars: Bar[] = [
    [0, H / 2 - B / 2, 0, W, B, D],
    [0, -(H / 2 - B / 2), 0, W, B, D],
    [-(W / 2 - B / 2), 0, 0, B, H - B * 2, D],
    [W / 2 - B / 2, 0, 0, B, H - B * 2, D],
  ];

  return (
    <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.35}>
      <group ref={groupRef} position={[0, 0, 0]} scale={0.9}>
        {bars.map(([x, y, z, w, h, d], i) => (
          <mesh key={i} position={[x, y, z]}>
            <boxGeometry args={[w, h, d]} />
            <meshStandardMaterial color={GOLD} metalness={0.9} roughness={0.1} />
          </mesh>
        ))}
        <mesh position={[0, 0, -(D / 2) + 0.003]}>
          <planeGeometry args={[W - B * 2, H - B * 2]} />
          <meshStandardMaterial color="#0B0907" roughness={1} />
        </mesh>
      </group>
    </Float>
  );
}

function SealRing() {
  const ringRef = useRef<THREE.Mesh>(null!);

  useFrame((_, dt) => {
    ringRef.current.rotation.z += dt * 0.25;
  });

  return (
    <mesh ref={ringRef} position={[-2.2, 0, -1]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.55, 0.04, 24, 64]} />
      <meshStandardMaterial color={GOLD_LIGHT} metalness={0.95} roughness={0.08} emissive={GOLD} emissiveIntensity={0.15} />
    </mesh>
  );
}

function NavParticles() {
  return (
    <>
      <Sparkles count={48} scale={[8, 2.5, 4]} position={[0, 0, -2]} size={1.2} speed={0.12} color={GOLD} opacity={0.45} />
      <Sparkles count={24} scale={[4, 1.5, 2]} position={[2, 0.3, -1]} size={0.6} speed={0.08} color={GOLD_LIGHT} opacity={0.25} />
    </>
  );
}

function SceneContent() {
  return (
    <>
      <ambientLight intensity={0.12} color="#1A1004" />
      <pointLight position={[-2, 1, 2]} intensity={1.8} color={GOLD_LIGHT} distance={8} decay={2} />
      <pointLight position={[2, -0.5, 1]} intensity={1.2} color={GOLD} distance={6} decay={2} />
      <MiniFrame />
      <SealRing />
      <NavParticles />
    </>
  );
}

export function NavbarScene() {
  return (
    <div className="museum-nav-canvas pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <Canvas
        camera={{ position: [0, 0, 4.5], fov: 42 }}
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: true }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <SceneContent />
        </Suspense>
      </Canvas>
    </div>
  );
}

