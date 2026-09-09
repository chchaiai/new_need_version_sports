import type {PostgresTransactionRunner} from '../../../../../shared/infrastructure/postgres.ts';
import type {TransactionScope} from '../../../../../shared/application/transactions/transaction-runner.ts';
import type {MaterialPreparationFact,MaterialPreparationRepository} from '../../../application/ports/material-preparation.ts';
function instant(us:bigint):string{
  if(typeof us!=='bigint'||us<0n||us>253402300799999999n)throw new Error('MATERIAL_PREPARATION_INSTANT_INVALID');
  return new Date(Number(us/1000n)).toISOString().replace(/\.\d{3}Z$/,'.'+(us%1000000n).toString().padStart(6,'0')+'Z');
}
export class PostgresMaterialPreparation implements MaterialPreparationRepository {
  private readonly runner:PostgresTransactionRunner;
  constructor(runner:PostgresTransactionRunner){this.runner=runner;}
  async find(scope:TransactionScope,materialId:string):Promise<MaterialPreparationFact|null>{
    const rows=await this.runner.client(scope).query(`SELECT *,
      (extract(epoch FROM (completed_at))*1000000)::bigint AS completed_us,
      (extract(epoch FROM (prepared_at))*1000000)::bigint AS prepared_us
      FROM exercise_record.material_preparation WHERE material_id=$1`,[materialId]);
    if(rows.rowCount===0)return null;
    const r=rows.rows[0],revision=Number(r.source_revision);
    if(!Number.isSafeInteger(revision)||revision<0)throw new Error('MATERIAL_PREPARATION_REVISION_INVALID');
    return Object.freeze({eventId:r.event_id,materialId:r.material_id,organizationId:r.organization_id,ownerSubjectId:r.owner_subject_id,
      sessionId:r.session_id,completedAtUs:BigInt(r.completed_us),preparedAtUs:BigInt(r.prepared_us),sourceRevision:revision});
  }
  async insert(scope:TransactionScope,fact:MaterialPreparationFact):Promise<void>{
    await this.runner.client(scope).query(`INSERT INTO exercise_record.material_preparation
      (material_id,event_id,organization_id,owner_subject_id,session_id,completed_at,prepared_at,source_revision)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,[fact.materialId,fact.eventId,fact.organizationId,fact.ownerSubjectId,fact.sessionId,
      instant(fact.completedAtUs),instant(fact.preparedAtUs),fact.sourceRevision]);
  }
}
