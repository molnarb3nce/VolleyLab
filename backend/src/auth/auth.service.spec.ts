import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const prisma = { user: { findUnique: jest.fn(), create: jest.fn() } };
  const jwt = { sign: jest.fn().mockReturnValue('signed-token') };
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(prisma as never, jwt as never);
  });

  describe('register', () => {
    it('stores a bcrypt hash, never the plain password, and returns a token', async () => {
      prisma.user.create.mockImplementation(({ data }) => Promise.resolve({ id: 1, ...data }));

      const result = await service.register({ email: 'a@a.com', password: 'password123' });

      const stored = prisma.user.create.mock.calls[0][0].data;
      expect(stored.passwordHash).not.toBe('password123');
      expect(await bcrypt.compare('password123', stored.passwordHash)).toBe(true);
      expect(result).toEqual({ accessToken: 'signed-token', user: { id: 1, email: 'a@a.com' } });
      expect(jwt.sign).toHaveBeenCalledWith({ sub: 1, email: 'a@a.com' });
    });

    it('turns a duplicate email into a conflict', async () => {
      prisma.user.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('duplicate', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(
        service.register({ email: 'a@a.com', password: 'password123' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('login', () => {
    it('returns a token for the correct password', async () => {
      const passwordHash = await bcrypt.hash('password123', 4);
      prisma.user.findUnique.mockResolvedValue({ id: 7, email: 'a@a.com', passwordHash });

      const result = await service.login({ email: 'a@a.com', password: 'password123' });

      expect(result.accessToken).toBe('signed-token');
      expect(result.user).toEqual({ id: 7, email: 'a@a.com' });
    });

    it('rejects a wrong password', async () => {
      const passwordHash = await bcrypt.hash('password123', 4);
      prisma.user.findUnique.mockResolvedValue({ id: 7, email: 'a@a.com', passwordHash });

      await expect(
        service.login({ email: 'a@a.com', password: 'wrong-password' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects an unknown email with the same error as a wrong password', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const error = await service
        .login({ email: 'nobody@a.com', password: 'password123' })
        .catch((e) => e);

      expect(error).toBeInstanceOf(UnauthorizedException);
      expect(error.message).toBe('Invalid email or password');
    });
  });
});

