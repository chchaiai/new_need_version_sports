// Snapshot binding check for the pinned Backend OpenAPI snapshot.
//
// The Backend publishes one immutable snapshot per snapshot version and states
// its SHA-256 in the GitHub Release. `contract:check` only proves that the
// generated types match whatever snapshot sits in this repo; it cannot tell
// that the snapshot itself is the published one. This module closes that gap:
// it re-derives the fingerprint and the surface counts from the bytes on disk
// and compares them with openapi/contract.json.
//
// Run it directly (`npm run contract:verify`) or through tests/contract-binding.test.mjs.

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const PORTAL_ROOT = new URL("../", import.meta.url);

/**
 * Counts the published surface the release manifest reports: path items,
 * operations under those path items, and component schemas. The snapshot is
 * emitted with a stable two-space indentation, so a line scan reproduces the
 * Backend's own counts exactly without pulling in a YAML parser.
 */
export function countContractSurface(yamlText) {
  const OPERATION = /^ {4}(get|put|post|delete|patch|options|head|trace):/;
  let inPaths = false;
  let inSchemas = false;
  let paths = 0;
  let operations = 0;
  let schemas = 0;

  for (const line of yamlText.split(/\r?\n/)) {
    if (/^paths:/.test(line)) {
      inPaths = true;
      inSchemas = false;
      continue;
    }
    if (/^[A-Za-z]/.test(line)) inPaths = false;
    if (/^ {2}schemas:/.test(line)) {
      inSchemas = true;
      continue;
    }
    if (inSchemas && /^ {2}[A-Za-z]/.test(line)) inSchemas = false;

    if (inPaths && /^ {2}\/[^\s:]*:/.test(line)) paths += 1;
    if (inPaths && OPERATION.test(line)) operations += 1;
    if (inSchemas && /^ {4}[A-Za-z0-9_]+:/.test(line)) schemas += 1;
  }

  return { paths, operations, schemas };
}

/** Reads `info.version` without a YAML dependency. */
export function readDeclaredVersion(yamlText) {
  const match = yamlText.match(/^info:\r?\n(?: {2}.*\r?\n)*? {2}version:\s*(.+)$/m);
  return match ? match[1].trim().replace(/^["']|["']$/g, "") : null;
}

export async function verifyContractBinding(portalRoot = PORTAL_ROOT) {
  const descriptor = JSON.parse(
    await readFile(new URL("openapi/contract.json", portalRoot), "utf8"),
  );
  // Read the bytes, never a decoded string: the fingerprint the Backend
  // publishes is over the file as released, and .gitattributes pins it to LF.
  const bytes = await readFile(new URL("openapi/openapi.snapshot.yaml", portalRoot));
  const text = bytes.toString("utf8");

  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const byteLength = bytes.byteLength;
  const declaredVersion = readDeclaredVersion(text);
  const counts = countContractSurface(text);

  const problems = [];
  if (sha256 !== descriptor.sha256) {
    problems.push(
      `snapshot SHA-256 is ${sha256}, but contract.json pins ${descriptor.sha256}`,
    );
  }
  if (declaredVersion !== descriptor.contractVersion) {
    problems.push(
      `snapshot info.version is ${declaredVersion}, but contract.json declares ${descriptor.contractVersion}`,
    );
  }
  if (counts.operations !== descriptor.operationCount) {
    problems.push(
      `snapshot has ${counts.operations} operations, but contract.json declares ${descriptor.operationCount}`,
    );
  }
  if (counts.schemas !== descriptor.schemaCount) {
    problems.push(
      `snapshot has ${counts.schemas} schemas, but contract.json declares ${descriptor.schemaCount}`,
    );
  }
  if (
    typeof descriptor.byteLength === "number" &&
    byteLength !== descriptor.byteLength
  ) {
    problems.push(
      `snapshot is ${byteLength} bytes, but contract.json declares ${descriptor.byteLength}`,
    );
  }

  return { descriptor, sha256, byteLength, declaredVersion, counts, problems };
}

// `file://D:/...` and `file:///D:/...` differ on Windows; compare resolved URLs.
const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  const report = await verifyContractBinding();
  const lines = [
    `pinned version   : ${report.descriptor.contractVersion}`,
    `declared version : ${report.declaredVersion}`,
    `sha256           : ${report.sha256}`,
    `bytes            : ${report.byteLength}`,
    `paths/ops/schemas: ${report.counts.paths}/${report.counts.operations}/${report.counts.schemas}`,
    `source commit    : ${report.descriptor.sourceCommit}`,
  ];
  if (report.problems.length) {
    console.error(`${lines.join("\n")}\n\nSnapshot binding FAILED:`);
    for (const problem of report.problems) console.error(`  - ${problem}`);
    process.exit(1);
  }
  console.log(`${lines.join("\n")}\n\nSnapshot binding OK.`);
}
