/** First-material timing/batch policy, independent of HTTP/auth/storage.
 * Epoch microseconds preserve PostgreSQL instant precision; do not round before comparison.
 * Call only with server-persisted legal Session and authoritative object completion facts.
 * Maintenance/fault adjustments are deliberately not inferred from a current-mode flag.
 */
export type FirstWindow = 'ORDINARY' | 'SWIMMING_TIMELY' | 'SWIMMING_OFFLINE';
export type FirstMaterialFailureCode = 'INVALID_MATERIAL_FACT' | 'FIRST_WINDOW_EXPIRED' |
  'OFFLINE_EXPLANATION_REQUIRED' | 'BATCH_MISMATCH' | 'OBJECT_SCOPE_MISMATCH' |
  'OBJECTS_INCOMPLETE' | 'TRANSFER_WINDOW_EXPIRED';

export class FirstMaterialFailure extends Error {
  readonly code: FirstMaterialFailureCode;
  constructor(code: FirstMaterialFailureCode) { super(code); this.name = 'FirstMaterialFailure'; this.code = code; }
}

export interface FirstMaterialInput {
  readonly organizationId: string;
  readonly ownerSubjectId: string;
  readonly sessionId: string;
  readonly recordId: string;
  readonly batchId: string;
  readonly endedAtUs: bigint;
  readonly acceptedAtUs: bigint;
  readonly window: FirstWindow;
  readonly offlineExplanation: string | null;
  readonly requiredAssetIds: readonly string[];
}

export interface RequiredObjectCompletion {
  readonly organizationId: string;
  readonly ownerSubjectId: string;
  readonly sessionId: string;
  readonly assetId: string;
  readonly completedAtUs: bigint | null;
}

/** Trusted inspection facts; a client assertion is not readiness evidence. */
export interface OfflineReadyObject extends RequiredObjectCompletion {
  readonly verifiedAtUs: bigint;
}

function instant(value: bigint): void {
  if (typeof value !== 'bigint' || value < 0n) throw new FirstMaterialFailure('INVALID_MATERIAL_FACT');
}

/** Immutable original acceptance, not a repeatable renewal command.
 * Repository must enforce one first receipt per Session/Record and idempotent replay.
 */
export class FirstMaterialReceipt {
  readonly fact: Readonly<FirstMaterialInput>;
  readonly transferDueAtUs: bigint | null;
  readonly requiresTeacherAnomalyReview: boolean;

  private constructor(input: FirstMaterialInput) {
    this.fact = Object.freeze({ ...input, requiredAssetIds: Object.freeze([...input.requiredAssetIds]) });
    this.transferDueAtUs = input.window === 'SWIMMING_OFFLINE' ? null : input.acceptedAtUs + 1800_000000n;
    this.requiresTeacherAnomalyReview = input.window === 'SWIMMING_OFFLINE';
    Object.freeze(this);
  }

  static accept(input: FirstMaterialInput, readyObjects?: readonly OfflineReadyObject[]): FirstMaterialReceipt {
    instant(input.endedAtUs); instant(input.acceptedAtUs);
    if (input.acceptedAtUs < input.endedAtUs ||
        ![input.organizationId, input.ownerSubjectId, input.sessionId, input.recordId, input.batchId].every(id => typeof id === 'string' && id.length > 0) ||
        input.requiredAssetIds.length === 0 || input.requiredAssetIds.length > 7 ||
        input.requiredAssetIds.some(id => typeof id !== 'string' || id.length === 0) ||
        new Set(input.requiredAssetIds).size !== input.requiredAssetIds.length) {
      throw new FirstMaterialFailure('INVALID_MATERIAL_FACT');
    }
    if (!['ORDINARY', 'SWIMMING_TIMELY', 'SWIMMING_OFFLINE'].includes(input.window)) {
      throw new FirstMaterialFailure('INVALID_MATERIAL_FACT');
    }
    if (input.window === 'SWIMMING_OFFLINE' &&
        (typeof input.offlineExplanation !== 'string' || input.offlineExplanation.trim().length === 0)) {
      throw new FirstMaterialFailure('OFFLINE_EXPLANATION_REQUIRED');
    }
    const budget = input.window === 'SWIMMING_TIMELY' ? 900_000000n : 86400_000000n;
    if (input.acceptedAtUs >= input.endedAtUs + budget) throw new FirstMaterialFailure('FIRST_WINDOW_EXPIRED');
    const receipt = new FirstMaterialReceipt(input);
    if (input.window === 'SWIMMING_OFFLINE') {
      if (!readyObjects) throw new FirstMaterialFailure('OBJECTS_INCOMPLETE');
      receipt.confirmTransfer(input.batchId, readyObjects, input.acceptedAtUs);
      for (const object of readyObjects) {
        instant(object.verifiedAtUs);
        if (object.verifiedAtUs > input.acceptedAtUs || object.completedAtUs === null || object.verifiedAtUs < object.completedAtUs) {
          throw new FirstMaterialFailure('INVALID_MATERIAL_FACT');
        }
      }
    }
    return receipt;
  }

  /** Observation can occur after the deadline: authority is object completion, not request arrival.
   * This establishes transfer completion only, not content validity or awarded credit.
   */
  confirmTransfer(batchId: string, objects: readonly RequiredObjectCompletion[], observedAtUs: bigint) {
    instant(observedAtUs);
    if (observedAtUs < this.fact.acceptedAtUs) throw new FirstMaterialFailure('INVALID_MATERIAL_FACT');
    if (batchId !== this.fact.batchId || objects.length !== this.fact.requiredAssetIds.length ||
        new Set(objects.map(object => object.assetId)).size !== objects.length ||
        objects.some(object => !this.fact.requiredAssetIds.includes(object.assetId))) {
      throw new FirstMaterialFailure('BATCH_MISMATCH');
    }
    let lastCompletedAtUs = 0n;
    for (const object of objects) {
      if (object.organizationId !== this.fact.organizationId || object.ownerSubjectId !== this.fact.ownerSubjectId ||
          object.sessionId !== this.fact.sessionId) throw new FirstMaterialFailure('OBJECT_SCOPE_MISMATCH');
      if (object.completedAtUs === null) throw new FirstMaterialFailure('OBJECTS_INCOMPLETE');
      instant(object.completedAtUs);
      if (object.completedAtUs > observedAtUs) throw new FirstMaterialFailure('INVALID_MATERIAL_FACT');
      if (this.transferDueAtUs === null ? object.completedAtUs > this.fact.acceptedAtUs : object.completedAtUs >= this.transferDueAtUs) {
        throw new FirstMaterialFailure('TRANSFER_WINDOW_EXPIRED');
      }
      if (object.completedAtUs > lastCompletedAtUs) lastCompletedAtUs = object.completedAtUs;
    }
    return Object.freeze({ recordId: this.fact.recordId, batchId: this.fact.batchId,
      acceptedAtUs: this.fact.acceptedAtUs, transferCompletedAtUs: lastCompletedAtUs,
      requiresTeacherAnomalyReview: this.requiresTeacherAnomalyReview });
  }
}
