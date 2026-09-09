import openapiTS, { astToString } from 'openapi-typescript';
import { readFileSync, writeFileSync } from 'node:fs';
import { readContract, CONTRACT_SHA } from './contract-input.mjs';
const { document } = readContract();
const generated = '// Contract 1.3.0-contract / RC / canonical SHA-256 ' + CONTRACT_SHA + '\n'
  + astToString(await openapiTS(document, { immutable: true, alphabetize: true }));
const output = new URL('../shared/api/contract.generated.ts', import.meta.url);
if (process.argv.includes('--check')) {
  if (readFileSync(output, 'utf8') !== generated) throw new Error('GENERATED_TYPES_DRIFT');
  console.log('Generated API types match the pinned source.');
} else {
  writeFileSync(output, generated);
  console.log('Generated API types from the pinned original OpenAPI.');
}
