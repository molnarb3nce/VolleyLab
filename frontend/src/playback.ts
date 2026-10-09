import { useCallback, useEffect, useRef, useState } from 'react';
import { CourtSetup, Point, startingPositions, tokenKey } from './court';
import { onCourtTokenKey } from './rotation';
import { Slot, TacticStep } from './types';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const TOUCH = new Set(['RECEIVE', 'SET', 'ATTACK', 'BLOCK']);

/** After an attack the ball continues to the other side of the net (unless a block follows). */
function overNet(from: Point): Point {
  return from.y >= 9 ? { x: from.x, y: 6 } : { x: from.x, y: 12 };
}

function actorFor(step: TacticStep, setup: CourtSetup): string {
  return step.actorSide === 'OWN' && step.slot
    ? onCourtTokenKey(
        'OWN',
        step.slot as Slot,
        setup.ownFormation,
        setup.rotation,
        setup.liberoReplaces,
      )
    : tokenKey(step.actorSide, step.slot);
}

/** Consecutive steps with `parallelWithPrevious` join the same playback batch. */
export function stepBatches(steps: TacticStep[]): number[][] {
  const batches: number[][] = [];
  for (let i = 0; i < steps.length; i++) {
    if (i > 0 && steps[i].parallelWithPrevious) batches[batches.length - 1].push(i);
    else batches.push([i]);
  }
  return batches;
}

/**
 * Replays a play from the saved base positions.
 *
 * Contact steps (receive / set / attack / block) move the player from their
 * current spot (base, until they have acted) to the step position, and at the
 * same time fly the ball there. `delay` is tempo: the player waits that many
 * ms, then runs so they arrive when the ball does. After an attack the ball
 * continues across the net, unless the next step is a block.
 *
 * Steps marked “with previous” run in the same batch (in parallel).
 */
export function usePlayback(setup: CourtSetup, steps: TacticStep[], base: Record<string, Point> = {}) {
  const initial = useCallback(() => startingPositions(setup, base), [setup, base]);
  const [positions, setPositions] = useState<Record<string, Point>>(initial);
  const [transitions, setTransitions] = useState<Record<string, number>>({});
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const runId = useRef(0);

  const reset = useCallback(() => {
    runId.current++;
    setPlaying(false);
    setActiveStep(null);
    setTransitions({});
    setPositions(initial());
  }, [initial]);

  useEffect(reset, [reset]);

  const play = async () => {
    const id = ++runId.current;
    const still = () => runId.current === id;
    setPositions(initial());
    setTransitions({});
    setActiveStep(null);
    setPlaying(true);
    await sleep(80);
    if (!still()) return;

    const batches = stepBatches(steps);

    for (const batch of batches) {
      if (!still()) return;
      setActiveStep(batch[0]);

      const trans: Record<string, number> = {};
      let ballDest: Point | undefined;

      type Move = { actor: string; dest: Point; delay: number; playerMs: number; ballOnly: boolean };
      const moves: Move[] = [];

      for (const index of batch) {
        const step = steps[index];
        const dest = { x: step.x, y: step.y };
        const duration = step.duration;
        const delay = Math.min(step.delay ?? 0, duration);
        const playerMs = Math.max(0, duration - delay);
        const isTouch = step.actorSide !== 'BALL' && TOUCH.has(step.action);

        if (step.actorSide === 'BALL') {
          trans.BALL = duration;
          ballDest = dest;
          moves.push({ actor: 'BALL', dest, delay: 0, playerMs: duration, ballOnly: true });
          continue;
        }

        const actor = actorFor(step, setup);
        trans[actor] = playerMs;
        if (isTouch) {
          trans.BALL = Math.max(trans.BALL ?? 0, duration);
          ballDest = dest;
        }
        moves.push({ actor, dest, delay, playerMs, ballOnly: false });
      }

      setTransitions(trans);
      if (ballDest) setPositions((p) => ({ ...p, BALL: ballDest! }));

      await Promise.all(
        moves.map(async (m) => {
          if (m.ballOnly) {
            setPositions((p) => ({ ...p, BALL: m.dest }));
            await sleep(m.playerMs + 80);
            return;
          }
          if (m.delay > 0) {
            await sleep(m.delay);
            if (!still()) return;
          }
          setPositions((p) => ({ ...p, [m.actor]: m.dest }));
          await sleep(m.playerMs + 80);
        }),
      );
      if (!still()) return;

      for (const index of batch) {
        const step = steps[index];
        const next = steps[index + 1];
        if (step.action !== 'ATTACK' || next?.action === 'BLOCK' || next?.actorSide === 'BALL') continue;
        const dest = { x: step.x, y: step.y };
        setTransitions({ BALL: 700 });
        setPositions((p) => ({ ...p, BALL: overNet(dest) }));
        await sleep(780);
        if (!still()) return;
      }
    }

    if (still()) {
      setPlaying(false);
      setActiveStep(null);
    }
  };

  return { positions, transitions, activeStep, playing, play, reset };
}
