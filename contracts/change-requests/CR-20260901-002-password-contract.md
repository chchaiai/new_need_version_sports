# CR-20260901-002：Teacher/Admin Password Gate and Self-Service Reset Alignment

- 状态：`ACCEPTED`
- 初始状态：`PROPOSED`
- 提交人：Phase 5C.2-A Password Contract CR Creation & Review
- Contract 当前版本：`1.1.0-contract` / `RC`
- Contract 当前 SHA-256：`1d538483f96b95d777cc4dd02526b78a214bd663e036ea5a6c77f43dfa38d99d`
- Contract 落地版本：`1.2.0-contract` / `RC` / `667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a`
- 业务权威与决定编号：[总业务流程](../../docs/business/00-overview.md) `P5E-NBD-02`、[教师端业务流程](../../docs/business/20-teacher-flow.md) 第 3 节、[管理员端业务流程](../../docs/business/30-admin-flow.md) 第 4～5、9 节
- 独立评审：2026-09-01 Phase 5C.2-A；正式提案项全部 `ACCEPTED`

## 1. 变更原因、Use Case 与边界

Phase 5E 已接受 `PWD-POLICY-A + PWD-FIRST-B + PWD-ADMIN-B` 及统一权限、会话和错误包。当前 `1.1.0-contract` 已经能够表达个人密码非空、Teacher 首次改密、Teacher/Admin 本人改密、已验证邮箱自助重置、登录/刷新/本人恢复 `mustChangePassword`、会话撤销和反枚举的主体结构，但没有完整表达以下已接受行为：

1. 分管理员和初始总管理员的临时初始密码也必须进入首次改密门禁；
2. Admin 在门禁清除前不能进入其他管理员业务；
3. `UpdateSubAdminRequest` 仍允许总管理员通过 `newPassword / confirmNewPassword` 替换分管理员个人密码；
4. `resetPassword` 没有声明已验证 proof 对应 `DISABLED` 账号的 `403 ACCOUNT_DISABLED`，也没有明确成功后清除首次改密门禁；
5. `changeOwnPassword` 的成功说明只写 Teacher gate，且没有声明 `ACTIVE` 前置对应的稳定 `ACCOUNT_DISABLED` 行为。

本 CR 只把已经 `ACCEPTED` 的业务规则映射到公共协议，不新增业务规则，不修改当前 OpenAPI、metadata、Version 或 SHA，也不授权 Backend/Web/Android 实现、Legacy Migration、部署或发布。

## 2. 术语消歧

- **临时初始密码**：由系统或他人分配给 Teacher/Admin 的初始 credential；登录后 `CurrentActor.mustChangePassword=true`，只能进入本人改密、退出以及必要的公开/认证恢复面。
- **个人密码**：Teacher/Admin 本人通过首次改密、日常本人改密或已验证学校邮箱自助重置设置的密码；只要求非空。
- **自助重置**：当前 `resetPassword`；匿名调用者消费本人已验证学校邮箱的 `PASSWORD_RESET` challenge，并直接设置最终个人密码。成功后清除 gate、撤销全部旧 session、且不自动登录。
- **管理员代他人重置**：总管理员为 Teacher/Sub-admin 生成或设置密码。Phase 5E 的 `PWD-ADMIN-C` 已 `REJECTED`，当前业务不存在该 Use Case；不得把它与管理员账号持有人使用自助 `resetPassword` 混为一谈。

因此，“管理员执行 password reset 时生成临时密码”若指管理员代他人重置，不属于已接受业务，也不是 Contract 缺口；若指 Admin 账号持有人自助重置，其已接受语义是设置最终个人密码并清除 gate，而不是恢复临时密码。

## 3. 固定基线只读结论

| 检查 | 当前 `1.1.0-contract` 事实 |
|---|---|
| Version / Status / SHA | `1.1.0-contract` / `RC` / `1d538483f96b95d777cc4dd02526b78a214bd663e036ea5a6c77f43dfa38d99d`，metadata 与实际文件一致 |
| 个人密码强度 | `PasswordChangeRequest.newPassword`、`PasswordResetRequest.newPassword` 均 `minLength: 1` |
| 初始密码强度 | `CreateTeacherBatchRequest.initialPassword` 为 ≥8 + 大写/小写/数字；`CreateSubAdminRequest.initialPassword / confirmInitialPassword` 均只要求非空 |
| Gate 投影 | `CurrentActor.mustChangePassword` 为 required boolean；`SessionTokenPair.actor` 复用 `CurrentActor` |
| Teacher gate | Teacher 正常业务 operation 已声明 `403 FIRST_PASSWORD_CHANGE_REQUIRED`；`changeOwnPassword` 当前说明只清除 Teacher gate |
| Admin gate | 52 条含 `ADMIN` 角色绑定中，7 条为 gate-safe/public，5 条正常业务已经声明该错误，另有 **40 条**正常 Admin 业务未声明 `FIRST_PASSWORD_CHANGE_REQUIRED`；这 40 条都已有 `403 ErrorEnvelope` response |
| 分管理员普通编辑 | `UpdateSubAdminRequest` 的 `newPassword / confirmNewPassword` 均是 required nullable 字段；非 null 时可代设密码 |
| 自助 reset | `resetPassword` 为匿名、已验证邮箱 scope、200 `CommandAccepted`；已声明撤销全部旧 session，但没有 `ACCOUNT_DISABLED`，也没有 `403` response 或 gate-clear 说明 |
| 本人改密 | `changeOwnPassword` 为 Teacher/Admin self、当前密码 + expectedVersion、维护可用、200 `CurrentActor`；已声明撤销其他 session，但 gate-clear 说明限于 Teacher，且没有 `ACCOUNT_DISABLED` |
| 反枚举 | `requestAuthChallenge` 固定 `202 AuthChallenge`，`AuthChallengeRequest` 只有 purpose + email，说明明确不泄露账号是否存在 |
| 秘密与审计 | 密码、OTP、refresh token 为 `writeOnly`/password-format；`AuditSafeMetadata` 没有可表达密码、OTP、Token 或 secret 的字段 |
| 禁止的新错误 | `PASSWORD_POLICY_VIOLATION / TOO_LONG / BLOCKLISTED / SAME_AS_CURRENT` 均不在 `ErrorCode` 或 `x-error-catalog` 中 |
| 管理员代重置 endpoint | 不存在 Teacher/Sub-admin admin-on-behalf password reset operation；唯一密码写 operation 为 `resetPassword`、`changeOwnPassword` 和当前有缺陷的 `updateSubAdmin` 字段 |

## 4. 已接受业务规则逐项矩阵

| ID | 业务规则 | 当前 operation | Request | Response | HTTP Status / `error.code` | 判断 | 是否需要本 CR |
|---|---|---|---|---|---|---|---|
| PWD-01 | Teacher/Admin 个人密码只要求非空 | `changeOwnPassword`、`resetPassword` | `PasswordChangeRequest.newPassword minLength:1`；`PasswordResetRequest.newPassword minLength:1` | `CurrentActor`；`CommandAccepted` | 400 `INVALID_REQUEST` 可承载非空校验失败 | `ALREADY_SUPPORTED` | 否；不得收紧 |
| PWD-02 | Teacher 批量初始密码保持强初始规则并进入首次 gate | `createTeacherAccountBatch`、`createPasswordSession`、Teacher 正常业务 | `CreateTeacherBatchRequest.initialPassword` ≥8 + 大小写/数字 | `TeacherBatchCreationResult.teachers[].mustChangePassword`；`SessionTokenPair.actor.mustChangePassword` | 登录 201；Teacher 正常业务 403 `FIRST_PASSWORD_CHANGE_REQUIRED` | `ALREADY_SUPPORTED` | 否 |
| PWD-03 | 分管理员初始密码只非空/一致，且属于临时密码 | `createSubAdmin` | `CreateSubAdminRequest.initialPassword / confirmInitialPassword` | 201 `SubAdmin`；后续登录为 `SessionTokenPair.actor` | 当前创建错误已覆盖 400/409/422 等，但未定义 gate side effect | `CONTRACT_GAP` | 是：明确创建时 `must_change=true`，不新增强度 |
| PWD-04 | 初始总管理员的系统分配密码属于临时密码 | 无外部 provisioning operation；登录后使用 `createPasswordSession` | `PasswordSessionRequest` | 201 `SessionTokenPair.actor.mustChangePassword` | 401 `INVALID_CREDENTIALS` / 403 `ACCOUNT_DISABLED` | provisioning 为 `OUT_OF_SCOPE`；登录投影 `ALREADY_SUPPORTED` | 不新增 provisioning API；Admin gate 见 PWD-07 |
| PWD-05 | 登录 response 可表达 gate | `createPasswordSession` | `PasswordSessionRequest` | `SessionTokenPair.actor.mustChangePassword` | 201；401 `INVALID_CREDENTIALS`；403 `ACCOUNT_DISABLED` | `ALREADY_SUPPORTED` | 否；仅补 role-neutral field 说明 |
| PWD-06 | refresh/current-user 可稳定恢复 gate | `refreshSession`、`getCurrentActor` | `RefreshSessionRequest`；无 body | `SessionTokenPair.actor`；`CurrentActor` | 200；refresh 可 401/403，`/me` 可 401/403 | `ALREADY_SUPPORTED` | 否；字段语义需与 Admin gate 一致 |
| PWD-07 | Teacher/Admin 在临时密码 gate 下只能改密或退出，不能进入其他业务 | Teacher/Admin 全部受保护业务 | 各 operation 既有 request | 既有 response 或 `ErrorEnvelope` | Teacher 已覆盖；Admin 5 条已声明，40 条缺少 403 `FIRST_PASSWORD_CHANGE_REQUIRED` | `CONTRACT_GAP` | 是：扩展错误定义并补齐 40 条 Admin operation |
| PWD-08 | ACTIVE Teacher/Admin 本人凭当前密码 + version 改密；保留当前 session、撤销其他 session并清除 gate | `changeOwnPassword` | `PasswordChangeRequest` 已含 current/new/expectedVersion | 200 `CurrentActor` | 已有 400/401/403/409/412/429/500/503；缺稳定 403 `ACCOUNT_DISABLED`，说明只提 Teacher gate | `CONTRACT_GAP` | 是：补 ACTIVE/disabled 和 role-neutral gate-clear 语义；不改 JSON shape |
| PWD-09 | 总管理员不得在普通编辑中代设分管理员个人密码 | `updateSubAdmin` | `UpdateSubAdminRequest` 当前仍含 `newPassword / confirmNewPassword` | 200 `SubAdmin` | 400/401/403/404/409/412/422/429/500/503 | `CONTRACT_GAP` | 是：删除两字段及 required entries，并改 operation summary/description |
| PWD-10 | 管理员不得代设或重置 Teacher 个人密码 | 无 admin-on-behalf Teacher password operation | 无 | 无 | 无 | `ALREADY_SUPPORTED` | 否；不得新增 endpoint/DTO |
| PWD-11 | 不存在管理员应急代设 Sub-admin/Teacher 密码路径 | 无独立 operation；当前绕过点仅 PWD-09 的两个字段 | 无合法 request | 无 | 无 | `OUT_OF_SCOPE`（`PWD-ADMIN-C` 已 REJECTED） | 否；删除绕过字段即可，不新增临时 reset operation |
| PWD-12 | Teacher/Admin 通过已验证学校邮箱自助 reset，成功撤销全部 session、不自动登录并清除 gate | `requestAuthChallenge`、`resetPassword` | `AuthChallengeRequest(PASSWORD_RESET,email)`；`PasswordResetRequest(otpProof,newPassword)` | 202 `AuthChallenge`；200 `CommandAccepted` | 当前 400/401/409/429/500/503；缺 gate-clear 说明 | `CONTRACT_GAP` | 是：明确最终个人密码、clear gate、no auto-login；保持现有 response shape |
| PWD-13 | disabled account reset 在 proof 有效后稳定返回停用错误，不能恢复访问 | `resetPassword` | `PasswordResetRequest` | `ErrorEnvelope` | 当前缺 403 response 与 `ACCOUNT_DISABLED` | `CONTRACT_GAP` | 是：新增既有 403 `ACCOUNT_DISABLED`；不得在 challenge request 阶段泄露 |
| PWD-14 | challenge 反枚举；删除账号不能借 reset 恢复 | `requestAuthChallenge`、`resetPassword` | purpose + email；OTP proof | 固定 202；reset 失败为 `ErrorEnvelope` | 202 外观；401 `INVALID_CREDENTIALS / CHALLENGE_EXPIRED` | `ALREADY_SUPPORTED` | 否；实际 proof/challenge 生命周期为 Backend conformance |
| PWD-15 | reset 后客户端如何获知 temporary/gate 状态 | `createPasswordSession`、`refreshSession`、`getCurrentActor`；本人改密直接返回 `CurrentActor` | 既有 request | `SessionTokenPair.actor.mustChangePassword` / `CurrentActor.mustChangePassword` | 200/201；门禁业务为 403 `FIRST_PASSWORD_CHANGE_REQUIRED` | `ALREADY_SUPPORTED` | 不新增字段；补齐 PWD-07/PWD-08/PWD-12 语义即可 |
| PWD-16 | 改密、reset、停用和删除后的会话/账号行为 | `changeOwnPassword`、`resetPassword`、`setSubAdminState`、`deleteOwnAccount`、`deleteTeacherAccount`、`deleteSubAdmin` | 既有 request | `CurrentActor` / `CommandAccepted` / `SubAdmin` / `DeletionResult` | 既有 200/403 等；停用/删除 operation 已有失败 envelope | `IMPLEMENTATION_ONLY`（Contract 语义已足够，除 PWD-08/12/13 的明确缺口） | 不新增 DTO；Backend 必须事务性实现并验证 |
| PWD-17 | 密码、验证码、Token 不进入普通日志/业务记录/AuditEvent，只记录安全动作、结果和 request ID | 所有 Password/Auth operation；Audit query operations | secret 字段均 write-only | `ErrorEnvelope.requestId`、响应 `X-Request-Id`；`AuditSafeMetadata` 无 secret 字段 | 正常/失败均可关联 request ID | `IMPLEMENTATION_ONLY` | 不改 OpenAPI；Backend 日志/审计门禁必须验证 |
| PWD-18 | 不新增四个密码策略错误及其限制 | `changeOwnPassword`、`resetPassword` | 仅非空 | 既有 response | 继续使用 `INVALID_REQUEST` 等既有错误；四码不存在 | `ALREADY_SUPPORTED` | 否；CR 明确禁止新增 |

## 5. 建议协议语义（本 CR 正式提案）

### AC-01：Admin 临时初始密码与可恢复 gate

1. `createSubAdmin` / `CreateSubAdminRequest` 说明必须明确：成功创建的初始密码是临时密码，Backend 同一事务设置 `must_change=true`。
2. `CurrentActor.mustChangePassword` 的说明改为角色中立：Teacher/Admin 的临时初始密码尚未完成本人改密时为 `true`；本人改密或已验证邮箱自助 reset 成功后为 `false`。
3. `createPasswordSession`、`refreshSession` 和 `getCurrentActor` 继续复用现有 `CurrentActor`，不新增平行 gate 字段，也不在 `SubAdmin` 治理投影中暴露目标 credential 状态。

### AC-02：Admin 首次改密门禁

1. `FIRST_PASSWORD_CHANGE_REQUIRED` 的 catalog 说明从 Teacher-only 扩展为 Teacher/Admin 临时初始密码 gate，HTTP status 保持 `403`。
2. 以下 5 条 Admin 可用业务 operation 已经声明该 code，只需由 role-neutral 定义使其对 Admin 生效：`changeOwnVerifiedEmail`、`getCurrentSemester`、`listOwnNotifications`、`getOwnUnreadNotificationCount`、`markOwnNotificationRead`。
3. 以下 **40 条** Admin 正常业务 operation 必须把既有 `FIRST_PASSWORD_CHANGE_REQUIRED` 加入各自 `x-error-codes`；它们已经全部声明 `403 ErrorEnvelope`，无需新增 response schema：

| 业务域 | operationId |
|---|---|
| 本人账号 | `getOwnAccountDeletionImpact`, `deleteOwnAccount` |
| 学期 | `listSemesters`, `createSemester`, `updateUpcomingSemester`, `switchCurrentSemester` |
| 管理员课程只读 | `listCurrentCoursesForAdmin`, `getCurrentCourseForAdmin` |
| 耐力规则 | `listEnduranceRuleTables`, `getEnduranceRuleTable`, `reviseEnduranceRuleTable` |
| 反馈 | `listFeedbackForAdmin`, `getFeedbackForAdmin`, `processFeedback` |
| 帮助中心 | `listHelpArticlesForAdmin`, `createHelpArticle`, `getHelpArticleForAdmin`, `updateHelpArticle`, `transitionHelpArticleState` |
| 系统模式治理 | `listSystemModeTransitions`, `switchSystemMode` |
| 审计 | `listAuditEvents`, `getAuditEvent`, `requestAuditArchive`, `getAuditArchiveJob`, `authorizeAuditArchiveDownload` |
| Teacher 账号 | `listTeacherAccounts`, `getTeacherAccount`, `validateTeacherAccountBatch`, `createTeacherAccountBatch`, `deleteTeacherAccount` |
| Student 账号 | `listStudentAccounts`, `getStudentAccount` |
| Sub-admin 治理 | `listSubAdmins`, `createSubAdmin`, `getSubAdmin`, `updateSubAdmin`, `setSubAdminState`, `deleteSubAdmin` |
| Dashboard | `getAdminDashboard` |

4. Gate-safe/恢复面保持可用：`createPasswordSession`、`refreshSession`、`getCurrentActor`、`changeOwnPassword`、`logoutCurrentSession`、`logoutAllSessions`、`requestAuthChallenge`、`resetPassword`，以及公开启动观察 `getAppReleasePolicy`、`getSystemMode`。该清单不授权进入其他业务。

### AC-03：本人改密的 ACTIVE、session 与 gate 语义

`changeOwnPassword` 保持现有 Method/Path、request 和 200 `CurrentActor`：

- 仅 `ACTIVE` Teacher/Admin self；无需管理员业务权限；维护模式继续允许；
- 当前密码错误为 401 `INVALID_CREDENTIALS`，stale version 为 412 `VERSION_CONFLICT`；
- 增加既有 403 `ACCOUNT_DISABLED` 到 `x-error-codes`，现有 403 response 可复用；
- 成功保留当前 session、撤销其他 session；返回的 `CurrentActor.mustChangePassword=false`，不再只写 Teacher gate。

### AC-04：删除分管理员代设字段

1. 从 `UpdateSubAdminRequest.properties` 和 `required` 同时删除 `newPassword`、`confirmNewPassword`。
2. `updateSubAdmin` summary/description 只允许姓名、已验证学校邮箱、部门、固定权限和 expected version；登录名继续不可修改。
3. 保持 `additionalProperties:false`，使旧客户端继续发送密码字段时明确失败，而不是被静默忽略。
4. 不新增 Admin reset Teacher/Sub-admin operation、request 或 response。

### AC-05：自助 reset 的 disabled 与 gate-clear 语义

`resetPassword` 保持现有 Method/Path、`PasswordResetRequest` 和 200 `CommandAccepted` JSON shape：

- proof 必须是本人已验证学校邮箱的未过期、未消费 `PASSWORD_RESET` challenge；
- `newPassword` 是最终个人密码，只要求非空，不是管理员分配的临时密码；
- 成功撤销全部旧 session、清除 `mustChangePassword`、不签发 session、不自动登录；下一次 `createPasswordSession` / `refreshSession` / `getCurrentActor` 观察到 `false`；
- 对存在但为 `DISABLED` 的账号，只在 proof 已有效验证后返回 403 `ACCOUNT_DISABLED`，不能修改 credential、清除 gate 或恢复账号；
- 已删除/不存在账号继续保持 challenge 反枚举和 reset 失败，不新增 `RESOURCE_NOT_FOUND` 等枚举泄露；
- 在 `resetPassword.x-error-codes` 增加现有 `ACCOUNT_DISABLED`，并增加 `403 Forbidden` response；其他 status/code 不变。

### AC-06：明确不变项

- 不新增 `PASSWORD_POLICY_VIOLATION / TOO_LONG / BLOCKLISTED / SAME_AS_CURRENT`；
- 不设置个人密码最大长度、blocklist、密码历史、与当前密码不同或任意周期轮换；
- 不增加管理员代他人 reset endpoint；
- 不新增 `PasswordResetResult`、第二个 gate 字段或 Sub-admin 目标 credential 状态字段；
- 不改变 challenge 的 202 反枚举外观、现有 token shape、HTTP base path、角色或管理员权限模型。

## 6. API 影响

| 项目 | 变更 |
|---|---|
| Method / Path | 不新增或删除 path；语义涉及 `POST /auth/sessions/password`、`POST /auth/sessions/refresh`、`POST /auth/password/reset`、`GET /me`、`PUT /me/password`、`POST /admin/sub-admins`、`PUT /admin/sub-admins/{adminId}`，以及 AC-02 的 40 条 Admin 业务 operation |
| operationId | 直接语义：`createPasswordSession`, `refreshSession`, `resetPassword`, `getCurrentActor`, `changeOwnPassword`, `createSubAdmin`, `updateSubAdmin`；门禁错误：AC-02 完整清单 |
| 角色 / 管理员权限 / resource scope | Teacher/Admin self 与匿名 verified-email scope 不变；Admin gate 扩展到所有正常 Admin 业务；不新增管理员代设权限 |
| RequestDTO | `UpdateSubAdminRequest` 删除两个 required nullable password 字段；其他 request JSON shape 不变 |
| ResponseDTO | JSON shape 不变；继续使用 `SessionTokenPair`, `CurrentActor`, `CommandAccepted`, `SubAdmin`, `ErrorEnvelope` |
| Schema 说明 | role-neutral 明确 `CurrentActor.mustChangePassword`；`CreateSubAdminRequest` 明确临时初始密码；`ErrorCode` enum 不变 |
| Error code / HTTP status | `FIRST_PASSWORD_CHANGE_REQUIRED` 继续 403，扩展 Admin operation 范围；`resetPassword` 新增 403 `ACCOUNT_DISABLED`；`changeOwnPassword` 增加既有 403 `ACCOUNT_DISABLED`；不新增 error code |
| 分页 / 时间 / null | 无变化；删除 `UpdateSubAdminRequest` 两个 nullable 字段，不以 null 继续保留旧代设能力 |
| 上传 | 无变化 |
| 幂等 / 并发 | 既有 `Idempotency-Key` 与 `expectedVersion` 不变；改密/reset/createSubAdmin 的 credential、gate、session revoke、version 与 safe audit 必须原子提交 |
| 认证 / 安全 | 反枚举、verified-email proof、ACTIVE 检查、secret 不披露、session revoke 和 gate enforcement 明确化 |

## 7. 兼容性与下游

- 破坏性：**是**。
  - `UpdateSubAdminRequest` 当前两个字段是 required nullable；删除后，旧客户端继续发送它们会因 `additionalProperties:false` 被拒绝。
  - 40 条 Admin operation 增加一个可返回的稳定 403 code，旧客户端必须先处理 gate，不能继续假设这些 operation 在临时密码 session 下可用。
  - `resetPassword` 新增 403 `ACCOUNT_DISABLED` 明确了此前未声明的失败分支。
- Android：当前正式 Android 初版没有 Teacher/Admin 管理 UI，但共享 Contract binding/version/SHA 必须重新加载；确认 `CurrentActor` shape 未变，学生认证行为不受扩展 gate 影响。
- 学生 Web：重新生成共享 Contract binding；不得把 Teacher/Admin 个人密码规则套给学生，也不得恢复旧 Password DTO。
- 教师/管理员 Web：登录/refresh/`/me` 读取 `mustChangePassword` 并只路由改密/退出；删除分管理员编辑密码字段；处理 reset 的 `ACCOUNT_DISABLED`；不得保留 12 位私有限制或 admin-on-behalf reset UI。
- Backend / Contract Adapter：实现 role-neutral `must_change`、Admin 全 operation gate、ACTIVE 检查、session revoke、anti-enumeration 和 stable ErrorEnvelope mapping；普通 Sub-admin update adapter 不再接受密码字段。
- Domain 映射：沿用 `must_change`、`password_version`、account `ACTIVE/DISABLED`、challenge purpose 和 session revoke；不新增密码策略 Domain 状态。
- 数据库查询/约束：现有 `password_credential.must_change/password_version`、`login_account.access_state`、`auth_session` revoke 字段和 `auth_challenge` digest 已足够；**不需要新表或新列**。需要 Backend 事务按已接受语义设置/清除 gate 并撤销正确 session。
- Mock / fixture：新增 Admin 临时登录、40 operation gate、本人改密 clear、disabled self-reset、deleted anti-enumeration、UpdateSubAdmin extra-field rejection 和 session revoke fixtures；Mock 不能冒充正式 Backend。

## 8. 独立 Contract Review

### 8.1 评审方法

独立评审重新以 Phase 5E 和三份相关业务权威为起点，只读核对固定 OpenAPI/metadata、Phase 5D-B 全表面审计及当前 Password/Auth/Admin operation、DTO、status 和 error catalog。旧 API、当前 Web 私有校验和 Legacy DTO 未作为协议来源。

### 8.2 提案项结论

| 项目 | 评审状态 | 理由 |
|---|---|---|
| AC-01 Admin 临时初始密码与 gate 投影 | `ACCEPTED` | `CurrentActor` 已有足够 wire 字段，但 `createSubAdmin` 未声明临时/gate side effect；补语义不新增字段或业务 |
| AC-02 Admin 全业务 gate | `ACCEPTED` | 业务明确 Admin 首次只能改密/退出；当前 40 条 Admin 正常 operation 缺稳定 code，且都已有 403 response，可最小化补齐 |
| AC-03 本人改密 role-neutral clear + disabled | `ACCEPTED` | request/response 已足够；当前 Teacher-only 描述与 ACTIVE 规则不完整，复用既有 403/`ACCOUNT_DISABLED` 即可 |
| AC-04 删除 `UpdateSubAdminRequest` 两个密码字段 | `ACCEPTED` | 当前 DTO 直接绕过 `PWD-ADMIN-B`；删除是唯一不保留代设能力的协议修正 |
| AC-05 self reset disabled + gate-clear | `ACCEPTED` | 当前缺 403/`ACCOUNT_DISABLED` 和 clear-gate 语义；保留 `CommandAccepted` 加明确成功语义足够，不需要新增 response DTO |
| AC-06 不变项 | `ACCEPTED` | 精确遵守 Phase 5E，避免把旧客户端或未选安全方案写回 Contract |

### 8.3 明确排除的非缺口

| 候选改动 | 评审状态 | 理由 |
|---|---|---|
| 新增 Admin reset Teacher/Sub-admin endpoint | `REJECTED / NOT_CONTRACT_DEFECT` | Phase 5E 已拒绝 `PWD-ADMIN-C`；当前 endpoint 缺席是正确边界 |
| 把 Admin 自助 reset 改成临时密码/恢复 gate | `REJECTED / NOT_CONTRACT_DEFECT` | 已接受规则要求本人自助设置最终个人密码并清除 gate |
| 新增 `PasswordResetResult` 或第二个 gate 字段 | `REJECTED / NOT_CONTRACT_DEFECT` | `CommandAccepted` + 明确成功语义，以及登录/refresh/`/me` 的 `CurrentActor.mustChangePassword` 已足够 |
| 在 `SubAdmin` 治理投影暴露目标 gate/credential 状态 | `REJECTED / NOT_CONTRACT_DEFECT` | 总管理员不需要取得他人 credential 状态来执行已接受 Use Case；本人投影已足够 |
| 新密码复杂度、最大长度、blocklist、历史或四个新 error code | `REJECTED / NOT_CONTRACT_DEFECT` | Phase 5E 明确删除/拒绝这些限制 |
| 修改 Android/Web/Backend 或执行 Legacy Migration | `REJECTED / OUT_OF_SCOPE` | 本阶段只创建和评审 CR，不授权实现 |

### 8.4 最终评审状态

`ACCEPTED`

正式提案 AC-01～AC-06 全部通过；上表被拒绝的是评审中排除的非缺口，不属于本 CR 的已接受变更集。因此不使用 `PARTIALLY_ACCEPTED`。本状态只授权后续 Phase 5C.2 Final Contract Consolidation 把已接受协议变化统一落入确定性 Contract source；本任务本身不得修改 OpenAPI。

## 9. 迁移、回滚与验证

1. Final Contract Consolidation 只实现 AC-01～AC-06，更新确定性 Contract source 后生成 OpenAPI；不得手改生成物或夹带其他业务变化。
2. 提升 Contract Version、重新计算 metadata SHA，并保留当前 `1.1.0-contract` 可识别；所有下游显式重载，禁止 old/new 双 DTO fallback。
3. Contract test 至少覆盖：Teacher/Admin personal password 非空；Sub-admin 创建 gate=true；Admin 40 operation 403 gate；gate-safe operation；changeOwnPassword current-session retained/others revoked/gate=false；reset all-session revoke/no login/gate=false；disabled proof 后 403；deleted anti-enumeration；UpdateSubAdmin 旧密码字段被拒绝；四个禁止错误不存在。
4. OpenAPI lint、结构校验、RC readiness、operation catalog/coverage、Android/Web codegen/binding 和 Backend conformance 必须在新版本重跑。
5. Staging 使用合成 Teacher/SUPER/SUB 账号验证首次登录、恢复、本人改密、self reset、disabled、delete 和 session invalidation；不得使用真实密码、OTP、Token 或个人信息作为测试输出。
6. 若整包回滚，Contract 与全部下游一起回到当前固定 `1.1.0-contract` / SHA；不得只恢复 `UpdateSubAdminRequest` 代设字段或只移除 gate error。

## 10. 审批记录

- 2026-09-01：Phase 5C.2-A 根据 Phase 5E `ACCEPTED` 业务规则创建本 CR，初始状态为 `PROPOSED`；未修改 OpenAPI、metadata、Version 或 SHA。
- 2026-09-01：独立 Contract review 完成。固定基线、规则矩阵、52 条 Admin 角色绑定、40 条 gate 缺口、DTO/status/error 与反枚举边界复核通过；正式提案 AC-01～AC-06 全部 `ACCEPTED`。
- 2026-09-01：Phase 5C.2 Final Contract Consolidation 已把 AC-01～AC-06 落入确定性 source；40/40 Admin gate、10/10 gate-safe、本人改密/reset、disabled、字段删除与禁止错误专项断言均通过，落地版本与 SHA 见本文件头部。
- Android / Student Web / Teacher Web / Admin Web / Backend：`RELOAD REQUIRED AFTER CONSOLIDATION`；当前尚未授权或执行。
- Database：`SUPPORTED BY EXISTING DESIGN`；无新表/列，实际 migration/runtime 验证尚未执行。
- Contract Version / SHA / OpenAPI：已由 Phase 5C.2 Final Contract Consolidation 统一更新；下游尚未重新加载或实现。
