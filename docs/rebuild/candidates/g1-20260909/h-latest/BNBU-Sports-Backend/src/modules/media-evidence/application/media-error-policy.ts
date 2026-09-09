import { RecordAssetFailure } from './ports/record-assets.ts';
import { RecordManifestError } from '../domain/record-manifest.ts';

export interface MediaErrorPolicy { readonly code: string; readonly status: number }
/** Composition root may translate this typed result into its common envelope.
 * Unrecognized exceptions remain internal failures; never classify by message text or duck-typed code.
 */
export function mediaErrorPolicy(error: unknown): MediaErrorPolicy | null {
  if (error instanceof RecordAssetFailure) {
    switch (error.code) {
      case 'MEDIA_SET_INVALID': return {code:'MATERIAL_BATCH_CONFLICT',status:409};
      case 'MEDIA_SCOPE_MISMATCH': return {code:'MEDIA_OWNERSHIP_MISMATCH',status:403};
      case 'MEDIA_VERSION_CONFLICT': return {code:'VERSION_CONFLICT',status:412};
      case 'MEDIA_NOT_READY': return {code:'MEDIA_NOT_VERIFIED',status:409};
      case 'MEDIA_CHECKSUM_INVALID': return {code:'MEDIA_CONTENT_INVALID',status:422};
      default: return {code:'DEPENDENCY_UNAVAILABLE',status:503};
    }
  }
  if (error instanceof RecordManifestError) {
    switch (error.code) {
      case 'MEDIA_LIMIT_EXCEEDED': return {code:'MEDIA_LIMIT_EXCEEDED',status:413};
      case 'ASSET_SCOPE_MISMATCH': return {code:'MEDIA_OWNERSHIP_MISMATCH',status:403};
      case 'UNVERIFIED_ASSET': return {code:'MEDIA_NOT_VERIFIED',status:409};
      case 'DUPLICATE_ASSET': return {code:'MATERIAL_BATCH_CONFLICT',status:409};
      default: return {code:'MEDIA_CONTENT_INVALID',status:422};
    }
  }
  return null;
}
