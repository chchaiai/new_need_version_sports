import type { CertificationKind } from '../../domain/certification-kind.ts';
import type { TransactionScope } from '../../../../shared/application/transactions/transaction-runner.ts';
export interface CertificationKindRepository {
  save(id: string, kind: CertificationKind, scope: TransactionScope): Promise<void>;
  find(id: string): Promise<CertificationKind | undefined>;
}
