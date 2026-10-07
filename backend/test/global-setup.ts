import { execSync } from 'child_process';
import { resolve } from 'path';
import { loadTestEnv } from './load-test-env';

/** Applies all migrations to the "test" schema once before the e2e run. */
export default function globalSetup(): void {
  loadTestEnv();
  execSync('npx prisma migrate deploy', {
    cwd: resolve(__dirname, '..'),
    env: process.env,
    stdio: 'inherit',
  });
}
