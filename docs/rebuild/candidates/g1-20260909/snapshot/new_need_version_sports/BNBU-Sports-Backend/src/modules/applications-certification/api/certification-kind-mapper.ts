import type { components } from '../../../shared/api/contract.generated.ts';
import type { ContractValidator } from '../../../shared/api/contract-validator.ts';
import type { CertificationKindCommand, CertificationKindResult } from '../application/certification-kind-probe.ts';
export function toCertificationCommand(validator: ContractValidator, id: string, input: unknown): CertificationKindCommand {
  const kind: components['schemas']['CertificationKind'] = validator.parse('CertificationKind', input);
  switch (kind) {
    case 'SCHOOL_TEAM': return { id, kind: 'SCHOOL_TEAM' };
    case 'STUDENT_CLUB': return { id, kind: 'STUDENT_CLUB' };
    default: { const unreachable: never = kind; throw new Error('UNMAPPED_CERTIFICATION_KIND:' + unreachable); }
  }
}
export function toCertificationWire(result: CertificationKindResult): components['schemas']['CertificationKind'] {
  switch (result.kind) {
    case 'SCHOOL_TEAM': return 'SCHOOL_TEAM';
    case 'STUDENT_CLUB': return 'STUDENT_CLUB';
    default: { const unreachable: never = result.kind; throw new Error('UNMAPPED_CERTIFICATION_KIND:' + unreachable); }
  }
}
