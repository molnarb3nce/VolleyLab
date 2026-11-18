# VolleyLab — agent rövid útmutató

**Beadás / indítás / teszt / MI / AF:** [`README.md`](README.md).

**Domén spec (fejlesztés):** [`project-context.md`](project-context.md).  
**DB / Prisma:** [`docs/database.md`](docs/database.md).

## Szabályok helye

| Terület | Fájl |
|--------|------|
| Felállás | `backend/src/formations/lineup.ts` |
| Esemény action+result | `backend/src/matches/event-rules.ts` |
| Statisztika | `backend/src/statistics/statistics.ts` |
| Taktika | `backend/src/tactics/tactic-rules.ts`, `tactics.service.ts` |
| Pálya / lejátszás | `frontend/src/court.ts`, `playback.ts` |

Court: **x 0..9, y 0..18**. Üzleti logika ne maradjon csak a controllerben. Rule változásnál unit teszt.

**Jogosultság:** csapat shared read / owner write; mérkőzés anyone read / owner write.

**Out of scope:** fizika, ML, microservices — hacsak a user mást nem kér.

Parancsok: lásd README *Indítás* és *Tesztek*.