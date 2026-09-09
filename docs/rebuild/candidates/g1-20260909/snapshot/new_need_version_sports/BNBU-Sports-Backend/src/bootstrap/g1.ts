import { createServer } from './server.ts';
import { readContract } from './contract-input.mjs';
import { createContractValidator, ContractInputError } from '../shared/api/contract-validator.ts';
import { mapG1Failure, type G1ErrorPolicy } from '../shared/api/g1-error-policy.ts';
import { createPool, PostgresTransactionRunner } from '../shared/infrastructure/postgres.ts';
import { TransactionUnavailableError, type TransactionScope, type TransactionRunner } from '../shared/application/transactions/transaction-runner.ts';
import { Failure, type Clock, type Secrets, type PasswordHasher } from '../shared/application/runtime.ts';
import type { AccountClosureFacts } from '../modules/identity-access/application/ports/account-closure.ts';
import { IdentityService } from '../modules/identity-access/application/identity-service.ts';
import type { PermissionFacts, OtpDelivery } from '../modules/identity-access/application/ports/dependencies.ts';
import { GovernanceService } from '../modules/identity-access/application/governance-service.ts';
import { PostgresGovernanceRepository } from '../modules/identity-access/infrastructure/persistence/repositories/postgres-governance-repository.ts';
import { registerGovernance } from '../modules/identity-access/api/governance-routes.ts';
import { PostgresPermissionFacts } from '../modules/identity-access/infrastructure/persistence/repositories/postgres-permission-facts.ts';
import { PostgresIdentityRepository } from '../modules/identity-access/infrastructure/persistence/repositories/postgres-identity-repository.ts';
import { PostgresAuditRepository } from '../modules/audit/infrastructure/persistence/repositories/postgres-audit-repository.ts';
import { PostgresModeRepository } from '../modules/system-mode/infrastructure/persistence/repositories/postgres-mode-repository.ts';
import { ModeService } from '../modules/system-mode/application/mode-service.ts';
import { PostgresNotificationRepository } from '../modules/notification-center/infrastructure/persistence/repositories/postgres-notification-repository.ts';
import { SemesterService } from '../modules/academic-term/application/semester-service.ts';
import { registerSemesters } from '../modules/academic-term/api/routes.ts';
import { TemplateService } from '../modules/course-enrollment/application/template-service.ts';
import { registerTemplates } from '../modules/course-enrollment/api/template-routes.ts';
import { PostgresSemesterRepository } from '../modules/academic-term/infrastructure/persistence/repositories/postgres-semester-repository.ts';
import { PostgresCourseRepository } from '../modules/course-enrollment/infrastructure/persistence/repositories/postgres-course-repository.ts';
import { CourseService } from '../modules/course-enrollment/application/course-service.ts';
import type { CourseCalendar } from '../modules/course-enrollment/application/ports/dependencies.ts';
import { registerIdentity } from '../modules/identity-access/api/routes.ts';
import { NotificationService } from '../modules/notification-center/application/notification-service.ts';
import { registerNotifications } from '../modules/notification-center/api/routes.ts';
import { registerSystemMode } from '../modules/system-mode/api/routes.ts';
import { ModeGovernanceService } from '../modules/system-mode/application/mode-governance-service.ts';
import { registerModeGovernance } from '../modules/system-mode/api/governance-routes.ts';
import { registerCourses } from '../modules/course-enrollment/api/routes.ts';
/** Required integrations have no default success adapter. The caller supplies real providers or startup fails. */
export function createG1(pool: ReturnType<typeof createPool>, dependencies: {
    clock: Clock;
    secrets: Secrets;
    passwords: PasswordHasher;
    organizationId: string;
    schoolEmailDomains: readonly string[];
    dummyPasswordHash: string;
    permissions?: PermissionFacts;
    delivery: OtpDelivery;
    calendar: CourseCalendar;
    closureFacts?: AccountClosureFacts;
    semesterSettlements?: {
        assertSettled(scope: TransactionScope, organizationId: string, semesterId: string, courseIds: readonly string[]): Promise<void>;
    };
    teacherClosure?: {
        assertMayDelete(scope: TransactionScope, organizationId: string, teacherId: string, courseIds: readonly string[]): Promise<void>;
    };
}) {
    if (!dependencies.delivery || !dependencies.calendar)
        throw new Error('G1_INTEGRATIONS_REQUIRED');
    const transactions = new PostgresTransactionRunner(pool), { clock, secrets } = dependencies;
    const modeRepository = new PostgresModeRepository(transactions);
    const audit = new PostgresAuditRepository(transactions, clock, secrets), mode = new ModeService(modeRepository);
    const identityRepository = new PostgresIdentityRepository(transactions);
    const cleanup = async (scope: TransactionScope, organizationId: string, subjectId: string): Promise<void> => {
        await courses.eraseIdentityReplays(scope, organizationId, subjectId);
        await notifications.eraseIdentityReplays(scope, organizationId, subjectId);
    };
    const identity: IdentityService = new IdentityService({ ...dependencies, permissions: dependencies.permissions ?? new PostgresPermissionFacts(transactions), transactions, repository: identityRepository, audit, mode, personalDataCleanup: { erase: cleanup } });
    const semesters = new PostgresSemesterRepository(transactions), notifications = new PostgresNotificationRepository(transactions, clock, secrets);
    const modeGovernance = new ModeGovernanceService(transactions, modeRepository, identity, audit, notifications, clock, secrets);
    const courses: CourseService = new CourseService({ transactions, snapshots: { run: work => transactions.snapshot(work) }, studentProjection: identity, registrationSessions: identity, repository: new PostgresCourseRepository(transactions), identity, studentOwnerLock: identity, semesters: { current: (s, org) => semesters.currentWithoutLock(s, org), get: (s, org, id) => semesters.get(s, org, id) },
        calendar: dependencies.calendar, admissionGate: (scope, organizationId) => mode.assertAllowed(scope, organizationId, 'STUDENT', 'BUSINESS'), audit, notifications, clock, secrets, organizationId: dependencies.organizationId });
    const governance = new GovernanceService({ ...dependencies, transactions, snapshots: { run: work => transactions.snapshot(work) },
        studentMemberships: { active: async (s, org, subjects) => { const semester = await semesters.currentWithoutLock(s, org); return semester ? courses.activeStudentSubjects(s, org, semester.id, subjects) : []; } }, identity, repository: new PostgresGovernanceRepository(transactions), receipts: identityRepository, audit,
        personalDataCleanup: { erase: cleanup }, teachingClosure: { assertMayDelete: (s, org, id) => courses.assertTeacherAccountDeletion(s, org, id, dependencies.teacherClosure) } });
    const snapshots: TransactionRunner = { run: work => transactions.snapshot(work) };
    const semesterManagement = new SemesterService({ transactions, snapshots, repository: semesters, identity, audit, clock, secrets, courses: { counts: (s, org, ids) => courses.semesterCounts(s, org, ids), lockCourses: (s, org, id) => courses.lockSemesterCourses(s, org, id), assertSettled: (s, org, id, ids) => courses.assertSemesterSettled(s, org, id, ids, dependencies.semesterSettlements) } });
    const templates = new TemplateService({ transactions, snapshots, repository: new PostgresCourseRepository(transactions), identity, audit, clock, secrets });
    const contract = readContract().document;
    const errorPolicies = new Map<string, G1ErrorPolicy>();
    for (const [path, methods] of Object.entries(contract.paths)) {
        for (const [method, operation] of Object.entries(methods as Record<string, any>)) {
            if (typeof operation?.operationId !== 'string')
                continue;
            errorPolicies.set(method.toUpperCase() + ' ' + path, { operationId: operation.operationId, errorCodes: operation['x-error-codes'], httpStatuses: Object.keys(operation.responses).map(Number).filter(Number.isInteger) });
        }
    }
    const validator = createContractValidator(contract.components), app = createServer(async () => { await pool.query('SELECT 1'); });
    app.addHook('onSend', async (_request, reply, payload) => { reply.header('Cache-Control', 'no-store'); reply.header('X-Request-Id', _request.id); return payload; });
    app.setErrorHandler((error, request, reply) => {
        const status = error instanceof Failure ? error.status : (error instanceof ContractInputError || (typeof error === 'object' && error !== null && 'statusCode' in error && error.statusCode === 400)) ? 400 : error instanceof TransactionUnavailableError ? 503 : 500;
        const code = error instanceof Failure ? error.code : (error instanceof ContractInputError || (typeof error === 'object' && error !== null && 'statusCode' in error && error.statusCode === 400)) ? 'INVALID_REQUEST' : error instanceof TransactionUnavailableError ? 'DEPENDENCY_UNAVAILABLE' : 'INTERNAL_ERROR';
        const routePath = request.routeOptions.url?.replace(/^\/api\/v1/, '').replace(/:([a-zA-Z0-9_]+)/g, '{$1}');
        const policy = errorPolicies.get(request.method + ' ' + routePath);
        const mapped = policy ? mapG1Failure(error instanceof Failure || error instanceof TransactionUnavailableError ? error : new Failure(code, status), policy) : { code, status };
        const envelope = { code: mapped.code, message: mapped.code, requestId: request.id, details: null };
        if (!validator.accepts('ErrorEnvelope', envelope))
            return reply.code(500).send({ code: 'INTERNAL_ERROR', message: 'INTERNAL_ERROR', requestId: request.id, details: null });
        reply.header('X-Request-Id', request.id).code(mapped.status).send(envelope);
    });
    registerNotifications(app, validator, new NotificationService(transactions, notifications, identity, clock, secrets), secrets);
    registerSystemMode(app, validator, mode, transactions, dependencies.organizationId);
    registerModeGovernance(app, validator, modeGovernance, secrets);
    registerIdentity(app, validator, identity);
    registerGovernance(app, validator, governance, secrets);
    registerSemesters(app, validator, semesterManagement);
    registerTemplates(app, validator, templates);
    registerCourses(app, validator, courses, clock, secrets);
    return { app, identity, governance, semesterManagement, templates, courses, transactions, mode, modeGovernance, audit, semesters, sessionAdmission: courses, studentOwnerLock: identity };
}
