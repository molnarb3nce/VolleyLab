import { StepInput, validateSteps } from './tactic-rules';

const own = (overrides: Partial<StepInput> = {}): StepInput => ({
  actorSide: 'OWN',
  slot: 'SETTER_1',
  action: 'MOVE',
  ...overrides,
});

describe('validateSteps', () => {
  it('accepts a valid play', () => {
    const steps: StepInput[] = [
      own({ action: 'RECEIVE', slot: 'LIBERO' }),
      own({ action: 'SET', slot: 'SETTER_1', targetSlot: 'MIDDLE_1' }),
      own({ action: 'ATTACK', slot: 'MIDDLE_1' }),
      { actorSide: 'OPPONENT', slot: 'MIDDLE_2', action: 'BLOCK' },
      { actorSide: 'BALL', action: 'MOVE' },
    ];
    expect(validateSteps('FIVE_ONE', 'SIX_TWO', steps)).toEqual([]);
  });

  it('rejects an own slot that is not in the own formation', () => {
    expect(validateSteps('FIVE_ONE', 'FIVE_ONE', [own({ slot: 'SETTER_2' })])).toEqual([
      'Step 1: slot SETTER_2 does not exist in formation FIVE_ONE',
    ]);
  });

  it('checks opponent steps against the opponent formation', () => {
    const step: StepInput = { actorSide: 'OPPONENT', slot: 'SETTER_2', action: 'MOVE' };
    expect(validateSteps('FIVE_ONE', 'SIX_TWO', [step])).toEqual([]);
    expect(validateSteps('SIX_TWO', 'FIVE_ONE', [step])).toHaveLength(1);
  });

  it('requires a slot for player steps', () => {
    expect(validateSteps('FIVE_ONE', 'FIVE_ONE', [own({ slot: null })])).toEqual([
      'Step 1: a slot is required for OWN steps',
    ]);
  });

  describe('the ball', () => {
    it('has no slot and can only move', () => {
      const problems = validateSteps('FIVE_ONE', 'FIVE_ONE', [
        { actorSide: 'BALL', slot: 'SETTER_1', action: 'ATTACK' },
      ]);
      expect(problems).toEqual(['Step 1: the ball has no slot', 'Step 1: the ball can only MOVE']);
    });
  });

  describe('target slot', () => {
    it('is only allowed for SET steps', () => {
      expect(
        validateSteps('FIVE_ONE', 'FIVE_ONE', [own({ action: 'ATTACK', targetSlot: 'MIDDLE_1' })]),
      ).toEqual(['Step 1: only a SET step can have a target slot']);
    });

    it('must exist in the formation and differ from the acting slot', () => {
      expect(
        validateSteps('FIVE_ONE', 'FIVE_ONE', [own({ action: 'SET', targetSlot: 'SETTER_2' })]),
      ).toEqual(['Step 1: target slot SETTER_2 does not exist in formation FIVE_ONE']);
      expect(
        validateSteps('FIVE_ONE', 'FIVE_ONE', [own({ action: 'SET', targetSlot: 'SETTER_1' })]),
      ).toEqual(['Step 1: a player cannot set to the same slot']);
    });
  });

  it('reports problems with the number of the offending step', () => {
    const problems = validateSteps('FIVE_ONE', 'FIVE_ONE', [own(), own({ slot: 'SETTER_2' }), own()]);
    expect(problems).toEqual(['Step 2: slot SETTER_2 does not exist in formation FIVE_ONE']);
  });
});
