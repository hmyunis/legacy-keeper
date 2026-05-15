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

export const EXHIBITS: ExhibitData[] = [
  { id: 1, url: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=1000', title: 'The Wedding', location: 'Addis Ababa', year: '1954', position: [-2.5, 0, 0], faces: [{ name: 'Abebe', avatar: 'https://ui-avatars.com/api/?name=Abebe&background=B88F5B&color=fff' }, { name: 'Fatima', avatar: 'https://ui-avatars.com/api/?name=Fatima&background=DBCFB5&color=2A2522' }] },
  { id: 2, url: 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?q=80&w=1000', title: 'Graduation Day', location: 'Harar', year: '1962', position: [2.5, 0, -4], faces: [{ name: 'Yohannes', avatar: 'https://ui-avatars.com/api/?name=Yohannes&background=3A5F7A&color=fff' }] },
  { id: 3, url: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?q=80&w=1000', title: 'Family Picnic', location: 'Entoto', year: '1975', position: [-2.5, 0, -8], faces: [{ name: 'Sara', avatar: 'https://ui-avatars.com/api/?name=Sara&background=4A7C59&color=fff' }] },
  { id: 4, url: 'https://images.unsplash.com/photo-1532274402911-5a369e4c4bb5?q=80&w=1000', title: 'Moving to the City', location: 'Dire Dawa', year: '1982', position: [2.5, 0, -12], faces: [{ name: 'Abebe', avatar: 'https://ui-avatars.com/api/?name=Abebe&background=B88F5B&color=fff' }] },
];

interface MuseumHallProps {
  onDecadeChange: (decade: string) => void;
  onSelectExhibit: (exhibit: ExhibitData) => void;
}

export default function MuseumHall({ onDecadeChange, onSelectExhibit }: MuseumHallProps) {
  const scroll = useScroll();
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current) return;

    const zOffset = scroll.offset * 14;
    groupRef.current.position.z = zOffset;

    if (zOffset < 2) onDecadeChange('1950s');
    else if (zOffset < 6) onDecadeChange('1960s');
    else if (zOffset < 10) onDecadeChange('1970s');
    else onDecadeChange('1980s');
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
        {EXHIBITS.map((exhibit) => (
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