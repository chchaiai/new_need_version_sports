import { Pool, type PoolConfig, type PoolClient } from 'pg';
import { TransactionUnavailableError, type TransactionRunner, type TransactionScope } from '../application/transactions/transaction-runner.ts';
export function createPool(config: PoolConfig): Pool {
    return new Pool({ ...config, max: 4, connectionTimeoutMillis: 1500,
        idleTimeoutMillis: 1000, statement_timeout: 3000 });
}
export class PostgresTransactionRunner implements TransactionRunner {
    private readonly clients = new WeakMap<TransactionScope, PoolClient>();
    private readonly pool: Pool;
    constructor(pool: Pool) { this.pool = pool; }
    client(scope: TransactionScope): PoolClient {
        const client = this.clients.get(scope);
        if (!client)
            throw new Error('TRANSACTION_SCOPE_INACTIVE');
        return client;
    }
    run<T>(work: (scope: TransactionScope) => Promise<T>): Promise<T> { return this.perform(work, false); }
    snapshot<T>(work: (scope: TransactionScope) => Promise<T>): Promise<T> { return this.perform(work, true); }
    private async perform<T>(work: (scope: TransactionScope) => Promise<T>, snapshot: boolean): Promise<T> {
        let client: PoolClient;
        try {
            client = await this.pool.connect();
        }
        catch {
            throw new TransactionUnavailableError();
        }
        const scope: TransactionScope = Object.freeze({ scope: 'foundation-transaction' });
        this.clients.set(scope, client);
        let discard = false;
        try {
            try {
                await client.query(snapshot ? 'BEGIN ISOLATION LEVEL REPEATABLE READ' : 'BEGIN');
            }
            catch {
                throw new TransactionUnavailableError();
            }
            const result = await work(scope);
            try {
                await client.query('COMMIT');
            }
            catch {
                throw new TransactionUnavailableError();
            }
            return result;
        }
        catch (error) {
            try {
                await client.query('ROLLBACK');
            }
            catch {
                discard = true;
            }
            if (['40001', '40P01'].includes((error as {
                code?: string;
            }).code ?? ''))
                throw new TransactionUnavailableError();
            throw error;
        }
        finally {
            this.clients.delete(scope);
            client.release(discard);
        }
    }
}
