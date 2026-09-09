import type { TransactionScope } from '../../../../shared/application/transactions/transaction-runner.ts';
import type { SessionFacts } from '../public/sessions.ts';
export interface SessionQueryRepository {
  reference(scope:TransactionScope,org:string,id:string):Promise<{studentSubjectId:string;courseId:string;startedAtMs:number}|null>;
  findLocked(scope:TransactionScope,org:string,id:string):Promise<SessionFacts|null>;
}
export interface SessionQueryCourses {
  facts(scope:TransactionScope,org:string,course:string):Promise<{
    organizationId:string;courseId:string;responsibleTeacherSubjectId:string;
  }>;
}
