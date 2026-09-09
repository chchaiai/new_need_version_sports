import type { TransactionRunner, TransactionScope } from '../../../shared/application/transactions/transaction-runner.ts';
import { SessionAccessFailure, type SessionFacts } from './public/sessions.ts';
import { SessionTimingError } from '../domain/session-timing.ts';
import type { SessionCommandRepository, SessionIdentity, SessionAdmissionPort, ExistingSessionCoursePort,
  SessionAudit, SessionReplayStore, SessionSecrets, SessionActor, SessionMode } from './ports/session-commands.ts';

export class SessionCommandFailure extends Error {
  readonly code: 'INVALID_REQUEST' | 'FORBIDDEN' | 'IDEMPOTENCY_KEY_REUSED' | 'SESSION_ALREADY_ACTIVE' | 'SESSION_TRANSITION_INVALID' | 'VERSION_CONFLICT' | 'RESOURCE_NOT_FOUND' | 'DEPENDENCY_UNAVAILABLE';
  constructor(code: SessionCommandFailure['code']) { super(code); this.name='SessionCommandFailure'; this.code=code; }
}
export interface SessionCommandResult { readonly facts: SessionFacts; readonly observedAtMs: number }
interface Command { key: string; requestId: string }
interface Dependencies {
  transactions: TransactionRunner; repository: SessionCommandRepository; identity: SessionIdentity;
  admission: SessionAdmissionPort; courses: ExistingSessionCoursePort; audit: SessionAudit;
  replay: SessionReplayStore; secrets: SessionSecrets; clock: { now(): number }; mode: SessionMode;
}
function uuid(id: string): string {
  if(typeof id!=='string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw new SessionCommandFailure('INVALID_REQUEST');
  }
  return id.toLowerCase();
}
function same(a: string,b: string): boolean { return a.toLowerCase()===b.toLowerCase(); }
export class SessionCommandService {
  private readonly d: Dependencies;
  constructor(dependencies: Dependencies) { this.d=dependencies; }

  private async execute(token: string,operation: string,resource: string,command: Command,input: unknown,
    work: (scope: TransactionScope,actor: SessionActor)=>Promise<SessionCommandResult>,
    authorizeOriginal?: (scope: TransactionScope,actor: SessionActor)=>Promise<void>): Promise<SessionCommandResult> {
    if(typeof command.key!=='string' || command.key.length===0 || typeof command.requestId!=='string' || command.requestId.length===0) {
      throw new SessionCommandFailure('INVALID_REQUEST');
    }
    return this.d.transactions.run(async scope=>{
      const actor=await this.d.identity.authenticate(token,scope,'AUTHENTICATION_ONLY');
      if(actor.role!=='STUDENT') throw new SessionCommandFailure('FORBIDDEN');
      if(authorizeOriginal) await authorizeOriginal(scope,actor);
      await this.d.mode.read(scope,actor.organizationId);
      const subject=uuid(actor.organizationId)+'/'+uuid(actor.subjectId)+'/'+resource;
      const key=this.d.secrets.digest('idempotency-key',uuid(command.key));
      const fingerprint=this.d.secrets.digest('command/'+operation,input);
      const sealContext=subject+'/'+operation+'/'+key;
      const saved=await this.d.replay.reserve(scope,subject,operation,key,fingerprint);
      if(!this.d.secrets.equal(saved.fingerprint,fingerprint)) throw new SessionCommandFailure('IDEMPOTENCY_KEY_REUSED');
      if(saved.result!==null) return this.d.secrets.open<SessionCommandResult>(sealContext,saved.result);
      const current=await this.d.identity.authenticate(token,scope,'BUSINESS');
      if(!same(current.organizationId,actor.organizationId)||!same(current.subjectId,actor.subjectId)||current.role!==actor.role) {
        throw new SessionCommandFailure('DEPENDENCY_UNAVAILABLE');
      }
      const result=await work(scope,actor);
      await this.d.audit.append(scope,{organizationId:actor.organizationId,actorSubjectId:actor.subjectId,
        action:operation.replace(/([A-Z])/g,'_$1').toUpperCase(),resourceId:result.facts.sessionId,requestId:command.requestId});
      await this.d.replay.finish(scope,subject,operation,key,this.d.secrets.seal(sealContext,result));
      return result;
    }).catch(error=>{
      if(error instanceof SessionTimingError) {
        throw new SessionCommandFailure(error.code==='STATE_VERSION_CONFLICT'?'VERSION_CONFLICT':
          error.code==='INVALID_SESSION_TRANSITION'?'SESSION_TRANSITION_INVALID':'DEPENDENCY_UNAVAILABLE');
      }
      if(error instanceof SessionAccessFailure) {
        throw new SessionCommandFailure(error.code==='ACTIVE_SESSION_EXISTS'?'SESSION_ALREADY_ACTIVE':
          error.code==='SESSION_NOT_FOUND'?'RESOURCE_NOT_FOUND':'DEPENDENCY_UNAVAILABLE');
      }
      throw error;
    });
  }

  async start(token: string,command: Command,input: {courseId:string;expectedRuleVersionId:string;makeupAuthorizationId:string|null}): Promise<SessionCommandResult> {
    const normalized={courseId:uuid(input.courseId),expectedRuleVersionId:uuid(input.expectedRuleVersionId),
      makeupAuthorizationId:input.makeupAuthorizationId===null?null:uuid(input.makeupAuthorizationId)};
    return this.execute(token,'startExerciseSession',normalized.courseId,command,normalized,async(scope,actor)=>{
      const admitted=await this.d.admission.authorizeSessionStart(scope,{accessToken:token,...normalized});
      if(!same(admitted.organizationId,actor.organizationId)||!same(admitted.studentSubjectId,actor.subjectId)||
         !same(admitted.course.courseId,normalized.courseId)||!same(admitted.course.ruleVersionId,normalized.expectedRuleVersionId)||
         !Number.isSafeInteger(admitted.admittedAt)||admitted.admittedAt<0||
         (normalized.makeupAuthorizationId===null ? admitted.makeupAuthorization!==null :
          admitted.makeupAuthorization===null||!same(admitted.makeupAuthorization.authorizationId,normalized.makeupAuthorizationId))) {
        throw new SessionCommandFailure('DEPENDENCY_UNAVAILABLE');
      }
      await this.d.repository.lockOwner(scope,actor.organizationId,actor.subjectId);
      if(await this.d.repository.hasActive(scope,actor.organizationId,actor.subjectId)) throw new SessionCommandFailure('SESSION_ALREADY_ACTIVE');
      const id=this.d.secrets.id();
      await this.d.repository.insert(scope,{sessionId:id,organizationId:actor.organizationId,studentSubjectId:actor.subjectId,
        semesterId:admitted.course.semesterId,courseId:admitted.course.courseId,enrollmentId:admitted.enrollmentId,
        ruleVersionId:admitted.course.ruleVersionId,makeupAuthorizationId:normalized.makeupAuthorizationId,
        thresholdMinutes:admitted.course.thresholdMinutes,startedAtMs:admitted.admittedAt,commandId:this.d.secrets.id()});
      const facts=await this.d.repository.findLocked(scope,actor.organizationId,id);
      if(!facts) throw new SessionCommandFailure('DEPENDENCY_UNAVAILABLE');
      return {facts,observedAtMs:admitted.admittedAt};
    });
  }

  async transition(token:string,command:Command,input:{sessionId:string;expectedVersion:number;action:'PAUSE'|'RESUME'|'COMPLETE'}):Promise<SessionCommandResult> {
    if(!Number.isSafeInteger(input.expectedVersion)||input.expectedVersion<0||!['PAUSE','RESUME','COMPLETE'].includes(input.action)) {
      throw new SessionCommandFailure('INVALID_REQUEST');
    }
    const normalized={sessionId:uuid(input.sessionId),expectedVersion:input.expectedVersion,action:input.action};
    const operations={PAUSE:'pauseExerciseSession',RESUME:'resumeExerciseSession',COMPLETE:'completeExerciseSession'};
    return this.execute(token,operations[input.action],normalized.sessionId,command,normalized,async(scope,actor)=>{
      await this.d.repository.lockOwner(scope,actor.organizationId,actor.subjectId);
      const reference=await this.d.repository.reference(scope,actor.organizationId,normalized.sessionId);
      if(!reference||!same(reference.studentSubjectId,actor.subjectId)) throw new SessionCommandFailure('RESOURCE_NOT_FOUND');
      await this.d.courses.assertExistingChain(scope,actor.organizationId,reference.courseId,reference.startedAtMs);
      const now=this.d.clock.now();
      await this.d.repository.transition(scope,actor.organizationId,actor.subjectId,normalized.sessionId,input.action,input.expectedVersion,now,this.d.secrets.id());
      const facts=await this.d.repository.findLocked(scope,actor.organizationId,normalized.sessionId);
      if(!facts) throw new SessionCommandFailure('DEPENDENCY_UNAVAILABLE');
      return {facts,observedAtMs:now};
    },async(scope,actor)=>{
      const original=await this.d.repository.reference(scope,actor.organizationId,normalized.sessionId);
      if(!original||!same(original.studentSubjectId,actor.subjectId)) throw new SessionCommandFailure('RESOURCE_NOT_FOUND');
    });
  }
}
