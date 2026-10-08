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

export const ACTOR_SIDE_LABEL: Record<ActorSide, string> = {
  OWN: 'Our team',
  OPPONENT: 'Opponent',
  BALL: 'Ball',
};

export const TACTIC_ACTIONS: TacticAction[] = ['MOVE', 'RECEIVE', 'SET', 'ATTACK', 'BLOCK'];

export const TACTIC_ACTION_LABEL: Record<TacticAction, string> = {
  MOVE: 'Move',
  RECEIVE: 'Receive',
  SET: 'Set',
  ATTACK: 'Attack',
  BLOCK: 'Block',
};

/** Short slot names for lists and court tokens. */
export const SLOT_SHORT: Record<string, string> = {
  SETTER_1: 'S1',
  SETTER_2: 'S2',
  OPPOSITE: 'OP',
  OUTSIDE_1: 'O1',
  OUTSIDE_2: 'O2',
  MIDDLE_1: 'M1',
  MIDDLE_2: 'M2',
  LIBERO: 'L',
};

/** Court coordinates: x 0..9, y 0..18, the net is at y = 9 (project-context.md, section 10). */
export const COURT = { width: 9, height: 18 };
