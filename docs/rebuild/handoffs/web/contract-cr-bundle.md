# Phase 5B Web Contract CR Bundle

> 日期：2026-08-31（Asia/Shanghai）
>
> 审查状态：`DONE (READ-ONLY CONTRACT AUDIT)`
>
> Phase 5B 总状态：`PARTIAL`（核心 Contract 审查完成；PROPOSED CR 尚未评审，剩余严格 Mock/客户端迁移/Backend 验证未执行）
>
> Contract 基线：`1.0.0-contract` / `RC` / `/api/v1` / SHA-256 `ff15441b84f0729626a49c6898ea4896e80321b8e873a933768a509fd4c8478f`

## 1. 审查边界与判定方法

本轮只审查 Web 学生端、教师 Portal、管理员 Portal 的核心页面和 Use Case。没有修改 OpenAPI、Contract source/metadata/version/SHA、Web 源码、Mock、测试、业务文档、Backend 或数据库。

每个旧 API/旧 DTO 命中都先回答：

1. 现行 RC 是否已有对应 operation；
2. operation 与现行 schema/error/status 是否完整支持当前业务语义；
3. 完整支持时只记 `LEGACY_MIGRATION`；
4. 只有现行 RC 自身缺 operation、字段、状态码、错误码或唯一语义时才建立 `PROPOSED` CR。

逐项旧边界结论见 [Legacy Migration Findings](legacy-migration-findings.md)。本 Bundle 中的 `PASS` 只表示静态 Contract 可表达，不证明 Backend、权限、事务、并发、真实数据库、对象存储、浏览器或部署正确。

## 2. Bundle 总结

| 分类 | 数量 | 结论 |
|---|---:|---|
| `BLOCKING` | 4 | CR-001、CR-002、CR-003、CR-005；分别阻塞 Session 空态、媒体拒绝、PENDING 本人资料和全部直传协议 |
| `LOCAL` | 8 | CR-004、CR-006～CR-012；各自限制一个邀请、管理摘要、初始空态或课程创建错误场景，不停止其他页面审查 |
| `DUPLICATE` | 4 个 Web 发现，0 个新文件 | CR-001～CR-004 已由 Phase 5A 建档；Web 复用原 CR，没有重复创建 |
| `NOT_CONTRACT_DEFECT` | 见第 7 节 | 新 Contract 已支持、旧行为已退役/DEV_ONLY、客户端本地事项或业务仍 PENDING；不创建 CR |

本次 Web 审查最终 Bundle 含 **12 份唯一 PROPOSED CR**：复用既有 4 份，新建 8 份。没有接受、修复或批准任何 CR；RC metadata、版本和 SHA 均未提升。

## 3. 已发现全部 CR 清单

| CR | 主分类 | Web 处置 | 新 operation 状态 | 现行 RC 缺口 | 主要阻塞场景 |
|---|---|---|---|---|---|
| [CR-001](../../../../contracts/change-requests/CR-20260831-001-active-session-empty-state.md) | `BLOCKING` | `DUPLICATE`，复用 | `getOwnActiveExerciseSession` 已存在 | description 规定无 Session 为 404，但 operation 无 404 response/`RESOURCE_NOT_FOUND` | 学生 Web 运动页 Idle 恢复及完整 Session 起点 |
| [CR-002](../../../../contracts/change-requests/CR-20260831-002-media-finalization-rejection-channel.md) | `BLOCKING` | `DUPLICATE`，复用 | `finalizeMediaAsset` 已存在 | REJECTED/EXPIRED 同时可走 200 DTO 与多种 ErrorEnvelope，rejectionCode 无稳定映射 | Record/申请媒体权威拒绝、过期、重选/重试 |
| [CR-003](../../../../contracts/change-requests/CR-20260831-003-student-dashboard-profile-projection.md) | `BLOCKING` | `DUPLICATE`，复用 | `getStudentDashboard/getCurrentActor` 已存在 | PENDING 时 course/progress 可空，完整 StudentSummary 没有稳定本人读取位置 | PENDING 学生 Web 根工作区、资料页和再次入班预填 |
| [CR-004](../../../../contracts/change-requests/CR-20260831-004-invitation-preview-terminal-state-channel.md) | `LOCAL` | `DUPLICATE`，复用 | `previewCourseInvitation` 已存在 | 四个终止状态同时出现在 200 DTO 与 422 `INVITATION_INVALID` 语义；ACTIVE 允许 course=null | 学生 Web 邀请终止状态预览 |
| [CR-005](../../../../contracts/change-requests/CR-20260831-005-direct-upload-http-method.md) | `BLOCKING` | 新建 | media/roster allocation 已存在 | 两种 allocation DTO 与全局 conventions 均未公开短时 URL 的 HTTP method | Record、申请、名单三类浏览器直传 |
| [CR-006](../../../../contracts/change-requests/CR-20260831-006-teacher-invitation-management-read.md) | `LOCAL` | 新建 | create/revoke 已存在；teacher read 不存在 | reload/换设备后无法取得 revoke 所需 invitationId/version，raw code 又禁止持久化 | 教师稍后停止使用邀请、邀请管理空/内容态 |
| [CR-007](../../../../contracts/change-requests/CR-20260831-007-semester-management-summary.md) | `LOCAL` | 新建 | `listSemesters` 已存在 | 无 current + UPCOMING count + ARCHIVED count 的全局 summary | 管理员学期页顶部摘要 |
| [CR-008](../../../../contracts/change-requests/CR-20260831-008-admin-feedback-summary.md) | `LOCAL` | 新建 | feedback 管理 operations 已存在 | 无 total/pending/waiting-tech/completed 全局 counts | 管理员反馈概况卡片 |
| [CR-009](../../../../contracts/change-requests/CR-20260831-009-admin-help-center-summary.md) | `LOCAL` | 新建 | help 管理 operations 已存在 | 无 published/draft/archived 全局 counts | 管理员帮助中心概况卡片 |
| [CR-010](../../../../contracts/change-requests/CR-20260831-010-sub-admin-governance-summary.md) | `LOCAL` | 新建 | sub-admin 管理 operations 已存在 | 无 total/ACTIVE 全局 counts；固定八项权限本身已支持 | 总管理员分管理员治理摘要 |
| [CR-011](../../../../contracts/change-requests/CR-20260831-011-current-semester-absence-channel.md) | `LOCAL` | 新建 | current semester/dashboard reads 已存在 | RC 明确允许无 current，但 standalone 只有非空 200，TeacherDashboard 也强制非空 | 首次学期建立前的教师/管理员 Web 空态 |
| [CR-012](../../../../contracts/change-requests/CR-20260831-012-create-course-semester-error-semantics.md) | `LOCAL` | 新建 | `createCourse` 已存在 | CURRENT 目标却声明 `SEMESTER_NOT_UPCOMING`，且 unknown semesterId 无 404 | 教师课程创建的非 current/unknown/no-current 错误态 |

## 4. UI → Contract → 数据库静态审查矩阵

| 核心页面 / Use Case | UI 所需语义 | 现行 Contract | Phase 3 数据设计 | 结论 |
|---|---|---|---|---|
| 三角色密码/OTP 登录 | 身份类型、成功 actor/token、失败 code | `createStudentSession`、`createPasswordSession`、`SessionTokenPair`、ErrorEnvelope | account/credential/session/challenge | `PASS (STATIC)` |
| 会话恢复、改密、找回、退出 | actor、mustChangePassword、proof、token revoke | auth/identity operations 完整 | credential/session/tokenVersion | `PASS (STATIC)` |
| 系统模式门禁 | NORMAL/MAINTENANCE、双语公告、恢复时间、fail closed | `getSystemMode` 及 operation 语义 | mode singleton/transition | `PASS (STATIC)` |
| 学生根工作区 | actor、0/1 current course、进度、耐力、成绩、通知 | `StudentDashboard` 可表达课程/结果空态 | current projections | `PARTIAL`；完整 PENDING 本人资料受 CR-003 |
| 学生邀请加入 | ACTIVE 预览、既有/新学生直接入班 | preview/join/register operations | invitation digest + ACTIVE Enrollment unique | `PARTIAL`；终止预览受 CR-004 |
| 学生运动 Session | ACTIVE/PAUSED/COMPLETED、服务端时间/业务日期 | session read/mutations | session/interval/current unique | `PARTIAL`；无 Session 空态受 CR-001 |
| Record/申请媒体 | allocation、直传、finalize、短时查看 | media operations 与 policy 除 method/拒绝通道外完整 | MediaAsset lifecycle | `BLOCKED`：CR-002、CR-005 |
| Record 提交与历史 | 服务端实际时长、0/60/120、VALID/INVALID、媒体、Review | record operations/DTO 完整 | Record + current Review | `PASS (STATIC)` |
| 学生进度、耐力、最终成绩 | 两类封顶、UNRECORDED/MEASURED/EXEMPT、最新发布成绩 | statistics/endurance/final-grade reads | progress views/outcome/publication | `PASS (STATIC)` |
| 学生申请 | 正式创建、列表/详情、补材料、四状态 | application operations 完整 | submission/decision/credit history | `PASS (STATIC)`；媒体失败另受 CR-002/005 |
| 学生反馈、帮助、通知 | 内容/空态/错误、已读 | student feedback/help/notification operations | ticket/article/notification | `PASS (STATIC)` |
| 教师登录与首次改密 | email 登录、mustChangePassword 门禁、个人改密 | password session/current actor/change password | credential/session | `PASS (STATIC)` |
| 教师工作台 | current semester/mode、课程/成员/目标、名单/耐力/申请/成绩摘要 | dashboard + mode + own courses 可组合 | current indexes/views | `PARTIAL`；无 current 受 CR-011；“需关注 Record”口径仍 BUSINESS PENDING |
| 教师课程管理 | 当前课程内容、创建/影响预览/编辑/关闭 | course operations/DTO 完整 | Course/TargetRevision/version | 成功/内容 `PASS`；创建学期错误受 CR-012 |
| 教师课程邀请 | 创建、初次安全展示、停止使用 | create/revoke/preview | course_invitation | `PARTIAL`；可恢复管理 read 受 CR-006，学生终止预览受 CR-004 |
| 教师成员管理 | current/removed 成员、移出/恢复 | member list/removal/restoration | Enrollment/current unique/event | `PASS (STATIC)` |
| 官方名单 | CSV/XLSX、快照、五类 finding、处理、回退 | roster operations/DTO 完整 | snapshots/findings/current pointer | `PARTIAL`；直传 method 受 CR-005 |
| 打卡复核列表/详情/操作 | 默认 VALID、内容/媒体、追加 INVALID/VALID、历史 | record review operations/DTO 完整 | append-only Review/current pointer | `PASS (STATIC)`；不存在 PENDING 审批队列 |
| 教师统计 | 学生两类进度、封顶分钟、完成率 | `listCourseProgress/getCourseMemberProgress` | progress views/indexes | `PASS (STATIC)` |
| 教师申请/耐力/成绩 | 四状态决策、认证 credit、真实用时、任意 INT 发布/历史 | application/endurance/final-grade operations | decision/outcome/publication history | `PASS (STATIC)` |
| 管理员系统概览 | mode、可空 current、账号/规则摘要、五个健康 component | `AdminDashboard` | account/mode/health projections | `PASS (STATIC)` |
| 管理员当前课程目录 | 三项全局 summary、课程指标、只读详情 | admin current-course operations/DTO | student-level capped views | `PASS (STATIC)` |
| 学期管理 | list/item/create/edit/switch 与顶部摘要 | operations/item 完整；summary/absence 不完整 | semester/status/transition indexes | `PARTIAL`：CR-007、CR-011 |
| 教师/学生账号管理 | 教师批量校验/建立/删除；学生只读查询/详情 | accounts operations/DTO 完整 | profiles/credentials/history subject | `PASS (STATIC)` |
| 分管理员治理 | list/detail/create/edit/启停/delete + page summary | mutations/DTO 完整；summary 不完整 | admin profile/grants/access state | `PARTIAL`：CR-010 |
| 反馈管理 | list/detail/process/replies + global overview | operations/DTO 完整；summary 不完整 | feedback status/reply/index | `PARTIAL`：CR-008 |
| 四套耐力规则 | table list/detail、一处变更、整表验证/版本 | endurance admin operations/DTO 完整 | revision/interval/current pointer | `PASS (STATIC)` |
| 系统模式管理 | current、历史、受控切换、公告 | system mode operations/DTO 完整 | singleton/transition/audit | `PASS (STATIC)` |
| 帮助中心管理 | bilingual CRUD/state flow + global overview | operations/DTO 完整；summary 不完整 | article/revision/keyword/index | `PARTIAL`：CR-009 |
| 审计与运行日志 ZIP | filter/list/detail、异步 job、短时下载 | audit operations/DTO 完整 | append-only event/archive job | `PASS (STATIC)` |

数据库列只表示 `DESIGN-SUPPORTED`。没有 migration、运行中 PostgreSQL、RLS、query plan、事务或并发证据。

## 5. 已验证通过的场景

以下均为 `PASS (STATIC CONTRACT)`，可在不添加私有字段的前提下构造严格内容、空数组与已声明 ErrorEnvelope：

- 教师/管理员登录、首次改密门禁、找回密码、refresh、当前/全部退出和 system-mode 门禁；
- 教师本人课程内容、课程 change-impact/update/closure、成员移出/恢复；
- 打卡复核列表、详情、媒体 metadata、追加 VALID/INVALID、审核历史与课程进度统计；
- 申请列表/详情/决策、认证学时调整/撤销、耐力用时确认与最终成绩发布/重发；
- 管理员 Dashboard 及 `currentSemester=null`、五种 health component、当前课程目录三项 summary 与详情；
- 学期 item/list 空数组、创建/编辑/切换成功路径；
- 教师账号 CSV 校验/批量建立/删除、学生账号只读列表/详情；
- 分管理员详情和 create/update/enable/disable/delete 成功/错误结构；
- feedback list/detail/process、help article CRUD/state transition、四套耐力规则、system-mode history/switch、audit list/detail/archive/download；
- 学生 Record/进度/耐力/成绩/反馈/帮助/通知及 ACTIVE invitation/join 成功路径。

此前代表性 Phase 5B Mock 已对教师登录、课程、打卡复核、审核、统计、管理员概览和当前课程目录做过内容/空/错态浏览器验证；该证据不扩展到本次新增审查的剩余页面，也不证明 Backend。

## 6. 被 CR 阻塞的场景

| 场景 | 阻塞 CR | 仍可继续的独立验证 |
|---|---|---|
| 学生运动页无进行中 Session 的 Idle 恢复 | CR-001 | 已存在 Session 内容与各 transition |
| Record/申请媒体 REJECTED/EXPIRED 的唯一处理 | CR-002 | VERIFIED 成功 finalization 与正式 DTO |
| PENDING 学生完整本人资料/再次入班预填 | CR-003 | CurrentActor、email、studentStatus 与 ACTIVE progress |
| EXPIRED/REVOKED/COURSE_CLOSED/NOT_CURRENT 邀请预览 | CR-004 | ACTIVE preview、join/register 成功 |
| Record image/video、申请 image、名单 CSV/XLSX 的真实直传请求 | CR-005 | allocation API response 外形、finalize/import operation 本身 |
| 教师 reload 后列出并撤销已有邀请 | CR-006 | 创建当次 raw code 展示、持有当次 ID 时撤销 |
| 学期页 current/UPCOMING/ARCHIVED 顶部摘要 | CR-007 | Semester items、筛选、create/update/switch |
| Feedback 全局 total/pending/waiting-tech/completed 概况 | CR-008 | 列表、搜索、详情、处理/公开回复 |
| Help 全局 published/draft/archived 概况 | CR-009 | 列表、编辑、发布/下线/重新上线 |
| 分管理员 total/ACTIVE 概况 | CR-010 | 列表 item、详情和治理 mutations |
| 尚无 CURRENT 时的 standalone/teacher dashboard 空态 | CR-011 | 已有 current 内容态；AdminDashboard 既有 null |
| 创建课程的 non-current/unknown/no-current 精确错误态 | CR-012（并关联 CR-011） | CURRENT 成功创建与 target validation |

## 7. DUPLICATE 与 NOT_CONTRACT_DEFECT

### DUPLICATE

- Web 学生运动恢复再次命中活动 Session 空态：复用 CR-001。
- Web 媒体 finalize 再次命中拒绝/过期双通道：复用 CR-002。
- Web 学生 PENDING workspace/资料页再次命中稳定 StudentSummary 缺口：复用 CR-003。
- Web 邀请页再次命中已知终止状态双通道：复用 CR-004。

### NOT_CONTRACT_DEFECT / BUSINESS PENDING

| 候选问题 | 结论 |
|---|---|
| 旧“待审核列表”需要 PENDING Record 状态 | `NOT_CONTRACT_DEFECT`；正式 Record 提交即 VALID，教师只做事后复核，不新增旧审批队列 |
| 旧 class-section/course/enrollment fan-out 与 N+1 | 新 Dashboard/course/member operations 已支持业务；属于 `LEGACY_MIGRATION` 与客户端分层，不要求新 Contract 兼容旧聚合 |
| 旧 admin/teacher/student DTO 字段更多 | 只有业务权威要求且现行 RC 缺失才建 CR；其余旧字段不得反推到新 Contract |
| `getOwnCurrentCourse/getOwnCourseProgress` 无独立 null success | `StudentDashboard.course/progress` 已提供根页面空态，独立 operation 只用于 ACTIVE scope |
| SystemMode announcement schema 可空 | operation 与业务权威已要求进入 MAINTENANCE 时提供双语公告；属于 Backend conformance/schema-hardening 候选 |
| AdminDashboard health 数组未结构化证明每个 component 恰好一次 | closed enum + 5 items 能表达页面；真实唯一性留给 Contract conformance，不影响严格合法 fixture |
| 教师 Dashboard“需要关注的打卡记录”无 count | 业务尚未定义“需要关注”的判定条件；标记 `BUSINESS PENDING`，不能用旧 PENDING/异常字段发明 CR |
| 永久媒体/thumbnail URL | 隐私模型要求 `authorizeMediaDownload` 短时授权；不增加永久 URL |
| 二维码 deep link/payload 格式 | 业务只要求二维码或邀请码，现行 raw code 可作为 QR payload；未授权平台 deep-link 方案 |
| 客户端 telemetry `/audit-logs/client-errors` | 不属于当前正式审计业务闭集；没有 operation 不构成 Contract defect |
| Web preferences、系统 Push、通知全部已读 | 客户端本地偏好、已明确排除的 Push 或可由单条天然幂等 read 组合；不建 CR |
| 旧 endurance preview/试算 | 正式学生只读 outcome、教师确认真实用时；旧试算不是当前业务 |
| 增加 60 分钟、Record 重提/attempt、Session cancel、多活动课程、管理员课程写、教师本人注销 | 已撤销或明确不属于相应角色；不要求新 Contract 兼容 |

## 8. 尚未验证场景及原因

| 场景 | 状态 | 原因 |
|---|---|---|
| 剩余 Web 页面严格 RC Mock 内容/空/错态 | `NOT EXECUTED / PARTLY BLOCKED` | 本轮只读审查；CR-001～012 仍为 PROPOSED，不允许增加私有 fixture |
| 两个 Web 项目实际迁移到 root RC | `NOT EXECUTED` | 学生 Web 与 Portal 仍有旧 API/DTO/generated snapshot；本轮禁止改源文件 |
| Teacher Dashboard “需关注 Record” | `UNVERIFIED / BUSINESS PENDING` | 判定口径未在四份权威业务文档冻结 |
| Backend operation、权限、maintenance、error mapper、幂等 | `NOT EXECUTED` | 尚无 conformance/runtime 证据 |
| PostgreSQL migration、真实查询、RLS、事务、并发、query plan | `NOT EXECUTED` | 数据库仅 `DESIGN-SUPPORTED` |
| COS 直传、探测、短时下载 | `NOT EXECUTED / BLOCKED` | 无真实对象存储，且 CR-002/005 未冻结 |
| 浏览器完整三角色、响应式、可访问性、恢复/重试 | `NOT EXECUTED` | 本轮禁止 Web 实现和新 Mock；既有代表性 Slice 不等于全站 |
| Android/Web 同版本 binding 与跨端 E2E | `NOT EXECUTED` | CR 未评审，Android/Web 尚未共同加载新版本 |
| Staging、Production、部署与发布 | `NOT EXECUTED` | 超出只读 Contract 审查授权 |

## 9. 与 Android 语义可能冲突的 Contract 问题

- CR-001～004 已是 Android/Web 共同语义问题，Web 直接复用，不建立平台分叉。
- CR-005 是新的明确跨端风险：旧客户端可能都默认 PUT，但现行 RC 没有公开 method；任何一端私下固定值都会形成不同于 Contract 的隐藏协议。
- CR-011 的 standalone current-semester absence 可能让旧 Web 的 404→null 与 Android 的 required current projection产生分歧；必须由一个新 Contract 版本统一。
- CR-006～010、CR-012 主要属于教师/管理员 Web 页面，不直接改变 Android 学生业务；CR-004 仍单独负责学生邀请预览。
- 没有发现需要按旧 Android DTO 或旧 Web DTO保持兼容的合理要求。

## 10. 当前结论与下一步前置

1. 当前 `1.0.0-contract` 仍标记 RC 且 SHA 未变，但本轮没有重新批准或提升它；12 份 CR 均为 `PROPOSED`。
2. 独立 Contract review 必须逐份接受、拒绝或要求修改；本任务不进入修复。
3. 只有接受项完成 Contract source 修改、版本提升和新 SHA 后，Web/Android 才能加载同一 binding 并继续严格 Mock。
4. 已完整支持的旧边界只按 [Legacy Migration Findings](legacy-migration-findings.md) 迁移，禁止兼容字段、双通道 fallback 和 Fake Success。
