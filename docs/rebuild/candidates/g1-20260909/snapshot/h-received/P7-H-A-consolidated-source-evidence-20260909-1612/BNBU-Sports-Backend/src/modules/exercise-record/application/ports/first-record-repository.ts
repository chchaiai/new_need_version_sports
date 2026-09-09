import type { TransactionScope } from '../../../../shared/application/transactions/transaction-runner.ts';
import type { FirstMaterialReceipt, FirstWindow } from '../../domain/first-material.ts';
import type { MaterialDeclaration } from '../../domain/material-declarations.ts';

export interface FirstRecordDetails {
  materialId: string;
  commandId: string;
  category: 'COURSE_RELATED' | 'OTHER';
  description: string;
  /** Same ordered set as receipt.requiredAssetIds; labels are not proof of capture. */
  members: readonly MaterialDeclaration[];
}
export interface StoredFirstRecord {
  recordId: string; materialId: string; organizationId: string; ownerSubjectId: string; sessionId: string;
  commandId: string; category: 'COURSE_RELATED' | 'OTHER'; description: string;
  batchId: string; acceptedAtUs: bigint; transferDueAtUs: bigint | null; window: FirstWindow;
  offlineExplanation: string | null;
  members: readonly MaterialDeclaration[];
}
export interface FirstRecordRepository {
  /** Caller holds Session/owner locks; receipt was evaluated from authoritative Session facts. */
  insert(scope: TransactionScope, receipt: FirstMaterialReceipt, details: FirstRecordDetails): Promise<void>;
  /** Immutable routing snapshot, before taking media locks; not an authorization decision. */
  reference(scope: TransactionScope, organizationId: string, sessionId: string): Promise<StoredFirstRecord | null>;
  findLocked(scope: TransactionScope, organizationId: string, sessionId: string): Promise<StoredFirstRecord | null>;
}
