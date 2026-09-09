import type { FastifyInstance, FastifyRequest, HTTPMethods } from 'fastify';
import type { ContractValidator, SchemaName } from './contract-validator.ts';
import { ensure, type CommandIdentity, type Secrets } from '../application/runtime.ts';
export const instant = (milliseconds: number) => new Date(milliseconds).toISOString();
export function bearer(request: FastifyRequest) {
    const authorization = request.headers.authorization;
    ensure(typeof authorization === 'string' && /^Bearer [^\s]+$/.test(authorization), 'AUTHENTICATION_REQUIRED', 401);
    return authorization.slice(7);
}
export function command(request: FastifyRequest): CommandIdentity {
    const key = request.headers['idempotency-key'];
    ensure(typeof key === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key), 'INVALID_REQUEST', 400);
    return { key, requestId: request.id };
}
export function path(request: FastifyRequest, key: string, uuid = true) {
    const value = (request.params as Record<string, string>)[key];
    ensure(value && (uuid ? /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) : value.length > 0), 'INVALID_REQUEST', 400);
    return value;
}
export function route(app: FastifyInstance, validator: ContractValidator, method: HTTPMethods, url: string, response: SchemaName, status: number, handler: (request: FastifyRequest) => Promise<unknown>) {
    app.route({ method, url: '/api/v1' + url, handler: async (request, reply) => {
            const value = await handler(request);
            if (!validator.accepts(response, value))
                throw new Error('RESPONSE_CONTRACT_VIOLATION');
            return reply.code(status).send(value);
        } });
}
type PageKey = readonly (string | number)[];
/** Paginate an already authorized and filtered projection; anchors stay opaque and scope-bound. */
export function keysetPage<T>(items: readonly T[], keyOf: (item: T) => PageKey, options: {
    query: Record<string, unknown>;
    context: string;
    binding: unknown;
    order: 'ASC' | 'DESC';
    secrets: Secrets;
}) {
    const { query, secrets, context } = options;
    ensure(query.limit === undefined || typeof query.limit === 'string' && /^\d+$/.test(query.limit), 'INVALID_REQUEST', 400);
    const limit = query.limit === undefined ? 20 : Number(query.limit);
    ensure(Number.isSafeInteger(limit) && limit >= 1 && limit <= 100, 'INVALID_REQUEST', 400);
    const binding = secrets.digest('keyset-binding', { scope: options.binding, limit, order: options.order });
    let anchor: PageKey | null = null, before = false;
    if (query.cursor !== undefined) {
        try {
            ensure(typeof query.cursor === 'string' && query.cursor.length > 0, 'INVALID_CURSOR', 400);
            const c = secrets.open<{ version: number; binding: string; anchor: PageKey; before: boolean }>(context, query.cursor);
            ensure(c.version === 1 && secrets.equal(c.binding, binding) && typeof c.before === 'boolean' && Array.isArray(c.anchor) &&
                c.anchor.length > 0 && c.anchor.every(v => typeof v === 'string' && v.length > 0 || typeof v === 'number' && Number.isFinite(v)), 'INVALID_CURSOR', 400);
            anchor = c.anchor; before = c.before;
        } catch { ensure(false, 'INVALID_CURSOR', 400); }
    }
    const compare = (a: PageKey, b: PageKey): number => {
        ensure(a.length === b.length && a.every((v, i) => typeof v === typeof b[i]), 'INVALID_CURSOR', 400);
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) return (a[i]! < b[i]! ? -1 : 1) * (options.order === 'ASC' ? 1 : -1);
        }
        return 0;
    };
    const ordered = [...items].sort((a, b) => compare(keyOf(a), keyOf(b)));
    const eligible = ordered.filter(item => anchor === null || (before ? compare(keyOf(item), anchor) < 0 : compare(keyOf(item), anchor) > 0));
    const selected = before ? eligible.slice(-limit) : eligible.slice(0, limit);
    const first = selected.length > 0 ? keyOf(selected[0]!) : anchor, last = selected.length > 0 ? keyOf(selected.at(-1)!) : anchor;
    const cursor = (key: PageKey, before: boolean) => secrets.seal(context, { version: 1, binding, anchor: key, before });
    return { items: selected, page: { limit,
        nextCursor: last && ordered.some(item => compare(keyOf(item), last) > 0) ? cursor(last, false) : null,
        previousCursor: first && ordered.some(item => compare(keyOf(item), first) < 0) ? cursor(first, true) : null } };
}
