import { StepInput, validateBasePositions, validatePlay, validateSteps } from './tactic-rules';

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

describe('validateBasePositions', () => {
  it('accepts an empty object and omitted values', () => {
    expect(validateBasePositions({})).toEqual([]);
    expect(validateBasePositions(undefined)).toEqual([]);
  });

  it('accepts known token keys on the court', () => {
    expect(
      validateBasePositions({
        BALL: { x: 4.5, y: 7 },
        'OWN:LIBERO': { x: 2, y: 16 },
        'OPPONENT:MIDDLE_1': { x: 4.5, y: 3 },
      }),
    ).toEqual([]);
  });

  it('rejects unknown keys and out-of-court coordinates', () => {
    expect(validateBasePositions({ FOO: { x: 1, y: 1 } })).toEqual(['Unknown position key FOO']);
    expect(validateBasePositions({ 'OWN:LIBERO': { x: 99, y: 1 } })).toEqual([
      'OWN:LIBERO: x must be between 0 and 9',
    ]);
  });
});

describe('validatePlay', () => {
  const touch = (action: StepInput['action'], slot: StepInput['slot'], actorSide: StepInput['actorSide'] = 'OWN') =>
    ({ actorSide, slot, action }) as StepInput;

  it('accepts reception - set - attack followed by a block', () => {
    const steps = [
      touch('RECEIVE', 'LIBERO'),
      touch('SET', 'SETTER_1'),
      touch('ATTACK', 'MIDDLE_1'),
      touch('BLOCK', 'MIDDLE_2', 'OPPONENT'),
    ];
    expect(validatePlay(steps)).toEqual([]);
  });

  it('ignores MOVE steps and the ball', () => {
    const steps = [
      touch('MOVE', 'SETTER_1'),
      touch('RECEIVE', 'LIBERO'),
      { actorSide: 'BALL', action: 'MOVE' } as StepInput,
      touch('MOVE', 'MIDDLE_1'),
      touch('SET', 'SETTER_1'),
    ];
    expect(validatePlay(steps)).toEqual([]);
  });

  it('rejects a fourth touch by the same team', () => {
    const steps = [
      touch('RECEIVE', 'LIBERO'),
      touch('SET', 'SETTER_1'),
      touch('SET', 'OUTSIDE_1'),
      touch('SET', 'OUTSIDE_2'),
    ];
    expect(validatePlay(steps)).toEqual(['Step 4: a team may touch the ball at most 3 times in a row']);
  });

  it('resets the touch count when the other team touches the ball', () => {
    const steps = [
      touch('RECEIVE', 'LIBERO'),
      touch('SET', 'SETTER_1'),
      touch('SET', 'OUTSIDE_1'),
      touch('RECEIVE', 'LIBERO', 'OPPONENT'),
      touch('SET', 'SETTER_1', 'OPPONENT'),
      touch('ATTACK', 'OUTSIDE_1', 'OPPONENT'),
    ];
    expect(validatePlay(steps)).toEqual([]);
  });

  it('does not count a block as a touch', () => {
    const steps = [
      touch('SET', 'SETTER_1'),
      touch('ATTACK', 'OUTSIDE_1'),
      touch('BLOCK', 'MIDDLE_1', 'OPPONENT'),
      // after the block the attacking team has three fresh touches
      touch('RECEIVE', 'LIBERO'),
      touch('SET', 'SETTER_1'),
      touch('ATTACK', 'OUTSIDE_2'),
    ];
    expect(validatePlay(steps)).toEqual([]);
  });

  it('rejects the same player touching twice in a row', () => {
    const steps = [touch('RECEIVE', 'LIBERO'), touch('SET', 'LIBERO')];
    expect(validatePlay(steps)).toEqual(['Step 2: the same player cannot touch the ball twice in a row']);
  });

  it('rejects a team touching the ball again after its attack', () => {
    const steps = [touch('ATTACK', 'OUTSIDE_1'), touch('SET', 'SETTER_1')];
    expect(validatePlay(steps)).toEqual([
      'Step 2: after an attack the ball is on the other side, the same team cannot touch it again',
    ]);
  });

  it('allows RECEIVE only as the first touch of a team', () => {
    expect(validatePlay([touch('SET', 'SETTER_1'), touch('RECEIVE', 'LIBERO')])).toEqual([
      'Step 2: RECEIVE must be the first touch of a team',
    ]);
  });

  describe('block', () => {
    it('must directly follow an attack of the other team', () => {
      const msg = 'Step 1: a block must directly follow an attack of the other team';
      expect(validatePlay([touch('BLOCK', 'MIDDLE_1', 'OPPONENT')])).toEqual([msg]);
      expect(
        validatePlay([touch('SET', 'SETTER_1'), touch('BLOCK', 'MIDDLE_1', 'OPPONENT')]),
      ).toEqual(['Step 2: a block must directly follow an attack of the other team']);
    });

    it('cannot be made by the attacking team itself', () => {
      expect(validatePlay([touch('ATTACK', 'OUTSIDE_1'), touch('BLOCK', 'MIDDLE_1')])).toEqual([
        'Step 2: a block must directly follow an attack of the other team',
      ]);
    });
  });

  it('forbids the libero to attack or block', () => {
    expect(validatePlay([touch('ATTACK', 'LIBERO')])).toEqual(['Step 1: the libero cannot attack or block']);
    expect(
      validatePlay([touch('ATTACK', 'OUTSIDE_1'), touch('BLOCK', 'LIBERO', 'OPPONENT')]),
    ).toEqual(['Step 2: the libero cannot attack or block']);
  });
});

