import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, useTexture, SpotLight } from '@react-three/drei';
import * as THREE from 'three';

interface ExhibitProps {
  position: THREE.Vector3;
  title: string;
  location: string;
  year: string;
  url: string;
  onClick: () => void;
}

export default function ExhibitFrame({ position, title, location, year, url, onClick }: ExhibitProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = useTexture(url);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;

    const distance = state.camera.position.distanceTo(meshRef.current.position);
    meshRef.current.visible = distance < 25;

    if (meshRef.current.visible) {
      const targetScale = hovered ? 1.05 : 1;
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
      meshRef.current.position.y = position.y + Math.sin(state.clock.elapsedTime + position.x) * 0.05;
    }
  });

  const rotationY = position.x < 0 ? Math.PI / 12 : -Math.PI / 12;

  const handlePointerOver = (e: any) => {
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = (e: any) => {
    e.stopPropagation();
    setHovered(false);
    document.body.style.cursor = 'auto';
  };

  const handleClick = (e: any) => {
    e.stopPropagation();
    document.body.style.cursor = 'auto';
    setHovered(false);
    onClick();
  };

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {hovered && (
        <SpotLight
          position={[0, 3, 2]}
          angle={0.6}
          penumbra={0.5}
          intensity={2.5}
          color="#D4A96A"
          distance={12}
        />
      )}

      <mesh
        ref={meshRef}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
        castShadow
      >
        <boxGeometry args={[3.2, 4.2, 0.1]} />
        <meshStandardMaterial color={hovered ? "#D4A96A" : "#B88F5B"} metalness={0.8} roughness={0.2} />

        <mesh position={[0, 0, 0.06]}>
          <planeGeometry args={[2.9, 3.9]} />
          <meshStandardMaterial color="#F7F4EF" roughness={1} />
        </mesh>

        <mesh position={[0, 0, 0.07]}>
          <planeGeometry args={[2.5, 3.5]} />
          <meshBasicMaterial map={texture} toneMapped={false} />
        </mesh>
      </mesh>

      <Html
        position={[0, -2.3, 0.1]}
        center
        transform
        distanceFactor={6}
        occlude={[meshRef]}
      >
        <div
          className="bg-[rgba(20,18,17,0.95)] border-l-2 border-[var(--clr-gold)] px-4 py-2 pointer-events-none select-none w-[280px] shadow-2xl"
          style={{
            transform: 'rotateX(5deg)',
            backdropFilter: 'blur(8px)'
          }}
        >
          <h3 className={`font-display text-[16px] m-0 leading-tight transition-colors uppercase tracking-wider ${hovered ? 'text-[var(--clr-gold-light)]' : 'text-[var(--clr-linen)]'}`}>
            {title}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-4 h-[1px] bg-[var(--clr-gold)] opacity-50" />
            <p className="font-ui text-[10px] uppercase tracking-[0.2em] text-[var(--clr-gold)] m-0">
              {location} &middot; {year}
            </p>
          </div>
        </div>
      </Html>
    </group>
  );
}