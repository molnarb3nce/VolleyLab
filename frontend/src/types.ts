export type Formation = 'FIVE_ONE' | 'SIX_TWO' | 'FOUR_TWO';
export type Role = 'SETTER' | 'OUTSIDE_HITTER' | 'MIDDLE_BLOCKER' | 'OPPOSITE' | 'LIBERO';
export type Slot =
  | 'SETTER_1'
  | 'SETTER_2'
  | 'OPPOSITE'
  | 'OUTSIDE_1'
  | 'OUTSIDE_2'
  | 'MIDDLE_1'
  | 'MIDDLE_2'
  | 'LIBERO';
export type EventAction = 'SERVE' | 'RECEPTION' | 'SET' | 'ATTACK' | 'BLOCK' | 'DIG';
export type EventResult =
  | 'ACE'
  | 'IN_PLAY'
  | 'ERROR'
  | 'PERFECT'
  | 'GOOD'
  | 'POOR'
  | 'KILL'
  | 'BLOCKED'
  | 'POINT'
  | 'TOUCH';
export type ActorSide = 'OWN' | 'OPPONENT' | 'BALL';
export type TacticAction = 'MOVE' | 'RECEIVE' | 'SET' | 'ATTACK' | 'BLOCK';
export type MatchStatus = 'PLANNED' | 'IN_PROGRESS' | 'FINISHED';
export type Side = 'HOME' | 'AWAY';

export interface Player {
  id: number;
  teamId: number;
  name: string;
  jerseyNumber: number;
  role: Role;
  isActive: boolean;
}

export interface Team {
  id: number;
  ownerId: number;
  name: string;
  players?: Player[];
  _count?: { players: number };
}

export interface MatchTeam {
  id: number;
  teamId: number;
  side: Side;
  formation: Formation;
  team: { id: number; name: string };
  lineup: { slot: Slot; playerId: number; player: Player }[];
}

export interface MatchSet {
  id: number;
  setNumber: number;
  homeScore: number;
  awayScore: number;
  status: 'IN_PROGRESS' | 'FINISHED';
}

export interface Match {
  id: number;
  status: MatchStatus;
  playedAt: string;
  teams: MatchTeam[];
  sets: MatchSet[];
}

export interface MatchEvent {
  id: number;
  setId: number;
  playerId: number;
  action: EventAction;
  result: EventResult;
  player: { id: number; name: string; jerseyNumber: number; teamId: number };
}

export interface Stats {
  serve: { attempts: number; aces: number; errors: number };
  reception: { attempts: number; perfect: number; good: number; poor: number; errors: number };
  set: { attempts: number; good: number; poor: number; errors: number };
  attack: { attempts: number; kills: number; blocked: number; errors: number };
  block: { attempts: number; points: number; touches: number; errors: number };
  dig: { attempts: number; good: number; poor: number; errors: number };
}

export interface MatchStatistics {
  teams: { side: Side; teamId: number; name: string; stats: Stats }[];
  players: { playerId: number; teamId: number; name: string; jerseyNumber: number; stats: Stats }[];
}

export interface PlayerStatistics {
  playerId: number;
  name: string;
  jerseyNumber: number;
  role: Role;
  teamId: number;
  teamName: string;
  isActive: boolean;
  matches: number;
  stats: Stats;
}

export interface StatisticsOverview {
  totalEvents: number;
  matchesWithEvents: number;
  stats: Stats;
  byAction: { action: EventAction; count: number }[];
  topAttackers: {
    playerId: number;
    teamId: number;
    name: string;
    jerseyNumber: number;
    kills: number;
    attempts: number;
  }[];
  recentMatches: { matchId: number; label: string; eventCount: number; playedAt: string }[];
}

export interface TacticStep {
  actorSide: ActorSide;
  slot: Slot | null;
  targetSlot: Slot | null;
  action: TacticAction;
  x: number;
  y: number;
  duration: number;
  /** Tempo: ms the player waits before running. The ball flies for `duration`. */
  delay: number;
  /** When true, this step runs at the same time as the step above it in preview playback. */
  parallelWithPrevious?: boolean;
}

export interface TacticStepFromApi extends TacticStep {
  id?: number;
  tacticId?: number;
  stepNumber?: number;
}

export interface Tactic {
  id: number;
  name: string;
  description: string | null;
  formation: Formation;
  opponentFormation: Formation;
  rotation: number;
  opponentRotation: number;
  /** Back-row slot the libero replaces; null if libero is not used on court. */
  liberoReplaces: Slot | null;
  /** Starting positions keyed `OWN:LIBERO`, `BALL`, … Missing slots use the defaults. */
  basePositions: Record<string, { x: number; y: number }>;
  steps: TacticStepFromApi[];
  _count?: { steps: number };
}

export interface FormationsInfo {
  formations: { name: Formation; requiredSlots: Slot[]; optionalSlots: Slot[] }[];
  slotRoles: Record<Slot, Role>;
}
