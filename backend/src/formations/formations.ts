import { Formation, PlayerRole, Slot } from '@prisma/client';

/**
 * Formation templates live in code; the database only stores the enum values.
 * 6-2 and 4-2 share the same slots: they differ only in rotation behaviour,
 * which the project does not model.
 */

/** The player role expected in each slot. */
export const SLOT_ROLE: Record<Slot, PlayerRole> = {
  SETTER_1: 'SETTER',
  SETTER_2: 'SETTER',
  OPPOSITE: 'OPPOSITE',
  OUTSIDE_1: 'OUTSIDE_HITTER',
  OUTSIDE_2: 'OUTSIDE_HITTER',
  MIDDLE_1: 'MIDDLE_BLOCKER',
  MIDDLE_2: 'MIDDLE_BLOCKER',
  LIBERO: 'LIBERO',
};

const TWO_SETTERS: Slot[] = ['SETTER_1', 'SETTER_2', 'OUTSIDE_1', 'OUTSIDE_2', 'MIDDLE_1', 'MIDDLE_2'];

/** Slots that must be filled by exactly one player each. The LIBERO slot is always optional. */
export const REQUIRED_SLOTS: Record<Formation, Slot[]> = {
  FIVE_ONE: ['SETTER_1', 'OPPOSITE', 'OUTSIDE_1', 'OUTSIDE_2', 'MIDDLE_1', 'MIDDLE_2'],
  SIX_TWO: TWO_SETTERS,
  FOUR_TWO: TWO_SETTERS,
};

export function isSlotInFormation(formation: Formation, slot: Slot): boolean {
  return slot === 'LIBERO' || REQUIRED_SLOTS[formation].includes(slot);
}
