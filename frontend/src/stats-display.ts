import { useEffect, useState } from 'react';
import { EventAction, Stats } from './types';

export const ACTION_COLORS: Record<EventAction, string> = {
  SERVE: '#818cf8',
  RECEPTION: '#22d3ee',
  SET: '#34d399',
  ATTACK: '#f472b6',
  BLOCK: '#fbbf24',
  DIG: '#a78bfa',
};

export const ACTION_LABEL: Record<EventAction, string> = {
  SERVE: 'Serve',
  RECEPTION: 'Reception',
  SET: 'Set',
  ATTACK: 'Attack',
  BLOCK: 'Block',
  DIG: 'Dig',
};

export function totalTouches(s: Stats): number {
  return (
    s.serve.attempts +
    s.reception.attempts +
    s.set.attempts +
    s.attack.attempts +
    s.block.attempts +
    s.dig.attempts
  );
}

export function attackEfficiency(s: Stats): number {
  if (s.attack.attempts === 0) return 0;
  return Math.round((s.attack.kills / s.attack.attempts) * 100);
}

export function receptionPositiveRate(s: Stats): number {
  const att = s.reception.attempts;
  if (att === 0) return 0;
  return Math.round(((s.reception.perfect + s.reception.good) / att) * 100);
}

export function formatRole(role: string): string {
  return role
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

/** Count-up animation for dashboard hero numbers. */
export function useAnimatedNumber(value: number, durationMs = 900): number {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === 0) {
      setDisplay(0);
      return;
    }
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) ** 3;
      setDisplay(Math.round(value * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs]);
  return display;
}
