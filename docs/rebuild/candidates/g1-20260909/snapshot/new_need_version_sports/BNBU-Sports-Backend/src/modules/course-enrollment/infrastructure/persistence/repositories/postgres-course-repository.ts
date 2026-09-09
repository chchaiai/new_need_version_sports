import type { QueryResultRow } from 'pg';
import type { TransactionScope } from '../../../../../shared/application/transactions/transaction-runner.ts';
import { PostgresTransactionRunner } from '../../../../../shared/infrastructure/postgres.ts';
import type { CourseRepository, PlanEvidence, Impact, Makeup } from '../../../application/ports/course-repository.ts';
import type { Course, Enrollment, Invitation, InvitationFlow, Template, Rule } from '../../../domain/course.ts';
function readRule(v: Rule): Rule {
    if (!v || ![30, 45, 60].includes(v.thresholdMinutes) || ![2, 3, 4].includes(v.weeklyCountLimit) || !Number.isSafeInteger(v.courseRelatedTargetMinutes) || !Number.isSafeInteger(v.otherTargetMinutes) || v.courseRelatedTargetMinutes < 0 || v.otherTargetMinutes < 0 || v.courseRelatedTargetMinutes + v.otherTargetMinutes !== 1200 || !Array.isArray(v.allowedIntervals) || !v.allowedIntervals.length || v.allowedIntervals.some(i => !Number.isFinite(i.startsAt) || !Number.isFinite(i.endsAtExclusive) || i.startsAt >= i.endsAtExclusive))
        throw new Error('PERSISTENCE_INVARIANT_BROKEN');
    return v;
}
function courseRow(r: QueryResultRow): Course {
    if (!['DRAFT', 'OPEN', 'CLOSED'].includes(r.status))
        throw new Error('PERSISTENCE_INVARIANT_BROKEN');
    return { id: r.id, organizationId: r.organization_id, semesterId: r.semester_id, responsibleTeacherSubjectId: r.responsible_teacher_subject_id,
        teacherName: r.teacher_name_snapshot, name: r.name, description: r.description, status: r.status, joinOpen: r.join_open, rule: readRule(r.rule), published: r.published_rule,
        version: Number(r.version), targetRevision: Number(r.target_revision), updatedAt: r.updated_at.getTime(), closedAt: r.closed_at?.getTime() ?? null };
}
function invitationRow(r: QueryResultRow): Invitation { return { id: r.id, courseId: r.course_id, codeDigest: r.code_digest, displaySuffix: r.display_suffix, revoked: r.revoked, expiresAt: r.expires_at.getTime(), createdAt: r.created_at.getTime(), version: Number(r.version) }; }
function enrollmentRow(r: QueryResultRow): Enrollment {
    if (!['ACTIVE', 'REMOVED'].includes(r.status))
        throw new Error('PERSISTENCE_INVARIANT_BROKEN');
    return { id: r.id, organizationId: r.organization_id, semesterId: r.semester_id, courseId: r.course_id, studentSubjectId: r.student_subject_id, status: r.status, joinedAt: r.joined_at.getTime(), removedAt: r.removed_at?.getTime() ?? null, studentVisibleReason: r.student_visible_reason, version: Number(r.version) };
}
function flowRow(r: QueryResultRow): InvitationFlow {
    if (!['REGISTERED', 'COMPLETED', 'TERMINATED'].includes(r.status))
        throw new Error('PERSISTENCE_INVARIANT_BROKEN');
    return { id: r.id, invitationId: r.invitation_id, subject: r.subject, authorizationDigest: r.authorization_digest, studentSubjectId: r.student_subject_id, registeredAt: r.registered_at.getTime(), originalExpiresAt: r.original_expires_at.getTime(), graceEndsAt: r.grace_ends_at.getTime(), status: r.status, version: Number(r.version) };
}
export class PostgresCourseRepository implements CourseRepository {
    private readonly tx: PostgresTransactionRunner;
    constructor(tx: PostgresTransactionRunner) { this.tx = tx; }
    async activeStudentSubjects(s: TransactionScope, org: string, semester: string, subjects: readonly string[]): Promise<string[]> {
        return (await this.tx.client(s).query("SELECT student_subject_id FROM course_enrollment.enrollment WHERE organization_id=$1 AND semester_id=$2 AND student_subject_id=ANY($3::uuid[]) AND status='ACTIVE' ORDER BY student_subject_id", [org, semester, subjects])).rows.map(r => r.student_subject_id as string);
    }
    async course(s: TransactionScope, org: string, id: string, lock = true) {
        const client = this.tx.client(s);
        const result = lock ? await client.query('SELECT * FROM course_enrollment.course WHERE id=$1 AND organization_id=$2 FOR UPDATE', [id, org])
            : await client.query('SELECT * FROM course_enrollment.course WHERE id=$1 AND organization_id=$2', [id, org]);
        return result.rows[0] ? courseRow(result.rows[0]) : null;
    }
    async courses(s: TransactionScope, org: string, teacher: string) { return (await this.tx.client(s).query('SELECT * FROM course_enrollment.course WHERE organization_id=$1 AND responsible_teacher_subject_id=$2 ORDER BY id', [org, teacher])).rows.map(courseRow); }
    async saveCourse(s: TransactionScope, c: Course, actor: string, revisionId: string) {
        await this.tx.client(s).query(`INSERT INTO course_enrollment.course(id,organization_id,semester_id,responsible_teacher_subject_id,teacher_name_snapshot,name,description,status,join_open,rule,published_rule,version,target_revision,updated_at,closed_at)
   VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`, [c.id, c.organizationId, c.semesterId, c.responsibleTeacherSubjectId, c.teacherName, c.name, c.description, c.status, c.joinOpen, JSON.stringify(c.rule), c.published ? JSON.stringify(c.published) : null, c.version, c.targetRevision, new Date(c.updatedAt), c.closedAt === null ? null : new Date(c.closedAt)]);
        await this.revision(s, c, actor, revisionId);
    }
    private async revision(s: TransactionScope, c: Course, actor: string, id: string) { await this.tx.client(s).query(`INSERT INTO course_enrollment.course_target_revision(id,course_id,revision_no,rule,actor_subject_id,occurred_at) VALUES($1,$2,$3,$4,$5,$6)`, [id, c.id, c.targetRevision, JSON.stringify(c.rule), actor, new Date(c.updatedAt)]); }
    async updateCourse(s: TransactionScope, c: Course, actor: string, revisionId: string | null) {
        await this.tx.client(s).query(`UPDATE course_enrollment.course SET name=$2,description=$3,status=$4,join_open=$5,rule=$6,published_rule=$7,version=$8,target_revision=$9,updated_at=$10,closed_at=$11 WHERE id=$1`, [c.id, c.name, c.description, c.status, c.joinOpen, JSON.stringify(c.rule), c.published ? JSON.stringify(c.published) : null, c.version, c.targetRevision, new Date(c.updatedAt), c.closedAt === null ? null : new Date(c.closedAt)]);
        if (revisionId)
            await this.revision(s, c, actor, revisionId);
    }
    async template(s: TransactionScope, org: string, id: string): Promise<Template | null> { const r = (await this.tx.client(s).query('SELECT * FROM course_enrollment.rule_template_version WHERE id=$1 AND organization_id=$2 FOR SHARE', [id, org])).rows[0]; return r ? { templateVersionId: r.id, versionNo: Number(r.version_no), label: { zh: r.label_zh, en: r.label_en }, publishedAt: r.published_at.getTime() } : null; }
    async invitationCourseId(s: TransactionScope, digest: string): Promise<string | null> {
        const row = (await this.tx.client(s).query('SELECT course_id FROM course_enrollment.course_invitation WHERE code_digest=$1', [digest])).rows[0];
        return row ? row.course_id as string : null;
    }
    async invitation(s: TransactionScope, digest: string) { const r = (await this.tx.client(s).query('SELECT * FROM course_enrollment.course_invitation WHERE code_digest=$1 FOR UPDATE', [digest])).rows[0]; return r ? invitationRow(r) : null; }
    async invitationById(s: TransactionScope, id: string, course: string) { const r = (await this.tx.client(s).query('SELECT * FROM course_enrollment.course_invitation WHERE id=$1 AND course_id=$2 FOR UPDATE', [id, course])).rows[0]; return r ? invitationRow(r) : null; }
    async hasUnfinishedFlow(s: TransactionScope, id: string, now: number) { return (await this.tx.client(s).query("SELECT id FROM course_enrollment.invitation_flow WHERE invitation_id=$1 AND status='REGISTERED' AND grace_ends_at>$2", [id, new Date(now)])).rowCount !== 0; }
    async invitations(s: TransactionScope, course: string) { return (await this.tx.client(s).query('SELECT * FROM course_enrollment.course_invitation WHERE course_id=$1 ORDER BY id', [course])).rows.map(invitationRow); }
    async saveInvitation(s: TransactionScope, v: Invitation) { await this.tx.client(s).query(`INSERT INTO course_enrollment.course_invitation(id,course_id,code_digest,display_suffix,expires_at,created_at,version) VALUES($1,$2,$3,$4,$5,$6,$7)`, [v.id, v.courseId, v.codeDigest, v.displaySuffix, new Date(v.expiresAt), new Date(v.createdAt), v.version]); }
    async revokeInvitation(s: TransactionScope, id: string) { await this.tx.client(s).query('UPDATE course_enrollment.course_invitation SET revoked=true,version=version+1 WHERE id=$1', [id]); await this.tx.client(s).query("UPDATE course_enrollment.invitation_flow SET status='TERMINATED',version=version+1 WHERE invitation_id=$1 AND status='REGISTERED'", [id]); }
    async terminateFlows(s: TransactionScope, course: string) { await this.tx.client(s).query(`UPDATE course_enrollment.invitation_flow SET status='TERMINATED',version=version+1 WHERE status='REGISTERED' AND invitation_id IN (SELECT id FROM course_enrollment.course_invitation WHERE course_id=$1)`, [course]); }
    async flow(s: TransactionScope, id: string, lock = true) {
        const client = this.tx.client(s);
        const result = lock ? await client.query('SELECT * FROM course_enrollment.invitation_flow WHERE id=$1 FOR UPDATE', [id])
            : await client.query('SELECT * FROM course_enrollment.invitation_flow WHERE id=$1', [id]);
        return result.rows[0] ? flowRow(result.rows[0]) : null;
    }
    async existingFlow(s: TransactionScope, invitation: string, subject: string) { const r = (await this.tx.client(s).query('SELECT * FROM course_enrollment.invitation_flow WHERE invitation_id=$1 AND subject=$2 FOR UPDATE', [invitation, subject])).rows[0]; return r ? flowRow(r) : null; }
    async saveFlow(s: TransactionScope, f: InvitationFlow) { await this.tx.client(s).query(`INSERT INTO course_enrollment.invitation_flow(id,invitation_id,subject,authorization_digest,student_subject_id,registered_at,original_expires_at,grace_ends_at,status,version) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [f.id, f.invitationId, f.subject, f.authorizationDigest, f.studentSubjectId, new Date(f.registeredAt), new Date(f.originalExpiresAt), new Date(f.graceEndsAt), f.status, f.version]); }
    async completeFlow(s: TransactionScope, id: string, subject: string) { await this.tx.client(s).query("UPDATE course_enrollment.invitation_flow SET status='COMPLETED',student_subject_id=$2,version=version+1 WHERE id=$1", [id, subject]); }
    async enrollments(s: TransactionScope, course: string) { return (await this.tx.client(s).query('SELECT * FROM course_enrollment.enrollment WHERE course_id=$1 ORDER BY id', [course])).rows.map(enrollmentRow); }
    async activeEnrollment(s: TransactionScope, org: string, semester: string, subject: string) { const r = (await this.tx.client(s).query("SELECT * FROM course_enrollment.enrollment WHERE organization_id=$1 AND semester_id=$2 AND student_subject_id=$3 AND status='ACTIVE'", [org, semester, subject])).rows[0]; return r ? enrollmentRow(r) : null; }
    async saveEnrollment(s: TransactionScope, e: Enrollment, event: string, actor: string, now: number) { await this.tx.client(s).query(`INSERT INTO course_enrollment.enrollment(id,organization_id,semester_id,course_id,student_subject_id,status,joined_at,removed_at,student_visible_reason,version) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [e.id, e.organizationId, e.semesterId, e.courseId, e.studentSubjectId, e.status, new Date(e.joinedAt), e.removedAt === null ? null : new Date(e.removedAt), e.studentVisibleReason, e.version]); await this.event(s, e, event, actor, now, null); }
    async updateEnrollment(s: TransactionScope, e: Enrollment, event: string, actor: string, now: number) { await this.tx.client(s).query(`UPDATE course_enrollment.enrollment SET status=$2,removed_at=$3,student_visible_reason=$4,version=$5 WHERE id=$1`, [e.id, e.status, e.removedAt === null ? null : new Date(e.removedAt), e.studentVisibleReason, e.version]); await this.event(s, e, event, actor, now, e.status === 'ACTIVE' ? 'REMOVED' : 'ACTIVE'); }
    private async event(s: TransactionScope, e: Enrollment, event: string, actor: string, now: number, from: string | null) { await this.tx.client(s).query(`INSERT INTO course_enrollment.enrollment_event(id,enrollment_id,sequence_no,from_status,to_status,actor_subject_id,student_visible_reason,occurred_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, [event, e.id, e.version + 1, from, e.status, actor, e.studentVisibleReason, new Date(now)]); }
    async savePlan(s: TransactionScope, p: PlanEvidence) { await this.tx.client(s).query(`INSERT INTO course_enrollment.publication_plan(id,course_id,draft_version,semester_version,calendar_version,template_id,result,proof_kind,witness,token_digest,computed_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [p.id, p.courseId, p.draftVersion, p.semesterVersion, p.calendarVersion, p.templateId, p.result, p.proofKind, JSON.stringify(p.witness), p.tokenDigest, new Date(p.computedAt)]); }
    async plan(s: TransactionScope, digest: string): Promise<PlanEvidence | null> { const r = (await this.tx.client(s).query('SELECT * FROM course_enrollment.publication_plan WHERE token_digest=$1 FOR UPDATE', [digest])).rows[0]; return r ? { id: r.id, courseId: r.course_id, draftVersion: Number(r.draft_version), semesterVersion: Number(r.semester_version), calendarVersion: r.calendar_version, templateId: r.template_id, result: r.result, proofKind: r.proof_kind, witness: r.witness, tokenDigest: r.token_digest, computedAt: r.computed_at.getTime() } : null; }
    async saveImpact(s: TransactionScope, v: Impact) { await this.tx.client(s).query(`INSERT INTO course_enrollment.change_impact(token_digest,course_id,actor_subject_id,expected_version,name,description,expires_at,membership_digest) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, [v.tokenDigest, v.courseId, v.actorSubjectId, v.expectedVersion, v.name, v.description, new Date(v.expiresAt), v.membershipDigest]); }
    async impact(s: TransactionScope, digest: string): Promise<Impact | null> { const r = (await this.tx.client(s).query('SELECT * FROM course_enrollment.change_impact WHERE token_digest=$1 FOR UPDATE', [digest])).rows[0]; return r ? { tokenDigest: r.token_digest, courseId: r.course_id, actorSubjectId: r.actor_subject_id, expectedVersion: Number(r.expected_version), name: r.name, description: r.description, expiresAt: r.expires_at.getTime(), membershipDigest: r.membership_digest } : null; }
    async saveClosure(s: TransactionScope, course: string, actor: string, reason: string, now: number) { await this.tx.client(s).query('INSERT INTO course_enrollment.course_closure(course_id,actor_subject_id,reason,closed_at) VALUES($1,$2,$3,$4)', [course, actor, reason, new Date(now)]); }
    async saveMakeup(s: TransactionScope, v: Makeup) { await this.tx.client(s).query('INSERT INTO course_enrollment.makeup_authorization(id,course_id,enrollment_id,rule_version_id,starts_at,ends_at,authorized_at,actor_subject_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8)', [v.id, v.courseId, v.enrollmentId, v.ruleVersionId, new Date(v.startsAt), new Date(v.endsAtExclusive), new Date(v.authorizedAt), v.actorSubjectId]); }
    async makeups(s: TransactionScope, course: string, enrollment: string | null): Promise<Makeup[]> { return (await this.tx.client(s).query('SELECT * FROM course_enrollment.makeup_authorization WHERE course_id=$1 AND ($2::uuid IS NULL OR enrollment_id=$2) ORDER BY id', [course, enrollment])).rows.map(r => ({ id: r.id, courseId: r.course_id, enrollmentId: r.enrollment_id, ruleVersionId: r.rule_version_id, startsAt: r.starts_at.getTime(), endsAtExclusive: r.ends_at.getTime(), authorizedAt: r.authorized_at.getTime(), actorSubjectId: r.actor_subject_id })); }
    async exactMakeup(s: TransactionScope, id: string, courseId: string, enrollmentId: string, ruleVersionId: string): Promise<Makeup | null> {
        const r = (await this.tx.client(s).query(`SELECT * FROM course_enrollment.makeup_authorization
            WHERE id=$1 AND course_id=$2 AND enrollment_id=$3 AND rule_version_id=$4 FOR SHARE`, [id, courseId, enrollmentId, ruleVersionId])).rows[0];
        if (!r)
            return null;
        const grant = { id: r.id, courseId: r.course_id, enrollmentId: r.enrollment_id, ruleVersionId: r.rule_version_id, startsAt: r.starts_at.getTime(), endsAtExclusive: r.ends_at.getTime(), authorizedAt: r.authorized_at.getTime(), actorSubjectId: r.actor_subject_id };
        if (![grant.startsAt, grant.endsAtExclusive, grant.authorizedAt].every(Number.isSafeInteger) || grant.startsAt >= grant.endsAtExclusive)
            throw new Error('PERSISTENCE_INVARIANT_BROKEN');
        return grant;
    }
    async hasMakeup(s: TransactionScope, course: string, enrollment: string, now: number) { return (await this.tx.client(s).query('SELECT id FROM course_enrollment.makeup_authorization WHERE course_id=$1 AND enrollment_id=$2 AND starts_at<=$3 AND ends_at>$3 FOR SHARE', [course, enrollment, new Date(now)])).rowCount !== 0; }
    async publishedTemplates(s: TransactionScope, org: string) { return (await this.tx.client(s).query('SELECT * FROM course_enrollment.rule_template_version WHERE organization_id=$1 ORDER BY version_no', [org])).rows.map(r => ({ templateVersionId: r.id as string, versionNo: Number(r.version_no), label: { zh: r.label_zh as string, en: r.label_en as string }, publishedAt: r.published_at.getTime() as number })); }
    async publishTemplate(s: TransactionScope, org: string, t: Template) { await this.tx.client(s).query('INSERT INTO course_enrollment.rule_template_version(id,organization_id,version_no,label_zh,label_en,published_at) VALUES($1,$2,$3,$4,$5,$6)', [t.templateVersionId, org, t.versionNo, t.label.zh, t.label.en, new Date(t.publishedAt)]); }
    async semesterCounts(s: TransactionScope, org: string, ids: readonly string[]) {
        return (await this.tx.client(s).query(`SELECT c.semester_id,count(DISTINCT c.id)::integer AS courses,count(DISTINCT e.student_subject_id)::integer AS students
      FROM course_enrollment.course c LEFT JOIN course_enrollment.enrollment e ON e.course_id=c.id
      WHERE c.organization_id=$1 AND c.semester_id=ANY($2::uuid[]) GROUP BY c.semester_id`, [org, ids])).rows.map(r => ({ semesterId: r.semester_id as string, courseCount: r.courses as number, studentCount: r.students as number }));
    }
    async semesterCourses(s: TransactionScope, org: string, id: string, lock: boolean) {
        const result = lock ? await this.tx.client(s).query('SELECT * FROM course_enrollment.course WHERE organization_id=$1 AND semester_id=$2 ORDER BY id FOR UPDATE', [org, id]) : await this.tx.client(s).query('SELECT * FROM course_enrollment.course WHERE organization_id=$1 AND semester_id=$2 ORDER BY id', [org, id]);
        return result.rows.map(courseRow);
    }
    async eraseIdentityReplays(s: TransactionScope, org: string, subject: string) {
        await this.tx.client(s).query('DELETE FROM course_enrollment.command_replay WHERE subject=$1', [subject]);
        await this.tx.client(s).query(`DELETE FROM course_enrollment.command_replay WHERE subject IN
          (SELECT f.subject FROM course_enrollment.invitation_flow f JOIN course_enrollment.course_invitation i ON i.id=f.invitation_id
           JOIN course_enrollment.course c ON c.id=i.course_id WHERE f.student_subject_id=$1 AND c.organization_id=$2)`, [subject, org]);
        await this.tx.client(s).query("UPDATE course_enrollment.invitation_flow SET authorization_digest=NULL WHERE student_subject_id=$1", [subject]);
    }
    async reserve(s: TransactionScope, subject: string, operation: string, key: string, fingerprint: string) { const c = this.tx.client(s); await c.query('INSERT INTO course_enrollment.command_replay(subject,operation,key_digest,fingerprint) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING', [subject, operation, key, fingerprint]); const r = (await c.query('SELECT fingerprint,sealed_result FROM course_enrollment.command_replay WHERE subject=$1 AND operation=$2 AND key_digest=$3 FOR UPDATE', [subject, operation, key])).rows[0]; return { fingerprint: r.fingerprint, result: r.sealed_result as string | null }; }
    async finish(s: TransactionScope, subject: string, operation: string, key: string, result: string) { await this.tx.client(s).query('UPDATE course_enrollment.command_replay SET sealed_result=$4 WHERE subject=$1 AND operation=$2 AND key_digest=$3', [subject, operation, key, result]); }
}
