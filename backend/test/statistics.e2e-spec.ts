import {
  bearer,
  createTeamWithRoster,
  createTestApp,
  registerUser,
  resetDatabase,
  RosterTeam,
  startMatch,
  TestContext,
  TestUser,
} from './helpers';

describe('Statistics (e2e)', () => {
  let ctx: TestContext;
  let alice: TestUser;
  let bob: TestUser;
  let home: RosterTeam;
  let away: RosterTeam;
  let matchId: number;
  let set1: number;
  let set2: number;

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    alice = await registerUser(ctx, 'alice@example.com');
    bob = await registerUser(ctx, 'bob@example.com');
    home = await createTeamWithRoster(ctx, alice, 'Home');
    away = await createTeamWithRoster(ctx, bob, 'Away');
    matchId = await startMatch(ctx, alice, home, away);

    set1 = (await ctx.http().post(`/matches/${matchId}/sets`).set(bearer(alice)).expect(201)).body.id;
    await ctx.http().patch(`/matches/${matchId}/sets/${set1}`).set(bearer(alice)).send({ status: 'FINISHED' }).expect(200);
    set2 = (await ctx.http().post(`/matches/${matchId}/sets`).set(bearer(alice)).expect(201)).body.id;
  });
  afterAll(() => ctx.app.close());

  const record = (setId: number, playerId: number, action: string, result: string) =>
    ctx.prisma.matchEvent.create({
      data: { matchId, setId, playerId, action: action as never, result: result as never },
    });

  const getStats = (url: string, user = alice) => ctx.http().get(url).set(bearer(user));

  beforeEach(async () => {
    const attacker = home.players[2];
    await record(set1, attacker, 'ATTACK', 'KILL');
    await record(set1, attacker, 'ATTACK', 'ERROR');
    await record(set2, attacker, 'ATTACK', 'KILL');
    await record(set2, attacker, 'ATTACK', 'BLOCKED');
    await record(set2, home.players[6], 'RECEPTION', 'GOOD');
    await record(set2, away.players[0], 'SERVE', 'ACE');
  });

  it('derives player and team statistics from the events of all sets', async () => {
    const res = await getStats(`/matches/${matchId}/statistics`).expect(200);

    const attacker = res.body.players.find((p: { playerId: number }) => p.playerId === home.players[2]);
    expect(attacker.stats.attack).toEqual({ attempts: 4, kills: 2, blocked: 1, errors: 1 });

    const homeTeam = res.body.teams.find((t: { side: string }) => t.side === 'HOME');
    const awayTeam = res.body.teams.find((t: { side: string }) => t.side === 'AWAY');
    expect(homeTeam.stats.attack.attempts).toBe(4);
    expect(homeTeam.stats.reception.good).toBe(1);
    expect(awayTeam.stats.serve).toEqual({ attempts: 1, aces: 1, errors: 0 });
    expect(awayTeam.stats.attack.attempts).toBe(0);
  });

  it('lists players without events with zero statistics', async () => {
    const res = await getStats(`/matches/${matchId}/statistics`).expect(200);

    expect(res.body.players).toHaveLength(14);
    const idle = res.body.players.find((p: { playerId: number }) => p.playerId === home.players[0]);
    expect(idle.stats.attack.attempts).toBe(0);
  });

  it('can be limited to one set', async () => {
    const res = await getStats(`/matches/${matchId}/statistics?setId=${set1}`).expect(200);

    const homeTeam = res.body.teams.find((t: { side: string }) => t.side === 'HOME');
    expect(homeTeam.stats.attack).toEqual({ attempts: 2, kills: 1, blocked: 0, errors: 1 });
    expect(homeTeam.stats.reception.attempts).toBe(0);
  });

  it('reflects an undone event immediately', async () => {
    const events = (await ctx.http().get(`/matches/${matchId}/events`).set(bearer(alice))).body;
    expect(events).toHaveLength(6);
    await ctx.http().delete(`/matches/${matchId}/events/${events[0].id}`).set(bearer(alice)).expect(204);

    const res = await getStats(`/matches/${matchId}/statistics`).expect(200);
    const homeTeam = res.body.teams.find((t: { side: string }) => t.side === 'HOME');
    expect(homeTeam.stats.attack.kills).toBe(1);
  });

  it('is private to the match owner and validates the set filter', async () => {
    await getStats(`/matches/${matchId}/statistics`, bob).expect(404);
    await getStats(`/matches/${matchId}/statistics?setId=999999`).expect(404);
    await getStats(`/matches/${matchId}/statistics?setId=abc`).expect(400);
  });

  describe('player statistics', () => {
    it('aggregates the events of all own matches', async () => {
      const attacker = home.players[2];
      const second = await startMatch(ctx, alice, home, await createTeamWithRoster(ctx, alice, 'Third'));
      const setId = (await ctx.http().post(`/matches/${second}/sets`).set(bearer(alice)).expect(201)).body.id;
      await ctx.http().post(`/matches/${second}/events`).set(bearer(alice))
        .send({ setId, playerId: attacker, action: 'ATTACK', result: 'KILL' }).expect(201);

      const res = await getStats(`/players/${attacker}/statistics`).expect(200);

      expect(res.body.matches).toBe(2);
      expect(res.body.stats.attack).toEqual({ attempts: 5, kills: 3, blocked: 1, errors: 1 });
    });

    it("does not include events from other users' matches", async () => {
      const res = await getStats(`/players/${home.players[2]}/statistics`, bob).expect(200);

      expect(res.body.matches).toBe(0);
      expect(res.body.stats.attack.attempts).toBe(0);
    });

    it('404 for an unknown player', async () => {
      await getStats('/players/999999/statistics').expect(404);
    });
  });
});
