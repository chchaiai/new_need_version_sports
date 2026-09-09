import type { TransactionScope } from '../../../../shared/application/transactions/transaction-runner.ts';
import type { StudentFact } from './dependencies.ts';
/** Bootstrap supplies a display-only capability; mutation guards still lock live Identity accounts. */
export interface CourseStudentProjection {
    readCurrentStudent(scope: TransactionScope, organizationId: string, subjectId: string): Promise<StudentFact>;
}
