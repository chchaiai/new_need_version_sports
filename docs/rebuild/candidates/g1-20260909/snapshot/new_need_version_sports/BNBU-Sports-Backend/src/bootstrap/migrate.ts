import { runner } from 'node-pg-migrate';
import { fileURLToPath } from 'node:url';
import type { FoundationConfig } from './config.ts';
export async function migrate(config: FoundationConfig, direction: 'up' | 'down') {
  // A destructive down is exposed only to the explicitly named disposable Foundation database.
  if (config.database.database !== 'p7_foundation' || config.database.user !== 'p7_foundation')
    throw new Error('FOUNDATION_TEST_DATABASE_REQUIRED');
  return runner({ databaseUrl: config.database, direction,
    dir: fileURLToPath(new URL('../../migrations', import.meta.url)),
    migrationsTable: 'foundation_migrations', migrationsSchema: 'public',
    checkOrder: true, count: 1, log: () => {},
    logger: { info: () => {}, warn: () => {}, error: () => {} } });
}
