import { config } from 'dotenv';
import { resolve } from 'path';

/**
 * Loads .env.test (overriding anything already set) and refuses to run if the
 * database URL does not point at the dedicated "test" schema. This protects the
 * development data from being truncated by the e2e tests.
 */
export function loadTestEnv(): void {
  config({ path: resolve(__dirname, '..', '.env.test'), override: true, quiet: true });
  const url = process.env.DATABASE_URL ?? '';
  if (!/[?&]schema=test(&|$)/.test(url)) {
    throw new Error('e2e tests refuse to run: DATABASE_URL must use schema=test');
  }
}
