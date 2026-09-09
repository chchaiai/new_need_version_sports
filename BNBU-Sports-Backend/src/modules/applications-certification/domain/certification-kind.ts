export type CertificationKindLiteral = 'SCHOOL_TEAM' | 'STUDENT_CLUB';
export class CertificationKind {
  readonly value: CertificationKindLiteral;
  private constructor(value: CertificationKindLiteral) { this.value = value; Object.freeze(this); }
  static from(value: unknown): CertificationKind {
    if (value !== 'SCHOOL_TEAM' && value !== 'STUDENT_CLUB') throw new Error('INVALID_CERTIFICATION_KIND');
    return new CertificationKind(value);
  }
}
