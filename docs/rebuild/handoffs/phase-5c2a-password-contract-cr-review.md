# Phase 5C.2-A Password Contract CR Creation & Review Handoff

> 日期：2026-09-01
>
> Git 根目录：`C:\Users\23328\Desktop\new_version`
>
> 分支：`API-contract-Making`
>
> 起始 HEAD：`ee3a3f87ef38d7312b3276703bf8da3fbe9d6972`
>
> 最终状态：`DONE`
>
> CR 最终评审：`ACCEPTED`

## 1. Phase 开始基线与写入边界

| 项目 | 值 |
|---|---|
| 起始 `git status` | clean：`## API-contract-Making` |
| 已读取 AGENTS.md | 根 `AGENTS.md` |
| 当前 Phase | Phase 5C.2-A Password Contract CR Creation & Review |
| 允许修改 | [Password CR](../../../contracts/change-requests/CR-20260901-002-password-contract.md)、`docs/rebuild/STATUS.md`、本 handoff |
| 禁止修改 | `contracts/openapi.yaml`、Contract metadata/source/version/SHA、`docs/business/**`、Android、Web、Backend、infra、tests 与其他未授权路径 |
| 完成标准 | 固定 Contract 只读对照；完整规则矩阵；CR 先 PROPOSED 后独立评审；STATUS/handoff；禁止路径与固定 SHA 不变 |

本阶段跨目录只读检索，不从旧 API、当前 Web 私有实现、Legacy DTO 或 Mock 反向决定新 Contract。

## 2. 权威输入

已读取并对照：

- [Phase 5E handoff](phase-5e-remaining-business-decision-closure.md)；
- [总业务流程](../../business/00-overview.md) `P5E-NBD-02`；
- [教师端业务流程](../../business/20-teacher-flow.md) 第 3 节；
- [管理员端业务流程](../../business/30-admin-flow.md) 第 4～5、9 节；
- 当前 `contracts/openapi.yaml` 与 `contracts/contract-metadata.json`；
- [Phase 5D-B Web Full Contract Surface Audit](phase-5db-web-full-contract-surface-audit.md)及其 coverage/CR/migration 记录；
- 当前 Password/Auth/Admin operations、DTO、HTTP response 与 error catalog；
- Phase 3 Domain/数据库中 `password_credential.must_change/password_version`、PHC、challenge digest 和 session revoke 支撑。

Phase 5E 本身没有密码业务矛盾。审查中唯一需要消歧的是“管理员执行 password reset”：Phase 5E 明确拒绝管理员代他人应急重置；现有 `resetPassword` 是 Teacher/Admin 账号持有人通过已验证邮箱进行的本人自助 reset，成功设置最终个人密码并清除 gate。

## 3. 固定 Contract 基线

| 检查 | 结果 |
|---|---|
| Version | `1.1.0-contract` |
| Status | `RC` |
| metadata SHA | `1d538483f96b95d777cc4dd02526b78a214bd663e036ea5a6c77f43dfa38d99d` |
| 实际 OpenAPI SHA | 精确匹配 metadata 与任务固定值 |
| OpenAPI 结构 | 109 paths / 121 operations / 192 schemas / 66 errors（本轮修改前固定基线） |
| 本阶段 Contract 写入 | **无** |

## 4. 当前 Contract 已支持的密码规则

1. `PasswordChangeRequest.newPassword` 与 `PasswordResetRequest.newPassword` 均只要求 `minLength: 1`；没有 Portal 12 位、最大长度、blocklist、历史或 same-as-current 限制。
2. Teacher 初始密码保留 ≥8 + 大写/小写/数字；Teacher account/result 与 Teacher 普通业务已经具有 `mustChangePassword` / `FIRST_PASSWORD_CHANGE_REQUIRED` 表达。
3. Sub-admin 初始密码 request 已经只要求非空和两次字段；缺的是“创建后一定进入临时 gate”的协议语义，而不是强度字段。
4. `createPasswordSession` 返回 `SessionTokenPair.actor`，`refreshSession` 和 `getCurrentActor` 可稳定恢复 required boolean `CurrentActor.mustChangePassword`。
5. `changeOwnPassword` 已是 Teacher/Admin self，要求 current password + expected version，维护模式可用，成功返回 `CurrentActor` 并说明撤销其他 session。
6. `resetPassword` 已是匿名 verified-account-email self-service，使用 `PASSWORD_RESET` OTP proof，成功说明撤销全部旧 session。
7. `requestAuthChallenge` 固定 202 anti-enumeration，不要求 organization code。
8. `createPasswordSession` / `refreshSession` 已声明 `ACCOUNT_DISABLED`；Error catalog 已有 `INVALID_CREDENTIALS`、`CHALLENGE_EXPIRED`、`ACCOUNT_DISABLED`、`FIRST_PASSWORD_CHANGE_REQUIRED`、`VERSION_CONFLICT`、`RATE_LIMITED`。
9. 密码/OTP/token 字段不进入响应投影，AuditSafeMetadata 无法表达 secret；实际日志/审计写入仍属于 Backend conformance。
10. 当前没有 Admin reset Teacher/Sub-admin endpoint；这与 Phase 5E 拒绝 `PWD-ADMIN-C` 一致。

完整 `业务规则 → operation → Request → Response → status → error.code → 分类 → CR` 矩阵见 [CR 第 4 节](../../../contracts/change-requests/CR-20260901-002-password-contract.md#4-已接受业务规则逐项矩阵)。

## 5. 确认存在的 Contract gaps

| Gap | 当前行为 | CR 接受的协议修正 |
|---|---|---|
| G-01 Sub-admin 初始 credential 未声明临时/gate side effect | `createSubAdmin` 创建 credential，但 `SubAdmin` 无 gate 字段且 operation 未说明 `must_change=true` | 明确创建时事务性设置 gate；本人登录通过现有 `CurrentActor.mustChangePassword` 获知，不增加治理投影字段 |
| G-02 Admin 首次 gate 未覆盖全部业务 | 52 条 Admin binding 中：7 gate-safe/public、5 已声明 gate error、40 条正常业务缺 `FIRST_PASSWORD_CHANGE_REQUIRED` | Error catalog 改为 Teacher/Admin；40 条 operation 补既有 403 code；不改变 response JSON shape |
| G-03 本人改密说明仍 Teacher-only 且缺 disabled code | `changeOwnPassword` 清 gate 描述只写 Teacher，`x-error-codes` 无 `ACCOUNT_DISABLED` | 明确 ACTIVE Teacher/Admin、成功 current actor gate=false；加入既有 403 `ACCOUNT_DISABLED` |
| G-04 Sub-admin 普通编辑可代设个人密码 | `UpdateSubAdminRequest.newPassword / confirmNewPassword` 为 required nullable，非 null 可替换 credential | 删除两个 properties 与 required entries；更新 `updateSubAdmin` summary/description；保持 unknown-field rejection |
| G-05 disabled self-reset 无稳定行为 | `resetPassword` 无 403 response 与 `ACCOUNT_DISABLED` | valid proof 后 403 `ACCOUNT_DISABLED`；不得修改 credential、gate 或 account state |
| G-06 reset 成功未明确 gate-clear | 当前只说明更新密码并撤销 session，200 仅 `CommandAccepted` | 明确设置最终个人密码、清 gate、撤销全部旧 session、不发 token/不自动登录；保持 response schema |

## 6. operationId、Schema 与错误影响

### 6.1 直接 Password/Auth/Admin operation

- `requestAuthChallenge`
- `createPasswordSession`
- `refreshSession`
- `resetPassword`
- `getCurrentActor`
- `changeOwnPassword`
- `logoutCurrentSession`
- `logoutAllSessions`
- `createSubAdmin`
- `updateSubAdmin`

### 6.2 Admin gate operation

40 条需新增 `FIRST_PASSWORD_CHANGE_REQUIRED` 的 operation 已在 CR AC-02 逐域完整列出；数量断言为 `40/40`，且每条现有 response 已包含 `403 ErrorEnvelope`。另有 5 条 Admin 可用业务 operation 已经声明该 code：`changeOwnVerifiedEmail`、`getCurrentSemester`、`listOwnNotifications`、`getOwnUnreadNotificationCount`、`markOwnNotificationRead`。

### 6.3 Schema

| Schema | 结论 |
|---|---|
| `PasswordSessionRequest` | shape 不变 |
| `AuthChallengeRequest`, `AuthChallenge`, `OtpProof` | shape 与 202 anti-enumeration 不变 |
| `PasswordResetRequest` | shape 不变；`newPassword` 继续只非空 |
| `PasswordChangeRequest` | shape 不变；current/new/version 已足够 |
| `CurrentActor`, `SessionTokenPair` | shape 不变；明确 role-neutral gate 语义 |
| `CommandAccepted` | shape 不变；reset success 由 operation 语义定义 |
| `CreateTeacherBatchRequest`, `TeacherAccount`, `TeacherBatchCreationResult` | 已支持 Teacher 初始规则/gate，不改 shape |
| `CreateSubAdminRequest` | shape 不变；明确初始密码为 temporary 并设置 gate |
| `UpdateSubAdminRequest` | 删除 `newPassword / confirmNewPassword` properties 与 required entries |
| `SubAdmin` | shape 不变；不暴露他人 credential/gate 状态 |
| `ErrorCode`, `ErrorEnvelope` | enum/shape 不变；只扩展既有 code 的 operation 适用范围和说明 |

### 6.4 HTTP status / error.code

- `FIRST_PASSWORD_CHANGE_REQUIRED`：继续 `403`；从 Teacher-only 扩展到 Admin 正常业务。
- `ACCOUNT_DISABLED`：继续 `403`；加入 `resetPassword` 和 `changeOwnPassword` 的 `x-error-codes`，`resetPassword` 增加 403 response。
- `INVALID_CREDENTIALS` / `CHALLENGE_EXPIRED`：继续 `401`。
- `VERSION_CONFLICT`：继续 `412`。
- `RATE_LIMITED`：继续 `429`。
- `INVALID_REQUEST`：继续 `400`，用于非空/shape/cross-field 校验；不新增密码策略错误。

## 7. 独立评审结果

Password CR 先按规则建立为 `PROPOSED`，随后以业务权威优先、最小协议改动、角色一致性、反枚举、兼容性和下游影响重新评审。最终：

`ACCEPTED`

接受项：

1. Admin 临时初始密码与 role-neutral gate 语义；
2. 40 条 Admin 正常业务 operation 的 `FIRST_PASSWORD_CHANGE_REQUIRED`；
3. `changeOwnPassword` ACTIVE/disabled/Admin gate-clear 明确化；
4. 删除 `UpdateSubAdminRequest` 两个代设字段；
5. `resetPassword` 的 403 `ACCOUNT_DISABLED` 与 clear-gate/no-auto-login 明确化；
6. 保持个人密码只非空、无新 error、无 admin-on-behalf reset。

明确拒绝且不纳入 CR 的候选：

- 新增 Admin reset Teacher/Sub-admin endpoint：`REJECTED / NOT_CONTRACT_DEFECT`；
- 把 Admin self-reset 改为临时密码或恢复 gate：`REJECTED / NOT_CONTRACT_DEFECT`；
- 新增 `PasswordResetResult`、第二个 gate 字段或在 `SubAdmin` 暴露 credential 状态：`REJECTED / NOT_CONTRACT_DEFECT`；
- 新增四个密码策略错误或对应限制：`REJECTED / NOT_CONTRACT_DEFECT`；
- 在本任务直接修改 Contract 或下游：`OUT_OF_SCOPE`。

正式提案本身没有被拒绝项，因此最终不是 `PARTIALLY_ACCEPTED`。

## 8. Breaking、数据库与下游范围

| 范围 | 影响 |
|---|---|
| Breaking | **是**：删除 required nullable request fields；Admin operation 新增稳定 gate failure；reset 新增 disabled failure |
| Android | 共享 Contract version/SHA/binding 重载；当前学生端不新增 Teacher/Admin 业务，确认 wire shape 无意外变化 |
| Student Web | 重生共享 binding；不继承 Teacher/Admin 密码规则，不恢复旧 DTO |
| Teacher/Admin Web | 登录/恢复 gate 路由；删除 Sub-admin 编辑密码字段；处理 reset disabled；移除私有 12 位限制与任何 admin reset UI |
| Backend | must_change set/clear、ACTIVE 检查、Admin gate、session revoke、anti-enumeration、error mapping、safe audit 原子实现 |
| 数据库 | 现有 `must_change/password_version/access_state/session/challenge` 设计足够；无新表/列，runtime/migration 尚未实现或验证 |
| Mock / Staging | 需要新 fixture 与合成账号 E2E；本阶段均未执行 |

## 9. 验证与真实结果

| 检查 | 真实结果 |
|---|---|
| 固定 SHA / metadata | PASS；实际文件与 metadata/任务固定值一致 |
| Password schema 断言 | PASS；personal=1、Sub-admin initial=1、Teacher initial=8+pattern |
| Gate projection | PASS；`CurrentActor.mustChangePassword` required，`SessionTokenPair.actor` 复用 |
| Admin gate 枚举 | PASS；Admin bindings=52、gate-safe/public=7、已声明正常业务=5、缺口=40；40 条均已有 403 response |
| UpdateSubAdmin 绕过点 | PASS；两个字段当前确实存在且 required nullable |
| reset disabled 缺口 | PASS；`ACCOUNT_DISABLED` 与 403 response 当前均不存在 |
| admin-on-behalf reset 扫描 | PASS；没有独立 Teacher/Sub-admin password reset operation |
| 禁止错误扫描 | PASS；四个错误均不存在 |
| CR 独立评审 | PASS；正式提案 AC-01～AC-06 全部 ACCEPTED |
| OpenAPI/metadata/source 修改 | NOT EXECUTED；严格禁止 |
| Android/Web/Backend build/unit/browser/device/DB/E2E/Staging/Production | NOT EXECUTED；本轮只创建/评审 CR 与治理文档 |

## 10. Phase 结束报告

```text
完成状态：DONE
修改文件：CR-20260901-002、docs/rebuild/STATUS.md、本 handoff
执行的测试：固定 hash/metadata；Password/Auth/Admin YAML 结构断言；52 条 Admin binding / 40 条 gate 缺口枚举；DTO/status/error/禁止码/endpoint 扫描；Markdown/diff/链接/边界检查
真实测试结果：Contract 只读断言与 CR review 均 PASS；最终 CR=ACCEPTED
未执行测试及原因：Android/Web/Backend/数据库/浏览器/设备/E2E/Staging/Production/部署/发布均未执行；本阶段未修改实现或 Contract
是否修改了业务规则：否；只引用 Phase 5E 已 ACCEPTED 规则
是否修改了 Contract：否；OpenAPI、metadata、source、Version、SHA 均保持固定基线
是否存在旧 API 引用：是；沿用 Phase 5D-B/5D-A 记录，本阶段未执行 Legacy Migration
是否存在 Mock、TODO、空接口：既有 validation-only Mock、Portal demo/localStorage/BACKEND_REQUIRED 等未改变；本阶段未新增产品 Mock/TODO/空接口
下一阶段前置条件：可以进入 Phase 5C.2 Final Contract Consolidation，但只能落实 CR-20260901-002 的 ACCEPTED 变更并与其他已接受 CR 统一版本/SHA；不得夹带下游实现
```
