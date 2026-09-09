/** These facts must come from authoritative storage inspection, never request declarations.
 * This policy checks a completed material package; it does not accept an upload,
 * grant access, establish a swimming phase, or award validity/credit.
 */
export type InspectedRecordAsset = Readonly<{
  assetId: string;
  organizationId: string;
  ownerSubjectId: string;
  sessionId: string;
  purpose: 'RECORD_EVIDENCE';
  inspection: 'VERIFIED';
  mediaKind: 'IMAGE' | 'VIDEO';
  contentType: string;
  byteSize: number;
  durationMilliseconds: number | null;
  hasAudio: boolean | null;
  swimmingPhase: 'BEFORE' | 'AFTER' | null;
}>;

export type ManifestFailure = 'EMPTY_MANIFEST' | 'DUPLICATE_ASSET' | 'ASSET_SCOPE_MISMATCH' |
  'UNVERIFIED_ASSET' | 'INVALID_MEDIA_FACT' | 'MEDIA_LIMIT_EXCEEDED' | 'SWIMMING_PHASE_MISSING';

export class RecordManifestError extends Error {
  readonly code: ManifestFailure;
  constructor(code: ManifestFailure) {
    super(code);
    this.name = 'RecordManifestError';
    this.code = code;
  }
}

export function validateRecordManifest(
  context: Readonly<{ organizationId: string; ownerSubjectId: string; sessionId: string; swimming: boolean }>,
  assets: readonly InspectedRecordAsset[],
): Readonly<{ assets: readonly InspectedRecordAsset[]; imageCount: number; videoCount: number; totalBytes: number }> {
  if (assets.length === 0) throw new RecordManifestError('EMPTY_MANIFEST');
  const seen = new Set<string>();
  let imageCount = 0, videoCount = 0, totalBytes = 0;
  let before = false, after = false;
  const snapshot: InspectedRecordAsset[] = [];
  for (const asset of assets) {
    if (!asset.assetId || seen.has(asset.assetId)) throw new RecordManifestError('DUPLICATE_ASSET');
    seen.add(asset.assetId);
    if (asset.organizationId !== context.organizationId || asset.ownerSubjectId !== context.ownerSubjectId ||
        asset.sessionId !== context.sessionId || asset.purpose !== 'RECORD_EVIDENCE') {
      throw new RecordManifestError('ASSET_SCOPE_MISMATCH');
    }
    if (asset.inspection !== 'VERIFIED') throw new RecordManifestError('UNVERIFIED_ASSET');
    if (!Number.isSafeInteger(asset.byteSize) || asset.byteSize <= 0 ||
        ![null, 'BEFORE', 'AFTER'].includes(asset.swimmingPhase)) {
      throw new RecordManifestError('INVALID_MEDIA_FACT');
    }
    if (asset.mediaKind === 'IMAGE') {
      if (!['image/jpeg', 'image/png'].includes(asset.contentType) ||
          asset.durationMilliseconds !== null || asset.hasAudio !== null) {
        throw new RecordManifestError('INVALID_MEDIA_FACT');
      }
      if (asset.byteSize > 10485760) throw new RecordManifestError('MEDIA_LIMIT_EXCEEDED');
      imageCount++;
      before ||= asset.swimmingPhase === 'BEFORE';
      after ||= asset.swimmingPhase === 'AFTER';
    } else if (asset.mediaKind === 'VIDEO') {
      if (asset.contentType !== 'video/mp4' || asset.hasAudio !== true ||
          asset.durationMilliseconds === null || !Number.isSafeInteger(asset.durationMilliseconds) ||
          asset.durationMilliseconds < 1000 || asset.durationMilliseconds > 15000 || asset.swimmingPhase !== null) {
        throw new RecordManifestError('INVALID_MEDIA_FACT');
      }
      if (asset.byteSize > 104857600) throw new RecordManifestError('MEDIA_LIMIT_EXCEEDED');
      videoCount++;
    } else {
      throw new RecordManifestError('INVALID_MEDIA_FACT');
    }
    totalBytes += asset.byteSize;
    if (imageCount > 6 || videoCount > 1 || totalBytes > 262144000) {
      throw new RecordManifestError('MEDIA_LIMIT_EXCEEDED');
    }
    snapshot.push(Object.freeze({ ...asset }));
  }
  if (context.swimming && (!before || !after)) throw new RecordManifestError('SWIMMING_PHASE_MISSING');
  return Object.freeze({ assets: Object.freeze(snapshot), imageCount, videoCount, totalBytes });
}
