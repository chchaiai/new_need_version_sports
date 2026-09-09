import type { TransactionScope } from '../../../../shared/application/transactions/transaction-runner.ts';
import type { ReplayStore } from '../../../../shared/application/runtime.ts';
import type { Account, Session } from '../../domain/account.ts';
import type { StudentIdentity } from '../public/identity.ts';
export interface Challenge {
    id: string;
    organizationId: string;
    subjectId: string | null;
    purpose: string;
    emailDigest: string;
    sealedEmail: string | null;
    codeDigest: string;
    attempts: number;
    maxAttempts: number;
    createdAt: number;
    expiresAt: number;
    consumedAt: number | null;
}
export interface NewStudentIdentity {
    subjectId: string;
    organizationId: string;
    email: string;
    studentNumber: string;
    name: string;
    gender: 'FEMALE' | 'MALE';
    gradeYear: number;
    college: string | null;
    major: string | null;
    administrativeClass: string | null;
    now: number;
}
export interface IdentityRepository extends ReplayStore {
    linkReplayOwner(scope: TransactionScope, subject: string, operation: string, keyDigest: string, ownerId: string): Promise<void>;
    eraseAccount(scope: TransactionScope, subjectId: string, emailDigest: string, challengeSubject: string, now: number): Promise<void>;
    reserveClosure: ReplayStore['reserve'];
    finishClosure: ReplayStore['finish'];
    lockLiveStudentOwner(scope: TransactionScope, organizationId: string, subjectId: string): Promise<boolean>;
    person(scope: TransactionScope, organizationId: string, subjectId: string): Promise<{
        userId: string;
        displayName: string;
        role: 'STUDENT' | 'TEACHER' | 'ADMIN';
    } | null>;
    affectedRecipients(scope: TransactionScope, organizationId: string): Promise<string[]>;
    createStudent(scope: TransactionScope, input: NewStudentIdentity): Promise<void>;
    account(scope: TransactionScope, subjectId: string): Promise<Account | null>;
    login(scope: TransactionScope, organizationId: string, loginType: string, identifier: string): Promise<Account | null>;
    emailInUse(scope: TransactionScope, organizationId: string, email: string): Promise<boolean>;
    email(scope: TransactionScope, organizationId: string, email: string): Promise<Account | null>;
    refreshSubject(scope: TransactionScope, digest: string, keyDigest: string): Promise<string | null>;
    session(scope: TransactionScope, digest: string, refresh: boolean): Promise<Session | null>;
    saveSession(scope: TransactionScope, session: Session): Promise<void>;
    rotate(scope: TransactionScope, session: Session): Promise<void>;
    revoke(scope: TransactionScope, subjectId: string, now: number, reason: string, exceptId: string | null): Promise<void>;
    revokeOne(scope: TransactionScope, sessionId: string, now: number): Promise<void>;
    password(scope: TransactionScope, subjectId: string, encoded: string, now: number, currentSessionId: string | null): Promise<void>;
    throttle(scope: TransactionScope, bucket: string, now: number, windowMilliseconds: number, limit: number): Promise<boolean>;
    saveChallenge(scope: TransactionScope, challenge: Challenge): Promise<void>;
    challenge(scope: TransactionScope, id: string): Promise<Challenge | null>;
    peekChallenge(scope: TransactionScope, id: string): Promise<Challenge | null>;
    changeEmail(scope: TransactionScope, subjectId: string, email: string, now: number): Promise<void>;
    failChallenge(scope: TransactionScope, id: string): Promise<void>;
    consumeChallenge(scope: TransactionScope, id: string, now: number): Promise<void>;
    currentStudentProjection(scope: TransactionScope, subjectId: string, organizationId: string): Promise<StudentIdentity | null>;
    student(scope: TransactionScope, subjectId: string, organizationId: string): Promise<StudentIdentity | null>;
    teacher(scope: TransactionScope, subjectId: string, organizationId: string): Promise<{
        subjectId: string;
        name: string;
    } | null>;
}
