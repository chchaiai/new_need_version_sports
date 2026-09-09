import type { FastifyInstance } from 'fastify';
import type { ContractValidator } from '../../../shared/api/contract-validator.ts';
import { route, bearer, command, instant } from '../../../shared/api/route-kit.ts';
import { TemplateService } from '../application/template-service.ts';
const wire = (t: Awaited<ReturnType<TemplateService['publish']>>) => ({ ...t, publishedAt: instant(t.publishedAt) });
export function registerTemplates(app: FastifyInstance, v: ContractValidator, s: TemplateService) {
    route(app, v, 'GET', '/rule-template-versions', 'RuleTemplateVersionPage', 200, async (r) => { const p = await s.list(bearer(r), r.query as Record<string, unknown>); return { ...p, items: p.items.map(wire) }; });
    route(app, v, 'POST', '/admin/rule-template-versions', 'RuleTemplateVersion', 200, async (r) => wire(await s.publish(bearer(r), v.parse('RuleTemplatePublishRequest', r.body), command(r))));
}
