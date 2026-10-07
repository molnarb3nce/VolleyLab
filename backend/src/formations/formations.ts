/**
 * Formation (strategy) templates.
 *
 * Formations live in code, not in the database. The database only stores the
 * enum values (see prisma/schema.prisma). The enums are declared here as string
 * unions that mirror the Prisma enums, so this module has no dependency on the
 * generated Prisma client and can be unit tested in isolation.
 */

export const PLAYER_ROLES = [
  'SETTER',
  'OUTSIDE_HITTER',
  'MIDDLE_BLOCKER',
  'OPPOSITE',
  'LIBERO',
] as const;
export type PlayerRole = (typeof PLAYER_ROLES)[number];

export const FORMATIONS = ['FIVE_ONE', 'SIX_TWO', 'FOUR_TWO'] as const;
export type Formation = (typeof FORMATIONS)[number];

export const SLOTS = [
  'SETTER_1',
  'SETTER_2',
  'OPPOSITE',
  'OUTSIDE_1',
  'OUTSIDE_2',
  'MIDDLE_1',
  'MIDDLE_2',
  'LIBERO',
] as const;
export type Slot = (typeof SLOTS)[number];

/** The player role that is expected to occupy each slot. */
export const SLOT_ROLE: Readonly<Record<Slot, PlayerRole>> = {
  SETTER_1: 'SETTER',
  SETTER_2: 'SETTER',
  OPPOSITE: 'OPPOSITE',
  OUTSIDE_1: 'OUTSIDE_HITTER',
  OUTSIDE_2: 'OUTSIDE_HITTER',
  MIDDLE_1: 'MIDDLE_BLOCKER',
  MIDDLE_2: 'MIDDLE_BLOCKER',
  LIBERO: 'LIBERO',
};

export interface FormationTemplate {
  /** Slots that must be filled by exactly one player each. */
  readonly requiredSlots: readonly Slot[];
  /** Slots that may be filled (the libero). */
  readonly optionalSlots: readonly Slot[];
}

const OPTIONAL_SLOTS: readonly Slot[] = ['LIBERO'];

export const FORMATION_TEMPLATES: Readonly<Record<Formation, FormationTemplate>> = {
  FIVE_ONE: {
    requiredSlots: ['SETTER_1', 'OPPOSITE', 'OUTSIDE_1', 'OUTSIDE_2', 'MIDDLE_1', 'MIDDLE_2'],
    optionalSlots: OPTIONAL_SLOTS,
  },
  // 6-2 and 4-2 currently share the same slot list: they differ only in
  // rotation behaviour, which the project does not model.
  SIX_TWO: {
    requiredSlots: ['SETTER_1', 'SETTER_2', 'OUTSIDE_1', 'OUTSIDE_2', 'MIDDLE_1', 'MIDDLE_2'],
    optionalSlots: OPTIONAL_SLOTS,
  },
  FOUR_TWO: {
    requiredSlots: ['SETTER_1', 'SETTER_2', 'OUTSIDE_1', 'OUTSIDE_2', 'MIDDLE_1', 'MIDDLE_2'],
    optionalSlots: OPTIONAL_SLOTS,
  },
};

/** All slots (required first, then optional) that exist in a formation. */
export function getAllSlots(formation: Formation): Slot[] {
  const template = FORMATION_TEMPLATES[formation];
  return [...template.requiredSlots, ...template.optionalSlots];
}

export function isSlotInFormation(formation: Formation, slot: Slot): boolean {
  return getAllSlots(formation).includes(slot);
}

export function isSlotRequired(formation: Formation, slot: Slot): boolean {
  return FORMATION_TEMPLATES[formation].requiredSlots.includes(slot);
}

/** How many players of each role a team needs to fill the required slots. */
export function getRequiredRoleCounts(formation: Formation): Partial<Record<PlayerRole, number>> {
  const counts: Partial<Record<PlayerRole, number>> = {};
  for (const slot of FORMATION_TEMPLATES[formation].requiredSlots) {
    const role = SLOT_ROLE[slot];
    counts[role] = (counts[role] ?? 0) + 1;
  }
  return counts;
}
