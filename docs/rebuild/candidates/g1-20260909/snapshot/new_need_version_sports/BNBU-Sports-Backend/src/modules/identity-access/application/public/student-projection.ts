import type { TransactionScope } from '../../../../shared/application/transactions/transaction-runner.ts';
import type { StudentIdentity } from './identity.ts';
/** Display-only live-student facts; not an authentication or mutation-serialization capability. */
export interface StudentProjectionAccess {
    readCurrentStudent(scope: TransactionScope, organizationId: string, subjectId: string): Promise<StudentIdentity>;
}
