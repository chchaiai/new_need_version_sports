import type { TransactionScope } from '../../../../shared/application/transactions/transaction-runner.ts';

/** Internal facts, not HTTP DTOs. All times are server epoch milliseconds.
 * Bootstrap adapters only; caller must authenticate/authorize in the same scope.
 */
export interface SessionFacts {
  readonly sessionId: string;
  readonly organizationId: string;
  readonly studentSubjectId: string;
  readonly semesterId: string;
  readonly courseId: string;
  readonly enrollmentId: string;
  readonly ruleVersionId: string;
  readonly makeupAuthorizationId: string | null;
  readonly businessDate: string;
  readonly thresholdMinutes: 30 | 45 | 60;
  readonly status: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  readonly startedAtMs: number;
  readonly completedAtMs: number | null;
  readonly actualDurationMs: number | null;
  readonly stateVersion: number;
  readonly activeIntervals: readonly Readonly<{ openedAtMs: number; closedAtMs: number | null }>[];
}

export type SessionAccessFailureCode = 'SESSION_NOT_FOUND' | 'ACTIVE_SESSION_EXISTS' | 'SESSION_FACTS_INCONSISTENT';
export class SessionAccessFailure extends Error {
  readonly code: SessionAccessFailureCode;
  constructor(code: SessionAccessFailureCode) { super(code); this.name = 'SessionAccessFailure'; this.code = code; }
}

export interface SessionAccess {
  /** Locks the Session until caller transaction ends; never supplies cross-organization facts. */
  facts(scope: TransactionScope, organizationId: string, sessionId: string): Promise<SessionFacts>;
  /** For account deletion. Same owner serialization must also be taken by Session start.
   * Must run after live identity locks; not a stale preflight read or an authorization grant.
   */
  assertNoActive(scope: TransactionScope, organizationId: string, studentSubjectId: string): Promise<void>;
}
