import { expect, test } from 'vitest';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { architectureFindings, tableOwners, type Source } from './rules.ts';
function readSources(dir: string): Source[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
        const path = dir + '/' + entry.name;
        return entry.isDirectory() ? readSources(path) : path.endsWith('.ts') || path.endsWith('.mjs')
            ? [{ path, text: readFileSync(path, 'utf8') }] : [];
    });
}
test('production layer/model/port/shared/module rules', () => {
    const sources = readSources('src');
    const findings = architectureFindings(sources);
    writeFileSync('evidence/phase7/7.0/architecture.json', JSON.stringify({
        sourceFiles: sources.map(s => s.path), findings, passed: findings.length === 0,
        tableOwners: { ...tableOwners,
            'public.foundation_migrations': 'foundation migration runner' },
        checks: ['layer-dependencies', 'contract-dto-leakage', 'database-row-leakage',
            'cross-module-repository-and-table-ownership', 'transaction-owner'],
        transactionOwner: 'CertificationKindProbe / foundation test callbacks',
        businessTransactionCoverage: 'NOT_APPLICABLE_TO_BUSINESS_SLICE',
        scope: 'Static import/type/placement enforcement and negative fixtures; real commit/rollback tests run separately.'
    }, null, 2) + '\n');
    expect(findings).toEqual([]);
});
test.each([
    ['domain dependency', 'src/modules/example/domain/value.ts', "import type { Pool } from 'pg';", 'inner-framework'],
    ['API direct Domain', 'src/modules/example/api/mapper.ts', "import { X } from '../domain/x.ts';", 'layer-direction'],
    ['Infrastructure depends on API', 'src/modules/example/infrastructure/adapter.ts', "import { X } from '../api/mapper.ts';", 'layer-direction'],
    ['shared depends on business module', 'src/shared/infrastructure/postgres.ts', "import { X } from '../../modules/example/domain/x.ts';", 'shared-module-dependency'],
    ['DTO leaking into Application', 'src/modules/example/application/command.ts', "import type { components } from '../../../shared/api/contract.generated.ts';", 'dto-leak'],
    ['cross-module Repository', 'src/modules/example/application/command.ts', "import { Repo } from '../../other/infrastructure/repo.ts';", 'module-isolation'],
    ['misplaced Port', 'src/modules/example/domain/repository.ts', 'export interface ValueRepository {}', 'port-placement'],
    ['ORM row leaking', 'src/modules/example/application/result.ts', 'export interface Result { row: QueryResultRow }', 'row-in-application'],
    ['unapproved shared symbol', 'src/shared/application/course-service.ts', 'export const x = 1;', 'shared-allowlist'],
    ['bootstrap inversion', 'src/modules/example/application/handler.ts', "import { x } from '../../../bootstrap/config.ts';", 'bootstrap-inversion'],
    ['dynamic import bypass', 'src/modules/example/domain/x.ts', "const x = import('pg');", 'dynamic-import'],
    ['global clock in Domain', 'src/modules/example/domain/time.ts', 'const t = Date.now();', 'inner-global-io'],
    ['cross-module table read', 'src/modules/example/infrastructure/query.ts', "pool.query('SELECT * FROM foundation_probe.certification_kind');", 'table-ownership'],
    ['undeclared table', 'src/modules/applications-certification/infrastructure/query.ts', "pool.query('SELECT * FROM public.students');", 'table-ownership'],
    ['dynamic module SQL', 'src/modules/example/infrastructure/query.ts', 'pool.query(sql);', 'uninspectable-module-sql'],
    ['Repository takes transaction control', 'src/modules/applications-certification/infrastructure/query.ts', "client.query('COMMIT');", 'transaction-control-owner']
])('negative architectural fixture: %s', (_name, path, text, rule) => {
    expect(architectureFindings([{ path: path!, text: text! }]).some(x => x.startsWith(rule!))).toBe(true);
});
test('cyclic production imports are rejected', () => {
    expect(architectureFindings([
        { path: 'src/bootstrap/a.ts', text: "import './b.ts';" },
        { path: 'src/bootstrap/b.ts', text: "import './a.ts';" }
    ])).toContain('import-cycle:src/bootstrap/a.ts');
});
test('pure numeric helpers remain allowed while nondeterministic randomness is rejected', () => {
    expect(architectureFindings([{ path: 'src/modules/example/domain/value.ts', text: 'const n=Math.floor(12.5); const x=Math.min(n,60);' }])).toEqual([]);
    expect(architectureFindings([{ path: 'src/modules/example/domain/value.ts', text: 'const n=Math.random();' }])).toContain('inner-global-io:src/modules/example/domain/value.ts');
});
test('SQL UPSERT is inspected without treating SET as a table and still detects foreign reads', () => {
    const path = 'src/modules/identity-access/infrastructure/persistence/repositories/x.ts';
    expect(architectureFindings([{ path, text: "client.query('INSERT INTO identity_access.auth_throttle VALUES(1) ON CONFLICT DO UPDATE SET attempts=1');" }])).toEqual([]);
    expect(architectureFindings([{ path, text: "client.query('SELECT * FROM course_enrollment.enrollment');" }])).toContain('table-ownership:' + path + ':course_enrollment.enrollment');
});
test('confirmed H tables allow their exact owner while rejecting other H modules and Z modules', () => {
    const confirmed = [
        ['exercise_session.session', 'exercise-session'],
        ['exercise_session.active_interval', 'exercise-session'],
        ['exercise_session.command_replay', 'exercise-session'],
        ['media_evidence.record_asset', 'media-evidence'],
        ['exercise_record.record', 'exercise-record'],
        ['exercise_record.first_material', 'exercise-record'],
        ['exercise_record.first_material_asset', 'exercise-record'],
        ['exercise_record.command_replay', 'exercise-record'],
        ['exercise_record.acceptance_outbox', 'exercise-record']
    ] as const;
    const modules = ['exercise-session', 'media-evidence', 'exercise-record', 'identity-access', 'course-enrollment'];
    for (const [table, owner] of confirmed) {
        for (const module of modules) {
            const path = 'src/modules/' + module + '/infrastructure/persistence/repositories/ownership-probe.ts';
            const findings = architectureFindings([{ path, text: "client.query('SELECT id FROM " + table + " FOR UPDATE');" }]);
            expect(findings, module + ' -> ' + table).toEqual(module === owner ? [] : ['table-ownership:' + path + ':' + table]);
        }
    }
});
test('H registrations do not allow undeclared same-schema tables or bypass ownership of Z tables', () => {
    for (const [schema, module] of [['exercise_session', 'exercise-session'], ['media_evidence', 'media-evidence'], ['exercise_record', 'exercise-record']]) {
        const path = 'src/modules/' + module + '/infrastructure/persistence/repositories/ownership-probe.ts';
        for (const table of [schema + '.undeclared_table', 'identity_access.login_account', 'course_enrollment.enrollment']) {
            expect(architectureFindings([{ path, text: "client.query('SELECT id FROM " + table + "');" }])).toEqual(['table-ownership:' + path + ':' + table]);
        }
    }
});
