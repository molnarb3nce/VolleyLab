import { ActorSide, Formation, FormationsInfo, Slot } from './types';
import { slotsOf } from './lineup';

export interface Point {
  x: number;
  y: number;
}

/** Default start position of each slot for the team in the lower half (y 9..18); the net is at y = 9. */
const OWN_START: Record<Slot, Point> = {
  OUTSIDE_1: { x: 1.5, y: 11.5 },
  MIDDLE_1: { x: 4.5, y: 11.5 },
  OPPOSITE: { x: 7.5, y: 11.5 },
  SETTER_2: { x: 7.5, y: 11.5 },
  OUTSIDE_2: { x: 1.5, y: 15 },
  MIDDLE_2: { x: 4.5, y: 15 },
  SETTER_1: { x: 7.5, y: 15 },
  LIBERO: { x: 3, y: 17.5 },
};

/** The opponent stands in the upper half, mirrored. */
export const mirror = (p: Point): Point => ({ x: 9 - p.x, y: 18 - p.y });

export const BALL_START: Point = { x: 4.5, y: 9 };

/** Key of a token on the court: the ball, or a slot of one side. */
export const tokenKey = (side: ActorSide, slot: Slot | null): string =>
  side === 'BALL' ? 'BALL' : `${side}:${slot}`;

export function startPositions(
  info: FormationsInfo,
  own: Formation,
  opponent: Formation,
): Record<string, Point> {
  const positions: Record<string, Point> = { BALL: BALL_START };
  for (const slot of slotsOf(info, own)) positions[tokenKey('OWN', slot)] = OWN_START[slot];
  for (const slot of slotsOf(info, opponent)) positions[tokenKey('OPPONENT', slot)] = mirror(OWN_START[slot]);
  return positions;
}
