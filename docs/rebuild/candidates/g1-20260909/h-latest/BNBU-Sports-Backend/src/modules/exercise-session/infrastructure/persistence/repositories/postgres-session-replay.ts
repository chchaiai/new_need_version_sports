import type { PostgresTransactionRunner } from '../../../../../shared/infrastructure/postgres.ts';
import type { TransactionScope } from '../../../../../shared/application/transactions/transaction-runner.ts';
import type { SessionReplayStore } from '../../../application/ports/session-commands.ts';

export class PostgresSessionReplay implements SessionReplayStore {
  private readonly runner:PostgresTransactionRunner;
  constructor(runner:PostgresTransactionRunner){this.runner=runner;}
  async reserve(scope:TransactionScope,subject:string,operation:string,key:string,fingerprint:string) {
    await this.runner.client(scope).query(
      'INSERT INTO exercise_session.command_replay(subject,operation,key_digest,fingerprint) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[subject,operation,key,fingerprint]);
    const result=await this.runner.client(scope).query(
      'SELECT fingerprint,sealed_result FROM exercise_session.command_replay WHERE subject=$1 AND operation=$2 AND key_digest=$3 FOR UPDATE',[subject,operation,key]);
    if(result.rowCount!==1)throw new Error('REPLAY_RESERVATION_UNAVAILABLE');
    return {fingerprint:result.rows[0].fingerprint,result:result.rows[0].sealed_result};
  }
  async finish(scope:TransactionScope,subject:string,operation:string,key:string,sealed:string):Promise<void> {
    const result=await this.runner.client(scope).query(
      'UPDATE exercise_session.command_replay SET sealed_result=$4 WHERE subject=$1 AND operation=$2 AND key_digest=$3 AND sealed_result IS NULL',[subject,operation,key,sealed]);
    if(result.rowCount!==1)throw new Error('REPLAY_COMPLETION_CONFLICT');
  }
}
