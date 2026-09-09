import type { PostgresTransactionRunner } from '../../../../../shared/infrastructure/postgres.ts';
import type { TransactionScope } from '../../../../../shared/application/transactions/transaction-runner.ts';
import { RecordAssetFailure, type RecordAssetRepository, type RecordAssetFacts, type RecordAssetAllocation, type RecordAssetInspection } from '../../../application/ports/record-assets.ts';
import { validateRecordManifest } from '../../../domain/record-manifest.ts';

function instant(us:bigint):string {
  if(typeof us!=='bigint'||us<0n||us>8640000000000000000n)throw new RecordAssetFailure('INVALID_MEDIA_INSTANT');
  return new Date(Number(us/1000n)).toISOString().replace(/\.\d{3}Z$/,'.'+(us%1000000n).toString().padStart(6,'0')+'Z');
}
function integer(value:unknown):number {
  const n=Number(value);if(!Number.isSafeInteger(n)||n<0)throw new RecordAssetFailure('MEDIA_FACTS_INCONSISTENT');return n;
}
export class PostgresRecordAssetRepository implements RecordAssetRepository {
  private readonly runner:PostgresTransactionRunner;
  constructor(runner:PostgresTransactionRunner){this.runner=runner;}
  async allocate(scope:TransactionScope,i:RecordAssetAllocation):Promise<void> {
    await this.runner.client(scope).query(`INSERT INTO media_evidence.record_asset(id,organization_id,owner_subject_id,session_id,object_key,
      media_kind,declared_content_type,declared_byte_size,status,created_at,version) VALUES($1,$2,$3,$4,$5,$6,$7,$8,'ALLOCATED',$9,0)`,
      [i.id,i.organizationId,i.ownerSubjectId,i.sessionId,i.objectKey,i.mediaKind,i.declaredContentType,i.declaredByteSize,instant(i.createdAtUs)]);
  }
  async lock(scope:TransactionScope,org:string,owner:string,session:string,ids:readonly string[]):Promise<readonly RecordAssetFacts[]> {
    const normalized=ids.map(id=>id.toLowerCase());
    if(normalized.length===0||normalized.length>7||new Set(normalized).size!==normalized.length)throw new RecordAssetFailure('MEDIA_SET_INVALID');
    const result=await this.runner.client(scope).query(`SELECT *,encode(checksum_sha256,'hex') AS checksum_hex,
      (extract(epoch FROM (uploaded_at))*1000000)::bigint AS completed_us,(extract(epoch FROM (verified_at))*1000000)::bigint AS verified_us
      FROM media_evidence.record_asset WHERE organization_id=$1 AND owner_subject_id=$2 AND session_id=$3 AND id=ANY($4::uuid[]) ORDER BY id FOR UPDATE`,
      [org,owner,session,normalized]);
    if(result.rowCount!==normalized.length)throw new RecordAssetFailure('MEDIA_SCOPE_MISMATCH');
    const facts:RecordAssetFacts[]=result.rows.map(r=>({id:r.id,organizationId:r.organization_id,ownerSubjectId:r.owner_subject_id,sessionId:r.session_id,
      mediaKind:r.media_kind,status:r.status,version:integer(r.version),declaredContentType:r.declared_content_type,declaredByteSize:integer(r.declared_byte_size),
      objectVersion:r.object_version,completedAtUs:r.completed_us===null?null:BigInt(r.completed_us),verifiedAtUs:r.verified_us===null?null:BigInt(r.verified_us),
      contentType:r.content_type,byteSize:r.byte_size===null?null:integer(r.byte_size),checksumSha256:r.checksum_hex,
      durationMilliseconds:r.duration_ms,hasAudio:r.has_audio,recordId:r.record_id}));
    return Object.freeze(facts.map(f=>Object.freeze(f)));
  }
  async recordUpload(scope:TransactionScope,org:string,id:string,expected:number,objectVersion:string,completedAtUs:bigint):Promise<void> {
    if(!objectVersion)throw new RecordAssetFailure('MEDIA_OBJECT_VERSION_REQUIRED');
    const r=await this.runner.client(scope).query(`UPDATE media_evidence.record_asset SET status='UPLOADED',uploaded_at=$4,object_version=$5,version=version+1
      WHERE organization_id=$1 AND id=$2 AND version=$3 AND status='ALLOCATED'`,[org,id,expected,instant(completedAtUs),objectVersion]);
    if(r.rowCount!==1)throw new RecordAssetFailure('MEDIA_VERSION_CONFLICT');
  }
  async recordInspection(scope:TransactionScope,org:string,id:string,expected:number,inspection:RecordAssetInspection):Promise<void> {
    const found=await this.runner.client(scope).query('SELECT owner_subject_id,session_id,media_kind FROM media_evidence.record_asset WHERE organization_id=$1 AND id=$2 FOR UPDATE',[org,id]);
    const row=found.rows[0];if(!row)throw new RecordAssetFailure('MEDIA_SCOPE_MISMATCH');
    if(!/^[0-9a-f]{64}$/i.test(inspection.checksumSha256))throw new RecordAssetFailure('MEDIA_CHECKSUM_INVALID');
    validateRecordManifest({organizationId:org,ownerSubjectId:row.owner_subject_id,sessionId:row.session_id,swimming:false},[{
      assetId:id,organizationId:org,ownerSubjectId:row.owner_subject_id,sessionId:row.session_id,purpose:'RECORD_EVIDENCE',inspection:'VERIFIED',
      mediaKind:row.media_kind,contentType:inspection.contentType,byteSize:inspection.byteSize,durationMilliseconds:inspection.durationMilliseconds,
      hasAudio:inspection.hasAudio,swimmingPhase:null}]);
    const r=await this.runner.client(scope).query(`UPDATE media_evidence.record_asset SET status='VERIFIED',verified_at=$4,content_type=$5,byte_size=$6,
      checksum_sha256=$7,duration_ms=$8,has_audio=$9,version=version+1
      WHERE organization_id=$1 AND id=$2 AND version=$3 AND status='UPLOADED' AND object_version=$10`,
      [org,id,expected,instant(inspection.verifiedAtUs),inspection.contentType,inspection.byteSize,Buffer.from(inspection.checksumSha256,'hex'),
        inspection.durationMilliseconds,inspection.hasAudio,inspection.objectVersion]);
    if(r.rowCount!==1)throw new RecordAssetFailure('MEDIA_VERSION_CONFLICT');
  }
  /** Caller has locked the original Record manifest and validates exactly its full member set. */
  async bind(scope:TransactionScope,org:string,owner:string,session:string,record:string,ids:readonly string[]):Promise<void> {
    const assets=await this.lock(scope,org,owner,session,ids);
    for(const a of assets){
      if(a.status==='BOUND'&&a.recordId?.toLowerCase()===record.toLowerCase())continue;
      if(a.status!=='VERIFIED')throw new RecordAssetFailure('MEDIA_NOT_READY');
      const r=await this.runner.client(scope).query(`UPDATE media_evidence.record_asset SET status='BOUND',record_id=$4,version=version+1
        WHERE organization_id=$1 AND id=$2 AND version=$3 AND status='VERIFIED'`,[org,a.id,a.version,record]);
      if(r.rowCount!==1)throw new RecordAssetFailure('MEDIA_VERSION_CONFLICT');
    }
  }
}
