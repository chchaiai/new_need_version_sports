import type { TransactionRunner, TransactionScope } from '../../../shared/application/transactions/transaction-runner.ts';
import { ensure, Failure, replay, type Clock, type Secrets, type PasswordHasher, type CommandIdentity } from '../../../shared/application/runtime.ts';
import { assertPasswordAccount, assertSession, type Account, type Session } from '../domain/account.ts';
import type { IdentityRepository } from './ports/identity-repository.ts';
import type { IdentityAudit, IdentityMode, PermissionFacts, OtpDelivery } from './ports/dependencies.ts';
import type { AccountClosureFacts, AccountPersonalDataCleanup } from './ports/account-closure.ts';
import type { ModeGovernanceIdentity } from './public/mode-governance.ts';
import type { RegistrationSessionAccess } from './public/registration-session.ts';
import type { StudentProjectionAccess } from './public/student-projection.ts';
import type { StudentOwnerLock } from './public/student-owner-lock.ts';
import type { ActorContext, IdentityAccess } from './public/identity.ts';
export interface ActorView {
    userId: string;
    organizationId: string;
    role: 'STUDENT' | 'TEACHER' | 'ADMIN';
    displayName: string;
    verifiedEmail: string;
    accountState: 'ACTIVE' | 'DISABLED';
    adminKind: 'SUPER' | 'SUB' | null;
    adminPermissions: string[];
    mustChangePassword: boolean;
    version: number;
}
export interface TokenPair {
    accessToken: string;
    refreshToken: string;
    accessExpiresAt: number;
    refreshExpiresAt: number;
    actor: ActorView;
}
export interface IdentityDependencies {
    transactions: TransactionRunner;
    repository: IdentityRepository;
    clock: Clock;
    secrets: Secrets;
    passwords: PasswordHasher;
    audit: IdentityAudit;
    mode: IdentityMode;
    permissions: PermissionFacts;
    delivery: OtpDelivery;
    organizationId: string;
    schoolEmailDomains: readonly string[];
    dummyPasswordHash: string;
    closureFacts?: AccountClosureFacts;
    personalDataCleanup?: AccountPersonalDataCleanup;
}
export class IdentityService implements IdentityAccess, ModeGovernanceIdentity, StudentOwnerLock, StudentProjectionAccess, RegistrationSessionAccess {
    private readonly d: IdentityDependencies;
    constructor(dependencies: IdentityDependencies) { this.d = dependencies; }
    async lockStudentOwner(scope: TransactionScope, organizationId: string, studentSubjectId: string): Promise<void> {
        const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        ensure(uuid.test(organizationId) && uuid.test(studentSubjectId), 'INVALID_REQUEST', 400);
        ensure(await this.d.repository.lockLiveStudentOwner(scope, organizationId, studentSubjectId), 'FORBIDDEN', 403);
    }
    async authorizeAdministration(token: string, scope: TransactionScope, permission: string | null, superOnly = false, targetId?: string, allowMissingTarget = false) {
        const actor = await this.authenticate(token, scope, 'AUTHENTICATION_ONLY'), account = (await this.d.repository.account(scope, actor.subjectId))!;
        ensure(account.role === 'ADMIN' && account.verified, 'FORBIDDEN', 403);
        ensure(!account.mustChangePassword, 'FIRST_PASSWORD_CHANGE_REQUIRED', 403);
        ensure(!superOnly || account.adminKind === 'SUPER', 'FORBIDDEN', 403);
        if (permission)
            ensure(account.adminKind === 'SUPER' || (await this.d.permissions.permissions(scope, account)).includes(permission), 'FORBIDDEN', 403);
        if (targetId) {
            const target = await this.d.repository.account(scope, targetId);
            ensure(target ? target.organizationId === actor.organizationId : allowMissingTarget, 'RESOURCE_NOT_FOUND', 404);
        }
        await this.d.mode.assertAllowed(scope, account.organizationId, account.role, 'BUSINESS');
        return actor;
    }
    async authorizeMode(scope: TransactionScope, token: string) {
        let actor: ActorContext;
        try {
            actor = await this.authenticate(token, scope, 'AUTHENTICATION_ONLY');
        }
        catch (error) {
            if (error instanceof Failure && ['INVALID_CREDENTIALS', 'TOKEN_EXPIRED'].includes(error.code))
                throw new Failure('AUTHENTICATION_REQUIRED', 401);
            if (error instanceof Failure && error.code === 'ACCOUNT_DISABLED')
                throw new Failure('FORBIDDEN', 403);
            throw error;
        }
        ensure(actor.role === 'ADMIN', 'FORBIDDEN', 403);
        ensure(!actor.mustChangePassword, 'FIRST_PASSWORD_CHANGE_REQUIRED', 403);
        const account = (await this.d.repository.account(scope, actor.subjectId))!;
        ensure(account.adminKind === 'SUPER' || (await this.d.permissions.permissions(scope, account)).includes('SYSTEM_MODE'), 'FORBIDDEN', 403);
        return { subjectId: actor.subjectId, organizationId: actor.organizationId };
    }
    async person(scope: TransactionScope, organizationId: string, subjectId: string) {
        const person = await this.d.repository.person(scope, organizationId, subjectId);
        ensure(person, 'DEPENDENCY_UNAVAILABLE', 503);
        return person;
    }
    async affectedRecipients(scope: TransactionScope, organizationId: string) {
        return this.d.repository.affectedRecipients(scope, organizationId);
    }
    private async current(scope: TransactionScope, token: string, refresh = false) {
        const session = await this.d.repository.session(scope, this.d.secrets.digest(refresh ? 'refresh' : 'access', token), refresh);
        ensure(session, 'INVALID_CREDENTIALS', 401);
        const account = await this.d.repository.account(scope, session.subjectId);
        ensure(account, 'INVALID_CREDENTIALS', 401);
        assertSession(account, session, this.d.clock.now(), refresh);
        return { session, account };
    }
    async authenticate(token: string, scope: TransactionScope, purpose: 'BUSINESS' | 'PASSWORD_CHANGE' | 'SECURITY_READ' | 'LOGOUT' | 'AUTHENTICATION_ONLY' = 'BUSINESS'): Promise<ActorContext> {
        const { account, session } = await this.current(scope, token);
        if (purpose !== 'AUTHENTICATION_ONLY')
            await this.d.mode.assertAllowed(scope, account.organizationId, account.role, purpose);
        if (purpose === 'BUSINESS') {
            ensure(!account.mustChangePassword, 'FIRST_PASSWORD_CHANGE_REQUIRED', 403);
            ensure(account.verified, 'FORBIDDEN', 403);
        }
        return { subjectId: account.subjectId, organizationId: account.organizationId, role: account.role,
            sessionId: session.id, accountVersion: account.version, mustChangePassword: account.mustChangePassword };
    }
    private async view(scope: TransactionScope, account: Account): Promise<ActorView> {
        return { userId: account.subjectId, organizationId: account.organizationId, role: account.role, displayName: account.displayName,
            verifiedEmail: account.email, accountState: account.accessState, adminKind: account.adminKind,
            adminPermissions: account.role === 'ADMIN' ? await this.d.permissions.permissions(scope, account) : [],
            mustChangePassword: account.mustChangePassword, version: account.version };
    }
    private async audit(scope: TransactionScope, account: Account, action: string, command: CommandIdentity) {
        await this.d.audit.append(scope, { organizationId: account.organizationId, actorSubjectId: account.subjectId,
            action, resourceId: account.subjectId, requestId: command.requestId });
    }
    private async pair(scope: TransactionScope, account: Account, sessionId?: string): Promise<TokenPair> {
        const now = this.d.clock.now(), accessToken = this.d.secrets.token(), refreshToken = this.d.secrets.token();
        const session: Session = { id: sessionId ?? this.d.secrets.id(), subjectId: account.subjectId, organizationId: account.organizationId,
            accessDigest: this.d.secrets.digest('access', accessToken), refreshDigest: this.d.secrets.digest('refresh', refreshToken),
            issuedAt: now, accessExpiresAt: now + 15 * 60000, expiresAt: now + 7 * 86400000, revokedAt: null, passwordVersion: account.passwordVersion };
        if (sessionId)
            await this.d.repository.rotate(scope, session);
        else
            await this.d.repository.saveSession(scope, session);
        return { accessToken, refreshToken, accessExpiresAt: session.accessExpiresAt, refreshExpiresAt: session.expiresAt, actor: await this.view(scope, account) };
    }
    private async throttle(subject: string, limit = 10, window = 60000) {
        // A separate short transaction commits attempts even if authentication later fails.
        const allowed = await this.d.transactions.run(scope => this.d.repository.throttle(scope, this.d.secrets.digest('auth-throttle', subject), this.d.clock.now(), window, limit));
        ensure(allowed, 'RATE_LIMITED', 429);
    }
    private async liveLoginPair(scope: TransactionScope, pair: TokenPair): Promise<TokenPair> {
        try {
            const { account, session } = await this.current(scope, pair.refreshToken, true);
            assertSession(account, session, this.d.clock.now(), false);
        } catch (error) {
            // Login operations declare INVALID_CREDENTIALS, not TOKEN_EXPIRED.
            if (error instanceof Failure && error.code === 'TOKEN_EXPIRED')
                throw new Failure('INVALID_CREDENTIALS', 401);
            throw error;
        }
        return pair;
    }
    async passwordLogin(input: {
        loginType: string;
        identifier: string;
        password: string;
    }, command: CommandIdentity) {
        const identifier = input.identifier.trim().toLowerCase();
        ensure(input.password.length > 0 && identifier.length > 0, 'INVALID_REQUEST', 400);
        await this.throttle('login/' + input.loginType + '/' + identifier);
        return this.d.transactions.run(async (scope) => {
            const account = await this.d.repository.login(scope, this.d.organizationId, input.loginType, identifier);
            const valid = await this.d.passwords.verify(input.password, account?.passwordHash ?? this.d.dummyPasswordHash);
            ensure(valid, 'INVALID_CREDENTIALS', 401);
            assertPasswordAccount(account);
            ensure(account.accessState === 'ACTIVE', 'ACCOUNT_DISABLED', 403);
            await this.d.mode.assertAllowed(scope, account.organizationId, account.role, 'SECURITY_READ');
            const pair = await replay(this.d.repository, this.d.secrets, scope, account.subjectId, 'createPasswordSession', command, { ...input, identifier }, async () => {
                const result = await this.pair(scope, account);
                await this.audit(scope, account, 'PASSWORD_LOGIN', command);
                return result;
            });
            return this.liveLoginPair(scope, pair);
        });
    }
    async me(token: string) {
        return this.d.transactions.run(async (scope) => {
            await this.authenticate(token, scope, 'SECURITY_READ');
            return this.view(scope, (await this.current(scope, token)).account);
        });
    }
    async changePassword(token: string, input: {
        currentPassword: string;
        newPassword: string;
        expectedVersion: number;
    }, command: CommandIdentity) {
        ensure(input.currentPassword.length > 0 && input.newPassword.length > 0, 'INVALID_REQUEST', 400);
        await this.throttle('password-change/' + this.d.secrets.digest('access', token));
        return this.d.transactions.run(async (scope) => {
            const actor = await this.authenticate(token, scope, 'PASSWORD_CHANGE');
            const account = await this.d.repository.account(scope, actor.subjectId);
            assertPasswordAccount(account);
            return replay(this.d.repository, this.d.secrets, scope, actor.subjectId, 'changeOwnPassword', command, input, async () => {
                ensure(account.version === input.expectedVersion, 'VERSION_CONFLICT', 412);
                ensure(await this.d.passwords.verify(input.currentPassword, account.passwordHash!), 'INVALID_CREDENTIALS', 401);
                await this.d.repository.password(scope, actor.subjectId, await this.d.passwords.hash(input.newPassword), this.d.clock.now(), actor.sessionId);
                await this.audit(scope, account, 'PASSWORD_CHANGED', command);
                return this.view(scope, (await this.d.repository.account(scope, actor.subjectId))!);
            });
        });
    }
    async refresh(token: string, command: CommandIdentity) {
        await this.throttle('refresh/' + this.d.secrets.digest('refresh', token));
        return this.d.transactions.run(async (scope) => {
            // Old refresh tokens may authorize only their exact committed rotation replay.
            const digest = this.d.secrets.digest('refresh', token);
            const owner = await this.d.repository.refreshSubject(scope, digest, this.d.secrets.digest('idempotency-key', command.key));
            if (owner) await this.d.repository.account(scope, owner);
            const result = await replay(this.d.repository, this.d.secrets, scope, digest, 'refreshSession', command, { refreshToken: token }, async () => {
                const { account, session } = await this.current(scope, token, true);
                await this.d.mode.assertAllowed(scope, account.organizationId, account.role, 'SECURITY_READ');
                await this.d.repository.linkReplayOwner(scope, digest, 'refreshSession', this.d.secrets.digest('idempotency-key', command.key), account.subjectId);
                const result = await this.pair(scope, account, session.id);
                await this.audit(scope, account, 'SESSION_REFRESHED', command);
                return result;
            });
            // Exact retries may not return an apparently live credential after disable/logout/reset.
            await this.current(scope, result.refreshToken, true);
            return result;
        });
    }
    async logout(token: string, all: boolean, command: CommandIdentity) {
        // Replays use the original bearer possession, never a client-supplied subject.
        return this.d.transactions.run(scope => replay(this.d.repository, this.d.secrets, scope, this.d.secrets.digest('access', token), all ? 'logoutAllSessions' : 'logoutCurrentSession', command, {}, async () => {
            const actor = await this.authenticate(token, scope, 'LOGOUT');
            const account = (await this.d.repository.account(scope, actor.subjectId))!;
            if (all)
                await this.d.repository.revoke(scope, actor.subjectId, this.d.clock.now(), 'LOGOUT_ALL', null);
            else
                await this.d.repository.revokeOne(scope, actor.sessionId, this.d.clock.now());
            await this.audit(scope, account, all ? 'LOGOUT_ALL' : 'LOGOUT_CURRENT', command);
            return { accepted: true as const };
        }));
    }
    async requestChallenge(input: {
        purpose: string;
        email: string;
    }, command: CommandIdentity) {
        const email = input.email.trim().toLowerCase();
        ensure(this.d.schoolEmailDomains.includes(email.split('@')[1] ?? ''), 'INVALID_REQUEST', 400);
        ensure(['STUDENT_LOGIN', 'STUDENT_EMAIL_BINDING', 'PASSWORD_RESET', 'CURRENT_EMAIL_VERIFICATION', 'NEW_EMAIL_VERIFICATION', 'ACCOUNT_DELETION'].includes(input.purpose), 'INVALID_REQUEST', 400);
        await this.throttle('challenge/' + email, 3, 60000);
        return this.d.transactions.run(scope => replay(this.d.repository, this.d.secrets, scope, this.d.secrets.digest('challenge-subject', email), 'requestAuthChallenge', command, { ...input, email }, async () => {
            const now = this.d.clock.now(), account = await this.d.repository.email(scope, this.d.organizationId, email);
            const eligible = ['STUDENT_EMAIL_BINDING', 'NEW_EMAIL_VERIFICATION'].includes(input.purpose) ? account === null :
                account !== null && account.verified && (input.purpose === 'STUDENT_LOGIN' ? account.role === 'STUDENT' : input.purpose === 'PASSWORD_RESET' ? account.role !== 'STUDENT' : input.purpose === 'CURRENT_EMAIL_VERIFICATION' ? account.role === 'STUDENT' : account.role === 'STUDENT' || account.adminKind === 'SUB');
            const id = this.d.secrets.id(), code = this.d.secrets.otp();
            await this.d.repository.saveChallenge(scope, { id, organizationId: this.d.organizationId,
                subjectId: eligible ? account?.subjectId ?? null : null, purpose: input.purpose,
                sealedEmail: input.purpose === 'NEW_EMAIL_VERIFICATION' ? this.d.secrets.seal('new-email/' + id, email) : null,
                emailDigest: this.d.secrets.digest('email', email), codeDigest: this.d.secrets.digest('otp/' + id, code),
                attempts: 0, maxAttempts: 5, createdAt: now, expiresAt: now + 10 * 60000, consumedAt: null });
            // Delivery adapter must be real outside tests. A rejected dependency never returns 202.
            if (eligible)
                await this.d.delivery.send(email, code, input.purpose);
            return { challengeId: id, expiresAt: now + 10 * 60000, retryAfterSeconds: 60 };
        }));
    }
    private async proof(scope: TransactionScope, input: {
        challengeId: string;
        code: string;
    }, purpose: string) {
        const challenge = await this.d.repository.challenge(scope, input.challengeId);
        ensure(challenge && challenge.purpose === purpose && challenge.organizationId === this.d.organizationId, 'INVALID_CREDENTIALS', 401);
        ensure(challenge.consumedAt === null && this.d.clock.now() < challenge.expiresAt, 'CHALLENGE_EXPIRED', 401);
        ensure(this.d.secrets.equal(challenge.codeDigest, this.d.secrets.digest('otp/' + challenge.id, input.code)), 'INVALID_CREDENTIALS', 401);
        return challenge;
    }
    async studentLogin(input: {
        otpProof: {
            challengeId: string;
            code: string;
        };
    }, command: CommandIdentity) {
        await this.throttle('proof/' + input.otpProof.challengeId, 5, 10 * 60000);
        return this.d.transactions.run(async scope => {
            const initial = await this.d.repository.peekChallenge(scope, input.otpProof.challengeId);
            const account = initial?.subjectId ? await this.d.repository.account(scope, initial.subjectId) : null;
            const pair = await replay(this.d.repository, this.d.secrets, scope, input.otpProof.challengeId, 'createStudentSession', command, input, async () => {
                const challenge = await this.proof(scope, input.otpProof, 'STUDENT_LOGIN');
                ensure(account && challenge.subjectId === account.subjectId && this.d.secrets.equal(challenge.emailDigest, this.d.secrets.digest('email', account.email)), 'INVALID_CREDENTIALS', 401);
                ensure(account.role === 'STUDENT' && account.verified, 'INVALID_CREDENTIALS', 401);
                ensure(account.accessState === 'ACTIVE', 'ACCOUNT_DISABLED', 403);
                await this.d.mode.assertAllowed(scope, account.organizationId, account.role, 'BUSINESS');
                await this.d.repository.consumeChallenge(scope, challenge.id, this.d.clock.now());
                await this.d.repository.linkReplayOwner(scope, input.otpProof.challengeId, 'createStudentSession', this.d.secrets.digest('idempotency-key', command.key), account.subjectId);
                const result = await this.pair(scope, account);
                await this.audit(scope, account, 'STUDENT_LOGIN', command);
                return result;
            });
            return this.liveLoginPair(scope, pair);
        });
    }
    async resetPassword(input: {
        otpProof: {
            challengeId: string;
            code: string;
        };
        newPassword: string;
    }, command: CommandIdentity) {
        ensure(input.newPassword.length > 0, 'INVALID_REQUEST', 400);
        await this.throttle('proof/' + input.otpProof.challengeId, 5, 10 * 60000);
        return this.d.transactions.run(scope => replay(this.d.repository, this.d.secrets, scope, input.otpProof.challengeId, 'resetPassword', command, input, async () => {
            const initial = await this.d.repository.peekChallenge(scope, input.otpProof.challengeId);
            const account = initial?.subjectId ? await this.d.repository.account(scope, initial.subjectId) : null;
            const challenge = await this.proof(scope, input.otpProof, 'PASSWORD_RESET');
            ensure(account && challenge.subjectId === account.subjectId && this.d.secrets.equal(challenge.emailDigest, this.d.secrets.digest('email', account.email)), 'INVALID_CREDENTIALS', 401);
            assertPasswordAccount(account);
            ensure(account.accessState === 'ACTIVE', 'ACCOUNT_DISABLED', 403);
            await this.d.mode.assertAllowed(scope, account.organizationId, account.role, 'PASSWORD_CHANGE');
            await this.d.repository.consumeChallenge(scope, challenge.id, this.d.clock.now());
            await this.d.repository.password(scope, account.subjectId, await this.d.passwords.hash(input.newPassword), this.d.clock.now(), null);
            await this.audit(scope, account, 'PASSWORD_RESET', command);
            return { accepted: true as const };
        }));
    }
    private async closureImpact(scope: TransactionScope, account: Account) {
        const blockers: {
            code: 'ACTIVE_EXERCISE_SESSION' | 'ADMIN_RESPONSIBILITY';
            count: number;
        }[] = [];
        if (account.role === 'STUDENT') {
            await this.lockStudentOwner(scope, account.organizationId, account.subjectId);
            const sessions = this.d.closureFacts?.studentSessions;
            ensure(sessions, 'DEPENDENCY_UNAVAILABLE', 503);
            try {
                await sessions.assertNoActive(scope, account.organizationId, account.subjectId);
            }
            catch (error) {
                if (error instanceof Failure && error.code === 'ACCOUNT_DELETION_BLOCKED' && error.status === 409)
                    blockers.push({ code: 'ACTIVE_EXERCISE_SESSION', count: 1 });
                else
                    throw error;
            }
        }
        else {
            ensure(account.role === 'ADMIN' && account.adminKind === 'SUB', 'FORBIDDEN', 403);
            const responsibilities = this.d.closureFacts?.adminResponsibilities;
            ensure(responsibilities, 'DEPENDENCY_UNAVAILABLE', 503);
            const count = await responsibilities.count(scope, account.organizationId, account.subjectId);
            ensure(Number.isSafeInteger(count) && count >= 0, 'DEPENDENCY_UNAVAILABLE', 503);
            if (count > 0)
                blockers.push({ code: 'ADMIN_RESPONSIBILITY', count });
        }
        return { allowed: blockers.length === 0, blockers, dataDeleted: ['LOGIN_ACCOUNT', 'PASSWORD_CREDENTIALS', 'LOGIN_SESSIONS', 'EMAIL_CHALLENGES', 'SCHOOL_EMAIL', 'CURRENT_PROFILE', 'PERSONAL_REPLAY_PAYLOADS'], factsRetained: ['OPAQUE_HISTORICAL_SUBJECT', 'COURSE_RELATIONS', 'EXERCISE_AND_MEDIA_FACTS', 'REVIEWS_AND_GRADES', 'AUDIT_HISTORY'] };
    }
    async accountDeletionImpact(token: string) {
        return this.d.transactions.run(async (scope) => {
            const actor = await this.authenticate(token, scope, 'BUSINESS');
            return this.closureImpact(scope, (await this.d.repository.account(scope, actor.subjectId))!);
        });
    }
    async deleteAccount(token: string, input: {
        otpProof: {
            challengeId: string;
            code: string;
        };
        expectedVersion: number;
        acknowledgement: 'DELETE_MY_ACCOUNT';
    }, command: CommandIdentity) {
        ensure(input.acknowledgement === 'DELETE_MY_ACCOUNT', 'INVALID_REQUEST', 400);
        await this.throttle('proof/' + input.otpProof.challengeId, 5, 10 * 60000);
        // Dedicated safe receipt survives credential erasure; it contains no account profile or reusable credential.
        const store = { reserve: this.d.repository.reserveClosure.bind(this.d.repository), finish: this.d.repository.finishClosure.bind(this.d.repository) };
        return this.d.transactions.run(scope => replay(store, this.d.secrets, scope, this.d.secrets.digest('access', token), 'deleteOwnAccount', command, input, async () => {
            const actor = await this.authenticate(token, scope, 'BUSINESS'), account = (await this.d.repository.account(scope, actor.subjectId))!;
            ensure(account.role === 'STUDENT' || account.adminKind === 'SUB', 'FORBIDDEN', 403);
            ensure(account.version === input.expectedVersion, 'VERSION_CONFLICT', 412);
            let challenge;
            try {
                challenge = await this.proof(scope, input.otpProof, 'ACCOUNT_DELETION');
            }
            catch (error) {
                if (error instanceof Failure && error.code === 'INVALID_CREDENTIALS')
                    throw new Failure('INVALID_REQUEST', 400);
                throw error;
            }
            ensure(challenge.subjectId === account.subjectId && this.d.secrets.equal(challenge.emailDigest, this.d.secrets.digest('email', account.email)), 'INVALID_REQUEST', 400);
            const impact = await this.closureImpact(scope, account);
            ensure(impact.allowed, 'ACCOUNT_DELETION_BLOCKED', 409);
            ensure(this.d.personalDataCleanup, 'DEPENDENCY_UNAVAILABLE', 503);
            await this.d.personalDataCleanup.erase(scope, account.organizationId, account.subjectId);
            await this.audit(scope, account, 'ACCOUNT_DELETED', command);
            await this.d.repository.eraseAccount(scope, account.subjectId, this.d.secrets.digest('email', account.email), this.d.secrets.digest('challenge-subject', account.email), this.d.clock.now());
            return { deleted: true as const, retainedFacts: impact.factsRetained };
        }));
    }
    async changeEmail(token: string, input: {
        currentEmailProof: {
            challengeId: string;
            code: string;
        };
        newEmailProof: {
            challengeId: string;
            code: string;
        };
        expectedVersion: number;
    }, command: CommandIdentity) {
        await this.throttle('proof/' + input.currentEmailProof.challengeId, 5, 10 * 60000);
        await this.throttle('proof/' + input.newEmailProof.challengeId, 5, 10 * 60000);
        return this.d.transactions.run(async (scope) => {
            const actor = await this.authenticate(token, scope, 'BUSINESS');
            ensure(actor.role === 'STUDENT', 'FORBIDDEN', 403);
            const account = (await this.d.repository.account(scope, actor.subjectId))!;
            return replay(this.d.repository, this.d.secrets, scope, actor.subjectId, 'changeOwnVerifiedEmail', command, input, async () => {
                ensure(account.version === input.expectedVersion, 'VERSION_CONFLICT', 412);
                // Deterministic order also covers maliciously swapped proof identifiers.
                for (const id of [input.currentEmailProof.challengeId, input.newEmailProof.challengeId].sort())
                    await this.d.repository.challenge(scope, id);
                let current, next;
                try {
                    current = await this.proof(scope, input.currentEmailProof, 'CURRENT_EMAIL_VERIFICATION');
                    next = await this.proof(scope, input.newEmailProof, 'NEW_EMAIL_VERIFICATION');
                }
                catch (error) {
                    if (error instanceof Failure && error.code === 'INVALID_CREDENTIALS')
                        throw new Failure('INVALID_REQUEST', 400);
                    throw error;
                }
                ensure(current.subjectId === account.subjectId && this.d.secrets.equal(current.emailDigest, this.d.secrets.digest('email', account.email)), 'INVALID_REQUEST', 400);
                ensure(next.subjectId === null && next.sealedEmail, 'INVALID_REQUEST', 400);
                const email = this.d.secrets.open<string>('new-email/' + next.id, next.sealedEmail);
                ensure(typeof email === 'string' && this.d.schoolEmailDomains.includes(email.split('@')[1] ?? '') && this.d.secrets.equal(next.emailDigest, this.d.secrets.digest('email', email)), 'INVALID_REQUEST', 400);
                await this.d.repository.changeEmail(scope, actor.subjectId, email, this.d.clock.now());
                await this.d.repository.consumeChallenge(scope, current.id, this.d.clock.now());
                await this.d.repository.consumeChallenge(scope, next.id, this.d.clock.now());
                await this.audit(scope, account, 'VERIFIED_EMAIL_CHANGED', command);
                return this.view(scope, (await this.d.repository.account(scope, actor.subjectId))!);
            });
        });
    }
    async registrationAttempt(challengeId: string) { await this.throttle('proof/' + challengeId, 5, 10 * 60000); }
    async registerStudent(scope: TransactionScope, input: {
        name: string;
        studentNumber: string;
        gender: 'FEMALE' | 'MALE';
        gradeYear: number;
        college: string | null;
        major: string | null;
        administrativeClass: string | null;
        verifiedEmail: string;
        emailOtpProof: {
            challengeId: string;
            code: string;
        };
    }, command: CommandIdentity): Promise<TokenPair> {
        const email = input.verifiedEmail.trim().toLowerCase();
        ensure(this.d.schoolEmailDomains.includes(email.split('@')[1] ?? '') && input.name.trim() && input.studentNumber.trim(), 'INVALID_REQUEST', 400);
        await this.d.mode.assertAllowed(scope, this.d.organizationId, 'STUDENT', 'BUSINESS');
        const challenge = await this.proof(scope, input.emailOtpProof, 'STUDENT_EMAIL_BINDING');
        ensure(challenge.subjectId === null && this.d.secrets.equal(challenge.emailDigest, this.d.secrets.digest('email', email)), 'INVALID_CREDENTIALS', 401);
        ensure(!await this.d.repository.emailInUse(scope, this.d.organizationId, email), 'EMAIL_ALREADY_IN_USE');
        const subjectId = this.d.secrets.id();
        await this.d.repository.createStudent(scope, { subjectId, organizationId: this.d.organizationId, email, studentNumber: input.studentNumber.trim(), name: input.name.trim(), gender: input.gender, gradeYear: input.gradeYear, college: input.college, major: input.major, administrativeClass: input.administrativeClass, now: this.d.clock.now() });
        await this.d.repository.consumeChallenge(scope, challenge.id, this.d.clock.now());
        const account = (await this.d.repository.account(scope, subjectId))!;
        await this.audit(scope, account, 'STUDENT_REGISTERED', command);
        return this.pair(scope, account);
    }
    async lockRegistrationOwner(scope: TransactionScope, organizationId: string, subjectId: string) {
        const account = await this.d.repository.account(scope, subjectId);
        // A concurrently completed deletion is decided by the freshly read flow proof, not by this lock hint.
        ensure(!account || account.organizationId === organizationId && account.role === 'STUDENT', 'INVALID_CREDENTIALS', 401);
    }
    async assertRegistrationSession(scope: TransactionScope, input: { subjectId: string; accessToken: string; refreshToken: string }) {
        try {
            const { account, session } = await this.current(scope, input.refreshToken, true);
            assertSession(account, session, this.d.clock.now(), false);
            ensure(account.role === 'STUDENT' && account.subjectId === input.subjectId && this.d.secrets.equal(session.accessDigest, this.d.secrets.digest('access', input.accessToken)), 'INVALID_CREDENTIALS', 401);
        } catch (error) {
            if (error instanceof Failure && ['TOKEN_EXPIRED', 'ACCOUNT_DISABLED', 'FORBIDDEN'].includes(error.code)) throw new Failure('INVALID_CREDENTIALS', 401);
            throw error;
        }
    }
    async readCurrentStudent(scope: TransactionScope, organizationId: string, subjectId: string) {
        const student = await this.d.repository.currentStudentProjection(scope, subjectId, organizationId);
        ensure(student, 'FORBIDDEN', 403);
        return student;
    }
    async student(subjectId: string, organizationId: string, scope: TransactionScope) {
        const account = await this.d.repository.account(scope, subjectId);
        ensure(account && account.organizationId === organizationId && account.role === 'STUDENT' && account.verified && account.accessState === 'ACTIVE', 'FORBIDDEN', 403);
        const student = await this.d.repository.student(scope, subjectId, organizationId);
        ensure(student, 'FORBIDDEN', 403);
        return student;
    }
    async teacher(subjectId: string, organizationId: string, scope: TransactionScope) {
        const account = await this.d.repository.account(scope, subjectId);
        ensure(account && account.organizationId === organizationId && account.role === 'TEACHER' && account.verified && account.accessState === 'ACTIVE', 'FORBIDDEN', 403);
        const teacher = await this.d.repository.teacher(scope, subjectId, organizationId);
        ensure(teacher, 'FORBIDDEN', 403);
        return teacher;
    }
}
