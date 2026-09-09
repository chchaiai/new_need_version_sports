import type { Pool } from 'pg';
import type { CertificationKind } from '../../../domain/certification-kind.ts';
import type { CertificationKindRepository } from '../../../application/ports/certification-kind-repository.ts';
import { fromPersistence, toPersistence } from '../certification-kind-mapper.ts';
import type { TransactionScope } from '../../../../../shared/application/transactions/transaction-runner.ts';
import type { PostgresTransactionRunner } from '../../../../../shared/infrastructure/postgres.ts';
export class PostgresCertificationKindRepository implements CertificationKindRepository {
  private readonly pool: Pool;
  private readonly transactions: PostgresTransactionRunner;
  constructor(pool: Pool, transactions: PostgresTransactionRunner) { this.pool = pool; this.transactions = transactions; }
  async save(id: string, kind: CertificationKind, scope: TransactionScope): Promise<void> {
    try {
      await this.transactions.client(scope).query(
        'INSERT INTO foundation_probe.certification_kind (id, certification_kind) VALUES ($1, $2)', [id, toPersistence(kind)]);
    } catch { throw new Error('CERTIFICATION_PERSISTENCE_WRITE_FAILED'); }
  }
  async find(id: string): Promise<CertificationKind | undefined> {
    let rows: unknown[];
    try { ({ rows } = await this.pool.query('SELECT certification_kind FROM foundation_probe.certification_kind WHERE id = $1', [id])); }
    catch { throw new Error('CERTIFICATION_PERSISTENCE_READ_FAILED'); }
    return rows.length === 0 ? undefined : fromPersistence(rows[0]);
  }
}
