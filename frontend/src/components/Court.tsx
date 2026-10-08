import { MouseEvent, PointerEvent, useRef } from 'react';
import { COURT } from '../constants';
import { Point } from '../court';

export interface Token extends Point {
  key: string;
  label: string;
  color: string;
  highlight?: boolean;
  /** Overrides the court-wide transition for this token. */
  transitionMs?: number;
}

interface Props {
  tokens: Token[];
  /** Numbered markers for the end positions of the steps. */
  markers?: (Point & { label: string; active?: boolean })[];
  /** Faded circles (for example a player's base while they stand at a step). */
  ghosts?: (Point & { key?: string })[];
  /** Animation time of token moves in ms (0 = jump). Per-token `transitionMs` wins. */
  transitionMs?: number;
  onPick?: (point: Point) => void;
  /** Drag a token's circle to a new court position. */
  onDragToken?: (key: string, point: Point) => void;
}

const round = (v: number) => Math.round(v * 10) / 10;

function clampPoint(x: number, y: number): Point {
  return {
    x: round(Math.min(COURT.width, Math.max(0, x))),
    y: round(Math.min(COURT.height, Math.max(0, y))),
  };
}

/** Volleyball court (x 0..9, y 0..18, net at y = 9) drawn as SVG. */
export function Court({
  tokens,
  markers = [],
  ghosts = [],
  transitionMs = 0,
  onPick,
  onDragToken,
}: Props) {
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<{ key: string; moved: boolean } | null>(null);
  const skipClick = useRef(false);

  const toPoint = (clientX: number, clientY: number): Point | null => {
    if (!svg.current) return null;
    const matrix = svg.current.getScreenCTM();
    if (!matrix) return null;
    const p = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
    return clampPoint(p.x, p.y);
  };

  const onCourtClick = (e: MouseEvent<SVGSVGElement>) => {
    if (skipClick.current) {
      skipClick.current = false;
      return;
    }
    if (!onPick) return;
    const p = toPoint(e.clientX, e.clientY);
    if (p) onPick(p);
  };

  const onTokenDown = (key: string) => (e: PointerEvent<SVGGElement>) => {
    if (!onDragToken) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { key, moved: false };
  };

  const onTokenMove = (e: PointerEvent<SVGGElement>) => {
    if (!drag.current || !onDragToken) return;
    const p = toPoint(e.clientX, e.clientY);
    if (!p) return;
    drag.current.moved = true;
    onDragToken(drag.current.key, p);
  };

  const onTokenUp = () => {
    if (drag.current?.moved) skipClick.current = true;
    drag.current = null;
  };

  return (
    <svg
      ref={svg}
      viewBox={`-1 -1 ${COURT.width + 2} ${COURT.height + 2}`}
      style={{
        width: '100%',
        maxWidth: 420,
        background: '#e8f1fb',
        cursor: onPick ? 'crosshair' : 'default',
        touchAction: 'none',
        userSelect: 'none',
      }}
      onClick={onCourtClick}
    >
      <rect x={0} y={0} width={COURT.width} height={COURT.height} fill="#f3c98b" stroke="#fff" strokeWidth={0.1} />
      <line x1={0} y1={6} x2={COURT.width} y2={6} stroke="#fff" strokeWidth={0.08} />
      <line x1={0} y1={12} x2={COURT.width} y2={12} stroke="#fff" strokeWidth={0.08} />
      <line x1={-0.5} y1={9} x2={COURT.width + 0.5} y2={9} stroke="#333" strokeWidth={0.15} />

      {ghosts.map((g, i) => (
        <circle
          key={g.key ?? i}
          cx={g.x}
          cy={g.y}
          r={0.55}
          fill="none"
          stroke="#555"
          strokeWidth={0.08}
          strokeDasharray="0.2 0.15"
          opacity={0.7}
        />
      ))}

      {markers.map((m, i) => (
        <g key={i} opacity={m.active ? 1 : 0.6}>
          <circle cx={m.x} cy={m.y} r={m.active ? 0.35 : 0.25} fill={m.active ? '#d32f2f' : '#555'} />
          <text x={m.x + 0.4} y={m.y - 0.3} fontSize={0.5} fill="#222">
            {m.label}
          </text>
        </g>
      ))}

      {tokens.map((t) => (
        <g
          key={t.key}
          style={{
            transform: `translate(${t.x}px, ${t.y}px)`,
            transition: `transform ${t.transitionMs ?? transitionMs}ms linear`,
            cursor: onDragToken ? 'grab' : undefined,
          }}
          onPointerDown={onTokenDown(t.key)}
          onPointerMove={onTokenMove}
          onPointerUp={onTokenUp}
          onPointerCancel={onTokenUp}
        >
          {t.highlight && <circle r={0.9} fill="none" stroke="#fbc02d" strokeWidth={0.14} />}
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
export function toTokens(
  positions: Record<string, Point>,
  extras: Partial<Record<string, Partial<Token>>> = {},
): Token[] {
  return Object.entries(positions).map(([key, p]) => {
    const extra = extras[key] ?? {};
    if (key === 'BALL') return { key, ...p, label: '', color: '#222', ...extra };
    const [side, slot] = key.split(':');
    return { key, ...p, label: SLOT_SHORT[slot] ?? slot, color: side === 'OWN' ? '#1976d2' : '#c62828', ...extra };
  });
}
