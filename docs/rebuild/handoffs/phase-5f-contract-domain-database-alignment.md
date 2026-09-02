# Phase 5F Contract ↔ Domain / Database Alignment Handoff

> 日期：2026-09-01（Asia/Shanghai）
>
> Git 根目录：`C:\Users\23328\Desktop\new_version`
>
> 分支 / 起始 HEAD：`API-contract-Making` / `16c669cd67110019765c158611272b4a9c75819d`
>
> 完成状态：`DONE (DESIGN)`
>
> 固定 Contract：`1.2.0-contract` / `RC` / `667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a`

## 1. 目标、授权范围与证据等级

本阶段把 Final Contract Consolidation 已接受的 `CertificationKind` 与 Password Contract 语义最小增量对齐到 Phase 3 Domain/数据库权威设计，并同步 Phase 3A 文档中的当前 Contract pin。写入仅限：

- [架构索引](../../architecture/README.md)；
- [Phase 3 Domain/数据库设计](../../architecture/phase-3-domain-and-database-design.md)；
- [Phase 3A Backend 架构](../../architecture/backend-architecture.md)、[模块边界](../../architecture/backend-module-boundaries.md)与[依赖规则](../../architecture/backend-dependency-rules.md)中的当前 Contract pin；
- [Rebuild Status](../STATUS.md)；
- 本 handoff。

未修改 OpenAPI、Contract metadata/source/version/SHA、Change Request、四份业务权威、Android、Web、Backend、ORM Entity、migration、SQL、seed 或数据库；未 Commit、Push、Merge、Tag 或 Deploy。本文所有 `PASS` 都是静态设计/文档结论，不是 Backend、PostgreSQL、客户端、E2E、Staging 或 Production 验收。

## 2. 权威输入与固定基线

已逐项对照：

- 根 `AGENTS.md` 与 [当前 STATUS](../STATUS.md)；
- [Phase 2 handoff](phase-2-business-truth-and-mvp.md)和四份当前业务权威：[总览](../../business/00-overview.md)、[学生](../../business/10-student-flow.md)、[教师](../../business/20-teacher-flow.md)、[管理员](../../business/30-admin-flow.md)；
- [Phase 3 Domain/数据库设计](../../architecture/phase-3-domain-and-database-design.md)；
- Phase 3A [Backend 架构](../../architecture/backend-architecture.md)、[模块边界](../../architecture/backend-module-boundaries.md)与[依赖规则](../../architecture/backend-dependency-rules.md)；
- [Phase 5E handoff](phase-5e-remaining-business-decision-closure.md)与 [Phase 5C.2 handoff](phase-5c2-final-contract-consolidation.md)；
- 当前 [OpenAPI](../../../contracts/openapi.yaml)与 [Contract metadata](../../../contracts/contract-metadata.json)；
- [CR-002 Password](../../../contracts/change-requests/CR-20260901-002-password-contract.md)、[CR-003 CertificationKind](../../../contracts/change-requests/CR-20260901-003-certification-kind-round-trip.md)、[CR-004 Student Dashboard](../../../contracts/change-requests/CR-20260901-004-student-dashboard-no-current-semester.md)。

现场只读核验结果：

| 项目 | 结果 |
|---|---|
| `info.version` / metadata version | `1.2.0-contract` / `1.2.0-contract` |
| OpenAPI `x-contract-status` / metadata status | `RC` / `RC` |
| metadata SHA | `667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a` |
| `Get-FileHash` 实际 OpenAPI SHA-256 | `667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a` |
| CR 状态 | CR-002 `ACCEPTED`；CR-003 `ACCEPTED`；CR-004 `REJECTED / NOT_CONTRACT_DEFECT` |
| Contract 修改 | `NONE`；Version、SHA、operationId、Schema、`error.code` 均保持不变 |

## 3. Alignment Matrix

| Contract | Domain | Database | Mapper | 状态 |
|---|---|---|---|---|
| `CertificationKind` | `applications-certification` 内的 Domain enum；由 `CertificationApplicationDetail` Value Object 持有 | `certification_application_detail.certification_kind text NOT NULL CHECK IN ('SCHOOL_TEAM','STUDENT_CLUB')`；type/detail deferred trigger | 显式 API Mapper + Persistence Mapper，双向穷尽、无 fallback | `PASS (DESIGN)` |
| `mustChangePassword` | `PasswordCredential` temporary/final credential gate | 既有 `password_credential.must_change boolean NOT NULL` | Auth/Application 投影为 `CurrentActor.mustChangePassword` | `PASS (CURRENT DESIGN SUFFICIENT)` |
| `passwordVersion` | Auth Domain 非负单调 credential version；与账号 optimistic `version` 分离 | 既有 credential/session `password_version` | Session/Auth adapter 比较版本；改密迁移当前 session，reset 撤销全部 | `PASS (CURRENT DESIGN SUFFICIENT)` |
| `accessState` | `LoginAccount` 的 `ACTIVE/DISABLED` | 既有 `login_account.access_state text NOT NULL CHECK` | Auth/Error mapper 将停用语义映射为既有 `ACCOUNT_DISABLED` | `PASS (CURRENT DESIGN SUFFICIENT)` |
| session revoke | `identity-access` Application/AuthSession 行为 | 既有 `auth_session.revoked_at/revoke_reason/password_version` | auth adapter 执行 current/all/other-session 失效 | `PASS (CURRENT DESIGN SUFFICIENT)` |
| challenge / reset | `AuthChallenge` one-time、expiry、anti-enumeration 与 proof policy | 既有 digest/attempt/expiry/lock/consume 字段 | API/Auth adapter 不泄露账号存在性；成功 reset 不返回 session | `PASS (CURRENT DESIGN SUFFICIENT)` |

## 4. CertificationKind Domain decision

### 4.1 最小 Domain 增量

`CertificationKind` 放在 Phase 3A 已确定的 `applications-certification` 模块 Domain 内，是模块自有的 **Domain enum**，只允许：

```text
SCHOOL_TEAM
STUDENT_CLUB
```

它不是 Entity，不拥有独立 identity；`CertificationApplicationDetail` 是 `StudentApplication` 聚合持有的 immutable Value Object，包含 kind、trim 后非空名称、`validFrom` 和 `validTo`。generated Contract enum 只能进入 API 层，不得由 Domain import；ORM/数据库 text 也不得穿透 API。

### 4.2 Domain invariant

- `ApplicationType=CERTIFICATION`：Domain factory/aggregate 必须收到完整 `CertificationApplicationDetail`，kind 必须是闭集成员；缺失、null、`UNKNOWN`、自由字符串都不能建立命令或聚合。
- `ApplicationType=EXEMPTION`：不得持有 certification detail。
- kind 是提交时的正式事实；不能根据 `organizationOrTeamName`、`teamName`、关键词、旧 `applicationSubtype` 或证据内容推断、补默认值或重算。
- `SCHOOL_TEAM` 与 `STUDENT_CLUB` 在创建、查询、补充材料响应、教师审核响应和持久化重建中都必须保持原值。

### 4.3 Persistence decision

沿用 Phase 3 已有的一对一 `certification_application_detail`，只增加 `certification_kind`，不重构申请系统，也不把两个认证子类提升为新的 `ApplicationType`：

```text
student_application
  application_type = CERTIFICATION
        1 ─── 1
certification_application_detail
  application_id PK/FK
  certification_kind text NOT NULL
  CHECK certification_kind IN ('SCHOOL_TEAM','STUDENT_CLUB')
```

父申请/detail deferred constraint trigger 在 commit 前确保 CERTIFICATION 恰好一行 detail、EXEMPTION 零行 detail。项目统一策略是 `text + CHECK`，所以不为本字段单独建立 PostgreSQL enum。

### 4.4 Mapper decision

```text
Contract CertificationKind
  ↓ explicit API Mapper
Domain CertificationKind
  ↓ explicit Persistence Mapper
database certification_kind

database certification_kind
  ↓ explicit Persistence Mapper
Domain CertificationKind
  ↓ explicit API Mapper
Contract CertificationKind
```

合法映射只有同名的 `SCHOOL_TEAM ↔ SCHOOL_TEAM` 与 `STUDENT_CLUB ↔ STUDENT_CLUB`。Contract 缺失/null/unknown 在 API 边界 fail closed；数据库 null/unknown 表示内部数据不变量破坏，映射为内部失败并记录安全诊断，不伪装业务成功。禁止 `UNKNOWN` fallback、silently fallback、default 为任一合法值或按名称反推。

### 4.5 Index decision

`NO INDEX REQUIRED`。

当前 Contract 没有 `certificationKind` 筛选参数，业务 Use Case 没有按 kind 排序、高频统计或审核队列要求；detail 已由 `application_id` PK 定位。只有未来出现已确认查询且真实数据量与 `EXPLAIN (ANALYZE, BUFFERS)` 证明需要时，才单独评估索引。

### 4.6 Existing-data conclusion

静态仓库检查结果：

- [Backend](../../../BNBU-Sports-Backend/README.md)、[infra](../../../infra/README.md)和 [E2E](../../../tests/e2e/README.md)仍是占位说明；
- 没有 PostgreSQL schema/migration、SQL、seed、dump 或已接入开发数据库；
- Phase 3/5C.2 明确 Backend、数据库、Staging 和 Production 均 `NOT EXECUTED`；
- 旧客户端 subtype、Mock 和 fixture 不是数据库事实。

因此当前设计可以采用未来空库 migration：建表时直接创建 non-null closed-set 列，不需要回填。该结论只覆盖当前 checkout 的可验证项目状态；任何目标环境在 migration 前都必须再做只读盘点。若发现既有认证行，状态立即变为 `DATA_MIGRATION_DECISION_REQUIRED`，停止自动迁移，后续只能使用可审计来源、逐行人工确认或获批清理方案；不得使用名称、关键词、客户端旧 subtype 或默认值猜测。

### 4.7 Certification 最终 12 问

| # | 问题 | 结论 |
|---:|---|---|
| 1 | Domain 中放在哪里 | `applications-certification/domain`，由 `StudentApplication` 的认证详情持有 |
| 2 | Entity / Value Object / enum | kind 是 Domain enum；详情是 immutable Value Object；kind 不是 Entity |
| 3 | 谁校验 closed set | API schema/Mapper 先拒绝非法 wire 值，Domain factory 权威校验，DB `NOT NULL + CHECK` 最后防线 |
| 4 | CERTIFICATION 时是否强制存在 | 是；Domain 与 deferred DB invariant 均强制 |
| 5 | 数据库保存在哪里 | `certification_application_detail.certification_kind` |
| 6 | 如何保证 non-null | `NOT NULL` + CERTIFICATION/detail deferred constraint |
| 7 | 如何保证 closed set | `CHECK IN ('SCHOOL_TEAM','STUDENT_CLUB')`，沿用统一 `text + CHECK` 策略 |
| 8 | 是否需要索引 | `NO INDEX REQUIRED` |
| 9 | Contract → Domain | generated enum 在 API Mapper 中穷尽映射到 Domain enum |
| 10 | Domain → Persistence | Persistence Mapper 穷尽映射为同名 text；反向同理 |
| 11 | 旧数据迁移风险 | 当前仓库无已实现 DB/数据；若任一目标环境发现旧行则必须 `DATA_MIGRATION_DECISION_REQUIRED` |
| 12 | 是否需要新业务决定 | 否；两个分类与 round-trip 已由 ACCEPTED 业务/CR 决定 |

## 5. Password lifecycle alignment

### 5.1 结论

`CURRENT DESIGN SUFFICIENT`。

既有 `PasswordCredential`、`LoginAccount`、`AuthSession` 和 `AuthChallenge` 已有 `must_change`、credential/session `password_version`、`ACTIVE/DISABLED`、session revoke 与 challenge digest/lifecycle 字段。Phase 5F 只把已接受行为、事务和映射责任写清；不新增 password policy/strength/history/temporary-password 表、Redis、消息队列、新 ErrorCode、表、列或密码 migration。

### 5.2 Lifecycle 与 transaction

- Teacher 批量建立、Sub-admin 创建、初始 Super-admin provisioning：写 temporary credential，显式 `must_change=true` 与初始 version；不允许默认 false。
- `changeOwnPassword`：只允许 `ACTIVE` Teacher/Admin self；事务性替换 PHC、credential password version + 1、账号 optimistic version + 1、gate=false、保留并迁移当前 session 到新 password version、撤销其他 session、写 safe AuditEvent。
- self reset：只接受本人已验证学校邮箱的有效一次性 proof；成功替换 PHC、credential password version + 1、账号 optimistic version + 1、gate=false、撤销全部 session、不创建 session/不自动登录、写 safe AuditEvent。proof 解析到 `DISABLED` 时 credential/gate/state 不变；已删除账号继续 anti-enumeration。
- logout current / all：分别撤销当前 session / 全部 session；停用同样撤销全部 session；重新启用不恢复 session。
- Auth adapter 每次认证检查 account `ACTIVE`、session 未撤销/未到期、session version 与 credential version 相等。
- `UpdateSubAdmin` 的 Domain command、Application handler 与 Repository 调用图没有 credential mutation；Contract 的 closed request object 已删除密码字段。

### 5.3 Password 最终 12 问

| # | 问题 | 结论 |
|---:|---|---|
| 1 | Domain 是否支持 `mustChangePassword` | 是；`PasswordCredential.must_change` 的 Domain 等价 gate |
| 2 | DB 是否已有字段 | 是；`password_credential.must_change`，本轮明确 `boolean NOT NULL` |
| 3 | `createSubAdmin` 如何产生 gate | 同一账号建立事务写 temporary credential、`must_change=true` 和初始 version |
| 4 | `changeOwnPassword` 如何 clear | 成功事务替换 PHC、version + 1、`must_change=false`、保留当前/撤销其他 session |
| 5 | self reset 如何 clear | 有效 proof 成功事务替换 PHC、version + 1、`must_change=false`、撤销全部 session |
| 6 | password version 如何 revoke | credential 单调认证版本与 session 快照比较；它不同于账号 optimistic version；改密迁移当前 session，reset/停用撤销适用 session |
| 7 | disabled account 如何表达 | `login_account.access_state = DISABLED`；closed set + Auth/Application gate；映射既有 `ACCOUNT_DISABLED` |
| 8 | `UpdateSubAdmin` 如何禁改密码 | Domain/Application input 无 password 字段和 credential Port 调用；Contract closed object 拒绝旧字段 |
| 9 | 是否需要新增表 | 否 |
| 10 | 是否需要新增列 | 否 |
| 11 | 是否需要新的 Migration 设计 | Password 不需要；未来实现只按既有设计建表/约束与测试。CertificationKind 另需在首个数据库 migration 中建新列，但本阶段不创建 migration |
| 12 | 是否有新 Contract defect | 否；CR-002 已完整落地，未发现 blocking defect |

## 6. CR-004 与架构边界锁定

CR-004 保持 `REJECTED / NOT_CONTRACT_DEFECT`。本阶段未修改 Student Dashboard Domain、`currentSemester` nullability、CURRENT Semester 约束或 Student identity 生命周期。合法 Student actor 不应处于“没有 CURRENT semester 但仍有合法 Student Dashboard”的业务状态；Android 旧 nullable mapper 继续归入 `LEGACY_MIGRATION + MAPPER/CLIENT ALIGNMENT`。

更新后的设计继续遵守：

```text
API
↓ Application
↓ Domain
↓ Repository Port
↓ Infrastructure
↓ PostgreSQL
```

`Contract DTO ≠ Application Model ≠ Domain Model ≠ Persistence Model`。Contract enum 不进入 Domain，Domain enum 不使用 ORM/serialization annotation，database row 不进入 API；API Mapper 与 Persistence Mapper 分离。`applications-certification` 继续拥有申请/认证写事实，`identity-access` 继续拥有 credential/session/challenge；没有 Owner 迁移、跨模块 Repository、Redis/MQ 或新架构 CR。

## 7. Validation

| 检查 | 真实结果 |
|---|---|
| Contract Version / Status / SHA 只读校验 | `PASS`；metadata、OpenAPI header、实际 SHA 精确为固定基线 |
| Phase 2 / 3 / 3A / 5E / 5C.2 语义对照 | `PASS`；无新业务歧义、无重新打开已关闭决定 |
| Contract verify / RC readiness | `PASS`；109 paths / 121 unique operations / 193 schemas / 66 errors；RC readiness PASS |
| Certification Domain ↔ Contract enum | `PASS (STATIC DESIGN)`；两值穷尽、无 generated type 穿透、无名称推断/fallback |
| Database closed set / nullable | `PASS (STATIC DESIGN)`；`NOT NULL + CHECK + deferred type/detail invariant` |
| Index | `PASS (STATIC DESIGN)`；`NO INDEX REQUIRED` 有明确查询依据 |
| Password lifecycle coverage | `PASS (STATIC DESIGN)`；gate/version/access/session/challenge/update ownership 全覆盖，现有设计足够 |
| Architecture boundary | `PASS (STATIC DESIGN)`；API/Application/Domain/Port/Infrastructure 与双 Mapper 边界保持 |
| Existing-data scan | `PASS (REPOSITORY EVIDENCE)`；未发现 DB/migration/seed/dump/runtime 数据，保留发现旧行即停止门禁 |
| CR-004 exclusion | `PASS`；无 Student Dashboard/current semester/identity 设计变化 |
| Markdown local links | `PASS` |
| Strict UTF-8 | `PASS` |
| `git diff --check` | `PASS` |
| Backend/PostgreSQL/client/E2E/Staging/Production | `NOT EXECUTED`；本阶段只做静态设计 alignment |

## 8. Phase 5G Affected Contract Re-validation 精确前置条件

1. Phase 5G 必须从 `1.2.0-contract` / `RC` / SHA `667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a` 开始；metadata 与实际 OpenAPI SHA 必须再次匹配，任何 Contract 变化都先停止并重新确定基线。
2. 下游必须显式重载同一版本/SHA，禁止 `1.1`/`1.2` 双 DTO、unknown/default fallback 或根据名称/旧 subtype 映射。Certification 受影响面至少重验 create request、7 个 response operation、两个合法值和缺失/null/unknown/额外字段拒绝。
3. Teacher/Admin 受影响面至少重验 Admin 45/45 business gate、10/10 gate-safe/recovery、createSubAdmin temporary gate、change/reset disabled + clear gate + session 语义，以及 `UpdateSubAdminRequest` 旧密码字段拒绝；不得新增 admin-on-behalf reset。
4. Android/Web 的 Phase 5D Legacy Migration Findings 保持独立；Phase 5G 的 binding/fixture/static validation 不等于正式 runtime 已迁移。Backend 仍是占位目录时只能报告 Contract/客户端静态结果，不能宣称 Backend 或数据库 conformance。
5. Phase 5G 不执行数据库 migration。未来 Backend/database Slice 开始前，先实现本设计的双 Mapper 与 constraint/invariant tests，并对目标环境只读检查认证旧行；发现旧行即 `DATA_MIGRATION_DECISION_REQUIRED`。
6. 若 Phase 5G 发现新的真正 Contract defect，只记录新的 `PROPOSED CR`；不得在 Phase 5G 私改 OpenAPI/version/SHA，也不得重新打开 CR-004 或已关闭业务决定。

## 9. Phase 结束报告

```text
完成状态：DONE
修改文件：docs/architecture/README.md；docs/architecture/phase-3-domain-and-database-design.md；docs/architecture/backend-architecture.md；docs/architecture/backend-module-boundaries.md；docs/architecture/backend-dependency-rules.md；docs/rebuild/STATUS.md；本 handoff
Certification alignment 结果：PASS (DESIGN)；Domain enum + detail Value Object、non-null closed-set persistence、双 Mapper、round-trip、NO INDEX REQUIRED 和数据门禁均明确
Password alignment 结果：CURRENT DESIGN SUFFICIENT；不新增表、列或 migration 设计
执行的测试：Contract Version/Status/SHA、verify/readiness、权威语义矩阵、Certification enum/nullable/closed-set/mapper/index、Password lifecycle、架构边界、existing-data scan、CR-004 exclusion、Markdown links、UTF-8、git diff --check、写入范围检查
真实测试结果：全部已执行的静态设计/文档/Contract 只读门禁 PASS；不构成 Backend/PostgreSQL/客户端 runtime 验收
未执行测试及原因：Backend、真实 PostgreSQL、migration、client build/browser/device、E2E、Staging、Production 均未执行；本阶段禁止实现和部署
是否修改了业务规则：否
是否修改了 Contract：否；1.2.0-contract / RC / SHA 保持不变
Contract Version / SHA：1.2.0-contract / 667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a
是否修改 Android/Web/Backend：否
是否执行数据库 Migration：否
是否存在现有数据迁移风险：当前仓库没有已实现数据库或需保留数据；目标环境若发现既有认证行则存在条件风险并进入 DATA_MIGRATION_DECISION_REQUIRED
是否存在新的 CR：否；PROPOSED CR = 0
是否存在新的 NEEDS_BUSINESS_DECISION：否；0
是否存在旧 API 引用：是；Phase 5D Android/Web Legacy Migration Findings 保留，本轮未迁移
是否存在 Mock、TODO、空接口：既有 validation-only Mock、Legacy client 与 Backend 占位目录仍存在；本轮未新增
Phase 5G 精确前置条件：按第 8 节执行；必须显式重载固定 Contract，覆盖 Certification create + 7 responses 与 Password gate/safe/change/reset/UpdateSubAdmin，分离静态验证与 runtime 验收，禁止 fallback；数据库实现前先做目标环境旧行检查
```
