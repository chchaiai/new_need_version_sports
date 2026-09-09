import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';

// Runs during image build, where registry access exists and no DB secret is present.
const destination = resolve(process.argv[2] ?? 'evidence/phase7/7.0/dependency-audit.json');
mkdirSync(dirname(destination), { recursive: true });
const result = spawnSync('npm', ['audit', '--json'], {
  encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, timeout: 120000
});
writeFileSync(destination, result.stdout ?? '');
let report;
try { report = JSON.parse(result.stdout); } catch { /* An absent/invalid registry response fails closed. */ }
const counts = report?.metadata?.vulnerabilities;
const passed = result.status === 0 && !report?.error && counts?.total === 0;
const metadata = {
  recordedAt: new Date().toISOString(), command: ['npm', 'audit', '--json'], cwd: process.cwd(),
  node: process.version, exitCode: result.status ?? 1, passed,
  lockfileSha256: createHash('sha256').update(readFileSync('package-lock.json')).digest('hex'),
  affectedPackageNodes: counts ?? null, error: result.error?.message ?? null,
  scope: 'npm registry known dependency advisories for this exact lockfile; not a whole-system security audit'
};
writeFileSync(destination + '.meta.json', JSON.stringify(metadata, null, 2) + '\n');
console.log(JSON.stringify(metadata));
process.exitCode = passed ? 0 : 1;
