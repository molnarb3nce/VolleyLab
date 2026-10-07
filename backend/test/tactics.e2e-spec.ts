import {
  bearer,
  createTeamWithRoster,
  createTestApp,
  fiveOneLineup,
  registerUser,
  resetDatabase,
  TestContext,
  TestUser,
} from './helpers';

describe('Tactics (e2e)', () => {
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

  const step = (overrides: object = {}) => ({
    actorSide: 'OWN',
    slot: 'SETTER_1',
    action: 'MOVE',
    x: 4.5,
    y: 12,
    duration: 800,
    ...overrides,
  });

  const play = [
    step({ slot: 'LIBERO', action: 'RECEIVE', x: 2, y: 14 }),
    step({ action: 'SET', targetSlot: 'MIDDLE_1', x: 4.5, y: 10 }),
    step({ slot: 'MIDDLE_1', action: 'ATTACK', x: 5, y: 9 }),
    step({ actorSide: 'OPPONENT', slot: 'MIDDLE_2', action: 'BLOCK', x: 5, y: 8 }),
    step({ actorSide: 'BALL', slot: undefined, x: 5, y: 5 }),
  ];

  const create = (body: object, user = alice) =>
    ctx.http().post('/tactics').set(bearer(user)).send(body);
  const createValid = async (user = alice) =>
    (await create({ name: 'Quick middle', formation: 'FIVE_ONE', steps: play }, user).expect(201)).body;
  const put = (id: number, steps: object[], user = alice) =>
    ctx.http().put(`/tactics/${id}/steps`).set(bearer(user)).send({ steps });

  describe('creating and reading', () => {
    it('saves a tactic with numbered steps; opponent formation defaults to the own one', async () => {
      const tactic = await createValid();

      expect(tactic).toMatchObject({ ownerId: alice.id, formation: 'FIVE_ONE', opponentFormation: 'FIVE_ONE' });
      expect(tactic.steps.map((s: { stepNumber: number }) => s.stepNumber)).toEqual([1, 2, 3, 4, 5]);
      expect(tactic.steps[1]).toMatchObject({ action: 'SET', slot: 'SETTER_1', targetSlot: 'MIDDLE_1' });
      expect(tactic.steps[4]).toMatchObject({ actorSide: 'BALL', slot: null });
    });

    it('can be saved as a draft without steps', async () => {
      const tactic = (await create({ name: 'Draft', formation: 'SIX_TWO', opponentFormation: 'FIVE_ONE' }).expect(201)).body;
      expect(tactic.steps).toEqual([]);
      expect(tactic.opponentFormation).toBe('FIVE_ONE');
    });

    it('lists and shows only own tactics', async () => {
      const mine = await createValid();

      const list = await ctx.http().get('/tactics').set(bearer(alice)).expect(200);
      expect(list.body).toHaveLength(1);
      expect(list.body[0]._count.steps).toBe(5);

      expect((await ctx.http().get('/tactics').set(bearer(bob)).expect(200)).body).toEqual([]);
      await ctx.http().get(`/tactics/${mine.id}`).set(bearer(bob)).expect(404);
      await ctx.http().patch(`/tactics/${mine.id}`).set(bearer(bob)).send({ name: 'x' }).expect(404);
      await ctx.http().delete(`/tactics/${mine.id}`).set(bearer(bob)).expect(404);
      await put(mine.id, [], bob).expect(404);
    });

    it.each([
      ['an empty name', { name: '  ', formation: 'FIVE_ONE' }],
      ['an unknown formation', { name: 'x', formation: 'THREE_THREE' }],
      ['a missing formation', { name: 'x' }],
      ['unknown properties', { name: 'x', formation: 'FIVE_ONE', ownerId: 5 }],
    ])('rejects %s', async (_label, body) => {
      await create(body).expect(400);
    });
  });

  describe('step rules', () => {
    it.each([
      ['x outside the court', { x: 9.5 }],
      ['negative x', { x: -1 }],
      ['y outside the court', { y: 18.1 }],
      ['negative duration', { duration: -5 }],
      ['an unknown action', { action: 'DANCE' }],
    ])('rejects %s', async (_label, overrides) => {
      await create({ name: 'x', formation: 'FIVE_ONE', steps: [step(overrides)] }).expect(400);
    });

    it('accepts positions exactly on the court edge', async () => {
      await create({ name: 'x', formation: 'FIVE_ONE', steps: [step({ x: 0, y: 0 }), step({ x: 9, y: 18 })] }).expect(201);
    });

    it('rejects a slot that is not in the formation and names the step', async () => {
      const res = await create({
        name: 'x',
        formation: 'FIVE_ONE',
        steps: [step(), step({ slot: 'SETTER_2' })],
      }).expect(400);

      expect(res.body.message).toEqual(['Step 2: slot SETTER_2 does not exist in formation FIVE_ONE']);
    });

    it('checks opponent steps against the opponent formation', async () => {
      const opponentStep = step({ actorSide: 'OPPONENT', slot: 'SETTER_2' });
      await create({ name: 'x', formation: 'FIVE_ONE', opponentFormation: 'SIX_TWO', steps: [opponentStep] }).expect(201);
      await create({ name: 'x', formation: 'FIVE_ONE', steps: [opponentStep] }).expect(400);
    });

    it('rejects a player step without a slot and a ball step that is not a move', async () => {
      await create({ name: 'x', formation: 'FIVE_ONE', steps: [step({ slot: undefined })] }).expect(400);
      await create({
        name: 'x',
        formation: 'FIVE_ONE',
        steps: [step({ actorSide: 'BALL', slot: undefined, action: 'ATTACK' })],
      }).expect(400);
    });

    it('rejects a target slot on a non-SET step', async () => {
      await create({ name: 'x', formation: 'FIVE_ONE', steps: [step({ targetSlot: 'MIDDLE_1' })] }).expect(400);
    });
  });

  describe('replacing steps and changing formations', () => {
    it('replaces all steps and renumbers them', async () => {
      const tactic = await createValid();

      const res = await put(tactic.id, [step({ x: 1, y: 1 }), step({ x: 2, y: 2 })]).expect(200);
      expect(res.body.steps.map((s: { stepNumber: number; x: number }) => [s.stepNumber, s.x])).toEqual([[1, 1], [2, 2]]);

      expect((await put(tactic.id, []).expect(200)).body.steps).toEqual([]);
    });

    it('keeps the old steps when the new list is invalid', async () => {
      const tactic = await createValid();

      await put(tactic.id, [step({ slot: 'SETTER_2' })]).expect(400);

      const after = await ctx.http().get(`/tactics/${tactic.id}`).set(bearer(alice)).expect(200);
      expect(after.body.steps).toHaveLength(5);
    });

    it('renames a tactic', async () => {
      const tactic = await createValid();
      const res = await ctx.http().patch(`/tactics/${tactic.id}`).set(bearer(alice)).send({ name: 'Renamed' }).expect(200);
      expect(res.body.name).toBe('Renamed');
      expect(res.body.steps).toHaveLength(5);
    });

    it('refuses a formation change that would invalidate existing steps', async () => {
      const tactic = (await create({
        name: 'x',
        formation: 'SIX_TWO',
        steps: [step({ slot: 'SETTER_2' })],
      }).expect(201)).body;

      await ctx.http().patch(`/tactics/${tactic.id}`).set(bearer(alice)).send({ formation: 'FIVE_ONE' }).expect(400);
      await ctx.http().patch(`/tactics/${tactic.id}`).set(bearer(alice)).send({ formation: 'FOUR_TWO' }).expect(200);
    });

    it('deletes a tactic together with its steps', async () => {
      const tactic = await createValid();
      await ctx.http().delete(`/tactics/${tactic.id}`).set(bearer(alice)).expect(204);
      expect(await ctx.prisma.tacticStep.count()).toBe(0);
      await ctx.http().get(`/tactics/${tactic.id}`).set(bearer(alice)).expect(404);
    });
  });

  describe('POST /tactics/:id/validate (team compatibility)', () => {
    const assignments = (players: number[]) =>
      Object.fromEntries(fiveOneLineup(players).map((e) => [e.slot, e.playerId]));

    const validate = (tacticId: number, body: object, user = alice) =>
      ctx.http().post(`/tactics/${tacticId}/validate`).set(bearer(user)).send(body);

    it('accepts a compatible team, also a team of another user', async () => {
      const tactic = await createValid();
      const team = await createTeamWithRoster(ctx, bob, 'Bobs team');

      const res = await validate(tactic.id, { teamId: team.id, assignments: assignments(team.players) }).expect(200);

      expect(res.body).toEqual({ valid: true, problems: [] });
    });

    it('explains which slots are missing', async () => {
      const tactic = await createValid();
      const team = await createTeamWithRoster(ctx, alice, 'Mine');
      const partial = assignments(team.players);
      delete partial.MIDDLE_2;

      const res = await validate(tactic.id, { teamId: team.id, assignments: partial }).expect(200);

      expect(res.body).toEqual({ valid: false, problems: ['Slot MIDDLE_2 is required but not assigned'] });
    });

    it('explains role mismatches and players of another team', async () => {
      const tactic = await createValid();
      const team = await createTeamWithRoster(ctx, alice, 'Mine');
      const other = await createTeamWithRoster(ctx, alice, 'Other');
      const mapping = {
        ...assignments(team.players),
        SETTER_1: team.players[1], // an opposite in the setter slot
        OPPOSITE: other.players[1], // a player of another team
      };

      const res = await validate(tactic.id, { teamId: team.id, assignments: mapping }).expect(200);

      expect(res.body.valid).toBe(false);
      expect(res.body.problems).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Slot SETTER_1 needs a SETTER'),
          expect.stringContaining('is not an active player of this team'),
        ]),
      );
    });

    it('reports unknown slots and a tactic without steps', async () => {
      const draft = (await create({ name: 'Draft', formation: 'FIVE_ONE' }).expect(201)).body;
      const team = await createTeamWithRoster(ctx, alice, 'Mine');

      const res = await validate(draft.id, {
        teamId: team.id,
        assignments: { ...assignments(team.players), GOALKEEPER: team.players[0] },
      }).expect(200);

      expect(res.body.problems).toEqual(['The tactic has no steps', 'Unknown slot GOALKEEPER']);
    });

    it('404 for an unknown team or someone elses tactic, 400 for a malformed body', async () => {
      const tactic = await createValid();
      const team = await createTeamWithRoster(ctx, alice, 'Mine');

      await validate(tactic.id, { teamId: 99999, assignments: {} }).expect(404);
      await validate(tactic.id, { teamId: team.id, assignments: assignments(team.players) }, bob).expect(404);
      await validate(tactic.id, { teamId: team.id }).expect(400);
    });
  });
});
