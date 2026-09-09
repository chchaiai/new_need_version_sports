import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startTiming, restoreTiming, transitionTiming, elapsedActiveMs, durationSummary } from '../domain/session-timing.ts';

test('active intervals are summed in milliseconds before any rounding', () => {
  const a = startTiming(0);
  const b = transitionTiming(a, 'PAUSE', 0, 59999);
  const c = transitionTiming(b, 'RESUME', 1, 120000);
  const d = transitionTiming(c, 'COMPLETE', 2, 1860001);
  assert.deepEqual(durationSummary(d, 30), {
    actualDurationMs: 1800000, actualDurationSeconds: 1800, wholeMinutes: 30, eligibleMinutes: 30,
  });
  assert.equal(a.status, 'ACTIVE');
  assert.equal(d.stateVersion, 3);
  assert.ok(Object.isFrozen(d));
});

for (const threshold of [30, 45, 60] as const) {
  for (const delta of [-1, 0, 1]) {
    test(`threshold ${threshold} minutes at ${delta} ms boundary`, () => {
      const ms = threshold * 60000 + delta;
      const end = transitionTiming(startTiming(0), 'COMPLETE', 0, ms);
      assert.equal(durationSummary(end, threshold).eligibleMinutes, delta < 0 ? 0 : threshold);
      assert.equal(end.accumulatedActiveMs, ms);
    });
  }
}

test('80 actual minutes remain 80 while eligibility is capped at 60', () => {
  const end = transitionTiming(startTiming(0), 'COMPLETE', 0, 4800000);
  assert.deepEqual(durationSummary(end, 30), {
    actualDurationMs: 4800000, actualDurationSeconds: 4800, wholeMinutes: 80, eligibleMinutes: 60,
  });
});

test('paused completion excludes the entire pause and completed time never grows', () => {
  const paused = transitionTiming(startTiming(100), 'PAUSE', 0, 60100);
  const end = transitionTiming(paused, 'COMPLETE', 1, 9000000);
  assert.equal(elapsedActiveMs(paused, 8000000), 60000);
  assert.equal(elapsedActiveMs(end, 10000000), 60000);
});

test('resume keeps original start across midnight and hydration', () => {
  const started = 1788969599000;
  const paused = transitionTiming(startTiming(started), 'PAUSE', 0, started + 500);
  const restored = restoreTiming(JSON.parse(JSON.stringify(paused)));
  const resumed = transitionTiming(restored, 'RESUME', 1, started + 3000);
  assert.equal(resumed.startedAtMs, started);
  assert.equal(elapsedActiveMs(resumed, started + 3500), 1000);
});

test('stale state version cannot add time or repeat a transition', () => {
  const paused = transitionTiming(startTiming(0), 'PAUSE', 0, 1000);
  assert.throws(() => transitionTiming(paused, 'RESUME', 0, 2000), /STATE_VERSION_CONFLICT/);
});

for (const action of ['PAUSE', 'RESUME', 'COMPLETE'] as const) {
  test(`completed session rejects ${action}`, () => {
    const end = transitionTiming(startTiming(0), 'COMPLETE', 0, 1000);
    assert.throws(() => transitionTiming(end, action, 1, 2000), /INVALID_SESSION_TRANSITION/);
  });
}

test('invalid state transitions are not silently accepted', () => {
  assert.throws(() => transitionTiming(startTiming(0), 'RESUME', 0, 1000), /INVALID_SESSION_TRANSITION/);
  const paused = transitionTiming(startTiming(0), 'PAUSE', 0, 1000);
  assert.throws(() => transitionTiming(paused, 'PAUSE', 1, 2000), /INVALID_SESSION_TRANSITION/);
});

test('clock regression cannot create negative intervals', () => {
  assert.throws(() => transitionTiming(startTiming(100), 'COMPLETE', 0, 99), /CLOCK_REGRESSION/);
});

test('same-instant ACTIVE closure cannot persist a zero-length interval', () => {
  for (const action of ['PAUSE', 'COMPLETE'] as const) {
    assert.throws(() => transitionTiming(startTiming(100), action, 0, 100), /INVALID_TIMING_FACT/);
  }
});

for (const invalid of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
  test(`reject invalid server time ${invalid}`, () => {
    assert.throws(() => startTiming(invalid), /INVALID_TIMING_FACT/);
  });
}

test('invalid hydrated facts and version overflow fail closed', () => {
  const start = startTiming(0);
  assert.throws(() => restoreTiming({ ...start, accumulatedActiveMs: 1 }), /INVALID_TIMING_FACT/);
  assert.throws(() => restoreTiming({ ...start, activeSinceMs: null }), /INVALID_TIMING_FACT/);
  assert.throws(() => transitionTiming({ ...start, stateVersion: Number.MAX_SAFE_INTEGER },
    'COMPLETE', Number.MAX_SAFE_INTEGER, 1), /INVALID_TIMING_FACT/);
});
