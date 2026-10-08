import { ActorSide, Formation, Slot } from './types';
import { layoutSide } from './rotation';

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

/** Rotation defaults overlaid with saved base positions (only keys still on court are drawn). */
export function startingPositions(setup: CourtSetup, base: Record<string, Point> = {}): Record<string, Point> {
  const defaults = startPositions(setup);
  const merged = { ...defaults };
  for (const [key, point] of Object.entries(base)) {
    if (key in defaults || key === 'BALL') merged[key] = point;
  }
  return merged;
}
