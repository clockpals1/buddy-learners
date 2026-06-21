import { Canvas, useFrame } from "@react-three/fiber";
import { Float, OrbitControls, Sparkles, Sphere } from "@react-three/drei";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";

function PacketNetwork() {
  const group = useRef<THREE.Group>(null);
  const nodes = useMemo(() => {
    const pts: [number, number, number][] = [];
    const count = 18;
    for (let i = 0; i < count; i++) {
      const phi = Math.acos(-1 + (2 * i) / count);
      const theta = Math.sqrt(count * Math.PI) * phi;
      const r = 2.4;
      pts.push([
        r * Math.cos(theta) * Math.sin(phi),
        r * Math.sin(theta) * Math.sin(phi),
        r * Math.cos(phi),
      ]);
    }
    return pts;
  }, []);

  const edges = useMemo(() => {
    const pairs: [number, number][] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = new THREE.Vector3(...nodes[i]);
        const b = new THREE.Vector3(...nodes[j]);
        if (a.distanceTo(b) < 2.6) pairs.push([i, j]);
      }
    }
    return pairs;
  }, [nodes]);

  useFrame((_, dt) => {
    if (group.current) {
      group.current.rotation.y += dt * 0.12;
      group.current.rotation.x += dt * 0.04;
    }
  });

  return (
    <group ref={group}>
      <Sphere args={[1.6, 48, 48]}>
        <meshStandardMaterial
          color="#FBBF24"
          emissive="#FB7185"
          emissiveIntensity={0.35}
          roughness={0.35}
          metalness={0.1}
        />
      </Sphere>

      {nodes.map((p, i) => (
        <Float key={i} speed={1.4} rotationIntensity={0.4} floatIntensity={0.6}>
          <mesh position={p}>
            <sphereGeometry args={[0.09, 16, 16]} />
            <meshStandardMaterial
              color="#6366F1"
              emissive="#6366F1"
              emissiveIntensity={0.8}
            />
          </mesh>
        </Float>
      ))}

      {edges.map(([a, b], i) => {
        const start = new THREE.Vector3(...nodes[a]);
        const end = new THREE.Vector3(...nodes[b]);
        const mid = start.clone().lerp(end, 0.5);
        const dir = end.clone().sub(start);
        const len = dir.length();
        const quat = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          dir.clone().normalize(),
        );
        return (
          <mesh key={i} position={mid} quaternion={quat}>
            <cylinderGeometry args={[0.008, 0.008, len, 6]} />
            <meshBasicMaterial color="#FB7185" transparent opacity={0.35} />
          </mesh>
        );
      })}
    </group>
  );
}

export default function Hero3D() {
  return (
    <div className="absolute inset-0">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, 7], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.6} />
          <pointLight position={[6, 6, 6]} intensity={1.6} color="#FBBF24" />
          <pointLight position={[-6, -4, 3]} intensity={1.0} color="#FB7185" />
          <pointLight position={[0, -6, -4]} intensity={0.8} color="#6366F1" />
          <PacketNetwork />
          <Sparkles count={80} scale={9} size={2} speed={0.4} color="#6366F1" />
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate
            autoRotateSpeed={0.6}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
