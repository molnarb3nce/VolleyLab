import { MouseEvent, useRef } from 'react';
import { COURT } from '../constants';
import { Point } from '../court';

export interface Token extends Point {
  key: string;
  label: string;
  color: string;
}

interface Props {
  tokens: Token[];
  /** Numbered markers for the end positions of the steps. */
  markers?: (Point & { label: string; active?: boolean })[];
  /** Animation time of token moves in ms (0 = jump). */
  transitionMs?: number;
  onPick?: (point: Point) => void;
}

const round = (v: number) => Math.round(v * 10) / 10;

/** Volleyball court (x 0..9, y 0..18, net at y = 9) drawn as SVG. Clicking picks a position. */
export function Court({ tokens, markers = [], transitionMs = 0, onPick }: Props) {
  const svg = useRef<SVGSVGElement>(null);

  const pick = (e: MouseEvent<SVGSVGElement>) => {
    if (!onPick || !svg.current) return;
    const matrix = svg.current.getScreenCTM();
    if (!matrix) return;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(matrix.inverse());
    onPick({
      x: round(Math.min(COURT.width, Math.max(0, p.x))),
      y: round(Math.min(COURT.height, Math.max(0, p.y))),
    });
  };

  return (
    <svg
      ref={svg}
      viewBox={`-1 -1 ${COURT.width + 2} ${COURT.height + 2}`}
      style={{ width: '100%', maxWidth: 360, background: '#e8f1fb', cursor: onPick ? 'crosshair' : 'default' }}
      onClick={pick}
    >
      <rect x={0} y={0} width={COURT.width} height={COURT.height} fill="#f3c98b" stroke="#fff" strokeWidth={0.1} />
      <line x1={0} y1={6} x2={COURT.width} y2={6} stroke="#fff" strokeWidth={0.08} />
      <line x1={0} y1={12} x2={COURT.width} y2={12} stroke="#fff" strokeWidth={0.08} />
      <line x1={-0.5} y1={9} x2={COURT.width + 0.5} y2={9} stroke="#333" strokeWidth={0.15} />

      {markers.map((m, i) => (
        <g key={i} opacity={m.active ? 1 : 0.6}>
          <circle cx={m.x} cy={m.y} r={m.active ? 0.35 : 0.25} fill={m.active ? '#d32f2f' : '#555'} />
          <text x={m.x + 0.4} y={m.y - 0.3} fontSize={0.5} fill="#222">{m.label}</text>
        </g>
      ))}

      {tokens.map((t) => (
        <g
          key={t.key}
          style={{ transform: `translate(${t.x}px, ${t.y}px)`, transition: `transform ${transitionMs}ms linear` }}
        >
          <circle r={t.key === 'BALL' ? 0.35 : 0.65} fill={t.color} stroke="#fff" strokeWidth={0.06} />
          <text textAnchor="middle" y={0.18} fontSize={0.45} fill="#fff" style={{ pointerEvents: 'none' }}>
            {t.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

const SLOT_SHORT: Record<string, string> = {
  SETTER_1: 'S1',
  SETTER_2: 'S2',
  OPPOSITE: 'OP',
  OUTSIDE_1: 'O1',
  OUTSIDE_2: 'O2',
  MIDDLE_1: 'M1',
  MIDDLE_2: 'M2',
  LIBERO: 'L',
};

/** Turns a position map (see court.ts) into drawable tokens. */
export function toTokens(positions: Record<string, Point>): Token[] {
  return Object.entries(positions).map(([key, p]) => {
    if (key === 'BALL') return { key, ...p, label: '', color: '#222' };
    const [side, slot] = key.split(':');
    return { key, ...p, label: SLOT_SHORT[slot] ?? slot, color: side === 'OWN' ? '#1976d2' : '#c62828' };
  });
}
