import { Prisma } from '@prisma/client';

const hasCode = (error: unknown, code: string): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;

/** Unique constraint violation (Prisma error P2002). */
export const isUniqueViolation = (error: unknown): boolean => hasCode(error, 'P2002');

/** Foreign key constraint violation (Prisma error P2003). */
export const isForeignKeyViolation = (error: unknown): boolean => hasCode(error, 'P2003');
