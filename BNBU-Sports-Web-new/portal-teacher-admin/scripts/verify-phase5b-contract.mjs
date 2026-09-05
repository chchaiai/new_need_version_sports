import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const expected = Object.freeze({
  contractVersion: "1.3.0-contract",
  contractStatus: "RC",
  publicBasePath: "/api/v1",
  openapiSha256: "b6bdcad2196dfdd5bccf3c50dc02cf69f5bc431ca4b7d7147efc652004406093",
});

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const contractDirectory = resolve(scriptDirectory, "../../../contracts");
const metadataPath = resolve(contractDirectory, "contract-metadata.json");
const openapiPath = resolve(contractDirectory, "openapi.yaml");

const metadata = JSON.parse(await readFile(metadataPath, "utf8"));
const openapiBytes = await readFile(openapiPath);
const actualSha256 = createHash("sha256").update(openapiBytes).digest("hex");

for (const [key, value] of Object.entries(expected)) {
  if (metadata[key] !== value) {
    throw new Error(`Phase 5B Contract binding mismatch for ${key}: expected ${value}, received ${metadata[key]}`);
  }
}

if (actualSha256 !== expected.openapiSha256) {
  throw new Error(`Phase 5B OpenAPI SHA mismatch: expected ${expected.openapiSha256}, received ${actualSha256}`);
}

console.log(`Phase 5B Contract binding OK: ${expected.contractVersion} / ${expected.contractStatus} / ${actualSha256}`);
