# Phase 5B Web Legacy Migration Findings

> 日期：2026-08-31（Asia/Shanghai）
>
> 状态：`DONE (READ-ONLY AUDIT)`
>
> 范围：学生 Web `frontend/student`、教师/管理员 Portal `portal-teacher-admin` 的旧 API、旧 DTO、旧 generated Contract 与页面调用边界

## 1. 强制门禁

本文不把旧 Endpoint、DTO、错误码、页面字段或 `3.0.0-web-snapshot` 当作新需求来源。每一项按以下顺序判定：

1. 新 Contract operation 是否已经存在；
2. 新 Contract 是否完整支持当前业务权威与页面/Use Case；
3. 存在且完整时标记 `LEGACY_MIGRATION`，不创建 CR；
4. operation 不存在时，先判断旧行为是否仍属于正式业务；已撤销、DEV_ONLY、客户端本地或未获授权的行为标记 `NOT_CONTRACT_DEFECT`；
5. 只有现行 RC 自身存在缺 operation/字段/status/error/唯一语义时才进入 [Contract CR Bundle](contract-cr-bundle.md)。

旧结构不享有兼容权。后续迁移不得保留旧字段别名、私有 DTO、双 response 通道、旧 ErrorCode 白名单或本地 Fake Success。

## 2. 公共认证、账号与系统边界

| 旧 Web 边界 | 当前 Use Case | 新 Contract operation | 是否存在 | 语义是否完整 | Finding |
|---|---|---|---|---|---|
| `/auth/student-sign-in-codes*` | 学生学校邮箱 OTP 登录 | `requestAuthChallenge`、`createStudentSession` | 是 | 是 | `LEGACY_MIGRATION`；不保留旧两段 route/organizationCode DTO |
| `/auth/password-login` | 教师 email、管理员 email/loginName 登录 | `createPasswordSession` | 是 | 是 | `LEGACY_MIGRATION` |
| `/auth/refresh`、`/auth/logout` | refresh、当前/全部退出 | `refreshSession`、`logoutCurrentSession`、`logoutAllSessions` | 是 | 是 | `LEGACY_MIGRATION` |
| `/me` 旧整包 user/profile | 通用 actor、角色、email、状态、首次改密门禁 | `getCurrentActor`、SessionTokenPair.actor | 是 | 通用身份完整 | `LEGACY_MIGRATION`；学生完整本人资料受 CR-003，其他旧 profile 字段不自动进入 Contract |
| `/organizations/current` 找回前置 | 教师/管理员按已验证邮箱找回密码 | `requestAuthChallenge`、`resetPassword` | 是 | 是，anti-enumeration | `LEGACY_MIGRATION`；不恢复 organization lookup |
| 旧 account-recovery requests/complete | 密码找回 | `requestAuthChallenge`、`resetPassword` | 是 | 是 | `LEGACY_MIGRATION` |
| 旧 email challenge/verify | 换绑学校邮箱 | `requestAuthChallenge`、`changeOwnVerifiedEmail` | 是 | 是 | `LEGACY_MIGRATION`；不保留旧 challenge URL 形状 |
| 旧 account-deletion challenge/confirm | 学生/分管理员注销 | `getOwnAccountDeletionImpact`、`requestAuthChallenge`、`deleteOwnAccount` | 是 | 是 | `LEGACY_MIGRATION` |
| 旧 `/system-mode` DTO/轮询 | NORMAL/MAINTENANCE gate | `getSystemMode` | 是 | 是 | `LEGACY_MIGRATION`；Web 继续 fail closed |
| Web 启动无 release-policy 请求 | Web release gate | `getAppReleasePolicy(platform=WEB)` | 是 | 是 | 可按产品计划迁移；不是旧 Web 缺字段 CR |

## 3. 学生 Web 边界

| 旧 API / DTO / fan-out | 当前业务语义 | 新 Contract operation | 判定 |
|---|---|---|---|
| semester/enrollment/class-section/course/progress/score 多路 fan-out | 当前身份、0/1 current course、两类目标/进度、耐力、成绩 | `getStudentDashboard`、`getOwnCurrentCourse`、`getOwnCourseProgress`、`getOwnEnduranceOutcome`、`getOwnFinalGrade` | `LEGACY_MIGRATION`；不保留旧 workspace 或 N+1；PENDING 完整资料见 CR-003 |
| 旧 invite preview + join-capability + join | ACTIVE 安全预览、既有学生加入、新学生注册加入 | `previewCourseInvitation`、`joinCourseByInvitation`、`registerStudentAndJoinCourse` | `LEGACY_MIGRATION`；终止状态见 CR-004，旧 capability step 不保留 |
| 旧 active/start/pause/resume/finish | 服务端权威 Session 状态与时长 | `getOwnActiveExerciseSession`、`start/pause/resume/completeExerciseSession`、`getExerciseSession` | `LEGACY_MIGRATION`；无 Session 空态见 CR-001；旧 cancel 不迁移 |
| 旧 record draft + update + submit | 完成 Session 后一次正式提交 | `submitExerciseRecord` | `LEGACY_MIGRATION`；不保留 Draft/attempt/resubmission |
| 旧 record list/detail/evidence-context | 本人 Record 内容、媒体、当前/历史 Review | `listOwnExerciseRecords`、`getOwnExerciseRecord`、`listExerciseRecordReviews`、`authorizeMediaDownload` | `LEGACY_MIGRATION` |
| 旧通用/免测专用 media upload、confirm、poll、bind、access-url | purpose-aware allocation → direct upload → finalize → bind → short download | `allocateMediaAsset`、`finalizeMediaAsset`、`authorizeMediaDownload` | `LEGACY_MIGRATION`；method 见 CR-005，拒绝通道见 CR-002；不保留两条旧 route |
| 旧 exemption draft/update/submit | 正式申请、被要求后补材料、列表/详情 | `createStudentApplication`、`supplementStudentApplication`、`listOwnApplications`、`getOwnApplication` | `LEGACY_MIGRATION`；旧草稿/任意编辑不保留 |
| 旧 student-scores / 本地进度重算 | 服务端两类封顶进度与最新最终成绩 | `getOwnCourseProgress`、`getOwnFinalGrade` | `LEGACY_MIGRATION`；客户端不再成为第二权威 |
| 旧 feedback list/create | 提交、本人列表/详情 | `createFeedback`、`listOwnFeedback`、`getOwnFeedback` | `LEGACY_MIGRATION` |
| 旧 help DTO/cache | 已发布帮助列表/详情 | `listPublishedHelpArticles`、`getPublishedHelpArticle` | `LEGACY_MIGRATION`；只允许显式标记的真实缓存 |
| 旧 notification list/read | 站内通知、未读数、单条已读 | `listOwnNotifications`、`getOwnUnreadNotificationCount`、`markOwnNotificationRead` | `LEGACY_MIGRATION` |

## 4. 教师 Portal 边界

| 旧 API / DTO / 页面 | 当前业务语义 | 新 Contract operation | 判定 |
|---|---|---|---|
| `/class-sections` + `/courses` + `/semesters/current` + target fan-out | 本人 current courses、学期、责任教师、窗口、两类目标、成员数 | `getTeacherDashboard`、`listOwnCourses`、`getCourse`、`getCurrentSemester`、`getSystemMode` | `LEGACY_MIGRATION`；无 current 见 CR-011 |
| 旧 class-section create/PATCH/target revision | 在 CURRENT 创建、影响预览、编辑课程 | `createCourse`、`previewCourseChangeImpact`、`updateCourse` | `LEGACY_MIGRATION`；失败语义见 CR-012 |
| 旧课程结束/展示状态 | 检查 blocker 后关闭并保留历史 | `closeCourse` | `LEGACY_MIGRATION`；不恢复删除/重开/手工展示状态 |
| 旧 invite rotate/revoke/本地 plaintext | 生成、初次展示、停止使用邀请 | `createCourseInvitation`、`revokeCourseInvitation` | `PARTIAL LEGACY_MIGRATION`；可恢复 management read 见 CR-006；raw code 禁止持久化 |
| 旧 enrollments/students fan-out | 本人课程成员，移出/恢复 | `listCourseMembers`、`removeCourseMember`、`restoreCourseMember` | `LEGACY_MIGRATION` |
| 旧 roster multipart/import/reconcile/resolution | allocation、CSV/XLSX 导入、快照、五类 finding、处理和回退 | roster operation family | `LEGACY_MIGRATION`；直传 method 见 CR-005 |
| 旧 exercise-records review/reopen | 默认 VALID Record 事后复核与追加 VALID/INVALID | `list/getCourseExerciseRecord`、`appendExerciseRecordReview`、`listExerciseRecordReviews` | `LEGACY_MIGRATION`；不恢复 PENDING 审批或 reopen 状态 |
| 旧 student progress/score recalculation | 进度列表、最终成绩 INT 发布/重发和历史 | `listCourseProgress`、`listCourseFinalGrades`、`publishFinalGrade`、`listFinalGradeHistory` | `LEGACY_MIGRATION`；不保留自动重算/批量假发布 DTO |
| 旧 exemption/certification review | 四状态申请决策、认证学时分配/调整/撤销 | application operations | `LEGACY_MIGRATION` |
| 旧 endurance conversion/grade UI | 教师确认真实用时，读取服务端 conversion | `getCourseMemberEnduranceOutcome`、`confirmEnduranceMeasurement` | `LEGACY_MIGRATION`；教师不选择规则表或猜分 |

## 5. 管理员 Portal 边界

| 旧 API / Demo DTO / 页面 | 当前业务语义 | 新 Contract operation | 判定 |
|---|---|---|---|
| 旧 admin health/users/rules 聚合 | permission-aware overview、可空 current、五项 health | `getAdminDashboard` | `LEGACY_MIGRATION`；不得从多个旧 list 本地重算总数 |
| 旧 admin course list/detail | 当前全部课程只读目录与三项 summary | `listCurrentCoursesForAdmin`、`getCurrentCourseForAdmin` | `LEGACY_MIGRATION`；不恢复管理员课程 mutation/Record/media 下钻 |
| 旧 semester list/create/update/set-current/archive | 创建/编辑 UPCOMING、切换唯一 CURRENT 并自动归档 | semester operation family | `LEGACY_MIGRATION`；无独立 archive；顶部 summary 见 CR-007，absence 见 CR-011 |
| 旧 teacher account list/import/delete | CSV 校验、原子批量建立、只读详情、核对删除 | teacher-account operation family | `LEGACY_MIGRATION`；不恢复启停/恢复审批/课程交接 blocker |
| 旧 student user list/detail/write | 学生 ACTIVE/PENDING 只读列表/详情 | `listStudentAccounts`、`getStudentAccount` | `LEGACY_MIGRATION`；旧改资料/状态/强制登出不是当前页面能力 |
| 旧 sub-admin localStorage CRUD | SUPER 创建/编辑/启停/删除、固定八项权限 | sub-admin operation family | `LEGACY_MIGRATION`；page summary 见 CR-010 |
| 旧 feedback local queue mutation | list/detail、公开回复、五状态处理/重开 | feedback admin operation family | `LEGACY_MIGRATION`；global overview 见 CR-008 |
| 旧 score-rule approval/demo tables | 四套耐力表读取与单次 ADD/UPDATE/DELETE 后整表校验 | endurance admin operation family | `LEGACY_MIGRATION`；不恢复审批/启停/批量发布 |
| 旧 mode localStorage 切换 | current/history/NORMAL↔MAINTENANCE + bilingual announcement | `getSystemMode`、`listSystemModeTransitions`、`switchSystemMode` | `LEGACY_MIGRATION` |
| 旧 help localStorage CRUD | 双语 article create/edit/publish/archive/republish | help admin operation family | `LEGACY_MIGRATION`；global overview 见 CR-009 |
| 旧 audit logs/client DTO/archive | immutable list/detail + server ZIP job + short download | audit operation family | `LEGACY_MIGRATION`；client-error telemetry 不在正式业务 |

## 6. 新 operation 存在但语义不完整：CR 关联

| Web 场景 | 新 operation 是否存在 | Finding |
|---|---|---|
| 无活动 Session 的 Idle | 是 | CR-001 `BLOCKING`，既有 CR，Web 不重复创建 |
| 媒体权威拒绝/过期 | 是 | CR-002 `BLOCKING`，既有 CR |
| PENDING 学生完整本人资料 | 是 | CR-003 `BLOCKING`，既有 CR |
| 邀请已知终止状态预览 | 是 | CR-004 `LOCAL`，既有 CR |
| 三类 direct upload | 是 | CR-005 `BLOCKING`；allocation 缺 HTTP method |
| 教师稍后管理/撤销邀请 | mutation 是、read 否 | CR-006 `LOCAL` |
| 学期、feedback、help、sub-admin 顶部摘要 | list 是 | CR-007～010 `LOCAL` |
| 尚无 CURRENT 的 Web 空态 | 是 | CR-011 `LOCAL` |
| 创建课程的 semester failure | 是 | CR-012 `LOCAL` |

上述 CR 都由现行 RC 自身缺口证明，不要求新 Contract 保留旧 path、DTO、分页、error code 或客户端兼容字段。

## 7. 新 operation 不存在，但不是 Contract 缺陷

| 旧行为 / 字段 | 当前业务是否要求 | Finding |
|---|---|---|
| `/audit-logs/client-errors` 浏览器 telemetry | 否；正式审计由服务端关键操作产生 | `NOT_CONTRACT_DEFECT`；不把客户端日志上报混入审计 Contract |
| `/me/preferences` 服务端语言/主题 | 否 | `NOT_CONTRACT_DEFECT`；客户端本地偏好 |
| push-device/短信/邮件结果通知 | 否；只有站内通知 | `NOT_CONTRACT_DEFECT` |
| endurance 手工 preview/学生试算 | 否；教师确认真实用时，系统权威换算 | `NOT_CONTRACT_DEFECT` |
| Record PENDING/逐条批准/reopen | 否；提交默认 VALID，教师事后复核 | `NOT_CONTRACT_DEFECT` |
| add-sixty-minutes、补录虚构学时、修改正式时长 | 明确 REJECTED | `NOT_CONTRACT_DEFECT` |
| Record draft/update/attempt/resubmission | 明确不属于正式流程 | `NOT_CONTRACT_DEFECT` |
| Session cancel/advance-duration/test tools | 正式状态机不包含或 DEV_ONLY | `NOT_CONTRACT_DEFECT` |
| 学生自由选课、多 ACTIVE course、模拟扫码成功 | 明确 REJECTED/DEV_ONLY | `NOT_CONTRACT_DEFECT` |
| 管理员创建/编辑/关闭课程或查看单条 Record/media | 明确越过责任教师边界 | `NOT_CONTRACT_DEFECT` |
| 独立归档/恢复 semester | 归档只由 current switch 产生 | `NOT_CONTRACT_DEFECT` |
| 学生资料写、教师账号启停/恢复审批、强制登出、验证码解锁、全量 purge | 当前管理页面未授权或明确禁止 | `NOT_CONTRACT_DEFECT` |
| 教师本人注销 | 明确不提供 | `NOT_CONTRACT_DEFECT` |
| 永久媒体 URL、内部 object key、thumbnail 私有字段 | 隐私模型明确拒绝 | `NOT_CONTRACT_DEFECT`；使用短时 authorization |
| 教师 Dashboard 的“需关注 Record”本地规则 | 业务没有冻结判定条件 | `BUSINESS PENDING`；不能从旧 PENDING/异常字段反推 CR |
| Web 专属 QR deep link、永久 invitation plaintext | 业务未要求，且 raw secret 受限 | `NOT_CONTRACT_DEFECT` |

## 8. 迁移影响与禁止项

- 学生端仍是 plain JS/raw JSON + `api.js`；Portal 仍有手写 `api-client.ts`、旧 generated snapshot 与页面 DTO。存在旧引用本身不构成 CR。
- 已完整支持的行只允许重建 API Adapter/Repository/Use Case/UI State；Contract DTO 不应继续进入页面层。
- mixed 行必须拆开：例如 allocation response 可读但 direct upload 等 CR-005；ACTIVE invitation 可迁移但终止状态等 CR-004；管理员列表可迁移但全局 summary 等 CR-007～010。
- 已撤销、越权或 DEV_ONLY 的旧行为应删除/隔离，不能为“迁移方便”新增 operation。
- 不允许旧、新 response 双兼容、私有字段、`null/404` 猜测、硬编码 upload method、全量分页本地 total、Fake Success 或失败回退 Mock。

## 9. 输出结论

```text
LEGACY_MIGRATION：现行 Contract 已完整支持的正式 Use Case，只迁移客户端边界
PROPOSED CR：12 份唯一 CR；Web 新建 8，复用既有 4
DUPLICATE：CR-001～004 的 Web 命中未重复建档
NOT_CONTRACT_DEFECT：旧行为已撤销/越权/DEV_ONLY/客户端本地，或现行 Contract 已可组合表达
BUSINESS PENDING：教师 Dashboard“需关注 Record”的判定口径，等待业务权威决定
```
