import { TacticStep } from './types';

/** Fields the API accepts when creating or replacing steps. */
export type TacticStepPayload = Pick<
  TacticStep,
  'actorSide' | 'slot' | 'targetSlot' | 'action' | 'x' | 'y' | 'duration' | 'delay'
>;

export function normalizeStep(step: TacticStep): TacticStepPayload {
  return {
    actorSide: step.actorSide,
    slot: step.slot,
    targetSlot: step.targetSlot,
    action: step.action,
    x: step.x,
    y: step.y,
    duration: step.duration,
    delay: step.delay ?? 0,
  };
}

export function stepsEqual(a: TacticStep[], b: TacticStep[]): boolean {
  return JSON.stringify(a.map(normalizeStep)) === JSON.stringify(b.map(normalizeStep));
}
