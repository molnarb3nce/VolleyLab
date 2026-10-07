import { Formation, PlayerRole, Slot } from '@prisma/client';
import { FORMATIONS, PLAYER_ROLES, SLOTS } from './formations';

/**
 * The formation constants mirror the Prisma enums. This test fails when the
 * schema and the constants drift apart (requires `prisma generate`).
 */
describe('formation constants vs Prisma enums', () => {
  it('Formation values match', () => {
    expect([...FORMATIONS].sort()).toEqual(Object.values(Formation).sort());
  });

  it('Slot values match', () => {
    expect([...SLOTS].sort()).toEqual(Object.values(Slot).sort());
  });

  it('PlayerRole values match', () => {
    expect([...PLAYER_ROLES].sort()).toEqual(Object.values(PlayerRole).sort());
  });
});
