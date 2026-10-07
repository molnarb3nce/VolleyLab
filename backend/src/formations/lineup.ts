import { Formation, PlayerRole, Slot } from '@prisma/client';
import { isSlotInFormation, REQUIRED_SLOTS, SLOT_ROLE } from './formations';

export interface LineupEntry {
  slot: Slot;
  playerId: number;
}

export interface TeamPlayer {
  id: number;
  role: PlayerRole;
}

/**
 * Checks a slot -> player assignment against a formation and returns a list of
 * human-readable problems (empty = valid). Pure function, shared by match
 * lineups and (later) tactic validation.
 *
 * `teamPlayers` must be the active players of the team the lineup is for.
 */
export function validateLineup(
  formation: Formation,
  entries: LineupEntry[],
  teamPlayers: TeamPlayer[],
): string[] {
  const problems: string[] = [];
  const playersById = new Map(teamPlayers.map((p) => [p.id, p]));
  const usedSlots = new Set<Slot>();
  const usedPlayers = new Set<number>();

  for (const { slot, playerId } of entries) {
    if (!isSlotInFormation(formation, slot)) {
      problems.push(`Slot ${slot} does not exist in formation ${formation}`);
      continue;
    }
    if (usedSlots.has(slot)) {
      problems.push(`Slot ${slot} is assigned more than once`);
    }
    usedSlots.add(slot);

    if (usedPlayers.has(playerId)) {
      problems.push(`Player ${playerId} is assigned to more than one slot`);
    }
    usedPlayers.add(playerId);

    const player = playersById.get(playerId);
    if (!player) {
      problems.push(`Player ${playerId} is not an active player of this team`);
    } else if (player.role !== SLOT_ROLE[slot]) {
      problems.push(`Slot ${slot} needs a ${SLOT_ROLE[slot]} but player ${playerId} is a ${player.role}`);
    }
  }

  for (const slot of REQUIRED_SLOTS[formation]) {
    if (!usedSlots.has(slot)) {
      problems.push(`Slot ${slot} is required but not assigned`);
    }
  }
  return problems;
}
