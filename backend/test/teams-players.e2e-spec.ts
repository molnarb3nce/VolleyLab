import {
  bearer,
  createTestApp,
  registerUser,
  resetDatabase,
  TestContext,
  TestUser,
} from './helpers';

describe('Teams and players (e2e)', () => {
  let ctx: TestContext;
  let alice: TestUser;
  let bob: TestUser;

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    alice = await registerUser(ctx, 'alice@example.com');
    bob = await registerUser(ctx, 'bob@example.com');
  });
  afterAll(() => ctx.app.close());

  const createTeam = async (user: TestUser, name = 'BME VC') => {
    const res = await ctx.http().post('/teams').set(bearer(user)).send({ name }).expect(201);
    return res.body as { id: number; name: string; ownerId: number };
  };

  const addPlayer = (user: TestUser, teamId: number, body: object) =>
    ctx.http().post(`/teams/${teamId}/players`).set(bearer(user)).send(body);

  const player = (jerseyNumber: number, role = 'SETTER') => ({
    name: `Player ${jerseyNumber}`,
    jerseyNumber,
    role,
  });

  describe('teams', () => {
    it('creates a team owned by the caller', async () => {
      const team = await createTeam(alice);

      expect(team.ownerId).toBe(alice.id);
    });

    it('rejects an empty team name', async () => {
      await ctx.http().post('/teams').set(bearer(alice)).send({ name: '   ' }).expect(400);
    });

    it('lets another user read and list the team (teams are shared)', async () => {
      const team = await createTeam(alice);

      const list = await ctx.http().get('/teams').set(bearer(bob)).expect(200);
      expect(list.body.map((t: { id: number }) => t.id)).toContain(team.id);

      await ctx.http().get(`/teams/${team.id}`).set(bearer(bob)).expect(200);
    });

    it('lists only own teams with ?mine=true', async () => {
      const aliceTeam = await createTeam(alice, 'Alice team');
      await createTeam(bob, 'Bob team');

      const res = await ctx.http().get('/teams?mine=true').set(bearer(alice)).expect(200);

      expect(res.body.map((t: { id: number }) => t.id)).toEqual([aliceTeam.id]);
    });

    it('returns 404 for an unknown team', async () => {
      await ctx.http().get('/teams/9999').set(bearer(alice)).expect(404);
    });

    it('lets only the owner rename the team', async () => {
      const team = await createTeam(alice);

      await ctx
        .http()
        .patch(`/teams/${team.id}`)
        .set(bearer(bob))
        .send({ name: 'Hijacked' })
        .expect(403);

      const res = await ctx
        .http()
        .patch(`/teams/${team.id}`)
        .set(bearer(alice))
        .send({ name: 'Renamed' })
        .expect(200);
      expect(res.body.name).toBe('Renamed');
    });

    it('lets only the owner delete the team', async () => {
      const team = await createTeam(alice);

      await ctx.http().delete(`/teams/${team.id}`).set(bearer(bob)).expect(403);
      await ctx.http().delete(`/teams/${team.id}`).set(bearer(alice)).expect(204);
      await ctx.http().get(`/teams/${team.id}`).set(bearer(alice)).expect(404);
    });

    it('does not delete a team that is used in a match', async () => {
      const home = await createTeam(alice, 'Home');
      const away = await createTeam(alice, 'Away');
      const match = await ctx.prisma.match.create({ data: { ownerId: alice.id } });
      await ctx.prisma.matchTeam.createMany({
        data: [
          { matchId: match.id, teamId: home.id, side: 'HOME', formation: 'FIVE_ONE' },
          { matchId: match.id, teamId: away.id, side: 'AWAY', formation: 'SIX_TWO' },
        ],
      });

      await ctx.http().delete(`/teams/${home.id}`).set(bearer(alice)).expect(409);
    });
  });

  describe('players', () => {
    it('adds a player and shows them in the team details', async () => {
      const team = await createTeam(alice);

      await addPlayer(alice, team.id, player(7)).expect(201);

      const res = await ctx.http().get(`/teams/${team.id}`).set(bearer(bob)).expect(200);
      expect(res.body.players).toHaveLength(1);
      expect(res.body.players[0]).toMatchObject({ jerseyNumber: 7, role: 'SETTER', isActive: true });
    });

    it('rejects a duplicate jersey number in the same team', async () => {
      const team = await createTeam(alice);
      await addPlayer(alice, team.id, player(7)).expect(201);

      await addPlayer(alice, team.id, player(7, 'LIBERO')).expect(409);
    });

    it('allows the same jersey number in different teams', async () => {
      const teamA = await createTeam(alice, 'A');
      const teamB = await createTeam(alice, 'B');

      await addPlayer(alice, teamA.id, player(7)).expect(201);
      await addPlayer(alice, teamB.id, player(7)).expect(201);
    });

    it.each([
      ['a jersey number above 99', { ...player(100) }],
      ['a negative jersey number', { ...player(-1) }],
      ['an unknown role', { ...player(5, 'GOALKEEPER') }],
      ['a blank name', { name: ' ', jerseyNumber: 5, role: 'SETTER' }],
    ])('rejects %s', async (_name, body) => {
      const team = await createTeam(alice);

      await addPlayer(alice, team.id, body).expect(400);
    });

    it("does not let another user add players to someone else's team", async () => {
      const team = await createTeam(alice);

      await addPlayer(bob, team.id, player(7)).expect(403);
    });

    it('returns 404 when adding a player to an unknown team', async () => {
      await addPlayer(alice, 9999, player(7)).expect(404);
    });

    it('updates a player, but only for the team owner', async () => {
      const team = await createTeam(alice);
      const created = (await addPlayer(alice, team.id, player(7)).expect(201)).body;

      await ctx
        .http()
        .patch(`/players/${created.id}`)
        .set(bearer(bob))
        .send({ name: 'Hijacked' })
        .expect(403);

      const res = await ctx
        .http()
        .patch(`/players/${created.id}`)
        .set(bearer(alice))
        .send({ name: 'Renamed', role: 'LIBERO' })
        .expect(200);
      expect(res.body).toMatchObject({ name: 'Renamed', role: 'LIBERO', jerseyNumber: 7 });
    });

    it('rejects changing a jersey number to one already taken', async () => {
      const team = await createTeam(alice);
      await addPlayer(alice, team.id, player(7)).expect(201);
      const second = (await addPlayer(alice, team.id, player(8)).expect(201)).body;

      await ctx
        .http()
        .patch(`/players/${second.id}`)
        .set(bearer(alice))
        .send({ jerseyNumber: 7 })
        .expect(409);
    });

    it('hard-deletes a player without events', async () => {
      const team = await createTeam(alice);
      const created = (await addPlayer(alice, team.id, player(7)).expect(201)).body;

      const res = await ctx.http().delete(`/players/${created.id}`).set(bearer(alice)).expect(200);

      expect(res.body).toEqual({ result: 'deleted' });
      expect(await ctx.prisma.player.count({ where: { id: created.id } })).toBe(0);
    });

    it('only deactivates a player that has match events, and hides them from the team', async () => {
      const team = await createTeam(alice);
      const other = await createTeam(alice, 'Other');
      const created = (await addPlayer(alice, team.id, player(7)).expect(201)).body;
      const match = await ctx.prisma.match.create({ data: { ownerId: alice.id } });
      await ctx.prisma.matchTeam.createMany({
        data: [
          { matchId: match.id, teamId: team.id, side: 'HOME', formation: 'FIVE_ONE' },
          { matchId: match.id, teamId: other.id, side: 'AWAY', formation: 'FIVE_ONE' },
        ],
      });
      const set = await ctx.prisma.matchSet.create({ data: { matchId: match.id, setNumber: 1 } });
      await ctx.prisma.matchEvent.create({
        data: {
          matchId: match.id,
          setId: set.id,
          playerId: created.id,
          action: 'SERVE',
          result: 'ACE',
        },
      });

      const res = await ctx.http().delete(`/players/${created.id}`).set(bearer(alice)).expect(200);

      expect(res.body).toEqual({ result: 'deactivated' });
      expect(await ctx.prisma.player.count({ where: { id: created.id } })).toBe(1);
      const details = await ctx.http().get(`/teams/${team.id}`).set(bearer(alice)).expect(200);
      expect(details.body.players).toHaveLength(0);
    });

    it("does not let another user delete a team's player", async () => {
      const team = await createTeam(alice);
      const created = (await addPlayer(alice, team.id, player(7)).expect(201)).body;

      await ctx.http().delete(`/players/${created.id}`).set(bearer(bob)).expect(403);
    });
  });
});
