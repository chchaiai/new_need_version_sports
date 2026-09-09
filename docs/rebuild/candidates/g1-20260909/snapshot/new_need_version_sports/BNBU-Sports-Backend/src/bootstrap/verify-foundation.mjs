import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { readContract, readFixtures, digest } from './contract-input.mjs';
const require = createRequire(import.meta.url);
const evidence = resolve('evidence/phase7/7.0');
mkdirSync(evidence, { recursive: true });
// Keep failed attempts, and never let a previous run's counts appear in this run.
const attempt = resolve(evidence, 'attempts', new Date().toISOString().replaceAll(':', '-'));
const previous = ['summary.json', 'vitest-contract.json', 'vitest-architecture.json', 'vitest-integration.json',
  'compatibility-cases.json', 'architecture.json', 'container-versions.json', 'postgres-runtime.json', 'source-manifest.json',
  'contract-check.log', 'typecheck.log', 'lint.log', 'test-contract.log', 'test-architecture.log', 'test-integration.log'];
for (const name of previous) if (existsSync(resolve(evidence, name))) {
  mkdirSync(attempt, { recursive: true }); renameSync(resolve(evidence, name), resolve(attempt, name));
}
const secret = process.env.PGPASSWORD;
const redact = text => secret ? text.replaceAll(secret, '[REDACTED]') : text;
const steps = [];
const startedAt = new Date().toISOString();
let failure = null;
let identity;
let manifestSha256;
let auditMetadata;
try {
  const collect = dir => readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = dir + '/' + entry.name;
    if (entry.isSymbolicLink()) throw new Error('SOURCE_SYMLINK_NOT_ALLOWED:' + path);
    return entry.isDirectory() ? collect(path) : [path];
  });
  const sourcePaths = ['package.json', 'package-lock.json', 'tsconfig.json', 'eslint.config.mjs',
    'vitest.config.ts', 'Dockerfile.test', '.dockerignore', 'docker-compose.test.yml', 'README.md',
    ...collect('src'), ...collect('tests'), ...collect('migrations')].sort();
  const sourceManifest = sourcePaths.map(path => ({ path, sha256: digest(readFileSync(path)) }));
  const manifestText = JSON.stringify(sourceManifest, null, 2) + '\n';
  manifestSha256 = digest(manifestText);
  writeFileSync(resolve(evidence, 'source-manifest.json'), manifestText);
  if (process.version !== 'v24.19.0') throw new Error('NODE_VERSION_MISMATCH');
  const npm = spawnSync('npm', ['--version'], { encoding: 'utf8' });
  if (npm.status !== 0 || npm.stdout.trim() !== '11.17.0') throw new Error('NPM_VERSION_MISMATCH');
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  const packages = { ...pkg.dependencies, ...pkg.devDependencies };
  const dependencyTree = spawnSync('npm', ['ls', '--depth=0', '--json'], { encoding: 'utf8' });
  writeFileSync(resolve(evidence, 'dependency-versions.json'), redact(dependencyTree.stdout));
  if (dependencyTree.status !== 0) throw new Error('DEPENDENCY_TREE_INVALID');
  // Bind the build-time online audit to the exact lockfile being tested offline.
  const auditBytes = readFileSync('/build-audit/dependency-audit.json');
  const audit = JSON.parse(auditBytes);
  auditMetadata = JSON.parse(readFileSync('/build-audit/dependency-audit.json.meta.json', 'utf8'));
  writeFileSync(resolve(evidence, 'dependency-audit.json'), auditBytes);
  writeFileSync(resolve(evidence, 'dependency-audit.json.meta.json'), JSON.stringify(auditMetadata, null, 2) + '\n');
  if (auditMetadata.lockfileSha256 !== digest(readFileSync('package-lock.json')) || !auditMetadata.passed ||
      auditMetadata.exitCode !== 0 || audit.error || audit.metadata?.vulnerabilities?.total !== 0)
    throw new Error('DEPENDENCY_AUDIT_FAILED_OR_LOCKFILE_MISMATCH');
  steps.push({ name: 'dependency-audit', exitCode: 0, command: auditMetadata.command,
    cwd: auditMetadata.cwd, recordedAt: auditMetadata.recordedAt, log: 'dependency-audit.json' });
  const actualDependencies = {};
  for (const [name, expected] of Object.entries(packages)) {
    const actual = JSON.parse(readFileSync(resolve('node_modules', name, 'package.json'), 'utf8')).version;
    if (actual !== expected) throw new Error('DEPENDENCY_VERSION_MISMATCH:' + name);
    actualDependencies[name] = actual;
  }
  // Force loading the driver from this locked installation, never from the host.
  require.resolve('pg');
  identity = readContract();
  const fixtures = readFixtures();
  if (fixtures.cases.length !== 992 || fixtures.cases.filter(c => c.expectedValid).length !== 159)
    throw new Error('CORPUS_COUNT_MISMATCH');
  writeFileSync(resolve(evidence, 'container-versions.json'), JSON.stringify({
    node: process.version, npm: npm.stdout.trim(), platform: process.platform, arch: process.arch,
    dependencies: actualDependencies, canonicalSha256: identity.canonicalSha256,
    checkoutSha256: identity.rawSha256, fixtures: fixtures.cases.length
  }, null, 2) + '\n');
  steps.push({ name: 'environment-and-canonical-input', exitCode: 0 });
  for (const name of ['contract:check', 'typecheck', 'lint', 'test:contract', 'test:architecture', 'test:integration']) {
    const started = Date.now();
    const result = spawnSync('npm', ['run', name], { encoding: 'utf8', maxBuffer: 24 * 1024 * 1024,
      timeout: 180000, env: { ...process.env, CI: 'true' } });
    const log = name.replaceAll(':', '-') + '.log';
    writeFileSync(resolve(evidence, log), redact((result.stdout ?? '') + (result.stderr ?? '')));
    const code = result.status ?? 1;
    steps.push({ name, command: ['npm', 'run', name], cwd: process.cwd(), exitCode: code,
      durationMs: Date.now() - started, log, error: result.error?.message ?? null });
    console.log(name + ': ' + (code === 0 ? 'PASS' : 'FAIL') + ' (' + code + ')');
    if (code !== 0) throw new Error('FOUNDATION_STEP_FAILED:' + name);
  }
} catch (error) { failure = redact(error.message); }
const counts = {};
for (const kind of ['contract', 'architecture', 'integration']) {
  const path = resolve(evidence, 'vitest-' + kind + '.json');
  if (!existsSync(path)) continue;
  const text = redact(readFileSync(path, 'utf8'));
  writeFileSync(path, text);
  const report = JSON.parse(text);
  counts[kind] = { total: report.numTotalTests, passed: report.numPassedTests, failed: report.numFailedTests };
}
const readIfExists = name => existsSync(resolve(evidence, name)) ? JSON.parse(readFileSync(resolve(evidence, name), 'utf8')) : null;
const report = { phase: 'P7-Z-0', startedAt, finishedAt: new Date().toISOString(),
  technicalStatus: failure ? 'FAIL' : 'PASS', exitCode: failure ? 1 : 0, failure,
  canonicalSha256: identity?.canonicalSha256, steps, testCounts: counts,
  sourceManifestSha256: manifestSha256,
  containerVersions: readIfExists('container-versions.json'),
  contractVersion: identity?.document.info.version, contractStatus: identity?.document.info['x-contract-status'],
  compatibility: (() => { const c = readIfExists('compatibility-cases.json'); return c && {
    total: c.expectedCount, positive: c.positiveCount, completed: c.completedCount,
    oldUnionCaseCount: c.oldUnionCaseCount, oldUnionLegalBranches: c.oldUnionLegalBranches,
    unionGroups: c.unionGroups.map(g => ({ schema: g.schema, branches: g.branches, directCaseCount: g.directCaseIds.length }))
  }; })(),
  hostDocker: readIfExists('host-docker.json'), images: readIfExists('host-images.json'),
  hostComposeVersion: existsSync(resolve(evidence, 'host-compose-version.txt')) ? readFileSync(resolve(evidence, 'host-compose-version.txt'), 'utf8').trim() : null,
  postgres: readIfExists('postgres-runtime.json'),
  scope: 'Foundation only: no business endpoint or product authentication implemented.',
  transactionCoverage: 'NOT_APPLICABLE_TO_BUSINESS_SLICE; foundation commit/rollback only',
  humanReview: 'PENDING_H_SEC_01_CLOSURE', finalAcceptance: 'PENDING_USER_ACCEPTANCE',
  stageStatus: failure ? 'IN_PROGRESS' : 'READY_FOR_TECHNICAL_REVIEW',
  securityAudit: auditMetadata ?? { passed: false, error: 'NO_VERIFIED_BUILD_AUDIT' },
  securityFinding: { id: 'SEC-01', implementationStatus: failure ? 'IN_PROGRESS' : 'READY_FOR_CLOSURE_CHECK',
    reviewerClosure: 'PENDING', previousAudit: 'sec-01/before-dependency-audit.json' } };
writeFileSync(resolve(evidence, 'summary.json'), JSON.stringify(report, null, 2) + '\n');
process.exitCode = report.exitCode;
