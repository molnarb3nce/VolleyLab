import { ActorSide, EventAction, EventResult, Formation, Role, TacticAction } from './types';

export const FORMATION_LABEL: Record<Formation, string> = {
  FIVE_ONE: '5-1',
  SIX_TWO: '6-2',
  FOUR_TWO: '4-2',
};
export const FORMATIONS = Object.keys(FORMATION_LABEL) as Formation[];

export const ROLES: Role[] = ['SETTER', 'OUTSIDE_HITTER', 'MIDDLE_BLOCKER', 'OPPOSITE', 'LIBERO'];

/** Mirrors the backend rule table (backend/src/matches/event-rules.ts). */
export const ACTION_RESULTS: Record<EventAction, EventResult[]> = {
  SERVE: ['ACE', 'IN_PLAY', 'ERROR'],
  RECEPTION: ['PERFECT', 'GOOD', 'POOR', 'ERROR'],
  SET: ['GOOD', 'POOR', 'ERROR'],
  ATTACK: ['KILL', 'IN_PLAY', 'BLOCKED', 'ERROR'],
  BLOCK: ['POINT', 'TOUCH', 'ERROR'],
  DIG: ['GOOD', 'POOR', 'ERROR'],
};
export const EVENT_ACTIONS = Object.keys(ACTION_RESULTS) as EventAction[];

export const ACTOR_SIDES: ActorSide[] = ['OWN', 'OPPONENT', 'BALL'];
export const TACTIC_ACTIONS: TacticAction[] = ['MOVE', 'RECEIVE', 'SET', 'ATTACK', 'BLOCK'];

/** Court coordinates: x 0..9, y 0..18, the net is at y = 9 (project-context.md, section 10). */
export const COURT = { width: 9, height: 18 };
