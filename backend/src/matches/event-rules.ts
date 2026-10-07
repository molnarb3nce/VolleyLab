import { EventAction, EventResult } from '@prisma/client';

/** Which results are valid for which action (project-context.md, section 7). */
export const ACTION_RESULTS: Record<EventAction, EventResult[]> = {
  SERVE: ['ACE', 'IN_PLAY', 'ERROR'],
  RECEPTION: ['PERFECT', 'GOOD', 'POOR', 'ERROR'],
  SET: ['GOOD', 'POOR', 'ERROR'],
  ATTACK: ['KILL', 'IN_PLAY', 'BLOCKED', 'ERROR'],
  BLOCK: ['POINT', 'TOUCH', 'ERROR'],
  DIG: ['GOOD', 'POOR', 'ERROR'],
};

export const isValidResult = (action: EventAction, result: EventResult): boolean =>
  ACTION_RESULTS[action].includes(result);
