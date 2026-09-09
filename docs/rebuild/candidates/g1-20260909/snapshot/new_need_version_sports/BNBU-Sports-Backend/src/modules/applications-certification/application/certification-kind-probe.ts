import { CertificationKind } from '../domain/certification-kind.ts';
import type { CertificationKindRepository } from './ports/certification-kind-repository.ts';
import type { TransactionRunner } from '../../../shared/application/transactions/transaction-runner.ts';
export interface CertificationKindCommand { id: string; kind: 'SCHOOL_TEAM' | 'STUDENT_CLUB' }
export interface CertificationKindResult { kind: 'SCHOOL_TEAM' | 'STUDENT_CLUB' }
/** Foundation-only mapping/persistence probe. No application approval or HTTP business endpoint. */
export class CertificationKindProbe {
  private readonly repository: CertificationKindRepository;
  private readonly transactions: TransactionRunner;
  constructor(repository: CertificationKindRepository, transactions: TransactionRunner) {
    this.repository = repository; this.transactions = transactions;
  }
  async execute(command: CertificationKindCommand): Promise<CertificationKindResult> {
    const kind = CertificationKind.from(command.kind);
    await this.transactions.run(async scope => this.repository.save(command.id, kind, scope));
    return { kind: kind.value };
  }
  async read(id: string): Promise<CertificationKindResult | undefined> {
    const kind = await this.repository.find(id);
    return kind ? { kind: kind.value } : undefined;
  }
}
