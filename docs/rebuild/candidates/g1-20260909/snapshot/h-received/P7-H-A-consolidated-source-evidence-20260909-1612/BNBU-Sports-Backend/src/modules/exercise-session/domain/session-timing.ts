/** Server-owned timing facts. This is not start authorization or a credit award.
 * Student flow 7.2–7.3: sum ACTIVE milliseconds before rounding; COMPLETED is terminal.
 */
export type SessionTiming = Readonly<{
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  startedAtMs: number;
  lastTransitionAtMs: number;
  activeSinceMs: number | null;
  completedAtMs: number | null;
  accumulatedActiveMs: number;
  stateVersion: number;
}>;

export type TimingErrorCode = 'INVALID_TIMING_FACT' | 'CLOCK_REGRESSION' |
  'STATE_VERSION_CONFLICT' | 'INVALID_SESSION_TRANSITION';

export class SessionTimingError extends Error {
  readonly code: TimingErrorCode;
  constructor(code: TimingErrorCode) {
    super(code);
    this.name = 'SessionTimingError';
    this.code = code;
  }
}

function integer(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) throw new SessionTimingError('INVALID_TIMING_FACT');
}

/** Revalidate database facts rather than trusting a type assertion at hydration. */
export function restoreTiming(fact: SessionTiming): SessionTiming {
  integer(fact.startedAtMs);
  integer(fact.lastTransitionAtMs);
  integer(fact.accumulatedActiveMs);
  integer(fact.stateVersion);
  if (fact.lastTransitionAtMs < fact.startedAtMs ||
      fact.accumulatedActiveMs > fact.lastTransitionAtMs - fact.startedAtMs) {
    throw new SessionTimingError('INVALID_TIMING_FACT');
  }
  if (fact.status === 'ACTIVE') {
    if (fact.activeSinceMs !== fact.lastTransitionAtMs || fact.completedAtMs !== null) {
      throw new SessionTimingError('INVALID_TIMING_FACT');
    }
  } else if (fact.status === 'PAUSED') {
    if (fact.activeSinceMs !== null || fact.completedAtMs !== null) {
      throw new SessionTimingError('INVALID_TIMING_FACT');
    }
  } else if (fact.status === 'COMPLETED') {
    if (fact.activeSinceMs !== null || fact.completedAtMs !== fact.lastTransitionAtMs) {
      throw new SessionTimingError('INVALID_TIMING_FACT');
    }
  } else {
    throw new SessionTimingError('INVALID_TIMING_FACT');
  }
  return Object.freeze({ ...fact });
}

/** Caller supplies a server clock, never a client timestamp. */
export function startTiming(serverNowMs: number): SessionTiming {
  return restoreTiming({ status: 'ACTIVE', startedAtMs: serverNowMs,
    lastTransitionAtMs: serverNowMs, activeSinceMs: serverNowMs,
    completedAtMs: null, accumulatedActiveMs: 0, stateVersion: 0 });
}

export function elapsedActiveMs(fact: SessionTiming, serverNowMs: number): number {
  restoreTiming(fact);
  integer(serverNowMs);
  if (serverNowMs < fact.lastTransitionAtMs) throw new SessionTimingError('CLOCK_REGRESSION');
  const elapsed = fact.accumulatedActiveMs +
    (fact.activeSinceMs === null ? 0 : serverNowMs - fact.activeSinceMs);
  integer(elapsed);
  return elapsed;
}

export function transitionTiming(
  fact: SessionTiming,
  action: 'PAUSE' | 'RESUME' | 'COMPLETE',
  expectedVersion: number,
  serverNowMs: number,
): SessionTiming {
  restoreTiming(fact);
  integer(expectedVersion);
  if (fact.stateVersion !== expectedVersion) throw new SessionTimingError('STATE_VERSION_CONFLICT');
  if (!((action === 'PAUSE' && fact.status === 'ACTIVE') ||
        (action === 'RESUME' && fact.status === 'PAUSED') ||
        (action === 'COMPLETE' && fact.status !== 'COMPLETED'))) {
    throw new SessionTimingError('INVALID_SESSION_TRANSITION');
  }
  const accumulatedActiveMs = elapsedActiveMs(fact, serverNowMs);
  // Architecture §5.4 requires every closed ACTIVE interval to have positive length.
  if (fact.activeSinceMs !== null && serverNowMs === fact.activeSinceMs) {
    throw new SessionTimingError('INVALID_TIMING_FACT');
  }
  return restoreTiming({ ...fact,
    status: action === 'PAUSE' ? 'PAUSED' : action === 'RESUME' ? 'ACTIVE' : 'COMPLETED',
    lastTransitionAtMs: serverNowMs,
    activeSinceMs: action === 'RESUME' ? serverNowMs : null,
    completedAtMs: action === 'COMPLETE' ? serverNowMs : null,
    accumulatedActiveMs,
    stateVersion: fact.stateVersion + 1,
  });
}

export function durationSummary(completed: SessionTiming, thresholdMinutes: 30 | 45 | 60) {
  restoreTiming(completed);
  if (completed.status !== 'COMPLETED' || ![30, 45, 60].includes(thresholdMinutes)) {
    throw new SessionTimingError('INVALID_TIMING_FACT');
  }
  const milliseconds = completed.accumulatedActiveMs;
  const actualDurationSeconds = (milliseconds - milliseconds % 1000) / 1000;
  const wholeMinutes = (milliseconds - milliseconds % 60000) / 60000;
  const eligibleMinutes = wholeMinutes < thresholdMinutes ? 0 : wholeMinutes > 60 ? 60 : wholeMinutes;
  return Object.freeze({ actualDurationMs: milliseconds, actualDurationSeconds, wholeMinutes, eligibleMinutes });
}
