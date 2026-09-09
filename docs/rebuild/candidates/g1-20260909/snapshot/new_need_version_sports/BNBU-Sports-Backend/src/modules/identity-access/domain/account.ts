import { ensure } from '../../../shared/domain/failure.ts';
export type Role = 'STUDENT' | 'TEACHER' | 'ADMIN';
export interface Account {
    subjectId: string;
    organizationId: string;
    role: Role;
    displayName: string;
    email: string;
    verified: boolean;
    accessState: 'ACTIVE' | 'DISABLED';
    adminKind: 'SUPER' | 'SUB' | null;
    version: number;
    passwordHash: string | null;
    passwordVersion: number;
    mustChangePassword: boolean;
}
export interface Session {
    id: string;
    subjectId: string;
    organizationId: string;
    accessDigest: string;
    refreshDigest: string;
    passwordVersion: number;
    issuedAt: number;
    accessExpiresAt: number;
    expiresAt: number;
    revokedAt: number | null;
}
export function assertSession(account: Account, session: Session, now: number, refresh: boolean) {
    ensure(account.accessState === 'ACTIVE', 'ACCOUNT_DISABLED', 403);
    ensure(session.subjectId === account.subjectId && session.organizationId === account.organizationId, 'INVALID_CREDENTIALS', 401);
    ensure(session.revokedAt === null && session.passwordVersion === account.passwordVersion, 'INVALID_CREDENTIALS', 401);
    ensure(now < (refresh ? session.expiresAt : session.accessExpiresAt), 'TOKEN_EXPIRED', 401);
}
export function assertPasswordAccount(account: Account | null): asserts account is Account {
    ensure(account && account.role !== 'STUDENT' && account.passwordHash !== null && account.verified, 'INVALID_CREDENTIALS', 401);
}
