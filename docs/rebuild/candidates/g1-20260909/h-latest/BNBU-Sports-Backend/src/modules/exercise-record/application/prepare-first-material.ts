import type {TransactionScope} from '../../../shared/application/transactions/transaction-runner.ts';
import type {FirstRecordRepository} from './ports/first-record-repository.ts';
import type {MaterialPreparationRepository,PreparationMedia,PreparationPolicy} from './ports/material-preparation.ts';
import {FirstMaterialTransferService,MaterialTransferFailure} from './first-material-transfer.ts';
import {FirstMaterialFailure} from '../domain/first-material.ts';

export class MaterialPreparationFailure extends Error {
  readonly code:'MATERIAL_NOT_READY'|'MATERIAL_BATCH_CONFLICT'|'MATERIAL_TRANSFER_DEADLINE_MISSED'|'DEPENDENCY_UNAVAILABLE';
  constructor(code:MaterialPreparationFailure['code']){super(code);this.name='MaterialPreparationFailure';this.code=code;}
}
/** Internal transaction participant only. Caller authenticates and locks original owner/Session.
 * No HTTP registration: public completion additionally requires an atomic real Review Case handoff.
 * Never catch a failure and commit the surrounding transaction; the caller must roll back.
 */
export class FirstMaterialPreparationService {
  private readonly records:FirstRecordRepository;
  private readonly media:PreparationMedia;
  private readonly prepared:MaterialPreparationRepository;
  private readonly policy:PreparationPolicy;
  private readonly ids:{id():string};
  constructor(dependencies:{records:FirstRecordRepository;media:PreparationMedia;prepared:MaterialPreparationRepository;policy:PreparationPolicy;ids:{id():string}}){
    this.records=dependencies.records;this.media=dependencies.media;this.prepared=dependencies.prepared;this.policy=dependencies.policy;this.ids=dependencies.ids;
  }
  async prepare(scope:TransactionScope,input:{organizationId:string;ownerSubjectId:string;sessionId:string;batchId:string;endedAtUs:bigint;observedAtUs:bigint}){
    const org=input.organizationId.toLowerCase(),owner=input.ownerSubjectId.toLowerCase(),session=input.sessionId.toLowerCase();
    const reference=await this.records.reference(scope,org,session);
    if(!reference)throw new MaterialTransferFailure('MATERIAL_NOT_FOUND');
    if(reference.ownerSubjectId!==owner)throw new MaterialTransferFailure('MATERIAL_SCOPE_MISMATCH');
    if(reference.batchId!==input.batchId.toLowerCase())throw new MaterialPreparationFailure('MATERIAL_BATCH_CONFLICT');
    const source=await this.policy.assertUnadjusted(scope,{organizationId:org,sessionId:session,materialId:reference.materialId,observedAtUs:input.observedAtUs});
    if(!Number.isSafeInteger(source.sourceRevision)||source.sourceRevision<0)throw new MaterialPreparationFailure('DEPENDENCY_UNAVAILABLE');
    let result;
    try {result=await new FirstMaterialTransferService(this.records,this.media).evaluate(scope,input);}
    catch(error){
      if(error instanceof FirstMaterialFailure){
        throw new MaterialPreparationFailure(error.code==='OBJECTS_INCOMPLETE'?'MATERIAL_NOT_READY':
          error.code==='TRANSFER_WINDOW_EXPIRED'?'MATERIAL_TRANSFER_DEADLINE_MISSED':'DEPENDENCY_UNAVAILABLE');
      }
      throw error;
    }
    if(!result.inspectionComplete)throw new MaterialPreparationFailure('MATERIAL_NOT_READY');
    const existing=await this.prepared.find(scope,reference.materialId);
    if(existing){
      if(existing.organizationId!==org||existing.ownerSubjectId!==owner||existing.sessionId!==session||
        existing.completedAtUs!==result.transferCompletedAtUs||existing.preparedAtUs>input.observedAtUs)throw new MaterialPreparationFailure('DEPENDENCY_UNAVAILABLE');
      // Recheck immutable evidence, but never replace the first durable preparation event.
      return existing;
    }
    await this.media.bind(scope,org,owner,session,reference.recordId,reference.members.map(member=>member.assetId));
    const fact=Object.freeze({eventId:this.ids.id(),materialId:reference.materialId,organizationId:org,ownerSubjectId:owner,sessionId:session,
      completedAtUs:result.transferCompletedAtUs,preparedAtUs:input.observedAtUs,sourceRevision:source.sourceRevision});
    await this.prepared.insert(scope,fact);
    return fact;
  }
}
