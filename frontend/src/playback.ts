import { useCallback, useEffect, useRef, useState } from 'react';
import { Point, startPositions, tokenKey } from './court';
import { Formation, FormationsInfo, TacticStep } from './types';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Replays the steps one after another: each step moves its token to (x, y)
 * over `duration` ms (CSS transition on the court tokens). Deterministic, no physics.
 */
export function usePlayback(
  info: FormationsInfo | undefined,
  own: Formation,
  opponent: Formation,
  steps: TacticStep[],
) {
  const initial = useCallback(
    () => (info ? startPositions(info, own, opponent) : {}),
    [info, own, opponent],
  );
  const [positions, setPositions] = useState<Record<string, Point>>(initial);
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [transitionMs, setTransitionMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const runId = useRef(0); // lets a newer run / reset cancel the running one

  const reset = useCallback(() => {
    runId.current++;
    setPlaying(false);
    setActiveStep(null);
    setTransitionMs(0);
    setPositions(initial());
  }, [initial]);

  useEffect(reset, [reset]);

  const play = async () => {
    const id = ++runId.current;
    setPositions(initial());
    setTransitionMs(0);
    setPlaying(true);
    await sleep(100); // let the court jump back to the start positions first

    for (const [index, step] of steps.entries()) {
      if (runId.current !== id) return;
      setActiveStep(index);
      setTransitionMs(step.duration);
      setPositions((p) => ({ ...p, [tokenKey(step.actorSide, step.slot)]: { x: step.x, y: step.y } }));
      await sleep(step.duration + 150);
    }
    if (runId.current === id) {
      setPlaying(false);
      setActiveStep(null);
    }
  };

  return { positions, activeStep, transitionMs, playing, play, reset };
}
