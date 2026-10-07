import { Formation } from '@prisma/client';
import { REQUIRED_SLOTS, SLOT_ROLE, isSlotInFormation } from './formations';

describe('formation templates', () => {
  const formations = Object.values(Formation);

  it.each(formations)('%s requires six distinct slots', (formation) => {
    const slots = REQUIRED_SLOTS[formation];
    expect(new Set(slots).size).toBe(6);
    expect(slots).not.toContain('LIBERO');
  });

  it('5-1 has one setter and an opposite', () => {
    const roles = REQUIRED_SLOTS.FIVE_ONE.map((slot) => SLOT_ROLE[slot]);
    expect(roles.filter((r) => r === 'SETTER')).toHaveLength(1);
    expect(roles).toContain('OPPOSITE');
  });

  it.each(['SIX_TWO', 'FOUR_TWO'] as const)('%s has two setters and no opposite', (formation) => {
    const roles = REQUIRED_SLOTS[formation].map((slot) => SLOT_ROLE[slot]);
    expect(roles.filter((r) => r === 'SETTER')).toHaveLength(2);
    expect(roles).not.toContain('OPPOSITE');
  });
});

describe('isSlotInFormation', () => {
  it('always allows the libero', () => {
    for (const formation of Object.values(Formation)) {
      expect(isSlotInFormation(formation, 'LIBERO')).toBe(true);
    }
  });

  it('rejects slots that do not belong to the formation', () => {
    expect(isSlotInFormation('FIVE_ONE', 'SETTER_2')).toBe(false);
    expect(isSlotInFormation('SIX_TWO', 'OPPOSITE')).toBe(false);
  });
});
