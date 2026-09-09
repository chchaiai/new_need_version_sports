import { afterAll, describe, expect, test } from 'vitest';
import { writeFileSync } from 'node:fs';
import { readContract, readFixtures } from '../../src/bootstrap/contract-input.mjs';
import { createContractValidator, type SchemaName } from '../../src/shared/api/contract-validator.ts';
import { toProbeCommand, fromProbeResult } from './probe/api/mapper.ts';
import { executeRepresentationProbe } from './probe/application/execute.ts';
import { CompatibilityValue } from './probe/domain/value.ts';
import { CertificationKind } from '../../src/modules/applications-certification/domain/certification-kind.ts';
import { toCertificationCommand, toCertificationWire } from '../../src/modules/applications-certification/api/certification-kind-mapper.ts';
const { document } = readContract();
const validator = createContractValidator(document.components);
interface Case { name: string; schema: SchemaName; expectedValid: boolean; payload: unknown }
const cases = readFixtures().cases as Case[];
const results: object[] = [];
describe('BE-CR005-COMPAT pinned 992-case backend corpus', () => {
  test.each(cases)('$name', (row) => {
    const input: unknown = structuredClone(row.payload);
    const actual = validator.accepts(row.schema, input);
    expect(actual).toBe(row.expectedValid);
    expect(input).toEqual(row.payload);
    if (actual) {
      const command = toProbeCommand(validator, row.schema, input);
      const output = fromProbeResult(executeRepresentationProbe(command));
      expect(output).toEqual(row.payload);
      expect(validator.accepts(row.schema, output)).toBe(true);
      expect(input).toEqual(row.payload);
    } else expect(() => toProbeCommand(validator, row.schema, input)).toThrow('CONTRACT_INPUT_REJECTED');
    results.push({ id: row.name, schema: row.schema, expectedValid: row.expectedValid,
      backendActualValid: actual, immutableInput: true, mappedRoundtrip: actual, passed: true });
  });
});
test('exact corpus and original union denominators', () => {
  expect(cases).toHaveLength(992);
  expect(cases.filter(x => x.expectedValid)).toHaveLength(159);
  expect(new Set(cases.map(x => x.name)).size).toBe(992);
  expect(cases.filter(x => x.name.startsWith('old-mapping/'))).toHaveLength(59);
  expect(cases.filter(x => x.name.startsWith('old-mapping/') && x.expectedValid)).toHaveLength(7);
});
test.each(['SCHOOL_TEAM', 'STUDENT_CLUB'] as const)('CertificationKind API/Application/Domain %s', kind => {
  const command = toCertificationCommand(validator, '00000000-0000-4000-8000-000000000001', kind);
  const domain = CertificationKind.from(command.kind);
  expect(toCertificationWire({ kind: domain.value })).toBe(kind);
});
test.each([null, undefined, 'school_team', 'UNKNOWN', 1, true, {}])('invalid CertificationKind rejected: %j', value => {
  expect(() => toCertificationCommand(validator, 'probe', value)).toThrow();
  expect(() => CertificationKind.from(value)).toThrow();
});
test('internal unknown variants fail closed independently', () => {
  expect(() => new CompatibilityValue('unknown', {})).toThrow('UNKNOWN_INTERNAL_VARIANT');
});
afterAll(() => {
  const groups: { schema: string; branches: string[]; directCaseIds: string[] }[] = [];
  for (const [name, schema] of Object.entries(document.components.schemas)) {
    const visit = (value: unknown) => {
      if (value === null || typeof value !== 'object') return;
      const node = value as Record<string, unknown>;
      if (node.discriminator) {
        const d = node.discriminator as { mapping: Record<string, string> };
        groups.push({ schema: name, branches: Object.keys(d.mapping), directCaseIds: cases.filter(c => c.schema === name).map(c => c.name) });
      }
      Object.values(node).forEach(visit);
    };
    visit(schema);
  }
  writeFileSync('evidence/phase7/7.0/compatibility-cases.json', JSON.stringify({
    expectedCount: 992, positiveCount: 159, completedCount: results.length,
    passed: results.length === 992, oldUnionCaseCount: 59, oldUnionLegalBranches: 7,
    unionGroups: groups, cases: results,
    scope: 'Backend schema + generated API types + independent API/Application/Domain representation probes. These test-only probes implement no Auth/Course/Review business operations; CertificationKind additionally has real production-layer mappers and PostgreSQL tests.'
  }, null, 2) + '\n');
  expect(groups).toHaveLength(6);
});
