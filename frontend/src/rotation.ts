import { Formation, Slot } from './types';
import { Point } from './court';

/** Court zones 1..6 (net at y = 9; own team in y 9..18). */
export const ZONE: Record<number, Point> = {
  1: { x: 7.5, y: 16.5 },
  6: { x: 4.5, y: 16.5 },
  5: { x: 1.5, y: 16.5 },
  4: { x: 1.5, y: 10.5 },
  3: { x: 4.5, y: 10.5 },
  2: { x: 7.5, y: 10.5 },
};

const CLOCKWISE_FROM: Record<number, number> = { 1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 1 };

/** Rotation 1: which slot stands in each zone (facing the net from the back row). */
const ROT1_SLOT_BY_ZONE: Record<Formation, Record<number, Slot>> = {
  FIVE_ONE: { 1: 'SETTER_1', 6: 'MIDDLE_1', 5: 'OUTSIDE_1', 4: 'OPPOSITE', 3: 'MIDDLE_2', 2: 'OUTSIDE_2' },
  SIX_TWO: { 1: 'SETTER_1', 6: 'MIDDLE_1', 5: 'OUTSIDE_1', 4: 'SETTER_2', 3: 'MIDDLE_2', 2: 'OUTSIDE_2' },
  FOUR_TWO: { 1: 'SETTER_1', 6: 'MIDDLE_1', 5: 'OUTSIDE_1', 4: 'SETTER_2', 3: 'MIDDLE_2', 2: 'OUTSIDE_2' },
};

function slotByZone(formation: Formation, rotation: number): Record<number, Slot> {
  let layout = { ...ROT1_SLOT_BY_ZONE[formation] };
  const turns = ((rotation - 1) % 6 + 6) % 6;
  for (let t = 0; t < turns; t++) {
    const next: Record<number, Slot> = { ...layout };
    for (let z = 1; z <= 6; z++) {
      next[z] = layout[CLOCKWISE_FROM[z]];
    }
    layout = next;
  }
  return layout;
}

export function isBackRowZone(zone: number): boolean {
  return zone === 1 || zone === 5 || zone === 6;
}

/** Zone where `slot` stands for this formation and rotation (1..6). */
export function zoneOfSlot(formation: Formation, rotation: number, slot: Slot): number | null {
  const layout = slotByZone(formation, rotation);
  for (const [z, s] of Object.entries(layout)) {
    if (s === slot) return Number(z);
  }
  return null;
}

/** True when the libero is on court replacing `liberoReplaces` in the back row. */
export function liberoOnCourt(formation: Formation, rotation: number, liberoReplaces: Slot | null): boolean {
  if (!liberoReplaces) return false;
  const zone = zoneOfSlot(formation, rotation, liberoReplaces);
  return zone !== null && isBackRowZone(zone);
}

/** Court token key for a slot (libero stands in when replacing a back-row player). */
export function onCourtTokenKey(
  side: 'OWN' | 'OPPONENT',
  slot: Slot,
  formation: Formation,
  rotation: number,
  liberoReplaces: Slot | null,
): string {
  if (side === 'OWN' && liberoOnCourt(formation, rotation, liberoReplaces) && slot === liberoReplaces) {
    return `${side}:LIBERO`;
  }
  return `${side}:${slot}`;
}

/** Six on-court tokens for one side at the given rotation. */
export function layoutSide(
  side: 'OWN' | 'OPPONENT',
  formation: Formation,
  rotation: number,
  liberoReplaces: Slot | null,
  mirrorPoint: (p: Point) => Point,
): Record<string, Point> {
  const layout = slotByZone(formation, rotation);
  const liberoIn = side === 'OWN' && liberoOnCourt(formation, rotation, liberoReplaces);
  const positions: Record<string, Point> = {};

  for (let zone = 1; zone <= 6; zone++) {
    const slot = layout[zone];
    const point = side === 'OWN' ? ZONE[zone] : mirrorPoint(ZONE[zone]);
    if (liberoIn && slot === liberoReplaces) {
      positions[`${side}:LIBERO`] = point;
    } else {
      positions[`${side}:${slot}`] = point;
    }
  }
  return positions;
}

/** Slots that may be replaced by the libero in the back row (never the libero slot itself). */
export const LIBERO_REPLACE_CHOICES: Slot[] = ['MIDDLE_1', 'MIDDLE_2', 'OUTSIDE_1', 'OUTSIDE_2'];
