import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ContractValidator } from '../../../shared/api/contract-validator.ts';
import { route, bearer, path, command, instant, keysetPage } from '../../../shared/api/route-kit.ts';
import { ensure, type Secrets } from '../../../shared/application/runtime.ts';
import { NotificationService, type Notice } from '../application/notification-service.ts';
const wire = (n: Notice) => ({ notificationId: n.id, notificationType: n.notificationType, title: n.title, body: n.body, targetRoute: n.targetRoute, targetId: n.targetId, createdAt: instant(n.createdAt), readAt: n.readAt === null ? null : instant(n.readAt), reviewContext: null });
export function registerNotifications(app: FastifyInstance, v: ContractValidator, service: NotificationService, secrets: Secrets) {
    function page(r: FastifyRequest, items: Notice[], student: boolean) {
        const q = r.query as Record<string, unknown>;
        ensure(q.read === undefined || q.read === 'true' || q.read === 'false', 'INVALID_REQUEST', 400);
        const filtered = items.filter(n => q.read === undefined || (n.readAt !== null) === (q.read === 'true'));
        const result = keysetPage(filtered, n => [n.createdAt, n.id], { query: q, secrets, context: 'notification-page-v2', order: 'DESC',
            binding: { token: bearer(r), student, read: q.read ?? null } });
        return { ...result, items: result.items.map(wire) };
    }
    route(app, v, 'GET', '/student/notifications', 'StudentNotificationPage', 200, async (r) => page(r, await service.list(bearer(r), true), true));
    route(app, v, 'GET', '/student/notifications/unread-count', 'UnreadNotificationCount', 200, async (r) => ({ unreadCount: (await service.list(bearer(r), true)).filter(n => n.readAt === null).length }));
    route(app, v, 'POST', '/student/notifications/:notificationId/read', 'StudentNotification', 200, async (r) => wire(await service.mark(bearer(r), true, path(r, 'notificationId'), command(r))));
    route(app, v, 'GET', '/notifications', 'NotificationPage', 200, async (r) => page(r, await service.list(bearer(r), false), false));
    route(app, v, 'GET', '/notifications/unread-count', 'UnreadNotificationCount', 200, async (r) => ({ unreadCount: (await service.list(bearer(r), false)).filter(n => n.readAt === null).length }));
    route(app, v, 'POST', '/notifications/:notificationId/read', 'Notification', 200, async (r) => wire(await service.mark(bearer(r), false, path(r, 'notificationId'))));
}
