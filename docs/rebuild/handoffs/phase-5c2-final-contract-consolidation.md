# Phase 5C.2 Final Contract Consolidation Handoff

> 日期：2026-09-01（Asia/Shanghai）
>
> 完成状态：`DONE`
>
> 修改前：`1.1.0-contract` / `RC` / `1d538483f96b95d777cc4dd02526b78a214bd663e036ea5a6c77f43dfa38d99d`
>
> 修改后：`1.2.0-contract` / `RC` / `667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a`

## 1. 执行边界与固定基线

| 项目 | 结果 |
|---|---|
| Git 根目录 | `C:\Users\23328\Desktop\new_version` |
| 分支 / HEAD | `API-contract-Making` / `9d8a773bf8ef8097efc05b6d4571485b62b50333` |
| 起始工作树 | 保留 Phase 5C.2-B 既有未提交文档：`docs/rebuild/STATUS.md`、CR-003、CR-004 与 Phase 5C.2-B handoff；本轮未丢弃、stash、reset 或覆盖 |
| 已读取 AGENTS | 根 `AGENTS.md`；为下游只读影响定位另读取 Portal 嵌套 `AGENTS.md`，未修改 Portal |
| 固定基线 | 修改前现场确认 Version `1.1.0-contract`、Status `RC`、实际 SHA 与 metadata 均精确为 `1d538483...d99d`；109 paths / 121 operations / 192 schemas / 66 errors |
| 写入范围 | Contract 确定性 source、生成/验证工具、生成物、metadata、两个 ACCEPTED CR 的落地记录、Contract README/coverage/database-support、本 STATUS 与本 handoff |
| 禁止且未修改 | `docs/business/**`、Phase 3 正式设计、Android/Web 产品源码、Backend、数据库/Migration、Legacy runtime、CR-004 内容、Staging/Production/部署 |
| Git/发布动作 | Commit、Push、Merge、Tag、Deploy 均 `NOT EXECUTED` |

## 2. CR consolidation

本轮正式输入 CR 共 3 个：

| CR | 最终状态 | Consolidation 处置 |
|---|---|---|
| [CR-20260901-002 Password Contract](../../../contracts/change-requests/CR-20260901-002-password-contract.md) | `ACCEPTED` | AC-01～AC-06 全部落实 |
| [CR-20260901-003 Certification Kind](../../../contracts/change-requests/CR-20260901-003-certification-kind-round-trip.md) | `ACCEPTED` | 新增 closed enum 与 required/non-null field，落实共享 request/response round-trip |
| [CR-20260901-004 Student Dashboard No-current](../../../contracts/change-requests/CR-20260901-004-student-dashboard-no-current-semester.md) | `REJECTED / NOT_CONTRACT_DEFECT` | 明确未落实；Student Dashboard/current semester 语义保持不变 |

统计：`ACCEPTED=2`、`REJECTED=1`、`PARTIALLY_ACCEPTED=0`、`NEEDS_BUSINESS_DECISION=0`。Password 与 Certification 分别作用于 Identity/Admin 和 Applications schema，不存在字段、operation、status/error 或业务语义冲突。

## 3. Password CR 落地

### 3.1 40 条新增 Admin gate operation

以下 operation 精确来自 CR AC-02，全部新增 `403 FIRST_PASSWORD_CHANGE_REQUIRED`，没有扩大或缩小：

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

原有 5 条共享 Teacher/Admin operation 继续 gate：`changeOwnVerifiedEmail`、`getCurrentSemester`、`listOwnNotifications`、`getOwnUnreadNotificationCount`、`markOwnNotificationRead`。最终 ADMIN-role gated surface 精确为 `45/45`。

以下 10 条 gate-safe/recovery operation 均未被误加 gate：`requestAuthChallenge`、`createPasswordSession`、`refreshSession`、`resetPassword`、`getCurrentActor`、`changeOwnPassword`、`logoutCurrentSession`、`logoutAllSessions`、`getAppReleasePolicy`、`getSystemMode`。

### 3.2 其余 Password AC

- AC-01：`createSubAdmin` 与 `CreateSubAdminRequest` 明确初始 credential 是 temporary password，并在同一事务设置 `CurrentActor.mustChangePassword=true`；`CurrentActor` 描述改为 Teacher/Admin role-neutral set/clear 语义。
- AC-03：`changeOwnPassword` 明确只允许 ACTIVE Teacher/Admin self；保留当前 session、撤销其他 session、返回 `mustChangePassword=false`；增加既有 `403 ACCOUNT_DISABLED`。
- AC-04：`UpdateSubAdminRequest` 同时删除 `newPassword`、`confirmNewPassword` properties 与 required entries；保留 `additionalProperties:false`，没有 nullable/deprecated/private substitute。
- AC-05/06：`resetPassword` 明确 verified-email self reset 设置最终个人密码、清 gate、撤销全部旧 session、不签 token/不自动登录；proof-resolved disabled account 返回既有 `403 ACCOUNT_DISABLED` 且不改变 credential/gate/state；challenge anti-enumeration 保持。
- `PasswordChangeRequest.newPassword` 与 `PasswordResetRequest.newPassword` 仍只有 `minLength:1`，无最大长度/composition/blocklist/history/same-as-current 规则。
- `PASSWORD_POLICY_VIOLATION`、`TOO_LONG`、`BLOCKLISTED`、`SAME_AS_CURRENT` 在 error catalog、ErrorCode 和 operation error set 中均为 0。

## 4. Certification CR 与拒绝 CR 锁定

- 新增 `CertificationKind`，精确 enum 为 `SCHOOL_TEAM | STUDENT_CLUB`。
- `CertificationDetails.certificationKind` 是 direct `$ref`、required、non-null；共享对象继续 `additionalProperties:false`。
- `ApplicationType` 精确保持 `EXEMPTION | CERTIFICATION`；没有新 endpoint、筛选参数、HTTP status 或 error code。
- Request 影响精确为 `createStudentApplication`。
- Response 影响精确为 `createStudentApplication`、`supplementStudentApplication`、`listOwnApplications`、`getOwnApplication`、`listCourseApplications`、`getCourseApplication`、`decideStudentApplication`。
- `SCHOOL_TEAM` 与 `STUDENT_CLUB` 的完整 create request、完整 `StudentApplication` response 均通过 Draft 2020-12 schema；request 中的 certification object 被原样复制到 response，round-trip 相等。
- 缺字段、null、未知 enum、用名称替代 kind、额外 `applicationSubtype` 五类 request/response fixture 均被拒绝。
- CR-004 锁定断言通过：`StudentDashboard.currentSemester` 保持 required/direct non-null ref；`getStudentDashboard` 无 404/`RESOURCE_NOT_FOUND`；`getCurrentSemester` 仍 404；`TeacherDashboard.currentSemester` 仍 nullable。

## 5. Version、SHA 与 breaking

仓库 policy 要求 RC 后每次外部行为变化都建立 CR、提升 Contract version、重算 SHA 并要求下游显式重载；它没有另建独立 SemVer 分类表。上一轮同类 breaking consolidation 使用 `1.0.0-contract → 1.1.0-contract`，所以本轮沿用仓库既有 minor-line 递增规则选择 `1.2.0-contract`，状态保持 `RC`，不宣称 `APPROVED`。

本轮是 breaking change：

1. `UpdateSubAdminRequest` 删除两个原 required nullable 字段；旧请求会因 closed object 被拒绝。
2. 40 条 Admin operation 增加可观察 gate failure，`resetPassword` 增加 disabled failure。
3. Certification request/response 共享对象新增 required/non-null 字段。

确定性生成对 `openapi.yaml`、`operation-catalog.md`、`contract-metadata.json` 连续执行两次；三份文件各自两次 SHA 完全一致。metadata SHA 与实际 OpenAPI SHA 均为 `667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a`。

## 6. Validation

| Gate | 真实结果 |
|---|---|
| OpenAPI parse / duplicate YAML key | PASS |
| `python contracts/scripts/verify_contract.py` | PASS：109 paths / 121 unique operations / 193 schemas / 66 errors |
| `python contracts/scripts/check_rc_readiness.py` | PASS：status RC，无 PENDING decision |
| Redocly lint | PASS：API description valid，无 warning |
| operationId uniqueness / `$ref` integrity | PASS：121 unique，missing refs 0 |
| Schema / fixture validation | PASS：Draft 2020-12 + format checker；两类合法 request/response/round-trip 与五类非法 request/response |
| ErrorCode / HTTP status exact set | PASS：每个 operation 的非 2xx response status 精确等于其 `x-error-codes` catalog status set |
| Password assertions | PASS：40/40 new gate、45/45 total Admin gate、10/10 safe、字段删除、self change/reset、disabled、禁止错误 |
| Certification / rejected CR assertions | PASS：enum/required/non-null、受影响 operation exact set、round-trip、CR-004 不落地 |
| deterministic generation | PASS：连续两次三份生成物 hash 一致 |
| metadata / SHA | PASS：Version/Status/path/operation/error 与实际一致，metadata SHA = actual SHA |
| Python AST / JSON / strict UTF-8 | PASS |
| Markdown local links | PASS |
| `git diff --check` | PASS |
| Android/Web/Backend runtime、数据库、E2E、Staging/Production | `NOT EXECUTED`；本阶段禁止下游实现、迁移和部署 |

## 7. 精确 Re-validation Matrix

| 下游 | 必须重载/修改与重验 | 本阶段状态 |
|---|---|---|
| Android | 更新 [app/build.gradle.kts](../../../BNBU-ANDROID/app/build.gradle.kts) 中 validation-only Version/SHA pin；从新 root Contract 重生 isolated Kotlin models，至少锁定 `CertificationKind`、`CertificationDetails`、`CreateCertificationApplicationRequest`、`StudentApplication`；在 [Phase5aContractRevalidationTest.kt](../../../BNBU-ANDROID/app/src/test/java/edu/bnbu/student/mvp/phase5a/Phase5aContractRevalidationTest.kt) 增加两类合法 request/response/round-trip 与 unknown/extra-field fail-closed fixture。正式 runtime 的 `ApiStudentRepository` / `V1StudentWorkspaceGateway` 仍是 Legacy Migration，后续 Slice 才把旧 `ApplicationSubtype` 映射切到新 enum；不新增 Teacher/Admin 密码产品 UI | `RELOAD REQUIRED / NOT EXECUTED` |
| Student Web | 更新 `frontend/student/phase5b-contract.generated.ts` 与 `phase5b-contract-fixtures.ts` 的 Version/SHA/binding；认证提交必须发送 `certificationKind`，列表/detail/Profile 必须显示并 round-trip；`student-smoke.mjs` 与正式 `js/api.js`/`services.js` 中旧 `applicationSubtype` 仍按 Legacy Migration 单独处置，不允许 old/new fallback | `RELOAD REQUIRED / NOT EXECUTED` |
| Teacher Web | 更新 Portal `scripts/verify-phase5b-contract.mjs` pin、`app/phase5b-contract.generated.ts`、fixtures/revalidation tests；申请列表/detail/decision 显示 `CertificationKind`；登录/refresh/`/me` 对 `mustChangePassword=true` 只路由本人改密/退出，处理 `changeOwnPassword`/reset 的 `ACCOUNT_DISABLED`；`teacher-data.ts` 旧 subtype mapper 后续迁移 | `RELOAD REQUIRED / NOT EXECUTED` |
| Admin Web | 与 Teacher Web 共用新 binding/pin；为 40 条 Admin 业务统一处理 `FIRST_PASSWORD_CHANGE_REQUIRED`；`createSubAdmin` 展示临时密码语义；Sub-admin 编辑 request/UI 删除两个密码字段；本人改密/self reset/disabled 按新语义处理；不得新增 admin-on-behalf reset | `RELOAD REQUIRED / NOT EXECUTED` |
| Backend | `BNBU-Sports-Backend` 当前只有占位 README，没有可重载实现。未来 Contract Adapter/DTO、Identity/Application use case 必须实现 gate set/clear、ACTIVE/DISABLED、session revoke、reset anti-enumeration、safe audit；Applications Domain/mapper/persistence 必须原样保存 `CertificationKind`。不得从名称推断，也不得在 API Adapter 内补造私有字段 | `FUTURE IMPLEMENTATION / NOT EXECUTED` |
| Domain / Database | Phase 3 `certification_application_detail` 当前只含名称和有效期；Backend 初始化前先增加 Domain closed value 与数据库 non-null closed-set 列/constraint 或等价设计，覆盖创建事务、查询、mapper、历史数据策略和约束测试。若发现既有认证行，停止自动迁移并取得可审计的数据方案 | `ALIGNMENT REQUIRED` |

Phase 5D 记录的 Android/Web Legacy Migration Findings 全部继续保留；本轮没有替换旧 endpoint、删除旧 DTO/client、切 runtime 或执行 Phase 7A/7B。

## 8. 42 项最终交付核对

| # | 项目 | 结果 |
|---:|---|---|
| 1 | 输入 CR 总数 | 3 |
| 2 | ACCEPTED CR | 2：CR-002、CR-003 |
| 3 | REJECTED CR | 1：CR-004 |
| 4 | 实际落实的 AC | Password AC-01～06；Certification 第 2 节精确修改 |
| 5 | 明确未落实的 CR | CR-004 |
| 6 | CR 冲突 | 无 |
| 7 | 修改前 Version | `1.1.0-contract` |
| 8 | 修改后 Version | `1.2.0-contract` |
| 9 | 修改前 SHA | `1d538483...d99d` |
| 10 | 修改后 SHA | `667ae751...d74a` |
| 11 | Paths | 109 |
| 12 | Operations | 121 |
| 13 | Schemas | 193（原 192） |
| 14 | Errors | 66 |
| 15 | Breaking | 是 |
| 16 | Admin gate | 40/40 新增；45/45 最终 ADMIN-role gate |
| 17 | Gate-safe | 10/10 无误加 |
| 18 | UpdateSubAdminRequest | 两字段删除，替代 credential 字段 0 |
| 19 | Self change/reset | Teacher/Admin self、clear gate、session 语义完整 |
| 20 | ACCOUNT_DISABLED | change/reset 均有 403 |
| 21 | 禁止错误 | 0/4 存在 |
| 22 | CertificationKind | `SCHOOL_TEAM`, `STUDENT_CLUB` |
| 23 | certificationKind | required / non-null / closed enum ref |
| 24 | Round-trip fixture | 2/2 request、2/2 response、2/2 round-trip PASS；10/10 非法 request/response 拒绝 |
| 25 | 受影响 operation compatibility | request 1/1、response 7/7 精确命中 |
| 26 | Contract verify | PASS |
| 27 | RC readiness | PASS |
| 28 | Redocly lint | PASS |
| 29 | Deterministic generation | PASS |
| 30 | SHA / metadata | PASS |
| 31 | `$ref` integrity | PASS |
| 32 | CR-specific assertions | PASS |
| 33 | `git diff --check` | PASS |
| 34 | UTF-8 / links / metadata | PASS |
| 35 | 修改业务规则 | 否 |
| 36 | 修改 Android/Web/Backend | 否 |
| 37 | 执行 Legacy Migration | 否 |
| 38 | 新 NEEDS_BUSINESS_DECISION | 0 |
| 39 | 新 blocking Contract defect | 0 |
| 40 | Domain/Database alignment | 是，CertificationKind 前置 |
| 41 | Re-validation Matrix | 已在第 7 节精确列出 |
| 42 | 进入下一步 alignment 条件 | 是；Contract 已固定，须另行授权且不得从名称推断/自动回填 |

## 9. Phase 结束报告

```text
完成状态：DONE
修改文件：Contract source/验证/生成物/metadata/README/coverage/database-support/requirements；CR-002/003 落地记录；docs/rebuild/STATUS.md；本 handoff
执行的测试：OpenAPI parse、Contract verify、RC readiness、Redocly lint、operationId/refs/schema/error exact-set、Password/Certification/Rejected-CR assertions、Draft 2020-12 fixtures、两次确定性生成、SHA/metadata、AST/JSON/UTF-8/Markdown links、git diff --check
真实测试结果：全部已执行 Contract 与文档 gate PASS；109 paths / 121 operations / 193 schemas / 66 errors；最终 SHA 667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a
未执行测试及原因：Android/Web codegen、产品 build/browser/device、Backend、数据库、E2E、Staging/Production 未执行；本阶段禁止下游迁移/实现/部署
是否修改了业务规则：否；只落实两个正式 ACCEPTED CR
是否修改了 Contract：是；1.1.0-contract RC → 1.2.0-contract RC
是否存在旧 API 引用：是；Phase 5D Android/Web Legacy Migration Findings 原样保留，本轮未迁移
是否存在 Mock、TODO、空接口：既有 validation-only Mock、Legacy client 与 Backend 占位目录仍存在；本轮未新增 Fake Success、产品 Mock、TODO 或空接口
下一阶段前置条件：另行授权 Contract ↔ Domain/Database Alignment，先补 CertificationKind Domain/persistence 设计，再允许 Backend 初始化；各下游随后按同一 1.2.0-contract + SHA 显式重载
```
