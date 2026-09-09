import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FirstMaterialReceipt, type FirstMaterialInput, type RequiredObjectCompletion } from '../domain/first-material.ts';

const base: FirstMaterialInput = { organizationId: 'org', ownerSubjectId: 'student', sessionId: 'session',
  recordId: 'record', batchId: 'batch', endedAtUs: 1788969600000000n, acceptedAtUs: 1788969600000001n,
  window: 'ORDINARY', offlineExplanation: null, requiredAssetIds: ['a', 'b'] };
const completion = (assetId: string, completedAtUs: bigint | null): RequiredObjectCompletion => ({
  organizationId: base.organizationId, ownerSubjectId: base.ownerSubjectId, sessionId: base.sessionId,
  assetId, completedAtUs,
});

for (const window of ['ORDINARY', 'SWIMMING_TIMELY', 'SWIMMING_OFFLINE'] as const) {
  const budget = window === 'SWIMMING_TIMELY' ? 900_000000n : 86400_000000n;
  for (const delta of [-1n, 0n, 1n]) {
    test(`${window}: acceptance boundary ${delta} microseconds`, () => {
      const input = { ...base, window, offlineExplanation: 'Fully offline; original evidence retained',
        acceptedAtUs: base.endedAtUs + budget + delta };
      const ready = ['a', 'b'].map(id => ({...completion(id, input.acceptedAtUs), verifiedAtUs: input.acceptedAtUs}));
      if (delta < 0n) assert.equal(FirstMaterialReceipt.accept(input, ready).fact.acceptedAtUs, input.acceptedAtUs);
      else assert.throws(() => FirstMaterialReceipt.accept(input), /FIRST_WINDOW_EXPIRED/);
    });
  }
}
test('offline exception requires explanation and routes to anomaly review, not automatic validity', () => {
  assert.throws(() => FirstMaterialReceipt.accept({ ...base, window: 'SWIMMING_OFFLINE', offlineExplanation: '  ' }),
    /OFFLINE_EXPLANATION_REQUIRED/);
  assert.equal(FirstMaterialReceipt.accept({ ...base, window: 'SWIMMING_OFFLINE', offlineExplanation: 'offline' },
    ['a', 'b'].map(id => ({...completion(id, base.acceptedAtUs), verifiedAtUs: base.acceptedAtUs})))
    .requiresTeacherAnomalyReview, true);
});
test('receipt clones and freezes original required batch', () => {
  const ids = ['a', 'b'];
  const receipt = FirstMaterialReceipt.accept({ ...base, requiredAssetIds: ids });
  ids.push('c');
  assert.deepEqual(receipt.fact.requiredAssetIds, ['a', 'b']);
  assert.ok(Object.isFrozen(receipt));
  assert.ok(Object.isFrozen(receipt.fact.requiredAssetIds));
});
for (const delta of [-1n, 0n, 1n]) {
  test(`last authoritative object completion boundary ${delta} microseconds`, () => {
    const receipt = FirstMaterialReceipt.accept(base);
    assert.notEqual(receipt.transferDueAtUs, null);
    const due = receipt.transferDueAtUs!;
    const objects = [completion('a', base.acceptedAtUs), completion('b', due + delta)];
    if (delta < 0n) {
      const result = receipt.confirmTransfer('batch', objects, due + 100n);
      assert.equal(result.transferCompletedAtUs, due - 1n);
    } else assert.throws(() => receipt.confirmTransfer('batch', objects, due + 100n), /TRANSFER_WINDOW_EXPIRED/);
  });
}
test('later observation does not reject already timely object transfer or renew deadline', () => {
  const receipt = FirstMaterialReceipt.accept(base);
  const objects = [completion('a', base.endedAtUs), completion('b', base.acceptedAtUs)];
  const result = receipt.confirmTransfer('batch', objects, receipt.transferDueAtUs! + 999999n);
  assert.equal(result.acceptedAtUs, base.acceptedAtUs);
  assert.equal(receipt.transferDueAtUs, base.acceptedAtUs + 1800_000000n);
});
test('missing, extra, duplicate and replaced objects cannot change a locked manifest', () => {
  const receipt = FirstMaterialReceipt.accept(base);
  for (const ids of [['a'], ['a', 'b', 'c'], ['a', 'a'], ['a', 'c']]) {
    assert.throws(() => receipt.confirmTransfer('batch', ids.map(id => completion(id, base.acceptedAtUs)), base.acceptedAtUs), /BATCH_MISMATCH/);
  }
  assert.throws(() => receipt.confirmTransfer('new-batch', ['a', 'b'].map(id => completion(id, base.acceptedAtUs)), base.acceptedAtUs), /BATCH_MISMATCH/);
});
test('partially uploaded object is not complete or a successful record review', () => {
  const receipt = FirstMaterialReceipt.accept(base);
  assert.throws(() => receipt.confirmTransfer('batch', [completion('a', null), completion('b', base.acceptedAtUs)], base.acceptedAtUs), /OBJECTS_INCOMPLETE/);
});
for (const field of ['organizationId', 'ownerSubjectId', 'sessionId'] as const) {
  test(`reject cross-scope completion ${field}`, () => {
    const receipt = FirstMaterialReceipt.accept(base);
    assert.throws(() => receipt.confirmTransfer('batch', [{ ...completion('a', base.acceptedAtUs), [field]: 'other' },
      completion('b', base.acceptedAtUs)], base.acceptedAtUs), /OBJECT_SCOPE_MISMATCH/);
  });
}
test('future completion, before-end acceptance and duplicate allocation facts fail closed', () => {
  const receipt = FirstMaterialReceipt.accept(base);
  assert.throws(() => receipt.confirmTransfer('batch', [completion('a', base.acceptedAtUs + 1n), completion('b', base.acceptedAtUs)], base.acceptedAtUs), /INVALID_MATERIAL_FACT/);
  assert.throws(() => FirstMaterialReceipt.accept({ ...base, acceptedAtUs: base.endedAtUs - 1n }), /INVALID_MATERIAL_FACT/);
  assert.throws(() => FirstMaterialReceipt.accept({ ...base, requiredAssetIds: ['a', 'a'] }), /INVALID_MATERIAL_FACT/);
});

test('offline swimming cannot accept missing readiness or gain a continuation window', () => {
  const input = {...base, window: 'SWIMMING_OFFLINE' as const, offlineExplanation: 'offline'};
  assert.throws(() => FirstMaterialReceipt.accept(input), /OBJECTS_INCOMPLETE/);
  const ready = ['a', 'b'].map(id => ({...completion(id, base.acceptedAtUs), verifiedAtUs: base.acceptedAtUs}));
  const receipt = FirstMaterialReceipt.accept(input, ready);
  assert.equal(receipt.transferDueAtUs, null);
  assert.throws(() => FirstMaterialReceipt.accept(input, [ready[0]!, {...ready[1]!, verifiedAtUs: base.acceptedAtUs + 1n}]), /INVALID_MATERIAL_FACT/);
  assert.throws(() => receipt.confirmTransfer('batch', [ready[0]!, completion('b', base.acceptedAtUs + 1n)], base.acceptedAtUs + 2n), /TRANSFER_WINDOW_EXPIRED/);
});
