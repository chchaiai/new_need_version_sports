import type { TransactionRunner, TransactionScope } from '../../../shared/application/transactions/transaction-runner.ts';
import { ensure, replay, type Clock, type Secrets, type CommandIdentity } from '../../../shared/application/runtime.ts';
import type { ModeRepository, Transition } from './ports/mode-repository.ts';
import type { ModeIdentity, ModeAudit, ModeNotifications } from './ports/governance-dependencies.ts';
import type { Announcement, ModeState } from './public/system-mode.ts';
import type { ModeTimelineAccess, ModeTimeline, MaintenancePeriod } from './public/mode-timeline.ts';
export type ModeCommand = {
    targetMode: 'NORMAL';
    reason: string;
    expectedVersion: number;
} | {
    targetMode: 'MAINTENANCE';
    reason: string;
    expectedVersion: number;
    announcement: Announcement;
};
export class ModeGovernanceService implements ModeTimelineAccess {
    private readonly tx: TransactionRunner;
    private readonly repository: ModeRepository;
    private readonly identity: ModeIdentity;
    private readonly audit: ModeAudit;
    private readonly notifications: ModeNotifications;
    private readonly clock: Clock;
    private readonly secrets: Secrets;
    constructor(tx: TransactionRunner, repository: ModeRepository, identity: ModeIdentity, audit: ModeAudit, notifications: ModeNotifications, clock: Clock, secrets: Secrets) {
        this.tx = tx;
        this.repository = repository;
        this.identity = identity;
        this.audit = audit;
        this.notifications = notifications;
        this.clock = clock;
        this.secrets = secrets;
    }
    private timeline(organizationId: string, state: ModeState, transitions: Transition[], observedAt: number): ModeTimeline {
        ensure(Number.isSafeInteger(observedAt) && observedAt >= state.updatedAt, 'DEPENDENCY_UNAVAILABLE', 503);
        const periods: MaintenancePeriod[] = [];
        let current: 'NORMAL' | 'MAINTENANCE' = 'NORMAL', sequence = 0, lastTime = -Infinity;
        for (const t of transitions) {
            ensure(t.sequence === ++sequence && t.from === current && t.from !== t.to && t.occurredAt >= lastTime && t.occurredAt <= observedAt, 'DEPENDENCY_UNAVAILABLE', 503);
            if (t.to === 'MAINTENANCE')
                periods.push({ startedAt: t.occurredAt, endedAt: null, startTransitionId: t.id, endTransitionId: null });
            else {
                const open = periods.at(-1);
                ensure(open && open.endedAt === null, 'DEPENDENCY_UNAVAILABLE', 503);
                open.endedAt = t.occurredAt;
                open.endTransitionId = t.id;
            }
            current = t.to;
            lastTime = t.occurredAt;
        }
        ensure(current === state.mode && sequence === state.version && sequence === state.policyVersion && (sequence === 0 || lastTime === state.updatedAt), 'DEPENDENCY_UNAVAILABLE', 503);
        return { organizationId, observedAt, modeVersion: state.version, policyVersion: state.policyVersion, currentMode: current, periods };
    }
    async maintenance(scope: TransactionScope, organizationId: string) {
        // The state SHARE lock prevents a writer changing the history between these reads.
        const state = await this.repository.read(scope, organizationId);
        ensure(state, 'DEPENDENCY_UNAVAILABLE', 503);
        return this.timeline(organizationId, state, await this.repository.transitions(scope, organizationId), this.clock.now());
    }
    private async view(scope: TransactionScope, org: string, t: Transition) {
        return { transitionId: t.id, sequenceNumber: t.sequence, fromMode: t.from, toMode: t.to, reason: t.reason,
            announcement: t.announcement, announcementPublished: t.to === 'MAINTENANCE', changedBy: await this.identity.person(scope, org, t.actorSubjectId), occurredAt: t.occurredAt };
    }
    async history(token: string) {
        return this.tx.run(async (scope) => {
            const a = await this.identity.authorizeMode(scope, token);
            const state = await this.repository.read(scope, a.organizationId);
            ensure(state, 'DEPENDENCY_UNAVAILABLE', 503);
            const items = await this.repository.transitions(scope, a.organizationId);
            this.timeline(a.organizationId, state, items, this.clock.now());
            const result = [];
            for (const t of items)
                result.push(await this.view(scope, a.organizationId, t));
            return result.reverse();
        });
    }
    async switch(token: string, raw: ModeCommand, command: CommandIdentity) {
        const reason = raw.reason.trim();
        ensure(reason.length > 0 && Number.isSafeInteger(raw.expectedVersion) && raw.expectedVersion >= 0, 'INVALID_REQUEST', 400);
        const input: ModeCommand = raw.targetMode === 'NORMAL' ? { ...raw, reason } : { ...raw, reason, announcement: {
                titleZh: raw.announcement.titleZh.trim(), titleEn: raw.announcement.titleEn.trim(), bodyZh: raw.announcement.bodyZh.trim(), bodyEn: raw.announcement.bodyEn.trim(), estimatedRecoveryAt: raw.announcement.estimatedRecoveryAt
            } };
        if (input.targetMode === 'MAINTENANCE')
            ensure([input.announcement.titleZh, input.announcement.titleEn, input.announcement.bodyZh, input.announcement.bodyEn].every(v => v.length > 0) && Number.isFinite(Date.parse(input.announcement.estimatedRecoveryAt)), 'MAINTENANCE_ANNOUNCEMENT_REQUIRED', 422);
        if (input.targetMode === 'MAINTENANCE')
            input.announcement.estimatedRecoveryAt = new Date(input.announcement.estimatedRecoveryAt).toISOString();
        return this.tx.run(async (scope) => {
            // Authenticate before taking the exclusive mode lock; never upgrade an already held SHARE lock.
            const actor = await this.identity.authorizeMode(scope, token);
            return replay(this.repository, this.secrets, scope, actor.subjectId, 'switchSystemMode', command, input, async () => {
                const previous = await this.repository.lock(scope, actor.organizationId);
                ensure(previous, 'DEPENDENCY_UNAVAILABLE', 503);
                ensure(previous.version === input.expectedVersion, 'VERSION_CONFLICT', 412);
                ensure(previous.mode !== input.targetMode, 'SYSTEM_MODE_UNCHANGED', 409);
                const now = this.clock.now();
                this.timeline(actor.organizationId, previous, await this.repository.transitions(scope, actor.organizationId), now);
                ensure(Number.isSafeInteger(previous.version + 1), 'DEPENDENCY_UNAVAILABLE', 503);
                const announcement = input.targetMode === 'MAINTENANCE' ? input.announcement : null;
                const current: ModeState = { mode: input.targetMode, policyVersion: previous.policyVersion + 1, announcement, version: previous.version + 1, updatedAt: now };
                const transition: Transition = { id: this.secrets.id(), sequence: current.version, from: previous.mode, to: current.mode, reason, announcement, actorSubjectId: actor.subjectId, occurredAt: now };
                await this.repository.change(scope, actor.organizationId, current, transition);
                await this.audit.append(scope, { organizationId: actor.organizationId, actorSubjectId: actor.subjectId, action: 'SYSTEM_MODE_CHANGED', resourceId: transition.id, requestId: command.requestId });
                await this.notifications.modeChanged(scope, { organizationId: actor.organizationId, eventId: transition.id, recipientSubjectIds: await this.identity.affectedRecipients(scope, actor.organizationId), mode: current.mode });
                return { current, transition: await this.view(scope, actor.organizationId, transition) };
            });
        });
    }
}
