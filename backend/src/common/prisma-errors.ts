import { Prisma } from '@prisma/client';

/** True for a unique constraint violation (Prisma error P2002). */
export const isUniqueViolation = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
