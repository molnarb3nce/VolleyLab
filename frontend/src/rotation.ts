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

/** Rotation 1: each role’s zone number (Setter 1, M1 6, O1 5, OP 4, M2 3, O2 2). */
const ROT1_ZONE_BY_SLOT: Partial<Record<Slot, number>> = {
  SETTER_1: 1,
  MIDDLE_1: 6,
  OUTSIDE_1: 5,
  OPPOSITE: 4,
  MIDDLE_2: 3,
  OUTSIDE_2: 2,
  SETTER_2: 4,
};

/** Rotation 1 zone → slot (derived from the table above). */
const ROT1_SLOT_BY_ZONE: Record<Formation, Record<number, Slot>> = {
  FIVE_ONE: { 1: 'SETTER_1', 6: 'MIDDLE_1', 5: 'OUTSIDE_1', 4: 'OPPOSITE', 3: 'MIDDLE_2', 2: 'OUTSIDE_2' },
  SIX_TWO: { 1: 'SETTER_1', 6: 'MIDDLE_1', 5: 'OUTSIDE_1', 4: 'SETTER_2', 3: 'MIDDLE_2', 2: 'OUTSIDE_2' },
  FOUR_TWO: { 1: 'SETTER_1', 6: 'MIDDLE_1', 5: 'OUTSIDE_1', 4: 'SETTER_2', 3: 'MIDDLE_2', 2: 'OUTSIDE_2' },
};

function wrapZone(zone: number): number {
  return ((zone - 1 + 600) % 6) + 1;
}

/** Each rotation every player’s zone number decreases by 1; zone 1 wraps to 6. */
export function zoneForSlot(formation: Formation, rotation: number, slot: Slot): number | null {
  const start = ROT1_ZONE_BY_SLOT[slot];
  if (start == null) return null;
  if (!Object.values(ROT1_SLOT_BY_ZONE[formation]).includes(slot)) return null;
  const steps = ((rotation - 1) % 6 + 6) % 6;
  return wrapZone(start - steps);
}

/** Which slot stands in each zone for this formation and rotation. */
export function slotByZone(formation: Formation, rotation: number): Record<number, Slot> {
  const slots = Object.values(ROT1_SLOT_BY_ZONE[formation]);
  const byZone: Record<number, Slot> = {};
  for (const slot of slots) {
    const z = zoneForSlot(formation, rotation, slot);
    if (z != null) byZone[z] = slot;
  }
  return byZone;
}

export function isBackRowZone(zone: number): boolean {
  return zone === 1 || zone === 5 || zone === 6;
}

export function zoneOfSlot(formation: Formation, rotation: number, slot: Slot): number | null {
  return zoneForSlot(formation, rotation, slot);
}

/** Replaced player just moved from back-row zone 5 to front-row zone 4. */
export function liberoZone1Exchange(
  formation: Formation,
  rotation: number,
  liberoReplaces: Slot | null,
): boolean {
  if (!liberoReplaces || rotation <= 1) return false;
  const z = zoneForSlot(formation, rotation, liberoReplaces);
  const zPrev = zoneForSlot(formation, rotation - 1, liberoReplaces);
  return z === 4 && zPrev === 5;
}

/** 1 or 2 rotations after the 5→4 exchange: libero steps through zones 6 then 5. */
function postExchangeOffset(
  formation: Formation,
  rotation: number,
  liberoReplaces: Slot,
): 1 | 2 | null {
  for (let r = rotation - 1; r >= Math.max(2, rotation - 2); r--) {
    if (liberoZone1Exchange(formation, r, liberoReplaces)) {
      const offset = rotation - r;
      if (offset === 1 || offset === 2) return offset;
    }
  }
  return null;
}

/**
 * Where the libero plays this rotation. `liberoReplaces` stays the configured role (e.g. M1);
 * the masked slot is whoever is physically replaced on court that rotation.
 */
export type LiberoPlacement =
  | { mode: 'substitute'; zone: number; maskedSlot: Slot }
  | { mode: 'exchange'; zone: 1; maskedSlot: Slot }
  | { mode: 'transition'; zone: number; maskedSlot: Slot };

export function liberoPlacement(
  formation: Formation,
  rotation: number,
  liberoReplaces: Slot | null,
): LiberoPlacement | null {
  if (!liberoReplaces) return null;
  const repZone = zoneForSlot(formation, rotation, liberoReplaces);
  if (repZone == null) return null;
  const layout = slotByZone(formation, rotation);

  if (liberoZone1Exchange(formation, rotation, liberoReplaces)) {
    const maskedSlot = layout[1];
    if (!maskedSlot) return null;
    return { mode: 'exchange', zone: 1, maskedSlot };
  }

  const post = postExchangeOffset(formation, rotation, liberoReplaces);
  if (post === 1) {
    const maskedSlot = layout[6];
    if (!maskedSlot) return null;
    return { mode: 'transition', zone: 6, maskedSlot };
  }
  if (post === 2) {
    const maskedSlot = layout[5];
    if (!maskedSlot) return null;
    return { mode: 'transition', zone: 5, maskedSlot };
  }

  if (isBackRowZone(repZone)) {
    return { mode: 'substitute', zone: repZone, maskedSlot: liberoReplaces };
  }

  const maskedSlot = layout[6];
  if (!maskedSlot) return null;
  return { mode: 'transition', zone: 6, maskedSlot };
}

export function liberoOnCourt(
  formation: Formation,
  rotation: number,
  liberoReplaces: Slot | null,
): boolean {
  return liberoPlacement(formation, rotation, liberoReplaces) != null;
}

export function liberoAtZone1(
  formation: Formation,
  rotation: number,
  liberoReplaces: Slot | null,
): boolean {
  const p = liberoPlacement(formation, rotation, liberoReplaces);
  return p?.mode === 'exchange';
}

/** Slot whose token is hidden because the libero plays that position this rotation. */
export function liberoMaskedSlot(
  formation: Formation,
  rotation: number,
  liberoReplaces: Slot | null,
): Slot | null {
  return liberoPlacement(formation, rotation, liberoReplaces)?.maskedSlot ?? null;
}

/** Court token key for a slot (accounts for libero masking this rotation). */
export function onCourtTokenKey(
  side: 'OWN' | 'OPPONENT',
  slot: Slot,
  formation: Formation,
  rotation: number,
  liberoReplaces: Slot | null,
): string {
  if (side !== 'OWN' || !liberoReplaces) return `${side}:${slot}`;
  const p = liberoPlacement(formation, rotation, liberoReplaces);
  if (!p) return `${side}:${slot}`;
  if (p.mode === 'substitute' && slot === liberoReplaces) return `${side}:LIBERO`;
  if (slot === p.maskedSlot) return `${side}:LIBERO`;
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
  const placement = side === 'OWN' ? liberoPlacement(formation, rotation, liberoReplaces) : null;
  const positions: Record<string, Point> = {};

  for (let zone = 1; zone <= 6; zone++) {
    const slot = layout[zone];
    if (!slot) continue;
    const point = side === 'OWN' ? ZONE[zone] : mirrorPoint(ZONE[zone]);

    if (placement && zone === placement.zone) {
      positions[`${side}:LIBERO`] = point;
      if (slot === placement.maskedSlot) continue;
    }

    positions[`${side}:${slot}`] = point;
  }
  return positions;
}

/** Slots that may be replaced by the libero in the back row (never the libero slot itself). */
export const LIBERO_REPLACE_CHOICES: Slot[] = ['MIDDLE_1', 'MIDDLE_2', 'OUTSIDE_1', 'OUTSIDE_2'];
