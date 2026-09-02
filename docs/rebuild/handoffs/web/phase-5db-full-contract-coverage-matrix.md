# Phase 5D-B Web Full Contract Coverage Matrix

> 审查日期：2026-09-01
> 固定 Contract：`1.1.0-contract` / `RC` / `/api/v1`
> 固定 SHA-256：`1d538483f96b95d777cc4dd02526b78a214bd663e036ea5a6c77f43dfa38d99d`
> 审查性质：只读 Full Contract Surface Audit；本文只记录，不修改 Web、Contract、业务规则或 Backend。

## 1. 计数口径

“页面”按可独立到达、独立呈现加载/内容/空态/错误或独立承载一组用户动作的逻辑页面/面板计数；弹窗内部的字段级步骤不重复计页，Student 页面内的 Record 详情等内部状态也不重复计页。

| 口径 | 数量 | 说明 |
|---|---:|---|
| Student 当前逻辑页面/面板 | 30 | `frontend/student/js/screens` 的 32 个 exported render surface，扣除 2 个跨页 banner |
| Portal 教师/管理员共用页面 | 5 | 维护、会话恢复、密码登录、密码找回、本人账号/安全 |
| Teacher 当前业务页 | 5 | 课程、学生/名单、打卡、成绩、免测与认证 |
| Admin 当前业务页 | 10 | 概览、课程、学期、账号、分管理员、反馈、规则、系统模式、帮助、审计 |
| 当前唯一逻辑页面合计 | **50** | 当前源码存在 |
| 初版要求但当前缺失 | **3** | Teacher Dashboard、Teacher 通知中心、Admin 通知中心 |
| **全部 in-scope 唯一逻辑页面** | **53** | 50 当前 + 3 缺失 |
| 角色页面实例 | **58** | 53 + 5 个共用 Portal 页面分别计入 Teacher/Admin |

Contract-facing Use Case 按“角色 × operation 授权绑定”展开，以避免把同一个 operation 在 Student、Teacher、Admin 下的不同权限与资源范围混为一项：

| Use Case 口径 | 数量 |
|---|---:|
| 已映射的角色 × operation Use Case | **153** |
| 未映射 Use Case | **1** |
| **全部 Contract-facing Use Case** | **154** |
| 去重后的 OpenAPI operationId | **121** |
| 当前正式 Web runtime 已验证绑定到固定 1.1 Contract | **0 / 121** |

153 条已映射绑定由 OpenAPI 的 `x-roles` 直接计算：`ANONYMOUS 9 + STUDENT 42 + TEACHER 50 + ADMIN 52`。本地主题、语言、静态隐私/指南/About/Changelog、相机/文件选择、客户端弹窗和纯本地搜索不计入 Contract-facing Use Case，也不算“未映射”。

## 2. 映射状态定义

- **MAPPED / FORMAL-UNBOUND**：固定 Contract 已有足够 operation；当前正式 Web 仍走旧 Client/DTO，属于 `LEGACY_MIGRATION`。
- **LOCAL_ONLY**：纯客户端展示或交互，不应为它新增 Endpoint。
- **MISSING_UI**：Contract 已支持，但当前产品页/入口缺失，属于 `UI_PRODUCT_FINDING`。
- **STALE_UI**：当前页面仍表达已撤销/不存在的流程。
- **PENDING**：业务权威不足；不得先补字段、operation 或客户端私有规则。

## 3. Student 页面 / 用户操作 → Use Case → 边界 → operation

| ID | 页面/面板 | 当前实现 | 主要用户操作 / Use Case | 当前 Repository / API 边界 | 固定 Contract operation | 结论 |
|---|---|---|---|---|---|---|
| S01 | Startup Splash | PRESENT | 检查模式、版本策略、恢复会话、取得本人身份 | `app.js → api.js` 旧 Client | `getSystemMode`, `getAppReleasePolicy`, `refreshSession`, `getCurrentActor` | MAPPED / FORMAL-UNBOUND |
| S02 | Maintenance | PRESENT | 查看维护公告并重试状态 | `startup.js → api.js` | `getSystemMode` | MAPPED / FORMAL-UNBOUND |
| S03 | Privacy Policy | PRESENT | 阅读隐私文本 | 本地静态内容 | — | LOCAL_ONLY |
| S04 | Privacy Consent | PRESENT | 同意/拒绝本地隐私确认 | 本地状态 | — | LOCAL_ONLY |
| S05 | Pre-login Guide | PRESENT | 浏览登录前指南 | 本地静态内容 | — | LOCAL_ONLY |
| S06 | Post-enrollment Guide | PRESENT | 浏览入班后指南 | 本地静态内容 | — | LOCAL_ONLY |
| S07 | Login | PRESENT | 请求验证码、学生登录 | `login.js → api.js` 旧 auth DTO | `requestAuthChallenge`, `createStudentSession` | MAPPED / FORMAL-UNBOUND |
| S08 | Verification Login | PRESENT | 提交邮箱验证码 | `verification.js → api.js` | `requestAuthChallenge`, `createStudentSession` | MAPPED / FORMAL-UNBOUND |
| S09 | Recovery Request | PRESENT | 请求找回验证码、重置密码 | `recovery.js → api.js` | `requestAuthChallenge`, `resetPassword` | MAPPED / FORMAL-UNBOUND；见 NBD-02 |
| S10 | Contact Binding | PRESENT | 新用户验证注册入班；本人换绑已验证邮箱 | `binding.js → api.js` 旧 challenge DTO | `registerStudentAndJoinCourse`, `requestAuthChallenge`, `changeOwnVerifiedEmail` | MAPPED / FORMAL-UNBOUND |
| S11 | Activation Help | PRESENT | 查看激活帮助 | 当前本地帮助 | `listPublishedHelpArticles`, `getPublishedHelpArticle`（正式内容） | MAPPED / FORMAL-UNBOUND |
| S12 | Scan Join | PRESENT | 扫码/识别邀请码、预览 | 本地相机 + `join.js → api.js` | `previewCourseInvitation` | MAPPED / FORMAL-UNBOUND |
| S13 | Enter Invite Code | PRESENT | 手输邀请码、预览 | `join.js → api.js` | `previewCourseInvitation` | MAPPED / FORMAL-UNBOUND |
| S14 | Course Join Confirm | PRESENT | 已注册学生入班；新用户原子注册入班 | `join.js → api.js` | `joinCourseByInvitation`, `registerStudentAndJoinCourse` | MAPPED / FORMAL-UNBOUND |
| S15 | Join Request Status | PRESENT / STALE | 展示待教师审核、拒绝、补正和重提 | 本地旧状态 / 旧 DTO | — | STALE_UI；UI-01 |
| S16 | Student Dashboard | PRESENT | 查看本人、当前学期/课程、进度、耐力、最终成绩、未读数 | `dashboard.js → api.js` 多请求 fan-out | `getStudentDashboard` | MAPPED / FORMAL-UNBOUND |
| S17 | Notification Sheet | PRESENT | 列表、未读数、标记已读 | `notifications.js → api.js` | `listOwnNotifications`, `getOwnUnreadNotificationCount`, `markOwnNotificationRead` | MAPPED / FORMAL-UNBOUND |
| S18 | Courses | PRESENT | 查看当前唯一课程；从空态进入邀请码流程 | `courses.js → api.js` 旧 enrollments/sections fan-out | `getOwnCurrentCourse`, `previewCourseInvitation`, `joinCourseByInvitation` | MAPPED / FORMAL-UNBOUND |
| S19 | Check-in | PRESENT | 查询/开始/暂停/继续/结束 Session，上传媒体，原子提交 Record，列表/详情 | `checkin.js → api.js` 旧 Session、Draft、media routes | `getOwnActiveExerciseSession`, `startExerciseSession`, `getExerciseSession`, `pauseExerciseSession`, `resumeExerciseSession`, `completeExerciseSession`, `allocateMediaAsset`, `finalizeMediaAsset`, `authorizeMediaDownload`, `submitExerciseRecord`, `listOwnExerciseRecords`, `getOwnExerciseRecord` | MAPPED / FORMAL-UNBOUND；CD-01 |
| S20 | Grades | PRESENT | 查看当前进度、耐力结果、最终成绩 | `grades.js → api.js` 旧 score/progress DTO | `getOwnCourseProgress`, `getOwnEnduranceOutcome`, `getOwnFinalGrade` | MAPPED / FORMAL-UNBOUND；UI-03 |
| S21 | Profile | PRESENT | 查看本人摘要与服务入口 | `profile.js → workspace DTO` | `getCurrentActor` / `getStudentDashboard` | MAPPED / FORMAL-UNBOUND |
| S22 | Account Details | PRESENT | 查看本人资料、换绑已验证邮箱 | `profile.js / binding.js → api.js` | `getCurrentActor`, `requestAuthChallenge`, `changeOwnVerifiedEmail` | MAPPED / FORMAL-UNBOUND |
| S23 | Settings | PRESENT | 修改密码、退出当前/全部会话；主题与语言 | `profile.js → api.js`；主题/语言本地 | `changeOwnPassword`, `logoutCurrentSession`, `logoutAllSessions` | MAPPED / FORMAL-UNBOUND |
| S24 | Account Deletion | PRESENT | 预览影响、二次验证、删除本人账号 | `profile.js → api.js` 旧 challenge/confirm | `getOwnAccountDeletionImpact`, `requestAuthChallenge`, `deleteOwnAccount` | MAPPED / FORMAL-UNBOUND；UI-04 |
| S25 | Help Center | PRESENT | 已发布帮助列表/详情 | `support.js → api.js` | `listPublishedHelpArticles`, `getPublishedHelpArticle` | MAPPED / FORMAL-UNBOUND |
| S26 | Feedback | PRESENT | 提交、列表、详情 | `support.js → api.js` | `createFeedback`, `listOwnFeedback`, `getOwnFeedback` | MAPPED / FORMAL-UNBOUND |
| S27 | About | PRESENT | 查看版本与本地说明 | 本地静态 + 旧配置 | `getAppReleasePolicy`（发布策略） | MAPPED / FORMAL-UNBOUND + LOCAL_ONLY |
| S28 | Changelog | PRESENT | 查看本地版本记录 | 本地静态内容 | — | LOCAL_ONLY |
| S29 | Endurance Scoring | PRESENT / STALE | 学生自行输入用时并预估换算 | `services.js → previewEnduranceConversion` 旧 API | 正式学生只应读 `getOwnEnduranceOutcome` | UI-02 + LEGACY_MIGRATION |
| S30 | Exemption / Certification Applications | PRESENT | 建立、列表、详情、补材料；媒体上传/查看 | `services.js → api.js` 旧 draft/update/submit routes | `createStudentApplication`, `listOwnApplications`, `getOwnApplication`, `supplementStudentApplication`, `allocateMediaAsset`, `finalizeMediaAsset`, `authorizeMediaDownload` | MAPPED / FORMAL-UNBOUND |

## 4. Portal 共用页面 → operation

以下 5 个唯一页面由 Teacher/Admin 共用；角色绑定计数时各计一次。

| ID | 页面/面板 | 当前实现 | 主要用户操作 / Use Case | 当前边界 | 固定 Contract operation | 结论 |
|---|---|---|---|---|---|---|
| P01 | Portal Maintenance | PRESENT | fail-closed 检查、查看公告、管理员安全入口 | `portal-app.tsx → system-mode-service.ts → api-client.ts` | `getSystemMode` | MAPPED / FORMAL-UNBOUND |
| P02 | Session Restore | PRESENT | refresh、取得本人、确定角色 | `portal-app.tsx → api-client.ts` | `refreshSession`, `getCurrentActor`, `getSystemMode` | MAPPED / FORMAL-UNBOUND |
| P03 | Password Login | PRESENT | 教师/管理员密码登录 | `portal-app.tsx → api-client.ts` | `createPasswordSession` | MAPPED / FORMAL-UNBOUND |
| P04 | Password Recovery | PRESENT | 请求学校邮箱验证码、设置新密码 | `portal-app.tsx → api-client.ts` | `requestAuthChallenge`, `resetPassword` | MAPPED / FORMAL-UNBOUND；NBD-02 |
| P05 | Account / Security | PRESENT | 查看本人、改密、退出当前/全部会话；分管理员本人注销 | `portal-app.tsx → api-client.ts` | `getCurrentActor`, `changeOwnPassword`, `logoutCurrentSession`, `logoutAllSessions`, `getOwnAccountDeletionImpact`, `deleteOwnAccount` | MAPPED / FORMAL-UNBOUND；UI-07 |

## 5. Teacher 页面 → operation

| ID | 页面 | 当前实现 | 主要用户操作 / Use Case | 当前边界 | 固定 Contract operation | 结论 |
|---|---|---|---|---|---|---|
| T01 | Teacher Dashboard | **MISSING** | 当前学期、课程/成员、名单差异、需关注 Record、耐力、申请、成绩、未读摘要 | 当前无 nav/route | `getTeacherDashboard`；“需关注 Record”无已确认字段/口径 | MISSING_UI；NBD-01；唯一未映射 Use Case |
| T02 | Courses | PRESENT | 列表/详情、建立、影响预览、修改、关闭；邀请码建立/恢复/撤销 | `teacher-workspace.tsx → teacher-data.ts → api-client.ts` | `listOwnCourses`, `createCourse`, `getCourse`, `previewCourseChangeImpact`, `updateCourse`, `closeCourse`, `createCourseInvitation`, `listCourseInvitations`, `revokeCourseInvitation` | MAPPED / FORMAL-UNBOUND |
| T03 | Students / Roster | PRESENT | 成员列表、移出/恢复；名单分配上传、导入、快照、差异处理/回退；成员进度 | `teacher-workspace.tsx / roster-reconciliation-api-service.ts → api-client.ts` | `listCourseMembers`, `removeCourseMember`, `restoreCourseMember`, `allocateRosterImport`, `importOfficialRoster`, `listRosterSnapshots`, `getRosterSnapshot`, `listRosterFindings`, `resolveRosterFinding`, `revertCurrentRosterSnapshot`, `getCourseMemberProgress`, `listCourseProgress` | MAPPED / FORMAL-UNBOUND |
| T04 | Check-ins | PRESENT | 记录列表/详情、媒体查看、追加 VALID/INVALID 审核、历史 | `teacher-workspace.tsx → teacher-data.ts → api-client.ts` | `getExerciseSession`, `listCourseExerciseRecords`, `getCourseExerciseRecord`, `authorizeMediaDownload`, `appendExerciseRecordReview`, `listExerciseRecordReviews` | MAPPED / FORMAL-UNBOUND |
| T05 | Grades | PRESENT | 成员进度；耐力结果/确认；最终成绩列表、历史、填写/重发 | `teacher-workspace.tsx → teacher-data.ts` 旧 score recalculate/publish | `getCourseMemberProgress`, `listCourseProgress`, `getCourseMemberEnduranceOutcome`, `confirmEnduranceMeasurement`, `listCourseFinalGrades`, `listFinalGradeHistory`, `publishFinalGrade` | MAPPED / FORMAL-UNBOUND |
| T06 | Exemptions / Certifications | PRESENT | 列表/详情、决定、补充/撤销认证学时、查看证明 | `teacher-workspace.tsx → teacher-data.ts` 旧申请 DTO | `listCourseApplications`, `getCourseApplication`, `decideStudentApplication`, `adjustCertificationCredit`, `revokeCertificationCredit`, `authorizeMediaDownload` | MAPPED / FORMAL-UNBOUND |
| T07 | Teacher Notification Center | **MISSING** | 列表、未读数、标记已读 | 当前无 nav/route | `listOwnNotifications`, `getOwnUnreadNotificationCount`, `markOwnNotificationRead` | MISSING_UI；UI-06 |

## 6. Admin 页面 → operation

| ID | 页面 | 当前实现 | 主要用户操作 / Use Case | 当前边界 | 固定 Contract operation | 结论 |
|---|---|---|---|---|---|---|
| A01 | Overview | PRESENT | 权限感知的模式、学期、账号、健康与待处理摘要 | `admin-overview.tsx → admin-service.ts / api-client.ts` | `getAdminDashboard` | MAPPED / FORMAL-UNBOUND |
| A02 | Current Courses | PRESENT | 当前课程列表/详情、搜索筛选、汇总 | `admin-courses.tsx → admin-service.ts / api-client.ts` | `listCurrentCoursesForAdmin`, `getCurrentCourseForAdmin` | MAPPED / FORMAL-UNBOUND |
| A03 | Semesters | PRESENT | 当前/列表/全局摘要、建立、编辑 UPCOMING、切换 CURRENT | `admin-semesters.tsx → admin-service.ts` | `getCurrentSemester`, `listSemesters`, `createSemester`, `updateUpcomingSemester`, `switchCurrentSemester` | MAPPED / FORMAL-UNBOUND |
| A04 | Users & Accounts | PRESENT | 学生只读列表/详情；教师列表/详情、批量校验/建立、删除 | `admin-users.tsx → admin-service.ts`；写动作多为 demo-only | `listStudentAccounts`, `getStudentAccount`, `listTeacherAccounts`, `getTeacherAccount`, `validateTeacherAccountBatch`, `createTeacherAccountBatch`, `deleteTeacherAccount` | MAPPED / FORMAL-UNBOUND；CD-02 |
| A05 | Sub-admins | PRESENT | 摘要/列表/详情、建立、编辑、启停、删除 | `admin-subadmins.tsx` localStorage/demo | `listSubAdmins`, `getSubAdmin`, `createSubAdmin`, `updateSubAdmin`, `setSubAdminState`, `deleteSubAdmin` | MAPPED / FORMAL-UNBOUND |
| A06 | Feedback | PRESENT | 汇总、搜索筛选、详情、受理/回复/关闭/重开 | `admin-support.tsx → admin-service.ts` | `listFeedbackForAdmin`, `getFeedbackForAdmin`, `processFeedback` | MAPPED / FORMAL-UNBOUND |
| A07 | Global Rules | PRESENT | 四套表列表/详情、版本化修订 | `admin-rules.tsx → admin-service.ts` | `listEnduranceRuleTables`, `getEnduranceRuleTable`, `reviseEnduranceRuleTable` | MAPPED / FORMAL-UNBOUND |
| A08 | System Mode | PRESENT | 当前模式、历史、受控切换 | `admin-system.tsx → admin-service.ts / system-mode-service.ts` | `getSystemMode`, `listSystemModeTransitions`, `switchSystemMode` | MAPPED / FORMAL-UNBOUND |
| A09 | Help | PRESENT | 汇总/列表/详情、建立、编辑、发布/下线/重上线 | `admin-help.tsx → admin-service.ts` | `listHelpArticlesForAdmin`, `getHelpArticleForAdmin`, `createHelpArticle`, `updateHelpArticle`, `transitionHelpArticleState` | MAPPED / FORMAL-UNBOUND |
| A10 | Audit | PRESENT | 查询/详情、请求 ZIP、轮询任务、授权下载 | `admin-audit.tsx → admin-service.ts` | `listAuditEvents`, `getAuditEvent`, `requestAuditArchive`, `getAuditArchiveJob`, `authorizeAuditArchiveDownload` | MAPPED / FORMAL-UNBOUND |
| A11 | Admin Notification Center | **MISSING** | 列表、未读数、标记已读 | 当前仅有通知计数展示，无独立中心 | `listOwnNotifications`, `getOwnUnreadNotificationCount`, `markOwnNotificationRead` | MISSING_UI；UI-06 |

## 7. 121 个 operation 的去重覆盖

| 业务域 | 数量 | operationId | Contract 适足性 |
|---|---:|---|---|
| 认证、本人身份与账号 | 12 | `requestAuthChallenge`, `createStudentSession`, `createPasswordSession`, `refreshSession`, `logoutCurrentSession`, `logoutAllSessions`, `resetPassword`, `getCurrentActor`, `changeOwnPassword`, `changeOwnVerifiedEmail`, `getOwnAccountDeletionImpact`, `deleteOwnAccount` | 已确认流程可表达；个人密码规则见 NBD-02 |
| 发布策略 | 1 | `getAppReleasePolicy` | PASS |
| 学期 | 5 | `getCurrentSemester`, `listSemesters`, `createSemester`, `updateUpcomingSemester`, `switchCurrentSemester` | PASS |
| 课程 | 9 | `listOwnCourses`, `createCourse`, `getCourse`, `updateCourse`, `previewCourseChangeImpact`, `closeCourse`, `getOwnCurrentCourse`, `listCurrentCoursesForAdmin`, `getCurrentCourseForAdmin` | PASS |
| 邀请与入班 | 6 | `createCourseInvitation`, `listCourseInvitations`, `revokeCourseInvitation`, `previewCourseInvitation`, `joinCourseByInvitation`, `registerStudentAndJoinCourse` | PASS |
| 成员 | 3 | `listCourseMembers`, `removeCourseMember`, `restoreCourseMember` | PASS |
| 官方名单 | 7 | `allocateRosterImport`, `importOfficialRoster`, `listRosterSnapshots`, `getRosterSnapshot`, `listRosterFindings`, `resolveRosterFinding`, `revertCurrentRosterSnapshot` | PASS |
| Session | 6 | `getOwnActiveExerciseSession`, `startExerciseSession`, `getExerciseSession`, `pauseExerciseSession`, `resumeExerciseSession`, `completeExerciseSession` | PASS |
| 媒体 | 3 | `allocateMediaAsset`, `finalizeMediaAsset`, `authorizeMediaDownload` | PASS |
| Record / Review | 7 | `submitExerciseRecord`, `listOwnExerciseRecords`, `getOwnExerciseRecord`, `listCourseExerciseRecords`, `getCourseExerciseRecord`, `appendExerciseRecordReview`, `listExerciseRecordReviews` | PASS |
| 进度 | 3 | `getOwnCourseProgress`, `getCourseMemberProgress`, `listCourseProgress` | PASS |
| 申请 / 认证 | 9 | `createStudentApplication`, `listOwnApplications`, `supplementStudentApplication`, `getOwnApplication`, `listCourseApplications`, `getCourseApplication`, `decideStudentApplication`, `adjustCertificationCredit`, `revokeCertificationCredit` | PASS |
| 耐力跑 | 6 | `getOwnEnduranceOutcome`, `getCourseMemberEnduranceOutcome`, `confirmEnduranceMeasurement`, `listEnduranceRuleTables`, `getEnduranceRuleTable`, `reviseEnduranceRuleTable` | PASS |
| 最终成绩 | 4 | `getOwnFinalGrade`, `listCourseFinalGrades`, `listFinalGradeHistory`, `publishFinalGrade` | PASS |
| 反馈 | 6 | `createFeedback`, `listOwnFeedback`, `getOwnFeedback`, `listFeedbackForAdmin`, `getFeedbackForAdmin`, `processFeedback` | PASS |
| 帮助 | 7 | `listPublishedHelpArticles`, `getPublishedHelpArticle`, `listHelpArticlesForAdmin`, `createHelpArticle`, `getHelpArticleForAdmin`, `updateHelpArticle`, `transitionHelpArticleState` | PASS |
| 系统模式 | 3 | `getSystemMode`, `listSystemModeTransitions`, `switchSystemMode` | PASS |
| 通知 | 3 | `listOwnNotifications`, `getOwnUnreadNotificationCount`, `markOwnNotificationRead` | PASS；Teacher/Admin UI 缺页 |
| 审计 | 5 | `listAuditEvents`, `getAuditEvent`, `requestAuditArchive`, `getAuditArchiveJob`, `authorizeAuditArchiveDownload` | PASS |
| 教师账号 | 5 | `listTeacherAccounts`, `getTeacherAccount`, `validateTeacherAccountBatch`, `createTeacherAccountBatch`, `deleteTeacherAccount` | PASS；当前 Client 有反向 blocker |
| 学生账号 | 2 | `listStudentAccounts`, `getStudentAccount` | PASS |
| 分管理员 | 6 | `listSubAdmins`, `createSubAdmin`, `getSubAdmin`, `updateSubAdmin`, `setSubAdminState`, `deleteSubAdmin` | PASS |
| Dashboard | 3 | `getStudentDashboard`, `getTeacherDashboard`, `getAdminDashboard` | Student/Admin PASS；Teacher “需关注 Record”待业务定义 |
| **合计** | **121** | operationId 唯一 | 121 个固定 operation 均被纳入页面/角色审查 |

## 8. Contract 表达能力检查

| 检查项 | 结果 | 说明 |
|---|---|---|
| 对应 operation | PASS 153 / 153；另 1 PENDING | 已确认角色 Use Case 均有 operation；“需关注的打卡记录”没有可安全定义的 Use Case |
| Request 足以表达 | PASS（已确认规则） | 课程、Session、Record、Application、成绩、管理动作均有闭合 request；个人密码强度仍属 NBD-02 |
| Response 支持 UI | PASS（已确认规则） | Content projection、summary、详情、history、job、download authorization 均存在；旧 UI 缺字段主要来自旧 DTO/产品表达 |
| Content / Empty / Error | PASS | nullable current、404 Idle/absent、空列表/summary、业务错误与依赖错误分离；不把空态伪装成功 |
| HTTP Status / `error.code` | PASS | 结构验证覆盖 66 个稳定错误码；各 operation 声明 `x-error-codes` 与响应状态 |
| 权限 | PASS | `x-roles`、`x-admin-permissions`、`x-resource-scope`、`x-system-mode` 明确 |
| nullable / required | PASS | 根 Schema 使用 `additionalProperties: false` 和显式 required/nullable；Phase 5B strict fixture 已覆盖关键空态 |
| enum / 状态机 | PASS | 当前确认的 Session、Record/Review、Application、Endurance、FinalGrade、Mode、Help、Sub-admin 等状态足够 |
| 分页 / 筛选 / 排序 | PASS | 需要集合查询的 operation 已提供受限 page/cursor、filter/sort 或稳定 summary；页面本地筛选不反推新字段 |
| 上传 | PASS | Record/Application media 与 roster import 均为 allocation → 直传 → finalize/import，限制与授权明确 |
| 幂等 | PASS | mutation 的 required header、expectedVersion、天然幂等或只读语义均在 operation catalog 明确 |
| UI/ViewModel 私有依赖 | FINDINGS | 旧 join 审核状态、Record Draft/cancel、学生耐力 preview、`absent`/免测评分、teacher score recalculate、teacher transfer blocker、12 位密码规则均不是新 Contract 字段需求 |

## 9. 未映射 Use Case

| ID | 页面 / Use Case | 未映射原因 | 分类 | 下一动作 |
|---|---|---|---|---|
| UC-UNMAPPED-01 | Teacher Dashboard：“需要关注的打卡记录”摘要/入口 | 四份业务权威没有定义“需要关注”的判定集合、计数时点、是否仅 INVALID、是否包含未审核默认 VALID Record；`TeacherDashboard` 也没有对应字段 | `NEEDS_BUSINESS_DECISION`（NBD-01） | 先由业务负责人定义；定义后再判断复用 Record query、扩展 Dashboard 或无需 Contract action |

## 10. 结论

- 固定 Contract 的 **121 个 operation / 153 条角色绑定**均完成了 Web 全表面映射。
- 对所有**已经确认的业务规则**，Request、Response、空态、错误、权限、nullable/required、enum、分页/筛选/排序、上传与幂等语义足够；本轮新增 Contract CR 为 **0**。
- 仍不能宣称“完整支撑全部 Web 初版功能”：Teacher Dashboard 的“需关注 Record”缺业务定义；个人密码强度也没有统一权威，而当前 Portal 私自限定 12 位。
- 当前正式 Student/Portal runtime 对固定 `1.1.0-contract` 的可验证绑定为 **0 / 121**；Phase 5B validation-only binding/Mock 不能冒充产品迁移。
- 因此本次 **Phase 5D-B = PARTIAL**。
