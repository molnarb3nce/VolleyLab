import { ActorSide, Formation, Slot, TacticAction } from '@prisma/client';
import { isSlotInFormation } from '../formations/formations';

/** Court coordinates (project-context.md, section 10): x 0..9, y 0..18. */
export const COURT = { width: 9, height: 18 } as const;
export const MAX_STEP_DURATION_MS = 10_000;
export const MAX_STEPS = 200;

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
