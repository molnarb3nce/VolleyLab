import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

export interface TestContext {
  app: INestApplication;
  prisma: PrismaService;
  http: () => ReturnType<typeof request>;
}

export async function createTestApp(): Promise<TestContext> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  return {
    app,
    prisma: app.get(PrismaService),
    http: () => request(app.getHttpServer()),
  };
}

/** Empties every table of the test schema (not the migrations table). */
export async function resetDatabase(prisma: PrismaService): Promise<void> {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = current_schema() AND tablename <> '_prisma_migrations'`;
  if (tables.length === 0) {
    return;
  }
  const list = tables.map((t) => `"${t.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

export interface TestUser {
  id: number;
  email: string;
  token: string;
}

export async function registerUser(
  ctx: TestContext,
  email: string,
  password = 'password123',
): Promise<TestUser> {
  const res = await ctx.http().post('/auth/register').send({ email, password }).expect(201);
  return { id: res.body.user.id, email, token: res.body.accessToken };
}

export const bearer = (user: TestUser) => ({ Authorization: `Bearer ${user.token}` });

export interface RosterTeam {
  id: number;
  /** Player ids in the order of ROSTER_ROLES. */
  players: number[];
}

export const ROSTER_ROLES = [
  'SETTER',
  'OPPOSITE',
  'OUTSIDE_HITTER',
  'OUTSIDE_HITTER',
  'MIDDLE_BLOCKER',
  'MIDDLE_BLOCKER',
  'LIBERO',
] as const;

/** Creates a team with one player per ROSTER_ROLES entry (enough for a 5-1 lineup). */
export async function createTeamWithRoster(
  ctx: TestContext,
  user: TestUser,
  name: string,
): Promise<RosterTeam> {
  const team = (await ctx.http().post('/teams').set(bearer(user)).send({ name }).expect(201)).body;
  const players: number[] = [];
  for (const [i, role] of ROSTER_ROLES.entries()) {
    const res = await ctx
      .http()
      .post(`/teams/${team.id}/players`)
      .set(bearer(user))
      .send({ name: `P${i}`, jerseyNumber: i + 1, role })
      .expect(201);
    players.push(res.body.id);
  }
  return { id: team.id, players };
}

export const fiveOneLineup = (p: number[]) => [
  { slot: 'SETTER_1', playerId: p[0] },
  { slot: 'OPPOSITE', playerId: p[1] },
  { slot: 'OUTSIDE_1', playerId: p[2] },
  { slot: 'OUTSIDE_2', playerId: p[3] },
  { slot: 'MIDDLE_1', playerId: p[4] },
  { slot: 'MIDDLE_2', playerId: p[5] },
  { slot: 'LIBERO', playerId: p[6] },
];

export async function createMatch(ctx: TestContext, user: TestUser, homeId: number, awayId: number) {
  const res = await ctx
    .http()
    .post('/matches')
    .set(bearer(user))
    .send({
      home: { teamId: homeId, formation: 'FIVE_ONE' },
      away: { teamId: awayId, formation: 'FIVE_ONE' },
    })
    .expect(201);
  return res.body;
}

/** Creates a 5-1 vs 5-1 match with full lineups and moves it to IN_PROGRESS. Returns the match id. */
export async function startMatch(
  ctx: TestContext,
  user: TestUser,
  home: RosterTeam,
  away: RosterTeam,
): Promise<number> {
  const match = await createMatch(ctx, user, home.id, away.id);
  for (const [side, team] of [['HOME', home], ['AWAY', away]] as const) {
    await ctx
      .http()
      .put(`/matches/${match.id}/teams/${side}/lineup`)
      .set(bearer(user))
      .send({ formation: 'FIVE_ONE', lineup: fiveOneLineup(team.players) })
      .expect(200);
  }
  await ctx
    .http()
    .patch(`/matches/${match.id}`)
    .set(bearer(user))
    .send({ status: 'IN_PROGRESS' })
    .expect(200);
  return match.id;
}
