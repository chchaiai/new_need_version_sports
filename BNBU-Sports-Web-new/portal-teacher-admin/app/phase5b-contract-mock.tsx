"use client";

import { useSyncExternalStore } from "react";
import styles from "./phase5b-contract-mock.module.css";
import {
  activeExerciseSession,
  activeStudentDashboard,
  applicationImageAllocation,
  expiredMediaResult,
  idleSessionError,
  invalidInvitationError,
  invitationPreviews,
  mediaDependencyError,
  pendingStudentDashboard,
  readCertificationKind,
  recordImageAllocation,
  recordVideoAllocation,
  rejectedMediaResult,
  schoolTeamCertificationApplication,
  schoolTeamCertificationRequest,
  sessionAuthenticationError,
  sessionDependencyError,
  sessionMaintenanceError,
  studentClubCertificationApplication,
  studentClubCertificationRequest,
  verifiedMediaResult,
} from "../../frontend/student/phase5b-contract-fixtures";
import {
  PHASE5B_CONTRACT,
  adminCurrentCourseDirectory,
  adminDashboard,
  adminLoginRequest,
  adminLoginResponse,
  appendReviewRequest,
  appendReviewResponse,
  courseProgressPage,
  currentCourse,
  dependencyError,
  emptyAdminCurrentCourseDirectory,
  emptyAdminDashboard,
  emptyCourseProgressPage,
  emptyExerciseRecordPage,
  emptyTeacherCoursePage,
  exerciseRecord,
  exerciseRecordPage,
  loginError,
  teacherCoursePage,
  teacherLoginRequest,
  teacherLoginResponse,
} from "./phase5b-contract-fixtures";
import {
  createCourseVersionConflictError,
  emptyFeedbackPage,
  emptyHelpArticlePage,
  emptySubAdminPage,
  emptyTeacherInvitationPage,
  feedbackPage,
  helpArticlePage,
  invitationVersionConflictError,
  semesterNotCurrentError,
  semesterPageWithCurrent,
  semesterPageWithoutCurrent,
  subAdminPage,
  rosterUploadAllocation,
  rosterXlsxUploadAllocation,
  teacherDashboardWithCurrent,
  teacherDashboardWithoutCurrent,
  teacherInvitationPage,
  unknownSemesterError,
} from "./phase5b-contract-revalidation-fixtures";
import {
  ADMIN_GATED_OPERATION_IDS,
  GATE_SAFE_OPERATION_IDS,
  accountDisabledChangeError,
  accountDisabledResetError,
  adminGateRecovery,
  changeOwnPasswordSessionOutcome,
  createSubAdminRequest,
  createdSubAdminFirstActor,
  firstPasswordChangeRequiredError,
  resetPasswordSessionOutcome,
  teacherGateRecovery,
  updateSubAdminRequest,
} from "./phase5gb-contract-fixtures";

export type Phase5bMockRole = "student" | "teacher" | "admin";
export type Phase5bMockScenario = "content" | "empty" | "error";

const roleLabels: Record<Phase5bMockRole, string> = {
  student: "学生 CR 闭环",
  teacher: "教师核心闭环",
  admin: "管理员只读闭环",
};

const scenarioLabels: Record<Phase5bMockScenario, string> = {
  content: "内容状态",
  empty: "空状态",
  error: "错误状态",
};

function isRole(value: string | null): value is Phase5bMockRole {
  return value === "student" || value === "teacher" || value === "admin";
}

function isScenario(value: string | null): value is Phase5bMockScenario {
  return value === "content" || value === "empty" || value === "error";
}

function subscribeToLocation() {
  return () => undefined;
}

function readClientSearch() {
  return window.location.search;
}

function readServerSearch() {
  return "";
}

function formatInstant(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Shanghai",
  }).format(new Date(value));
}

function formatMinutes(value: number) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return minutes === 0 ? `${hours} 小时` : `${hours} 小时 ${minutes} 分钟`;
}

function healthTone(status: "UP" | "DOWN" | "NOT_CONFIGURED"): "green" | "red" | "gray" {
  if (status === "UP") return "green";
  if (status === "DOWN") return "red";
  return "gray";
}

function ContractBadge({ children, tone = "blue" }: { children: React.ReactNode; tone?: "blue" | "green" | "amber" | "red" | "gray" }) {
  return <span className={`${styles.badge} ${styles[tone]}`}>{children}</span>;
}

function ContractCard({ title, operation, children }: { title: string; operation: string; children: React.ReactNode }) {
  return (
    <section className={styles.card}>
      <header className={styles.cardHeader}>
        <div>
          <p className={styles.eyebrow}>operationId</p>
          <code>{operation}</code>
        </div>
        <h2>{title}</h2>
      </header>
      {children}
    </section>
  );
}

function ContractError({
  title,
  error = dependencyError,
}: {
  title: string;
  error?: { readonly code: string; readonly message: string; readonly requestId: string; readonly details: unknown };
}) {
  return (
    <div className={styles.errorState} role="alert">
      <ContractBadge tone="red">{error.code}</ContractBadge>
      <div>
        <strong>{title}</strong>
        <p>{error.message}</p>
        <small>requestId: {error.requestId}</small>
      </div>
    </div>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className={styles.emptyState} role="status">
      <span aria-hidden="true">○</span>
      <strong>{title}</strong>
      <p>{detail}</p>
    </div>
  );
}

const certificationValidationError = {
  code: "VALIDATION_FAILED",
  message: "certificationKind 缺失、null、未知值或私有 subtype 均被拒绝。",
  requestId: "req_phase5gb_certification_invalid",
  details: null,
} as const;

function StudentAffectedContractMock({ scenario }: { scenario: Phase5bMockScenario }) {
  if (scenario === "error") {
    return (
      <ContractCard title="CertificationKind 非法输入 fail closed" operation="createStudentApplication">
        <ContractError title="不根据组织名称或旧 subtype 推断" error={certificationValidationError} />
      </ContractCard>
    );
  }
  if (scenario === "empty") {
    return (
      <ContractCard title="CertificationKind 必填且不可为 null" operation="createStudentApplication">
        <EmptyState title="缺少认证类型，禁止提交" detail="SCHOOL_TEAM 与 STUDENT_CLUB 是唯一合法值；没有默认值或名称推断。" />
      </ContractCard>
    );
  }
  const pairs = [
    [schoolTeamCertificationRequest, schoolTeamCertificationApplication],
    [studentClubCertificationRequest, studentClubCertificationApplication],
  ] as const;
  return (
    <ContractCard title="学生认证类型选择与详情回显" operation="createStudentApplication / listOwnApplications / getOwnApplication">
      <div className={styles.summaryStrip}>
        {pairs.map(([request, response]) => (
          <div key={request.certification.certificationKind}>
            <span>选择 / JSON / 回显</span>
            <strong>{request.certification.certificationKind}</strong>
            <small>{readCertificationKind(response)} · {response.certification?.organizationOrTeamName}</small>
          </div>
        ))}
      </div>
      <p className={styles.boundaryNote}>request.certificationKind 原样进入 StudentApplication response；不读取 organizationName、teamName 或 applicationSubtype 猜测类型。</p>
    </ContractCard>
  );
}

function TeacherAffectedContractMock({ scenario }: { scenario: Phase5bMockScenario }) {
  if (scenario === "empty") {
    return (
      <ContractCard title="教师首次改密门禁" operation="createPasswordSession / refreshSession / getCurrentActor">
        <div className={styles.metricGrid}>
          <div><span>login</span><strong>{String(teacherGateRecovery.login.actor.mustChangePassword)}</strong></div>
          <div><span>refresh</span><strong>{String(teacherGateRecovery.refresh.actor.mustChangePassword)}</strong></div>
          <div><span>/me + 页面刷新</span><strong>{String(teacherGateRecovery.pageReload.mustChangePassword)}</strong></div>
        </div>
        <p className={styles.boundaryNote}>门禁状态来自 Contract actor，可在刷新和新 session 恢复；只开放本人改密、退出及 Contract gate-safe operation。</p>
      </ContractCard>
    );
  }
  if (scenario === "error") {
    return (
      <ContractCard title="教师密码错误语义" operation="changeOwnPassword / resetPassword">
        <div className={styles.reviewGrid}>
          <ContractError title="停用账号本人改密" error={accountDisabledChangeError} />
          <ContractError title="停用账号本人重置" error={accountDisabledResetError} />
        </div>
      </ContractCard>
    );
  }
  return (
    <>
      <ContractCard title="教师申请列表、详情与决定显示认证类型" operation="listCourseApplications / getCourseApplication / decideStudentApplication">
        <div className={styles.summaryStrip}>
          {[schoolTeamCertificationApplication, studentClubCertificationApplication].map((application) => (
            <div key={application.applicationId}>
              <span>{application.applicationNumber}</span>
              <strong>{readCertificationKind(application)}</strong>
              <small>{application.certification?.organizationOrTeamName}</small>
            </div>
          ))}
        </div>
        <p className={styles.boundaryNote}>列表、详情和审核决定直接显示 certificationKind；不让 UI 根据组织名称猜分类。</p>
      </ContractCard>
      <ContractCard title="教师本人改密清除 gate" operation="changeOwnPassword">
        <div className={styles.metricGrid}>
          <div><span>mustChangePassword</span><strong>true → {String(changeOwnPasswordSessionOutcome.actor.mustChangePassword)}</strong></div>
          <div><span>当前 session</span><strong>{changeOwnPasswordSessionOutcome.currentSession}</strong></div>
          <div><span>其他 session</span><strong>{changeOwnPasswordSessionOutcome.otherSessions}</strong></div>
        </div>
      </ContractCard>
    </>
  );
}

function AdminAffectedContractMock({ scenario }: { scenario: Phase5bMockScenario }) {
  if (scenario === "empty") {
    return (
      <ContractCard title="管理员首次改密 gate 与恢复白名单" operation="45 gated / 10 gate-safe operationIds">
        <div className={styles.metricGrid}>
          <div><span>login / refresh / /me</span><strong>{String(adminGateRecovery.me.mustChangePassword)}</strong></div>
          <div><span>正常业务受 gate</span><strong>{ADMIN_GATED_OPERATION_IDS.length}/45</strong></div>
          <div><span>gate-safe 可访问</span><strong>{GATE_SAFE_OPERATION_IDS.length}/10</strong></div>
        </div>
        <p className={styles.boundaryNote}>页面刷新与新 session 均从 CurrentActor 恢复 gate；范围严格来自 Contract operationId 清单。</p>
      </ContractCard>
    );
  }
  if (scenario === "error") {
    return (
      <ContractCard title="管理员 gate 阻止正常业务" operation="getAdminDashboard / changeOwnPassword / resetPassword">
        <div className={styles.reviewGrid}>
          <ContractError title="正常 Admin operation 返回 403" error={firstPasswordChangeRequiredError} />
          <ContractError title="停用账号不得借 reset 恢复" error={accountDisabledResetError} />
        </div>
      </ContractCard>
    );
  }
  return (
    <>
      <ContractCard title="创建分管理员使用临时凭据" operation="createSubAdmin">
        <div className={styles.metricGrid}>
          <div><span>初始凭据</span><strong>temporary</strong></div>
          <div><span>新 actor gate</span><strong>mustChangePassword={String(createdSubAdminFirstActor.mustChangePassword)}</strong></div>
          <div><span>权限</span><strong>{createSubAdminRequest.permissions.length}</strong></div>
        </div>
      </ContractCard>
      <ContractCard title="编辑分管理员不含密码字段" operation="updateSubAdmin">
        <div className={styles.summaryStrip}>
          <div><span>UpdateSubAdminRequest keys</span><strong>{Object.keys(updateSubAdminRequest).length}</strong><small>{Object.keys(updateSubAdminRequest).join(" · ")}</small></div>
        </div>
        <p className={styles.boundaryNote}>普通编辑只发送资料、权限和 expectedVersion；本人密码只允许本人改密或邮箱自助重置。</p>
      </ContractCard>
      <ContractCard title="管理员 self reset 状态" operation="resetPassword">
        <div className={styles.metricGrid}>
          <div><span>旧 session</span><strong>{resetPasswordSessionOutcome.allOldSessions}</strong></div>
          <div><span>自动登录</span><strong>{String(resetPasswordSessionOutcome.issuedSession !== null)}</strong></div>
          <div><span>后续 /me gate</span><strong>{String(resetPasswordSessionOutcome.actorAtNextAuthenticatedRead.mustChangePassword)}</strong></div>
        </div>
      </ContractCard>
    </>
  );
}

function StudentMock({ scenario }: { scenario: Phase5bMockScenario }) {
  if (scenario === "error") {
    return (
      <>
        <StudentAffectedContractMock scenario={scenario} />
        <ContractCard title="Session 错误不得伪装 Idle" operation="getOwnActiveExerciseSession">
          <div className={styles.reviewGrid}>
            {[sessionAuthenticationError, sessionMaintenanceError, sessionDependencyError].map((error) => (
              <ContractError key={error.requestId} title="保留真实错误" error={error} />
            ))}
          </div>
        </ContractCard>
        <ContractCard title="未知邀请与媒体依赖错误" operation="previewCourseInvitation / finalizeMediaAsset">
          <div className={styles.reviewGrid}>
            <ContractError title="未知或畸形邀请码使用 422" error={invalidInvitationError} />
            <ContractError title="依赖失败保持 ErrorEnvelope" error={mediaDependencyError} />
          </div>
        </ContractCard>
      </>
    );
  }

  if (scenario === "empty") {
    return (
      <>
        <StudentAffectedContractMock scenario={scenario} />
        <ContractCard title="无活动 Session 的合法 Idle" operation="getOwnActiveExerciseSession">
          <EmptyState title={`404 ${idleSessionError.code}`} detail="只有 404 + RESOURCE_NOT_FOUND 映射为 Idle；随后可以严格执行 startExerciseSession。" />
        </ContractCard>
        <ContractCard title="PENDING 学生稳定本人资料" operation="getStudentDashboard">
          <div className={styles.metricGrid}>
            <div><span>学生状态</span><strong>{pendingStudentDashboard.studentStatus}</strong></div>
            <div><span>姓名 / 学号</span><strong>{pendingStudentDashboard.student.name} / {pendingStudentDashboard.student.studentNumber}</strong></div>
            <div><span>course / progress</span><strong>{String(pendingStudentDashboard.course)} / {String(pendingStudentDashboard.progress)}</strong></div>
          </div>
          <p className={styles.boundaryNote}>课程和进度为空时，required StudentSummary 仍完整存在；不从注册输入、缓存或旧 profile DTO 补造。</p>
        </ContractCard>
      </>
    );
  }

  return (
    <>
      <StudentAffectedContractMock scenario={scenario} />
      <ContractCard title="活动 Session 与 ACTIVE Dashboard" operation="getOwnActiveExerciseSession / getStudentDashboard">
        <div className={styles.metricGrid}>
          <div><span>Session</span><strong>{activeExerciseSession.status}</strong></div>
          <div><span>学生状态</span><strong>{activeStudentDashboard.studentStatus}</strong></div>
          <div><span>本人资料</span><strong>{activeStudentDashboard.student.name} · {activeStudentDashboard.student.studentNumber}</strong></div>
        </div>
      </ContractCard>
      <ContractCard title="邀请五种已识别内容态" operation="previewCourseInvitation">
        <div className={styles.summaryStrip}>
          {invitationPreviews.map((preview) => <ContractBadge key={preview.status} tone={preview.status === "ACTIVE" ? "green" : "amber"}>{preview.status}</ContractBadge>)}
        </div>
        <p className={styles.boundaryNote}>扫码与手输使用同一 projection；五种已识别状态均为 200，且 course/expiresAt 非空。</p>
      </ContractCard>
      <ContractCard title="三类直传与唯一媒体终态" operation="allocateMediaAsset / finalizeMediaAsset">
        <div className={styles.metricGrid}>
          {[recordImageAllocation, recordVideoAllocation, applicationImageAllocation].map((allocation) => (
            <div key={allocation.mediaAssetId}><span>{allocation.purpose}</span><strong>{allocation.uploadMethod}</strong><small>{Object.keys(allocation.requiredHeaders).join(" + ")}</small></div>
          ))}
        </div>
        <div className={styles.summaryStrip}>
          {[verifiedMediaResult, rejectedMediaResult, expiredMediaResult].map((result) => (
            <div key={result.mediaAssetId}><span>200 MediaFinalizationResult</span><strong>{result.status}</strong><small>{result.rejectionCode ?? "rejectionCode=null"}</small></div>
          ))}
        </div>
      </ContractCard>
    </>
  );
}

function TeacherRevalidationMock({ scenario }: { scenario: Phase5bMockScenario }) {
  const invitations = scenario === "empty" ? emptyTeacherInvitationPage : teacherInvitationPage;
  const dashboard = scenario === "empty" ? teacherDashboardWithoutCurrent : teacherDashboardWithCurrent;

  return (
    <>
      <ContractCard title="教师邀请管理恢复" operation="listCourseInvitations / revokeCourseInvitation">
        {scenario === "error" ? <ContractError title="撤销并发冲突保留最新事实" error={invitationVersionConflictError} /> : invitations.items.length === 0 ? (
          <EmptyState title="暂无可管理邀请" detail="CourseInvitationPage.items=[]；不读取或持久化 raw code/digest。" />
        ) : (
          <div className={styles.summaryStrip}>
            {invitations.items.map((item) => <div key={item.invitationId}><span>{item.displaySuffix}</span><strong>{item.status}</strong><small>v{item.version} · revocable={String(item.revocable)}</small></div>)}
          </div>
        )}
      </ContractCard>
      <ContractCard title="教师 current / no-current" operation="getTeacherDashboard / getCurrentSemester">
        {scenario === "error" ? <ContractError title="依赖故障不得伪装无当前学期" /> : (
          <div className={styles.metricGrid}>
            <div><span>当前学期</span><strong>{dashboard.currentSemester?.displayName ?? "null"}</strong></div>
            <div><span>当前课程</span><strong>{dashboard.openCourseCount}</strong></div>
            <div><span>当前成员</span><strong>{dashboard.memberCount}</strong></div>
          </div>
        )}
      </ContractCard>
      <ContractCard title="名单 CSV / XLSX 直传" operation="allocateRosterImport">
        {scenario === "error" ? <ContractError title="allocation 失败不得开始 PUT 或伪造导入成功" /> : (
          <div className={styles.summaryStrip}>
            {[rosterUploadAllocation, rosterXlsxUploadAllocation].map((allocation) => (
              <div key={allocation.allocationId}><span>{allocation.requiredHeaders["content-type"]}</span><strong>{allocation.uploadMethod}</strong><small>exact requiredHeaders + byte body</small></div>
            ))}
          </div>
        )}
      </ContractCard>
      <ContractCard title="创建课程学期错误语义" operation="createCourse">
        {scenario === "content" ? (
          <div className={styles.summaryStrip}><div><span>CURRENT</span><strong>201 Course</strong><small>{currentCourse.name}</small></div></div>
        ) : scenario === "empty" ? (
          <ContractError title="无 CURRENT 返回 409" error={semesterNotCurrentError} />
        ) : (
          <div className={styles.reviewGrid}>
            <ContractError title="未知 semesterId 返回 404" error={unknownSemesterError} />
            <ContractError title="并发切换不产生假成功" error={createCourseVersionConflictError} />
          </div>
        )}
      </ContractCard>
    </>
  );
}

function AdminRevalidationMock({ scenario }: { scenario: Phase5bMockScenario }) {
  const semesters = scenario === "empty" ? semesterPageWithoutCurrent : semesterPageWithCurrent;
  const feedback = scenario === "empty" ? emptyFeedbackPage : feedbackPage;
  const help = scenario === "empty" ? emptyHelpArticlePage : helpArticlePage;
  const subAdmins = scenario === "empty" ? emptySubAdminPage : subAdminPage;

  if (scenario === "error") {
    return (
      <ContractCard title="四类 summary 加载失败" operation="listSemesters / listFeedbackForAdmin / listHelpArticlesForAdmin / listSubAdmins">
        <ContractError title="依赖错误保持 ErrorEnvelope，不回退为全零 summary" />
      </ContractCard>
    );
  }

  return (
    <ContractCard title="四类同快照全局 summary" operation="listSemesters / listFeedbackForAdmin / listHelpArticlesForAdmin / listSubAdmins">
      <div className={styles.metricGrid}>
        <div><span>Semester</span><strong>{semesters.summary.currentSemester?.displayName ?? "无 current"}</strong><small>UPCOMING {semesters.summary.upcomingCount} · ARCHIVED {semesters.summary.archivedCount}</small></div>
        <div><span>Feedback</span><strong>{feedback.summary.totalCount}</strong><small>pending {feedback.summary.pendingCount} · waiting-tech {feedback.summary.waitingTechCount} · completed {feedback.summary.completedCount}</small></div>
        <div><span>Help</span><strong>{help.summary.publishedCount} / {help.summary.draftCount} / {help.summary.archivedCount}</strong><small>PUBLISHED / DRAFT / ARCHIVED</small></div>
        <div><span>Sub-admin</span><strong>{subAdmins.summary.totalCount} / {subAdmins.summary.activeCount}</strong><small>total / ACTIVE · permissions=8</small></div>
      </div>
      <p className={styles.boundaryNote}>搜索、分类、状态、cursor 与 limit 不缩小 summary；内容 mutation 后必须重新读取同一 Contract page。</p>
    </ContractCard>
  );
}

function LoginContract({ role, scenario }: { role: Phase5bMockRole; scenario: Phase5bMockScenario }) {
  const request = role === "teacher" ? teacherLoginRequest : adminLoginRequest;
  const response = role === "teacher" ? teacherLoginResponse : adminLoginResponse;

  return (
    <ContractCard title={role === "teacher" ? "教师密码登录" : "管理员密码登录"} operation="createPasswordSession">
      {scenario === "error" ? (
        <ContractError title="登录失败可以用统一错误结构表达" error={loginError} />
      ) : (
        <div className={styles.loginGrid}>
          <div>
            <span>RequestDTO</span>
            <strong>{request.loginType}</strong>
            <small>{request.identifier}</small>
          </div>
          <div>
            <span>201 SessionTokenPair</span>
            <strong>{response.actor.displayName}</strong>
            <small>{response.actor.role} · {response.actor.accountState}</small>
          </div>
          <p>Token 只进入安全会话边界，本预览不会把 token 渲染到页面。</p>
        </div>
      )}
    </ContractCard>
  );
}

function TeacherMock({ scenario }: { scenario: Phase5bMockScenario }) {
  const coursePage = scenario === "empty" ? emptyTeacherCoursePage : teacherCoursePage;
  const recordPage = scenario === "empty" ? emptyExerciseRecordPage : exerciseRecordPage;
  const progressPage = scenario === "empty" ? emptyCourseProgressPage : courseProgressPage;

  return (
    <>
      <TeacherAffectedContractMock scenario={scenario} />
      <LoginContract role="teacher" scenario={scenario} />

      <ContractCard title="本人课程管理入口" operation="listOwnCourses">
        {scenario === "error" ? (
          <ContractError title="课程列表加载失败" />
        ) : coursePage.items.length === 0 ? (
          <EmptyState title="暂无本人课程" detail="Contract 使用 CoursePage.items=[]，不合成课程，也不返回 null。" />
        ) : (
          <div className={styles.coursePanel}>
            {coursePage.items.map((course) => (
              <article key={course.courseId} className={styles.courseCard}>
                <div>
                  <ContractBadge tone="green">{course.displayStatus}</ContractBadge>
                  <ContractBadge tone="blue">{course.status}</ContractBadge>
                </div>
                <h3>{course.name}</h3>
                <p>{course.description}</p>
                <dl className={styles.definitionGrid}>
                  <div><dt>当前学期</dt><dd>{course.semester.displayName}</dd></div>
                  <div><dt>责任教师</dt><dd>{course.responsibleTeacher.name}</dd></div>
                  <div><dt>课程相关目标</dt><dd>{formatMinutes(course.targets.courseRelatedTargetMinutes)}</dd></div>
                  <div><dt>其他运动目标</dt><dd>{formatMinutes(course.targets.otherTargetMinutes)}</dd></div>
                  <div><dt>有效成员</dt><dd>{course.activeMemberCount}</dd></div>
                  <div><dt>入班开放</dt><dd>{course.joinOpen ? "是" : "否"}</dd></div>
                </dl>
              </article>
            ))}
          </div>
        )}
      </ContractCard>

      <ContractCard title="打卡复核列表与详情" operation="listCourseExerciseRecords / getCourseExerciseRecord">
        <p className={styles.boundaryNote}>正式 Record 提交即为 VALID；这里验证“复核列表”，不新增 PENDING/待审核业务状态。</p>
        {scenario === "error" ? (
          <ContractError title="打卡记录加载失败" />
        ) : recordPage.items.length === 0 ? (
          <EmptyState title="暂无打卡记录" detail="Contract 使用 ExerciseRecordPage.items=[]；空列表不是加载错误。" />
        ) : (
          <div className={styles.recordLayout}>
            <div className={styles.tableWrap}>
              <table>
                <thead><tr><th>学生</th><th>业务日期</th><th>实际时长</th><th>计入学时</th><th>当前结果</th></tr></thead>
                <tbody>
                  {recordPage.items.map((record) => (
                    <tr key={record.recordId}>
                      <td><strong>{record.student.name}</strong><small>{record.student.studentNumber}</small></td>
                      <td>{record.businessDate}</td>
                      <td>{Math.floor(record.actualDurationSeconds / 60)} 分钟</td>
                      <td>{record.creditedMinutes} 分钟</td>
                      <td><ContractBadge tone={record.currentReview.result === "VALID" ? "green" : "red"}>{record.currentReview.result}</ContractBadge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <aside className={styles.detailPanel}>
              <p className={styles.eyebrow}>ExerciseRecord</p>
              <h3>{exerciseRecord.student.name} · {exerciseRecord.category}</h3>
              <p>{exerciseRecord.description}</p>
              <dl>
                <div><dt>提交时间</dt><dd>{formatInstant(exerciseRecord.submittedAt)}</dd></div>
                <div><dt>媒体</dt><dd>{exerciseRecord.media.length} 项 · {exerciseRecord.media[0]?.mediaKind}</dd></div>
                <div><dt>公开原因</dt><dd>{exerciseRecord.currentReview.studentVisibleReason ?? "无"}</dd></div>
              </dl>
            </aside>
          </div>
        )}
      </ContractCard>

      <ContractCard title="追加审核操作" operation="appendExerciseRecordReview">
        {scenario === "error" ? (
          <ContractError title="审核提交失败，原结果保持不变" />
        ) : scenario === "empty" ? (
          <EmptyState title="没有可复核的 Record" detail="没有 Record 时不构造审核请求，也不显示 Fake Success。" />
        ) : (
          <div className={styles.reviewGrid}>
            <div>
              <p className={styles.eyebrow}>AppendRecordReviewRequest</p>
              <strong>{appendReviewRequest.result}</strong>
              <p>{appendReviewRequest.studentVisibleReason}</p>
              <small>expectedVersion: {appendReviewRequest.expectedVersion}</small>
            </div>
            <div>
              <p className={styles.eyebrow}>201 RecordReview</p>
              <strong>{appendReviewResponse.fromResult} → {appendReviewResponse.result}</strong>
              <p>序号 {appendReviewResponse.sequenceNumber} · {appendReviewResponse.actorType}</p>
              <small>{formatInstant(appendReviewResponse.occurredAt)}</small>
            </div>
          </div>
        )}
      </ContractCard>

      <ContractCard title="课程进度统计" operation="listCourseProgress">
        {scenario === "error" ? (
          <ContractError title="统计加载失败" />
        ) : progressPage.items.length === 0 ? (
          <EmptyState title="暂无成员进度" detail="Contract 使用 StudentCourseProgressPage.items=[]，不以 0% 假装存在学生。" />
        ) : (
          progressPage.items.map((progress) => (
            <div className={styles.progressPanel} key={progress.enrollmentId}>
              <div className={styles.progressHeading}>
                <div><strong>{progress.student.name}</strong><span>{progress.student.studentNumber}</span></div>
                <b>{progress.displayPercent}%</b>
              </div>
              <div className={styles.progressTrack}><span style={{ width: `${progress.displayPercent}%` }} /></div>
              <div className={styles.categoryGrid}>
                {progress.categories.map((category) => (
                  <div key={category.category}>
                    <span>{category.category}</span>
                    <strong>{formatMinutes(category.cappedCompletedMinutes)} / {formatMinutes(category.targetMinutes)}</strong>
                    <small>Record {category.validRecordMinutes} 分钟 · 认证 {category.activeCertificationMinutes} 分钟</small>
                  </div>
                ))}
              </div>
              <p className={styles.boundaryNote}>业务判断使用 totalCompletedMinutes={progress.totalCompletedMinutes}；displayPercent 只用于显示。</p>
            </div>
          ))
        )}
      </ContractCard>
      <TeacherRevalidationMock scenario={scenario} />
    </>
  );
}

function AdminMock({ scenario }: { scenario: Phase5bMockScenario }) {
  const dashboard = scenario === "empty" ? emptyAdminDashboard : adminDashboard;
  const directory = scenario === "empty" ? emptyAdminCurrentCourseDirectory : adminCurrentCourseDirectory;

  return (
    <>
      <AdminAffectedContractMock scenario={scenario} />
      <LoginContract role="admin" scenario={scenario} />

      <ContractCard title="管理员系统概览" operation="getAdminDashboard">
        {scenario === "error" ? (
          <ContractError title="系统概览加载失败" />
        ) : (
          <>
            <div className={styles.metricGrid}>
              <div><span>当前模式</span><strong>{dashboard.currentSystemMode.mode}</strong></div>
              <div><span>当前学期</span><strong>{dashboard.currentSemester?.displayName ?? "暂无"}</strong></div>
              <div><span>学生总数</span><strong>{dashboard.studentCount}</strong></div>
              <div><span>已进班学生</span><strong>{dashboard.activeStudentCount}</strong></div>
              <div><span>教师总数</span><strong>{dashboard.teacherCount}</strong></div>
              <div><span>耐力规则</span><strong>{dashboard.enduranceRuleCount}</strong></div>
            </div>
            <div className={styles.healthGrid}>
              {dashboard.health.map((item) => (
                <div key={item.component}>
                  <span>{item.component}</span>
                  <ContractBadge tone={healthTone(item.status)}>{item.status}</ContractBadge>
                  <small>{item.latencyMilliseconds === null ? "延迟不可用" : `${item.latencyMilliseconds} ms`}</small>
                </div>
              ))}
            </div>
          </>
        )}
      </ContractCard>

      <ContractCard title="当前课程只读目录" operation="listCurrentCoursesForAdmin">
        {scenario === "error" ? (
          <ContractError title="当前课程目录加载失败" />
        ) : directory.items.length === 0 ? (
          <EmptyState title="当前没有课程" detail="summary 三项为 0 且 items=[]；不能从历史或其他统计合成当前课程。" />
        ) : (
          <>
            <div className={styles.summaryStrip}>
              <div><span>当前课程</span><strong>{directory.summary.currentCourseCount}</strong></div>
              <div><span>有效学生去重</span><strong>{directory.summary.distinctActiveStudentCount}</strong></div>
              <div><span>责任教师去重</span><strong>{directory.summary.distinctResponsibleTeacherCount}</strong></div>
            </div>
            <div className={styles.tableWrap}>
              <table>
                <thead><tr><th>课程</th><th>责任教师</th><th>状态</th><th>Record</th><th>有效 / 无效</th><th>累计计入</th></tr></thead>
                <tbody>
                  {directory.items.map((item) => (
                    <tr key={item.course.courseId}>
                      <td><strong>{item.course.name}</strong><small>{item.course.semester.displayName}</small></td>
                      <td>{item.course.responsibleTeacher.name}</td>
                      <td><ContractBadge tone="green">{item.course.displayStatus}</ContractBadge></td>
                      <td>{item.metrics.recordCount}</td>
                      <td>{item.metrics.validRecordCount} / {item.metrics.invalidRecordCount}</td>
                      <td>{formatMinutes(item.metrics.totalCreditedMinutes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className={styles.boundaryNote}>AdminCurrentCourseItem 只提供目录级摘要；不开放成员、单条 Record 或媒体下钻。</p>
          </>
        )}
      </ContractCard>
      <AdminRevalidationMock scenario={scenario} />
    </>
  );
}

export function Phase5bContractMockView({ role, scenario }: { role: Phase5bMockRole; scenario: Phase5bMockScenario }) {
  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.kicker}>Phase 5B + 5G-B · Web · Development-only</p>
          <h1>核心与受影响 Contract Re-validation</h1>
          <p>验证当前 1.2 binding、CertificationKind 与密码生命周期；这里没有真实 Backend、权限、事务或并发。</p>
        </div>
        <div className={styles.contractMeta}>
          <ContractBadge tone="amber">{PHASE5B_CONTRACT.status}</ContractBadge>
          <strong>{PHASE5B_CONTRACT.version}</strong>
          <code>{PHASE5B_CONTRACT.openapiSha256.slice(0, 16)}…</code>
          <span>{PHASE5B_CONTRACT.publicBasePath}</span>
        </div>
      </header>

      <nav className={styles.controls} aria-label="Contract Mock 场景">
        <div>
          <span>角色</span>
          {(Object.keys(roleLabels) as Phase5bMockRole[]).map((item) => (
            <a key={item} aria-current={role === item ? "page" : undefined} className={role === item ? styles.activeControl : undefined} href={`?role=${item}&scenario=${scenario}`}>{roleLabels[item]}</a>
          ))}
        </div>
        <div>
          <span>响应</span>
          {(Object.keys(scenarioLabels) as Phase5bMockScenario[]).map((item) => (
            <a key={item} aria-current={scenario === item ? "page" : undefined} className={scenario === item ? styles.activeControl : undefined} href={`?role=${role}&scenario=${item}`}>{scenarioLabels[item]}</a>
          ))}
        </div>
      </nav>

      <section className={styles.statusLine} aria-label="当前验证状态">
        <ContractBadge tone={scenario === "error" ? "red" : scenario === "empty" ? "gray" : "green"}>{scenarioLabels[scenario]}</ContractBadge>
        <strong>{roleLabels[role]}</strong>
        <span>Validation fixture 严格由当前 1.2 RC 生成类型约束</span>
      </section>

      <div className={styles.cardStack}>
        {role === "student" ? <StudentMock scenario={scenario} /> : role === "teacher" ? <TeacherMock scenario={scenario} /> : <AdminMock scenario={scenario} />}
      </div>

      <footer className={styles.footer}>
        <strong>证据边界</strong>
        <p>数据库结论仅为 DESIGN-SUPPORTED；真实 PostgreSQL、migration、query plan、事务与并发均 NOT EXECUTED。Mock 通过不等于 Backend、鉴权、Staging 或发布通过。</p>
      </footer>
    </main>
  );
}

export function Phase5bContractMock() {
  const search = useSyncExternalStore(subscribeToLocation, readClientSearch, readServerSearch);
  const params = new URLSearchParams(search);
  const requestedRole = params.get("role");
  const requestedScenario = params.get("scenario");
  const role = isRole(requestedRole) ? requestedRole : "teacher";
  const scenario = isScenario(requestedScenario) ? requestedScenario : "content";

  return <Phase5bContractMockView role={role} scenario={scenario} />;
}
