import type { FastifyInstance } from 'fastify';
import type { ContractValidator } from '../../../shared/api/contract-validator.ts';
import { route, bearer, command, instant } from '../../../shared/api/route-kit.ts';
import { ensure, type Secrets } from '../../../shared/application/runtime.ts';
import type { ModeGovernanceService } from '../application/mode-governance-service.ts';
export function registerModeGovernance(app: FastifyInstance, v: ContractValidator, service: ModeGovernanceService, secrets: Secrets) {
    const wire = (t: Awaited<ReturnType<ModeGovernanceService['history']>>[number]) => ({ ...t, occurredAt: instant(t.occurredAt) });
    route(app, v, 'POST', '/admin/system-mode/transitions', 'SystemModeSwitchResult', 201, async (r) => {
        const result = await service.switch(bearer(r), v.parse('SwitchSystemModeRequest', r.body), command(r));
        return { current: { ...result.current, updatedAt: instant(result.current.updatedAt) }, transition: wire(result.transition) };
    });
    route(app, v, 'GET', '/admin/system-mode/transitions', 'SystemModeTransitionPage', 200, async (r) => {
        const q = r.query as Record<string, string | undefined>, limit = q.limit === undefined ? 20 : Number(q.limit);
        ensure(Number.isSafeInteger(limit) && limit >= 1 && limit <= 100, 'INVALID_REQUEST', 400);
        const token = bearer(r), binding = secrets.digest('mode-history-cursor', { token, limit });
        let before = Number.MAX_SAFE_INTEGER;
        if (q.cursor !== undefined) {
            try {
                const cursor = secrets.open<{
                    binding: string;
                    before: number;
                }>('mode-history-cursor', q.cursor);
                ensure(cursor.binding === binding && Number.isSafeInteger(cursor.before) && cursor.before > 0, 'INVALID_CURSOR', 400);
                before = cursor.before;
            }
            catch {
                ensure(false, 'INVALID_CURSOR', 400);
            }
        }
        const remaining = (await service.history(token)).filter(t => t.sequenceNumber < before), items = remaining.slice(0, limit), last = items.at(-1);
        return { items: items.map(wire), page: { limit, previousCursor: null, nextCursor: remaining.length > limit && last ? secrets.seal('mode-history-cursor', { binding, before: last.sequenceNumber }) : null } };
    });
}
