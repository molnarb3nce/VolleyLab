import { useCallback, useEffect, useRef, useState } from 'react';
import { CourtSetup, Point, startingPositions, tokenKey } from './court';
import { onCourtTokenKey } from './rotation';
import { Slot } from './types';
import { TacticStep } from './types';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const TOUCH = new Set(['RECEIVE', 'SET', 'ATTACK', 'BLOCK']);

/** After an attack the ball continues to the other side of the net (unless a block follows). */
function overNet(from: Point): Point {
  return from.y >= 9 ? { x: from.x, y: 6 } : { x: from.x, y: 12 };
}

/**
 * Replays a play from the saved base positions.
 *
 * Contact steps (receive / set / attack / block) move the player from their
 * current spot (base, until they have acted) to the step position, and at the
 * same time fly the ball there. `delay` is tempo: the player waits that many
 * ms, then runs so they arrive when the ball does. After an attack the ball
 * continues across the net, unless the next step is a block.
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

    for (const [index, step] of steps.entries()) {
      if (!still()) return;
      setActiveStep(index);
      const dest = { x: step.x, y: step.y };
      const duration = step.duration;
      const delay = Math.min(step.delay ?? 0, duration);
      const actor =
        step.actorSide === 'OWN' && step.slot
          ? onCourtTokenKey(
              'OWN',
              step.slot as Slot,
              setup.ownFormation,
              setup.rotation,
              setup.liberoReplaces,
            )
          : tokenKey(step.actorSide, step.slot);
      const next = steps[index + 1];
      const isTouch = step.actorSide !== 'BALL' && TOUCH.has(step.action);
      const playerMs = Math.max(0, duration - delay);

      if (step.actorSide === 'BALL') {
        setTransitions({ BALL: duration });
        setPositions((p) => ({ ...p, BALL: dest }));
        await sleep(duration + 80);
        continue;
      }

      const trans: Record<string, number> = { [actor]: playerMs };
      if (isTouch) trans.BALL = duration;
      setTransitions(trans);

      if (isTouch) setPositions((p) => ({ ...p, BALL: dest }));
      if (delay > 0) {
        await sleep(delay);
        if (!still()) return;
      }
      setPositions((p) => ({ ...p, [actor]: dest }));
      await sleep(playerMs + 80);
      if (!still()) return;

      if (step.action === 'ATTACK' && next?.action !== 'BLOCK' && next?.actorSide !== 'BALL') {
        setTransitions({ BALL: 700 });
        setPositions((p) => ({ ...p, BALL: overNet(dest) }));
        await sleep(780);
      }
    }

    if (still()) {
      setPlaying(false);
      setActiveStep(null);
    }
  };

  return { positions, transitions, activeStep, playing, play, reset };
}
