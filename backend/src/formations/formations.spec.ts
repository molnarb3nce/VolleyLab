import {
  FORMATIONS,
  FORMATION_TEMPLATES,
  SLOTS,
  SLOT_ROLE,
  getAllSlots,
  getRequiredRoleCounts,
  isSlotInFormation,
  isSlotRequired,
} from './formations';

describe('formation templates', () => {
  it('defines a template for every formation', () => {
    for (const formation of FORMATIONS) {
      expect(FORMATION_TEMPLATES[formation]).toBeDefined();
    }
  });

  it('5-1 has exactly the expected required slots', () => {
    expect(FORMATION_TEMPLATES.FIVE_ONE.requiredSlots).toEqual([
      'SETTER_1',
      'OPPOSITE',
      'OUTSIDE_1',
      'OUTSIDE_2',
      'MIDDLE_1',
      'MIDDLE_2',
    ]);
  });

  it.each(['SIX_TWO', 'FOUR_TWO'] as const)('%s has two setters and no opposite', (formation) => {
    const slots = FORMATION_TEMPLATES[formation].requiredSlots;
    expect(slots).toContain('SETTER_1');
    expect(slots).toContain('SETTER_2');
    expect(slots).not.toContain('OPPOSITE');
  });

  it.each(FORMATIONS)('%s requires exactly six players', (formation) => {
    expect(FORMATION_TEMPLATES[formation].requiredSlots).toHaveLength(6);
  });

  it.each(FORMATIONS)('%s has no duplicate slots', (formation) => {
    const slots = getAllSlots(formation);
    expect(new Set(slots).size).toBe(slots.length);
  });
});

describe('libero slot', () => {
  it.each(FORMATIONS)('is optional in %s', (formation) => {
    expect(isSlotInFormation(formation, 'LIBERO')).toBe(true);
    expect(isSlotRequired(formation, 'LIBERO')).toBe(false);
    expect(FORMATION_TEMPLATES[formation].optionalSlots).toEqual(['LIBERO']);
  });
});

describe('slot membership', () => {
  it('rejects slots that do not belong to the formation', () => {
    expect(isSlotInFormation('FIVE_ONE', 'SETTER_2')).toBe(false);
    expect(isSlotInFormation('SIX_TWO', 'OPPOSITE')).toBe(false);
  });

  it('marks required slots as required', () => {
    expect(isSlotRequired('FIVE_ONE', 'SETTER_1')).toBe(true);
  });
});

describe('slot roles', () => {
  it('maps every slot to a player role', () => {
    for (const slot of SLOTS) {
      expect(SLOT_ROLE[slot]).toBeDefined();
    }
  });

  it('gives the two middle blockers the same role but different slots', () => {
    expect(SLOT_ROLE.MIDDLE_1).toBe(SLOT_ROLE.MIDDLE_2);
    expect(FORMATION_TEMPLATES.FIVE_ONE.requiredSlots).toEqual(
      expect.arrayContaining(['MIDDLE_1', 'MIDDLE_2']),
    );
  });
});

describe('getRequiredRoleCounts', () => {
  it('5-1 needs 1 setter, 1 opposite, 2 outside hitters and 2 middle blockers', () => {
    expect(getRequiredRoleCounts('FIVE_ONE')).toEqual({
      SETTER: 1,
      OPPOSITE: 1,
      OUTSIDE_HITTER: 2,
      MIDDLE_BLOCKER: 2,
    });
  });

  it('6-2 needs 2 setters, 2 outside hitters and 2 middle blockers', () => {
    expect(getRequiredRoleCounts('SIX_TWO')).toEqual({
      SETTER: 2,
      OUTSIDE_HITTER: 2,
      MIDDLE_BLOCKER: 2,
    });
  });

  it('does not require a libero', () => {
    for (const formation of FORMATIONS) {
      expect(getRequiredRoleCounts(formation).LIBERO).toBeUndefined();
    }
  });
});
