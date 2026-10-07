import { bearer, createTestApp, registerUser, resetDatabase, TestContext } from './helpers';

describe('Auth (e2e)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  beforeEach(() => resetDatabase(ctx.prisma));
  afterAll(() => ctx.app.close());

  it('GET /health is public', async () => {
    await ctx.http().get('/health').expect(200).expect({ status: 'ok' });
  });

  describe('POST /auth/register', () => {
    it('registers a user and returns a token', async () => {
      const res = await ctx
        .http()
        .post('/auth/register')
        .send({ email: 'Coach@Example.com', password: 'password123' })
        .expect(201);

      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(res.body.user.email).toBe('coach@example.com'); // normalized
      expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    });

    it('rejects a duplicate email (case-insensitive)', async () => {
      await registerUser(ctx, 'coach@example.com');

      await ctx
        .http()
        .post('/auth/register')
        .send({ email: 'COACH@example.com', password: 'password123' })
        .expect(409);
    });

    it.each([
      ['an invalid email', { email: 'not-an-email', password: 'password123' }],
      ['a short password', { email: 'a@a.com', password: 'short' }],
      ['a missing password', { email: 'a@a.com' }],
      ['unknown properties', { email: 'a@a.com', password: 'password123', isAdmin: true }],
    ])('rejects %s', async (_name, body) => {
      await ctx.http().post('/auth/register').send(body).expect(400);
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      await registerUser(ctx, 'coach@example.com', 'password123');
    });

    it('returns a token for valid credentials', async () => {
      const res = await ctx
        .http()
        .post('/auth/login')
        .send({ email: 'coach@example.com', password: 'password123' })
        .expect(201);

      expect(res.body.accessToken).toEqual(expect.any(String));
    });

    it('rejects a wrong password', async () => {
      await ctx
        .http()
        .post('/auth/login')
        .send({ email: 'coach@example.com', password: 'wrong-password' })
        .expect(401);
    });

    it('rejects an unknown email', async () => {
      await ctx
        .http()
        .post('/auth/login')
        .send({ email: 'nobody@example.com', password: 'password123' })
        .expect(401);
    });
  });

  describe('GET /auth/me', () => {
    it('returns the current user for a valid token', async () => {
      const user = await registerUser(ctx, 'coach@example.com');

      const res = await ctx.http().get('/auth/me').set(bearer(user)).expect(200);

      expect(res.body).toEqual({ id: user.id, email: 'coach@example.com' });
    });

    it('rejects a request without a token', async () => {
      await ctx.http().get('/auth/me').expect(401);
    });

    it('rejects an invalid token', async () => {
      await ctx.http().get('/auth/me').set('Authorization', 'Bearer garbage').expect(401);
    });

  });
});
