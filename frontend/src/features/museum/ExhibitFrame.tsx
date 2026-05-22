import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

interface ExhibitProps {
  position: THREE.Vector3;
  rotation?: [number, number, number];
  title: string;
  location: string;
  year: string;
  url: string;
  onClick: () => void;
}

function fitText(value: string, fallback: string, maxLength: number) {
  const text = (value || fallback).trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trim()}...` : text;
}

function createFallbackTexture(label: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 1200;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const gradient = ctx.createLinearGradient(0, 0, 900, 1200);
    gradient.addColorStop(0, '#d8c8a5');
    gradient.addColorStop(0.52, '#8b6a3d');
    gradient.addColorStop(1, '#171311');
    ctx.fillStyle = '#171311';
    ctx.fillRect(0, 0, 900, 1200);
    ctx.fillStyle = gradient;
    ctx.fillRect(72, 72, 756, 1056);
    ctx.fillStyle = 'rgba(23,19,17,0.68)';
    ctx.beginPath();
    ctx.moveTo(126, 900);
    ctx.bezierCurveTo(286, 720, 420, 760, 540, 626);
    ctx.bezierCurveTo(640, 516, 724, 468, 786, 536);
    ctx.lineTo(786, 1062);
    ctx.lineTo(126, 1062);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(244,213,155,0.38)';
    ctx.beginPath();
    ctx.arc(650, 290, 88, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(23,19,17,0.56)';
    ctx.fillRect(132, 140, 636, 10);
    ctx.fillRect(132, 190, 420, 10);
    ctx.font = '700 54px serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f4d59b';
    ctx.fillText((label || 'Memory').slice(0, 18).toUpperCase(), 450, 1000);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export default function ExhibitFrame({ position, rotation = [0, 0, 0], title, location, year, url, onClick }: ExhibitProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const fallbackTexture = useMemo(() => createFallbackTexture(title), [title]);
  const [texture, setTexture] = useState<THREE.Texture>(fallbackTexture);

  const plaqueTitle = useMemo(() => fitText(title, 'Untitled Exhibit', 34), [title]);
  const plaqueMeta = useMemo(() => {
    const parts = [location, year].filter(Boolean);
    return fitText(parts.join(' - '), 'Undated', 42);
  }, [location, year]);

  useEffect(() => {
    let isActive = true;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    setTexture(fallbackTexture);

    if (url) {
      loader.load(
        url,
        (loadedTexture) => {
          if (!isActive) {
            loadedTexture.dispose();
            return;
          }
          loadedTexture.colorSpace = THREE.SRGBColorSpace;
          loadedTexture.anisotropy = 8;
          loadedTexture.needsUpdate = true;
          setTexture(loadedTexture);
        },
        undefined,
        () => {
          if (isActive) setTexture(fallbackTexture);
        },
      );
    }

    return () => {
      isActive = false;
      document.body.style.cursor = 'auto';
    };
  }, [fallbackTexture, url]);

  useFrame((state) => {
    if (!groupRef.current) return;

    const targetScale = hovered ? 1.035 : 1;
    groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.12);
    groupRef.current.position.y = position.y + Math.sin(state.clock.elapsedTime * 0.9 + position.x) * 0.012;
  });

  const handlePointerOver = (event: any) => {
    event.stopPropagation();
    setHovered(true);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = (event: any) => {
    event.stopPropagation();
    setHovered(false);
    document.body.style.cursor = 'auto';
  };

  const handleClick = (event: any) => {
    event.stopPropagation();
    document.body.style.cursor = 'auto';
    setHovered(false);
    onClick();
  };

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      <pointLight position={[0, 1.25, 0.45]} intensity={hovered ? 0.72 : 0.32} distance={3.2} color="#D4A96A" />

      <mesh
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[1.58, 2.08, 0.12]} />
        <meshStandardMaterial color={hovered ? '#D4A96A' : '#9A7340'} metalness={0.72} roughness={0.22} />
      </mesh>

      <mesh position={[0, 0, 0.074]} castShadow>
        <boxGeometry args={[1.42, 1.9, 0.045]} />
        <meshStandardMaterial color="#E8DFCB" roughness={0.85} />
      </mesh>

      <mesh position={[0, 0, 0.104]}>
        <planeGeometry args={[1.18, 1.62]} />
        <meshStandardMaterial map={texture} toneMapped={false} roughness={0.95} />
      </mesh>

      <mesh position={[0, -1.33, 0.104]} castShadow>
        <boxGeometry args={[1.42, 0.38, 0.06]} />
        <meshStandardMaterial color={hovered ? '#201916' : '#141211'} metalness={0.25} roughness={0.55} />
      </mesh>
      <mesh position={[-0.68, -1.33, 0.142]}>
        <boxGeometry args={[0.028, 0.34, 0.026]} />
        <meshStandardMaterial color="#D4A96A" emissive="#6E4F27" emissiveIntensity={0.16} />
      </mesh>

      <Text
        position={[0.03, -1.25, 0.15]}
        maxWidth={1.2}
        fontSize={0.066}
        lineHeight={1}
        anchorX="center"
        anchorY="middle"
        color={hovered ? '#F4D59B' : '#F7F4EF'}
        textAlign="center"
      >
        {plaqueTitle.toUpperCase()}
      </Text>

      <Text
        position={[0.03, -1.42, 0.15]}
        maxWidth={1.14}
        fontSize={0.043}
        letterSpacing={0}
        anchorX="center"
        anchorY="middle"
        color="#D4A96A"
        textAlign="center"
      >
        {plaqueMeta.toUpperCase()}
      </Text>
    </group>
  );
}
