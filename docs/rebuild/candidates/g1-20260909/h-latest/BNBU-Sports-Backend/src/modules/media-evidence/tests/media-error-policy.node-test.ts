import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mediaErrorPolicy} from '../application/media-error-policy.ts';
import {RecordAssetFailure} from '../application/ports/record-assets.ts';
import {RecordManifestError} from '../domain/record-manifest.ts';
test('typed media errors preserve Contract status distinctions',()=>{
  assert.deepEqual(mediaErrorPolicy(new RecordAssetFailure('MEDIA_SCOPE_MISMATCH')),{code:'MEDIA_OWNERSHIP_MISMATCH',status:403});
  assert.deepEqual(mediaErrorPolicy(new RecordAssetFailure('MEDIA_VERSION_CONFLICT')),{code:'VERSION_CONFLICT',status:412});
  assert.deepEqual(mediaErrorPolicy(new RecordManifestError('MEDIA_LIMIT_EXCEEDED')),{code:'MEDIA_LIMIT_EXCEEDED',status:413});
  assert.deepEqual(mediaErrorPolicy(new RecordManifestError('INVALID_MEDIA_FACT')),{code:'MEDIA_CONTENT_INVALID',status:422});
});
test('unknown and forged media exceptions cannot impersonate typed business failures',()=>{
  for(const value of [new Error('MEDIA_NOT_READY'),{code:'MEDIA_SCOPE_MISMATCH'},'MEDIA_NOT_READY',null])assert.equal(mediaErrorPolicy(value),null);
});
