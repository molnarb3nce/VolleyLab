import { PlayerRole } from '@prisma/client';
import { LineupEntry, TeamPlayer, validateLineup } from './lineup';

const roster: TeamPlayer[] = [
  { id: 1, role: 'SETTER' },
  { id: 2, role: 'OPPOSITE' },
  { id: 3, role: 'OUTSIDE_HITTER' },
  { id: 4, role: 'OUTSIDE_HITTER' },
  { id: 5, role: 'MIDDLE_BLOCKER' },
  { id: 6, role: 'MIDDLE_BLOCKER' },
  { id: 7, role: 'LIBERO' },
  { id: 8, role: 'SETTER' },
];

const fiveOne: LineupEntry[] = [
  { slot: 'SETTER_1', playerId: 1 },
  { slot: 'OPPOSITE', playerId: 2 },
  { slot: 'OUTSIDE_1', playerId: 3 },
  { slot: 'OUTSIDE_2', playerId: 4 },
  { slot: 'MIDDLE_1', playerId: 5 },
  { slot: 'MIDDLE_2', playerId: 6 },
];

describe('validateLineup', () => {
  it('accepts a complete 5-1 lineup, with or without libero', () => {
    expect(validateLineup('FIVE_ONE', fiveOne, roster)).toEqual([]);
    expect(
      validateLineup('FIVE_ONE', [...fiveOne, { slot: 'LIBERO', playerId: 7 }], roster),
    ).toEqual([]);
  });

  it('accepts a complete 6-2 lineup', () => {
    const sixTwo = [
      { slot: 'SETTER_1', playerId: 1 },
      { slot: 'SETTER_2', playerId: 8 },
      ...fiveOne.slice(2),
    ] as LineupEntry[];
    expect(validateLineup('SIX_TWO', sixTwo, roster)).toEqual([]);
  });

  it('reports every missing required slot', () => {
    const problems = validateLineup('FIVE_ONE', fiveOne.slice(0, 4), roster);
    expect(problems).toEqual([
      'Slot MIDDLE_1 is required but not assigned',
      'Slot MIDDLE_2 is required but not assigned',
    ]);
  });

  it('rejects a slot that does not exist in the formation', () => {
    const problems = validateLineup('FIVE_ONE', [...fiveOne, { slot: 'SETTER_2', playerId: 8 }], roster);
    expect(problems).toEqual(['Slot SETTER_2 does not exist in formation FIVE_ONE']);
  });

  it('rejects a player in two slots', () => {
    const entries = fiveOne.map((e) => (e.slot === 'OUTSIDE_2' ? { ...e, playerId: 3 } : e));
    expect(validateLineup('FIVE_ONE', entries, roster)).toContain(
      'Player 3 is assigned to more than one slot',
    );
  });

  it('rejects a slot assigned twice', () => {
    const problems = validateLineup('FIVE_ONE', [...fiveOne, { slot: 'SETTER_1', playerId: 8 }], roster);
    expect(problems).toContain('Slot SETTER_1 is assigned more than once');
  });

  it('rejects a player who is not on the team (or inactive)', () => {
    const entries = fiveOne.map((e) => (e.slot === 'SETTER_1' ? { ...e, playerId: 99 } : e));
    expect(validateLineup('FIVE_ONE', entries, roster)).toEqual([
      'Player 99 is not an active player of this team',
    ]);
  });

  it('rejects a player whose role does not match the slot', () => {
    const swapped = roster.map((p) => (p.id === 5 ? { ...p, role: 'OPPOSITE' as PlayerRole } : p));
    expect(validateLineup('FIVE_ONE', fiveOne, swapped)).toEqual([
      'Slot MIDDLE_1 needs a MIDDLE_BLOCKER but player 5 is a OPPOSITE',
    ]);
  });
});
