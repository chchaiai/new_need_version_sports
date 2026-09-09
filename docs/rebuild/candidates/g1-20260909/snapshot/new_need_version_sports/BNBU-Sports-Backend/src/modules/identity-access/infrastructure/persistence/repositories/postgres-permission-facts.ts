import type { TransactionScope } from '../../../../../shared/application/transactions/transaction-runner.ts';
import { PostgresTransactionRunner } from '../../../../../shared/infrastructure/postgres.ts';
import type { PermissionFacts } from '../../../application/ports/dependencies.ts';
import type { Account } from '../../../domain/account.ts';
import { ADMIN_PERMISSIONS } from '../../../domain/permissions.ts';
export class PostgresPermissionFacts implements PermissionFacts {
    private readonly tx: PostgresTransactionRunner;
    constructor(tx: PostgresTransactionRunner) { this.tx = tx; }
    async permissions(scope: TransactionScope, account: Account): Promise<string[]> {
        if (account.role !== 'ADMIN')
            return [];
        if (account.adminKind === 'SUPER')
            return [...ADMIN_PERMISSIONS];
        const rows = (await this.tx.client(scope).query('SELECT permission FROM identity_access.admin_permission WHERE subject_id=$1 ORDER BY permission FOR SHARE', [account.subjectId])).rows;
        return rows.map(r => r.permission as string);
    }
}
