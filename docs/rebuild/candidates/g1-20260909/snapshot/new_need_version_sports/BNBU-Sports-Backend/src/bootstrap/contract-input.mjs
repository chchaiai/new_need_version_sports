import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { parse } from 'yaml';
export const CONTRACT_SHA = '5c87eeb9bca39585cea2e3c80c60d58813b4367e1a60b161ed8c7f82af4a19ed';
export const FIXTURE_SHA = 'd3c2a37f4bad298f383b70579a3e5d22e5e117cd0cee238beb6b6d336dc0deef';
export const inputRoot = process.env.CONTRACT_INPUT ?? resolve('../contracts');
export const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
export function readContract() {
  const raw = readFileSync(resolve(inputRoot, 'openapi.yaml'));
  const canonical = Buffer.from(raw.toString('utf8').replaceAll('\r\n', '\n'));
  if (digest(canonical) !== CONTRACT_SHA) throw new Error('CONTRACT_IDENTITY_MISMATCH');
  // Only parse the exact reviewed document. Arbitrary client YAML is never accepted.
  const document = parse(canonical.toString('utf8'));
  if (document.info.version !== '1.3.0-contract' || document.info['x-contract-status'] !== 'RC')
    throw new Error('CONTRACT_VERSION_MISMATCH');
  return { document, rawSha256: digest(raw), canonicalSha256: digest(canonical) };
}
export function readFixtures() {
  const path = process.env.CONTRACT_INPUT ? resolve(inputRoot, 'fixtures.json')
    : resolve(inputRoot, 'validation/step07_handoff/fixtures.json');
  const bytes = readFileSync(path);
  if (digest(bytes) !== FIXTURE_SHA) throw new Error('FIXTURE_IDENTITY_MISMATCH');
  return JSON.parse(bytes.toString('utf8'));
}
