import type {TransactionRunner} from '../../../shared/application/transactions/transaction-runner.ts';
import {FirstMaterialReceipt, FirstMaterialFailure, type FirstWindow} from '../domain/first-material.ts';
import {lockMaterialDeclarations,type MaterialDeclaration} from '../domain/material-declarations.ts';
import type {FirstRecordRepository} from './ports/first-record-repository.ts';
import type {RecordIdentity,RecordMode,RecordOwnerLock,RecordSessions,RecordCourses,RecordSubmissionMedia,
  RecordSubmissionEligibility,RecordReplay,RecordSecrets,RecordAudit,RecordAcceptedOutbox,FirstAcceptanceResult} from './ports/record-submission.ts';

export class RecordSubmissionFailure extends Error {
  readonly code:'INVALID_REQUEST'|'RECORD_DESCRIPTION_INVALID'|'FORBIDDEN'|'RESOURCE_NOT_FOUND'|'IDEMPOTENCY_KEY_REUSED'|
    'SESSION_TRANSITION_INVALID'|'VERSION_CONFLICT'|'FIRST_MATERIAL_ALREADY_ACCEPTED'|'FIRST_MATERIAL_DEADLINE_MISSED'|
    'MEDIA_CONTENT_INVALID'|'MEDIA_NOT_VERIFIED'|'DEPENDENCY_UNAVAILABLE';
  constructor(code:RecordSubmissionFailure['code']){super(code);this.name='RecordSubmissionFailure';this.code=code;}
}
export interface FirstRecordCommand {
  sessionId:string;expectedSessionVersion:number;route:FirstWindow;category:'COURSE_RELATED'|'OTHER';
  description:string;delayExplanation:string|null;members:readonly MaterialDeclaration[];
}
function uuid(value:string):string{
  if(typeof value!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))throw new RecordSubmissionFailure('INVALID_REQUEST');
  return value.toLowerCase();
}
function normalize(input:FirstRecordCommand):FirstRecordCommand{
  if(!Number.isSafeInteger(input.expectedSessionVersion)||input.expectedSessionVersion<0||
    !['ORDINARY','SWIMMING_TIMELY','SWIMMING_OFFLINE'].includes(input.route)||!['COURSE_RELATED','OTHER'].includes(input.category))throw new RecordSubmissionFailure('INVALID_REQUEST');
  if(typeof input.description!=='string')throw new RecordSubmissionFailure('RECORD_DESCRIPTION_INVALID');
  const description=input.description.trim();if([...description].length<1||[...description].length>200)throw new RecordSubmissionFailure('RECORD_DESCRIPTION_INVALID');
  const delayExplanation=typeof input.delayExplanation==='string'?input.delayExplanation.trim():null;
  if(input.route==='SWIMMING_OFFLINE'?!delayExplanation:input.delayExplanation!==null)throw new RecordSubmissionFailure('INVALID_REQUEST');
  return {...input,sessionId:uuid(input.sessionId),description,delayExplanation,members:lockMaterialDeclarations(input.members)};
}
interface Dependencies {
  transactions:TransactionRunner;identity:RecordIdentity;mode:RecordMode;ownerLock:RecordOwnerLock;sessions:RecordSessions;
  courses:RecordCourses;media:RecordSubmissionMedia;eligibility:RecordSubmissionEligibility;records:FirstRecordRepository;
  replay:RecordReplay;secrets:RecordSecrets;audit:RecordAudit;outbox:RecordAcceptedOutbox;clock:{now():number};
}
export class SubmitFirstRecordService {
  private readonly d:Dependencies;
  constructor(dependencies:Dependencies){this.d=dependencies;}
  async submit(token:string,metadata:{key:string;requestId:string},raw:FirstRecordCommand):Promise<FirstAcceptanceResult>{
    const input=normalize(raw),commandKey=uuid(metadata.key);
    if(typeof metadata.requestId!=='string'||!metadata.requestId)throw new RecordSubmissionFailure('INVALID_REQUEST');
    return this.d.transactions.run(async scope=>{
      const actor=await this.d.identity.authenticate(token,scope,'AUTHENTICATION_ONLY');
      if(actor.role!=='STUDENT')throw new RecordSubmissionFailure('FORBIDDEN');
      const org=uuid(actor.organizationId),student=uuid(actor.subjectId);
      const original=await this.d.sessions.reference(scope,org,input.sessionId);
      if(!original||uuid(original.studentSubjectId)!==student)throw new RecordSubmissionFailure('RESOURCE_NOT_FOUND');
      await this.d.mode.read(scope,org);
      const subject=org+'/'+student+'/'+input.sessionId,operation='submitExerciseRecord';
      const key=this.d.secrets.digest('idempotency-key',commandKey),fingerprint=this.d.secrets.digest('command/'+operation,input);
      const context=subject+'/'+operation+'/'+key;
      const saved=await this.d.replay.reserve(scope,subject,operation,key,fingerprint);
      if(!this.d.secrets.equal(saved.fingerprint,fingerprint))throw new RecordSubmissionFailure('IDEMPOTENCY_KEY_REUSED');
      if(saved.result!==null)return this.d.secrets.open<FirstAcceptanceResult>(context,saved.result);
      const live=await this.d.identity.authenticate(token,scope,'BUSINESS');
      if(uuid(live.organizationId)!==org||uuid(live.subjectId)!==student||live.role!=='STUDENT')throw new RecordSubmissionFailure('DEPENDENCY_UNAVAILABLE');
      await this.d.ownerLock.lockStudentOwner(scope,org,student);
      await this.d.courses.assertExistingChain(scope,org,original.courseId,original.startedAtMs);
      const session=await this.d.sessions.facts(scope,org,input.sessionId);
      if(uuid(session.sessionId)!==input.sessionId||uuid(session.organizationId)!==org||uuid(session.studentSubjectId)!==student||uuid(session.courseId)!==uuid(original.courseId))throw new RecordSubmissionFailure('DEPENDENCY_UNAVAILABLE');
      if(session.stateVersion!==input.expectedSessionVersion)throw new RecordSubmissionFailure('VERSION_CONFLICT');
      if(session.status!=='COMPLETED'||session.completedAtMs===null)throw new RecordSubmissionFailure('SESSION_TRANSITION_INVALID');
      if(!Number.isSafeInteger(session.completedAtMs)||session.completedAtMs<session.startedAtMs)throw new RecordSubmissionFailure('DEPENDENCY_UNAVAILABLE');
      const now=this.d.clock.now();if(!Number.isSafeInteger(now)||now<session.completedAtMs)throw new RecordSubmissionFailure('DEPENDENCY_UNAVAILABLE');
      const acceptedAtUs=BigInt(now)*1000n;
      const eligibility=await this.d.eligibility.assertUnadjusted(scope,{session,route:input.route,members:input.members,acceptedAtUs});
      if(!Number.isSafeInteger(eligibility.sourceRevision)||eligibility.sourceRevision<0||
        !['ORDINARY','SWIMMING'].includes(eligibility.activity))throw new RecordSubmissionFailure('DEPENDENCY_UNAVAILABLE');
      if((input.route==='ORDINARY')!==(eligibility.activity==='ORDINARY'))throw new RecordSubmissionFailure('MEDIA_CONTENT_INVALID');
      // Immutable reference under the Session lock; reject a second first command before inspecting bound assets.
      if(await this.d.records.reference(scope,org,input.sessionId))throw new RecordSubmissionFailure('FIRST_MATERIAL_ALREADY_ACCEPTED');
      const media=await this.d.media.inspectForAcceptance(scope,{organizationId:org,ownerSubjectId:student,sessionId:input.sessionId,
        members:input.members,swimming:eligibility.activity==='SWIMMING'});
      if(media.length!==input.members.length||new Set(media.map(m=>m.assetId)).size!==media.length||
        media.some(m=>!input.members.some(member=>member.assetId===m.assetId)))throw new RecordSubmissionFailure('DEPENDENCY_UNAVAILABLE');
      if(await this.d.records.findLocked(scope,org,input.sessionId))throw new RecordSubmissionFailure('FIRST_MATERIAL_ALREADY_ACCEPTED');
      const endedAtUs=BigInt(session.completedAtMs)*1000n;
      const complete=media.every(m=>m.completedAtUs!==null),ready=media.every(m=>m.verified);
      if(media.some(m=>m.verified&&(m.completedAtUs===null||m.verifiedAtUs===null||m.verifiedAtUs<m.completedAtUs||m.verifiedAtUs>acceptedAtUs)))throw new RecordSubmissionFailure('DEPENDENCY_UNAVAILABLE');
      if(input.route==='SWIMMING_OFFLINE'&&!ready)throw new RecordSubmissionFailure('MEDIA_NOT_VERIFIED');
      const receipt=FirstMaterialReceipt.accept({organizationId:org,ownerSubjectId:student,sessionId:input.sessionId,
        recordId:uuid(this.d.secrets.id()),batchId:uuid(this.d.secrets.id()),endedAtUs,acceptedAtUs,window:input.route,
        offlineExplanation:input.delayExplanation,requiredAssetIds:input.members.map(m=>m.assetId)},
      input.route==='SWIMMING_OFFLINE'?media.map(m=>{
        if(m.verifiedAtUs===null)throw new RecordSubmissionFailure('DEPENDENCY_UNAVAILABLE');
        return {organizationId:org,ownerSubjectId:student,sessionId:input.sessionId,assetId:m.assetId,completedAtUs:m.completedAtUs,verifiedAtUs:m.verifiedAtUs};
      }):undefined);
      let transferCompletedAtUs:string|null=null;
      if(complete){transferCompletedAtUs=receipt.confirmTransfer(receipt.fact.batchId,media.map(m=>({organizationId:org,
        ownerSubjectId:student,sessionId:input.sessionId,assetId:m.assetId,completedAtUs:m.completedAtUs})),acceptedAtUs).transferCompletedAtUs.toString();}
      const materialId=uuid(this.d.secrets.id()),receiptId=uuid(this.d.secrets.id());
      await this.d.records.insert(scope,receipt,{materialId,commandId:receiptId,category:input.category,description:input.description,members:input.members});
      // The same sorted media rows were already locked before Record insertion; no new lock order is introduced.
      if(ready)await this.d.media.bindAccepted(scope,{organizationId:org,ownerSubjectId:student,sessionId:input.sessionId,
        recordId:receipt.fact.recordId,assetIds:input.members.map(m=>m.assetId)});
      const result:FirstAcceptanceResult={receiptId,recordId:receipt.fact.recordId,sessionId:input.sessionId,materialId,batchId:receipt.fact.batchId,
        route:input.route,firstDueAtUs:(endedAtUs+(input.route==='SWIMMING_TIMELY'?900_000000n:86400_000000n)).toString(),
        acceptedAtUs:acceptedAtUs.toString(),transferDueAtUs:receipt.transferDueAtUs?.toString()??null,transferCompletedAtUs,
        readiness:ready?'READY':complete?'VERIFYING':'PENDING_TRANSFER',members:input.members};
      await this.d.audit.append(scope,{organizationId:org,actorSubjectId:student,action:'SUBMIT_EXERCISE_RECORD',resourceId:result.recordId,requestId:metadata.requestId});
      await this.d.outbox.append(scope,{eventId:uuid(this.d.secrets.id()),organizationId:org,ownerSubjectId:student,sessionId:input.sessionId,
        recordId:result.recordId,materialId,sourceRevision:eligibility.sourceRevision,result});
      await this.d.replay.finish(scope,subject,operation,key,this.d.secrets.seal(context,result));
      return result;
    }).catch(error=>{
      if(error instanceof FirstMaterialFailure){
        throw new RecordSubmissionFailure(error.code==='FIRST_WINDOW_EXPIRED'?'FIRST_MATERIAL_DEADLINE_MISSED':
          error.code==='OBJECTS_INCOMPLETE'?'MEDIA_NOT_VERIFIED':'DEPENDENCY_UNAVAILABLE');
      }
      throw error;
    });
  }
}
