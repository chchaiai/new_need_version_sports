import type { TransactionScope } from '../../../shared/application/transactions/transaction-runner.ts';
import type { SessionFactsRepository } from './ports/session-facts-repository.ts';
import { SessionAccessFailure, type SessionAccess, type SessionFacts } from './public/sessions.ts';

/** Not registered until a real repository and shared locking protocol are integrated. */
export class SessionAccessService implements SessionAccess {
  private readonly repository: SessionFactsRepository;
  constructor(repository: SessionFactsRepository) { this.repository = repository; }

  async facts(scope: TransactionScope, organizationId: string, sessionId: string): Promise<SessionFacts> {
    const facts = await this.repository.findLocked(scope, organizationId, sessionId);
    if (!facts) throw new SessionAccessFailure('SESSION_NOT_FOUND');
    if (facts.organizationId.toLowerCase() !== organizationId.toLowerCase() || facts.sessionId.toLowerCase() !== sessionId.toLowerCase()) {
      throw new SessionAccessFailure('SESSION_FACTS_INCONSISTENT');
    }
    return Object.freeze({ ...facts,
      activeIntervals: Object.freeze(facts.activeIntervals.map(interval => Object.freeze({ ...interval }))),
    });
  }

  async assertNoActive(scope: TransactionScope, organizationId: string, studentSubjectId: string): Promise<void> {
    await this.repository.lockOwner(scope, organizationId, studentSubjectId);
    if (await this.repository.hasActive(scope, organizationId, studentSubjectId)) {
      throw new SessionAccessFailure('ACTIVE_SESSION_EXISTS');
    }
  }
}
