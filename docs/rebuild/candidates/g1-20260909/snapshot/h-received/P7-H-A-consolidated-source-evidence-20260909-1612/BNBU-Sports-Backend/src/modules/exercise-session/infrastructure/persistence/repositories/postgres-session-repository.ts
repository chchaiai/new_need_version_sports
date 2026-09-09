import type { PostgresTransactionRunner } from '../../../../../shared/infrastructure/postgres.ts';
import type { TransactionScope } from '../../../../../shared/application/transactions/transaction-runner.ts';
import type { SessionCommandRepository, NewSession } from '../../../application/ports/session-commands.ts';
import type { SessionStudentOwnerLock } from '../../../application/ports/student-owner-lock.ts';
import { SessionAccessFailure, type SessionFacts } from '../../../application/public/sessions.ts';
import { transitionTiming } from '../../../domain/session-timing.ts';

function safeInteger(value: unknown): number {
  const number = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  if (typeof number !== 'number' || !Number.isSafeInteger(number) || number < 0) throw new SessionAccessFailure('SESSION_FACTS_INCONSISTENT');
  return number;
}

export class PostgresSessionRepository implements SessionCommandRepository {
  private readonly runner: PostgresTransactionRunner;
  private readonly ownerLock: SessionStudentOwnerLock;
  constructor(runner: PostgresTransactionRunner, ownerLock: SessionStudentOwnerLock) {
    this.runner = runner; this.ownerLock = ownerLock;
  }
  async lockOwner(scope: TransactionScope, org: string, student: string): Promise<void> {
    await this.ownerLock.lockStudentOwner(scope, org, student);
  }
  async hasActive(scope: TransactionScope, org: string, student: string): Promise<boolean> {
    const result = await this.runner.client(scope).query(
      "SELECT id FROM exercise_session.session WHERE organization_id=$1 AND student_subject_id=$2 AND status IN ('ACTIVE','PAUSED') LIMIT 1", [org, student]);
    return result.rowCount === 1;
  }
  async reference(scope:TransactionScope,org:string,id:string) {
    const result=await this.runner.client(scope).query(
      'SELECT student_subject_id,course_id,(extract(epoch FROM (started_at))*1000)::bigint AS started_ms FROM exercise_session.session WHERE organization_id=$1 AND id=$2',[org,id]);
    const row=result.rows[0];
    return row?{studentSubjectId:row.student_subject_id,courseId:row.course_id,startedAtMs:safeInteger(row.started_ms)}:null;
  }
  async findLocked(scope: TransactionScope, org: string, id: string): Promise<SessionFacts | null> {
    const result = await this.runner.client(scope).query(
      `SELECT *,business_date::text AS business_date_text, (extract(epoch FROM (started_at))*1000)::bigint AS started_ms,
       (extract(epoch FROM (completed_at))*1000)::bigint AS completed_ms
       FROM exercise_session.session WHERE organization_id=$1 AND id=$2 FOR UPDATE`, [org,id]);
    const row = result.rows[0];
    if (!row) return null;
    const intervals = await this.runner.client(scope).query(
      `SELECT (extract(epoch FROM (opened_at))*1000)::bigint AS opened_ms,
       (extract(epoch FROM (closed_at))*1000)::bigint AS closed_ms
       FROM exercise_session.active_interval WHERE session_id=$1 ORDER BY sequence_no`, [id]);
    return { sessionId: row.id, organizationId: row.organization_id, studentSubjectId: row.student_subject_id,
      semesterId: row.semester_id, courseId: row.course_id, enrollmentId: row.enrollment_id,
      ruleVersionId: row.rule_version_id, makeupAuthorizationId: row.makeup_authorization_id,
      businessDate: row.business_date_text, thresholdMinutes: row.threshold_minutes, status: row.status,
      startedAtMs: safeInteger(row.started_ms), completedAtMs: row.completed_ms === null ? null : safeInteger(row.completed_ms),
      actualDurationMs: row.actual_duration_ms === null ? null : safeInteger(row.actual_duration_ms),
      stateVersion: safeInteger(row.state_version), activeIntervals: intervals.rows.map(interval => ({
        openedAtMs: safeInteger(interval.opened_ms), closedAtMs: interval.closed_ms === null ? null : safeInteger(interval.closed_ms),
      })) };
  }
  /** Caller must hold admission/identity locks first. Duplicate starts are rejected by DB uniqueness too. */
  async insert(scope: TransactionScope, input: NewSession): Promise<void> {
    safeInteger(input.startedAtMs);
    await this.lockOwner(scope,input.organizationId,input.studentSubjectId);
    await this.runner.client(scope).query(
      `INSERT INTO exercise_session.session(id,organization_id,student_subject_id,semester_id,course_id,enrollment_id,
       rule_version_id,makeup_authorization_id,threshold_minutes,status,started_at,state_version,start_command_id)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'ACTIVE',$10,0,$11)`,
      [input.sessionId,input.organizationId,input.studentSubjectId,input.semesterId,input.courseId,input.enrollmentId,
        input.ruleVersionId,input.makeupAuthorizationId,input.thresholdMinutes,new Date(input.startedAtMs),input.commandId]);
    await this.runner.client(scope).query(
      'INSERT INTO exercise_session.active_interval(session_id,sequence_no,opened_at,open_command_id) VALUES($1,0,$2,$3)',
      [input.sessionId,new Date(input.startedAtMs),input.commandId]);
  }

  /** Caller authenticates and checks the original legal chain before this persistence operation. */
  async transition(scope: TransactionScope, org: string, student: string, sessionId: string,
    action: 'PAUSE' | 'RESUME' | 'COMPLETE', expectedVersion: number, nowMs: number, commandId: string): Promise<void> {
    await this.lockOwner(scope,org,student);
    const facts = await this.findLocked(scope,org,sessionId);
    if (!facts) throw new SessionAccessFailure('SESSION_NOT_FOUND');
    if (facts.studentSubjectId.toLowerCase() !== student.toLowerCase()) throw new SessionAccessFailure('SESSION_NOT_FOUND');
    const last = facts.activeIntervals.at(-1);
    if (!last) throw new SessionAccessFailure('SESSION_FACTS_INCONSISTENT');
    const accumulatedActiveMs = facts.activeIntervals.reduce((sum, interval) => sum +
      (interval.closedAtMs === null ? 0 : interval.closedAtMs - interval.openedAtMs), 0);
    const next = transitionTiming({ status: facts.status, startedAtMs: facts.startedAtMs,
      completedAtMs: facts.completedAtMs, stateVersion: facts.stateVersion, accumulatedActiveMs,
      activeSinceMs: facts.status === 'ACTIVE' ? last.openedAtMs : null,
      lastTransitionAtMs: facts.completedAtMs ?? last.closedAtMs ?? last.openedAtMs }, action,expectedVersion,nowMs);
    if (facts.status === 'ACTIVE') {
      await this.runner.client(scope).query(
        'UPDATE exercise_session.active_interval SET closed_at=$2,close_reason=$3,close_command_id=$4 WHERE session_id=$1 AND closed_at IS NULL',
        [sessionId,new Date(nowMs),action,commandId]);
    } else if (action === 'RESUME') {
      await this.runner.client(scope).query(
        'INSERT INTO exercise_session.active_interval(session_id,sequence_no,opened_at,open_command_id) VALUES($1,$2,$3,$4)',
        [sessionId,facts.activeIntervals.length,new Date(nowMs),commandId]);
    }
    const result = await this.runner.client(scope).query(
      'UPDATE exercise_session.session SET status=$3,completed_at=$4,actual_duration_ms=$5,state_version=state_version+1 WHERE id=$1 AND state_version=$2',
      [sessionId,expectedVersion,next.status,next.completedAtMs === null ? null : new Date(next.completedAtMs),
        next.status === 'COMPLETED' ? next.accumulatedActiveMs : null]);
    if (result.rowCount !== 1) throw new SessionAccessFailure('SESSION_FACTS_INCONSISTENT');
  }
}
