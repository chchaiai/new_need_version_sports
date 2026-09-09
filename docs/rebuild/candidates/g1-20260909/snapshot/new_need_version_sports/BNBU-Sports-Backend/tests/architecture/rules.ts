import ts from 'typescript';
import { posix } from 'node:path';
export interface Source {
    path: string;
    text: string;
}
export const tableOwners: Readonly<Record<string, string>> = {
    'foundation_probe.certification_kind': 'applications-certification',
    'identity_access.organization': 'identity-access',
    'identity_access.user_subject': 'identity-access',
    'identity_access.login_account': 'identity-access',
    'identity_access.password_credential': 'identity-access',
    'identity_access.auth_session': 'identity-access',
    'identity_access.teacher_profile': 'identity-access',
    'identity_access.student_profile': 'identity-access',
    'identity_access.admin_profile': 'identity-access',
    'identity_access.auth_challenge': 'identity-access',
    'identity_access.command_replay': 'identity-access',
    'identity_access.account_closure_replay': 'identity-access',
    'identity_access.admin_permission': 'identity-access',
    'identity_access.teacher_batch_validation': 'identity-access',
    'identity_access.governance_event': 'identity-access',
    'identity_access.auth_throttle': 'identity-access',
    'audit.audit_event': 'audit',
    'system_mode.state': 'system-mode',
    'system_mode.transition': 'system-mode',
    'system_mode.command_replay': 'system-mode',
    'notification_center.in_app_notification': 'notification-center',
    'notification_center.command_replay': 'notification-center',
    'academic_term.semester': 'academic-term',
    'academic_term.catalog_state': 'academic-term',
    'academic_term.semester_transition': 'academic-term',
    'academic_term.command_replay': 'academic-term',
    'course_enrollment.rule_template_version': 'course-enrollment',
    'course_enrollment.course': 'course-enrollment',
    'course_enrollment.course_closure': 'course-enrollment',
    'course_enrollment.course_target_revision': 'course-enrollment',
    'course_enrollment.course_invitation': 'course-enrollment',
    'course_enrollment.invitation_flow': 'course-enrollment',
    'course_enrollment.enrollment': 'course-enrollment',
    'course_enrollment.enrollment_event': 'course-enrollment',
    'course_enrollment.publication_plan': 'course-enrollment',
    'course_enrollment.change_impact': 'course-enrollment',
    'course_enrollment.makeup_authorization': 'course-enrollment',
    'course_enrollment.command_replay': 'course-enrollment',
    'exercise_session.session': 'exercise-session',
    'exercise_session.active_interval': 'exercise-session',
    'exercise_session.command_replay': 'exercise-session',
    'media_evidence.record_asset': 'media-evidence',
    'exercise_record.record': 'exercise-record',
    'exercise_record.first_material': 'exercise-record',
    'exercise_record.first_material_asset': 'exercise-record',
    'exercise_record.command_replay': 'exercise-record',
    'exercise_record.acceptance_outbox': 'exercise-record'
};
const sharedAllowlist = new Set([
    'src/shared/api/g1-error-policy.ts', 'src/shared/api/contract.generated.ts', 'src/shared/api/contract-validator.ts',
    'src/shared/application/runtime.ts', 'src/shared/domain/failure.ts', 'src/shared/infrastructure/crypto.ts', 'src/shared/api/route-kit.ts',
    'src/shared/application/transactions/transaction-runner.ts', 'src/shared/infrastructure/postgres.ts'
]);
const layerOf = (p: string) => p.match(/\/(api|application|domain|infrastructure|bootstrap)\//)?.[1];
const moduleOf = (p: string) => p.match(/^src\/modules\/([^/]+)\//)?.[1];
export function architectureFindings(sources: Source[]): string[] {
    const findings: string[] = [];
    const graph = new Map<string, string[]>();
    for (const source of sources) {
        const path = source.path, layer = layerOf('/' + path);
        const ownModule = moduleOf(path);
        if (path.startsWith('src/shared/') && !sharedAllowlist.has(path))
            findings.push('shared-allowlist:' + path);
        const ast = ts.createSourceFile(path, source.text, ts.ScriptTarget.Latest, true);
        const imports: string[] = [];
        const visit = (node: ts.Node) => {
            if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier))
                imports.push(node.moduleSpecifier.text);
            if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword)
                findings.push('dynamic-import:' + path);
            if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'query') {
                const argument = node.arguments[0];
                const sql = argument && (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument)) ? argument.text : undefined;
                if (ownModule && sql === undefined)
                    findings.push('uninspectable-module-sql:' + path);
                if (sql !== undefined) {
                    for (const match of sql.matchAll(/\b(?:FROM|JOIN|INTO|UPDATE|TABLE)\s+([a-z_][a-z_0-9.]*)/gi)) {
                        const table = match[1]!.toLowerCase();
                        if (table === 'set')
                            continue; // ON CONFLICT DO UPDATE SET is not a table reference.
                        if (ownModule && tableOwners[table] !== ownModule)
                            findings.push('table-ownership:' + path + ':' + table);
                    }
                    if (/\b(?:BEGIN|COMMIT|ROLLBACK|SAVEPOINT)\b/i.test(sql) && path !== 'src/shared/infrastructure/postgres.ts')
                        findings.push('transaction-control-owner:' + path);
                }
            }
            if (ts.isInterfaceDeclaration(node) && /Repository$/.test(node.name.text) && !path.includes('/application/ports/'))
                findings.push('port-placement:' + path);
            if (ts.isClassDeclaration(node) && node.name && /Repository$/.test(node.name.text) && !path.includes('/infrastructure/persistence/repositories/'))
                findings.push('repository-implementation-placement:' + path);
            if ((layer === 'domain' || layer === 'application') && ts.isPropertyAccessExpression(node) &&
                (/^(process|console)$/.test(node.expression.getText(ast)) ||
                    (node.expression.getText(ast) === 'Date' && node.name.text === 'now') ||
                    (node.expression.getText(ast) === 'Math' && node.name.text === 'random')))
                findings.push('inner-global-io:' + path);
            ts.forEachChild(node, visit);
        };
        visit(ast);
        for (const specifier of imports) {
            const relative = specifier.startsWith('.');
            const target = relative ? posix.normalize(posix.join(posix.dirname(path), specifier)) : specifier;
            if (relative)
                graph.set(path, [...(graph.get(path) ?? []), target]);
            const targetLayer = layerOf('/' + target), otherModule = moduleOf(target);
            if (ownModule && otherModule && ownModule !== otherModule)
                findings.push('module-isolation:' + path);
            if (path.startsWith('src/shared/') && otherModule)
                findings.push('shared-module-dependency:' + path);
            if (layer !== 'bootstrap' && targetLayer === 'bootstrap')
                findings.push('bootstrap-inversion:' + path);
            const forbidden: Record<string, string[]> = {
                domain: ['api', 'application', 'infrastructure', 'bootstrap'],
                application: ['api', 'infrastructure', 'bootstrap'], api: ['domain', 'infrastructure', 'bootstrap'],
                infrastructure: ['api', 'bootstrap']
            };
            if (targetLayer && (forbidden[layer ?? ''] ?? []).includes(targetLayer))
                findings.push('layer-direction:' + path);
            if ((layer === 'domain' || layer === 'application') && !relative)
                findings.push('inner-framework:' + path);
            if (target.includes('contract.generated') && layer !== 'api')
                findings.push('dto-leak:' + path);
            if ((specifier === 'pg' || /prisma|typeorm|sequelize/.test(specifier)) && layer !== 'infrastructure')
                findings.push('database-type-leak:' + path);
            if (target.includes('/tests/'))
                findings.push('test-code-in-production:' + path);
        }
        if (path.includes('/application/') && /\b(?:Pool|PoolClient|QueryResult|QueryResultRow)\b/.test(source.text))
            findings.push('row-in-application:' + path);
        if (path.includes('/domain/') && /@(?:Entity|Column|Serializable)|JSON\.(parse|stringify)/.test(source.text))
            findings.push('domain-serialization:' + path);
        if (layer !== 'infrastructure' && layer !== 'bootstrap' && /\.(?:query|connect|commit|rollback)\(/.test(source.text))
            findings.push('database-io-location:' + path);
    }
    const visited = new Set<string>(), active = new Set<string>();
    const walk = (path: string) => {
        if (active.has(path)) {
            findings.push('import-cycle:' + path);
            return;
        }
        if (visited.has(path))
            return;
        active.add(path);
        for (const next of graph.get(path) ?? [])
            walk(next);
        active.delete(path);
        visited.add(path);
    };
    for (const path of graph.keys())
        walk(path);
    return findings;
}
