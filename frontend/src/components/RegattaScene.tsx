import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

// Helper to create a canvas texture for text labels (avoids three.js Text component issues)
function createTextTexture(
  text: string,
  options?: { fontSize?: number; color?: string; bgColor?: string }
): THREE.CanvasTexture {
  const { fontSize = 128, color = '#94a3b8', bgColor = 'transparent' } = options || {};
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  ctx.font = `bold ${fontSize}px Arial`;
  const metrics = ctx.measureText(text);
  const textWidth = metrics.width;
  const height = fontSize * 1.5;
  canvas.width = Math.ceil(textWidth + 40);
  canvas.height = Math.ceil(height);

  // Redraw with correct dimensions
  ctx.font = `bold ${fontSize}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (bgColor !== 'transparent') {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.fillStyle = color;
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// Keyboard camera control hook - uses scene-relative units
function useKeyboardCameraControl(camera: THREE.PerspectiveCamera | null, enabled: boolean) {
  const speed = 15; // meters per frame for smooth movement
  
  useEffect(() => {
    if (!enabled || !camera) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      let moved = false;
      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      
      const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
      
      switch (e.key) {
        case 'ArrowLeft':
          camera.position.addScaledVector(right, -speed);
          moved = true;
          break;
        case 'ArrowRight':
          camera.position.addScaledVector(right, speed);
          moved = true;
          break;
        case 'ArrowUp':
          camera.position.addScaledVector(forward, speed);
          moved = true;
          break;
        case 'ArrowDown':
          camera.position.addScaledVector(forward, -speed);
          moved = true;
          break;
      }
      
      if (moved) {
        e.preventDefault();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [camera, enabled]);
}

// Types matching RegattaMapPage
interface BoatPosition {
  id: string;
  boatName: string;
  sailNumber: string;
  latitude: number;
  longitude: number;
  heading: number;
  sog: number;
}

interface CourseMark {
  id: string;
  letter: string;
  type: 'windward' | 'leeward' | 'gate_left' | 'gate_right' | 'finish';
  latitude: number;
  longitude: number;
}

// Convert lat/lon to local x/z coordinates (centered on the regatta area)
function geoToLocal(lat: number, lon: number): [number, number] {
  const centerLat = 41.1350;
  const centerLon = 9.5680;
  // Rough conversion: 1 degree ≈ 111km for latitude, adjusted by cos(latitude) for longitude
  return [
    (lon - centerLon) * 111000 * Math.cos((centerLat * Math.PI) / 180),
    (lat - centerLat) * 111000,
  ];
}

// Boat model component - scaled for visibility in the scene
function BoatModel({
  position,
  heading,
  color,
  scale = 1,
}: {
  position: [number, number];
  heading: number;
  color: string;
  scale?: number;
}) {
  const meshRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (meshRef.current) {
      // Rotate boat to face its heading (Three.js uses Y-up, so we rotate around Y axis)
      meshRef.current.rotation.y = THREE.MathUtils.degToRad(heading - 90);
      // Bob up and down slightly on the water surface
      meshRef.current.position.y = Math.sin(Date.now() * 0.002 + position[1] * 0.01) * 0.3;
    }
  });

  return (
    <group ref={meshRef} position={[position[0], 0, position[1]]} scale={scale}>
      {/* Hull - main body of the boat */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.8, 0.5, 2.4]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.1} />
      </mesh>
      {/* Deck stripe */}
      <mesh position={[0, 0.26, 0]}>
        <boxGeometry args={[0.85, 0.02, 2.5]} />
        <meshStandardMaterial color="#ffffff" roughness={0.8} />
      </mesh>
      {/* Mast - tall pole in the center */}
      <mesh position={[0, 1.6, -0.3]}>
        <cylinderGeometry args={[0.04, 0.05, 3]} />
        <meshStandardMaterial color="#cccccc" roughness={0.2} metalness={0.8} />
      </mesh>
      {/* Main sail - behind the mast */}
      <mesh position={[0.18, 1.6, -0.3]}>
        <boxGeometry args={[0.025, 2, 1.2]} />
        <meshStandardMaterial color="#ffffff" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      {/* Jib - front sail */}
      <mesh position={[0.18, 1.6, 0.3]}>
        <boxGeometry args={[0.025, 2, 1.2]} />
        <meshStandardMaterial color="#f0f0f0" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      {/* Bow sprit - pole extending from the bow */}
      <mesh position={[0, 0.8, 1.2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.025, 0.03, 0.7]} />
        <meshStandardMaterial color="#cccccc" roughness={0.2} metalness={0.8} />
      </mesh>
      {/* Keel - bottom fin for stability */}
      <mesh position={[0, -0.65, 0]}>
        <boxGeometry args={[0.18, 0.7, 0.45]} />
        <meshStandardMaterial color="#333333" roughness={0.5} metalness={0.3} />
      </mesh>
    </group>
  );
}

// Course mark buoy component - larger and more visible
function BuoyModel({
  position,
  type,
  scale = 1,
}: {
  position: [number, number];
  type: string;
  scale?: number;
}) {
  const colors: Record<string, string> = {
    windward: '#ef4444',
    leeward: '#3b82f6',
    gate_left: '#10b981',
    gate_right: '#f59e0b',
    finish: '#8b5cf6',
  };

  const color = colors[type] || '#6b7280';

  return (
    <group position={[position[0], 0, position[1]]} scale={scale}>
      {/* Buoy body - main sphere */}
      <mesh castShadow>
        <sphereGeometry args={[0.55, 20, 20]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.2} emissive={color} emissiveIntensity={0.15} />
      </mesh>
      {/* Buoy top - white cap */}
      <mesh position={[0, 0.65, 0]}>
        <sphereGeometry args={[0.35, 20, 20]} />
        <meshStandardMaterial color="#ffffff" roughness={0.2} metalness={0.1} emissive="#ffffff" emissiveIntensity={0.1} />
      </mesh>
      {/* Light on top - bright beacon */}
      <pointLight position={[0, 1.8, 0]} color={color} intensity={1.5} distance={12} decay={2} />
    </group>
  );
}

// Race course line between marks - visible as a white tube on the water surface
function CourseLine({ points }: { points: [number, number][] }) {
  const path = useMemo(() => new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, 0.15, z))), [points]);

  return (
    <mesh>
      <tubeGeometry args={[path, 64, 0.12, 8, false]} />
      <meshStandardMaterial color="#ffffff" transparent opacity={0.3} emissive="#ffffff" emissiveIntensity={0.15} />
    </mesh>
  );
}

// Water surface with subtle waves - covers the entire visible scene area
function WaterSurface({ size }: { size: number }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      const positions = meshRef.current.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const z = positions.getZ(i);
        // Subtle wave animation - gentle rolling water surface
        const waveHeight = Math.sin(x * 0.05 + Date.now() * 0.0003) * 0.2 + Math.cos(z * 0.04 + Date.now() * 0.0004) * 0.18;
        positions.setY(i, waveHeight);
      }
      positions.needsUpdate = true;
    }
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.15, 0]}>
      {/* Water plane covering the entire scene area */}
      <planeGeometry args={[size * 6, size * 6, 128, 128]} />
      <meshStandardMaterial color="#0c4a6e" roughness={0.1} metalness={0.3} transparent opacity={0.9} side={THREE.DoubleSide} />
    </mesh>
  );
}

// Compass rose on the water surface - visible from above
function CompassRose() {
  const size = 2;
  return (
    <group position={[0, 1.5, 0]}>
      {/* Outer ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <ringGeometry args={[size * 1.8, size * 2, 64]} />
        <meshStandardMaterial color="#334155" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
      {/* N */}
      <SpriteText position={[0, 0.1, size * 2.1]} text="N" scale={size * 0.6} color="#94a3b8" />
      {/* S */}
      <SpriteText position={[0, 0.1, -size * 2.1]} text="S" scale={size * 0.6} color="#94a3b8" />
      {/* E */}
      <SpriteText position={[size * 2.1, 0.1, 0]} text="E" scale={size * 0.6} color="#94a3b8" />
      {/* W */}
      <SpriteText position={[-size * 2.1, 0.1, 0]} text="W" scale={size * 0.6} color="#94a3b8" />
    </group>
  );
}

// Sprite text component using canvas textures (compatible with all three.js versions)
function SpriteText({ position, text, scale, color }: {
  position: [number, number, number];
  text: string;
  scale: number;
  color: string;
}) {
  const texture = useMemo(() => createTextTexture(text, { fontSize: 128, color }), [text, color]);

  return (
    <mesh position={position}>
      <planeGeometry args={[scale * 3, scale]} />
      <meshBasicMaterial map={texture} transparent side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

// Wind indicator (arrow showing wind direction) - visible from above the scene
function WindIndicator({ direction }: { direction: number }) {
  const arrowRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (arrowRef.current) {
      arrowRef.current.rotation.y = THREE.MathUtils.degToRad(direction - 90);
    }
  });

  return (
    <group ref={arrowRef} position={[0, 1.5, 0]}>
      {/* Arrow shaft */}
      <mesh>
        <boxGeometry args={[0.12, 0.12, 6]} />
        <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.4} transparent opacity={0.7} />
      </mesh>
      {/* Arrow head */}
      <mesh position={[0, 0, 3.5]}>
        <coneGeometry args={[0.6, 1.2, 8]} />
        <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.4} transparent opacity={0.7} />
      </mesh>
    </group>
  );
}

// Regatta scene component with keyboard camera control - properly scaled for visibility
function RegattaScene({
  boats,
  courseMarks,
}: {
  boats: BoatPosition[];
  courseMarks: CourseMark[];
}) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  
  // Scene size in meters - the visible area is roughly +/- this many meters from center
  const sceneSize = 50;

  // Center the scene on the regatta area and scale all points to fit within the scene.
  const toScene = useMemo(() => {
    const allPoints = [
      ...boats.map((b) => geoToLocal(b.latitude, b.longitude)),
      ...courseMarks.map((m) => geoToLocal(m.latitude, m.longitude)),
    ];
    if (allPoints.length === 0) {
      return (lat: number, lon: number): [number, number] => geoToLocal(lat, lon);
    }
    const xs = allPoints.map((p) => p[0]);
    const zs = allPoints.map((p) => p[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minZ = Math.min(...zs);
    const maxZ = Math.max(...zs);
    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;
    // Use more of the scene for the data (90% instead of 80%)
    const extent = Math.max(maxX - minX, maxZ - minZ, 1);
    const s = (sceneSize * 0.9) / extent;
    return (lat: number, lon: number): [number, number] => {
      const [x, z] = geoToLocal(lat, lon);
      return [(x - centerX) * s, (z - centerZ) * s];
    };
  }, [boats, courseMarks]);

  // Keyboard camera control
  useKeyboardCameraControl(cameraRef.current, true);

  return (
    <>
      {/* Background color for the canvas */}
      <color attach="background" args={['#0f172a']} />
      
      {/* Camera positioned closer to the scene for better visibility */}
      <PerspectiveCamera
        ref={cameraRef as any}
        makeDefault
        position={[0, 40, 30]}
        fov={75}
      />
      
      {/* OrbitControls with adjusted range for the scene */}
      <OrbitControls
        minDistance={15}
        maxDistance={80}
        target={[0, 0, 0]}
        enableDamping
        dampingFactor={0.1}
      />

      {/* Lighting - ambient provides base illumination */}
      <ambientLight intensity={0.6} color="#a0b4c8" />
      
      {/* Directional sunlight with shadows */}
      <directionalLight
        position={[50, 100, 30]}
        intensity={1.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
      />
      
      {/* Hemisphere sky/ground fill light */}
      <hemisphereLight intensity={0.7} color="#87ceeb" groundColor="#1a2e3d" position={[0, 100, 0]} />

      {/* Water surface - fills the entire scene area */}
      <WaterSurface size={sceneSize} />

      {/* Compass rose on the water */}
      <CompassRose />

      {/* Course marks (buoys) at their scaled positions */}
      {courseMarks.map((mark) => {
        const [x, z] = toScene(mark.latitude, mark.longitude);
        return (
          <React.Fragment key={mark.id}>
            <BuoyModel position={[x, z]} type={mark.type} scale={2} />
          </React.Fragment>
        );
      })}

      {/* Course lines between consecutive marks */}
      {courseMarks.length > 1 && (
        <CourseLine points={courseMarks.map((m) => toScene(m.latitude, m.longitude))} />
      )}

      {/* Boats at their scaled positions with visible colors */}
      {boats.map((boat, index) => {
        const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
        const color = colors[index % colors.length];
        const [x, z] = toScene(boat.latitude, boat.longitude);

        return (
          <BoatModel
            key={boat.id}
            position={[x, z]}
            heading={boat.heading}
            color={color}
            scale={2}
          />
        );
      })}

      {/* Wind indicator showing wind direction */}
      <WindIndicator direction={180} />

      {/* Fog for depth - reduced to avoid obscuring the scene */}
      <fog attach="fog" args={['#0f172a', 30, 100]} />
    </>
  );
}

// Main RegattaScene component with canvas
export function RegattaScene3D({
  boats,
  courseMarks,
}: {
  boats: BoatPosition[];
  courseMarks: CourseMark[];
}) {
  return (
    <div className="w-full h-full" style={{ overflow: 'hidden' }}>
      <Canvas
        dpr={[1, 2]}
        gl={{ preserveDrawingBuffer: true }}
        style={{ width: '100%', height: '100%' }}
        onCreated={(state) => {
          state.gl.domElement.style.position = 'absolute';
          state.gl.domElement.style.inset = '0';
          state.gl.domElement.style.zIndex = '-1';
          state.gl.domElement.style.pointerEvents = 'auto';
        }}
      >
        <RegattaScene
          boats={boats}
          courseMarks={courseMarks}
        />
      </Canvas>
    </div>
  );
}

export default RegattaScene3D;