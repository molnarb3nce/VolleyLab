import { EventAction, EventResult } from '@prisma/client';

/** Counters derived from match events (project-context.md, sections 7 and 11). */
export interface Stats {
  serve: { attempts: number; aces: number; errors: number };
  reception: { attempts: number; perfect: number; good: number; poor: number; errors: number };
  set: { attempts: number; good: number; poor: number; errors: number };
  attack: { attempts: number; kills: number; blocked: number; errors: number };
  block: { attempts: number; points: number; touches: number; errors: number };
  dig: { attempts: number; good: number; poor: number; errors: number };
}

export const emptyStats = (): Stats => ({
  serve: { attempts: 0, aces: 0, errors: 0 },
  reception: { attempts: 0, perfect: 0, good: 0, poor: 0, errors: 0 },
  set: { attempts: 0, good: 0, poor: 0, errors: 0 },
  attack: { attempts: 0, kills: 0, blocked: 0, errors: 0 },
  block: { attempts: 0, points: 0, touches: 0, errors: 0 },
  dig: { attempts: 0, good: 0, poor: 0, errors: 0 },
});

/** Statistics are always recomputed from the stored events, never stored. */
export function computeStats(events: { action: EventAction; result: EventResult }[]): Stats {
  const s = emptyStats();
  for (const { action, result } of events) {
    switch (action) {
      case 'SERVE':
        s.serve.attempts++;
        if (result === 'ACE') s.serve.aces++;
        if (result === 'ERROR') s.serve.errors++;
        break;
      case 'RECEPTION':
        s.reception.attempts++;
        if (result === 'PERFECT') s.reception.perfect++;
        if (result === 'GOOD') s.reception.good++;
        if (result === 'POOR') s.reception.poor++;
        if (result === 'ERROR') s.reception.errors++;
        break;
      case 'SET':
        s.set.attempts++;
        if (result === 'GOOD') s.set.good++;
        if (result === 'POOR') s.set.poor++;
        if (result === 'ERROR') s.set.errors++;
        break;
      case 'ATTACK':
        s.attack.attempts++;
        if (result === 'KILL') s.attack.kills++;
        if (result === 'BLOCKED') s.attack.blocked++;
        if (result === 'ERROR') s.attack.errors++;
        break;
      case 'BLOCK':
        s.block.attempts++;
        if (result === 'POINT') s.block.points++;
        if (result === 'TOUCH') s.block.touches++;
        if (result === 'ERROR') s.block.errors++;
        break;
      case 'DIG':
        s.dig.attempts++;
        if (result === 'GOOD') s.dig.good++;
        if (result === 'POOR') s.dig.poor++;
        if (result === 'ERROR') s.dig.errors++;
        break;
    }
  }
  return s;
}
