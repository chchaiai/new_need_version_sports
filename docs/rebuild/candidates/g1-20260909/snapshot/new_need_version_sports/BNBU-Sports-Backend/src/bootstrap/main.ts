import { readConfig } from './config.ts';
import { createPool } from '../shared/infrastructure/postgres.ts';
import { createServer } from './server.ts';
const config = readConfig(process.env);
const pool = createPool(config.database);
const app = createServer(async () => { await pool.query('SELECT 1'); });
let closing = false;
async function shutdown() {
  if (closing) return;
  closing = true;
  await app.close();
  await pool.end();
}
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => {
  void shutdown().catch(() => { process.exitCode = 1; });
});
try { await app.listen({ host: config.host, port: config.port }); }
catch { await shutdown(); throw new Error('FOUNDATION_START_FAILED'); }
