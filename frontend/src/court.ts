import { ActorSide, Formation, Slot } from './types';
import { layoutSide, liberoOnCourt } from './rotation';

export interface Point {
  x: number;
  y: number;
}

/** The opponent stands in the upper half, mirrored. */
export const mirror = (p: Point): Point => ({ x: 9 - p.x, y: 18 - p.y });

/** Just on the opponent side of the net, so a receive starts with the ball coming through. */
export const BALL_START: Point = { x: 4.5, y: 7 };

/** Key of a token on the court: the ball, or a slot of one side. */
export const tokenKey = (side: ActorSide, slot: Slot | null): string =>
  side === 'BALL' ? 'BALL' : `${side}:${slot}`;

export interface CourtSetup {
  ownFormation: Formation;
  opponentFormation: Formation;
  rotation: number;
  opponentRotation: number;
  /** Back-row slot replaced by the libero while that slot is in the back row; null = no libero on court. */
  liberoReplaces: Slot | null;
}

/** Default layout: six per side from rotation, optional libero substitution on own side. */
export function startPositions(setup: CourtSetup): Record<string, Point> {
  return {
    BALL: BALL_START,
    ...layoutSide('OWN', setup.ownFormation, setup.rotation, setup.liberoReplaces, mirror),
    ...layoutSide('OPPONENT', setup.opponentFormation, setup.opponentRotation, null, mirror),
  };
}

/**
 * Keeps only base keys that belong on court for this rotation/libero state.
 * When the libero enters or leaves, carries the saved point between `OWN:LIBERO`
 * and `OWN:<replaced slot>` so the player does not vanish after rotating.
 */
export function reconcileBasePositions(setup: CourtSetup, base: Record<string, Point>): Record<string, Point> {
  const onCourt = startPositions(setup);
  const onCourtKeys = new Set(Object.keys(onCourt));
  const out: Record<string, Point> = {};

  const rep = setup.liberoReplaces;
  const libIn = !!rep && liberoOnCourt(setup.ownFormation, setup.rotation, rep);
  if (rep) {
    const slotKey = `OWN:${rep}`;
    const libKey = 'OWN:LIBERO';
    if (libIn || onCourtKeys.has(libKey)) {
      if (base[libKey]) out[libKey] = base[libKey];
      else if (onCourtKeys.has(libKey) && base[slotKey]) out[libKey] = base[slotKey];
    }
    if (!libIn || onCourtKeys.has(slotKey)) {
      if (base[slotKey]) out[slotKey] = base[slotKey];
      else if (!libIn && onCourtKeys.has(slotKey) && base[libKey]) out[slotKey] = base[libKey];
    }
  }

  for (const key of onCourtKeys) {
    if (key in out) continue;
    if (key in base) out[key] = base[key];
  }
  if ('BALL' in base) out.BALL = base.BALL;

  return out;
}

/** Rotation defaults overlaid with saved base positions (only keys still on court are drawn). */
export function startingPositions(setup: CourtSetup, base: Record<string, Point> = {}): Record<string, Point> {
  const defaults = startPositions(setup);
  const merged = { ...defaults };
  const reconciled = reconcileBasePositions(setup, base);
  for (const [key, point] of Object.entries(reconciled)) {
    if (key in defaults || key === 'BALL') merged[key] = point;
  }
  return merged;
}
