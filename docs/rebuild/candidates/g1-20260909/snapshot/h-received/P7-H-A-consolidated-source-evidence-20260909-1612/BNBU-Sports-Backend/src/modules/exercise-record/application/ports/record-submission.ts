import type {TransactionScope} from '../../../../shared/application/transactions/transaction-runner.ts';
import type {MaterialDeclaration} from '../../domain/material-declarations.ts';
import type {FirstWindow} from '../../domain/first-material.ts';

export interface RecordActor {organizationId:string;subjectId:string;role:'STUDENT'|'TEACHER'|'ADMIN'}
export interface RecordIdentity {authenticate(token:string,scope:TransactionScope,purpose:'AUTHENTICATION_ONLY'|'BUSINESS'):Promise<RecordActor>}
export interface RecordMode {read(scope:TransactionScope,org:string):Promise<unknown>}
export interface RecordOwnerLock {lockStudentOwner(scope:TransactionScope,org:string,student:string):Promise<void>}
export interface RecordSessionFacts {
  sessionId:string;organizationId:string;studentSubjectId:string;courseId:string;ruleVersionId:string;
  startedAtMs:number;completedAtMs:number|null;status:'ACTIVE'|'PAUSED'|'COMPLETED';stateVersion:number;
}
export interface RecordSessions {
  reference(scope:TransactionScope,org:string,id:string):Promise<{studentSubjectId:string;courseId:string;startedAtMs:number}|null>;
  facts(scope:TransactionScope,org:string,id:string):Promise<RecordSessionFacts>;
}
export interface RecordCourses {assertExistingChain(scope:TransactionScope,org:string,course:string,acceptedAtMs:number):Promise<unknown>}
export interface RecordSubmissionMedia {
  bindAccepted(scope:TransactionScope,input:{organizationId:string;ownerSubjectId:string;sessionId:string;recordId:string;assetIds:readonly string[]}):Promise<void>;
  inspectForAcceptance(scope:TransactionScope,input:{organizationId:string;ownerSubjectId:string;sessionId:string;
    members:readonly MaterialDeclaration[];swimming:boolean}):Promise<readonly {
      assetId:string;completedAtUs:bigint|null;verifiedAtUs:bigint|null;verified:boolean;
    }[]>;
}
/** Required authoritative source, not inferred from a caller's route/phase labels.
 * Must retain revision/provenance locks until the transaction ends. The current command supports
 * unadjusted first windows only; affected maintenance/incident chains must fail unavailable here.
 */
export interface RecordSubmissionEligibility {
  assertUnadjusted(scope:TransactionScope,input:{session:RecordSessionFacts;route:FirstWindow;
    members:readonly MaterialDeclaration[];acceptedAtUs:bigint}):Promise<{sourceRevision:number;activity:'ORDINARY'|'SWIMMING'}>;
}
export interface RecordReplay {
  reserve(scope:TransactionScope,subject:string,operation:string,key:string,fingerprint:string):Promise<{fingerprint:string;result:string|null}>;
  finish(scope:TransactionScope,subject:string,operation:string,key:string,result:string):Promise<void>;
}
export interface RecordSecrets {
  id():string;digest(purpose:string,value:unknown):string;equal(a:string,b:string):boolean;
  seal(context:string,value:unknown):string;open<T>(context:string,value:string):T;
}
export interface RecordAudit {append(scope:TransactionScope,event:{organizationId:string;actorSubjectId:string;action:string;resourceId:string;requestId:string}):Promise<void>}
/** Durable event for downstream processing; append is part of the acceptance transaction, not delivery. */
export interface RecordAcceptedOutbox {
  append(scope:TransactionScope,event:{eventId:string;organizationId:string;ownerSubjectId:string;sessionId:string;
    recordId:string;materialId:string;sourceRevision:number;result:FirstAcceptanceResult}):Promise<void>;
}
export interface FirstAcceptanceResult {
  receiptId:string;recordId:string;sessionId:string;materialId:string;batchId:string;route:FirstWindow;
  firstDueAtUs:string;acceptedAtUs:string;transferDueAtUs:string|null;transferCompletedAtUs:string|null;
  readiness:'PENDING_TRANSFER'|'VERIFYING'|'READY';members:readonly MaterialDeclaration[];
}
