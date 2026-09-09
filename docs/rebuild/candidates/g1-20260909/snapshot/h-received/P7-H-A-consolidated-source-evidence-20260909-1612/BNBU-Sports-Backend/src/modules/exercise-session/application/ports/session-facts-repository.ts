import type { TransactionScope } from '../../../../shared/application/transactions/transaction-runner.ts';
import type { SessionFacts } from '../public/sessions.ts';

/** Persistence mapper returns business facts, never driver rows. */
export interface SessionFactsRepository {
  findLocked(scope: TransactionScope, organizationId: string, sessionId: string): Promise<SessionFacts | null>;
  /** Locks the owner even when no Session exists; start must use the identical lock key/order. */
  lockOwner(scope: TransactionScope, organizationId: string, studentSubjectId: string): Promise<void>;
  hasActive(scope: TransactionScope, organizationId: string, studentSubjectId: string): Promise<boolean>;
}
