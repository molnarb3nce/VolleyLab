export const QUICK_MATCH_STORAGE_KEY = 'volleylab.quickMatch.v1';

export type QuickMatchSet = {
  homeScore: number;
  awayScore: number;
  finished: boolean;
};

export type QuickMatchState = {
  homeName: string;
  awayName: string;
  sets: QuickMatchSet[];
};

const ADJECTIVES = [
  'Thunder',
  'Neon',
  'Golden',
  'Midnight',
  'Cosmic',
  'Wild',
  'Royal',
  'Swift',
  'Iron',
  'Crystal',
  'Blazing',
  'Silent',
] as const;

const NOUNS = [
  'Spikers',
  'Aces',
  'Blockers',
  'Setters',
  'Dig Crew',
  'Net Runners',
  'Sideouts',
  'Rally Cats',
  'Volley Squad',
  'Beach Kings',
  'Line Judges',
  'Serve City',
] as const;

function pick<T extends readonly string[]>(pool: T, avoid?: string): string {
  let name: string;
  do {
    name = pool[Math.floor(Math.random() * pool.length)]!;
  } while (avoid && name === avoid && pool.length > 1);
  return name;
}

export function randomTeamName(existing?: string): string {
  return `${pick(ADJECTIVES)} ${pick(NOUNS, existing?.split(' ')[1])}`;
}

export function randomTeamPair(): [string, string] {
  const home = randomTeamName();
  let away = randomTeamName();
  while (away === home) away = randomTeamName();
  return [home, away];
}

export function createInitialQuickMatch(): QuickMatchState {
  const [homeName, awayName] = randomTeamPair();
  return {
    homeName,
    awayName,
    sets: [{ homeScore: 0, awayScore: 0, finished: false }],
  };
}

function isValidSet(s: unknown): s is QuickMatchSet {
  if (!s || typeof s !== 'object') return false;
  const o = s as QuickMatchSet;
  return (
    typeof o.homeScore === 'number' &&
    typeof o.awayScore === 'number' &&
    typeof o.finished === 'boolean' &&
    o.homeScore >= 0 &&
    o.awayScore >= 0
  );
}

export function loadQuickMatch(): QuickMatchState {
  try {
    const raw = localStorage.getItem(QUICK_MATCH_STORAGE_KEY);
    if (!raw) return createInitialQuickMatch();
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return createInitialQuickMatch();
    const o = parsed as QuickMatchState;
    if (typeof o.homeName !== 'string' || typeof o.awayName !== 'string' || !Array.isArray(o.sets)) {
      return createInitialQuickMatch();
    }
    if (!o.sets.every(isValidSet) || o.sets.length === 0) return createInitialQuickMatch();
    const open = o.sets.filter((s) => !s.finished);
    if (open.length !== 1) {
      const finished = o.sets.filter((s) => s.finished);
      return {
        homeName: o.homeName,
        awayName: o.awayName,
        sets: [...finished, { homeScore: 0, awayScore: 0, finished: false }],
      };
    }
    return o;
  } catch {
    return createInitialQuickMatch();
  }
}

export function saveQuickMatch(state: QuickMatchState): void {
  localStorage.setItem(QUICK_MATCH_STORAGE_KEY, JSON.stringify(state));
}

export function countSetsWon(state: QuickMatchState): { home: number; away: number } {
  let home = 0;
  let away = 0;
  for (const set of state.sets) {
    if (!set.finished) continue;
    if (set.homeScore > set.awayScore) home += 1;
    else if (set.awayScore > set.homeScore) away += 1;
  }
  return { home, away };
}

export function activeSetIndex(state: QuickMatchState): number {
  const idx = state.sets.findIndex((s) => !s.finished);
  return idx >= 0 ? idx : state.sets.length - 1;
}

export function activeSet(state: QuickMatchState): QuickMatchSet {
  return state.sets[activeSetIndex(state)]!;
}

export function setNumber(state: QuickMatchState): number {
  return activeSetIndex(state) + 1;
}

export function bumpScore(state: QuickMatchState, side: 'home' | 'away', delta: 1 | -1): QuickMatchState {
  const idx = activeSetIndex(state);
  const set = state.sets[idx]!;
  if (set.finished) return state;
  const field = side === 'home' ? 'homeScore' : 'awayScore';
  const next = Math.max(0, set[field] + delta);
  if (next === set[field]) return state;
  const sets = state.sets.slice();
  sets[idx] = { ...set, [field]: next };
  return { ...state, sets };
}

export function finishActiveSet(state: QuickMatchState): QuickMatchState | 'tie' {
  const idx = activeSetIndex(state);
  const set = state.sets[idx]!;
  if (set.finished) return state;
  if (set.homeScore === set.awayScore) return 'tie';
  const sets = state.sets.slice();
  sets[idx] = { ...set, finished: true };
  sets.push({ homeScore: 0, awayScore: 0, finished: false });
  return { ...state, sets };
}

export function reopenLastFinishedSet(state: QuickMatchState): QuickMatchState {
  const openIdx = state.sets.findIndex((s) => !s.finished);
  if (openIdx < 0) return state;
  const open = state.sets[openIdx]!;
  if (open.homeScore > 0 || open.awayScore > 0) return state;
  if (openIdx === 0) return state;
  const sets = state.sets.slice(0, openIdx);
  const last = sets[sets.length - 1];
  if (!last?.finished) return state;
  sets[sets.length - 1] = { ...last, finished: false };
  return { ...state, sets };
}

export function renameTeam(state: QuickMatchState, side: 'home' | 'away', name: string): QuickMatchState {
  const trimmed = name.trim();
  if (!trimmed) return state;
  return side === 'home' ? { ...state, homeName: trimmed } : { ...state, awayName: trimmed };
}

export function rerollNames(state: QuickMatchState): QuickMatchState {
  const [homeName, awayName] = randomTeamPair();
  return { ...state, homeName, awayName };
}
