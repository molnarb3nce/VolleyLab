# VolleyLab

A small full-stack volleyball coaching and match-analysis web application developed as a university project.

The application has two closely related but intentionally separate purposes:

1. **Match management and statistics** – record volleyball match events and derive player/match statistics from those events.
2. **Tactical simulation** – create, save, validate, and replay volleyball tactics as a sequence of discrete player/ball/opponent actions.

The application is **not** intended to predict match outcomes, perform computer vision, model real-world physics, or reproduce every official volleyball rule. The goal is a small, clean, testable application with meaningful domain/business rules.

---

## 1. Project goals

VolleyLab should allow a coach/user to:

- create and manage volleyball teams;
- add players with jersey numbers and volleyball roles;
- create and manage matches between two teams;
- record individual actions during a match;
- automatically derive useful statistics from recorded match events;
- view statistics for the current match and aggregated player statistics;
- create tactical plays in a visual volleyball-court simulator;
- define tactics as a sequence of discrete movements and volleyball actions;
- save tactics to the **user account**, not to a specific team;
- reuse a saved tactic with another team when that team has enough players of the roles required by the tactic's formation;
- reject invalid tactics and explain why they cannot be used;
- replay tactics visually in the frontend.

The application should remain small enough to be completed as a university homework project.

### Explicit non-goals

Do **not** implement these unless a later requirement explicitly calls for them:

- computer vision;
- pose estimation;
- automatic player tracking;
- wearable/sensor integration;
- real-time video analysis;
- realistic ball physics;
- AI-generated tactics;
- machine-learning prediction;
- match outcome prediction;
- microservices;
- event buses/message queues;
- CQRS/event sourcing;
- complicated authorization systems;
- every official FIVB volleyball rule.

The tactical simulator is a **rule-based visual playbook**, not a physics simulator.

---

# 2. Technology stack

## Frontend

- React
- TypeScript
- Vite
- MUI
- React Router
- a small HTTP client layer around `fetch` or Axios

## Backend

- NestJS
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT authentication
- Passport/NestJS authentication utilities
- `class-validator` / `class-transformer`
- Swagger/OpenAPI

## Testing

- Jest
- Supertest for API/integration tests
- Unit tests for important business rules

## Development/deployment

- Node.js LTS
- npm
- PostgreSQL
- Railway may be used for deployment

Do not introduce additional infrastructure without a concrete reason.

---

# 3. Architecture

Use a simple layered/module-based NestJS architecture.

```text
React + TypeScript
        |
        | HTTP / JSON
        v
+------------------------+
| NestJS Controllers     |
+------------------------+
        |
        v
+------------------------+
| Application Services   |
| / Domain logic         |
+------------------------+
        |
        v
+------------------------+
| PrismaService          |
+------------------------+
        |
        v
+------------------------+
| PostgreSQL             |
+------------------------+
```

Organize the backend primarily by feature:

```text
src/
├── auth/
├── teams/
├── matches/
├── statistics/
├── tactics/
├── formations/     (formation/slot constants, no DB access)
├── prisma/
├── common/
├── app.module.ts
└── main.ts
```

Each feature should normally contain:

controller
service
DTOs where needed
module
tests

Avoid creating a generic repository abstraction for every entity. Prisma already provides the persistence abstraction needed for this project.

The important separation is:

controllers handle HTTP;
services contain application/business rules;
Prisma handles persistence;
DTOs define API input/output contracts;
frontend handles presentation and animation.

Business rules must not be hidden inside controllers.

# 4. Core domain model

The main relationships are:

```text
User
 |
 +-- Team (readable by every user, editable only by its owner)
 |    |
 |    +-- Player
 |
 +-- Match
 |    |
 |    +-- MatchTeam (exactly two: HOME and AWAY; formation per team)
 |    |    |
 |    |    +-- MatchLineupSlot (one player per formation slot)
 |    |
 |    +-- MatchSet
 |    |
 |    +-- MatchEvent (player + action + result, belongs to a MatchSet)
 |
 +-- Tactic
      |
      +-- TacticStep
```

## User

Authentication owner.

Fields: `id`, `email` (unique), `passwordHash`, `createdAt`.

A user owns the teams, matches and tactics they create.

## Team

A reusable volleyball team.

Fields: `id`, `ownerId`, `name`, `createdAt`.

**Teams are shared read-only.** Any logged-in user can use any team in a match or in the tactical simulator (for example, user A creates teams A and B for a match, and user B may use team B against his own team C). Only the owner can edit or delete the team and its players. Matches and tactics are private to the user who created them.

## Player

A player belongs to a team.

Fields: `id`, `teamId`, `name`, `jerseyNumber`, `role`, `isActive`.

Player roles (permanent): `SETTER`, `OUTSIDE_HITTER`, `MIDDLE_BLOCKER`, `OPPOSITE`, `LIBERO`.

A player's permanent role must not be confused with the formation slot they occupy in a match or tactic. Do not store current tactical coordinates on the Player entity.

# 5. Formations and slots

A **formation** (strategy) is a fixed template of position **slots**. Formations are constants in code (`src/formations`), not database tables. The database stores only the enum values.

| Formation | Slots |
|---|---|
| `FIVE_ONE` (5-1) | `SETTER_1`, `OPPOSITE`, `OUTSIDE_1`, `OUTSIDE_2`, `MIDDLE_1`, `MIDDLE_2` |
| `SIX_TWO` (6-2) | `SETTER_1`, `SETTER_2`, `OUTSIDE_1`, `OUTSIDE_2`, `MIDDLE_1`, `MIDDLE_2` |
| `FOUR_TWO` (4-2) | `SETTER_1`, `SETTER_2`, `OUTSIDE_1`, `OUTSIDE_2`, `MIDDLE_1`, `MIDDLE_2` |

Every formation also accepts an optional `LIBERO` slot.

Each slot has an expected player role:

| Slot | Expected player role |
|---|---|
| `SETTER_1`, `SETTER_2` | `SETTER` |
| `OPPOSITE` | `OPPOSITE` |
| `OUTSIDE_1`, `OUTSIDE_2` | `OUTSIDE_HITTER` |
| `MIDDLE_1`, `MIDDLE_2` | `MIDDLE_BLOCKER` |
| `LIBERO` | `LIBERO` |

Open point: 6-2 and 4-2 currently have identical slot lists, because they differ only in rotation behaviour, which this project does not model. This can be changed in the constants file.

A team is **compatible** with a formation when it has enough active players of each required role.

# 6. Match model

A match belongs to the user who created it and involves exactly two teams.

```text
Match
  id, ownerId, playedAt, status (PLANNED | IN_PROGRESS | FINISHED)

MatchTeam
  id, matchId, teamId, side (HOME | AWAY), formation
  unique (matchId, side)
  unique (matchId, teamId)      -> a team cannot play against itself

MatchLineupSlot
  id, matchTeamId, slot, playerId
  unique (matchTeamId, slot)
  unique (matchTeamId, playerId) -> a player cannot occupy two slots

MatchSet
  id, matchId, setNumber, homeScore, awayScore, status (IN_PROGRESS | FINISHED)
  unique (matchId, setNumber)
```

Match flow:

1. The user chooses two teams.
2. For each team the user chooses a formation (5-1, 6-2, 4-2) and assigns exactly one player to each slot.
3. The user starts the match and records events.

The formation and lineup are normally chosen at the beginning of the match, but they may be changed at any time. `MatchLineupSlot` stores only the **current** lineup. Changing the formation clears the lineup, which must then be assigned again.

**Scores are entered manually.** `MatchSet.homeScore` and `MatchSet.awayScore` are editable values and are independent of the recorded events. Statistics are derived from events; scores are not.

Do not duplicate match statistics into the Match table.

# 7. Match events

`MatchEvent` is one of the most important design decisions in the project.

Do not store statistics such as `attackKills`, `attackErrors`, `aces` or `receptions` as the primary source of truth. Instead, record what happened:

```text
MatchEvent
  id, matchId, setId, playerId, action, result, createdAt
```

The team of an event is derived through the player. Events reference only `playerId`, so they stay valid when the lineup changes. Statistics per formation slot are out of scope.

During a live match the user clicks a player and adds one touch with its result. Both teams' players can be clicked. Example sequence:

```text
Libero          | Reception | Good
Setter          | Set       | Good
Opposite        | Attack    | Blocked
```

Actions and their allowed results:

| Action | Allowed results |
|---|---|
| `SERVE` | `ACE`, `IN_PLAY`, `ERROR` |
| `RECEPTION` | `PERFECT`, `GOOD`, `POOR`, `ERROR` |
| `SET` | `GOOD`, `POOR`, `ERROR` |
| `ATTACK` | `KILL`, `IN_PLAY`, `BLOCKED`, `ERROR` |
| `BLOCK` | `POINT`, `TOUCH`, `ERROR` |
| `DIG` | `GOOD`, `POOR`, `ERROR` |

The database stores one `result` enum. The service must reject combinations that are not in the table above (for example `RECEPTION` + `KILL`).

Statistics are calculated from these events. For example:

```text
Attack + Kill    => attack attempts +1, attack kills +1
Attack + Blocked => attack attempts +1, attack blocked +1
Attack + Error   => attack attempts +1, attack errors +1
Reception + Error => reception attempts +1, reception errors +1
```

This gives us current match statistics, final match statistics and all-time player statistics, and it makes the application highly testable.

A mistaken event must be removable (undo/delete), because events are entered live.

# 8. Tactics

A tactic belongs to the user account, not to a team. A tactic is reusable with any compatible team.

A tactic has a **formation** for the own side and a formation for the opponent side (`opponentFormation`, default: the same formation).

A tactic never references a specific player. Steps reference **formation slots** (for example `MIDDLE_1`), not player ids and not bare roles. This lets the same tactic be used with another team and distinguishes between the two middle blockers.

Compatibility is checked at validate/replay time. The client sends a mapping of slot to player id (for example `{ "SETTER_1": 12, "MIDDLE_1": 15 }`). The mapping is not stored. Validation checks that:

- every slot required by the formation is assigned exactly once;
- every assigned player belongs to the selected team;
- each player's role matches the slot's expected role;
- if not, the system explains which requirement is missing.

## Tactic and TacticStep

```text
Tactic
  id, ownerId, name, description, formation, opponentFormation, createdAt

TacticStep
  id, tacticId, stepNumber, actorSide, slot?, targetSlot?, action, x, y, duration
  unique (tacticId, stepNumber)
```

Actor sides: `OWN`, `OPPONENT`, `BALL`.

Initial step actions: `MOVE`, `RECEIVE`, `SET`, `ATTACK`, `BLOCK`.

- `slot` identifies the acting slot (null for the ball).
- `targetSlot` is used by actions such as "Setter sets MiddleBlocker".
- `duration` is the animation duration of the step in milliseconds.
- Steps are executed sequentially.

An optional table `TacticSlotPosition` (`tacticId`, `side`, `slot`, `x`, `y`) may store the starting coordinates for each slot. Until it exists, starting positions come from defaults in the formation constants.

Do not make this system unnecessarily generic at first. The tactical simulator only needs enough information to describe and replay a volleyball play.

# 9. Tactical simulation

The initial simulator supports the formations from section 5. A tactic starts from a known court state (the default start positions of the chosen formations).

The user defines a sequence such as:

1. Setter moves to setting position
2. Libero receives
3. Setter moves into position
4. Setter sets MiddleBlocker
5. MiddleBlocker attacks
6. Opponent block moves into position

The simulator displays this as an animation.

The backend stores the sequence and validates it. The frontend is responsible for visually animating it. The backend does not need a physics engine.

# 10. Court coordinates

Use a simple normalized or fixed coordinate system, for example:

```text
x = 0..9
y = 0..18
```

The exact dimensions are not important. A tactic step contains `x`, `y` and `duration`.

The backend validates that positions remain inside the court:

```text
0 <= x <= courtWidth
0 <= y <= courtHeight
```

The frontend converts these coordinates into screen pixels. This keeps the simulation deterministic and easy to test.

# 11. Important business rules

The implementation should prioritize meaningful rules over large numbers of CRUD endpoints.

Initial rules:

**Teams and players**
- A team must have a name.
- Jersey numbers must be valid (0-99) and unique within a team.
- Only the team owner can edit or delete the team and its players; any user can use it in a match or the simulator.
- A player that has recorded events is soft-deleted (`isActive = false`), not removed.

**Lineups**
- A formation's lineup has exactly one player per required slot; the `LIBERO` slot is optional.
- The same player cannot occupy two slots.
- A player must belong to the team whose lineup is being set.
- A player's role must match the slot's expected role.
- If further libero/front-row rules are implemented, they must be explicitly documented and tested rather than partially implemented.

**Matches**
- A team cannot play against itself.
- A match involves exactly two existing teams.
- Match events must reference a player of one of the two teams, and a set of the same match.
- A result must be valid for its action (see section 7).
- Finished matches do not accept new events unless the application explicitly supports reopening them.

**Statistics**
- Statistics are derived from match events.
- An attack kill increments attack attempts and attack kills.
- An attack error increments attack attempts and attack errors.
- A blocked attack increments attack attempts and attack blocked.
- A reception error increments reception attempts and reception errors.
- Statistics must be reproducible from the stored events.

**Tactics**
- A tactic must have a name.
- A tactic must contain at least one step before it can be saved as usable.
- Step numbers must form a valid sequence.
- A step's slot must exist in the tactic's formation for its side.
- A movement cannot end outside the court.
- A tactic can be used with a team when the team can fill every slot of the formation with a player of the right role.
- If the team is incompatible, the system explains the missing requirement.

**Play rules** (checked by `POST /tactics/:id/validate`, i.e. before a tactic is simulated; drafts that break them can still be saved):
- A team touches the ball at most 3 times in a row. Only `RECEIVE`, `SET` and `ATTACK` are touches; `MOVE` steps and ball steps are ignored.
- A block is not a touch. It must directly follow an attack of the other team and starts a new possession (fresh touches for both teams).
- The same player (slot) cannot touch the ball twice in a row.
- After an attack the same team cannot touch the ball again (it is on the other side).
- `RECEIVE` can only be the first touch of a team.
- The libero cannot attack or block.

Do not implement every rule immediately. Build the minimum necessary rules first and add only rules that support the acceptance criteria.

## Database delete behaviour

- Cascade: `Match` -> `MatchTeam`, `MatchSet`, `MatchEvent`; `MatchTeam` -> `MatchLineupSlot`; `Tactic` -> `TacticStep`.
- A `Team` used in a match cannot be hard-deleted (restrict).
- A `Player` referenced by an event or lineup cannot be hard-deleted (restrict); soft-delete instead.

# 12. Frontend structure

Keep the frontend small.

Suggested pages:

Dashboard
Teams
  └── Team Details
Matches
  ├── Create Match
  ├── Live Match
  └── Match Statistics
Tactics
  ├── Tactic List
  ├── Tactic Editor
  └── Tactic Playback

The live match screen should provide a practical way to record events.

Example:

+------------------------------------------+
|              LIVE MATCH                 |
|                                          |
| BME VC                 Opponent          |
|   18                      16             |
|                                          |
+------------------------------------------+
| Player       Actions                     |
|                                          |
| Bence        [Serve] [Reception] [Attack]|
| Peter        [Serve] [Reception] [Attack]|
| Adam         [Attack] [Block]             |
+------------------------------------------+

Before the live screen, the Create Match page lets the user pick two teams, a formation per team (5-1, 6-2, 4-2) and one player per slot. The lineup can also be edited from the live screen.

Clicking a player and then choosing an action and result (for example Libero / Reception / Good) should create a MatchEvent. A mistaken event can be undone. Set scores are entered manually with +1/-1 controls and do not depend on events.

The statistics displayed on screen should update from the recorded events.

# 13. API design

Use REST.

Example endpoints:

```text
POST   /auth/register
POST   /auth/login

GET    /teams                    (all teams; ?mine=true for own teams)
POST   /teams
GET    /teams/:id
PATCH  /teams/:id                (owner only)
DELETE /teams/:id                (owner only)

POST   /teams/:id/players        (owner only)
PATCH  /players/:id              (owner only)
DELETE /players/:id              (owner only)

GET    /formations               (formation/slot templates from code)

GET    /matches
POST   /matches                  (two teams + formation per team)
GET    /matches/:id
PATCH  /matches/:id
PUT    /matches/:id/teams/:side/lineup   (formation + slot -> player, may be changed at any time)

POST   /matches/:id/sets
PATCH  /matches/:id/sets/:setId  (manual score)
POST   /matches/:id/events
GET    /matches/:id/events
DELETE /matches/:id/events/:eventId

GET    /matches/:id/statistics
GET    /players/:id/statistics

GET    /tactics
POST   /tactics
GET    /tactics/:id
PATCH  /tactics/:id
DELETE /tactics/:id

POST   /tactics/:id/steps
POST   /tactics/:id/validate     (body: teamId + slot -> player mapping)
```

This is an initial proposal, not a requirement to implement every endpoint immediately.

# 14. Testing strategy

Testing is a major part of this project because the university assignment explicitly requires automated tests for important programmed rules.

Focus tests on business logic.

Examples:

TeamService
- creates valid team
- rejects empty name
- rejects duplicate jersey number

MatchService
- creates match between two different teams
- rejects same team on both sides
- rejects lineup with a player from another team
- rejects lineup with a duplicate player or a missing slot
- rejects an event whose result is invalid for its action

FormationService
- returns the expected slots for 5-1, 6-2 and 4-2
- libero slot is optional in every formation

StatisticsService
- counts attack kill correctly
- counts attack error correctly
- counts reception error correctly
- aggregates statistics from multiple sets

TacticService
- saves valid tactic
- rejects empty tactic
- rejects out-of-court movement
- rejects incompatible team
- accepts compatible team

Use unit tests for business rules and a smaller number of API/integration tests with Supertest.

# 15. Required bug/fix demonstration

The assignment requires at least one test where a buggy implementation and corrected implementation can both be demonstrated.

A good candidate is statistics.

For example, intentionally create this bug:

```ts
if (event.result !== 'ERROR') {
  statistics.attackKills++;
}
```

This is incorrect because not every non-error event is an attack kill.

A test should fail for an event such as:

```text
Reception + Good
```

Then correct the implementation so that only:

```text
Attack + Kill
```

increments attack kills:

```ts
if (event.action === 'ATTACK' && event.result === 'KILL') {
  statistics.attackKills++;
}
```

Run the test before and after the fix and preserve the results as part of the project documentation.

Do not randomly introduce bugs into unrelated parts of the application. Use a small, clearly demonstrable business-rule bug.

# 16. AI-assisted development requirement

AI assistance is a deliberate part of this university project.

AI should be used in at least three development phases.

Recommended phases:

Phase 1 — Requirements analysis

Use AI to:

identify ambiguous requirements;
find missing edge cases;
propose acceptance criteria;
challenge overly broad scope.

The developer must make the final decision.

Phase 2 — Architecture/design

Use AI to:

propose NestJS module structure;
review the database schema;
identify normalization problems;
propose API boundaries;
compare alternatives.

Document which suggestions were accepted, modified, or rejected.

Phase 3 — Implementation

Use AI to assist with:

DTOs;
services;
validation;
Prisma queries;
React components;
API integration.

Generated code must be reviewed rather than blindly accepted.

Phase 4 — Testing

Use AI to:

propose edge cases;
generate candidate unit tests;
review test coverage;
identify missing business-rule tests.

The project documentation should preserve representative examples of:

the context/prompt given to AI;
the AI suggestion;
the developer's decision;
the reasoning behind the decision;
the resulting code/test evidence.

# 17. Development principles

Keep the implementation deliberately simple.

Prefer
readable TypeScript;
small services;
explicit business rules;
DTO validation;
meaningful tests;
normalized relational data;
straightforward REST APIs;
feature-based NestJS modules;
reusable React components;
deterministic tactical simulation.
Avoid
premature abstractions;
generic frameworks built on top of NestJS;
unnecessary repositories;
microservices;
complicated state management unless needed;
real-time WebSockets unless a concrete requirement appears;
physics simulation;
AI/ML features;
over-engineered domain models.

A simple implementation that is well tested is better than a sophisticated implementation that is difficult to explain.

# 18. Suggested implementation order

Implement in this order:

1. Repository/project setup
2. NestJS + Prisma + PostgreSQL
3. React + Vite + MUI
4. Database migrations
5. Authentication
6. Teams
7. Players
8. Formation constants, then Matches (with formations and lineups)
9. Sets
10. Match events
11. Statistics
12. Tactics
13. Tactic validation
14. Tactical editor
15. Tactical playback
16. Automated tests
17. Bug/fix demonstration
18. UI polish

Do not build the tactical animation before the underlying tactic model and validation are stable.

# 19. Definition of done for the first MVP

The MVP is complete when a user can:

Register/login.
Create a team.
Add at least six players.
Create a match between two teams (own or another user's), choose a formation per team and assign one player per slot.
Create a set and enter its score.
Record player actions/events (action + result).
See statistics derived from those events.
Create a tactic in a 5-1 formation (6-2 and 4-2 are available as soon as the formation constants support them).
Add movement and volleyball action steps.
Validate the tactic against a team (slot-to-player mapping).
Save the tactic to the user's account.
Open and replay the tactic visually.
Run automated tests for the important business rules.

Everything else is secondary.

# 20. First task for the coding agent

Before writing significant application code:

Inspect this README.
Propose the initial repository structure.
Identify any ambiguities or contradictions in the specification.
Propose the initial Prisma schema.
Explain any schema decisions that materially affect future development.
Create the minimal NestJS backend and React frontend.
Configure Prisma and PostgreSQL.
Add a health-check endpoint.
Add the initial database migration.
Add basic automated test infrastructure.
Do not implement the full application in one step.

After the initial setup, work incrementally feature-by-feature.

For every non-trivial implementation decision, prefer a small explanation and a testable result over a large amount of generated code.

The coding agent should treat this README as the project direction, but should still question requirements when they are ambiguous rather than silently inventing behavior.
