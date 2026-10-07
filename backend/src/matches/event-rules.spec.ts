import { EventAction, EventResult } from '@prisma/client';
import { ACTION_RESULTS, isValidResult } from './event-rules';

describe('event rules', () => {
  it('defines results for every action and uses every result at least once', () => {
    expect(Object.keys(ACTION_RESULTS).sort()).toEqual(Object.values(EventAction).sort());
    const used = new Set(Object.values(ACTION_RESULTS).flat());
    expect([...used].sort()).toEqual(Object.values(EventResult).sort());
  });

  it.each([
    ['SERVE', 'ACE'],
    ['RECEPTION', 'PERFECT'],
    ['ATTACK', 'KILL'],
    ['ATTACK', 'BLOCKED'],
    ['BLOCK', 'POINT'],
    ['DIG', 'POOR'],
  ] as const)('accepts %s + %s', (action, result) => {
    expect(isValidResult(action, result)).toBe(true);
  });

  it.each([
    ['RECEPTION', 'KILL'],
    ['SERVE', 'GOOD'],
    ['SET', 'ACE'],
    ['BLOCK', 'BLOCKED'],
    ['DIG', 'PERFECT'],
  ] as const)('rejects %s + %s', (action, result) => {
    expect(isValidResult(action, result)).toBe(false);
  });
});
