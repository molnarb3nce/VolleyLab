# VolleyLab

Röplabda mérkőzés-statisztika és taktikai szimulátor — BME *Szoftverfejlesztés MI támogatással* házi feladat.

Stack: **NestJS + Prisma + PostgreSQL**, **React + Vite + MUI**.

A Moodle-be beadott rövid spec: **VolleyLab** (8 elfogadási feltétel).  
Fejlesztői részletes spec (nem kötelező beadás): [`project-context.md`](project-context.md).  
Adatbázis / séma / migráció: [`docs/database.md`](docs/database.md).  
MI / agent: [`AGENTS.md`](AGENTS.md), [`.cursor/rules/volleylab.mdc`](.cursor/rules/volleylab.mdc).

---

## Indítás

```bash
docker compose up -d
```

**Backend**

```bash
cd backend
copy .env.example .env
npm install
npx prisma migrate deploy
npx prisma db seed
npm run start:dev
```

API: `http://localhost:3000` — Swagger: `/api/docs`

**Frontend**

```bash
cd frontend
copy .env.example .env
npm install
npm run dev
```

UI: `http://localhost:5173` — `VITE_API_URL` = backend URL.

**Demo (seed):** `coach@volleylab.local` / `rival@volleylab.local`, jelszó `password123`.

**Deploy:** Railway — `backend/railway.toml`, `frontend/railway.toml` (compose csak helyi DB).

---

## Tesztek

```bash
cd backend
npm test              # unit — Postgres nélkül
npm run test:e2e      # integráció — Postgres :5432, séma: test (lásd backend/.env.test)
```

---

## Elfogadási feltételek ↔ ellenőrzés

| # | Röviden | Ellenőrzés |
|---|---------|------------|
| 1 | Csapat, ≥6 játékos, mez, role | E2E: `teams-players.e2e-spec.ts`. Kézi: Teams → játékosok. |
| 2 | Mérkőzés, felállás, szett, mentés | E2E: `matches.e2e-spec.ts`, `sets-events.e2e-spec.ts`. |
| 3 | Esemény → stat, lezárás után összesítés | `statistics.spec.ts`, `statistics.e2e-spec.ts`; Player profile. |
| 4 | Hibás felállás elutasítva | `lineup.spec.ts`, `matches.e2e` (duplicate / missing slot). |
| 5 | Taktika 5-1 / 6-2 / 4-2, lépések | `formations.spec.ts`, `tactics.e2e-spec.ts`. |
| 6 | Animáció, ellenfél blokk | Kézi: Tactics → seed „Quick middle…” → **Play**. |
| 7 | Érvénytelen taktika | `tactic-rules.spec.ts`, validate API; pályán kívül → mentés 400; csapat választása esetén **Play** csak sikeres validate után. |
| 8 | Taktika más csapattal | `POST /tactics/:id/validate` — e2e + Auto-fill / Validate UI. |

**Rubrika (választott példák):** normál — attack kill test; határeset — blocked ≠ kill, 3 érintés `tactic-rules.spec.ts`; hibás bemenet — `event-rules.spec.ts`; regresszió — lenti változtatási igény e2e; bug demo — lentebb.

**Védés (≈2 perc):** live esemény + stat (AF3), hibás lineup (AF4); taktika Validate → Play (AF7–8).

---

## Változtatási igény (első → végleges)

**Követelmény:** Bármely user **olvashatja** a mérkőzéseket (lista, pont, lineup, stat, esemény); **módosítás** csak a tulajdonosnak.

**Kód:** `matches.service.ts` (`getMatch` vs `getOwnedMatch`), `GET /matches?mine=true`, `MatchesPage` / `MatchPage` read-only nem-tulajnak.

**Regresszió:** `npm run test:e2e -- --testPathPattern=matches.e2e` — teszt: *lists all matches but only the owner may edit*.

*Ha a Moodle-ben más a pontos szöveg, a védésen azt mondd — a kód a fenti viselkedést valósítja.*

**Egyéb végleges:** taktika validate kapu a Play-nél (`TacticEditorPage.tsx`); quick match (localStorage); mobil UI; több seed taktika.

---

## MI — három döntési eset

Eszköz: **Cursor** (agent/chat). Fázisok: követelmény, implementáció, tesztelés.

### 1. Követelmény — taktika lépések slot-ban, nem player id-ben

**Probléma:** Két middle slot; role önmagában nem elég.  
**MI javaslat:** `TacticStep.slot` + validate-nél `assignments` map.  
**Döntés:** Elfogadva; közös `validateLineup` (`formations/lineup.ts`).  
**Ellenőrzés:** `tactics.e2e-spec.ts`, `TacticEditorPage.tsx`.

### 2. Implementáció — attack kill számolás

**Probléma:** Csak `ATTACK` + `KILL` lehet kill.  
**Döntés:** Elfogadva — `backend/src/statistics/statistics.ts`, `statistics.spec.ts`.  
**Ellenőrzés:** buggy/javított futás → [`docs/evidence/stats-buggy.txt`](docs/evidence/stats-buggy.txt), [`docs/evidence/stats-fixed.txt`](docs/evidence/stats-fixed.txt).

### 3. Tesztelés — taktika possession szabályok

**Probléma:** max 3 érintés, libero, blokk után új labda.  
**Döntés:** `validatePlay` a validate endpointon; mentés = court/step; play szabály + UI kapu.  
**Ellenőrzés:** `tactic-rules.spec.ts`, `TacticEditorPage.tsx`.

---

## Teszt hibafeltárás (szándékos bug)

Szabály: csak `ATTACK` + `KILL` növeli a killt (`statistics.ts`).

**Hibás sor (demo):** `if (result !== 'ERROR') s.attack.kills++;`  
Futtatás: `cd backend && npx jest src/statistics` → 3 bukó teszt — teljes kimenet: `docs/evidence/stats-buggy.txt`.

**Javítás:** `if (result === 'KILL') s.attack.kills++;`  
→ 11/11 — `docs/evidence/stats-fixed.txt`.

*(Demonstrációs, nem valós fejlesztési hiba.)*