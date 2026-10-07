# Bug / fix demonstration: attack kills

Requirement: show a test that fails for a buggy implementation and passes for the corrected one
(`project-context.md`, section 15). The business rule is in section 11: *only* `ATTACK` + `KILL`
counts as an attack kill.

Code under test: `backend/src/statistics/statistics.ts` (`computeStats`).
Tests: `backend/src/statistics/statistics.spec.ts`.

## Buggy implementation

```ts
case 'ATTACK':
  s.attack.attempts++;
  if (result !== 'ERROR') s.attack.kills++;   // BUG: every non-error attack is a "kill"
  if (result === 'BLOCKED') s.attack.blocked++;
  if (result === 'ERROR') s.attack.errors++;
  break;
```

Command: `cd backend && npx jest src/statistics`
Full output: [`evidence/stats-buggy.txt`](evidence/stats-buggy.txt)

```text
  computeStats
    √ returns zeros without events
    ...
    × aggregates many events (for example from several sets)
    attack
      √ counts an attack kill as an attempt and a kill
      √ counts an attack error as an attempt and an error, not as a kill
      × counts a blocked attack as an attempt and blocked, not as a kill
      × counts a ball kept in play only as an attempt
      √ does not count other actions as attack kills

    -   "kills": 0,
    +   "kills": 1,

Tests:       3 failed, 8 passed, 11 total
```

A blocked attack and an attack that stays in play were wrongly counted as kills. The existing
"kill" and "error" tests still passed, which is why the bug is easy to miss without the extra cases.

## Corrected implementation

```ts
if (result === 'KILL') s.attack.kills++;
```

Full output: [`evidence/stats-fixed.txt`](evidence/stats-fixed.txt)

```text
Tests:       11 passed, 11 total
```

## Reproducing it

Replace the `kills` line in `computeStats` with the buggy one above, run `npx jest src/statistics`
(3 tests fail), then restore `result === 'KILL'` (all pass).
