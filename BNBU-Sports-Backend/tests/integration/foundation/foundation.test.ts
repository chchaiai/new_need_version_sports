import { afterAll, beforeAll, expect, test } from 'vitest';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { writeFileSync } from 'node:fs';
import { createServer as createTcpServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { readConfig } from '../../../src/bootstrap/config.ts';
import { createPool, PostgresTransactionRunner } from '../../../src/shared/infrastructure/postgres.ts';
import { createServer } from '../../../src/bootstrap/server.ts';
import { migrate } from '../../../src/bootstrap/migrate.ts';
import { readContract } from '../../../src/bootstrap/contract-input.mjs';
import { createContractValidator } from '../../../src/shared/api/contract-validator.ts';
import type { TransactionScope } from '../../../src/shared/application/transactions/transaction-runner.ts';
import { PostgresCertificationKindRepository } from '../../../src/modules/applications-certification/infrastructure/persistence/repositories/postgres-certification-kind-repository.ts';
import { fromPersistence } from '../../../src/modules/applications-certification/infrastructure/persistence/certification-kind-mapper.ts';
import { CertificationKindProbe } from '../../../src/modules/applications-certification/application/certification-kind-probe.ts';
import { CertificationKind } from '../../../src/modules/applications-certification/domain/certification-kind.ts';
import { toCertificationCommand, toCertificationWire } from '../../../src/modules/applications-certification/api/certification-kind-mapper.ts';
const config = readConfig(process.env);
const pool = createPool(config.database);
const transactions = new PostgresTransactionRunner(pool);
const repository = new PostgresCertificationKindRepository(pool, transactions);
const probe = new CertificationKindProbe(repository, transactions);
const validator = createContractValidator(readContract().document.components);
beforeAll(async () => {
  const identity = await pool.query('SELECT current_database() AS db, current_user AS actor, version() AS version');
  expect(identity.rows[0].db).toBe('p7_foundation');
  expect(identity.rows[0].actor).toBe('p7_foundation');
  expect(identity.rows[0].version).toContain('PostgreSQL 17.6');
  writeFileSync('evidence/phase7/7.0/postgres-runtime.json', JSON.stringify(identity.rows[0], null, 2) + '\n');
  expect((await pool.query("SELECT to_regclass('foundation_probe.certification_kind') AS t")).rows[0].t).toBeNull();
  await migrate(config, 'up');
});
afterAll(async () => { await pool.end(); });
test.each(['SCHOOL_TEAM', 'STUDENT_CLUB'] as const)('real DB four-layer roundtrip %s', async (kind) => {
  const id = kind === 'SCHOOL_TEAM' ? '00000000-0000-4000-8000-000000000001' : '00000000-0000-4000-8000-000000000002';
  const command = toCertificationCommand(validator, id, kind);
  const result = await probe.execute(command);
  expect(toCertificationWire(result)).toBe(kind);
  expect(toCertificationWire((await probe.read(id))!)).toBe(kind);
  // A separate physical connection observes a committed persisted row.
  const reconnect = createPool(config.database);
  try { expect((await reconnect.query('SELECT certification_kind FROM foundation_probe.certification_kind WHERE id=$1', [id])).rows[0].certification_kind).toBe(kind); }
  finally { await reconnect.end(); }
});
test.each([null, 'UNKNOWN'])('database constraint rejects %j', async kind => {
  await expect(pool.query('INSERT INTO foundation_probe.certification_kind VALUES ($1,$2)', ['00000000-0000-4000-8000-000000000003', kind])).rejects.toMatchObject({ code: kind === null ? '23502' : '23514' });
  expect(await probe.read('00000000-0000-4000-8000-000000000003')).toBeUndefined();
});
test('unknown database-returned value fails closed in Persistence Mapper', async () => {
  // Never drop a constraint to inject corrupt data: use an actual PostgreSQL row projection.
  const bad = await pool.query("SELECT 'UNRECOGNIZED'::text AS certification_kind");
  expect(() => fromPersistence(bad.rows[0])).toThrow('PERSISTENCE_INVARIANT_BROKEN');
});
test('failure after INSERT rolls back, invalidates scope, and preserves original error', async () => {
  const id = '00000000-0000-4000-8000-000000000004';
  const failure = new Error('INJECTED_AFTER_INSERT');
  let savedScope: TransactionScope | undefined;
  await expect(transactions.run(async scope => {
    savedScope = scope;
    await repository.save(id, CertificationKind.from('SCHOOL_TEAM'), scope);
    throw failure;
  })).rejects.toBe(failure);
  expect(await repository.find(id)).toBeUndefined();
  expect(() => transactions.client(savedScope!)).toThrow('TRANSACTION_SCOPE_INACTIVE');
});
test('database write error rolls back whole foundation transaction', async () => {
  const id = '00000000-0000-4000-8000-000000000005';
  await expect(transactions.run(async scope => {
    await repository.save(id, CertificationKind.from('SCHOOL_TEAM'), scope);
    await repository.save(id, CertificationKind.from('STUDENT_CLUB'), scope);
  })).rejects.toThrow('CERTIFICATION_PERSISTENCE_WRITE_FAILED');
  expect(await repository.find(id)).toBeUndefined();
});
test('concurrent inserts obey unique constraint and leave one complete row', async () => {
  const id = '00000000-0000-4000-8000-000000000006';
  const results = await Promise.allSettled(['SCHOOL_TEAM', 'STUDENT_CLUB'].map(kind =>
    probe.execute(toCertificationCommand(validator, id, kind))));
  expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
  expect(results.filter(r => r.status === 'rejected')).toHaveLength(1);
  expect((await pool.query('SELECT count(*)::int AS n FROM foundation_probe.certification_kind WHERE id=$1', [id])).rows[0].n).toBe(1);
});
test('real HTTP readiness reaches PostgreSQL and no business API is registered', async () => {
  let reached = 0;
  const app = createServer(async () => { await pool.query('SELECT 1'); reached++; });
  try {
    const url = await app.listen({ host: '127.0.0.1', port: 0 });
    const response = await fetch(url + '/health/ready');
    expect(response.status).toBe(200); expect(await response.json()).toEqual({ status: 'ready' });
    expect(reached).toBe(1);
    expect((await fetch(url + '/api/v1/me')).status).toBe(404);
  } finally { await app.close(); }
});
test('real refused database connection returns 503 without connection details', async () => {
  const badPool = createPool({ ...config.database, host: '127.0.0.1', port: 1 });
  const app = createServer(async () => { await badPool.query('SELECT 1'); });
  try {
    const url = await app.listen({ host: '127.0.0.1', port: 0 });
    const response = await fetch(url + '/health/ready');
    expect(response.status).toBe(503); expect(await response.json()).toEqual({ status: 'unavailable' });
    expect((await fetch(url + '/health/live')).status).toBe(200);
  } finally { await app.close(); await badPool.end(); }
});
test('configuration fails before startup; secrets are absent from error text', () => {
  expect(() => readConfig({})).toThrow('MISSING_REQUIRED_CONFIGURATION');
  expect(() => readConfig({ ...process.env, PGPORT: 'invalid' })).toThrow('INVALID_PORT_CONFIGURATION');
  expect(() => readConfig({ ...process.env, PGPORT: '0' })).toThrow('INVALID_PORT_CONFIGURATION');
});
test('failed transaction connection exposes only a stable Port error', async () => {
  const badPool = createPool({ ...config.database, host: '127.0.0.1', port: 1 });
  let workRan = false;
  try {
    await expect(new PostgresTransactionRunner(badPool).run(async () => { workRan = true; }))
      .rejects.toMatchObject({ name: 'TransactionUnavailableError', message: 'TRANSACTION_UNAVAILABLE' });
    expect(workRan).toBe(false);
  } finally { await badPool.end(); }
});
test('native Node composition root starts and shuts down over real HTTP', async () => {
  const reservation = createTcpServer();
  reservation.listen(0, '127.0.0.1');
  await once(reservation, 'listening');
  const address = reservation.address();
  if (!address || typeof address === 'string') throw new Error('PORT_RESERVATION_FAILED');
  await new Promise<void>((resolve, reject) => reservation.close(error => error ? reject(error) : resolve()));
  const child = spawn(process.execPath, ['src/bootstrap/main.ts'], {
    env: { ...process.env, PORT: String(address.port), LISTEN_HOST: '127.0.0.1' }, stdio: 'ignore'
  });
  const closed = once(child, 'close');
  let ready = false;
  try {
    for (let attempt = 0; attempt < 60 && child.exitCode === null; attempt++) {
      try {
        const response = await fetch('http://127.0.0.1:' + address.port + '/health/ready', { signal: AbortSignal.timeout(250) });
        if (response.status === 200 && (await response.json()).status === 'ready') { ready = true; break; }
      } catch { /* The actual child has not begun listening yet. */ }
      await delay(50);
    }
    expect(ready).toBe(true);
  } finally {
    child.kill('SIGTERM');
    const force = setTimeout(() => child.kill('SIGKILL'), 2000);
    try { expect(await closed).toEqual([0, null]); } finally { clearTimeout(force); }
  }
});
test('migration down and empty rebuild use the real database', async () => {
  await migrate(config, 'down');
  expect((await pool.query("SELECT to_regclass('foundation_probe.certification_kind') AS t")).rows[0].t).toBeNull();
  await migrate(config, 'up');
  expect((await pool.query('SELECT count(*)::int AS n FROM foundation_probe.certification_kind')).rows[0].n).toBe(0);
});
