import type { Secrets } from '../../../shared/application/runtime.ts';
import type { FastifyInstance } from 'fastify';
import type { ContractValidator } from '../../../shared/api/contract-validator.ts';
import { route, bearer, command, path, instant, keysetPage } from '../../../shared/api/route-kit.ts';
import { GovernanceService } from '../application/governance-service.ts';
const subWire = (a: Awaited<ReturnType<GovernanceService['subAdmin']>>) => ({ ...a, createdAt: instant(a.createdAt), updatedAt: instant(a.updatedAt) });
const teacherWire = (a: Awaited<ReturnType<GovernanceService['teacher']>>) => ({ ...a, updatedAt: instant(a.updatedAt) });
export function registerGovernance(app: FastifyInstance, v: ContractValidator, s: GovernanceService, secrets: Secrets) {
    const studentWire = (a: Awaited<ReturnType<GovernanceService['studentAccount']>>) => {
        const { subjectId, organizationId: _organizationId, ...student } = a.student;
        return { ...a, student: { ...student, studentId: subjectId }, updatedAt: instant(a.updatedAt) };
    };
    route(app, v, 'GET', '/admin/student-accounts', 'StudentAccountPage', 200, async r => {
        const raw = r.query as Record<string, unknown>, result = await s.students(bearer(r), raw);
        return keysetPage(result.items.map(studentWire), r => [r.student.studentId], { query: raw, binding: result.binding, order: 'ASC', secrets, context: 'student-accounts' });
    });
    route(app, v, 'GET', '/admin/student-accounts/:studentId', 'StudentAccount', 200, async r => studentWire(await s.studentAccount(bearer(r), path(r, 'studentId'))));
    route(app, v, 'GET', '/admin/sub-admins', 'SubAdminPage', 200, async (r) => { const p = await s.subAdmins(bearer(r), r.query as Record<string, unknown>); return { ...p, items: p.items.map(subWire), summary: { ...p.summary, generatedAt: instant(p.summary.generatedAt) } }; });
    route(app, v, 'GET', '/admin/sub-admins/:adminId', 'SubAdmin', 200, async (r) => subWire(await s.subAdmin(bearer(r), path(r, 'adminId'))));
    route(app, v, 'POST', '/admin/sub-admins', 'SubAdmin', 201, async (r) => subWire(await s.createSubAdmin(bearer(r), v.parse('CreateSubAdminRequest', r.body), command(r))));
    route(app, v, 'PUT', '/admin/sub-admins/:adminId', 'SubAdmin', 200, async (r) => subWire(await s.updateSubAdmin(bearer(r), path(r, 'adminId'), v.parse('UpdateSubAdminRequest', r.body), command(r))));
    route(app, v, 'POST', '/admin/sub-admins/:adminId/state-transition', 'SubAdmin', 200, async (r) => subWire(await s.setState(bearer(r), path(r, 'adminId'), v.parse('SetSubAdminStateRequest', r.body), command(r))));
    route(app, v, 'POST', '/admin/sub-admins/:adminId/deletion', 'DeletionResult', 200, r => s.deleteSubAdmin(bearer(r), path(r, 'adminId'), v.parse('DeleteSubAdminRequest', r.body), command(r)));
    route(app, v, 'GET', '/admin/teacher-accounts', 'TeacherAccountPage', 200, async (r) => { const p = await s.teachers(bearer(r), r.query as Record<string, unknown>); return { ...p, items: p.items.map(teacherWire) }; });
    route(app, v, 'GET', '/admin/teacher-accounts/:teacherId', 'TeacherAccount', 200, async (r) => teacherWire(await s.teacher(bearer(r), path(r, 'teacherId'))));
    route(app, v, 'POST', '/admin/teacher-accounts/:teacherId/deletion', 'DeletionResult', 200, r => s.deleteTeacher(bearer(r), path(r, 'teacherId'), v.parse('DeleteTeacherAccountRequest', r.body), command(r)));
    route(app, v, 'POST', '/admin/teacher-account-batch-validations', 'TeacherBatchValidation', 201, async (r) => { const p = await s.validateTeachers(bearer(r), v.parse('TeacherBatchValidationRequest', r.body), command(r)); return { ...p, expiresAt: instant(p.expiresAt) }; });
    route(app, v, 'POST', '/admin/teacher-account-batches', 'TeacherBatchCreationResult', 201, async (r) => { const p = await s.createTeachers(bearer(r), v.parse('CreateTeacherBatchRequest', r.body), command(r)); return { ...p, teachers: p.teachers.map(teacherWire) }; });
}
