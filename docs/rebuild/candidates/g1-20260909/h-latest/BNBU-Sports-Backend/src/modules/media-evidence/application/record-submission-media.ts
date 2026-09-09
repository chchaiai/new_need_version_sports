import type {TransactionScope} from '../../../shared/application/transactions/transaction-runner.ts';
import type {RecordAssetRepository} from './ports/record-assets.ts';
import {RecordManifestError,validateRecordManifest} from '../domain/record-manifest.ts';

export interface MediaSubmissionMember {assetId:string;position:number;phase:'BEFORE'|'AFTER'|null;checksumSha256:string}
/** Checks metadata/counts/locked byte identities, not the authenticity of activity or capture time. */
export class RecordSubmissionMediaService {
  private readonly repository:RecordAssetRepository;
  constructor(repository:RecordAssetRepository){this.repository=repository;}
  async bindAccepted(scope:TransactionScope,input:{organizationId:string;ownerSubjectId:string;sessionId:string;recordId:string;assetIds:readonly string[]}):Promise<void>{
    await this.repository.bind(scope,input.organizationId,input.ownerSubjectId,input.sessionId,input.recordId,input.assetIds);
  }
  async inspectForAcceptance(scope:TransactionScope,input:{organizationId:string;ownerSubjectId:string;sessionId:string;
    members:readonly MediaSubmissionMember[];swimming:boolean}){
    const assets=await this.repository.lock(scope,input.organizationId,input.ownerSubjectId,input.sessionId,input.members.map(m=>m.assetId));
    let images=0,videos=0,total=0,before=false,after=false;
    const result=[];
    for(const asset of assets){
      const member=input.members.find(m=>m.assetId===asset.id);
      if(!member)throw new RecordManifestError('ASSET_SCOPE_MISMATCH');
      if(asset.status==='BOUND'||asset.status==='REJECTED'||asset.status==='EXPIRED')throw new RecordManifestError('UNVERIFIED_ASSET');
      if(asset.mediaKind==='IMAGE'){images++;before ||= member.phase==='BEFORE';after ||= member.phase==='AFTER';}
      else {videos++;if(member.phase!==null)throw new RecordManifestError('INVALID_MEDIA_FACT');}
      const verified=asset.status==='VERIFIED';
      if(verified){
        if(asset.checksumSha256?.toLowerCase()!==member.checksumSha256.toLowerCase()||asset.contentType===null||asset.byteSize===null)throw new RecordManifestError('INVALID_MEDIA_FACT');
        validateRecordManifest({...input,swimming:false},[{assetId:asset.id,organizationId:input.organizationId,
          ownerSubjectId:input.ownerSubjectId,sessionId:input.sessionId,purpose:'RECORD_EVIDENCE',inspection:'VERIFIED',mediaKind:asset.mediaKind,
          contentType:asset.contentType,byteSize:asset.byteSize,durationMilliseconds:asset.durationMilliseconds,hasAudio:asset.hasAudio,swimmingPhase:member.phase}]);
      }
      total+=verified?asset.byteSize!:asset.declaredByteSize;
      result.push(Object.freeze({assetId:asset.id,completedAtUs:asset.completedAtUs,verifiedAtUs:asset.verifiedAtUs,verified}));
    }
    if(images>6||videos>1||total>262144000)throw new RecordManifestError('MEDIA_LIMIT_EXCEEDED');
    if(input.swimming&&(!before||!after))throw new RecordManifestError('SWIMMING_PHASE_MISSING');
    return Object.freeze(result);
  }
}
