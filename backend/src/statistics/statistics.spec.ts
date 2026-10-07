import { EventAction, EventResult } from '@prisma/client';
import { computeStats, emptyStats } from './statistics';

const ev = (action: EventAction, result: EventResult) => ({ action, result });

describe('computeStats', () => {
  it('returns zeros without events', () => {
    expect(computeStats([])).toEqual(emptyStats());
  });

  describe('attack', () => {
    it('counts an attack kill as an attempt and a kill', () => {
      const { attack } = computeStats([ev('ATTACK', 'KILL')]);
      expect(attack).toEqual({ attempts: 1, kills: 1, blocked: 0, errors: 0 });
    });

    it('counts an attack error as an attempt and an error, not as a kill', () => {
      const { attack } = computeStats([ev('ATTACK', 'ERROR')]);
      expect(attack).toEqual({ attempts: 1, kills: 0, blocked: 0, errors: 1 });
    });

    it('counts a blocked attack as an attempt and blocked, not as a kill', () => {
      const { attack } = computeStats([ev('ATTACK', 'BLOCKED')]);
      expect(attack).toEqual({ attempts: 1, kills: 0, blocked: 1, errors: 0 });
    });

    it('counts a ball kept in play only as an attempt', () => {
      const { attack } = computeStats([ev('ATTACK', 'IN_PLAY')]);
      expect(attack).toEqual({ attempts: 1, kills: 0, blocked: 0, errors: 0 });
    });

    it('does not count other actions as attack kills', () => {
      const stats = computeStats([ev('RECEPTION', 'GOOD'), ev('SET', 'GOOD'), ev('DIG', 'GOOD')]);
      expect(stats.attack).toEqual(emptyStats().attack);
    });
  });

  it('counts a reception error as an attempt and an error', () => {
    const { reception } = computeStats([ev('RECEPTION', 'ERROR')]);
    expect(reception).toEqual({ attempts: 1, perfect: 0, good: 0, poor: 0, errors: 1 });
  });

  it('counts aces and serve errors', () => {
    const { serve } = computeStats([ev('SERVE', 'ACE'), ev('SERVE', 'IN_PLAY'), ev('SERVE', 'ERROR')]);
    expect(serve).toEqual({ attempts: 3, aces: 1, errors: 1 });
  });

  it('counts block points, touches and errors', () => {
    const { block } = computeStats([ev('BLOCK', 'POINT'), ev('BLOCK', 'TOUCH'), ev('BLOCK', 'ERROR')]);
    expect(block).toEqual({ attempts: 3, points: 1, touches: 1, errors: 1 });
  });

  it('counts reception quality, sets and digs', () => {
    const stats = computeStats([
      ev('RECEPTION', 'PERFECT'),
      ev('RECEPTION', 'GOOD'),
      ev('RECEPTION', 'POOR'),
      ev('SET', 'GOOD'),
      ev('SET', 'ERROR'),
      ev('DIG', 'POOR'),
    ]);
    expect(stats.reception).toEqual({ attempts: 3, perfect: 1, good: 1, poor: 1, errors: 0 });
    expect(stats.set).toEqual({ attempts: 2, good: 1, poor: 0, errors: 1 });
    expect(stats.dig).toEqual({ attempts: 1, good: 0, poor: 1, errors: 0 });
  });

  it('aggregates many events (for example from several sets)', () => {
    const set1 = [ev('ATTACK', 'KILL'), ev('ATTACK', 'ERROR')];
    const set2 = [ev('ATTACK', 'KILL'), ev('ATTACK', 'BLOCKED'), ev('ATTACK', 'IN_PLAY')];
    expect(computeStats([...set1, ...set2]).attack).toEqual({
      attempts: 5,
      kills: 2,
      blocked: 1,
      errors: 1,
    });
  });
});
