import {
  bearer,
  createMatch as createMatchHelper,
  createTeamWithRoster,
  createTestApp,
  fiveOneLineup,
  registerUser,
  resetDatabase,
  TestContext,
  TestUser,
} from './helpers';

describe('Formations and matches (e2e)', () => {
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

  const createTeam = (user: TestUser, name: string) => createTeamWithRoster(ctx, user, name);
  const createMatch = (user: TestUser, homeId: number, awayId: number) =>
    createMatchHelper(ctx, user, homeId, awayId);

  const putLineup = (user: TestUser, matchId: number, side: string, body: object) =>
    ctx.http().put(`/matches/${matchId}/teams/${side}/lineup`).set(bearer(user)).send(body);

  const patchMatch = (user: TestUser, matchId: number, body: object) =>
    ctx.http().patch(`/matches/${matchId}`).set(bearer(user)).send(body);

  it('GET /formations returns the templates from code', async () => {
    const res = await ctx.http().get('/formations').set(bearer(alice)).expect(200);

    expect(res.body.formations.map((f: { name: string }) => f.name)).toEqual([
      'FIVE_ONE',
      'SIX_TWO',
      'FOUR_TWO',
    ]);
    expect(res.body.formations[0].requiredSlots).toHaveLength(6);
    expect(res.body.slotRoles.MIDDLE_1).toBe('MIDDLE_BLOCKER');
  });

  describe('creating a match', () => {
    it('creates a match between two teams, also with a team of another user', async () => {
      const mine = await createTeam(alice, 'Mine');
      const theirs = await createTeam(bob, 'Theirs');

      const match = await createMatch(alice, mine.id, theirs.id);

      expect(match.status).toBe('PLANNED');
      expect(match.ownerId).toBe(alice.id);
      expect(match.teams.map((t: { side: string }) => t.side)).toEqual(['HOME', 'AWAY']);
    });

    it('rejects a team playing against itself', async () => {
      const team = await createTeam(alice, 'Mine');
      await ctx
        .http()
        .post('/matches')
        .set(bearer(alice))
        .send({
          home: { teamId: team.id, formation: 'FIVE_ONE' },
          away: { teamId: team.id, formation: 'SIX_TWO' },
        })
        .expect(400);
    });

    it('rejects an unknown team', async () => {
      const team = await createTeam(alice, 'Mine');
      await ctx
        .http()
        .post('/matches')
        .set(bearer(alice))
        .send({
          home: { teamId: team.id, formation: 'FIVE_ONE' },
          away: { teamId: 99999, formation: 'FIVE_ONE' },
        })
        .expect(404);
    });

    it('rejects an invalid formation', async () => {
      await ctx
        .http()
        .post('/matches')
        .set(bearer(alice))
        .send({ home: { teamId: 1, formation: 'THREE_THREE' }, away: { teamId: 2, formation: 'FIVE_ONE' } })
        .expect(400);
    });
  });

  describe('privacy', () => {
    it('lists and shows only the matches of the caller', async () => {
      const a = await createTeam(alice, 'A');
      const b = await createTeam(alice, 'B');
      const match = await createMatch(alice, a.id, b.id);

      const bobList = await ctx.http().get('/matches').set(bearer(bob)).expect(200);
      expect(bobList.body).toEqual([]);
      await ctx.http().get(`/matches/${match.id}`).set(bearer(bob)).expect(404);
      await patchMatch(bob, match.id, { status: 'IN_PROGRESS' }).expect(404);

      const aliceList = await ctx.http().get('/matches').set(bearer(alice)).expect(200);
      expect(aliceList.body).toHaveLength(1);
    });
  });

  describe('lineups', () => {
    let home: { id: number; players: number[] };
    let away: { id: number; players: number[] };
    let matchId: number;

    beforeEach(async () => {
      home = await createTeam(alice, 'Home');
      away = await createTeam(bob, 'Away');
      matchId = (await createMatch(alice, home.id, away.id)).id;
    });

    it('stores a valid lineup', async () => {
      const res = await putLineup(alice, matchId, 'HOME', {
        formation: 'FIVE_ONE',
        lineup: fiveOneLineup(home.players),
      }).expect(200);

      const homeTeam = res.body.teams.find((t: { side: string }) => t.side === 'HOME');
      expect(homeTeam.lineup).toHaveLength(7);
    });

    it('accepts a lineup without libero', async () => {
      await putLineup(alice, matchId, 'HOME', {
        formation: 'FIVE_ONE',
        lineup: fiveOneLineup(home.players).slice(0, 6),
      }).expect(200);
    });

    it('rejects a missing required slot and explains it', async () => {
      const res = await putLineup(alice, matchId, 'HOME', {
        formation: 'FIVE_ONE',
        lineup: fiveOneLineup(home.players).filter((e) => e.slot !== 'MIDDLE_2'),
      }).expect(400);

      expect(res.body.message).toEqual(['Slot MIDDLE_2 is required but not assigned']);
    });

    it("rejects a player of the other team", async () => {
      const lineup = fiveOneLineup(home.players).map((e) =>
        e.slot === 'SETTER_1' ? { ...e, playerId: away.players[0] } : e,
      );
      await putLineup(alice, matchId, 'HOME', { formation: 'FIVE_ONE', lineup }).expect(400);
    });

    it('rejects a player with the wrong role and a duplicate player', async () => {
      const wrongRole = fiveOneLineup(home.players).map((e) =>
        e.slot === 'SETTER_1' ? { ...e, playerId: home.players[1] } : e,
      );
      await putLineup(alice, matchId, 'HOME', { formation: 'FIVE_ONE', lineup: wrongRole }).expect(400);

      const duplicate = fiveOneLineup(home.players).map((e) =>
        e.slot === 'MIDDLE_2' ? { ...e, playerId: home.players[4] } : e,
      );
      await putLineup(alice, matchId, 'HOME', { formation: 'FIVE_ONE', lineup: duplicate }).expect(400);
    });

    it('rejects an inactive player', async () => {
      await ctx.prisma.player.update({ where: { id: home.players[0] }, data: { isActive: false } });
      await putLineup(alice, matchId, 'HOME', {
        formation: 'FIVE_ONE',
        lineup: fiveOneLineup(home.players),
      }).expect(400);
    });

    it('replaces the old lineup when the formation changes', async () => {
      await putLineup(alice, matchId, 'HOME', {
        formation: 'FIVE_ONE',
        lineup: fiveOneLineup(home.players),
      }).expect(200);

      const sixTwo = [
        { slot: 'SETTER_1', playerId: home.players[0] },
        { slot: 'SETTER_2', playerId: await extraSetter(home.id) },
        { slot: 'OUTSIDE_1', playerId: home.players[2] },
        { slot: 'OUTSIDE_2', playerId: home.players[3] },
        { slot: 'MIDDLE_1', playerId: home.players[4] },
        { slot: 'MIDDLE_2', playerId: home.players[5] },
      ];
      const res = await putLineup(alice, matchId, 'HOME', { formation: 'SIX_TWO', lineup: sixTwo }).expect(200);

      const homeTeam = res.body.teams.find((t: { side: string }) => t.side === 'HOME');
      expect(homeTeam.formation).toBe('SIX_TWO');
      expect(homeTeam.lineup).toHaveLength(6);
    });

    it('does not let another user change the lineup', async () => {
      await putLineup(bob, matchId, 'AWAY', {
        formation: 'FIVE_ONE',
        lineup: fiveOneLineup(away.players),
      }).expect(404);
    });

    it('rejects an unknown side', async () => {
      await putLineup(alice, matchId, 'LEFT', { formation: 'FIVE_ONE', lineup: [] }).expect(400);
    });

    const extraSetter = async (teamId: number) =>
      (await ctx.prisma.player.create({ data: { teamId, name: 'S2', jerseyNumber: 50, role: 'SETTER' } })).id;

    describe('match status', () => {
      it('cannot start without complete lineups', async () => {
        await patchMatch(alice, matchId, { status: 'IN_PROGRESS' }).expect(409);

        await putLineup(alice, matchId, 'HOME', {
          formation: 'FIVE_ONE',
          lineup: fiveOneLineup(home.players),
        }).expect(200);
        await patchMatch(alice, matchId, { status: 'IN_PROGRESS' }).expect(409); // away still empty
      });

      it('goes PLANNED -> IN_PROGRESS -> FINISHED and never back', async () => {
        for (const [side, team] of [['HOME', home], ['AWAY', away]] as const) {
          await putLineup(alice, matchId, side, {
            formation: 'FIVE_ONE',
            lineup: fiveOneLineup(team.players),
          }).expect(200);
        }

        await patchMatch(alice, matchId, { status: 'FINISHED' }).expect(409); // cannot skip
        await patchMatch(alice, matchId, { status: 'IN_PROGRESS' }).expect(200);
        await patchMatch(alice, matchId, { status: 'FINISHED' }).expect(200);
        await patchMatch(alice, matchId, { status: 'IN_PROGRESS' }).expect(409); // no reopening
        await putLineup(alice, matchId, 'HOME', {
          formation: 'FIVE_ONE',
          lineup: fiveOneLineup(home.players),
        }).expect(409);
      });
    });

    it('a team that is part of a match can no longer be deleted', async () => {
      await ctx.http().delete(`/teams/${home.id}`).set(bearer(alice)).expect(409);
    });
  });
});
