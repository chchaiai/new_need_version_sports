export interface MaterialDeclaration {
  readonly assetId: string;
  readonly position: number;
  readonly phase: 'BEFORE' | 'AFTER' | null;
  readonly checksumSha256: string;
}
export class MaterialDeclarationFailure extends Error {
  readonly code = 'MATERIAL_BATCH_CONFLICT';
  constructor() { super('MATERIAL_BATCH_CONFLICT'); this.name = 'MaterialDeclarationFailure'; }
}

/** Canonical identity is position, not incoming array order; gaps are allowed by Contract. */
export function lockMaterialDeclarations(items: readonly MaterialDeclaration[]): readonly MaterialDeclaration[] {
  if (!Array.isArray(items) || items.length < 1 || items.length > 7) throw new MaterialDeclarationFailure();
  const ids = new Set<string>(), positions = new Set<number>();
  const normalized = items.map(item => {
    if (!item || typeof item.assetId !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.assetId) ||
      !Number.isInteger(item.position) || item.position < 0 || item.position > 6 ||
      ![null, 'BEFORE', 'AFTER'].includes(item.phase) || typeof item.checksumSha256 !== 'string' ||
      !/^[0-9a-f]{64}$/i.test(item.checksumSha256)) throw new MaterialDeclarationFailure();
    const assetId = item.assetId.toLowerCase();
    if (ids.has(assetId) || positions.has(item.position)) throw new MaterialDeclarationFailure();
    ids.add(assetId); positions.add(item.position);
    return Object.freeze({...item, assetId, checksumSha256:item.checksumSha256.toLowerCase()});
  });
  return Object.freeze(normalized.sort((a,b) => a.position - b.position));
}
