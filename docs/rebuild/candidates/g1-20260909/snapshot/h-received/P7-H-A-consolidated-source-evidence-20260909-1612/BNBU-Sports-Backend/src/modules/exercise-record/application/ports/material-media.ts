import type { TransactionScope } from '../../../../shared/application/transactions/transaction-runner.ts';

/** Record-owned structural consumer; composition root supplies the Media implementation. */
export interface MaterialMediaFacts {
  id: string; organizationId: string; ownerSubjectId: string; sessionId: string;
  status: 'ALLOCATED' | 'UPLOADED' | 'VERIFIED' | 'BOUND' | 'REJECTED' | 'EXPIRED';
  completedAtUs: bigint | null; verifiedAtUs: bigint | null; recordId: string | null;
  checksumSha256: string | null;
}
export interface MaterialMediaAccess {
  lock(scope: TransactionScope, org: string, owner: string, session: string, ids: readonly string[]): Promise<readonly MaterialMediaFacts[]>;
}
