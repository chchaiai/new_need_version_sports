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
