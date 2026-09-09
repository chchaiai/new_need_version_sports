import type { TransactionScope } from '../../../shared/application/transactions/transaction-runner.ts';
import type { FirstRecordRepository } from './ports/first-record-repository.ts';
import type { MaterialMediaAccess } from './ports/material-media.ts';
import { FirstMaterialReceipt } from '../domain/first-material.ts';

export class MaterialTransferFailure extends Error {
  readonly code: 'MATERIAL_NOT_FOUND' | 'MATERIAL_SCOPE_MISMATCH' | 'MATERIAL_FACTS_INCONSISTENT' | 'MEDIA_CONTENT_INVALID';
  constructor(code: MaterialTransferFailure['code']) { super(code); this.name = 'MaterialTransferFailure'; this.code = code; }
}

/** Internal transfer-fact evaluator, NOT an HTTP authorization or submission endpoint.
 * Caller authenticates the existing chain and holds owner/Session locks in the same transaction.
 * endedAtUs must come from that completed Session. This evaluator does not support adjusted
 * maintenance/fault deadlines; callers must not use it to adjudicate those cases. No validity verdict.
 */
export class FirstMaterialTransferService {
  private readonly records: FirstRecordRepository;
  private readonly media: MaterialMediaAccess;
  constructor(records: FirstRecordRepository, media: MaterialMediaAccess) { this.records = records; this.media = media; }

  async evaluate(scope: TransactionScope, input: Readonly<{
    organizationId: string; ownerSubjectId: string; sessionId: string; batchId: string; endedAtUs: bigint; observedAtUs: bigint;
  }>) {
    const org = input.organizationId.toLowerCase(), owner = input.ownerSubjectId.toLowerCase(), session = input.sessionId.toLowerCase();
    const reference = await this.records.reference(scope, org, session);
    if (!reference) throw new MaterialTransferFailure('MATERIAL_NOT_FOUND');
    if (reference.ownerSubjectId !== owner) throw new MaterialTransferFailure('MATERIAL_SCOPE_MISMATCH');
    // Immutable reference permits canonical media-before-record locking, without a reverse-order lookup lock.
    const assets = await this.media.lock(scope, org, owner, session, reference.members.map(member => member.assetId));
    const stored = await this.records.findLocked(scope, org, session);
    if (!stored || stored.materialId !== reference.materialId) throw new MaterialTransferFailure('MATERIAL_FACTS_INCONSISTENT');
    for (const asset of assets) {
      if (asset.status !== 'VERIFIED' && asset.status !== 'BOUND') continue;
      if (asset.verifiedAtUs === null || asset.completedAtUs === null || asset.verifiedAtUs < asset.completedAtUs ||
          asset.verifiedAtUs > input.observedAtUs || (asset.status === 'BOUND' && asset.recordId !== stored.recordId)) {
        throw new MaterialTransferFailure('MATERIAL_FACTS_INCONSISTENT');
      }
      const declared = stored.members.find(member => member.assetId === asset.id);
      if (!declared || asset.checksumSha256?.toLowerCase() !== declared.checksumSha256) {
        throw new MaterialTransferFailure('MEDIA_CONTENT_INVALID');
      }
    }
    const inspectionComplete = assets.every(asset => asset.status === 'VERIFIED' ||
      (asset.status === 'BOUND' && asset.recordId === stored.recordId));
    const readyObjects = stored.window === 'SWIMMING_OFFLINE' && inspectionComplete ? assets.map(asset => {
      if (asset.verifiedAtUs === null) throw new MaterialTransferFailure('MATERIAL_FACTS_INCONSISTENT');
      return {assetId:asset.id,organizationId:asset.organizationId,ownerSubjectId:asset.ownerSubjectId,
        sessionId:asset.sessionId,completedAtUs:asset.completedAtUs,verifiedAtUs:asset.verifiedAtUs};
    }) : undefined;
    const receipt = FirstMaterialReceipt.accept({organizationId:org,ownerSubjectId:owner,sessionId:session,recordId:stored.recordId,
      batchId:stored.batchId,endedAtUs:input.endedAtUs,acceptedAtUs:stored.acceptedAtUs,window:stored.window,
      offlineExplanation:stored.offlineExplanation,requiredAssetIds:stored.members.map(member => member.assetId)}, readyObjects);
    if (receipt.transferDueAtUs !== stored.transferDueAtUs) throw new MaterialTransferFailure('MATERIAL_FACTS_INCONSISTENT');
    const transfer = receipt.confirmTransfer(input.batchId.toLowerCase(), assets.map(asset => ({assetId:asset.id,
      organizationId:asset.organizationId,ownerSubjectId:asset.ownerSubjectId,sessionId:asset.sessionId,completedAtUs:asset.completedAtUs})),input.observedAtUs);
    return Object.freeze({...transfer,inspectionComplete});
  }
}
