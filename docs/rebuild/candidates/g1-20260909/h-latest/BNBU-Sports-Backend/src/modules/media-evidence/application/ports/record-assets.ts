import type { TransactionScope } from '../../../../shared/application/transactions/transaction-runner.ts';
export class RecordAssetFailure extends Error {
  readonly code: 'INVALID_MEDIA_INSTANT' | 'MEDIA_FACTS_INCONSISTENT' | 'MEDIA_SET_INVALID' | 'MEDIA_SCOPE_MISMATCH' |
    'MEDIA_OBJECT_VERSION_REQUIRED' | 'MEDIA_VERSION_CONFLICT' | 'MEDIA_CHECKSUM_INVALID' | 'MEDIA_NOT_READY';
  constructor(code: RecordAssetFailure['code']) { super(code); this.name='RecordAssetFailure'; this.code=code; }
}
export interface RecordAssetFacts {
  id:string;organizationId:string;ownerSubjectId:string;sessionId:string;
  mediaKind:'IMAGE'|'VIDEO';status:'ALLOCATED'|'UPLOADED'|'VERIFIED'|'BOUND'|'REJECTED'|'EXPIRED';version:number;
  declaredContentType:string;declaredByteSize:number;
  objectVersion:string|null;completedAtUs:bigint|null;verifiedAtUs:bigint|null;
  contentType:string|null;byteSize:number|null;checksumSha256:string|null;
  durationMilliseconds:number|null;hasAudio:boolean|null;recordId:string|null;
}
export interface RecordAssetAllocation {
  id:string;organizationId:string;ownerSubjectId:string;sessionId:string;objectKey:string;
  mediaKind:'IMAGE'|'VIDEO';declaredContentType:string;declaredByteSize:number;createdAtUs:bigint;
}
/** Observation from trusted storage/content inspector, not a client finalization body. */
export interface RecordAssetInspection {
  objectVersion:string;verifiedAtUs:bigint;contentType:string;byteSize:number;checksumSha256:string;
  durationMilliseconds:number|null;hasAudio:boolean|null;
}
export interface RecordAssetRepository {
  allocate(scope:TransactionScope,input:RecordAssetAllocation):Promise<void>;
  lock(scope:TransactionScope,org:string,owner:string,session:string,ids:readonly string[]):Promise<readonly RecordAssetFacts[]>;
  recordUpload(scope:TransactionScope,org:string,id:string,expectedVersion:number,objectVersion:string,completedAtUs:bigint):Promise<void>;
  recordInspection(scope:TransactionScope,org:string,id:string,expectedVersion:number,inspection:RecordAssetInspection):Promise<void>;
  bind(scope:TransactionScope,org:string,owner:string,session:string,record:string,ids:readonly string[]):Promise<void>;
}
