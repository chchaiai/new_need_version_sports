import type {TransactionRunner} from '../../../shared/application/transactions/transaction-runner.ts';
import type {SessionIdentity} from './ports/session-commands.ts';
import type {SessionQueryRepository,SessionQueryCourses} from './ports/session-queries.ts';
import {SessionCommandFailure, type SessionCommandResult} from './session-commands.ts';

/** Uses original-course authority, not a new-start or current-enrollment gate. */
export class SessionQueryService {
  private readonly d:{transactions:TransactionRunner;identity:SessionIdentity;repository:SessionQueryRepository;courses:SessionQueryCourses;clock:{now():number}};
  constructor(dependencies:SessionQueryService['d']){this.d=dependencies;}
  async get(token:string,id:string):Promise<SessionCommandResult>{
    if(typeof id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))throw new SessionCommandFailure('RESOURCE_NOT_FOUND');
    return this.d.transactions.run(async scope=>{
      const actor=await this.d.identity.authenticate(token,scope,'BUSINESS');
      if(actor.role!=='STUDENT'&&actor.role!=='TEACHER')throw new SessionCommandFailure('FORBIDDEN');
      const org=actor.organizationId.toLowerCase(),subject=actor.subjectId.toLowerCase();
      const reference=await this.d.repository.reference(scope,org,id.toLowerCase());
      if(!reference||(actor.role==='STUDENT'&&reference.studentSubjectId.toLowerCase()!==subject))throw new SessionCommandFailure('RESOURCE_NOT_FOUND');
      const course=await this.d.courses.facts(scope,org,reference.courseId);
      if(course.organizationId.toLowerCase()!==org||course.courseId.toLowerCase()!==reference.courseId.toLowerCase())throw new SessionCommandFailure('DEPENDENCY_UNAVAILABLE');
      if(actor.role==='TEACHER'&&course.responsibleTeacherSubjectId.toLowerCase()!==subject)throw new SessionCommandFailure('FORBIDDEN');
      const facts=await this.d.repository.findLocked(scope,org,id.toLowerCase());
      if(!facts)throw new SessionCommandFailure('RESOURCE_NOT_FOUND');
      if(actor.role==='TEACHER'&&facts.status!=='COMPLETED')throw new SessionCommandFailure('FORBIDDEN');
      if(facts.courseId!==reference.courseId||facts.studentSubjectId!==reference.studentSubjectId)throw new SessionCommandFailure('DEPENDENCY_UNAVAILABLE');
      const observedAtMs=this.d.clock.now();
      if(!Number.isSafeInteger(observedAtMs)||observedAtMs<facts.startedAtMs)throw new SessionCommandFailure('DEPENDENCY_UNAVAILABLE');
      return {facts,observedAtMs};
    });
  }
}
