import type { TransactionScope } from '../../../../shared/application/transactions/transaction-runner.ts';
import type { SessionFactsRepository } from './session-facts-repository.ts';

export interface NewSession {
  sessionId: string; organizationId: string; studentSubjectId: string; semesterId: string;
  courseId: string; enrollmentId: string; ruleVersionId: string; makeupAuthorizationId: string | null;
  thresholdMinutes: 30 | 45 | 60; startedAtMs: number; commandId: string;
}
export interface SessionCommandRepository extends SessionFactsRepository {
  insert(scope: TransactionScope, input: NewSession): Promise<void>;
  transition(scope: TransactionScope, org: string, student: string, sessionId: string,
    action: 'PAUSE' | 'RESUME' | 'COMPLETE', expectedVersion: number, nowMs: number, commandId: string): Promise<void>;
  /** Immutable routing facts only; does not acquire Session row lock ahead of Course. */
  reference(scope: TransactionScope, org: string, sessionId: string): Promise<{
    studentSubjectId: string; courseId: string; startedAtMs: number;
  } | null>;
}
export interface SessionActor { subjectId: string; organizationId: string; role: 'STUDENT' | 'TEACHER' | 'ADMIN' }
export interface SessionIdentity {
  authenticate(token: string, scope: TransactionScope, purpose: 'BUSINESS' | 'AUTHENTICATION_ONLY'): Promise<SessionActor>;
}
export interface SessionMode {
  /** Holds Z's mode lock before replay locks, without rejecting an exact committed replay. */
  read(scope: TransactionScope, organizationId: string): Promise<unknown>;
}
export interface SessionAdmissionPort {
  authorizeSessionStart(scope: TransactionScope, input: {
    accessToken: string; courseId: string; expectedRuleVersionId: string; makeupAuthorizationId: string | null;
  }): Promise<{
    organizationId: string; studentSubjectId: string; enrollmentId: string; enrollmentVersion: number; admittedAt: number;
    course: { courseId: string; semesterId: string; ruleVersionId: string; thresholdMinutes: 30 | 45 | 60 };
    makeupAuthorization: { authorizationId: string; courseId: string; enrollmentId: string; ruleVersionId: string;
      startsAt: number; endsAtExclusive: number; authorizedAt: number } | null;
  }>;
}
export interface ExistingSessionCoursePort {
  assertExistingChain(scope: TransactionScope, org: string, courseId: string, serverAcceptedAt: number): Promise<unknown>;
}
export interface SessionAudit {
  append(scope: TransactionScope, event: { organizationId: string; actorSubjectId: string;
    action: string; resourceId: string; requestId: string }): Promise<void>;
}
export interface SessionReplayStore {
  reserve(scope: TransactionScope, subject: string, operation: string, keyDigest: string, fingerprint: string): Promise<{
    fingerprint: string; result: string | null;
  }>;
  finish(scope: TransactionScope, subject: string, operation: string, keyDigest: string, result: string): Promise<void>;
}
export interface SessionSecrets {
  id(): string;
  digest(purpose: string, value: unknown): string;
  equal(left: string, right: string): boolean;
  seal(context: string, value: unknown): string;
  open<T>(context: string, value: string): T;
}
