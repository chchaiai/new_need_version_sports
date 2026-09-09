import type { StudentIdentity } from '../public/identity.ts';
import type { TransactionScope } from '../../../../shared/application/transactions/transaction-runner.ts';
import type { TeacherInput, TeacherValidationRow } from '../../domain/teacher-csv.ts';
export interface SubAdminFact {
    adminId: string;
    loginName: string;
    name: string;
    verifiedEmail: string;
    department: string | null;
    permissions: string[];
    state: 'ACTIVE' | 'DISABLED';
    createdAt: number;
    updatedAt: number;
    version: number;
}
export interface TeacherFact {
    teacherId: string;
    organizationId: string;
    employeeId: string;
    name: string;
    verifiedEmail: string;
    title: string | null;
    college: string | null;
    department: string | null;
    accountState: 'ACTIVE' | 'DISABLED' | 'RECOVERY_REQUIRED';
    mustChangePassword: boolean;
    updatedAt: number;
    version: number;
}
export interface AccountPageQuery {
    anchor: string | null;
    before: boolean;
    limit: number;
    state: string | null;
    q: string | null;
    college: string | null;
}
export interface GovernanceChanges {
    beforeState?: string | null;
    afterState?: string | null;
    beforePermissions?: readonly string[] | null;
    afterPermissions?: readonly string[] | null;
    reason?: string | null;
}
export interface StudentAccountFact {
    student: StudentIdentity;
    organizationId: string;
    verifiedEmail: string;
    updatedAt: number;
    version: number;
}
export interface GovernanceRepository {
    studentAccounts(scope: TransactionScope, organizationId: string, subjectId?: string): Promise<StudentAccountFact[]>;
    governanceEvent(scope: TransactionScope, id: string, org: string, subject: string, actor: string, action: string, changes: GovernanceChanges, now: number): Promise<void>;
    subAdmin(scope: TransactionScope, org: string, id: string): Promise<SubAdminFact | null>;
    subAdmins(scope: TransactionScope, org: string, query: AccountPageQuery): Promise<{
        items: SubAdminFact[];
        total: number;
        active: number;
    }>;
    teacher(scope: TransactionScope, org: string, id: string): Promise<TeacherFact | null>;
    teachers(scope: TransactionScope, org: string, query: AccountPageQuery): Promise<TeacherFact[]>;
    createSubAdmin(scope: TransactionScope, org: string, id: string, actor: string, input: {
        loginName: string;
        name: string;
        verifiedEmail: string;
        department: string | null;
        permissions: string[];
    }, hash: string, now: number): Promise<void>;
    updateSubAdmin(scope: TransactionScope, id: string, input: {
        name: string;
        verifiedEmail: string;
        department: string | null;
        permissions: string[];
    }, now: number): Promise<void>;
    setState(scope: TransactionScope, id: string, state: 'ACTIVE' | 'DISABLED', now: number): Promise<void>;
    validateExisting(scope: TransactionScope, org: string, rows: TeacherValidationRow[]): Promise<TeacherValidationRow[]>;
    saveValidation(scope: TransactionScope, id: string, org: string, actor: string, sealedRows: string, valid: boolean, now: number, expires: number, previewKey: string): Promise<void>;
    validation(scope: TransactionScope, org: string, actor: string, id: string): Promise<{
        sealedRows: string | null;
        valid: boolean;
        expiresAt: number;
        consumedAt: number | null;
        previewKey: string;
    } | null>;
    lockTeacherCreation(scope: TransactionScope, org: string): Promise<void>;
    createTeacher(scope: TransactionScope, org: string, id: string, input: TeacherInput, hash: string, now: number): Promise<void>;
    consumeValidation(scope: TransactionScope, id: string, now: number): Promise<void>;
}
