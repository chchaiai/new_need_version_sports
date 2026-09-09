import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SessionAccessService } from '../application/session-access.ts';
import type { SessionFactsRepository } from '../application/ports/session-facts-repository.ts';

// Unit-only contract adapter. Never registered in bootstrap; not database evidence.
function fixture(active: boolean) {
  const calls: string[] = [];
  const scope = { scope: 'foundation-transaction' } as const;
  const repository: SessionFactsRepository = {
    async findLocked(received, org, id) {
      assert.equal(received, scope);
      if (id === 'missing') return null;
      return { sessionId: id, organizationId: org, studentSubjectId: 'student', semesterId: 'semester',
        courseId: 'course', enrollmentId: 'enrollment', ruleVersionId: 'rule', makeupAuthorizationId: null,
        businessDate: '2026-09-09', thresholdMinutes: 30, status: 'ACTIVE', startedAtMs: 1000,
        completedAtMs: null, actualDurationMs: null, stateVersion: 0,
        activeIntervals: [{ openedAtMs: 1000, closedAtMs: null }] };
    },
    async lockOwner(received, org, owner) {
      assert.equal(received, scope); assert.equal(org, 'org'); assert.equal(owner, 'student'); calls.push('lock');
    },
    async hasActive(received) { assert.equal(received, scope); calls.push('read'); return active; },
  };
  return { repository, scope, calls, service: new SessionAccessService(repository) };
}

test('deletion blocker serializes owner before checking active state in same scope', async () => {
  const f = fixture(true);
  await assert.rejects(f.service.assertNoActive(f.scope, 'org', 'student'), /ACTIVE_SESSION_EXISTS/);
  assert.deepEqual(f.calls, ['lock', 'read']);
});
test('no-active result still requires the owner lock', async () => {
  const f = fixture(false);
  await f.service.assertNoActive(f.scope, 'org', 'student');
  assert.deepEqual(f.calls, ['lock', 'read']);
});
test('missing facts fail rather than manufacturing a Session', async () => {
  const f = fixture(false);
  await assert.rejects(f.service.facts(f.scope, 'org', 'missing'), /SESSION_NOT_FOUND/);
});
test('public facts and nested intervals are immutable', async () => {
  const f = fixture(false);
  const result = await f.service.facts(f.scope, 'org', 'session');
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.activeIntervals));
  assert.ok(Object.isFrozen(result.activeIntervals[0]));
});
test('repository failure propagates rather than allowing deletion', async () => {
  const f = fixture(false);
  f.repository.lockOwner = async () => { throw new Error('storage unavailable'); };
  await assert.rejects(f.service.assertNoActive(f.scope, 'org', 'student'), /storage unavailable/);
  assert.deepEqual(f.calls, []);
});
