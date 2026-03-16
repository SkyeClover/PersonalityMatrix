import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import { scoreColor } from './OuraSummaryCard';

/**
 * Colors for each feeling (emotion-color psychology):
 * Energy=orange, Mood=pink, Focus=blue, Calm=teal, Motivation=coral,
 * Gratitude=gold, Connection=purple, Balance=green
 */
export const FEELING_COLORS = {
  energy: '#e89b4a',
  mood: '#e87a9e',
  focus: '#5b9dd6',
  calm: '#4ab5a8',
  motivation: '#c95a5a',
  gratitude: '#c9a227',
  connection: '#9b6bb8',
  balance: '#5b9e6e',
};

function dimColor(hex, factor) {
  const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return hex;
  const r = Math.min(255, Math.round(parseInt(m[1], 16) * factor));
  const g = Math.min(255, Math.round(parseInt(m[2], 16) * factor));
  const b = Math.min(255, Math.round(parseInt(m[3], 16) * factor));
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}

function blendHexColors(hexList) {
  if (!hexList.length) return '#7a8a7a';
  let r = 0, g = 0, b = 0;
  for (const hex of hexList) {
    const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    if (!m) continue;
    r += parseInt(m[1], 16);
    g += parseInt(m[2], 16);
    b += parseInt(m[3], 16);
  }
  const n = hexList.length;
  r = Math.round(r / n);
  g = Math.round(g / n);
  b = Math.round(b / n);
  return `#${[r, g, b].map((x) => Math.min(255, x).toString(16).padStart(2, '0')).join('')}`;
}

function getNodeColor(node) {
  const base = FEELING_COLORS[node.id] || '#7a8a8a';
  const state = node.state || 'unset';
  if (state === 'high') return base;
  if (state === 'balanced') return dimColor(base, 0.88);
  if (state === 'low') return dimColor(base, 0.65);
  return dimColor(base, 0.45);
}

const ORBITAL_RADIUS = 1.8;
const CORE_RADIUS = 0.35;
const NODE_RADIUS = 0.12;

/** Positions for 4 nodes on one ring in the XY plane (z=0), evenly spaced */
function getRingPositions(count) {
  const positions = [];
  for (let i = 0; i < count; i++) {
    const theta = (i / count) * Math.PI * 2;
    positions.push([ORBITAL_RADIUS * Math.cos(theta), ORBITAL_RADIUS * Math.sin(theta), 0]);
  }
  return positions;
}

function Core({ core, blendedColor, blendedEmissive, ouraStats }) {
  const meshRef = useRef();
  const glowRef = useRef();
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const pulse = 1 + 0.06 * Math.sin(t * 1.2);
    if (meshRef.current) meshRef.current.scale.setScalar(pulse);
    if (glowRef.current) {
      const glow = 0.4 + 0.15 * Math.sin(t * 0.8);
      glowRef.current.material.opacity = glow;
    }
  });
  const hasOura = ouraStats && (ouraStats.sleepScore != null || ouraStats.readinessScore != null || ouraStats.steps != null);
  return (
    <group>
      <mesh ref={glowRef}>
        <sphereGeometry args={[CORE_RADIUS * 1.8, 32, 32]} />
        <meshBasicMaterial color={blendedColor} transparent opacity={0.35} depthWrite={false} />
      </mesh>
      <mesh ref={meshRef}>
        <sphereGeometry args={[CORE_RADIUS, 32, 32]} />
        <meshStandardMaterial
          color={blendedColor}
          emissive={blendedEmissive}
          emissiveIntensity={0.35}
          metalness={0.15}
          roughness={0.5}
        />
      </mesh>
      <Html center position={[0, CORE_RADIUS + 0.15, 0]} distanceFactor={8}>
        <div className="core-label-3d">
          <span className="core-label-title">{core.label}</span>
          <span className="core-label-value">{core.value}</span>
          {hasOura && (
            <div className="core-oura-3d">
              {ouraStats.sleepScore != null && (
                <span style={{ color: scoreColor(ouraStats.sleepScore) }}>Sleep {ouraStats.sleepScore}</span>
              )}
              {ouraStats.readinessScore != null && (
                <span style={{ color: scoreColor(ouraStats.readinessScore) }}>Readiness {ouraStats.readinessScore}</span>
              )}
              {ouraStats.steps != null && (
                <span>Steps {ouraStats.steps.toLocaleString()}</span>
              )}
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}

function NodeSphere({ node, position }) {
  const state = node.state || 'unset';
  const color = getNodeColor(node);
  const emissive = dimColor(color, 0.5);
  const size = state === 'high' ? NODE_RADIUS * 1.35 : NODE_RADIUS;
  const dimmed = state === 'unset';
  const emissiveIntensity = dimmed ? 0 : (state === 'high' ? 0.22 : 0.1);

  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[size, 24, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
          metalness={0.35}
          roughness={0.45}
          transparent={dimmed}
          opacity={dimmed ? 0.65 : 1}
        />
      </mesh>
      <Html center distanceFactor={6} style={{ pointerEvents: 'none' }}>
        <div className="node-label-3d">
          {node.label}
          {node.rating != null && <span className="node-rating-badge">{node.rating}</span>}
        </div>
      </Html>
    </group>
  );
}

/**
 * One orbital ring with its nodes as children. The whole group rotates (and tumbles) so nodes stay on the ring.
 * Ring lies in XY plane by default; use initialRotation to put it in XZ (e.g. [Math.PI/2,0,0]).
 */
function OrbitalWithNodes({ nodes, initialRotation, speed, speedX = 0, speedZ = 0 }) {
  const groupRef = useRef();
  const positions = useMemo(() => getRingPositions(nodes.length), [nodes.length]);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.x += delta * speedX;
      groupRef.current.rotation.y += delta * speed;
      groupRef.current.rotation.z += delta * speedZ;
    }
  });

  return (
    <group ref={groupRef} rotation={initialRotation}>
      <mesh>
        <torusGeometry args={[ORBITAL_RADIUS, 0.012, 8, 80]} />
        <meshBasicMaterial color="#5a6a7e" transparent opacity={0.92} />
      </mesh>
      {nodes.map((node, i) => (
        <NodeSphere key={node.id} node={node} position={positions[i]} />
      ))}
    </group>
  );
}

function Scene({ matrix, ouraStats }) {
  const { core, nodes } = matrix;
  const half = Math.floor(nodes.length / 2);
  const ring1Nodes = useMemo(() => nodes.slice(0, half), [nodes, half]);
  const ring2Nodes = useMemo(() => nodes.slice(half), [nodes, half]);

  const { blendedColor, blendedEmissive } = useMemo(() => {
    const colors = nodes.map((n) => getNodeColor(n));
    const blended = blendHexColors(colors);
    return { blendedColor: blended, blendedEmissive: dimColor(blended, 0.55) };
  }, [nodes]);

  return (
    <>
      <color attach="background" args={['#0a0b0f']} />
      <fog attach="fog" args={['#0d0e12', 8, 22]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[6, 6, 5]} intensity={1.1} color="#fff4e6" />
      <directionalLight position={[-4, -3, 3]} intensity={0.35} color="#a8c8e8" />
      <pointLight position={[0, 0, 0]} intensity={0.5} distance={10} color={blendedColor} />
      <pointLight position={[2, 1, 2]} intensity={0.2} distance={12} color="#c9a227" />

      <OrbitControls
        enablePan={false}
        minDistance={3}
        maxDistance={12}
        autoRotate
        autoRotateSpeed={0.35}
      />

      <Core core={core} blendedColor={blendedColor} blendedEmissive={blendedEmissive} ouraStats={ouraStats} />

      {/* Ring 1: XY plane — Energy, Mood, Focus, Calm (tumble so axis moves) */}
      <OrbitalWithNodes nodes={ring1Nodes} initialRotation={[0, 0, 0]} speed={0.08} speedX={0.03} speedZ={-0.02} />

      {/* Ring 2: XZ plane — Motivation, Gratitude, Connection, Balance (tumble) */}
      <OrbitalWithNodes nodes={ring2Nodes} initialRotation={[Math.PI / 2, 0, 0]} speed={-0.06} speedX={0.02} speedZ={0.04} />
    </>
  );
}

export default function PersonalityMatrix3D({ matrix, ouraStats }) {
  return (
    <div className="matrix-3d-container">
      <Canvas camera={{ position: [5, 3, 5], fov: 45 }} gl={{ antialias: true, alpha: false }}>
        <Scene matrix={matrix} ouraStats={ouraStats} />
      </Canvas>
    </div>
  );
}
