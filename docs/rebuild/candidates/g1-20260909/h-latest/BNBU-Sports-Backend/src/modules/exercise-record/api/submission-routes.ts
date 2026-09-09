import type {FastifyInstance} from 'fastify';
import type {ContractValidator} from '../../../shared/api/contract-validator.ts';
import type {components} from '../../../shared/api/contract.generated.ts';
import {RecordSubmissionFailure,type SubmitFirstRecordService} from '../application/submit-first-record.ts';
import type {FirstAcceptanceResult} from '../application/ports/record-submission.ts';

function instant(value:string):string {
  if(!/^\d+$/.test(value))throw new Error('RECORD_OUTPUT_INSTANT_INVALID');
  const us=BigInt(value),ms=us/1000n;
  if(ms>253402300799999n)throw new Error('RECORD_OUTPUT_INSTANT_INVALID');
  return new Date(Number(ms)).toISOString().slice(0,19)+'.'+(us%1000000n).toString().padStart(6,'0')+'Z';
}
export function firstAcceptanceProjection(result:FirstAcceptanceResult):components['schemas']['FirstMaterialAcceptance'] {
  const acceptedAt=instant(result.acceptedAtUs);
  return {receiptId:result.receiptId,recordId:result.recordId,sessionId:result.sessionId,submissionRoute:result.route,
    firstDueAt:instant(result.firstDueAtUs),acceptedAt,material:{materialVersionId:result.materialId,recordId:result.recordId,
      batchId:result.batchId,versionNo:1,previousMaterialVersionId:null,returnActionId:null,
      items:result.members.map(m=>({mediaAssetId:m.assetId,position:m.position,phase:m.phase??'GENERAL',checksumSha256:m.checksumSha256})),
      acceptedAt,transferDueAt:result.transferDueAtUs===null?null:instant(result.transferDueAtUs),
      transferCompletedAt:result.transferCompletedAtUs===null?null:instant(result.transferCompletedAtUs),readiness:result.readiness,version:0}};
}
/** Common errors, rate limits and real dependency assembly remain owned by the composition root. */
export function registerRecordSubmissionRoutes(app:FastifyInstance,service:SubmitFirstRecordService,validator:ContractValidator):void {
  app.post<{Params:{sessionId:string}}>('/api/v1/exercise-sessions/:sessionId/record',async(request,reply)=>{
    const key=request.headers['idempotency-key'];
    if(typeof key!=='string')throw new RecordSubmissionFailure('INVALID_REQUEST');
    const authorization=request.headers.authorization;
    const token=typeof authorization==='string'?/^Bearer ([^\s]+)$/i.exec(authorization)?.[1]??'':'';
    const input=validator.parse('SubmitExerciseRecordRequest',request.body);
    const result=firstAcceptanceProjection(await service.submit(token,{key,requestId:request.id},{sessionId:request.params.sessionId,
      expectedSessionVersion:input.expectedSessionVersion,route:input.submissionRoute,category:input.category,description:input.description,
      delayExplanation:'delayExplanation' in input?input.delayExplanation:null,
      members:input.items.map(m=>({assetId:m.mediaAssetId,position:m.position,phase:m.phase==='GENERAL'?null:m.phase,checksumSha256:m.checksumSha256}))}));
    if(!validator.accepts('FirstMaterialAcceptance',result))throw new Error('RECORD_OUTPUT_CONTRACT_INVALID');
    return reply.header('X-Request-Id',request.id).code(201).send(result);
  });
}
