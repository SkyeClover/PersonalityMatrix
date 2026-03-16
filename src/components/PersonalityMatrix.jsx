import React, { useMemo } from 'react';
import { NODE_STATES } from '../data/matrixModel';

const CX = 400;
const CY = 320;
const CORE_R = 52;
const PERSONALITY_R_INNER = 100;
const PERSONALITY_R_OUTER = 200;
const PROTECTION_R_INNER = 210;
const PROTECTION_STROKE = 48;

const NODE_COLORS = {
  [NODE_STATES.STRONG]: '#5b9e6e',
  [NODE_STATES.WEAK]: '#6b5b7c',
  [NODE_STATES.FLUX]: '#b8860b',
  [NODE_STATES.DAMAGED]: '#a65d4a',
  [NODE_STATES.CORRUPTED]: '#8b4a5a',
  [NODE_STATES.BALANCED]: '#6b8a9e',
};

function getNodePosition(index, total) {
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
  const r = (PERSONALITY_R_INNER + PERSONALITY_R_OUTER) / 2;
  return {
    x: CX + r * Math.cos(angle),
    y: CY + r * Math.sin(angle),
    angle: (angle * 180) / Math.PI + 90,
  };
}

export default function PersonalityMatrix({ matrix }) {
  const { core, will, protectionThickness, nodes } = matrix;
  const nodePositions = useMemo(
    () => nodes.map((_, i) => getNodePosition(i, nodes.length)),
    [nodes.length]
  );

  const protectionOuterR = PROTECTION_R_INNER + PROTECTION_STROKE * (0.3 + 0.7 * (will / 100));

  return (
    <svg
      viewBox="0 0 800 640"
      className="matrix-svg"
      style={{ width: '100%', height: 'auto', maxHeight: '80vh' }}
    >
      <defs>
        <radialGradient id="core-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#5a9a6a" />
          <stop offset="100%" stopColor="#2d4a36" />
        </radialGradient>
        <radialGradient id="personality-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#2a2d38" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#16181f" stopOpacity="0.95" />
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Protection / Stabilization (outer buffer — thickness reflects Will) */}
      <ellipse
        cx={CX}
        cy={CY}
        rx={protectionOuterR}
        ry={protectionOuterR * 0.92}
        fill="none"
        stroke="url(#personality-grad)"
        strokeWidth={PROTECTION_STROKE * protectionThickness}
        opacity={0.6}
      />
      <ellipse
        cx={CX}
        cy={CY}
        rx={PROTECTION_R_INNER}
        ry={PROTECTION_R_INNER * 0.92}
        fill="none"
        stroke="#2a2d38"
        strokeWidth="2"
        opacity={0.8}
      />

      {/* Personality matrix band */}
      <ellipse
        cx={CX}
        cy={CY}
        rx={PERSONALITY_R_OUTER}
        ry={PERSONALITY_R_OUTER * 0.92}
        fill="none"
        stroke="#3a3e4a"
        strokeWidth="2"
      />
      <ellipse
        cx={CX}
        cy={CY}
        rx={PERSONALITY_R_INNER}
        ry={PERSONALITY_R_INNER * 0.92}
        fill="none"
        stroke="#3a3e4a"
        strokeWidth="2"
      />

      {/* Nodes on the personality ring */}
      {nodes.map((node, i) => {
        const pos = nodePositions[i];
        const color = NODE_COLORS[node.state] || NODE_COLORS[NODE_STATES.BALANCED];
        return (
          <g key={node.id}>
            <circle
              cx={pos.x}
              cy={pos.y}
              r={node.state === NODE_STATES.STRONG ? 18 : 14}
              fill={color}
              fillOpacity={node.state === NODE_STATES.WEAK ? 0.6 : 0.9}
              stroke="#0d0e12"
              strokeWidth="1.5"
              filter={node.state === NODE_STATES.FLUX ? 'url(#glow)' : undefined}
            />
            <text
              x={pos.x}
              y={pos.y + 4}
              textAnchor="middle"
              fill="#e8e6e3"
              fontSize="11"
              fontFamily="JetBrains Mono, monospace"
            >
              {node.label}
            </text>
          </g>
        );
      })}

      {/* Core (Attunement) */}
      <circle
        cx={CX}
        cy={CY}
        r={CORE_R}
        fill="url(#core-grad)"
        stroke="#c9a227"
        strokeWidth="2"
      />
      <text
        x={CX}
        y={CY - 6}
        textAnchor="middle"
        fill="#e8e6e3"
        fontSize="12"
        fontFamily="Crimson Pro, serif"
        fontWeight="600"
      >
        {core.label}
      </text>
      <text
        x={CX}
        y={CY + 14}
        textAnchor="middle"
        fill="#c9a227"
        fontSize="14"
        fontFamily="JetBrains Mono, monospace"
      >
        {core.value}
      </text>
    </svg>
  );
}
