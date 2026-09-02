# Phase 5D-A：Android Full Contract Surface Audit

> 日期：2026-09-01
> 审查类型：只读 Full Contract Surface Audit
> 固定 Contract：`1.1.0-contract` / `RC`
> 固定 SHA-256：`1d538483f96b95d777cc4dd02526b78a214bd663e036ea5a6c77f43dfa38d99d`
> Phase 结论：`PARTIAL`

## 0. 结论先行

本轮完成了 Android 当前初版全部可达页面、页面内业务子状态、用户动作、Repository/Gateway 边界和 `1.1.0-contract` operation 的静态全量对照。审查本身已经完成，但固定 Contract 不能被判为完整支撑 Android 初版，因此 Phase 结果是 `PARTIAL`，不是 `PASS`。

| 最终交付指标 | 结果 |
|---|---:|
| in-scope 页面 / 独立可达 UI surface | **28** |
| in-scope Use Case 审查单元 | **80** |
| 映射到固定 Contract 的唯一 operation | **44** |
| 不需要远端 Contract 的本地 Use Case | **13** |
| 未映射、且当前不应反向新增 operation 的旧/越界 Use Case | **11** |
| 新增 `CONTRACT_CR` | **2** |
| `LEGACY_MIGRATION` bundle | **6** |
| `CLIENT_DEFECT` | **12** |
| `UI_PRODUCT_FINDING` | **6** |
| `NEEDS_BUSINESS_DECISION` | **0** |

固定 Contract 的主要结论：

1. 现行正式 Android 学生业务面所需的 44 个 operation 均已存在；认证、入班、Session、媒体、Record、进度、申请、成绩、帮助、反馈、站内通知和本人账号的大部分 request / response / error / permission / pagination / idempotency 语义已经可用。
2. 不能完整支撑的两个新 Contract 缺口是：
   - `CertificationDetails` 无法表达并回显“校队”或“社团”；
   - `getStudentDashboard` 无法表达 Contract 自身已经承认的“没有 CURRENT 学期”状态。
3. 当前 Android 产品运行时并未因此自动成为 `1.1.0-contract` 客户端。除公开启动检查外，正式 runtime 仍主要依赖旧 endpoint、旧 DTO、旧 workspace 和 hand-written OkHttp/Gson transport；这是 `LEGACY_MIGRATION`，不是把旧 API 结构写回新 Contract 的理由。
4. “增加 60 分钟”、服务端取消 Session、Record 补交链、学生端耐力跑本地预估、历史/已结束课程、系统 Push、服务端偏好同步等当前代码面，不应为了兼容而给新 Contract 增加 operation。

## 1. 审查边界与证据基线

### 1.1 Phase 开始状态

```text
当前 Git 根目录：C:\Users\23328\Desktop\new_version
当前分支：API-contract-Making
HEAD Commit：4b4997925f4193023a126b78c3bd8aa42bb93599
git status：clean
读取的 AGENTS.md：根 AGENTS.md；BNBU-ANDROID 下无嵌套 AGENTS.md
当前 Phase：Phase 5D-A Android Full Contract Surface Audit
允许修改：本 handoff、docs/rebuild/STATUS.md
禁止修改：contracts/**、BNBU-ANDROID/**、Backend、Web、docs/business/** 及其他未授权路径
```

### 1.2 权威输入

- 根 `AGENTS.md`
- `docs/rebuild/STATUS.md`
- `docs/rebuild/00-scope.md`
- `docs/business/00-overview.md`
- `docs/business/10-student-flow.md`
- `docs/business/20-teacher-flow.md`
- `docs/business/30-admin-flow.md`
- `contracts/openapi.yaml`
- `contracts/operation-catalog.md`
- `contracts/coverage.md`
- `contracts/contract-metadata.json`
- Android `app/src/main` 页面、State、Repository、Gateway、transport、旧 generated snapshot
- 既有 Android legacy inventory、Phase 5A/5A.1 handoff 与旧 CR / migration findings，仅作为当前代码定位线索；所有结论重新对照固定 Contract 和当前业务权威。

### 1.3 固定 Contract 现场复核

| 检查 | 真实结果 |
|---|---|
| `Get-FileHash contracts/openapi.yaml` | 精确等于 `1d538483f96b95d777cc4dd02526b78a214bd663e036ea5a6c77f43dfa38d99d` |
| metadata version / status / base path | `1.1.0-contract` / `RC` / `/api/v1` |
| metadata inventory | 109 paths / 121 operations / 66 error codes |
| Contract 修改 | **无** |

### 1.4 计数规则

- “页面”按用户可独立进入或覆盖当前 Shell 的 UI surface 计数；Dialog、卡片展开、同页 loading/content/empty/error 子状态不重复计页。
- 五个主 Tab、十四个 `SubScreen`、认证/引导/维护 surface 和 Notification Sheet 均纳入；Record 详情等同页子状态纳入对应页面 Use Case，而不膨胀页面数。
- “Use Case”按一个可独立判断 Contract 需求的读、写、状态转换、正式导航结果或明确本地业务行为计数；不把每次普通返回、滚动、聚焦或视觉展开当成新 Use Case。
- 同一 operation 被多个页面复用时，Use Case 分别计数，但 operation 只按唯一 `operationId` 计一次。
- `LOCAL` 表示权威业务明确允许客户端本地完成，不属于“未映射”。`UNMAPPED` 表示当前代码/页面假定了远端业务能力，但固定 Contract 不应为该旧能力新增 operation。

## 2. 全部 Android 页面清单（28）

| Page | 页面 / surface | 对应 Use Case | Contract 结论 |
|---|---|---|---|
| P01 | 启动、强制升级、Maintenance 覆盖层 | UC-01～03、UC-78 | 2 个正式 operation；1 个 UI 越界；Push 不应映射 |
| P02 | Privacy Consent | UC-04 | LOCAL |
| P03 | Login 入口 | 进入 UC-06、09～13 | 导航本地；目标动作另列 |
| P04 | Email Login | UC-05～07 | 3 个正式认证 operation |
| P05 | Recovery Request | UC-09 | LOCAL；人工恢复指引 |
| P06 | Pre-login Course Guide | UC-10 | LOCAL；文案存在旧流程残留 |
| P07 | Scan Join | UC-11～12 | 正式预览可映射；模拟成功不可映射 |
| P08 | Enter Invite Code | UC-13 | `previewCourseInvitation` |
| P09 | Course Join Confirm | UC-14～16 | 现有生与新生两个正式加入 command |
| P10 | Contact Binding / Email Security | UC-18～20 | 换绑可映射；旧 post-login 激活需收敛进新生原子流程 |
| P11 | Contact Activation Help | UC-21 | LOCAL |
| P12 | Privacy Policy | UC-22 | LOCAL |
| P13 | Post-enrollment Guide | UC-17 | LOCAL；文案存在旧流程残留 |
| P14 | Dashboard Tab | UC-23～24、27～28 | `getStudentDashboard` 等；命中 CR-5DA-002 |
| P15 | Courses Tab | UC-25～26、29～30 | 当前学期/当前课程可映射；历史课程不可映射 |
| P16 | Check-in Tab（含 Session、提交、Record 子状态） | UC-31～48 | 正式闭环可映射；3 个旧 mutation 不可映射 |
| P17 | Grades / Progress Tab | UC-49～51 | 3 个正式 read operation；Android binding 有缺陷 |
| P18 | Profile Tab | UC-08、61～62 | actor/dashboard/application/progress 组合 |
| P19 | Endurance Scoring | UC-52 | 学生端预估不应映射 |
| P20 | Exemption / Application | UC-53～60 | 申请闭环可映射；认证类型命中 CR-5DA-001 |
| P21 | Account Details | UC-61 | actor/dashboard；UI 依赖非 Contract 字段 |
| P22 | Settings | UC-63～64 | 本地偏好正确；旧远端偏好同步不应迁移 |
| P23 | Account Deletion | UC-65～67 | 影响、OTP、确认注销均有正式 operation |
| P24 | Help Center | UC-68～70 | 列表、详情、缓存 fallback 可表达 |
| P25 | Feedback | UC-71～73 | 创建、列表、详情/公开回复可表达 |
| P26 | About | UC-79 | LOCAL |
| P27 | Changelog | UC-80 | LOCAL |
| P28 | Notification Sheet | UC-74～77 | 列表、未读数、单条已读；全部已读可组合 |

## 3. Android Full Contract Coverage Matrix（80 Use Cases）

结论标记：

- `OK`：固定 Contract 足以表达；
- `LM`：固定 Contract 足以表达，但 Android runtime 仍在旧边界；
- `CD`：Contract 足够，Android 实现/binding 有缺陷；
- `UI`：UI/产品表达越过权威业务，不是 Contract 缺陷；
- `CR`：固定 Contract 本身缺失；
- `LOCAL`：不需要远端 operation。

### 3.1 启动、认证、入班与邮箱

| UC | 页面 / 用户动作 | Repository / API boundary → OpenAPI operation | 结论 |
|---|---|---|---|
| UC-01 | 启动检查 Android release policy | public status → `getAppReleasePolicy` | `OK + CD`；request/response/error/maintenance permission 足够，客户端强更处理不完整 |
| UC-02 | 获取 NORMAL / MAINTENANCE 并显示公告 | public status → `getSystemMode` | `OK + CD`；公告、预计恢复、fail-closed 均有字段，客户端丢字段 |
| UC-03 | NORMAL 下显示 planned-maintenance banner | 无 1.1 operation | `UNMAPPED + UI`；权威流程只有当前 NORMAL/MAINTENANCE 与实时维护公告 |
| UC-04 | 阅读并接受/拒绝隐私同意 | local store | `LOCAL` |
| UC-05 | 恢复 access/refresh session 并确认 actor | auth store → `refreshSession` + `getCurrentActor` | `OK + LM` |
| UC-06 | 已有学生申请登录 OTP | auth client → `requestAuthChallenge(STUDENT_LOGIN)` | `OK + LM`；202 challenge、频控、反枚举错误可表达 |
| UC-07 | 校验 OTP 并建立学生 session | auth client → `createStudentSession` | `OK + LM`；201 session/actor 与认证错误足够 |
| UC-08 | 当前设备退出登录 | state/auth client → `logoutCurrentSession` | `OK + LM`；本地凭据清理仍由客户端负责 |
| UC-09 | 无法访问邮箱时查看恢复指引 | 静态 guidance | `LOCAL`；不调用 teacher/admin password reset |
| UC-10 | 登录前课程引导 | local completion flag | `LOCAL + UI`；引导中“重新提交”文案需按当前业务清理 |
| UC-11 | 扫码取得邀请码并预览五种内容态 | join coordinator → `previewCourseInvitation` | `OK + LM`；ACTIVE/EXPIRED/REVOKED/COURSE_CLOSED/NOT_CURRENT 和 422 invalid 均完整 |
| UC-12 | 点击“模拟扫码成功（预览）” | hard-coded `SIMULATED-PREVIEW-ONLY` | `UNMAPPED + CD`；不是 Contract use case，正式 main source 不得可达 |
| UC-13 | 手输邀请码并预览 | join coordinator → `previewCourseInvitation` | `OK + LM`；与扫码共用同一语义 |
| UC-14 | 已登录学生确认加入 | join coordinator → `joinCourseByInvitation` | `OK + LM`；expected account version、唯一当前班、邀请状态错误足够 |
| UC-15 | 新生邮箱绑定 OTP | join/auth coordinator → `requestAuthChallenge(STUDENT_EMAIL_BINDING)` | `OK + LM` |
| UC-16 | 新生资料、邮箱 proof 与入班原子提交 | join coordinator → `registerStudentAndJoinCourse` | `OK + LM + CD`；request 足够，Android 将 gradeYear 当入学年份 |
| UC-17 | 成功入班后的引导 | local completion flag | `LOCAL + UI`；旧补交文案不属于正式流程 |
| UC-18 | 登录后再做一套 RequiredActivation 远端流程 | 旧 `/me/email-verification-challenges/**` | `UNMAPPED + LM`；新生首次绑定应并入 UC-15/16，不建立半成品正式 enrollment |
| UC-19 | 换绑时分别取得当前、新邮箱 OTP proof | auth client → `requestAuthChallenge(CURRENT_EMAIL_VERIFICATION)` + `requestAuthChallenge(NEW_EMAIL_VERIFICATION)` | `OK + LM` |
| UC-20 | 原子更换 verified email | identity client → `changeOwnVerifiedEmail` | `OK + LM`；双 proof + expectedVersion + 幂等完整 |
| UC-21 | 联系方式激活帮助 | 静态 guidance | `LOCAL` |
| UC-22 | 查看隐私政策 | bundled content | `LOCAL` |

### 3.2 Dashboard、课程与进度摘要

| UC | 页面 / 用户动作 | Repository / API boundary → OpenAPI operation | 结论 |
|---|---|---|---|
| UC-23 | 首次加载学生 Dashboard | workspace repository → `getStudentDashboard` | `CR-5DA-002 + LM`；ACTIVE/PENDING 内容态足够，但 no-current 无合法表达 |
| UC-24 | 手动刷新 Dashboard | workspace repository → `getStudentDashboard` | `CR-5DA-002 + LM`；错误态可表达，no-current 同上 |
| UC-25 | 取得当前学期 | workspace repository → `getCurrentSemester` | `OK + LM`；200 / 404 absent / 503 分离完整 |
| UC-26 | 查看本人当前有效课程 | workspace repository → `getOwnCurrentCourse`，PENDING 空态由 `getStudentDashboard.course=null` 组合 | `OK + LM`；不以旧历史课程 DTO 反推 CR |
| UC-27 | Dashboard 显示两类目标、实际/认证/剩余进度 | workspace repository → `getStudentDashboard` / `getOwnCourseProgress` | `OK + LM`；required nullable 与两分类 enum 足够 |
| UC-28 | Dashboard 未读通知 badge | dashboard/count gateway → `getStudentDashboard` / `getOwnUnreadNotificationCount` | `OK + LM` |
| UC-29 | 从首页/课程页进入扫码或手输流程 | local navigation | `LOCAL` |
| UC-30 | 查看“历史/已结束课程”和历史 pass/fail | 旧 workspace courses | `UNMAPPED + UI`；学生初版只展示当前有效课程，不创建历史课程 operation |

### 3.3 Session、媒体与 Record

| UC | 页面 / 用户动作 | Repository / API boundary → OpenAPI operation | 结论 |
|---|---|---|---|
| UC-31 | 恢复本人唯一 active Session | exercise gateway → `getOwnActiveExerciseSession` | `OK + LM`；200 content / 404 Idle / 其他错误分离 |
| UC-32 | 开始 Session | exercise gateway → `startExerciseSession` | `OK + LM`；courseId、201、幂等、重复/窗口/进度错误完整 |
| UC-33 | 刷新指定 Session | exercise gateway → `getExerciseSession` | `OK + LM`；owner scope 明确 |
| UC-34 | 暂停 Session | exercise gateway → `pauseExerciseSession` | `OK + LM`；expectedVersion/state conflict 足够 |
| UC-35 | 继续 Session | exercise gateway → `resumeExerciseSession` | `OK + LM` |
| UC-36 | 结束 Session | exercise gateway → `completeExerciseSession` | `OK + LM` |
| UC-37 | 相机拍照/有声录像、预览、形成本地草稿 | local files/camera | `LOCAL + CD`；客户端预校验当前不完整 |
| UC-38 | 为 Record 媒体分配上传意图 | media gateway → `allocateMediaAsset(RECORD_EVIDENCE)` | `OK + LM`；图片/视频 MIME、单文件大小、session 归属足够 |
| UC-39 | 按 exact method/headers 直传并探测终态 | signed object upload + `finalizeMediaAsset` | `OK + LM`；VERIFIED/REJECTED/EXPIRED 单一 200 通道、时长/音轨/结构探测与幂等完整 |
| UC-40 | 提交正式 Record | record gateway → `submitExerciseRecord` | `OK + LM`；说明 1～200、媒体 1～7、分类、日期唯一性、总 250 MiB 与错误可表达 |
| UC-41 | 列出本人 Records | record repository → `listOwnExerciseRecords` | `OK + LM`；cursor、limit、courseId/reviewResult 筛选与固定排序足够，空数组明确 |
| UC-42 | 查看 Record 详情 | record repository → `getOwnExerciseRecord` | `OK + LM`；404/owner scope/nullable review result 足够 |
| UC-43 | 查看追加式审核历史 | record repository → `listExerciseRecordReviews` | `OK + LM`；cursor page 与空历史足够 |
| UC-44 | 预览正式媒体 | media gateway → `authorizeMediaDownload` | `OK + LM`；owner/resource scope 与短时授权足够 |
| UC-45 | 正式提交前删除本地草稿 | local file deletion | `LOCAL`；上传开始后不得再删除正式媒体 |
| UC-46 | “增加 60 分钟” | 旧 `add-sixty-minutes` | `UNMAPPED + CD`；权威业务明确禁止，不能提交 CR |
| UC-47 | 服务端取消/放弃 Session | 旧 cancel/abandon mutation | `UNMAPPED + CD`；正式状态机只有开始、暂停、继续、结束；本地丢弃未上传草稿另见 UC-45 |
| UC-48 | Record attempt chain / resubmission | 旧 attempt-context/resubmit endpoints | `UNMAPPED + CD`；权威业务明确没有补交链，原 Record 不被新 attempt 替代 |

### 3.4 成绩、耐力与学生申请

| UC | 页面 / 用户动作 | Repository / API boundary → OpenAPI operation | 结论 |
|---|---|---|---|
| UC-49 | 进度页查看两类目标与有效/认证/剩余分钟 | progress repository → `getOwnCourseProgress` | `OK + LM` |
| UC-50 | 查看教师确认的耐力跑真实结果/免测 | grade repository → `getOwnEnduranceOutcome` | `OK + LM + CD`；UNRECORDED/MEASURED/EXEMPT、distance/duration/conversion 可表达，Android 显示不完整 |
| UC-51 | 查看最新发布最终成绩和备注 | grade repository → `getOwnFinalGrade` | `OK + LM + CD`；未发布用 `currentPublication=null`，任意 signed int32 和可空 50 字 remark 足够；客户端错误推导 60 分及格线 |
| UC-52 | 学生自行输入时间并预估分数/等级 | 旧 preview/local scoring | `UNMAPPED + UI`；正式结果只能来自教师确认和 Backend 换算 |
| UC-53 | 列出本人申请 | application repository → `listOwnApplications` | `OK + LM`；type/status filter、cursor、empty 足够 |
| UC-54 | 查看申请、补充、决定与认可学时详情 | application repository → `getOwnApplication` | `OK + LM`，但认证类型字段命中 CR-5DA-001 |
| UC-55 | 查看申请证据缩略图/原图 | media gateway → `authorizeMediaDownload` | `OK + LM` |
| UC-56 | 创建耐力跑免测申请 | application repository → `createStudentApplication(EXEMPTION)` | `OK + LM + CD`；1～3 张证据和正式状态足够，Android 旧 subtype/reason 不应反写 Contract |
| UC-57 | 创建校队或社团认证申请 | application repository → `createStudentApplication(CERTIFICATION)` | `CR-5DA-001 + LM`；名称/有效期/证据存在，但请求和响应不能区分校队/社团 |
| UC-58 | 按教师要求补充材料 | application repository → `supplementStudentApplication` | `OK + LM + CD`；仅 SUPPLEMENT_REQUIRED、expectedVersion、累计最多 3 张与错误完整 |
| UC-59 | 分配、直传、finalize 申请图片 | media gateway → `allocateMediaAsset(APPLICATION_EVIDENCE)` + `finalizeMediaAsset` | `OK + LM + CD`；JPEG/PNG/WebP、10 MiB 规则完整，Android 仍按旧 20 张/8 MB/无 WebP |
| UC-60 | 把 rejected/旧申请作为新“重新提交” | 旧 create/update/resubmit flow | `UNMAPPED + CD`；正式流程只有创建和 SUPPLEMENT_REQUIRED 补充，不为旧 resubmit 新增 operation |

### 3.5 Profile、账号、帮助、反馈与站内通知

| UC | 页面 / 用户动作 | Repository / API boundary → OpenAPI operation | 结论 |
|---|---|---|---|
| UC-61 | 查看本人账号与学生必要资料 | workspace/identity → `getStudentDashboard` + `getCurrentActor` | `OK + LM + UI`；正式字段足够，`admissionYear`/聚合 `gradeCalculatedAt` 不属于 Contract |
| UC-62 | Profile 展示校队/社团认证和认可学时 | applications/progress → `listOwnApplications` + `getOwnCourseProgress` | `CR-5DA-001 + LM`；学时可表达，认证 kind 不可表达 |
| UC-63 | 修改语言、主题与界面偏好 | local store | `LOCAL`；权威业务未要求远端同步 |
| UC-64 | 把 locale/push/email 偏好写入服务端 | 旧 preferences endpoint | `UNMAPPED + CD`；不为旧 DTO 新增 operation，尤其不存在 Push/email channel |
| UC-65 | 打开注销页并读取权威影响/阻塞项 | account gateway → `getOwnAccountDeletionImpact` | `OK + LM + CD`；Contract 足够，当前 UI 只显示硬编码说明而未读取 impact |
| UC-66 | 向当前 verified email 申请注销 OTP | auth gateway → `requestAuthChallenge(ACCOUNT_DELETION)` | `OK + LM` |
| UC-67 | 二次确认并注销本人账号 | account gateway → `deleteOwnAccount` | `OK + LM`；proof、expectedVersion、阻塞错误、全 session 撤销结果足够 |
| UC-68 | 按当前语言列出/搜索/分类帮助文章 | help repository → `listPublishedHelpArticles` | `OK + LM`；locale、q、category、cursor、每页 5 条和固定排序完整 |
| UC-69 | 查看帮助文章详情 | help repository → `getPublishedHelpArticle` | `OK + LM`；published-only、404 与 locale 投影足够 |
| UC-70 | 网络失败时显示明确标识的最近缓存 | local cache after UC-68 | `LOCAL + OK`；当前页面已显示缓存标识 |
| UC-71 | 提交反馈 | feedback repository → `createFeedback` | `OK + LM + CD`；五类 category 和 description 足够；平台/版本/currentPage 不属于 request |
| UC-72 | 列出本人反馈 | feedback repository → `listOwnFeedback` | `OK + LM + CD`；cursor/empty 足够，Android 需保留五状态 |
| UC-73 | 查看反馈详情和追加式公开回复 | feedback repository → `getOwnFeedback` | `OK + LM + CD`；replies[]/五状态完整，Android 当前压成单 reply/三状态 |
| UC-74 | 列出/按已读状态过滤站内通知 | notification repository → `listOwnNotifications` | `OK + LM`；read/cursor/limit/empty 足够；UI 的 Deadline/Application 产品分组另列 finding |
| UC-75 | 获取未读总数 | notification repository → `getOwnUnreadNotificationCount` | `OK + LM` |
| UC-76 | 将一条本人通知标为已读 | notification repository → `markOwnNotificationRead` | `OK + LM`；天然幂等、404/owner scope 完整 |
| UC-77 | “全部已读” | 分页列出 unread + 对每项调用 `markOwnNotificationRead` | `OK (composition) + LM`；无须仅因便捷性新增 bulk operation，客户端必须覆盖全部 cursor page |
| UC-78 | 注册/注销 FCM token、申请系统通知权限 | Firebase + 旧 push endpoint | `UNMAPPED + CD`；权威业务明确无 Android/iOS system Push |
| UC-79 | 查看 About | bundled content | `LOCAL` |
| UC-80 | 查看 Changelog | bundled content | `LOCAL` |

## 4. 唯一 operation 覆盖（44）

47 个带 `STUDENT` 或 `ANONYMOUS` role 的 operation 中，Android 初版正式业务映射 44 个。排除的 3 个是 `createPasswordSession`、`resetPassword` 和 `logoutAllSessions`：前两者属于教师/管理员密码场景；Android 学生端只使用邮箱 OTP；初版 UI 没有“退出所有设备”动作，账号注销已由 `deleteOwnAccount` 返回全 session 撤销结果。

| Domain | 唯一 operation |
|---|---|
| Release / mode | `getAppReleasePolicy`, `getSystemMode` |
| Auth / identity / account | `requestAuthChallenge`, `createStudentSession`, `refreshSession`, `logoutCurrentSession`, `getCurrentActor`, `changeOwnVerifiedEmail`, `getOwnAccountDeletionImpact`, `deleteOwnAccount` |
| Semester / dashboard / course / join | `getCurrentSemester`, `getStudentDashboard`, `getOwnCurrentCourse`, `previewCourseInvitation`, `joinCourseByInvitation`, `registerStudentAndJoinCourse` |
| Session / media / Record | `getOwnActiveExerciseSession`, `startExerciseSession`, `getExerciseSession`, `pauseExerciseSession`, `resumeExerciseSession`, `completeExerciseSession`, `allocateMediaAsset`, `finalizeMediaAsset`, `authorizeMediaDownload`, `submitExerciseRecord`, `listOwnExerciseRecords`, `getOwnExerciseRecord`, `listExerciseRecordReviews` |
| Progress / application / grade | `getOwnCourseProgress`, `createStudentApplication`, `supplementStudentApplication`, `listOwnApplications`, `getOwnApplication`, `getOwnEnduranceOutcome`, `getOwnFinalGrade` |
| Feedback / help / notification | `createFeedback`, `listOwnFeedback`, `getOwnFeedback`, `listPublishedHelpArticles`, `getPublishedHelpArticle`, `listOwnNotifications`, `getOwnUnreadNotificationCount`, `markOwnNotificationRead` |

## 5. Request / Response / Empty / Error / Permission 全面结论

### 5.1 Content / Empty / Error

- Session：`getOwnActiveExerciseSession` 的 200 Content、404 Idle 和非 404 Error 可区分；客户端不得把认证、维护或依赖错误伪装 Idle。
- Invitation：五种已识别邀请码状态走 200 content；未知/畸形/不安全投影走稳定错误。
- Dashboard：ACTIVE/PENDING 均保留 required student；course/progress/endurance/finalGrade 可以为 null。唯一缺口是 `currentSemester` 必填非 null 且 operation 无 404，见 CR-5DA-002。
- Lists：Record、review、application、feedback、help、notification 都返回 required `items` + cursor page；空结果是 `items=[]`，不是 null/404。
- Grade：未发布用 `FinalGradeState.currentPublication=null`；已发布含 signed int32 grade、nullable remark、publisher/time。
- Endurance：UNRECORDED / MEASURED / EXEMPT 与 nullable distance/duration/conversion/exemption id 组合足够。
- Application：SUBMITTED / SUPPLEMENT_REQUIRED / APPROVED / REJECTED、追加 decision/supplement、认可学时与撤销历史可以表达；唯一新字段缺口是 certification kind。
- Feedback：五状态、完整问题、追加式 replies[] 可以表达。
- Error：44 个 operation 都声明 role/scope/system-mode 和稳定 `x-error-codes`；除 dashboard no-current 外，未发现需要新增 HTTP status 或 `error.code` 的 Android 初版缺口。

### 5.2 nullable / required / enum / 状态机

- 当前 Student status 只允许 ACTIVE/PENDING，Contract 与业务一致。
- Session 正式 command 只有 start/pause/resume/complete；Contract 不缺 cancel/add-60/resubmit。
- Record review、Application、Feedback、SystemMode、Media finalization、Endurance、Final Grade 的状态和 required-nullable 组合足够。
- `notificationType` 是开放 string，`targetRoute` 是闭合 enum。Android 当前“截止提醒/申请与材料”筛选不是权威业务要求；如产品保留，应先形成业务决定，而不是本轮直接把旧 `NoticeCategory` 写回 Contract。
- `CertificationDetails` 缺少业务已经明确存在的校队/社团 closed enum，见 CR-5DA-001。

### 5.3 分页 / 筛选 / 排序

- Records：cursor/limit + courseId/reviewResult，固定新到旧排序；足够。
- Reviews：cursor/limit；足够。
- Applications：applicationType/status/cursor/limit；足够。
- Help：locale/q/category/cursor/limit，按 sort weight 再更新时间；足够。
- Feedback：本人列表 cursor/limit；Android 初版没有权威 server filter/sort 需求。
- Notifications：read/cursor/limit；“全部已读”可安全组合天然幂等单条 operation，但客户端必须遍历全部 unread page。
- 当前 Android 多处仍一次加载旧 workspace 或只对已加载集合操作；这是 migration/binding 工作，不是分页 Contract 缺口。

### 5.4 上传与幂等

- Record image：JPEG/PNG、最多 6、每项最多 10 MiB。
- Record video：MP4、最多 1、1～15 秒、有音轨、最多 100 MiB。
- 单 Record 合计最多 250 MiB，至少 1 项有效证据。
- Application image：JPEG/PNG/WebP、首次与全部补充合计最多 3、每项最多 10 MiB。
- Contract 明确 allocate → exact method/required headers 直传 → finalize/probe → bind；finalize 校验 MIME、字节、结构、视频时长与音轨。
- command 使用 required `Idempotency-Key`；read 不需要；媒体下载授权和通知已读声明 natural idempotency。
- Android 当前 8,000,000-byte 图片上限、申请最多 20 张、缺少 WebP/视频字节/总量校验等均为客户端缺陷。

### 5.5 权限

- 44 个 operation 均明确 roles、resource scope、system mode 和认证方式。
- `getAppReleasePolicy`、`getSystemMode` 及认证相关 operation 可在维护期间按声明工作；普通学生业务 `NORMAL_REQUIRED`。
- 学生只能读取本人 actor、enrollment、Session、Record、application、grade、feedback 和 notification；媒体授权仍做 owner/resource 检查。
- 未发现为了 Android 初版需要扩大 ADMIN/TEACHER 权限或新增私有 endpoint 的场景。

## 6. UI / ViewModel 依赖而 Contract 不存在的字段

| Android 依赖 | Contract 情况 | 分类 |
|---|---|---|
| `admissionYear` | 只有 `gradeYear` 1～4；二者语义不同，不能互相伪装 | `UI_PRODUCT_FINDING` / `CLIENT_DEFECT` |
| 聚合 `gradeCalculatedAt` | 只有 endurance `convertedAt`、final grade `publishedAt` 等事实时间 | `UI_PRODUCT_FINDING` |
| `isPassed`, `gradeStatus`、60 分及格推导 | 最终成绩是任意 signed int32，业务无及格线 | `CLIENT_DEFECT` |
| `displayConfigVersion`, `sourceTrace` | 不属于学生正式 UI DTO | `LEGACY_MIGRATION` |
| `attemptNumber`, `rootAttemptId`, `previousAttemptId` | 业务明确不存在 Record 补交链 | `CLIENT_DEFECT`，不是 CR |
| feedback `currentPage`, `clientVersion`、单个 `reply` | Contract 明确不含平台/版本等字段，正式返回为 `replies[]` | `CLIENT_DEFECT` |
| application `reason`, `special_circumstance`、旧 run subtype | 不是当前正式 request 字段 | `UI_PRODUCT_FINDING` / `CLIENT_DEFECT` |
| certification 校队/社团 kind | 业务需要，但 Contract request/response 都缺失 | `CONTRACT_CR` |
| `plannedMaintenanceAt` | 当前业务和 `SystemMode` 都未定义 NORMAL 下计划维护态 | `UI_PRODUCT_FINDING` |
| `pushEnabled`, `emailEnabled`, FCM token | 当前业务明确只有站内通知，无系统 Push/短信/邮件通知 channel | `CLIENT_DEFECT` |

## 7. 新增 Contract CR Bundle

本轮只记录 CR，不修改 OpenAPI、Version 或 SHA。

### CR-5DA-001：Certification kind missing from request and response

| 项 | 内容 |
|---|---|
| 分类 | `CONTRACT_CR` |
| 阻塞范围 | UC-57、UC-62；学生提交和查看“校队/社团认证”，教师后续也无法可靠区分 |
| 当前缺陷 | `ApplicationType` 只有 EXEMPTION/CERTIFICATION；`CertificationDetails` 只有 `organizationOrTeamName`, `validFrom`, `validTo`，没有 SCHOOL_TEAM / STUDENT_CLUB discriminator |
| 为什么不是 Legacy | 四份业务权威已明确区分“校队或社团认证”；Android 旧 DTO 只是再次暴露缺口，不是需求来源 |
| 最小请求 | 在 `CertificationDetails` 增加 required closed enum，例如 `certificationKind: SCHOOL_TEAM | STUDENT_CLUB`，同时用于 create request 和 persisted response |
| Error | 非法/未知值可继续使用 `INVALID_REQUEST`；不需要新 operation |
| 验收 | 两种 kind request round-trip；list/detail/teacher detail 均回显；未知值被拒绝；不恢复旧 `special_circumstance` 或“免打卡”语义 |
| 版本影响 | 接受后必须由独立 Contract Phase 修改 source、提升版本、生成新 SHA，并要求所有下游重新绑定 |

### CR-5DA-002：Student Dashboard cannot express absence of CURRENT semester

| 项 | 内容 |
|---|---|
| 分类 | `CONTRACT_CR` |
| 阻塞范围 | UC-23、UC-24；应用根 Dashboard 的 Empty/Error 分支 |
| 当前缺陷 | `getCurrentSemester` 明确承认“无 CURRENT 学期”并返回 404 `RESOURCE_NOT_FOUND`；但 `StudentDashboard.currentSemester` required 且非 nullable，`getStudentDashboard` 既无 404 也无对应 error.code |
| 为什么是 Contract 缺陷 | 同一固定 Contract 对同一系统状态给出互不闭合的两个 read model；客户端不能构造合法 Dashboard content，也不能依 operation 声明处理明确错误 |
| 建议修复方向 | 首选把 `StudentDashboard.currentSemester` 改为 required nullable；为 null 时 course/progress/endurance/finalGrade 也必须为 null，student/actor/unread 仍保留。备选是给 dashboard 增加明确 404 `RESOURCE_NOT_FOUND`，但会损失 PENDING 学生可用的本人资料/通知根页面 |
| 验收 | current content、PENDING/no-course、no-current 三类 fixture；no-current 不得伪装 dependency failure 或 synthetic workspace；additionalProperties 继续拒绝 |
| 版本影响 | 接受后必须独立提升 Contract version/SHA 并重新绑定；本阶段不修改固定 Contract |

## 8. Legacy Migration Findings（6 bundles）

| ID | 范围 | 当前旧边界 | 1.1 迁移目标 | 结论 |
|---|---|---|---|---|
| LM-01 | OTP、session、actor、邮箱 | 旧 sign-in-code、`/me` user/profile、email challenge DTO | `requestAuthChallenge`, `createStudentSession`, `refreshSession`, `getCurrentActor`, `changeOwnVerifiedEmail`, `logoutCurrentSession` | 新 Contract 已支持；不要保留旧 account status/partial activation DTO |
| LM-02 | 邀请与入班 | 旧 preview/capability/join 和 post-login contact activation | `previewCourseInvitation`, `joinCourseByInvitation`, `registerStudentAndJoinCourse` | 扫码/手输共用 operation；新生邮箱 proof 与 enrollment 原子化 |
| LM-03 | Workspace、Dashboard、课程、进度 | 旧多 endpoint fan-out + `StudentWorkspace`/`StudentProfile`/历史 courses | `getStudentDashboard`, `getCurrentSemester`, `getOwnCurrentCourse`, `getOwnCourseProgress`, notification count | 只迁移正式当前关系；不要迁历史课程/grade pass 字段 |
| LM-04 | Session、媒体、Record | 旧 session control、upload、record list/detail/review + add60/cancel/attempt | 新 Session/media/Record 13-operation 边界 | 只迁 start/pause/resume/complete 与正式 Record；删除旧 mutation，不做 fallback |
| LM-05 | 申请、耐力、成绩 | 旧 exemptions/application DTO、score preview、grade snapshot | `create/supplement/list/getOwnApplications`, `getOwnEnduranceOutcome`, `getOwnFinalGrade` | 等 CR-5DA-001 处理后绑定认证 kind；不迁 student scoring preview |
| LM-06 | 注销、帮助、反馈、通知 | 旧 deletion challenge/confirm、help/feedback/notification DTO、preferences/push | account deletion 3-step composition、help/feedback/notification operations；偏好保留本地 | Contract 已支持正式站内能力；Push/preferences endpoints 不迁 |

`getAppReleasePolicy` 和 `getSystemMode` 已使用 1.1 operationId/generated DTO 的公开启动 client，不归为 endpoint migration 完成证明；它们仍有 CD-01/CD-02 的产品 binding 缺陷。

## 9. Client Defects（12）

| ID | 缺陷 | 主要证据 / 影响 |
|---|---|---|
| CD-01 | Maintenance DTO 被截断 | `MainActivity` 只保留 mode，把 message 置空、estimated recovery 置 null，未展示 Contract 双语 announcement |
| CD-02 | 强制升级不可持久 fail-closed | 当前只比较旧 minimum version；失败直接放行，没有按 `forceUpgrade`/build policy 缓存不可绕过结果 |
| CD-03 | 新生 `gradeYear` binding 错误 | Course Join UI 把 1000～9999“入学年份”解析进 Contract 的 1～4 `gradeYear`；邮箱 proof 又拆成旧后置激活 |
| CD-04 | Record 媒体预校验错误 | 图片上限用 8,000,000 bytes；缺 100 MiB video、audio、250 MiB total 等完整 gate |
| CD-05 | 申请媒体与字段错误 | UI 最多 20 项、仅 JPEG/PNG、沿用 8 MB、未按已有+补充合计 3；认证缺 validFrom/validTo 并保留旧 reason/subtype |
| CD-06 | 成绩/耐力显示自行发明规则 | 以 `grade >= 60` 推导 pass/fail，忽略 final-grade remark；MEASURED conversion 的 score/level 显示不完整，并保留 Contract 无 `ABSENT` 语义 |
| CD-07 | 正式运动/Record 状态机仍暴露旧动作 | main source 暴露 add-60、server abandon/cancel、attempt context 和 resubmit button |
| CD-08 | Feedback binding 丢事实并发送禁用字段 | 发送 currentPage/clientVersion，硬截 2000；把五状态压成三状态/自造 REJECTED，并把追加 replies[] 压成单 reply |
| CD-09 | 注销影响页未读取权威 impact | UI 硬编码说明并直接创建旧 challenge，没有先调用 `getOwnAccountDeletionImpact` 展示 blockers/retained facts |
| CD-10 | 实现系统 Push | 申请 `POST_NOTIFICATIONS`、初始化 Firebase、注册/注销 token；与权威“仅站内通知”冲突 |
| CD-11 | RequiredActivation 仍绑定旧 account status | 已登录但未验证邮箱的旧 workspace gate 与新原子 registration/session 模型不一致 |
| CD-12 | 偏好/通知/帮助仍依赖旧 workspace 边界 | locale/push/email 远端同步、已加载集合 mark-all、帮助 fetch-all/local filter 等必须在迁移时按 cursor/filter 重新绑定；不得用旧 DTO fallback |

## 10. UI / Product Findings（6）

| ID | Finding | 处理边界 |
|---|---|---|
| UPF-01 | NORMAL 下 planned-maintenance banner | 当前权威未定义；不提交 Contract CR，产品入口应移除或先走业务决策 Phase |
| UPF-02 | 学生课程页显示历史/已结束课程及 pass/fail | 学生初版只展示当前有效关系；移除旧 section，不创建历史 course operation |
| UPF-03 | 学生可输入耐力时间并本地/远端预估 | 正式结果只能来自教师确认 + Backend conversion；移除入口，不创建 preview operation |
| UPF-04 | Account/Grade 页面显示 admission year、aggregate calculated time | 当前业务必要资料不含这些聚合字段；改用 gradeYear 和各事实时间，或另走业务决策，不私加 DTO |
| UPF-05 | Notification 的 Deadline/Application 产品分类 | 权威只要求站内结果中心，未定义这组分类 taxonomy；可按 read/target route 展示，不能把旧 enum 当 Contract 事实 |
| UPF-06 | 引导/申请文案保留“免打卡、特殊情况、重新提交” | 与当前“耐力免测 / 校队社团认证 / 补充材料”流程不一致；属于文案与产品表达，不是 Contract 缺口 |

## 11. Needs Business Decision

**新增 0 项。**

本轮发现的旧额外能力都已有足够业务权威判定为“不迁移/移除”，不需要为了保留旧 UI 再制造 PENDING。两个新 CR 也分别来自已经确认的“校队/社团”区分和固定 Contract 内部对 no-current 状态的自相矛盾，不需要 Android 自行决定新业务规则。

如果后续产品坚持保留 planned maintenance、历史学生课程、学生耐力预估或通知自定义分类，必须另开业务决策任务并先更新 `docs/business/`；本 handoff 不授权实现。

## 12. 当前 Contract 是否能够完整支撑 Android 初版

**否。**

更精确地说：

- 对 44 个正式 operation 中绝大部分 request/response/error/permission/state/pagination/upload/idempotency，`1.1.0-contract` 已经足够；
- CR-5DA-001 阻塞“校队/社团认证”的无损 request/response round-trip；
- CR-5DA-002 阻塞 Dashboard 对 no-current 的合法 Content/Empty/Error 表达；
- 即使两个 CR 后续被接受，Android 仍必须在独立 Phase 完成 Legacy migration 和 Client/UI defect 修复；本审计不等于 runtime、Backend、数据库、设备、Staging 或发布验收。

因此：

```text
Phase 5D-A：PARTIAL
```

不是 `BLOCKED`，因为全量审查、分类和 CR bundle 已完成；不是 `PASS`，因为固定 Contract 仍有 2 个真实缺口，当前 Android runtime 也未完成正式绑定。

## 13. Phase 结束模板

```text
完成状态：PARTIAL（审查工作 DONE；Contract 完整支撑结论为否）
修改文件：
- docs/rebuild/handoffs/phase-5d-a-android-full-contract-surface-audit.md
- docs/rebuild/STATUS.md
执行的测试：
- 固定 Contract SHA-256 现场复核
- metadata version/status/path/operation/error count 复核
- 47 个 STUDENT/ANONYMOUS operation 过滤与 44 个正式映射 operation 唯一计数
- 28 页面 / 80 Use Case / 11 未映射项静态矩阵复核
- 最终 git diff / 路径边界 / whitespace 检查
真实测试结果：上述静态审查与一致性检查通过；2 个 Contract 缺口、6 个 Legacy bundle、12 个 Client defect、6 个 UI/Product finding 已记录
未执行测试及原因：未执行 Android build/unit/lint/device、Backend conformance、数据库/COS、E2E、Staging/Production；本阶段只读审查且未修改产品源码或 Contract，这些运行验证不能替代后续迁移/实现 Phase
是否修改了业务规则：否
是否修改了 Contract：否；Version/SHA 不变
是否存在旧 API 引用：是；正式 Android runtime 仍主要使用旧 Endpoint/DTO/Client
是否存在 Mock、TODO、空接口：存在既有 simulated scan、local-review/mock URI 支持；本轮未新增。main source 静态检索未命中 TODO()/NotImplementedError 空实现
下一阶段前置条件：独立 Contract review 评审 CR-5DA-001/002；接受项更新业务一致的 Contract source、提升版本并生成新 SHA；Android 重新生成/绑定后，按 LM bundle 分 Slice 迁移并修复 CD/UPF，再执行 unit/lint/build/device/Backend conformance/E2E
```
