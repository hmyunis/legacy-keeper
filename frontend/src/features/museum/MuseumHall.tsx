import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useScroll, Sparkles, Grid } from '@react-three/drei';
import * as THREE from 'three';
import ExhibitFrame from './ExhibitFrame';

export interface ExhibitData {
  id: number;
  url: string;
  title: string;
  location: string;
  year: string;
  position: [number, number, number];
  faces: { name: string; avatar: string }[];
}

interface MuseumHallProps {
  onDecadeChange: (decade: string) => void;
  onSelectExhibit: (exhibit: ExhibitData) => void;
  exhibits?: ExhibitData[];
}

export default function MuseumHall({ onDecadeChange, onSelectExhibit, exhibits = [] }: MuseumHallProps) {
  const scroll = useScroll();
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current) return;

    const zOffset = scroll.offset * (exhibits.length * 2);
    groupRef.current.position.z = zOffset;

    const activeExhibit = exhibits.find(ex => {
      const worldZ = ex.position[2] + zOffset;
      return worldZ > -2 && worldZ < 2;
    });

    if (activeExhibit && activeExhibit.year) {
      const decade = `${activeExhibit.year.substring(0, 3)}0s`;
      onDecadeChange(decade);
    }
  });

  return (
    <>
      <fog attach="fog" args={['#0E0C0B', 5, 15]} />

      <Sparkles count={200} scale={12} size={1} speed={0.4} opacity={0.15} color="#B88F5B" />

      <Grid
        position={[0, -2, 0]}
        args={[20, 20]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#B88F5B"
        sectionSize={4}
        sectionThickness={1}
        sectionColor="#B88F5B"
        fadeDistance={20}
        fadeStrength={1}
      />

      <group ref={groupRef}>
        {exhibits.map((exhibit) => (
          <ExhibitFrame
            key={exhibit.id}
            position={new THREE.Vector3(...exhibit.position)}
            title={exhibit.title}
            location={exhibit.location}
            year={exhibit.year}
            url={exhibit.url}
            onClick={() => onSelectExhibit(exhibit)}
          />
        ))}
      </group>
    </>
  );
}