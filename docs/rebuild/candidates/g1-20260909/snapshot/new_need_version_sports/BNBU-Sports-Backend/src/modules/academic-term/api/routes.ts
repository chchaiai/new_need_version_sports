import type { FastifyInstance } from 'fastify';
import type { ContractValidator } from '../../../shared/api/contract-validator.ts';
import { route, bearer, command, path, instant } from '../../../shared/api/route-kit.ts';
import { SemesterService } from '../application/semester-service.ts';
const wire = (r: Awaited<ReturnType<SemesterService['create']>>) => ({ ...r, updatedAt: instant(r.updatedAt) });
export function registerSemesters(app: FastifyInstance, v: ContractValidator, s: SemesterService) {
    route(app, v, 'GET', '/semesters/current', 'SemesterSummary', 200, r => s.current(bearer(r)));
    route(app, v, 'GET', '/semesters', 'SemesterPage', 200, async (r) => { const p = await s.list(bearer(r), r.query as Record<string, unknown>); return { ...p, items: p.items.map(wire), summary: { ...p.summary, generatedAt: instant(p.summary.generatedAt) } }; });
    route(app, v, 'POST', '/semesters', 'Semester', 201, async (r) => wire(await s.create(bearer(r), v.parse('SemesterCreateRequest', r.body), command(r))));
    route(app, v, 'PUT', '/semesters/:semesterId', 'Semester', 200, async (r) => wire(await s.update(bearer(r), path(r, 'semesterId'), v.parse('SemesterUpdateRequest', r.body), command(r))));
    route(app, v, 'POST', '/semesters/:semesterId/current-transition', 'SemesterSwitchResult', 200, async (r) => { const p = await s.switch(bearer(r), path(r, 'semesterId'), v.parse('SemesterSwitchRequest', r.body), command(r)); return { ...p, currentSemester: wire(p.currentSemester), archivedSemester: p.archivedSemester ? wire(p.archivedSemester) : null, switchedAt: instant(p.switchedAt) }; });
}
