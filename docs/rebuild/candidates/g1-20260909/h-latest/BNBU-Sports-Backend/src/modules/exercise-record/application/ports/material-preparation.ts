import type {TransactionScope} from '../../../../shared/application/transactions/transaction-runner.ts';
import type {MaterialMediaAccess} from './material-media.ts';
export interface MaterialPreparationFact {
  eventId:string;materialId:string;organizationId:string;ownerSubjectId:string;sessionId:string;
  completedAtUs:bigint;preparedAtUs:bigint;sourceRevision:number;
}
/** Durable internal ready event. Not the public completion receipt or a Review Case. */
export interface MaterialPreparationRepository {
  find(scope:TransactionScope,materialId:string):Promise<MaterialPreparationFact|null>;
  insert(scope:TransactionScope,fact:MaterialPreparationFact):Promise<void>;
}
export interface PreparationMedia extends MaterialMediaAccess {
  bind(scope:TransactionScope,org:string,owner:string,session:string,record:string,ids:readonly string[]):Promise<void>;
}
/** Actual caller must prove that this original chain needs no deadline adjustment.
 * A current NORMAL flag is insufficient; incidents and full mode history must be checked.
 * Mode/source snapshots must already be locked before owner/Session locks by the caller.
 * This check consumes that transaction-bound evidence and must not acquire earlier-order locks.
 */
export interface PreparationPolicy {
  assertUnadjusted(scope:TransactionScope,input:{organizationId:string;sessionId:string;materialId:string;observedAtUs:bigint}):Promise<{sourceRevision:number}>;
}
