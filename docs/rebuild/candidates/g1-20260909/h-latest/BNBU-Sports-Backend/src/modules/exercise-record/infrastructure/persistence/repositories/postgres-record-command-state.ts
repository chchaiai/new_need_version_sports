import type {PostgresTransactionRunner} from '../../../../../shared/infrastructure/postgres.ts';
import type {TransactionScope} from '../../../../../shared/application/transactions/transaction-runner.ts';
import type {RecordReplay,RecordAcceptedOutbox} from '../../../application/ports/record-submission.ts';
export class PostgresRecordReplay implements RecordReplay {
  private readonly runner:PostgresTransactionRunner;
  constructor(runner:PostgresTransactionRunner){this.runner=runner;}
  async reserve(scope:TransactionScope,subject:string,operation:string,key:string,fingerprint:string){
    await this.runner.client(scope).query('INSERT INTO exercise_record.command_replay(subject,operation,key_digest,fingerprint) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[subject,operation,key,fingerprint]);
    const result=await this.runner.client(scope).query('SELECT fingerprint,sealed_result FROM exercise_record.command_replay WHERE subject=$1 AND operation=$2 AND key_digest=$3 FOR UPDATE',[subject,operation,key]);
    if(result.rowCount!==1)throw new Error('RECORD_REPLAY_UNAVAILABLE');
    return {fingerprint:result.rows[0].fingerprint,result:result.rows[0].sealed_result};
  }
  async finish(scope:TransactionScope,subject:string,operation:string,key:string,result:string):Promise<void>{
    const saved=await this.runner.client(scope).query('UPDATE exercise_record.command_replay SET sealed_result=$4 WHERE subject=$1 AND operation=$2 AND key_digest=$3 AND sealed_result IS NULL',[subject,operation,key,result]);
    if(saved.rowCount!==1)throw new Error('RECORD_REPLAY_CONFLICT');
  }
}
export class PostgresRecordAcceptedOutbox implements RecordAcceptedOutbox {
  private readonly runner:PostgresTransactionRunner;
  constructor(runner:PostgresTransactionRunner){this.runner=runner;}
  async append(scope:TransactionScope,event:Parameters<RecordAcceptedOutbox['append']>[1]):Promise<void>{
    await this.runner.client(scope).query(`INSERT INTO exercise_record.acceptance_outbox
      (event_id,organization_id,owner_subject_id,session_id,record_id,material_id,source_revision,payload)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,[event.eventId,event.organizationId,event.ownerSubjectId,event.sessionId,event.recordId,
      event.materialId,event.sourceRevision,JSON.stringify({type:'record.first-material.accepted',result:event.result})]);
  }
}
