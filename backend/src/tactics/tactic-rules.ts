import { ActorSide, Formation, Slot, TacticAction } from '@prisma/client';
import { isSlotInFormation } from '../formations/formations';

/** Court coordinates (project-context.md, section 10): x 0..9, y 0..18. */
export const COURT = { width: 9, height: 18 } as const;
export const MAX_STEP_DURATION_MS = 10_000;
export const MAX_STEPS = 200;

const SLOTS = new Set<string>(Object.values(Slot));

/**
 * Starting positions keyed like the frontend tokens: `BALL`, `OWN:LIBERO`,
 * `OPPONENT:MIDDLE_1`. Missing keys fall back to the formation defaults.
 */
export function validateBasePositions(value: unknown): string[] {
  if (value == null) return [];
  if (typeof value !== 'object' || Array.isArray(value)) {
    return ['basePositions must be an object of token keys to {x, y}'];
  }

  const problems: string[] = [];
  for (const [key, point] of Object.entries(value as Record<string, unknown>)) {
    if (key !== 'BALL') {
      const [side, slot, extra] = key.split(':');
      if (extra || (side !== 'OWN' && side !== 'OPPONENT') || !slot || !SLOTS.has(slot)) {
        problems.push(`Unknown position key ${key}`);
        continue;
      }
    }
    if (!point || typeof point !== 'object' || Array.isArray(point)) {
      problems.push(`${key}: expected {x, y}`);
      continue;
    }
    const { x, y, ...rest } = point as Record<string, unknown>;
    if (Object.keys(rest).length > 0) problems.push(`${key}: unknown properties`);
    if (typeof x !== 'number' || x < 0 || x > COURT.width) {
      problems.push(`${key}: x must be between 0 and ${COURT.width}`);
    }
    if (typeof y !== 'number' || y < 0 || y > COURT.height) {
      problems.push(`${key}: y must be between 0 and ${COURT.height}`);
    }
  }
  return problems;
}

export interface StepInput {
  actorSide: ActorSide;
  slot?: Slot | null;
  targetSlot?: Slot | null;
  action: TacticAction;
}

/**
 * Cross-field rules for the steps of a tactic; returns human-readable problems
 * (empty = valid). Value ranges (court, duration) are checked by the DTO.
 * Steps are numbered by their position, so the sequence is valid by construction.
 */
export function validateSteps(
  ownFormation: Formation,
  opponentFormation: Formation,
  steps: StepInput[],
): string[] {
  const problems: string[] = [];

  steps.forEach((step, index) => {
    const label = `Step ${index + 1}`;

    if (step.actorSide === 'BALL') {
      if (step.slot) problems.push(`${label}: the ball has no slot`);
      if (step.targetSlot) problems.push(`${label}: the ball has no target slot`);
      if (step.action !== 'MOVE') problems.push(`${label}: the ball can only MOVE`);
      return;
    }

    const formation = step.actorSide === 'OWN' ? ownFormation : opponentFormation;
    if (!step.slot) {
      problems.push(`${label}: a slot is required for ${step.actorSide} steps`);
    } else if (!isSlotInFormation(formation, step.slot)) {
      problems.push(`${label}: slot ${step.slot} does not exist in formation ${formation}`);
    }

    if (step.targetSlot) {
      if (step.action !== 'SET') {
        problems.push(`${label}: only a SET step can have a target slot`);
      } else if (!isSlotInFormation(formation, step.targetSlot)) {
        problems.push(`${label}: target slot ${step.targetSlot} does not exist in formation ${formation}`);
      } else if (step.targetSlot === step.slot) {
        problems.push(`${label}: a player cannot set to the same slot`);
      }
    }
  });

  return problems;
}

/** A team may touch the ball at most three times in a row (a block does not count). */
export const MAX_TEAM_TOUCHES = 3;

/**
 * Basic volleyball rules for the whole sequence, checked before a tactic is
 * simulated; returns human-readable problems (empty = playable).
 *
 * Only RECEIVE, SET and ATTACK are touches. MOVE steps and ball steps are
 * ignored. A BLOCK is not a team touch: it must directly follow an attack of
 * the other team and starts a new possession (both teams get three fresh touches).
 */
export function validatePlay(steps: StepInput[]): string[] {
  const problems: string[] = [];
  let last: { side: ActorSide; slot?: Slot | null; action: TacticAction } | null = null;
  let touches = 0; // touches of the team that touched the ball last

  steps.forEach((step, index) => {
    const label = `Step ${index + 1}`;
    if (step.actorSide === 'BALL' || step.action === 'MOVE') return;

    if (step.slot === 'LIBERO' && (step.action === 'ATTACK' || step.action === 'BLOCK')) {
      problems.push(`${label}: the libero cannot attack or block`);
    }

    if (step.action === 'BLOCK') {
      if (!last || last.action !== 'ATTACK' || last.side === step.actorSide) {
        problems.push(`${label}: a block must directly follow an attack of the other team`);
      }
      last = null;
      touches = 0;
      return;
    }

    if (last && last.side !== step.actorSide) touches = 0; // the other team now has the ball
    const firstTouch = touches === 0;
    touches++;

    if (step.action === 'RECEIVE' && !firstTouch) {
      problems.push(`${label}: RECEIVE must be the first touch of a team`);
    }
    if (touches > MAX_TEAM_TOUCHES) {
      problems.push(`${label}: a team may touch the ball at most ${MAX_TEAM_TOUCHES} times in a row`);
    }
    if (last && last.side === step.actorSide) {
      if (last.action === 'ATTACK') {
        problems.push(`${label}: after an attack the ball is on the other side, the same team cannot touch it again`);
      } else if (last.slot === step.slot) {
        problems.push(`${label}: the same player cannot touch the ball twice in a row`);
      }
    }
    last = { side: step.actorSide, slot: step.slot, action: step.action };
  });

  return problems;
}
