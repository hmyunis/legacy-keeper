import { useMemo, useRef } from 'react';
import { Environment, Sparkles, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import ExhibitFrame from './ExhibitFrame';

export interface ExhibitData {
  id: string;
  url: string;
  title: string;
  location: string;
  year: string;
  position: [number, number, number];
  rotation: [number, number, number];
  faces: { name: string; avatar: string }[];
}

interface MuseumHallProps {
  onSelectExhibit: (exhibit: ExhibitData) => void;
  exhibits?: ExhibitData[];
}

function WallPanel({ position, rotation = [0, 0, 0], width = 9 }: { position: [number, number, number]; rotation?: [number, number, number]; width?: number }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh receiveShadow>
        <boxGeometry args={[width, 5.2, 0.24]} />
        <meshStandardMaterial color="#241D19" roughness={0.75} metalness={0.05} />
      </mesh>
      <mesh position={[0, 2.28, 0.13]}>
        <boxGeometry args={[width + 0.05, 0.12, 0.08]} />
        <meshStandardMaterial color="#8B6A3D" roughness={0.42} metalness={0.25} />
      </mesh>
      <mesh position={[0, -2.22, 0.13]}>
        <boxGeometry args={[width + 0.05, 0.16, 0.1]} />
        <meshStandardMaterial color="#8B6A3D" roughness={0.42} metalness={0.25} />
      </mesh>
    </group>
  );
}

function Sconce({ position, rotation = [0, 0, 0] }: { position: [number, number, number]; rotation?: [number, number, number] }) {
  return (
    <group position={position} rotation={rotation}>
      <pointLight position={[0, 0.15, 0.18]} intensity={0.38} distance={2.5} color="#F4D59B" />
      <mesh castShadow position={[0, 0, 0.08]}>
        <boxGeometry args={[0.15, 0.42, 0.1]} />
        <meshStandardMaterial color="#7A5B35" metalness={0.72} roughness={0.24} />
      </mesh>
      <mesh position={[0, 0.19, 0.16]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color="#F4D59B" emissive="#D4A96A" emissiveIntensity={1.1} roughness={0.32} />
      </mesh>
    </group>
  );
}

function Bench({ position, rotation = [0, 0, 0] }: { position: [number, number, number]; rotation?: [number, number, number] }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow receiveShadow position={[0, 0.05, 0]}>
        <boxGeometry args={[2.8, 0.22, 0.72]} />
        <meshStandardMaterial color="#5B3429" roughness={0.46} metalness={0.08} />
      </mesh>
      {[-1.08, 1.08].map((x) => (
        <mesh key={x} castShadow position={[x, -0.38, -0.2]}>
          <boxGeometry args={[0.14, 0.82, 0.18]} />
          <meshStandardMaterial color="#2B2320" roughness={0.5} metalness={0.28} />
        </mesh>
      ))}
      {[-1.08, 1.08].map((x) => (
        <mesh key={`front-${x}`} castShadow position={[x, -0.38, 0.2]}>
          <boxGeometry args={[0.14, 0.82, 0.18]} />
          <meshStandardMaterial color="#2B2320" roughness={0.5} metalness={0.28} />
        </mesh>
      ))}
    </group>
  );
}

function RopeBarrier({ position, rotation = [0, 0, 0] }: { position: [number, number, number]; rotation?: [number, number, number] }) {
  return (
    <group position={position} rotation={rotation}>
      {[-1.25, 1.25].map((x) => (
        <group key={x} position={[x, -0.25, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.055, 0.07, 1.05, 18]} />
            <meshStandardMaterial color="#1A1513" metalness={0.5} roughness={0.32} />
          </mesh>
          <mesh position={[0, 0.55, 0]}>
            <sphereGeometry args={[0.11, 16, 16]} />
            <meshStandardMaterial color="#B88F5B" metalness={0.72} roughness={0.22} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.16, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.035, 0.035, 2.48, 18]} />
        <meshStandardMaterial color="#7F1D1D" roughness={0.48} metalness={0.1} />
      </mesh>
    </group>
  );
}

function Pedestal({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow receiveShadow position={[0, -0.58, 0]}>
        <cylinderGeometry args={[0.48, 0.58, 0.92, 32]} />
        <meshStandardMaterial color="#D8C8A5" roughness={0.68} metalness={0.05} />
      </mesh>
      <mesh castShadow position={[0, 0.08, 0]}>
        <dodecahedronGeometry args={[0.34, 0]} />
        <meshStandardMaterial color="#9A7340" roughness={0.28} metalness={0.72} />
      </mesh>
    </group>
  );
}

function FloorInlays() {
  return (
    <group position={[0, -1.695, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.45, 3.54, 112]} />
        <meshStandardMaterial color="#8B6A3D" roughness={0.52} metalness={0.25} />
      </mesh>
      {Array.from({ length: 4 }).map((_, index) => (
        <mesh key={index} rotation={[-Math.PI / 2, 0, (index * Math.PI) / 4]}>
          <boxGeometry args={[0.035, 8.1, 0.018]} />
          <meshStandardMaterial color="#2F2723" roughness={0.72} />
        </mesh>
      ))}
    </group>
  );
}

function DisplayTable({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow receiveShadow position={[0, -0.25, 0]}>
        <boxGeometry args={[1.8, 0.18, 1.15]} />
        <meshStandardMaterial color="#3A2923" roughness={0.45} metalness={0.12} />
      </mesh>
      <mesh castShadow position={[0, 0.05, 0]}>
        <boxGeometry args={[1.55, 0.24, 0.9]} />
        <meshPhysicalMaterial color="#D4A96A" roughness={0.12} metalness={0.1} transmission={0.2} transparent opacity={0.42} />
      </mesh>
      {[-0.68, 0.68].flatMap((x) => [-0.4, 0.4].map((z) => (
        <mesh key={`${x}-${z}`} castShadow position={[x, -0.74, z]}>
          <boxGeometry args={[0.12, 0.85, 0.12]} />
          <meshStandardMaterial color="#171311" roughness={0.38} metalness={0.35} />
        </mesh>
      )))}
    </group>
  );
}

function Chandelier() {
  const ringRef = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (ringRef.current) ringRef.current.rotation.y += delta * 0.08;
  });

  return (
    <group position={[0, 3.2, 0]}>
      <pointLight intensity={1.55} distance={16} color="#F4D59B" />
      <group ref={ringRef}>
        <mesh>
          <torusGeometry args={[1.75, 0.028, 12, 96]} />
          <meshStandardMaterial color="#B88F5B" roughness={0.2} metalness={0.85} />
        </mesh>
        {Array.from({ length: 8 }).map((_, index) => {
          const angle = (index / 8) * Math.PI * 2;
          return (
            <mesh key={index} position={[Math.cos(angle) * 1.75, -0.18, Math.sin(angle) * 1.75]}>
              <sphereGeometry args={[0.07, 16, 16]} />
              <meshStandardMaterial color="#F4D59B" emissive="#D4A96A" emissiveIntensity={1.4} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

function RoomLabel() {
  return (
    <group position={[0, 2.26, -10.42]} rotation={[0, 0, 0]}>
      <Text fontSize={0.18} maxWidth={4.8} color="#D4A96A" anchorX="center" anchorY="middle">
        LEGACYKEEPER PRIVATE GALLERY
      </Text>
      <mesh position={[0, -0.22, 0]}>
        <boxGeometry args={[3.9, 0.025, 0.025]} />
        <meshStandardMaterial color="#B88F5B" emissive="#4E351C" emissiveIntensity={0.2} />
      </mesh>
    </group>
  );
}

export default function MuseumHall({ onSelectExhibit, exhibits = [] }: MuseumHallProps) {
  const placedExhibits = useMemo(() => exhibits.slice(0, 12), [exhibits]);

  return (
    <>
      <fog attach="fog" args={['#100D0C', 16, 34]} />
      <Environment preset="city" />
      <Sparkles count={72} scale={[17, 4.5, 17]} position={[0, 1, 0]} size={1.1} speed={0.18} opacity={0.14} color="#D4A96A" />

      <Chandelier />
      <RoomLabel />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.72, 0]} receiveShadow>
        <planeGeometry args={[22, 22]} />
        <meshStandardMaterial color="#15110F" roughness={0.78} metalness={0.04} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.705, 0]} receiveShadow>
        <planeGeometry args={[7.2, 9.4]} />
        <meshStandardMaterial color="#4A2D26" roughness={0.64} metalness={0.02} />
      </mesh>
      <FloorInlays />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 3.32, 0]}>
        <planeGeometry args={[22, 22]} />
        <meshStandardMaterial color="#1C1715" roughness={0.68} />
      </mesh>
      {[-7, 0, 7].map((x) => (
        <mesh key={x} position={[x, 3.2, 0]}>
          <boxGeometry args={[0.12, 0.2, 21.2]} />
          <meshStandardMaterial color="#6B4B2F" roughness={0.48} metalness={0.18} />
        </mesh>
      ))}

      <WallPanel position={[0, 0.56, -10.5]} width={21} />
      <WallPanel position={[0, 0.56, 10.5]} rotation={[0, Math.PI, 0]} width={21} />
      <WallPanel position={[-10.5, 0.56, 0]} rotation={[0, Math.PI / 2, 0]} width={21} />
      <WallPanel position={[10.5, 0.56, 0]} rotation={[0, -Math.PI / 2, 0]} width={21} />
      {[-8.6, -3.2, 3.2, 8.6].map((x) => (
        <Sconce key={`back-${x}`} position={[x, 1.58, -10.32]} />
      ))}
      {[-8.6, -3.2, 3.2, 8.6].map((x) => (
        <Sconce key={`front-${x}`} position={[-x, 1.58, 10.32]} rotation={[0, Math.PI, 0]} />
      ))}
      {[-8.6, -3.2, 3.2, 8.6].map((z) => (
        <Sconce key={`left-${z}`} position={[-10.32, 1.58, z]} rotation={[0, Math.PI / 2, 0]} />
      ))}
      {[-8.6, -3.2, 3.2, 8.6].map((z) => (
        <Sconce key={`right-${z}`} position={[10.32, 1.58, -z]} rotation={[0, -Math.PI / 2, 0]} />
      ))}

      <Bench position={[-3.1, -1.18, 2.65]} rotation={[0, Math.PI / 10, 0]} />
      <Bench position={[3.1, -1.18, -2.9]} rotation={[0, Math.PI * 0.92, 0]} />
      <DisplayTable position={[0, -0.85, 0]} />
      <Pedestal position={[-6.8, -0.72, 6.6]} />
      <Pedestal position={[6.8, -0.72, -6.6]} />
      <RopeBarrier position={[0, -0.98, -8.15]} />
      <RopeBarrier position={[8.15, -0.98, 0]} rotation={[0, Math.PI / 2, 0]} />

      {placedExhibits.map((exhibit) => (
        <ExhibitFrame
          key={exhibit.id}
          position={new THREE.Vector3(...exhibit.position)}
          rotation={exhibit.rotation}
          title={exhibit.title}
          location={exhibit.location}
          year={exhibit.year}
          url={exhibit.url}
          onClick={() => onSelectExhibit(exhibit)}
        />
      ))}
    </>
  );
}
