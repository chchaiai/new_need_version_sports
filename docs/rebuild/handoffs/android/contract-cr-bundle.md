# Phase 5A Android Contract CR Bundle

> 日期：2026-08-31（Asia/Shanghai）
>
> 审计状态：`DONE`
>
> Phase 5A 总状态：`PARTIAL`（CR 全量续审完成；严格 RC Mock、Android 源码迁移与 Contract 修复均未执行）
>
> 模式：只读审查；只新增/更新治理文档与 `PROPOSED` CR

## 1. 基线、范围与边界

| 项目 | 结果 |
|---|---|
| Git 根目录 | `C:\Users\23328\Desktop\new_version` |
| 分支 | `API-contract-Making` |
| 续审起始 HEAD | `ab7dbec139bd5a14896ac41a4ca6b9eb17442bd3` |
| 收口时 HEAD | `81f45feb441a9e5ddba0e265eac98e1c4d3eee48`；共享工作区中的 Phase 5B 任务在本次审计期间提交并推进 HEAD，本任务未 reset、stash、覆盖或改写该提交 |
| Contract 基线 | `1.0.0-contract` / `RC` / `/api/v1` / SHA-256 `ff15441b84f0729626a49c6898ea4896e80321b8e873a933768a509fd4c8478f` |
| 权威输入 | 根 `AGENTS.md`、[STATUS](../../STATUS.md)、四份业务权威、[Android 旧 API 审计](../../inventories/android-legacy-api.md)、Contract OpenAPI/catalog/coverage/database-support，以及初次 [Phase 5A handoff](../phase-5a-android-core-contract-mock-validation.md) |
| 已审 Android 面 | 启动门禁、认证、课程/入班、Dashboard、运动 Session、媒体、Record、进度、耐力结果、成绩、申请、反馈、帮助、通知、本人资料、账号安全及本地静态页面；同时检查相关 Repository、Gateway、Controller、State 与现有 `LoadExemptionProofPreviewsUseCase` |
| 允许修改 | `contracts/change-requests/*.md`、`docs/rebuild/STATUS.md`、`docs/rebuild/handoffs/**` |
| 禁止修改 | OpenAPI/Contract source/metadata/version/SHA、Android 源码/测试/Mock、Web、Backend、业务文档、数据库与部署文件 |

本次判定不以旧 Endpoint、旧 DTO 或旧 `3.0.0-contract` 的形状为需求来源。所有旧边界先执行以下门禁：新 Contract operation 是否存在、是否完整支持当前业务权威和页面语义；完整支持时只记为 `LEGACY_MIGRATION`。逐项结果见 [Legacy Migration Findings](legacy-migration-findings.md)。

## 2. Bundle 总结

| 分类 | 数量 | 条目 | 结论 |
|---|---:|---|---|
| `BLOCKING` | 3 | `CR-20260831-001`、`CR-20260831-002`、`CR-20260831-003` | 分别阻塞 Session Idle、媒体权威拒绝以及 PENDING 学生稳定本人资料；会影响一个或多个核心闭环的大量严格 fixture/页面验证 |
| `LOCAL` | 1 | `CR-20260831-004` | 只阻塞邀请码四种终止状态；ACTIVE 邀请及加入成功路径仍可独立验证 |
| `DUPLICATE` | 1 个发现、0 个新文件 | 续审再次命中“无进行中 Session”的空态缺口 | 与既有 `CR-20260831-001` 相同，保留原 CR，没有创建第二份 CR |
| `NOT_CONTRACT_DEFECT` | 见第 6 节 | 旧产品行为、客户端本地能力、可由现有 Contract 表达的空态及待业务决定项 | 不创建 CR；分别归入 `LEGACY_MIGRATION`、客户端本地事项、已撤销行为或业务 `PENDING` |

最终共有 **4 份唯一 `PROPOSED` Android CR**。没有批准任何 CR，没有修改 Contract，没有提升版本，也没有生成新 SHA。

## 3. 完整 Android CR 清单

| CR | 分类 | 新 Contract operation | Contract 自身缺口 | 阻塞场景 | 可继续验证的场景 |
|---|---|---|---|---|---|
| [CR-20260831-001](../../../../contracts/change-requests/CR-20260831-001-active-session-empty-state.md) | `BLOCKING` | `getOwnActiveExerciseSession` 已存在 | description 规定无 Session 为 404，但 operation 未声明 404 response，也未声明 `RESOURCE_NOT_FOUND` | 运动页恢复、Idle/可开始空态，以及依赖该空态进入的严格开始流程 | 已存在 Session 的内容态；start/pause/resume/complete 的合法内容/错误结构 |
| [CR-20260831-002](../../../../contracts/change-requests/CR-20260831-002-media-finalization-rejection-channel.md) | `BLOCKING` | `finalizeMediaAsset` 已存在 | 同一权威拒绝/过期既可落入 `200 MediaAsset(REJECTED/EXPIRED)`，又可落入 409/413/415/422 `ErrorEnvelope`；`rejectionCode` 无稳定映射 | Record 证据与申请材料的拒绝、过期、重选/重试决策，以及跨端一致 fixture | allocation、直传授权、`VERIFIED` 成功 finalization、下载授权与后续成功提交 |
| [CR-20260831-003](../../../../contracts/change-requests/CR-20260831-003-student-dashboard-profile-projection.md) | `BLOCKING` | `getStudentDashboard` 与 `getCurrentActor` 已存在 | `PENDING` 合法状态下 `course/progress` 可同时为 null，而完整 `StudentSummary` 只嵌在可空 progress；没有 ACTIVE/PENDING 都稳定的本人资料投影 | PENDING 根工作区、完整个人资料/账号详情、再次入班资料预填及 Android/Web 资料来源一致性 | 通用 actor、verified email、account status、studentStatus；ACTIVE 且 progress 非空时的课程/进度 |
| [CR-20260831-004](../../../../contracts/change-requests/CR-20260831-004-invitation-preview-terminal-state-channel.md) | `LOCAL` | `previewCourseInvitation` 已存在 | `EXPIRED/REVOKED/COURSE_CLOSED/NOT_CURRENT` 同时出现在 `200 CourseInvitationPreview.status` 与 `422 INVITATION_INVALID` 语义中；ACTIVE 又允许 `course=null` | 四种已识别终止状态的预览、文案和跨端映射 | ACTIVE 预览、已登录学生加入、新学生注册并加入，以及通用错误结构 |

### 3.1 为什么这四项是 CR，而不是旧边界迁移

四项都满足同一条件：目标 Use Case 的新 operation 已经存在，但当前 RC 自身缺少唯一且可生成、可测试的字段/状态码/错误码/语义。缺口可以直接从当前业务权威和当前 RC 的内部不一致或不可达投影证明，不依赖旧 DTO 的字段形状。

## 4. 已验证通过的场景

以下 `PASS` 仅表示 **当前 RC 静态上能够严格表达内容、空态或错误态**；本轮没有创建 Android Mock，也没有证明真实 Backend、权限、事务、并发或设备 UI 正确。

| 页面 / Use Case | 已验证语义 | 结论 |
|---|---|---|
| 启动版本策略 | `getAppReleasePolicy` 可表达允许、建议升级、强制升级；辅助请求失败与已缓存强制升级不可被清除的语义已写入 Contract | `PASS (STATIC CONTRACT)` |
| 系统模式 | `getSystemMode` 可表达 NORMAL/MAINTENANCE，维护公告由 operation 语义和业务权威约束；错误可 fail closed | `PASS (STATIC CONTRACT)` |
| 学生 OTP 登录 | `requestAuthChallenge → createStudentSession`，成功为 `SessionTokenPair`，失败为 operation 级 `ErrorEnvelope` | `PASS (STATIC CONTRACT)` |
| 会话恢复/退出 | `refreshSession`、`getCurrentActor`、`logoutCurrentSession/logoutAllSessions` 的角色、结果和错误结构完整 | `PASS (STATIC CONTRACT)` |
| 换绑学校邮箱 | `changeOwnVerifiedEmail` 要求当前与新邮箱独立 proof，并原子返回 `CurrentActor` | `PASS (STATIC CONTRACT)` |
| 注销账号 | `getOwnAccountDeletionImpact` 加 `deleteOwnAccount` 可表达 blocker、二次验证、删除结果和保留事实 | `PASS (STATIC CONTRACT)` |
| 当前课程内容/空态 | `StudentDashboard.course/progress` nullable 可表达 0/1 当前课程；`StudentCourse` 提供学期、责任教师、时间窗和两类目标 | `PASS (STATIC CONTRACT)`；完整 PENDING 本人资料另受 CR-003 阻塞 |
| ACTIVE 邀请与加入 | ACTIVE 预览内容、`joinCourseByInvitation`、`registerStudentAndJoinCourse` 的成功和错误结构可表达 | `PASS (STATIC CONTRACT)`；终止预览另受 CR-004 阻塞 |
| Session 内容与控制 | `ExerciseSession` 的 ACTIVE/PAUSED/COMPLETED、服务端时间/业务日期/实际时长/version，以及 start/pause/resume/complete 请求均可表达 | `PASS (STATIC CONTRACT)`；无 Session 空态另受 CR-001 阻塞 |
| 媒体成功链 | purpose-aware allocation、短期上传授权、`VERIFIED` finalization、短期下载授权均有明确 DTO | `PASS (STATIC CONTRACT)`；拒绝/过期另受 CR-002 阻塞 |
| Record 提交 | `SubmitExerciseRecordRequest` 只含 `category/description/mediaAssetIds`；服务端返回实际时长、0/60/120 计入分钟、业务日期、媒体与当前 Review | `PASS (STATIC CONTRACT)` |
| 个人 Record | 列表 `items=[]`、内容分页、详情、审核历史及统一错误均可表达 | `PASS (STATIC CONTRACT)` |
| 学时进度 | 两类 `ExerciseCategoryProgress`、认证分钟、分类封顶、总分钟和 display percent 可表达；客户端可按 enum 映射，不能按数组位置猜测 | `PASS (STATIC CONTRACT)` |
| 耐力结果 | UNRECORDED、MEASURED（换算结果可空）、EXEMPT 的学生结果投影可表达 | `PASS (STATIC CONTRACT)` |
| 最终成绩 | 未发布与已发布结果均可表达，且读取范围允许当前或历史 Enrollment | `PASS (STATIC CONTRACT)` |
| 学生申请 | 正式创建、本人列表/空态、详情、补充材料、决定历史和错误可表达 | `PASS (STATIC CONTRACT)`；媒体拒绝另受 CR-002 阻塞 |
| 反馈 | 创建、本人列表/空态、详情、处理状态和错误可表达 | `PASS (STATIC CONTRACT)` |
| 帮助中心 | 发布文章列表、搜索/语言/分类过滤、详情、空态和错误可表达；客户端缓存必须明确标记为缓存 | `PASS (STATIC CONTRACT)` |
| 站内通知 | 列表/空态、未读数、单条天然幂等已读、导航 payload 和错误可表达 | `PASS (STATIC CONTRACT)` |
| 通用本人信息 | `CurrentActor` 可表达 actor、角色、verified email、account status；Dashboard 可表达 `studentStatus` | `PASS (STATIC CONTRACT)`；完整 StudentSummary 另受 CR-003 阻塞 |
| 本地设置与静态页 | 语言/主题本地偏好、隐私、关于、更新日志、Onboarding 及“无法使用邮箱”管理员联系指引不需要服务端私有字段或新增 operation | `PASS (CLIENT-LOCAL BOUNDARY)` |

## 5. 被 CR 阻塞的场景

| 场景 | 阻塞 CR | 当前可做边界 |
|---|---|---|
| 运动页启动恢复后显示 Idle/“可开始” | CR-001 | 可以验证已有 Session 内容；不能用 `200 null`、空对象、私有错误码或 Fake Session 代替空态 |
| 从 Idle 发起的完整严格 Session→Record 核心闭环 | CR-001 | start operation 本身可静态验证；前置 Idle 响应未冻结，不能声称端到端 Mock 通过 |
| 打卡图片/视频权威拒绝、过期、重选与重试 | CR-002 | `VERIFIED` 成功链可验证；不得同时实现 DTO 与 ErrorEnvelope 两套猜测逻辑 |
| 申请材料权威拒绝、过期、重选与重试 | CR-002 | 正式申请及成功媒体链可验证；拒绝原因/通道未冻结 |
| PENDING 学生根工作区完整资料 | CR-003 | 可显示通用 actor/email/status；不得从本地注册输入或空列表补造 StudentSummary |
| 完整个人资料、账号详情及再次入班资料预填 | CR-003 | 不得复用旧 workspace/private profile DTO 作为兼容字段来源 |
| EXPIRED/REVOKED/COURSE_CLOSED/NOT_CURRENT 邀请预览 | CR-004 | ACTIVE 预览和加入成功路径继续可验证；终止状态不能在 200/422 间猜测 |

## 6. DUPLICATE 与 NOT_CONTRACT_DEFECT

### DUPLICATE

- 续审 Session 页面和恢复 Use Case 时再次发现“无进行中 Session”没有合法 response。它与既有 `CR-20260831-001` 完全相同，因此没有创建 `CR-20260831-005` 或其他重复文件。

### NOT_CONTRACT_DEFECT

| 候选 | 最终判断 |
|---|---|
| `getOwnCurrentCourse/getOwnCourseProgress` 没有独立空成功响应 | Dashboard 的 `course=null/progress=null` 已是学生根入口的规范空态；独立 operation 只在 ACTIVE Enrollment scope 下使用，不构成核心页面缺口 |
| `SystemMode.announcement` schema 可空 | operation 描述、切换请求和业务权威共同要求 MAINTENANCE 提供公告；严格 fixture 可遵守该不变量。属于 conformance/schema-hardening 候选，不是本次缺字段 CR |
| 进度 categories 只约束为 2 项，没有 schema 级“一类各一项” | `category` discriminator 与业务权威定义两类；客户端可按 enum 严格映射并拒绝畸形响应。运行时 conformance 未证明，但不缺 UI 字段 |
| Session 各状态下 nullable timestamp 的条件关系主要由描述约束 | 可构造严格合法 fixture；Backend conformance 仍需后续验证，不据此新增字段 |
| 应用证据没有永久 thumbnail URL | `mediaAssetId + authorizeMediaDownload` 已提供安全短期查看能力；客户端不得要求永久 URL 私有字段 |
| 通知没有“全部已读”批量 operation | 可对当前未读集合逐条调用天然幂等 `markOwnNotificationRead`；没有业务要求必须原子批量 |
| 历史课程/转班后的 Android 选课导航 | 业务权威尚未定义当前与历史投影的页面选择规则；标记业务 `PENDING/UNVERIFIED`，不能先用 CR 发明决定 |
| 旧密码登录、学生手工耐力换算、系统 Push、增加 60 分钟、Record 重提/attempt、多活动课程、旧申请草稿字段、资料编辑、计划维护横幅 | 这些是已退役、被业务排除、客户端本地或未获授权的旧行为；不得反向要求新 Contract 兼容。逐项见 Legacy Migration Findings |

## 7. 尚未验证的场景及原因

| 场景 | 状态 | 原因 |
|---|---|---|
| 严格 Android RC fixture 与核心 Compose 页面内容/空/错态 | `NOT EXECUTED / BLOCKED` | 本轮只允许审查；CR-001～004 尚为 `PROPOSED`，且 Android 仍绑定旧 snapshot |
| Android 与学生 Web 实际加载同一 Contract 后的字段一致性 | `NOT EXECUTED` | Android 仍为 `3.0.0-contract`；学生 Web 仍有旧 adapter；Phase 5B 只证明隔离教师/管理员预览，不等于学生端迁移 |
| PENDING/退班/历史课程导航 | `UNVERIFIED / BUSINESS PENDING` | 业务权威未冻结 Android 如何选择当前与历史课程；不是 Contract CR |
| Backend operation、认证、权限、maintenance、幂等与 error mapper | `NOT EXECUTED` | 无 Backend 实现/环境验证，静态 Contract 通过不能替代 conformance |
| PostgreSQL migration、真实查询、约束、事务、并发与 query plan | `NOT EXECUTED` | 数据库只达到 `DESIGN-SUPPORTED` |
| COS 上传/探测/授权下载 | `NOT EXECUTED` | 没有真实对象存储和 Backend；CR-002 还未冻结拒绝通道 |
| Android 设备、网络、离线/重试、进程恢复、跨设备账号删除 | `NOT EXECUTED` | 本轮禁止源码与运行时实现，且无集成环境 |
| 跨端 E2E、Staging、Production、部署与发布 | `NOT EXECUTED` | 超出 Phase 5A 审查授权；Mock 即便通过也不能证明这些层正确 |

## 8. 验证记录

| 命令 / 检查 | 真实结果 |
|---|---|
| `python contracts\scripts\verify_contract.py` | `PASS`；`109 paths / 120 unique operations / 183 schemas / 66 error codes` |
| `python contracts\scripts\check_rc_readiness.py` | `PASS`；当前 Contract 仍为 RC；不代表四份 PROPOSED CR 已批准 |
| OpenAPI SHA-256 | 仍为 `ff15441b84f0729626a49c6898ea4896e80321b8e873a933768a509fd4c8478f` |
| `:app:verifyOpenApiContractBinding :app:compileDebugKotlin` | `PASS`；只证明 Android 当前旧 snapshot 门禁与编译，不证明 RC 已迁移 |
| `:app:testDebugUnitTest` | `FAIL (PRE-EXISTING)`；328 tests / 1 failure：`AcceptedContractStaticPolicyTest.semesterUiUsesPublicLabelsAndWrapsWithoutInternalIdFallback`（`AcceptedContractStaticPolicyTest.kt:103`） |
| Android/OpenAPI/Web/Backend source diff | 本任务未修改；只产生 CR 与 Phase 文档 |

## 9. 下一阶段前置条件

1. 独立 Contract review 分别接受、拒绝或要求修改 CR-001～004；保持 `PROPOSED` 时不得进入客户端/Backend 兼容实现。
2. 对被接受的 CR 修改 Contract source，提升到新的可识别版本并生成新 SHA；禁止静默覆盖 `1.0.0-contract`。
3. Android 与学生 Web 分别清除旧边界并加载同一 Version + SHA；已被当前 RC 完整支持的旧调用只按 [Legacy Migration Findings](legacy-migration-findings.md) 迁移，不追加兼容字段。
4. 修复独立的 Android 既有 unit test 失败后，再执行严格 fixture、全量 unit/lint/assemble、Compose/设备和跨端字段一致性验证。
5. Backend 与数据库可用后再执行 Contract conformance、权限、幂等、事务、并发、媒体和 E2E；不得把本次静态审计升级为产品验收。

## 10. Phase 结束模板

```text
完成状态：PARTIAL（CR AUDIT DONE；严格 Mock/Contract 修复 NOT EXECUTED）
修改文件：4 份 PROPOSED CR（其中 CR-001 为既有保留）、STATUS、Phase 5A handoff、Android CR Bundle、Legacy Migration Findings
执行的测试：Contract verify/readiness/SHA、Android binding/compile/full unit、文档与范围检查
真实测试结果：Contract 校验 PASS；Android binding/compile PASS；Android unit 328 中 1 个既有失败
未执行测试及原因：未创建 RC Mock，故无 Compose/设备 Mock 验证；Backend/数据库/Web 学生端/E2E/Staging 超出本轮授权或缺少运行实现
是否修改了业务规则：否
是否修改了 Contract：否；只有 PROPOSED CR，版本和 SHA 未变
是否存在旧 API 引用：是；已逐项归类为 LEGACY_MIGRATION、NOT_CONTRACT_DEFECT 或与 CR 相关的迁移阻塞
是否存在 Mock、TODO、空接口：既有 legacy/debug/test Mock、TODO/空壳仍存在且未改；本轮没有新增 Mock、假数据、私有字段、TODO、stub 或兼容逻辑
下一阶段前置条件：独立评审 CR；接受项提升 Contract 版本/新 SHA；Android/Web 重载同一版本后再做严格 Mock 与运行验证
```
