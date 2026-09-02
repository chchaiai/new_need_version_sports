# Phase 5C.2 Use Case 覆盖矩阵

> Contract：`1.2.0-contract` · 状态：`RC` · 公开基路径：`/api/v1`

本矩阵按业务 Use Case 分组；单个页面按钮不是 Endpoint 设计依据。全量 operation 的 Method、完整公开 Path、operationId、角色、权限、资源范围、系统模式和幂等方式见生成的 [operation catalog](operation-catalog.md)。

## 已覆盖的确认流程

| 业务域 | 核心 Use Case | 代表 operationId | 覆盖结论 |
|---|---|---|---|
| 认证与本人身份 | OTP challenge、学生 OTP 登录、教师/管理员密码登录、refresh、当前/全部退出、找回/修改密码、本人信息、邮箱更换 | `requestAuthChallenge`, `createStudentSession`, `createPasswordSession`, `refreshSession`, `logoutCurrentSession`, `logoutAllSessions`, `resetPassword`, `changeOwnPassword`, `getCurrentActor`, `changeOwnVerifiedEmail` | COVERED；Teacher/Admin 临时初始密码 gate、ACTIVE/disabled、本人改密保留当前 session/撤销其他 session、自助 reset 撤销全部 session且不自动登录均有稳定语义 |
| 账号注销 | 学生/分管理员影响预览、二次验证、阻塞检查、账号相关数据删除与历史事实保留 | `getOwnAccountDeletionImpact`, `deleteOwnAccount` | COVERED |
| 学期 | 当前学期/无 current 404、含全局摘要的管理列表、创建、编辑 UPCOMING、切换唯一 CURRENT 并归档旧学期 | `getCurrentSemester`, `listSemesters`, `createSemester`, `updateUpcomingSemester`, `switchCurrentSemester` | COVERED；summary 与 items 同一提交读取快照且不随筛选/分页缩小 |
| 课程 | 教师课程列表、仅在唯一 CURRENT 建立、影响预览、修改、关闭、学生当前课程 | `listOwnCourses`, `createCourse`, `getCourse`, `previewCourseChangeImpact`, `updateCourse`, `closeCourse`, `getOwnCurrentCourse` | COVERED；unknown semester 为 404，存在但非 CURRENT 为 409 `SEMESTER_NOT_CURRENT` |
| 管理员当前课程 | 只读目录三项汇总、课程/教师搜索、UPCOMING/ACTIVE 筛选、成员/Record/封顶学时摘要、只读详情 | `listCurrentCoursesForAdmin`, `getCurrentCourseForAdmin` | COVERED；单成员、单 Record 和媒体下钻未开放 |
| 邀请与入班 | 邀请创建/可恢复 metadata 读取/撤销/安全预览、已注册学生入班、新学生验证注册并原子入班 | `createCourseInvitation`, `listCourseInvitations`, `revokeCourseInvitation`, `previewCourseInvitation`, `joinCourseByInvitation`, `registerStudentAndJoinCourse` | COVERED；已识别五状态使用 200 内容态，未知/畸形/不可安全投影使用 422；读取不返回明文 code |
| 课程成员 | 列表、移出、恢复原 Enrollment | `listCourseMembers`, `removeCourseMember`, `restoreCourseMember` | COVERED |
| 官方名单 | XLSX/CSV allocation、导入快照、快照/发现查询、一次性处理、同课程快照回退 | `allocateRosterImport`, `importOfficialRoster`, `listRosterSnapshots`, `getRosterSnapshot`, `listRosterFindings`, `resolveRosterFinding`, `revertCurrentRosterSnapshot` | COVERED；100 MiB/500 行规则已编码 |
| 运动 Session | 查询进行中/无 Session 404 Idle、开始、暂停、继续、结束、授权查看 | `getOwnActiveExerciseSession`, `startExerciseSession`, `getExerciseSession`, `pauseExerciseSession`, `resumeExerciseSession`, `completeExerciseSession` | COVERED；正式时间和业务日期均只由服务端产生 |
| Record 媒体 | purpose-bound allocation、显式 `PUT` 直传、权威 finalize、短期授权下载 | `allocateMediaAsset`, `finalizeMediaAsset`, `authorizeMediaDownload` | COVERED；预期 `VERIFIED/REJECTED/EXPIRED` 只走 200 `MediaFinalizationResult`，依赖/权限等仍走 ErrorEnvelope |
| Record 与审核 | 完成 Session 后原子提交默认 VALID、学生/教师查询、追加 VALID/INVALID、审核历史 | `submitExerciseRecord`, `listOwnExerciseRecords`, `getOwnExerciseRecord`, `listCourseExerciseRecords`, `getCourseExerciseRecord`, `appendExerciseRecordReview`, `listExerciseRecordReviews` | COVERED；无 Draft、重提或任意加时 |
| 进度 | 学生本人、教师单成员、教师课程列表的服务端投影 | `getOwnCourseProgress`, `getCourseMemberProgress`, `listCourseProgress` | COVERED；按类别封顶后求和，展示百分比不参与判断 |
| 免测/认证申请 | 首次申请、补材料、双端列表/详情、教师决策、认证学时调整/撤销 | `createStudentApplication`, `supplementStudentApplication`, `listOwnApplications`, `getOwnApplication`, `listCourseApplications`, `getCourseApplication`, `decideStudentApplication`, `adjustCertificationCredit`, `revokeCertificationCredit` | COVERED；四状态、每申请累计最多三图，校队/学生社团由 required/non-null `CertificationKind` 无损 round-trip |
| 耐力跑 | 学生/教师结果、教师确认真实秒数、四套表查询、版本化规则修订 | `getOwnEnduranceOutcome`, `getCourseMemberEnduranceOutcome`, `confirmEnduranceMeasurement`, `listEnduranceRuleTables`, `getEnduranceRuleTable`, `reviseEnduranceRuleTable` | COVERED；无唯一匹配时 measurement 保留且 conversion 为 null |
| 最终成绩 | 学生当前结果、教师课程列表、历史、发布/重新发布 | `getOwnFinalGrade`, `listCourseFinalGrades`, `listFinalGradeHistory`, `publishFinalGrade` | COVERED；signed int32，无 0–100 限制，备注最多 50 字符 |
| 反馈 | 学生提交/查询、管理员全局概况/搜索/详情、追加公开回复和状态变化 | `createFeedback`, `listOwnFeedback`, `getOwnFeedback`, `listFeedbackForAdmin`, `getFeedbackForAdmin`, `processFeedback` | COVERED；summary 固定 total/pending/waitingTech/completed 口径，每页最多 6 条 |
| 帮助中心 | 学生已发布列表/详情、管理员全局三状态概况、草稿建立/编辑/查询/状态切换 | `listPublishedHelpArticles`, `getPublishedHelpArticle`, `listHelpArticlesForAdmin`, `createHelpArticle`, `getHelpArticleForAdmin`, `updateHelpArticle`, `transitionHelpArticleState` | COVERED；summary 不随筛选缩小，每页最多 5 条 |
| 系统模式 | 公共 mode、历史、NORMAL/MAINTENANCE 受控切换与公告 | `getSystemMode`, `listSystemModeTransitions`, `switchSystemMode` | COVERED；所有 operation 声明 fail-closed 规则 |
| 站内通知 | 本人列表、未读数、天然幂等已读 | `listOwnNotifications`, `getOwnUnreadNotificationCount`, `markOwnNotificationRead` | COVERED；无邮件、短信或系统 Push |
| 审计 | 权限内 keyset 查询、脱敏详情、异步 ZIP、状态和短期下载授权 | `listAuditEvents`, `getAuditEvent`, `requestAuditArchive`, `getAuditArchiveJob`, `authorizeAuditArchiveDownload` | COVERED；每页最多 50 条 |
| 教师账户 | 列表/详情、UTF-8 CSV 全量校验、原子批量建立、核对后删除当前账号资料并保留课程/历史主体 | `listTeacherAccounts`, `getTeacherAccount`, `validateTeacherAccountBatch`, `createTeacherAccountBatch`, `deleteTeacherAccount` | COVERED；不建立责任教师交接 operation，删除不转移或改写课程事实 |
| 学生账户 | 管理员搜索、筛选和详情，全程只读 | `listStudentAccounts`, `getStudentAccount` | COVERED；只有 ACTIVE/PENDING，无写 operation |
| 分管理员 | SUPER 全局账号摘要、列表/详情、建立临时 credential、编辑非 credential 资料、启停、删除；本人注销复用本人身份 Use Case | `listSubAdmins`, `getSubAdmin`, `createSubAdmin`, `updateSubAdmin`, `setSubAdminState`, `deleteSubAdmin`, `deleteOwnAccount` | COVERED；创建后 `mustChangePassword=true`；普通 update 不接受任何 password/credential 字段；summary 为 total/active，固定八项权限仍由 closed enum 表达 |
| 概览与发布策略 | ACTIVE/PENDING 均稳定的学生本人资料、无 current 教师空态、管理员角色概览，Android/Web 发布策略 | `getStudentDashboard`, `getTeacherDashboard`, `getAdminDashboard`, `getAppReleasePolicy` | COVERED；教师无 current 时 nullable semester + current-work counts 0 |

## RC 覆盖结论

`P4-DECISION-05` 已确认：教师账号删除不以责任教师交接为前置，且管理员不得修改或转移责任教师、管理课程或改写课程事实。因此 Contract 不建立交接 Endpoint；`deleteTeacherAccount` 只删除当前账号资料并让既有课程/历史继续引用 opaque non-login subject。

- OpenAPI 结构、operationId 唯一、DTO/Error/权限/分页/上传/幂等规则：PASS；
- 核心 Use Case：COVERED；
- 未解决业务 `PENDING`：无；
- Contract 进入 `RC`：PASS。

Phase 5C.2 仅落实 `CR-20260901-002` 与 `CR-20260901-003`；`CR-20260901-004` 未落实。Android/Web Legacy Migration Findings 未用于恢复旧 Endpoint、DTO、字段或语义。密码规则已有 Phase 3 设计支撑；`CertificationKind` 需要独立 Contract ↔ Domain/Database Alignment 后才能进入 Backend 初始化。
