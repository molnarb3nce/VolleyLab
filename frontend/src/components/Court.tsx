import { MouseEvent, PointerEvent, useId, useRef } from 'react';
import { COURT, SLOT_SHORT } from '../constants';
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
  const floorId = useId().replace(/:/g, '');
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
        maxWidth: 440,
        display: 'block',
        borderRadius: 16,
        boxShadow:
          '0 0 0 1px rgba(255,255,255,0.12), 0 12px 40px rgba(0,0,0,0.55), 0 0 60px rgba(99,102,241,0.15)',
        cursor: onPick ? 'crosshair' : 'default',
        touchAction: 'none',
        userSelect: 'none',
      }}
      onClick={onCourtClick}
    >
      <defs>
        <linearGradient id={floorId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#edd5a8" />
          <stop offset="50%" stopColor="#e8c896" />
          <stop offset="100%" stopColor="#d4a574" />
        </linearGradient>
      </defs>
      <rect x={0} y={0} width={COURT.width} height={COURT.height} fill={`url(#${floorId})`} rx={0.15} />
      <rect x={0} y={0} width={COURT.width} height={COURT.height} fill="none" stroke="#fff" strokeWidth={0.12} rx={0.15} />
      <line x1={0} y1={6} x2={COURT.width} y2={6} stroke="#fff" strokeWidth={0.08} opacity={0.9} />
      <line x1={0} y1={12} x2={COURT.width} y2={12} stroke="#fff" strokeWidth={0.08} opacity={0.9} />
      <line x1={-0.5} y1={9} x2={COURT.width + 0.5} y2={9} stroke="#334155" strokeWidth={0.16} />
      <text x={COURT.width / 2} y={8.55} textAnchor="middle" fontSize={0.35} fill="#78716c" style={{ pointerEvents: 'none' }}>
        our side
      </text>
      <text x={COURT.width / 2} y={9.45} textAnchor="middle" fontSize={0.35} fill="#78716c" style={{ pointerEvents: 'none' }}>
        opponent
      </text>

      {ghosts.map((g, i) => (
        <circle
          key={g.key ?? i}
          cx={g.x}
          cy={g.y}
          r={0.55}
          fill="none"
          stroke="#57534e"
          strokeWidth={0.08}
          strokeDasharray="0.2 0.15"
          opacity={0.7}
        />
      ))}

      {markers.map((m, i) => (
        <g key={i} opacity={m.active ? 1 : 0.45}>
          <circle cx={m.x} cy={m.y} r={m.active ? 0.38 : 0.28} fill={m.active ? '#f472b6' : '#64748b'} />
          <text
            x={m.x}
            y={m.y + 0.16}
            textAnchor="middle"
            fontSize={0.42}
            fill="#fff"
            fontWeight={600}
            style={{ pointerEvents: 'none' }}
          >
            {m.label}
          </text>
        </g>
      ))}

      {tokens.map((t) => (
        <g
          key={t.key}
          style={{ cursor: onDragToken ? 'grab' : undefined }}
          onPointerDown={onTokenDown(t.key)}
          onPointerMove={onTokenMove}
          onPointerUp={onTokenUp}
          onPointerCancel={onTokenUp}
        >
          {t.highlight && (
            <circle cx={t.x} cy={t.y} r={0.92} fill="none" stroke="#fcd34d" strokeWidth={0.12} opacity={0.95} />
          )}
          <circle
            cx={t.x}
            cy={t.y}
            r={t.key === 'BALL' ? 0.38 : 0.68}
            fill={t.color}
            stroke="#fff"
            strokeWidth={0.07}
            style={{
              filter: 'drop-shadow(0 0.06px 0.12px rgba(0,0,0,0.25))',
              transition: `cx ${t.transitionMs ?? transitionMs}ms linear, cy ${t.transitionMs ?? transitionMs}ms linear`,
            }}
          />
          <text
            x={t.x}
            y={t.y + 0.18}
            textAnchor="middle"
            fontSize={0.45}
            fill="#fff"
            style={{ pointerEvents: 'none' }}
          >
            {t.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

/** Turns a position map (see court.ts) into drawable tokens. */
export function toTokens(
  positions: Record<string, Point>,
  extras: Partial<Record<string, Partial<Token>>> = {},
): Token[] {
  return Object.entries(positions).map(([key, p]) => {
    const extra = extras[key] ?? {};
    if (key === 'BALL') return { key, ...p, label: '', color: '#f8fafc', ...extra };
    const [side, slot] = key.split(':');
    return { key, ...p, label: SLOT_SHORT[slot] ?? slot, color: side === 'OWN' ? '#60a5fa' : '#f87171', ...extra };
  });
}
