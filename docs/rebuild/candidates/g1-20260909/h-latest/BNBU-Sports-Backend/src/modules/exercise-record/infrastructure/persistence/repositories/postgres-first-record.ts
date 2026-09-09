import type { PostgresTransactionRunner } from '../../../../../shared/infrastructure/postgres.ts';
import type { TransactionScope } from '../../../../../shared/application/transactions/transaction-runner.ts';
import type { FirstRecordRepository, FirstRecordDetails, StoredFirstRecord } from '../../../application/ports/first-record-repository.ts';
import type { FirstMaterialReceipt } from '../../../domain/first-material.ts';
import { lockMaterialDeclarations } from '../../../domain/material-declarations.ts';

function instant(us: bigint): string {
  if (typeof us !== 'bigint' || us < 0n || us > 8640000000000000000n) throw new Error('INVALID_RECORD_INSTANT');
  return new Date(Number(us / 1000n)).toISOString().replace(/\.\d{3}Z$/, '.' + (us % 1000000n).toString().padStart(6, '0') + 'Z');
}

/** Own-schema writes only; transaction, Session authorization and media locks belong to the caller. */
export class PostgresFirstRecordRepository implements FirstRecordRepository {
  private readonly runner: PostgresTransactionRunner;
  constructor(runner: PostgresTransactionRunner) { this.runner = runner; }

  async insert(scope: TransactionScope, receipt: FirstMaterialReceipt, details: FirstRecordDetails): Promise<void> {
    const f = receipt.fact;
    const members = lockMaterialDeclarations(details.members);
    if (members.length !== f.requiredAssetIds.length ||
        members.some((member, index) => member.assetId !== f.requiredAssetIds[index]?.toLowerCase())) {
      throw new Error('RECORD_MANIFEST_MISMATCH');
    }
    const client = this.runner.client(scope);
    await client.query(`INSERT INTO exercise_record.record
      (id,organization_id,owner_subject_id,session_id,category,description,accepted_at,accept_command_id)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
    [f.recordId,f.organizationId,f.ownerSubjectId,f.sessionId,details.category,details.description,instant(f.acceptedAtUs),details.commandId]);
    await client.query(`INSERT INTO exercise_record.first_material
      (id,record_id,organization_id,owner_subject_id,session_id,batch_id,accepted_at,transfer_due_at,required_asset_ids,window_kind,offline_explanation)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [details.materialId,f.recordId,f.organizationId,f.ownerSubjectId,f.sessionId,f.batchId,instant(f.acceptedAtUs),
      receipt.transferDueAtUs === null ? null : instant(receipt.transferDueAtUs),f.requiredAssetIds,f.window,f.offlineExplanation]);
    for (const member of members) {
      await client.query(`INSERT INTO exercise_record.first_material_asset
        (material_id,asset_id,organization_id,owner_subject_id,session_id,position,phase,declared_checksum_sha256) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
      [details.materialId,member.assetId,f.organizationId,f.ownerSubjectId,f.sessionId,member.position,member.phase,Buffer.from(member.checksumSha256,'hex')]);
    }
  }

  async findLocked(scope: TransactionScope, org: string, session: string): Promise<StoredFirstRecord | null> {
    return this.read(scope, org, session, true);
  }

  async reference(scope: TransactionScope, org: string, session: string): Promise<StoredFirstRecord | null> {
    return this.read(scope, org, session, false);
  }

  private async read(scope: TransactionScope, org: string, session: string, locked: boolean): Promise<StoredFirstRecord | null> {
    const client = this.runner.client(scope);
    const result = locked ? await client.query(`SELECT r.id AS record_id,r.category,r.description,r.accept_command_id,m.*,
      (extract(epoch FROM (m.accepted_at))*1000000)::bigint AS accepted_us,
      (extract(epoch FROM (m.transfer_due_at))*1000000)::bigint AS due_us
      FROM exercise_record.record r JOIN exercise_record.first_material m ON m.record_id=r.id
      WHERE r.organization_id=$1 AND r.session_id=$2 FOR UPDATE`, [org,session]) :
      await client.query(`SELECT r.id AS record_id,r.category,r.description,r.accept_command_id,m.*,
      (extract(epoch FROM (m.accepted_at))*1000000)::bigint AS accepted_us,
      (extract(epoch FROM (m.transfer_due_at))*1000000)::bigint AS due_us
      FROM exercise_record.record r JOIN exercise_record.first_material m ON m.record_id=r.id
      WHERE r.organization_id=$1 AND r.session_id=$2`, [org,session]);
    if (result.rowCount === 0) return null;
    const row = result.rows[0];
    const members = await client.query(`SELECT asset_id,position,phase,encode(declared_checksum_sha256,'hex') AS checksum FROM exercise_record.first_material_asset
      WHERE material_id=$1 ORDER BY position`, [row.id]);
    return Object.freeze({recordId:row.record_id,materialId:row.id,organizationId:row.organization_id,ownerSubjectId:row.owner_subject_id,
      sessionId:row.session_id,commandId:row.accept_command_id,category:row.category,description:row.description,batchId:row.batch_id,
      acceptedAtUs:BigInt(row.accepted_us),transferDueAtUs:row.due_us === null ? null : BigInt(row.due_us),window:row.window_kind,offlineExplanation:row.offline_explanation,
      members:Object.freeze(members.rows.map(member => Object.freeze({assetId:member.asset_id,position:member.position,phase:member.phase,checksumSha256:member.checksum})))});
  }
}
