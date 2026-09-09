import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateRecordManifest, type InspectedRecordAsset } from '../domain/record-manifest.ts';

const context = { organizationId: 'org', ownerSubjectId: 'student', sessionId: 'session', swimming: false };
const photo = (assetId = 'photo'): InspectedRecordAsset => ({ ...context, assetId,
  purpose: 'RECORD_EVIDENCE', inspection: 'VERIFIED', mediaKind: 'IMAGE',
  contentType: 'image/jpeg', byteSize: 10485760, durationMilliseconds: null, hasAudio: null, swimmingPhase: null });
const video = (): InspectedRecordAsset => ({ ...photo('video'), mediaKind: 'VIDEO',
  contentType: 'video/mp4', byteSize: 104857600, durationMilliseconds: 15000, hasAudio: true });

test('six maximum-size images plus one maximum-size video are accepted', () => {
  const assets = [...Array.from({ length: 6 }, (_, i) => photo(String(i))), video()];
  const result = validateRecordManifest(context, assets);
  assert.equal(result.totalBytes, 167772160);
  assert.equal(result.imageCount, 6);
  assert.equal(result.videoCount, 1);
  assert.ok(Object.isFrozen(result.assets));
  assert.ok(Object.isFrozen(result.assets[0]));
  assert.notEqual(result.assets[0], assets[0]);
});
test('empty materials cannot be declared complete', () => {
  assert.throws(() => validateRecordManifest(context, []), /EMPTY_MANIFEST/);
});
test('normal activity may use a video only', () => {
  assert.equal(validateRecordManifest(context, [video()]).imageCount, 0);
});
for (const [field, value] of [['organizationId', 'other'], ['ownerSubjectId', 'other'],
  ['sessionId', 'other'], ['purpose', 'APPLICATION_EVIDENCE']] as const) {
  test(`reject mismatched ${field}`, () => {
    assert.throws(() => validateRecordManifest(context, [{ ...photo(), [field]: value } as InspectedRecordAsset]),
      /ASSET_SCOPE_MISMATCH/);
  });
}
test('uninspected material is not a completed package', () => {
  assert.throws(() => validateRecordManifest(context, [{ ...photo(), inspection: 'PENDING' } as unknown as InspectedRecordAsset]),
    /UNVERIFIED_ASSET/);
});
test('duplicate IDs within a version are rejected; reuse in the next version is not automatically misuse', () => {
  assert.throws(() => validateRecordManifest(context, [photo(), photo()]), /DUPLICATE_ASSET/);
  validateRecordManifest(context, [photo()]);
  validateRecordManifest(context, [photo(), { ...photo('new'), contentType: 'image/png' }]);
});
test('seven images and two videos exceed independent limits', () => {
  assert.throws(() => validateRecordManifest(context, Array.from({ length: 7 }, (_, i) => photo(String(i)))), /MEDIA_LIMIT_EXCEEDED/);
  assert.throws(() => validateRecordManifest(context, [video(), { ...video(), assetId: 'other' }]), /MEDIA_LIMIT_EXCEEDED/);
});
for (const byteSize of [0, -1, 0.5, NaN, Infinity]) {
  test(`reject invalid byteSize ${byteSize}`, () => {
    assert.throws(() => validateRecordManifest(context, [{ ...photo(), byteSize }]), /INVALID_MEDIA_FACT/);
  });
}
test('size limit plus one byte is rejected for either media type', () => {
  for (const asset of [photo(), video()]) {
    assert.throws(() => validateRecordManifest(context, [{ ...asset, byteSize: asset.byteSize + 1 }]), /MEDIA_LIMIT_EXCEEDED/);
  }
});
for (const durationMilliseconds of [999, 15001, 1000.5, NaN, null]) {
  test(`reject invalid video duration ${durationMilliseconds}`, () => {
    assert.throws(() => validateRecordManifest(context, [{ ...video(), durationMilliseconds }]), /INVALID_MEDIA_FACT/);
  });
}
for (const durationMilliseconds of [1000, 15000]) {
  test(`accept inclusive video duration ${durationMilliseconds}`, () => {
    validateRecordManifest(context, [{ ...video(), durationMilliseconds }]);
  });
}
test('silent video and unsupported content are rejected', () => {
  assert.throws(() => validateRecordManifest(context, [{ ...video(), hasAudio: false }]), /INVALID_MEDIA_FACT/);
  assert.throws(() => validateRecordManifest(context, [{ ...photo(), contentType: 'image/gif' }]), /INVALID_MEDIA_FACT/);
});
test('swimming requires authoritative BEFORE and AFTER photos from the same session', () => {
  const swim = { ...context, swimming: true };
  const before = { ...photo('before'), swimmingPhase: 'BEFORE' } as const;
  const after = { ...photo('after'), swimmingPhase: 'AFTER' } as const;
  validateRecordManifest(swim, [before, after]);
  assert.throws(() => validateRecordManifest(swim, [before]), /SWIMMING_PHASE_MISSING/);
  assert.throws(() => validateRecordManifest(swim, [video()]), /SWIMMING_PHASE_MISSING/);
  assert.throws(() => validateRecordManifest(swim, [before, { ...after, sessionId: 'other' }]), /ASSET_SCOPE_MISMATCH/);
});
