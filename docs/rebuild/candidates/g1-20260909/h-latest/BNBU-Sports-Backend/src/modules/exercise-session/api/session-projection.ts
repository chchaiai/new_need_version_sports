import type { components } from '../../../shared/api/contract.generated.ts';
import type { SessionCommandResult } from '../application/session-commands.ts';

/** API representation only; receipt observation time is pinned for idempotent replay. */
export function sessionProjection(result:SessionCommandResult):components['schemas']['ExerciseSession'] {
  const f=result.facts;
  let milliseconds=0;
  for(const interval of f.activeIntervals) milliseconds+=(interval.closedAtMs??result.observedAtMs)-interval.openedAtMs;
  if(!Number.isSafeInteger(milliseconds)||milliseconds<0)throw new Error('SESSION_PROJECTION_INCONSISTENT');
  const paused=f.status==='PAUSED'?f.activeIntervals.at(-1)?.closedAtMs:null;
  if(f.status==='PAUSED'&&(paused===null||paused===undefined))throw new Error('SESSION_PROJECTION_INCONSISTENT');
  return {sessionId:f.sessionId,courseId:f.courseId,enrollmentId:f.enrollmentId,status:f.status,businessDate:f.businessDate,
    startedAt:new Date(f.startedAtMs).toISOString(),pausedAt:paused===null||paused===undefined?null:new Date(paused).toISOString(),
    completedAt:f.completedAtMs===null?null:new Date(f.completedAtMs).toISOString(),
    elapsedActiveSeconds:Math.floor(milliseconds/1000),actualDurationSeconds:f.actualDurationMs===null?null:Math.floor(f.actualDurationMs/1000),
    stateVersion:f.stateVersion,ruleVersionId:f.ruleVersionId,makeupAuthorizationId:f.makeupAuthorizationId};
}
