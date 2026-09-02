# Phase 5A Android Legacy Migration Findings

> 日期：2026-08-31（Asia/Shanghai）
>
> 状态：`DONE (READ-ONLY AUDIT)`
>
> 目的：把旧 API、旧 DTO 与旧 Contract 命中从真正的新 Contract 缺陷中分离；本文不要求新 Contract 保持旧结构兼容

## 1. 强制判定门禁

每一个旧边界都按以下顺序回答：

1. 对应的新 Contract operation 是否已经存在？
2. 新 Contract 是否完整支持业务权威与页面/Use Case 所需语义？
3. 若存在且完整，结论必须是 `LEGACY_MIGRATION`，不是 CR。
4. 若 operation 不存在，先判断该旧行为是否仍属于当前业务；已撤销、DEV_ONLY、客户端本地或未获业务授权的行为是 `NOT_CONTRACT_DEFECT`。
5. 只有当前业务确实需要，且新 Contract 本身缺 operation、字段、状态码、错误码或唯一语义时，才允许提交 `PROPOSED` CR。

旧 `3.0.0-contract`、手写 DTO、`@SerializedName` 别名、旧错误码和旧 Endpoint 只能作为迁移库存，不能作为新需求来源。

## 2. 已完整支持：LEGACY_MIGRATION

| 旧边界 / 页面 | 当前业务语义 | 新 Contract operation | 是否存在 | 语义是否完整 | Finding |
|---|---|---|---|---|---|
| 旧 app release DTO/route | 启动最低版本、建议/强制升级与缓存门禁 | `getAppReleasePolicy` | 是 | 是 | `LEGACY_MIGRATION`；替换旧 DTO/绑定，不提交 CR |
| 旧 `SystemModeProjection` 与轮询 | NORMAL/MAINTENANCE、公告、错误 fail closed | `getSystemMode` | 是 | 是（业务/operation 语义约束维护公告） | `LEGACY_MIGRATION`；运行时 conformance 后验，不提交 CR |
| 旧 student sign-in-code request/verify | 邮箱 OTP 学生登录 | `requestAuthChallenge`、`createStudentSession` | 是 | 是 | `LEGACY_MIGRATION`；旧两条 route 不要求新 Contract 同形 |
| 旧 auth refresh/logout | 旋转会话、当前/全部退出 | `refreshSession`、`logoutCurrentSession`、`logoutAllSessions` | 是 | 是 | `LEGACY_MIGRATION` |
| 旧 `/me` 通用身份 | actor、角色、verified email、account status | `getCurrentActor` | 是 | 是（仅通用身份） | `LEGACY_MIGRATION`；完整学生资料另见 CR-003 |
| 旧邮箱 challenge/verify 两步 route | 当前与新邮箱独立 proof、原子换绑 | `requestAuthChallenge`、`changeOwnVerifiedEmail` | 是 | 是 | `LEGACY_MIGRATION`；不要求保留旧 challengeId 路径结构 |
| 旧联系方式首次绑定流程 | 新学生验证学校邮箱并原子注册/入班；既有学生原子换绑 | `requestAuthChallenge`、`registerStudentAndJoinCourse`、`changeOwnVerifiedEmail` | 是 | 是 | `LEGACY_MIGRATION`；按账号所处业务分支映射，不保留旧 activation DTO |
| 旧 enrollment/class/course/teacher/semester fan-out | 当前 0/1 课程、学期、教师、目标、进度 | `getStudentDashboard`、`getOwnCurrentCourse`、`getOwnCourseProgress` | 是 | 课程/进度语义完整 | `LEGACY_MIGRATION`；不得保留旧整包 workspace 或 fan-out DTO；PENDING 本人资料另见 CR-003 |
| 旧 check-in time-window 单独读取 | 展示当前课程允许开始运动的时间窗 | `getStudentDashboard`、`getOwnCurrentCourse` 中的 `StudentCourse` | 是 | 是 | `LEGACY_MIGRATION`；直接消费课程权威时间窗，不保留第二份客户端策略 DTO |
| 旧 join-capability + join | ACTIVE 邀请预览、已登录加入、新学生注册加入 | `previewCourseInvitation`、`joinCourseByInvitation`、`registerStudentAndJoinCourse` | 是 | ACTIVE/成功加入完整 | `LEGACY_MIGRATION`；终止预览唯一通道另见 CR-004，旧 capability step 不构成新需求 |
| 旧 Session start/get/pause/resume/finish | 服务端权威计时和状态控制 | `startExerciseSession`、`getExerciseSession`、`pauseExerciseSession`、`resumeExerciseSession`、`completeExerciseSession` | 是 | 内容和 mutation 完整 | `LEGACY_MIGRATION`；活动 Session 空态另见 CR-001 |
| 旧 media upload/confirm/bind/poll/access-url | purpose-aware allocation、直传、finalization、短期下载 | `allocateMediaAsset`、`finalizeMediaAsset`、`authorizeMediaDownload` | 是 | VERIFIED 成功链完整 | `LEGACY_MIGRATION`；拒绝/过期唯一通道另见 CR-002，不保留旧 bind/poll DTO |
| 旧 Record draft/update/submit 的正式目标 | 完成 Session 后一次提交正式 Record | `submitExerciseRecord` | 是 | 当前业务正式提交语义完整 | `LEGACY_MIGRATION`；新 Contract 不保留旧 Draft/Submit 多步形状 |
| 旧 record list/detail/evidence context | 本人记录列表、空态、详情、媒体与 Review | `listOwnExerciseRecords`、`getOwnExerciseRecord`、`listExerciseRecordReviews`、`authorizeMediaDownload` | 是 | 是 | `LEGACY_MIGRATION`；不迁移 attempt/resubmission 私有上下文 |
| 旧 student score/workspace 汇总 | 两类进度、耐力结果、最终成绩 | `getOwnCourseProgress`、`getOwnEnduranceOutcome`、`getOwnFinalGrade`、`getStudentDashboard` | 是 | 是 | `LEGACY_MIGRATION`；服务端事实分别映射，不保留旧总分 DTO |
| 旧 exemption draft/update/submit/list/detail | 正式申请创建、列表、详情、补充材料 | `createStudentApplication`、`listOwnApplications`、`getOwnApplication`、`supplementStudentApplication` | 是 | 当前正式业务完整 | `LEGACY_MIGRATION`；旧草稿/任意修改/独立 submit 流程不要求兼容 |
| 旧 feedback DTO/route | 创建、本人历史和详情 | `createFeedback`、`listOwnFeedback`、`getOwnFeedback` | 是 | 是 | `LEGACY_MIGRATION` |
| 旧/本地帮助内容读取边界 | 已发布帮助列表、筛选、详情 | `listPublishedHelpArticles`、`getPublishedHelpArticle` | 是 | 是 | `LEGACY_MIGRATION`；本地缓存是客户端实现，不扩展 DTO |
| 旧通知列表/单条已读 | 列表、未读数、单条天然幂等已读 | `listOwnNotifications`、`getOwnUnreadNotificationCount`、`markOwnNotificationRead` | 是 | 是 | `LEGACY_MIGRATION`；“全部已读”可迭代现有 operation，不新增批量 CR |
| 旧账号删除 challenge/confirm | 影响预览、二次验证、删除结果与保留事实 | `requestAuthChallenge`、`getOwnAccountDeletionImpact`、`deleteOwnAccount` | 是 | 是 | `LEGACY_MIGRATION`；不要求复刻旧 challenge URL/DTO |
| 旧成绩详情壳 | 学生当前或历史最终成绩 | `getOwnFinalGrade` | 是 | 是 | `LEGACY_MIGRATION`；不保留旧 `StudentGradesResponse` |

## 3. 新 operation 已存在但语义不完整：PROPOSED CR

| 页面 / Use Case | 新 operation 是否存在 | 当前缺口 | Finding |
|---|---|---|---|
| 无进行中 Session 的 Idle 恢复 | 是：`getOwnActiveExerciseSession` | description、responses、error codes 不一致，没有合法空态响应 | [CR-20260831-001](../../../../contracts/change-requests/CR-20260831-001-active-session-empty-state.md) `BLOCKING`；续审重复发现不另建 CR |
| 媒体权威拒绝/过期 | 是：`finalizeMediaAsset` | success DTO 状态与 ErrorEnvelope 对同一拒绝原因双通道，原因映射不稳定 | [CR-20260831-002](../../../../contracts/change-requests/CR-20260831-002-media-finalization-rejection-channel.md) `BLOCKING` |
| ACTIVE/PENDING 都稳定的本人完整资料 | 是：`getStudentDashboard`、`getCurrentActor` | PENDING 时无法稳定取得已有 `StudentSummary` 事实 | [CR-20260831-003](../../../../contracts/change-requests/CR-20260831-003-student-dashboard-profile-projection.md) `BLOCKING` |
| 邀请已知终止状态预览 | 是：`previewCourseInvitation` | 四种状态同时落入 200 DTO 和 422 error 语义，ACTIVE payload 不变量不足 | [CR-20260831-004](../../../../contracts/change-requests/CR-20260831-004-invitation-preview-terminal-state-channel.md) `LOCAL` |

这些 CR 均由当前业务需求与当前 RC 自身缺口证明，不要求保留旧 API 的 path、步骤、DTO、枚举或错误码。

## 4. 新 operation 不存在，但不是 Contract 缺陷

| 旧 API / DTO / 行为 | 新 operation 是否存在 | 当前业务是否要求 | Finding |
|---|---|---|---|
| 学生密码登录壳 `StudentLoginRequest/LoginResponse` | 否；`createPasswordSession` 只面向教师/管理员密码登录语义 | 否；学生使用学校邮箱 OTP | `NOT_CONTRACT_DEFECT`；删除旧壳，不提交 CR |
| `/me/preferences` 语言/主题/一般 UI 偏好 | 否 | 服务端偏好不属于当前核心业务；语言/主题可本地保存 | `NOT_CONTRACT_DEFECT`；客户端本地事项，不补私有 Contract 字段 |
| `push-devices` FCM 注册/注销 | 否 | 否；业务权威明确初版只有站内通知，不做 Android/iOS 系统 Push | `NOT_CONTRACT_DEFECT`；删除/停用旧边界，不提交 CR |
| 学生输入用时的 endurance conversion preview | 否 | 否；正式耐力事实由教师确认，学生只读取 outcome | `NOT_CONTRACT_DEFECT`；不得把旧试算反推成新 product operation |
| Session cancel | 否 | 否；正式状态机为 `ACTIVE ↔ PAUSED → COMPLETED` | `NOT_CONTRACT_DEFECT`；不要求保留旧 cancel |
| internal test tools / add-sixty-minutes / advance-duration | 否 | 否；DEV_ONLY，且正式“增加 60 分钟”已被明确撤销 | `NOT_CONTRACT_DEFECT`；删除旧测试产品面，不进入 Contract |
| 模拟扫码成功/免邀请码进入确认页 | 否 | 否；已明确不得进入正式产品 | `NOT_CONTRACT_DEFECT`；删除或保持严格 build gate，不为它新增 invitation operation/fixture |
| Record Draft、任意更新、attempt context、resubmission | 否 | 否；正式流程是完成 Session 后直接提交，提交即 VALID，不存在重提链 | `NOT_CONTRACT_DEFECT`；不得恢复旧状态或私有字段 |
| 多个活动课程、自由选课、旧 class-section/enrollment DTO 形状 | 否（新 Contract 以 0/1 当前课程和邀请入班建模） | 否 | `NOT_CONTRACT_DEFECT`；不要求新 Contract 兼容旧聚合结构 |
| 旧 exemption draft/reason/type 任意编辑和独立 submit | 否（新正式申请 operation 已存在） | 否；当前业务只允许正式创建及被要求后的 supplement | `NOT_CONTRACT_DEFECT`；迁移到新正式流程，不复刻旧字段 |
| 学生 profile update mutation | 否 | 业务权威未授权学生编辑正式资料 | `NOT_CONTRACT_DEFECT`；只读资料缺口单独由 CR-003 处理，不借机新增 mutation |
| planned maintenance banner | 否 | 当前权威只要求 NORMAL/MAINTENANCE 与实际维护公告 | `NOT_CONTRACT_DEFECT`；不从旧 UI 文案创造状态 |
| 永久媒体 URL/thumbnail 私有字段 | 否 | 否；隐私模型要求按需短期授权 | `NOT_CONTRACT_DEFECT`；使用 `authorizeMediaDownload` |
| 批量“全部通知已读” | 否 | 页面行为可由单条天然幂等 operation 组合，不要求原子批量事实 | `NOT_CONTRACT_DEFECT`；不提交便利性 CR |
| 静态隐私、关于、更新日志、Onboarding | 不需要 | 属于客户端静态内容/本地状态 | `NOT_CONTRACT_DEFECT` |
| “无法使用邮箱”恢复指引页 | 不需要 | 当前页面只引导联系学校管理员，没有网络提交 Use Case | `NOT_CONTRACT_DEFECT`；静态帮助内容，不新增 recovery request operation |

## 5. 仍需业务决定，不转成 CR

| 场景 | 新 Contract 当前能力 | Finding |
|---|---|---|
| PENDING/退班学生查看历史课程、转班后在当前与历史间导航 | `getOwnFinalGrade` 支持当前或历史 Enrollment，业务也要求保留正式历史，但没有冻结 Android 页面如何选择或展示历史课程 | `UNVERIFIED / BUSINESS PENDING`；先由业务负责人决定并更新四份权威文档，不能由旧 workspace 或客户端 UI 反推 CR |

## 6. 迁移影响与剩余边界

- Android 当前仍绑定旧 `3.0.0-contract` snapshot、手写 OkHttp/Gson Gateway、legacy DTO/错误码和 workspace fan-out；这些引用仍存在，但存在本身不构成 CR。
- 已完整支持的行只允许做 API Adapter/DTO/Domain/UI State 迁移；不得保留旧字段别名、双 response 通道、旧 ErrorCode 白名单或兼容 fallback。
- 混合行必须把可迁移成功路径与 CR 阻塞路径分开：例如 media `VERIFIED` 可迁移，拒绝通道等待 CR-002；ACTIVE 邀请可迁移，终止状态等待 CR-004。
- 已撤销或 DEV_ONLY 行应删除/收口，不得为“迁移方便”新增新 Contract operation。
- 本轮没有修改 Android 源文件、旧 snapshot、OpenAPI、Contract metadata、Mock、假数据、私有字段或兼容逻辑。

## 7. 输出结论

```text
LEGACY_MIGRATION：新 Contract 已完整支持的真实 Use Case，后续只迁移客户端边界
PROPOSED CR：4 项，均由新 Contract 自身缺口证明
DUPLICATE：活动 Session 空态再次命中 CR-001，未重复建档
NOT_CONTRACT_DEFECT：旧行为被撤销/排除、属于 DEV_ONLY/客户端本地，或已有 Contract 组合可表达
BUSINESS PENDING：历史课程/转班导航，等待业务决定，不创建 CR
```
