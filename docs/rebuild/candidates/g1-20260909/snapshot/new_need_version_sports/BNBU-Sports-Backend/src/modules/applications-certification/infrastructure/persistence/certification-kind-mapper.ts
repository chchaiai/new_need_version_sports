import { CertificationKind } from '../../domain/certification-kind.ts';
export function fromPersistence(row: unknown): CertificationKind {
  if (row === null || typeof row !== 'object' || !('certification_kind' in row))
    throw new Error('PERSISTENCE_INVARIANT_BROKEN');
  try { return CertificationKind.from(row.certification_kind); }
  catch { throw new Error('PERSISTENCE_INVARIANT_BROKEN'); }
}
export function toPersistence(value: CertificationKind): string { return value.value; }
