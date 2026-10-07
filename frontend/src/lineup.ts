import { FormationsInfo, Formation, Player, Slot } from './types';

/** All slots of a formation: required ones first, then the optional libero. */
export function slotsOf(info: FormationsInfo, formation: Formation): Slot[] {
  const f = info.formations.find((x) => x.name === formation);
  return f ? [...f.requiredSlots, ...f.optionalSlots] : [];
}

export const isRequired = (info: FormationsInfo, formation: Formation, slot: Slot) =>
  info.formations.find((x) => x.name === formation)?.requiredSlots.includes(slot) ?? false;

/** Suggests an assignment: the first unused active player with the matching role for every slot. */
export function autoAssign(
  info: FormationsInfo,
  formation: Formation,
  players: Player[],
): Partial<Record<Slot, number>> {
  const used = new Set<number>();
  const result: Partial<Record<Slot, number>> = {};
  for (const slot of slotsOf(info, formation)) {
    const player = players.find(
      (p) => p.isActive && !used.has(p.id) && p.role === info.slotRoles[slot],
    );
    if (player) {
      used.add(player.id);
      result[slot] = player.id;
    }
  }
  return result;
}
