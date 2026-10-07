import {
  bearer,
  createMatch,
  createTeamWithRoster,
  createTestApp,
  registerUser,
  resetDatabase,
  RosterTeam,
  startMatch,
  TestContext,
  TestUser,
} from './helpers';

describe('Sets and events (e2e)', () => {
  let ctx: TestContext;
  let alice: TestUser;
  let bob: TestUser;
  let home: RosterTeam;
  let away: RosterTeam;
  let outsider: RosterTeam;
  let matchId: number;

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    alice = await registerUser(ctx, 'alice@example.com');
    bob = await registerUser(ctx, 'bob@example.com');
    home = await createTeamWithRoster(ctx, alice, 'Home');
    away = await createTeamWithRoster(ctx, bob, 'Away');
    outsider = await createTeamWithRoster(ctx, bob, 'Outsider');
    matchId = await startMatch(ctx, alice, home, away);
  });
  afterAll(() => ctx.app.close());

  const createSet = (user = alice, id = matchId) =>
    ctx.http().post(`/matches/${id}/sets`).set(bearer(user));
  const patchSet = (setId: number, body: object, user = alice) =>
    ctx.http().patch(`/matches/${matchId}/sets/${setId}`).set(bearer(user)).send(body);
  const addEvent = (body: object, user = alice, id = matchId) =>
    ctx.http().post(`/matches/${id}/events`).set(bearer(user)).send(body);

  describe('sets', () => {
    it('numbers sets automatically and requires the previous set to be finished', async () => {
      const first = (await createSet().expect(201)).body;
      expect(first).toMatchObject({ setNumber: 1, homeScore: 0, awayScore: 0, status: 'IN_PROGRESS' });

      await createSet().expect(409); // set 1 still running
      await patchSet(first.id, { status: 'FINISHED' }).expect(200);

      const second = (await createSet().expect(201)).body;
      expect(second.setNumber).toBe(2);
    });

    it('allows at most five sets', async () => {
      for (let i = 0; i < 5; i++) {
        const set = (await createSet().expect(201)).body;
        await patchSet(set.id, { status: 'FINISHED' }).expect(200);
      }
      await createSet().expect(409);
    });

    it('stores manually entered scores', async () => {
      const set = (await createSet().expect(201)).body;

      const res = await patchSet(set.id, { homeScore: 25, awayScore: 23 }).expect(200);

      expect(res.body).toMatchObject({ homeScore: 25, awayScore: 23 });
    });

    it.each([{ homeScore: -1 }, { awayScore: 100 }, { homeScore: 1.5 }, { status: 'DONE' }])(
      'rejects invalid input %j',
      async (body) => {
        const set = (await createSet().expect(201)).body;
        await patchSet(set.id, body).expect(400);
      },
    );

    it('404 for a set of another match, and for other users', async () => {
      const set = (await createSet().expect(201)).body;
      const otherMatch = await createMatch(ctx, alice, home.id, outsider.id);

      await ctx
        .http()
        .patch(`/matches/${otherMatch.id}/sets/${set.id}`)
        .set(bearer(alice))
        .send({ homeScore: 1 })
        .expect(404);
      await patchSet(set.id, { homeScore: 1 }, bob).expect(404);
      await createSet(bob).expect(404);
    });

    it('does not change sets of a finished match', async () => {
      const set = (await createSet().expect(201)).body;
      await ctx.http().patch(`/matches/${matchId}`).set(bearer(alice)).send({ status: 'FINISHED' }).expect(200);

      await patchSet(set.id, { homeScore: 5 }).expect(409);
      await createSet().expect(409);
    });
  });

  describe('events', () => {
    let setId: number;

    beforeEach(async () => {
      setId = (await createSet().expect(201)).body.id;
    });

    const event = (overrides: object = {}) => ({
      setId,
      playerId: home.players[0],
      action: 'SERVE',
      result: 'ACE',
      ...overrides,
    });

    it('records an event for a player of either team', async () => {
      const homeEvent = await addEvent(event()).expect(201);
      const awayEvent = await addEvent(event({ playerId: away.players[2], action: 'ATTACK', result: 'KILL' })).expect(201);

      expect(homeEvent.body).toMatchObject({ matchId, setId, action: 'SERVE', result: 'ACE' });
      const list = await ctx.http().get(`/matches/${matchId}/events`).set(bearer(alice)).expect(200);
      expect(list.body.map((e: { id: number }) => e.id)).toEqual([homeEvent.body.id, awayEvent.body.id]);
      expect(list.body[0].player.name).toBe('P0');
    });

    it.each([
      ['RECEPTION', 'KILL'],
      ['SERVE', 'GOOD'],
      ['BLOCK', 'BLOCKED'],
    ])('rejects %s + %s', async (action, result) => {
      const res = await addEvent(event({ action, result })).expect(400);
      expect(res.body.message).toContain('is not valid for');
    });

    it('rejects a player who is in neither team', async () => {
      await addEvent(event({ playerId: outsider.players[0] })).expect(400);
    });

    it('rejects an inactive player', async () => {
      await ctx.prisma.player.update({ where: { id: home.players[0] }, data: { isActive: false } });
      await addEvent(event()).expect(400);
    });

    it('rejects a set of another match', async () => {
      const otherMatchId = await startMatch(ctx, alice, await createTeamWithRoster(ctx, alice, 'X'), await createTeamWithRoster(ctx, alice, 'Y'));
      const otherSet = (await createSet(alice, otherMatchId).expect(201)).body;

      await addEvent(event({ setId: otherSet.id })).expect(404);
    });

    it('rejects events for a finished set', async () => {
      await patchSet(setId, { status: 'FINISHED' }).expect(200);
      await addEvent(event()).expect(409);
    });

    it('rejects events before the match has started', async () => {
      const planned = await createMatch(ctx, alice, home.id, away.id);
      await addEvent(event(), alice, planned.id).expect(409);
    });

    it('rejects malformed input', async () => {
      await addEvent({ ...event(), action: 'SMASH' }).expect(400);
      await addEvent({ ...event(), extra: true }).expect(400);
      await addEvent({ setId, playerId: home.players[0] }).expect(400);
    });

    it('does not let other users record or read events', async () => {
      await addEvent(event(), bob).expect(404);
      await ctx.http().get(`/matches/${matchId}/events`).set(bearer(bob)).expect(404);
    });

    it('removes a mistaken event (undo)', async () => {
      const created = (await addEvent(event()).expect(201)).body;

      await ctx.http().delete(`/matches/${matchId}/events/${created.id}`).set(bearer(alice)).expect(204);

      const list = await ctx.http().get(`/matches/${matchId}/events`).set(bearer(alice)).expect(200);
      expect(list.body).toEqual([]);
      await ctx.http().delete(`/matches/${matchId}/events/${created.id}`).set(bearer(alice)).expect(404);
    });

    it('does not let other users delete events, nor anyone in a finished match', async () => {
      const created = (await addEvent(event()).expect(201)).body;

      await ctx.http().delete(`/matches/${matchId}/events/${created.id}`).set(bearer(bob)).expect(404);

      await ctx.http().patch(`/matches/${matchId}`).set(bearer(alice)).send({ status: 'FINISHED' }).expect(200);
      await addEvent(event()).expect(409);
      await ctx.http().delete(`/matches/${matchId}/events/${created.id}`).set(bearer(alice)).expect(409);
    });
  });
});
