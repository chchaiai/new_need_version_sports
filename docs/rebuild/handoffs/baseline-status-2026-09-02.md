# 重启前的状态记录存档

> 归档日期：2026-09-02。以下保留原记录及原编号，仅调整相对链接以适应归档位置。
> 当前情况请查看 [当前状态](../STATUS.md)，后续路线请查看 [项目 README](../../../README.md)。

---

# Rebuild Status

> 更新时间：2026-09-01
>
> 当前 Phase：Phase 5 Final Gate
>
> 完成状态：BLOCKED（固定 `1.2.0-contract` / `RC` / SHA 未漂移，Business、Domain/DB Design、Phase 3A、Android 5G-A、Web 5G-B 证据保持；但 3 组 OpenAPI discriminator 均缺 explicit mapping 且 wire const 不等于隐式 schema-name key，无法证明为非阻塞 tooling-only finding；已建立 `CR-20260901-005` PROPOSED/BLOCKING，Phase 5 不得标记 FINAL DONE，Phase 6.0 未授权）

## Phase 5 Final Gate

| 检查项 | 状态 | 结果 |
|---|---|---|
| Git / 并发产物 | PASS | 在 `C:\Users\23328\Desktop\new_version`、分支 `API-contract-Making`、HEAD `40f6ae59b6d71d069442f015de5320c2cbc6e258`、clean 工作树开始；5G-A `6eb4918` 与 5G-B `40f6ae5` 的关键产物均存在且 tracked，未发现覆盖、丢失或冲突；本轮不 commit/push/merge/rebase/tag |
| Contract Version / SHA | PASS / UNCHANGED | OpenAPI header、metadata 与实际 SHA 精确为 `1.2.0-contract` / `RC` / `667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a`；109 paths / 121 operations / 193 schemas / 66 errors；无 drift |
| 标准 Contract validation | PASS | parse、verify、RC readiness、Redocly lint、121/121 operationId、1426 refs/missing 0、schema meta-validation、66 error/status exact-set、metadata/count/SHA、连续两次 deterministic generation、UTF-8/JSON、`git diff --check` 均通过 |
| Discriminator integrity | **BLOCKED** | 当前全部 3 组 discriminator 均无 explicit mapping，且 `EXEMPTION/CERTIFICATION`、`ADD/UPDATE/DELETE`、`MAINTENANCE/NORMAL` 均不等于隐式 branch schema 名；`openapi-typescript 7.13.0` 确实生成 schema-name literal，现有 Student wire adapter 不能覆盖另外两组或未来 Backend |
| Business | PASS | P5E-NBD-01/02 均 ACCEPTED；Teacher attention card 删除、Password lifecycle、CR-004 Student current semantics、CertificationKind 保持最终结论；`NEEDS_BUSINESS_DECISION=0` |
| Contract CR | **BLOCKED** | CR-002/003 ACCEPTED 且已落实，CR-004 REJECTED 且未修改 OpenAPI；本轮按真正阻塞例外新增 [CR-005](../../../contracts/change-requests/CR-20260901-005-explicit-discriminator-mappings.md) `PROPOSED / BLOCKING`；Blocking CR=1，PROPOSED Blocking CR=1 |
| Domain / Database Design | PASS (DESIGN) | Certification 自有 closed Domain enum/detail、`certification_kind NOT NULL CHECK`、双 Mapper、无 UNKNOWN/name inference；Password 保持 `CURRENT DESIGN SUFFICIENT`；Domain/Contract 与 DB/Contract drift 均为 0 |
| Backend Architecture | PASS (DESIGN) | Phase 3A API → Application → Domain → Ports → Infrastructure → PostgreSQL 仍为权威；DTO/Domain/Persistence、Repository Port/impl、mapper、transaction/module boundary 清晰 |
| Android 5G-A | PASS | committed evidence 保持 1.2 binding、两 kind、7/7、round-trip、14/14 rejection、compile/determinism、341/341、lint 0 error、assemble；Final Gate 现场 targeted binding/generation/unit `BUILD SUCCESSFUL`；device NOT EXECUTED |
| Web 5G-B | PASS (VALIDATION) | committed typecheck/unit/lint/build/browser evidence 保持；Final Gate 现场 binding/codegen `--check` 与 affected 13/13 PASS。其 discriminator finding 的 non-blocking 分类未通过 Final Gate |
| Legacy / Client Findings | PARTIAL / BLOCKED | Android/Web legacy inventory/bundles 明确，正式 runtime `REMAINS / NOT MIGRATED`，后续 Phase 7A/7B；其他 Client/UI finding 已分类。discriminator 已重分类为 Contract interoperability blocker |
| Runtime 边界 | NOT EXECUTED | Backend、PostgreSQL、migration、COS、Contract conformance runtime、E2E、Staging、Production 均未执行；静态设计 PASS 未冒充 runtime PASS |
| Phase 结论 | **BLOCKED** | Contract 文件未漂移，但当前 RC 不是无阻塞 Backend 实现基线；Phase 5 不标记 `FINAL DONE`，Phase 6.0 `NOT AUTHORIZED` |

完整 Gate Matrix、26 项最终必报结果、现场命令证据、CR 分类与解除阻塞条件见 [Phase 5 Final Gate handoff](../handoffs/phase-5-final-gate.md)。

### Phase 5 Final Gate 解除阻塞条件

1. 独立 Contract review 处理 CR-005；如接受，新增三组 explicit discriminator mapping，并提升 Version/SHA，禁止原地覆盖 1.2.0。
2. 重跑全部 Contract quality gate，并用 Android、`openapi-typescript` 与 Backend 计划采用的 adapter/codegen 验证三组 wire literal round-trip 与 unknown fail-closed。
3. Android/Web/Backend 下游精确重载新 Version/SHA 后重跑 Final Gate；只有 Blocking CR=0、discriminator integrity PASS 才可标记 Phase 5 `FINAL DONE`。

## Phase 5G-B Web Affected Contract Re-validation

| 检查项 | 状态 | 结果 |
|---|---|---|
| Git / 写入边界 | PASS | 在 `C:\Users\23328\Desktop\new_version`、分支 `API-contract-Making`、HEAD `3e0f16091307f0a37e055afe8b14b6884367f11e`、clean 工作树开始；只修改 Web affected validation binding/fixture/test/必要 UI、本 STATUS 与新 handoff。并发 Phase 5G-A 随后独立 commit 并将共享 HEAD 推进至 `6eb4918e0cabe08c7b38929eac028be69be9d350`；本阶段未创建、回退、暂存或计入其 Android 结果，且未 commit |
| Contract 基线 | PASS / UNCHANGED | metadata、OpenAPI header 与实际文件 SHA 精确为 `1.2.0-contract` / `RC` / `667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a`；109 paths / 121 operations / 193 schemas / 66 errors；OpenAPI、metadata、Version、SHA 均未修改 |
| Student / Portal binding | PASS | 修正前旧 1.1 validation pin 明确失败；修正后两端精确绑定 1.2，同一 generated file SHA `5cd91037cabe198fff7d7208d1645d2357399d15d45c6802f0d03eec271b8a4d`，两端 `openapi-typescript --check` PASS，无 drift |
| Certification schema | PASS | generated `CertificationKind` 精确 `SCHOOL_TEAM/STUDENT_CLUB`；`CertificationDetails.certificationKind` required、non-null、typed enum；无 unknown/default/name/subtype inference |
| Certification request / round-trip | PASS | Student 两类 request/JSON/response/UI 回显均保持原值；unknown、missing、null、private subtype/extra field fail closed |
| Certification response | PASS | `createStudentApplication`、`supplementStudentApplication`、`listOwnApplications`、`getOwnApplication`、`listCourseApplications`、`getCourseApplication`、`decideStudentApplication` 7/7；Teacher list/detail/decision 显示明确 kind |
| Password lifecycle | PASS | Teacher/Admin login、refresh、`/me`、page reload、new session 均恢复 `mustChangePassword`；change 清 gate、保留当前 session/撤销其他；reset 清 gate、撤销全部/no login；disabled change/reset 均 403 `ACCOUNT_DISABLED` |
| Admin gate | PASS | 依当前 Contract exact operationId 清单验证 45/45 正常 Admin operation 声明 `FIRST_PASSWORD_CHANGE_REQUIRED`；10/10 gate-safe 保持可访问 |
| Sub-admin | PASS | create 使用 temporary credential 且 first actor `mustChangePassword=true`；generated type/fixture/form/mapper/request/UI 的 UpdateSubAdmin 均无 password/credential substitute；产品 edit dialog password input=0 |
| 禁止密码规则 | PASS | affected Web personal-password source 不再含四个已删除 code 或私有 12 位规则；保留业务已接受的本人密码非空/确认一致性和独立 Teacher batch 初始强密码规则 |
| Tests / build | PASS | Contract verify/readiness；binding；typecheck；5G-B 13/13；Portal 125/125；Student smoke 79/79；Web preview PASS；lint 0 error / 5 existing warning；vinext production build 5/5 PASS |
| Browser | PASS | 隔离 dev browser 覆盖 Student/Teacher/Admin affected validation、Admin create/update product UI 与 reload，console 0 error/warning；正式 Student login shell console 0。4300 首次 stale asset 证据最终核对为既存 dev 端口冲突，已丢弃且不归因产品 |
| Legacy runtime | `REMAINS / NOT MIGRATED` | Student certification、Teacher certification、Portal auth/password 3 个 affected cluster 仍使用旧 API/DTO/client；Phase 5D-B 24-bundle full finding 保持；未切 121 operation、未接真实 Backend、未进入 Phase 7B |
| 新问题 | RECORDED | 新 `PROPOSED CONTRACT_CR=0`、`NEEDS_BUSINESS_DECISION=0`；`CLIENT_DEFECT=4`（3 fixed，1 codegen literal 由 wire adapter contained）；`UI_PRODUCT_FINDING=0`；无 blocking Contract defect |
| Phase 结论 | **DONE / PASS** | Version/SHA、双端 binding、Certification 两类与 7 surface、Password lifecycle、45/45、10/10、Sub-admin、禁止规则、type/unit/lint/build/browser 与范围门禁全部满足；Contract 未改、Legacy Migration 未执行 |

完整 34 项结果、operationId exact-set、测试命令、浏览器证据、问题分类与正式 runtime 边界见 [Phase 5G-B handoff](../handoffs/phase-5g-b-web-affected-contract-revalidation.md)。

### Phase 5G-B 后续前置条件

1. Phase 5G-B 的 PASS 仅覆盖 1.2 validation binding 与 affected adapter/fixture/UI；不得据此宣称 Student/Teacher/Admin 正式 runtime、真实 Backend/数据库、账号、Staging、Production 或 deployment 已验收。
2. Phase 7B 必须独立授权，并按 Phase 5D-B 的 24-bundle matrix 分 Slice 迁移正式 API/DTO/client；不得保留 old/new fallback。
3. 正式迁移前处理或明确 `openapi-typescript` discriminator literal；迁移后重跑真实 mapper/network/auth/session/UI/E2E/browser。
4. 任何 Contract 漂移必须重新锁定 Version/SHA；不得恢复私有密码字段/错误码/12 位规则、名称/subtype 推断或 CR-004。

## Phase 5G-A Android Affected Contract Re-validation

| 检查项 | 状态 | 结果 |
|---|---|---|
| Git / 写入边界 | PASS | 在 `C:\Users\23328\Desktop\new_version`、分支 `API-contract-Making`、HEAD `3e0f16091307f0a37e055afe8b14b6884367f11e`、clean 工作树开始；只修改 Android validation-only codegen/binding test/Phase 5G-A test、本 STATUS 与新 handoff。执行期间出现另一组 Web 工作树改动，本阶段未创建、读取为业务依据或修改这些文件 |
| Contract 基线 | PASS / UNCHANGED | metadata、OpenAPI header 与实际文件 SHA 精确为 `1.2.0-contract` / `RC` / `667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a`；109 paths / 121 unique operations / 193 schemas / 66 errors；OpenAPI、metadata、Version、SHA 均未修改 |
| Validation binding | PASS | 新隔离 `phase5ga` model-only Kotlin binding 显式锁定根 Contract 与 metadata；旧 `1.1.0-contract` / old SHA validation pin 已移除；Phase 5A.1 nullable primitive/enum mapping 原样保留，generated DTO 未手改 |
| Certification schema | PASS | generated `CertificationKind` 精确只有 `SCHOOL_TEAM`、`STUDENT_CLUB`，无 `UNKNOWN`；`CertificationDetails.certificationKind` 为 required、non-null、typed enum，无任意 String fallback |
| Certification request | PASS | `createStudentApplication` 的 SCHOOL_TEAM 与 STUDENT_CLUB 均完成 generated DTO 构造、Gson serialize/deserialize、OpenAPI schema-shaped gate 与字段保持；2/2 分类不丢失、不改写 |
| Certification response | PASS | `createStudentApplication`、`supplementStudentApplication`、`listOwnApplications`、`getOwnApplication`、`listCourseApplications`、`getCourseApplication`、`decideStudentApplication` 全部通过 generated DTO → 显式 test-only validation mapper；两值均原样保留，无名称推断/default/UNKNOWN |
| Round-trip / 非法 fixture | PASS | 两类 `request → generated binding → response` 完整 round-trip 通过；7 类非法情况对 request 与 response 均 fail closed，Kotlin 14/14 拒绝；独立 Draft 2020-12 schema 验证同为 14/14 拒绝，合法 request/response 4/4 通过 |
| Password 共享影响 | PASS | `PasswordChangeRequest`、`PasswordResetRequest`、`UpdateSubAdminRequest` 均正常生成和编译；后者没有 `newPassword/confirmNewPassword`；未新增 Android Teacher/Admin Password UI 或业务代码 |
| Generation / compile | PASS | 连续两次实际生成均为 196 个 Kotlin 文件，manifest SHA-256 均为 `475fa8f3e67746ca0b4c0d0f359872aa0405001ea22592ba9e7acd71fc758d4a`；generated Kotlin compile PASS |
| Android validation | PASS | Phase 5G-A 定向 unit 4/4；保留的 Phase 5A 回归 9/9；全量 unit 341/341；JDK 17 同源码/Contract SHA 临时镜像 lint 为 0 error / 31 warning / 1 information；`assembleDebug` PASS 并生成 APK |
| Connected device | NOT EXECUTED | 本阶段只改 validation-only generated test source/config，不进入正式 runtime；未把历史设备结果冒充本阶段结果 |
| Legacy runtime | `REMAINS / NOT MIGRATED` | 正式 Android 仍绑定旧 `3.0.0-contract` snapshot/transport；未切 Repository、替换 endpoint、删除旧 DTO、修改正式网络链或进入 Phase 7A；该差异继续归类 `LEGACY_MIGRATION` |
| 新问题 | NONE | 新 `PROPOSED CONTRACT_CR=0`、新需跟踪 `CLIENT_DEFECT=0`、新 `NEEDS_BUSINESS_DECISION=0`；另有计划内 stale validation binding finding 1 项，按 `CODEGEN_BINDING` 在本阶段修复，未形成未关闭 defect，也没有修改 Contract |
| Phase 结论 | **DONE / PASS** | Version/SHA 精确绑定、generated Kotlin、两枚 enum、required/non-null、两类合法 request、7 个 response surface、round-trip、非法 fixture、unit、lint、assemble 和范围门禁全部满足；未执行 Legacy Migration，OpenAPI 未修改 |

完整 25 项结果、命令证据、Lint 环境说明与正式 runtime 边界见 [Phase 5G-A handoff](../handoffs/phase-5g-a-android-affected-contract-revalidation.md)。

### Phase 5G-A 后续前置条件

1. Phase 5G-A 的 PASS 仅覆盖 Android validation-only binding；不得据此宣称正式 `3.0.0-contract` runtime、真实 Backend/PostgreSQL、跨端 E2E、设备、Staging 或 Production 已验收。
2. 只有在 Phase 7A 获得独立授权后，才可按 Legacy Migration Findings 切换正式 snapshot/transport/Repository；迁移时必须重新执行正式 mapper、网络、Compose、设备与真实环境验证。
3. 后续任何 Contract 漂移都必须重新锁定 Version/SHA 并重跑本阶段门禁；不得增加 UNKNOWN、名称/旧 subtype 推断或 old/new fallback。

## Phase 5F Contract ↔ Domain / Database Alignment

| 检查项 | 状态 | 结果 |
|---|---|---|
| Git / 写入边界 | PASS | 在 `C:\Users\23328\Desktop\new_version`、分支 `API-contract-Making`、HEAD `16c669cd67110019765c158611272b4a9c75819d`、clean 工作树开始；写入只限 `docs/architecture/**`、本 STATUS 与新 handoff；未修改 Contract、业务权威、Android/Web/Backend、migration 或数据库 |
| 权威输入 | PASS | 已读取根 `AGENTS.md`、本 STATUS、四份 Phase 2 业务权威、Phase 3、三份 Phase 3A、Phase 5E、Phase 5C.2、当前 OpenAPI/metadata 及 CR-002/003/004 |
| Contract 基线 | PASS / UNCHANGED | metadata、OpenAPI header 与实际文件 SHA 均精确为 `1.2.0-contract` / `RC` / `667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a`；Version/SHA/operationId/Schema/`error.code` 均未修改 |
| Certification Domain | PASS (DESIGN) | `applications-certification` 自有 Domain enum `SCHOOL_TEAM/STUDENT_CLUB`，由 immutable `CertificationApplicationDetail` Value Object 持有；CERTIFICATION 必须有 kind，EXEMPTION 禁止 detail；不依赖 generated Contract enum |
| Certification Database | PASS (DESIGN) | `certification_application_detail.certification_kind text NOT NULL CHECK`；type/detail deferred trigger 保证 CERTIFICATION 恰好一行详情；沿用统一 `text + CHECK`，不重构申请系统 |
| Mapper / round-trip | PASS (DESIGN) | Contract ↔ API Mapper ↔ Domain ↔ Persistence Mapper ↔ database 双向穷尽；两值同名 round-trip；无名称推断、UNKNOWN/default/silent fallback；非法 DB 值视为内部不变量破坏 |
| Index | `NO INDEX REQUIRED` | 当前没有按 kind 筛选、排序或高频统计 Use Case；detail 已由 application PK 定位，未来须由真实查询与 EXPLAIN 证明 |
| Existing data | PASS / CONDITIONAL GATE | 仓库没有 Backend DB 实现、migration/SQL/seed/dump 或已验收 Staging/Production 数据，可按未来空库建列；任何目标环境发现既有认证行即 `DATA_MIGRATION_DECISION_REQUIRED`，禁止名称/旧 subtype 推断 |
| Password lifecycle | `CURRENT DESIGN SUFFICIENT` | 既有 `must_change/password_version/access_state/auth_session/auth_challenge` 足够；明确 temporary gate、change/reset clear、version/session revoke、disabled、anti-enumeration、safe audit 与 `UpdateSubAdmin` 无 password mutation；不新增表/列/migration/error/Redis/MQ |
| CR-004 exclusion | PASS | 保持 `REJECTED / NOT_CONTRACT_DEFECT`；未修改 Student Dashboard、current semester nullability、Student identity 或数据库约束；旧 Android nullable mapper 仍属 Legacy Migration/Mapper alignment |
| Architecture | PASS (DESIGN) | API → Application → Domain → Repository Port → Infrastructure → PostgreSQL；Contract/Application/Domain/Persistence 模型与 API/Persistence Mapper 保持分离；Phase 3/3A 当前 Contract pin 同步为 1.2.0 |
| Validation | PASS | Contract verify/readiness、Phase 2/3/3A/5E/5C.2 一致性、enum/closed-set/nullability/password/架构/数据扫描、Markdown links、strict UTF-8、`git diff --check` 与写入范围检查通过；仅静态证据 |
| Phase 结论 | **DONE** | 新业务歧义 0、新 Contract defect 0、新 `PROPOSED CR` 0、新 `NEEDS_BUSINESS_DECISION` 0；未执行 Backend、PostgreSQL、migration 或客户端 runtime |

完整 12+12 问结论、Alignment Matrix、数据风险、验证证据和 Phase 5G 前置条件见 [Phase 5F handoff](../handoffs/phase-5f-contract-domain-database-alignment.md)。

### Phase 5G Affected Contract Re-validation 前置条件

1. 再次锁定 `1.2.0-contract` / `RC` / SHA `667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a`；任何 Contract 漂移先停止。
2. 各受影响下游显式重载同一版本/SHA，无 old/new DTO、unknown/default 或名称/旧 subtype fallback；Certification 重验 create + 7 response operation 与合法/非法 fixtures。
3. Teacher/Admin 重验 45/45 gate、10/10 gate-safe、temporary credential、change/reset/disabled/session 与 UpdateSubAdmin 旧字段拒绝；不得新增代他人 reset。
4. Phase 5D Legacy Migration Findings 继续独立；静态 binding/fixture 验证不得声称正式 runtime、Backend 或数据库已验收。
5. Phase 5G 不执行 migration；未来数据库 Slice 前先只读盘点目标环境，发现旧认证行即 `DATA_MIGRATION_DECISION_REQUIRED`。
6. 新 Contract 缺陷只记录 `PROPOSED CR`，不得私改 Contract 或重新打开 CR-004/已关闭业务决定。

## Phase 5C.2 Final Contract Consolidation

| 检查项 | 状态 | 结果 |
|---|---|---|
| Git / 写入边界 | PASS | 在 `C:\Users\23328\Desktop\new_version`、分支 `API-contract-Making`、HEAD `9d8a773bf8ef8097efc05b6d4571485b62b50333` 开始；保留 Phase 5C.2-B 既有未提交文档；写入仅限 Contract source/tooling/生成物/治理文档、CR-002/003 落地记录、本 STATUS 与新 handoff；未修改业务权威、Android/Web/Backend、Phase 3 设计、数据库或 CR-004 |
| CR Consolidation | DONE | 正式输入 3：`ACCEPTED=2`（Password CR、Certification CR），`REJECTED=1`（Student Dashboard no-current）；Password AC-01～06 全部落实，Certification required closed enum 落实，CR-004 明确未落实；CR 间无冲突 |
| Version / SHA | PASS | `1.1.0-contract` / `1d538483...d99d` → `1.2.0-contract` / `667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a`；状态保持 `RC`；沿用上一轮 consolidation 的 minor-line 递增；metadata 与实际 SHA 精确一致 |
| Contract 结构 | PASS | 109 paths / 121 unique operations / 193 schemas / 66 errors；新增 1 个 schema，无 path/operation/error 增减；breaking change |
| Password gate | PASS | CR 清单 40/40 Admin operation 新增 `FIRST_PASSWORD_CHANGE_REQUIRED`；原有 5 条继续 gate，最终 ADMIN-role gate 45/45；10/10 gate-safe operation 无误加 |
| Password self-service | PASS | `createSubAdmin` temporary + gate=true；`changeOwnPassword` ACTIVE Teacher/Admin、当前 session 保留/其他撤销/gate=false；`resetPassword` 最终个人密码、全部 session 撤销/no login/gate=false；change/reset 均有 `403 ACCOUNT_DISABLED` |
| UpdateSubAdmin / 禁止项 | PASS | `newPassword`、`confirmNewPassword` properties/required 均删除；closed object，无 credential substitute；四个禁止密码错误均不存在，个人密码仍只非空 |
| Certification | PASS | `CertificationKind` 精确为 SCHOOL_TEAM/STUDENT_CLUB；`CertificationDetails.certificationKind` required/non-null/direct ref；request 1/1、response 7/7 受影响 operation 精确命中；两类合法 request/response/round-trip 与五类非法 request/response 全部符合预期 |
| Rejected CR 锁定 | PASS | `StudentDashboard.currentSemester` 保持 required/non-null；`getStudentDashboard` 无 no-current 404；`getCurrentSemester` 仍 404；Teacher Dashboard no-current nullable 语义不变 |
| Validation | PASS | OpenAPI parse、Contract verify、RC readiness、Redocly lint、operationId uniqueness、refs、schema/error exact-set、CR assertions、连续两次确定性生成、SHA/metadata、AST/JSON/UTF-8/Markdown links、`git diff --check` 全部通过 |
| Domain/DB | FOLLOW-UP REQUIRED | Password 现有设计足够；CertificationKind 尚未进入 Phase 3 Domain/数据库，Backend 初始化前需独立 alignment：Domain closed value、persistence non-null closed-set、mapper/query/constraint tests；不得按名称推断或自动回填 |
| 下游 | RELOAD REQUIRED / NOT EXECUTED | Android/Student Web/Teacher Web/Admin Web/Backend 精确 binding、fixture、mapper、gate 与实现范围已记录；本轮未修改下游、未执行 Legacy Migration、E2E、Staging/Production 或部署 |
| Phase 结论 | **DONE** | Contract 门禁全部 PASS；新业务未决项 0、blocking Contract defect 0；已具备另行进入 Contract ↔ Domain/Database Alignment 的条件 |

详细 CR 落地、40-operation gate、breaking、validation 证据与 Android/Web/Backend Re-validation Matrix 见 [Phase 5C.2 handoff](../handoffs/phase-5c2-final-contract-consolidation.md)。

### Phase 5C.2 下一阶段前置条件

1. 另行授权并先完成 CertificationKind 的 Contract ↔ Domain/Database Alignment；如果发现既有认证数据，停止自动迁移并取得可审计方案，禁止名称推断。
2. Android、Student Web、Teacher Web、Admin Web 与 Backend 必须显式锁定同一 `1.2.0-contract` + 新 SHA 并按 handoff matrix 重验；禁止 old/new fallback。
3. Phase 5D Legacy Migration Findings 继续保留；客户端 runtime 迁移、Backend 实现、数据库 migration、E2E、Staging/Production 均需独立授权与验收。

## Phase 5C.2-B Android CR Independent Review

| 检查项 | 状态 | 结果 |
|---|---|---|
| Git / 写入边界 | PASS | 在 `C:\Users\23328\Desktop\new_version`、分支 `API-contract-Making`、HEAD `9d8a773bf8ef8097efc05b6d4571485b62b50333`、clean 工作树开始；跨目录只读；写入仅限两份正式 CR 记录、本 STATUS 与新 handoff；未修改业务文档、OpenAPI、metadata/source、Android、Web、Backend 或 Domain/数据库设计 |
| 输入完整性 | RECORDED | Phase 5D-A 没有独立 CR 文件，两个 `CR-5DA-*` 只嵌入原 handoff；本阶段保留来源编号并补建正式 ACCEPTED/REJECTED 记录，不改写原审计证据 |
| 固定 Contract | PASS / UNCHANGED | `1.1.0-contract` / `RC` / SHA `1d538483f96b95d777cc4dd02526b78a214bd663e036ea5a6c77f43dfa38d99d`；metadata 与实际文件精确匹配；109 paths / 121 operations / 192 schemas / 66 errors |
| `CR-5DA-001` | **ACCEPTED / CONTRACT_DEFECT** | Phase 2/角色业务明确校队和社团两类正式认证；当前 `CertificationDetails` 只有名称/有效期，request/response 无 discriminator，无法无损 round-trip；正式记录为 [CR-20260901-003](../../../contracts/change-requests/CR-20260901-003-certification-kind-round-trip.md) |
| CR-001 推荐 | BREAKING | 后续新增 `CertificationKind = SCHOOL_TEAM \| STUDENT_CLUB` 与 required/non-null `CertificationDetails.certificationKind`；不改 operation/status/error，不新增 endpoint；Android/学生 Web/教师 Web/Backend 全部重载新 binding |
| CR-001 Domain/DB | GAP / FOLLOW-UP REQUIRED | Phase 3 `certification_application_detail` 只有名称和有效期，没有 kind；需在 Backend 前独立补齐 Domain value/enum 与数据库非空闭集列，不能从名称回填；本阶段未修改设计 |
| `CR-5DA-002` | **REJECTED / NOT_CONTRACT_DEFECT** | 合法 Student actor 只能随 CURRENT 邀请/Enrollment 原子建立，current 切换无空窗；Student no-current 不可达。Teacher 账号可在首次 current 前存在，故 Teacher nullable empty 与 standalone 404 不要求 Student 同形；正式记录为 [CR-20260901-004](../../../contracts/change-requests/CR-20260901-004-student-dashboard-no-current-semester.md) |
| CR-002 重新归类 | LEGACY_MIGRATION + MAPPER/CLIENT ALIGNMENT | Android 旧 `V1StudentWorkspaceGateway` 的 nullable current/fan-out 不能反向决定新 Contract；锁定 1.1 generated `StudentDashboard.currentSemester` 已为 non-null，不改 schema/status/error |
| 跨 CR / Password / Phase 5C | PASS | 两 CR 互不影响；与 Password CR AC-01～06 无冲突；不回退 Phase 5C CR-011 的 standalone 404 和 Teacher no-current zero-count 语义；其余 11 个 CR 无重叠 |
| 验证 | PASS | verify `109/121/192/66`、RC readiness、Redocly lint、Version/SHA、内部 refs、当前/候选 certification、Student current/PENDING、Student no-current 预期拒绝、Teacher no-current、operation absence channel、Android/Domain/DB 静态断言 `9/9` 均通过 |
| Phase 结论 | **DONE** | `ACCEPTED=1`、`REJECTED=1`、`PARTIALLY_ACCEPTED=0`、`NEEDS_BUSINESS_DECISION=0`；评审完成，OpenAPI 未改 |

详细证据、operation/schema 影响、Breaking、下游重验与 Final Consolidation 清单见 [Phase 5C.2-B handoff](../handoffs/phase-5c2b-android-cr-independent-review.md)。

### Phase 5C.2-B 下一阶段前置条件

1. 可以进入 Phase 5C.2 Final Contract Consolidation；只落实 Password CR AC-01～AC-06 与 `CR-20260901-003`，不得落实 `CR-20260901-004`。
2. Consolidation 必须从确定性 source 新增认证 kind、提升 Version/SHA、重跑 verify/lint/readiness/实例/codegen；不得静默覆盖 `1.1.0-contract`。
3. Backend 初始化/迁移前另行授权并补齐 certification kind 的 Domain/Database design；如果届时已有认证数据，必须停止自动迁移，不能按名称推断回填。
4. Android/Web 重载同一新 Contract 后重验认证两类 round-trip；Android 另行移除旧 nullable workspace/fan-out 假设。真实 Backend、数据库、E2E、Staging/Production 仍需独立验收。

## Phase 5C.2-A Password Contract CR Creation & Review

| 检查项 | 状态 | 结果 |
|---|---|---|
| Git / 写入边界 | PASS | 在 `C:\Users\23328\Desktop\new_version`、分支 `API-contract-Making`、HEAD `ee3a3f87ef38d7312b3276703bf8da3fbe9d6972`、clean 工作树开始；跨目录只读；写入仅限 `CR-20260901-002`、本 STATUS 与新 handoff；未修改业务文档、OpenAPI、Contract metadata/source、Android、Web 或 Backend |
| 权威输入 | PASS | 已读取根 `AGENTS.md`、本 STATUS、Phase 5E、三份相关业务权威、Phase 5D-B 及其矩阵/CR 记录、固定 OpenAPI/metadata、Password/Auth/Admin operation/DTO/status/error 和现有 Domain/数据库支撑 |
| 固定 Contract | PASS / UNCHANGED | `1.1.0-contract` / `RC` / SHA `1d538483f96b95d777cc4dd02526b78a214bd663e036ea5a6c77f43dfa38d99d`；metadata 与实际文件精确匹配；本轮无 Contract 写入 |
| 已支持规则 | CONFIRMED | 个人密码非空；Teacher 初始强密码/gate；登录/refresh/`/me` 的 `CurrentActor.mustChangePassword`；本人改密基础 request/response；邮箱 self-reset 基础路径、全部旧 session revoke；202 anti-enumeration；现有稳定错误；secret-safe response/audit projection |
| Admin gate 审计 | CONTRACT_GAP | 52 条 Admin binding 中 7 条 gate-safe/public、5 条正常业务已有 `FIRST_PASSWORD_CHANGE_REQUIRED`、另有 40 条正常 Admin 业务缺该 code；40 条全部已有 403 response，可在后续 Consolidation 最小补齐 |
| Sub-admin 代设绕过 | CONTRACT_GAP | `UpdateSubAdminRequest.newPassword / confirmNewPassword` 当前为 required nullable，非 null 可替换个人 credential；CR 接受删除两个 properties/required entries，并更新 `updateSubAdmin` 语义 |
| Self reset / own change | CONTRACT_GAP | `resetPassword` 缺 403 `ACCOUNT_DISABLED` 与 clear-gate 说明；`changeOwnPassword` gate-clear 仍 Teacher-only 且缺稳定 disabled code；CR 接受复用现有 code/schema 明确化 |
| Admin-on-behalf reset | NOT_CONTRACT_DEFECT | 不存在 Teacher/Sub-admin admin reset operation，符合 Phase 5E 已拒绝的 `PWD-ADMIN-C`；不新增 endpoint、DTO 或临时 reset 语义 |
| CR | ACCEPTED | 新建 [CR-20260901-002](../../../contracts/change-requests/CR-20260901-002-password-contract.md)，先记录 `PROPOSED`，独立评审后正式提案 AC-01～AC-06 全部 `ACCEPTED` |
| Breaking | YES | 后续删除 required nullable request fields；Admin operation 新增 gate failure；reset 新增 disabled failure。必须提升 Contract Version/SHA 并要求全下游显式重载 |
| 数据库 | EXISTING DESIGN SUFFICIENT | 现有 `must_change/password_version/access_state/session/challenge` 设计足够，无新表/列；Backend runtime/migration/conformance 尚未执行 |
| Phase 结论 | **DONE** | CR 创建、逐条矩阵和独立评审完成；OpenAPI 实际修改严格留给 Phase 5C.2 Final Contract Consolidation |

详细矩阵、40 条 operationId、Schema/status/error、兼容性和评审排除项见 [Password CR](../../../contracts/change-requests/CR-20260901-002-password-contract.md) 与 [Phase handoff](../handoffs/phase-5c2a-password-contract-cr-review.md)。

### Phase 5C.2-A 下一阶段前置条件

1. 可以进入 Phase 5C.2 Final Contract Consolidation，但只能实现 `CR-20260901-002` 的 AC-01～AC-06，并与其他已接受 CR 统一决定新 Version/SHA。
2. Consolidation 必须从确定性 Contract source 生成 OpenAPI，重跑 verify/lint/RC readiness/catalog/coverage；不得静默覆盖当前 `1.1.0-contract`。
3. Android、Student Web、Teacher Web、Admin Web 与 Backend 必须显式重载新 Contract；实现、Legacy Migration、数据库和 Staging 均需各自授权与验收。
4. 不得新增 Admin reset Teacher/Sub-admin endpoint，不得恢复 12 位/最大长度/blocklist/history/same-as-current 或四个被禁止的 error code。

## Phase 5E Remaining Business Decision Closure

| 检查项 | 状态 | 结果 |
|---|---|---|
| Git / 写入边界 | PASS | 在 `C:\Users\23328\Desktop\new_version`、分支 `API-contract-Making`、HEAD `90db2a5dd33d77d3ffb55db1d4fdc33990e77a16`、clean 工作树开始；跨目录只读；写入只限三份相关业务权威、本 STATUS 和新 handoff；未修改 OpenAPI、Android、Web、Backend、Domain/数据库设计或 Contract metadata/version/SHA |
| 权威输入 | PASS | 已读取根 `AGENTS.md`、本 STATUS、Phase 2 handoff、四份当前业务权威、Phase 5D-A/5D-B 及 Web coverage/CR 记录、固定 Contract 和 Phase 3 Domain/数据库设计 |
| NBD 完整清单 | DONE | Phase 5D-A 明确为 0；Phase 5D-B 的全部两项是 `P5E-NBD-01` Teacher Dashboard Record 摘要与 `P5E-NBD-02` Teacher/Admin 密码和权限；没有把既有 CR、Legacy、Client/UI finding 伪装为业务决定 |
| `P5E-NBD-01` | `ACCEPTED` | 业务负责人选择 `DASH-A`：Teacher Dashboard 删除“需要关注的打卡记录”摘要，不定义集合、数量或下钻；`DASH-B/C/D` 均 `REJECTED` |
| `P5E-NBD-02` | `ACCEPTED` | 业务负责人选择 `PWD-POLICY-A + PWD-FIRST-B + PWD-ADMIN-B`，接受统一权限/会话/错误包，并删除 `TOO_LONG / BLOCKLISTED / SAME_AS_CURRENT` 及对应限制，不新增 `PASSWORD_POLICY_VIOLATION` |
| 业务规则 | MODIFIED / ACCEPTED | 三份相关业务权威已同步最终决定；个人密码只非空，Portal 私有 12 位规则、最大长度、blocklist、密码历史及“必须不同于当前密码”均不是业务规则 |
| 固定 Contract | PASS / UNCHANGED | `1.1.0-contract` / `RC` / `/api/v1` / SHA `1d538483f96b95d777cc4dd02526b78a214bd663e036ea5a6c77f43dfa38d99d`；现场文件哈希精确匹配 metadata |
| 新增 Contract CR | 0 / DEFERRED BY PHASE BOUNDARY | `DASH-A` 不需要 CR；密码决定需要独立新 CR，至少覆盖 Admin 首次改密 gate、删除 `UpdateSubAdminRequest` 密码字段、reset 停用错误与 gate 清除 wire 语义；本阶段不创建 CR |
| 文档验证 | PASS | `git diff --check`、5 文件严格 UTF-8、5 文件本地链接、Phase 5E 状态与 Dashboard 占位扫描均通过；Contract verify 为 `109 paths / 121 operations / 192 schemas / 66 errors`，RC readiness PASS |
| Phase 结论 | **DONE** | 两项业务歧义均已关闭；最终 Contract 尚未因密码 CR 更新，不能宣称 Contract 已完成收口 |

详细事实、方案、推荐和最终决定见[总业务流程 Phase 5E 决策包](../../business/00-overview.md)与 [Phase 5E handoff](../handoffs/phase-5e-remaining-business-decision-closure.md)。

### Phase 5E 下一阶段前置条件

1. 在独立后续任务中创建并评审密码 Contract CR；不得把已删除的三个策略原因、Portal 私有 12 位限制或其他未确认强度重新写入 CR。
2. CR 接受后提升 Contract Version/SHA，并要求 Backend、Android、Student Web、Teacher Web 和 Admin Web 重新加载；在此之前不得修改下游实现。
3. `DASH-A` 不创建 CR，后续 UI 只需不实现该摘要，不能改名恢复为无效、待审核、未人工审核或风险卡片。
4. 本轮没有执行实现、数据库、E2E、Staging、Production 或发布验收，后续不得把文档决策扩展成产品完成。

## Phase 5D-B Web Full Contract Surface Audit

| 检查项 | 状态 | 结果 |
|---|---|---|
| Git / 写入边界 | PASS | 在 `C:\Users\23328\Desktop\new_version`、分支 `API-contract-Making`、HEAD `4b4997925f4193023a126b78c3bd8aa42bb93599`、clean 工作树开始；跨目录仅只读；写入仅限 `docs/rebuild/STATUS.md` 与 `docs/rebuild/handoffs/**`；未修改 Web 产品源码、Contract、业务文档、Android 或 Backend |
| 固定 Contract | PASS / UNCHANGED | `1.1.0-contract` / `RC` / `/api/v1` / SHA `1d538483f96b95d777cc4dd02526b78a214bd663e036ea5a6c77f43dfa38d99d`；实际文件哈希精确匹配；verify `109 paths / 121 operations / 192 schemas / 66 errors` 与 RC readiness PASS |
| 页面全量盘点 | DONE | 53 个唯一逻辑页面/面板：Student 30、Portal 共用 5、Teacher 7、Admin 11；其中 50 当前存在，Teacher Dashboard、Teacher Notifications、Admin Notifications 3 个初版页面缺失；共用 Portal 页按角色展开为 58 个页面实例 |
| Use Case 全量盘点 | DONE | 154 个 Contract-facing Use Case：153 条 `角色 × operation` 映射（ANONYMOUS 9 / STUDENT 42 / TEACHER 50 / ADMIN 52）+ 1 条未映射 Teacher Dashboard “需要关注的打卡记录”；去重后映射 121 个 operationId |
| Contract 表达能力 | PARTIAL | 对所有已确认业务规则，Request/Response、Content/Empty/Error、HTTP status/`error.code`、权限、nullable/required、enum/状态机、分页/筛选/排序、上传/幂等均可表达；但“需关注 Record”判定口径与个人密码强度未被业务权威定义，不能自行补字段或客户端规则 |
| 新增 Contract CR | 0 / NOT REQUIRED | 已逐项排除把旧 Endpoint/DTO/Client、旧状态、缺页和客户端私有规则误报为 CR；NBD 项在业务决定前不建立 CR |
| Legacy Migration | REMAINS / NOT EXECUTED | 24 个 migration bundle；正式 Student `api.js`、Portal `api-client.ts` / `teacher-data.ts` / `admin-service.ts` 与 `3.0.0-web-snapshot` 仍存在；Phase 5B 1.1 binding/Mock 仅 validation-only；正式 runtime 可验证绑定为 0/121 |
| Client Defects | 2 | Student 未满 60 分钟/放弃 Session 调旧 cancel 并恢复同日机会；Admin 删除教师账号错误要求无课程/先交接 |
| UI / Product Findings | 8 | 旧入班审批态、学生耐力自助预估、Grades 的 absent/免测评分、Push-device 注销文案、缺 Teacher Dashboard、缺 Teacher/Admin 通知中心、缺分管理员本人注销、Teacher 旧综合分重算/批量发布表达 |
| Needs Business Decision | 2 | NBD-01：Teacher Dashboard “需要关注的打卡记录”集合/计数/下钻；NBD-02：Teacher/Admin 个人密码与找回密码统一强度/错误语义 |
| Phase 结论 | **PARTIAL** | Full audit 记录已完成，但不能宣称固定 Contract 已完整支撑全部 Web 初版语义，也不能宣称当前 Web 已迁移；用户清单中的 “Phase 5D-A” 与本轮标题不一致，未静默改写编号 |

详细证据见 [Phase 5D-B handoff](../handoffs/phase-5db-web-full-contract-surface-audit.md)、[Full Contract Coverage Matrix](../handoffs/web/phase-5db-full-contract-coverage-matrix.md)、[CR Bundle](../handoffs/web/phase-5db-contract-cr-bundle.md) 与 [Legacy Migration Findings](../handoffs/web/phase-5db-legacy-migration-findings.md)。

### Phase 5D-B 下一阶段前置条件

1. 由业务负责人先确认 Teacher Dashboard “需要关注的打卡记录”判定口径，以及 Teacher/Admin 个人密码/找回密码统一策略；更新四份业务权威后再判断是否需要新 CR。
2. 若确认规则能由 1.1 现有 operation 表达，不建立 CR；若严格证明不能表达，再提交独立 Contract Change Request，禁止兼容旧 DTO。
3. 后续 Web migration 必须按授权 Slice 把正式 Client/Repository/generated binding 切到固定 1.1，并在同一 Slice 删除旧 Endpoint/DTO/mapper，不保留 old/new fallback。
4. 修复 CD-01/CD-02 与 8 个 UI finding 后，执行 strict content/empty/error、权限/maintenance、上传/幂等、typecheck/lint/unit/build 与真实浏览器 hydration/console 验证。
5. Backend、数据库、真实账号、跨端 E2E、Staging、Production 与发布仍需独立阶段验收。

## Phase 5D-A Android Full Contract Surface Audit

| 检查项 | 状态 | 结果 |
|---|---|---|
| Git / 写入边界 | PASS | 在 `C:\Users\23328\Desktop\new_version`、分支 `API-contract-Making`、HEAD `4b4997925f4193023a126b78c3bd8aa42bb93599`、clean 工作树开始；跨目录只读，写入仅限本 STATUS 与新 handoff；未修改 Android/Web/Backend、业务文档、OpenAPI、Contract metadata/version/SHA、Mock 或 migration 代码。审查期间出现并发 Phase 5D-B 文档与 STATUS 更新，均原样保留且未计入本轮 |
| Contract 基线 | PASS / UNCHANGED | 现场 `Get-FileHash` 与 metadata 均为 `1.1.0-contract` / `RC` / `/api/v1` / `1d538483f96b95d777cc4dd02526b78a214bd663e036ea5a6c77f43dfa38d99d`；109 paths / 121 operations / 66 errors；无 Contract 写入 |
| 全页面覆盖 | DONE | 以独立可达 surface 计数共 28：启动/维护、认证/引导、5 个主 Tab、14 个 SubScreen 及 Notification Sheet；Dialog、同页 detail/loading/empty/error 不重复计页 |
| Full Use Case Matrix | DONE | 共 80 个独立 Contract 审查单元；逐项建立页面/用户动作 → Repository/Gateway/API boundary → operation 映射，并检查 request、response、content/empty/error、status/error.code、permission、nullable/required、enum/state、pagination/filter/sort、upload/idempotency 和 UI 字段依赖 |
| Contract operation 覆盖 | 44 UNIQUE | 47 个 STUDENT/ANONYMOUS operation 中，Android 初版正式业务映射 44 个；排除学生不使用的 password session/reset 和未提供 UI 的 logout-all。13 个本地行为无需 operation；另有 11 个旧/越界远端行为明确不应反向新增 operation |
| 新增 Contract CR | 2 PROPOSED | CR-5DA-001：`CertificationDetails` 无法区分并回显 SCHOOL_TEAM/STUDENT_CLUB；CR-5DA-002：`getStudentDashboard` 无法表达固定 Contract 已承认的 no-CURRENT-semester 状态。本阶段只记录，未修改 Contract |
| Legacy Migration | 6 BUNDLES / NOT EXECUTED | 认证邮箱、邀请入班、workspace/dashboard、Session/media/Record、application/grade、account/help/feedback/notification 六组均有 1.1 目标；当前正式 runtime 除公开启动检查外仍主要依赖旧 endpoint/DTO/client，未迁移、未双写、未 fallback |
| Client / UI findings | RECORDED | `CLIENT_DEFECT=12`：维护公告丢字段、强更缓存、gradeYear binding、媒体/申请限制、成绩及格线、旧运动状态机、feedback binding、注销 impact、Push、RequiredActivation、旧 workspace 等；`UI_PRODUCT_FINDING=6`：planned maintenance、历史课程、学生耐力预估、非正式资料字段、通知分类、旧引导/申请文案 |
| Needs Business Decision | 0 NEW | 校队/社团与 no-current 均可由现有权威/Contract 自身一致性判定；旧额外能力已有明确“不迁移”依据。若产品坚持恢复 planned maintenance、历史课程、学生预估等，必须另开业务决策并先更新 `docs/business/` |
| Contract 完整支撑结论 | NO | 大部分正式 Android 初版 surface 可表达，但两个新 CR 阻止无损全覆盖；即使 CR 后续接受，仍须独立完成正式 runtime migration 和客户端修复，不能把静态 audit 扩大为 Backend/device/E2E/Staging/release acceptance |
| Phase 5D-A | PARTIAL | 审查、分类、矩阵和 CR bundle 已完成，故不是 BLOCKED；固定 Contract 仍有 2 个真实缺口且 Android runtime 未迁移，故不是 PASS |

完整矩阵、两份 CR bundle、Legacy/Client/UI finding 和结束模板见 [Phase 5D-A handoff](../handoffs/phase-5d-a-android-full-contract-surface-audit.md)。

### Phase 5D-A 下一阶段前置条件

1. 独立 Contract review 评审 CR-5DA-001/002；本 handoff 不授权直接修改固定 `1.1.0-contract`。
2. 接受的 CR 必须更新确定性 Contract source、提升 Contract version、生成新 SHA，并要求 Android/Web/Backend 下游重新加载；不得保留 1.1/new 双 response fallback。
3. Android 在新 binding 通过后按六个 Legacy bundle 分 Slice 迁移，同时修复 12 个 Client defect、移除或重新决策 6 个 UI/Product finding；不得迁移 add-60、cancel、Record resubmission、student scoring preview、system Push 或 server preferences。
4. runtime Slice 完成后再执行 Android full unit/lint/assemble/device、Backend conformance、权限/maintenance/幂等、真实媒体、跨端 E2E 和 Staging；本轮静态结果不计作这些验收。

## Phase 5A.1 Android Contract Codegen / Generated Binding Fix

| 检查项 | 状态 | 结果 |
|---|---|---|
| Git / 写入边界 | PASS | 在 `C:\Users\23328\Desktop\new_version`、分支 `API-contract-Making`、HEAD `1e63cf92d8cf2a9ea09063bc92f890ce9af76ede`、clean 工作树开始；写入仅限 Android validation-only codegen/test 与本 STATUS/handoff；未修改 Web、Backend、业务文档、Contract 或正式 Legacy runtime |
| 实际根因 | FIXED | Kotlin generator 7.24.0 的 `jvm-okhttp4` + Gson 路径把 OpenAPI 3.1 nullable inline `anyOf` 误生成为非空空 wrapper，且未把 `rejectionCode` 绑定到既有 enum；不是 OpenAPI/Schema defect |
| Codegen 配置 | PASS | `phase5aOpenApiGenerate` 使用官方 `schemaMappings` 把 6 类 nullable primitive（width/height 复用同一 inline schema）映射为 Kotlin nullable type，并把 rejection code 映射为 `MediaFinalizationRejectionCode?`；使用 `importMappings` 的 nullable key 导入既有 generated enum；无生成后改写或手写 DTO |
| Generated binding gate | PASS | 195 个 model-only Kotlin 文件由锁定 Contract 重生；门禁断言 8 个 `MediaFinalizationResult` nullable 类型、enum import 与 7 个错误 wrapper 均不再生成；generated Kotlin 编译通过 |
| 可重复生成 | PASS | 连续两次先删除输出再从固定 Contract 生成，Kotlin source tree SHA-256 均为 `6dd62f5e716f4dde91fad4f006576587249ef7628f097949ebb0d3649703fa2f` |
| Gson 四类合法 fixture | PASS | VERIFIED 图片、VERIFIED 视频、REJECTED、EXPIRED `4/4` 均由 generated `MediaFinalizationResult` 成功反序列化；primitive metadata、null 与 rejection enum 值均逐项断言 |
| Media Finalization re-validation | PASS | 唯一 200 终态通道、503 dependency failure、幂等重放、未知终态、VERIFIED 非法 code、REJECTED 缺 code、EXPIRED 错 code、409 ErrorEnvelope fallback 与额外字段门禁全部通过；strict raw-JSON gate 后真实进入 generated DTO/Gson |
| Android 门禁 | PASS | Phase 5A 定向 unit `9/9`；全量 unit `337/337`；`assembleDebug` PASS；最终 lint 在相同源码/Contract 的 JDK 17 临时镜像中 `0 error / 31 warning / 1 information`。首次原目录 lint 被既有 daemon JDK 25.0.3 的 Android Lint 内部异常阻断，未伪装为代码失败；原 daemon 配置未改 |
| Contract 状态 | UNCHANGED | `1.1.0-contract` / `RC` / `1d538483f96b95d777cc4dd02526b78a214bd663e036ea5a6c77f43dfa38d99d`；Contract verify `109/121/192/66` 与 RC readiness PASS；OpenAPI、metadata、Version、SHA 均无修改 |
| Legacy API | REMAINS / NOT MIGRATED | 正式 Android runtime 继续使用旧 `3.0.0-contract` snapshot 与 hand-written transport；按本任务明确边界保留为 `Legacy Migration Finding`，未开始 Phase 7A |
| Phase 5A 最终状态 | PASS (CONTRACT/MOCK RE-VALIDATION) | 5A 的 generated media binding blocker 已解除；该结论不扩大为正式 1.1 runtime migration、Backend/PostgreSQL/COS、真实设备媒体链路、跨端 E2E、Staging、Production 或发布通过 |

详细证据见 [Phase 5A.1 handoff](../handoffs/phase-5a1-android-contract-codegen-fix.md) 与更新后的 [Phase 5A Re-validation handoff](../handoffs/phase-5a-android-contract-revalidation.md)。

## Phase 5C.1 CR-20260901-001 Contract Review

| 检查项 | 状态 | 结果 |
|---|---|---|
| Git / 写入边界 | PASS | 在 `C:\Users\23328\Desktop\new_version`、分支 `API-contract-Making`、HEAD `dfbc39eeef2843ba20e2c4f203bce0ebf4d2df23`、clean 工作树开始；跨目录仅只读，写入仅限目标 CR、本 STATUS 与新 handoff；未修改 Android/Web/Backend 源文件、业务文档或 Contract source/metadata |
| Review 范围 | DONE | 只评审 `CR-20260901-001`；对照当前 `1.1.0-contract`、`MediaAsset / MediaFinalizationResult`、Android generated DTO、四类原始合法 fixture、Kotlin 7.24.0 + `jvm-okhttp4` + Gson 生成链及 Phase 2/3 媒体语义 |
| 最终归因 | REJECTED / NOT_CONTRACT_DEFECT | 当前 OpenAPI 与 wire JSON 正确；失败归属 Kotlin generator 对 OpenAPI 3.1 nullable inline `anyOf` 的 generated binding/configuration defect，不是 Contract Schema / interoperability defect |
| Wire / Schema | PASS | `VERIFIED` 图片、`VERIFIED` 视频、`REJECTED`、`EXPIRED` 四类原始 fixture 对当前根 Schema 的 Draft 2020-12 校验均为 0 error；nullable 分支按 JSON 类型可判定，`allOf` status 收窄无业务歧义 |
| 当前 Android binding 复现 | PASS (BLOCKER PROOF) | 锁定的 `:app:phase5aOpenApiGenerate` 与定向测试执行成功；生成日志报告 3.1 beta 和 inline schema name 失败，空 wrapper binding 对四类合法 fixture 均无法解码，负向 blocker test 没有把失败伪装成成功 |
| 不改 Contract 的标准生成链验证 | PASS | 同一 OpenAPI Generator 7.24.0、Kotlin、`jvm-okhttp4`、Gson 与未修改 Contract，仅以官方 `schemaMappings` / `importMappings` 映射 nullable primitive/rejection enum；生成 Kotlin 编译通过，Gson 成功读取全部四类原始 fixture |
| Web / Backend 影响 | NO CONTRACT ACTION | Web `openapi-typescript` 从同一 Contract 正确生成 nullable primitive/enum，学生与 Portal binding check 均通过；Backend 当前只有占位 README、无 runtime DTO。修改公共 Contract 只会造成不必要的版本/SHA/下游重绑 |
| Contract 状态 | UNCHANGED | 保持 `1.1.0-contract` / `RC` / `1d538483f96b95d777cc4dd02526b78a214bd663e036ea5a6c77f43dfa38d99d`；未修改 OpenAPI、metadata 或 SHA，未提升版本 |
| Phase 5D | NOT ENTERED | 本轮只完成归因与记录；不以 Android 测试通过为理由修改公共 Contract，也不授权客户端修复 |

详细证据见 [Phase 5C.1 Contract Review handoff](../handoffs/phase-5c1-contract-review-cr-20260901-001.md) 与 [CR-20260901-001](../../../contracts/change-requests/CR-20260901-001-android-media-finalization-codegen.md)。

### Phase 5C.1 后续前置条件

1. 后续 Android 授权任务已由 Phase 5A.1 完成：只修正 generator configuration/generated binding gate，没有手写平行 DTO、生成后改写、old/new fallback 或反向修改公共 Contract。
2. 当前 `1.1.0-contract` 与 SHA 的 generated DTO + Gson 四类合法 fixture、非法 status/rejection/extra-field、unit/lint/assemble 门禁均已通过；connected device 因 validation-only binding 不进入 runtime 而未重跑。
3. 正式 runtime Legacy API 迁移仍按后续独立 Slice 执行；validation-only codegen 证明不能冒充 runtime 已迁移。
4. Phase 5D 未进入；如需开始，必须另行明确授权并满足该阶段自身前置条件。

## Phase 5A Android Re-validation

| 检查项 | 状态 | 结果 |
|---|---|---|
| Git / 并发 / 写入边界 | PASS | 在 `C:\Users\23328\Desktop\new_version`、分支 `API-contract-Making`、HEAD `18782a5fa909c03179a72611f159a41e4f2c8dd8`、clean 工作树开始；只修改 Android validation-only binding/test、1 个陈旧静态测试断言、新 PROPOSED CR 与本 STATUS/handoff。执行中出现并行 Phase 5B Web 未提交变化，均原样保留且未计入 Android 结果 |
| Contract binding | PASS (VALIDATION BINDING) | 根 Contract 实际/metadata 均精确为 `1.1.0-contract` / `1d538483f96b95d777cc4dd02526b78a214bd663e036ea5a6c77f43dfa38d99d`；隔离 Android test binding 可重复生成并编译。正式 main/runtime 旧 `3.0.0-contract` 按明确边界保留为 Legacy Migration Finding，不作为本 validation-only PASS 的迁移声明 |
| Session | PASS (STRICT FIXTURE) | 200 content、404 Idle、201 start、认证/维护/依赖错误分离；非 404 错误不伪装 Idle；额外字段拒绝 |
| StudentDashboard | PASS (STRICT FIXTURE) | ACTIVE/PENDING 均保留完整 required student；course/progress null 不丢资料；重复 status/student identity 一致性与额外字段门禁通过 |
| 邀请预览 | PASS (STRICT FIXTURE) | 五种 200 内容态、未知/畸形 422、扫码/手输一致及额外字段拒绝均通过 |
| Media allocation | PASS (MOCKWEBSERVER) | 图片/视频 `PUT + exact requiredHeaders + bytes` 与过期 allocation replacement 均通过实际请求断言 |
| Media finalization | PASS (STRICT + GENERATED) | 终态 wire invariant、依赖失败、幂等重放、无 ErrorEnvelope 双通道与非法组合继续通过 strict JSON；官方 mappings 修复后的 generated Kotlin/Gson DTO 对 VERIFIED 图片、VERIFIED 视频、REJECTED、EXPIRED 四类合法 fixture `4/4` 通过 |
| Current semester | PASS (STRICT FIXTURE) | 200、404 absent 与 503 dependency failure 明确分离 |
| 新增 Contract CR | PROPOSED / BLOCKING（历史快照） | 新增 `CR-20260901-001`：nullable primitive/enum schema 在 Android Kotlin 7.24.0 binding 中生成空 wrapper；未修改 OpenAPI、wire keys、业务规则、版本或 SHA。该提案随后在 Phase 5C.1 被判定为 `REJECTED / NOT_CONTRACT_DEFECT` |
| 自动化测试 | PASS | 当前 Contract verify `109/121/192/66` 与 RC readiness PASS；Phase 5A unit `9/9`；Android full unit `337/337`；lint `0 error / 31 warning / 1 information`；assemble PASS。Phase 5A.1 未重跑 connected tests；先前 Pixel_10 `android-37.1` 的 `11/11` 仅保留为历史设备基线，不计作本轮结果 |
| Legacy API | REMAINS / NOT MIGRATED | 新旧 operationId 仅重合 14；main source 使用的 68 个旧 generated model 有 57 个不在 1.1 生成模型中。旧 transport/snapshot、既有 debug Mock 与模拟扫码入口均保留；未新增产品 Fake Success、私有字段或兼容逻辑 |
| Phase 5A 最终条件 | PASS (CONTRACT/MOCK RE-VALIDATION) | generated media binding blocker 已解除；正式旧 runtime 按用户明确要求继续作为 Legacy Migration Finding，未迁移且不冒充 1.1 产品绑定。不得扩大为 Backend、数据库、COS、真实媒体设备链路、E2E、Staging 或发布通过 |

详细证据见 [Phase 5A Android Re-validation handoff](../handoffs/phase-5a-android-contract-revalidation.md)。

### Phase 5A Re-validation 后续前置条件

1. `CR-20260901-001` 保持 `REJECTED / NOT_CONTRACT_DEFECT`；当前 Android generator configuration/generated binding 修复已完成，不需要 Contract action。
2. 正式 Android Legacy API 只在授权的 Phase 7A Slice 迁移；validation-only binding 不能冒充 runtime 已迁移。
3. 如需真实设备媒体链路或 Compose runtime 验证，必须在对应 runtime Slice 已正式绑定新 Contract 后执行；本 Phase 的 generated DTO test source 不进入产品 source set。
4. Backend/PostgreSQL/COS 可用后再执行 conformance、权限、maintenance、幂等、真实上传、事务/并发、跨端 E2E 与 Staging gate。

## Phase 5B Web Re-validation

| 检查项 | 状态 | 结果 |
|---|---|---|
| Git / 并发 / 写入边界 | PASS | 在 `C:\Users\23328\Desktop\new_version`、分支 `API-contract-Making`、HEAD `18782a5fa909c03179a72611f159a41e4f2c8dd8`、clean 工作树开始；只修改 Phase 5B validation-only Web binding/fixture/test/UI 与本 STATUS/handoff；未修改 OpenAPI、Contract source/metadata、正式 Legacy transport、业务文档、Backend 或数据库。执行中共享工作区出现 Android re-validation 及其 CR 的并发未提交变化，本轮只读识别，未覆盖、暂存或归入 Web 结果 |
| Contract binding | PASS | 根文件实际 SHA-256、metadata 和两个 Web validation binding 均为 `1.1.0-contract` / `RC` / `/api/v1` / `1d538483f96b95d777cc4dd02526b78a214bd663e036ea5a6c77f43dfa38d99d`；Portal 与学生 Web `openapi-typescript --check` 均通过；OpenAPI 未修改 |
| 基线漂移门禁 | PASS (DETECTED) | 修改前 `phase5b:contract:check` 真实失败：旧 validation binding 期望 `1.0.0-contract`，metadata 已是 `1.1.0-contract`；随后只机械重生 validation-only binding 并更新精确门禁，没有保留旧/新 fallback |
| 学生 CR 场景 | PASS (STRICT MOCK) | Session 200、404 Idle 与认证/维护/依赖错误分离，Idle→start；ACTIVE/PENDING required student；邀请五种 200 内容态与未知 422；Record image/video、application image 的 PUT/headers/bytes/reallocation；VERIFIED/REJECTED/EXPIRED 唯一 200 result、依赖错误和幂等重放均通过 |
| 教师 CR 场景 | PASS (STRICT MOCK) | 邀请管理 refresh/relogin/other-device read 恢复 ID/version/status/revocable，read fixture 无 raw code/digest，撤销冲突保留真实错误；Teacher Dashboard current 与 no-current zero counts；名单 CSV/XLSX PUT；createCourse CURRENT/409/404/并发冲突均通过 |
| 管理员 CR 场景 | PASS (STRICT MOCK) | Semester current/no-current、多 UPCOMING/ARCHIVED、filter/page summary 稳定；Feedback 五状态/全零/pending 公式/filter/page/mutation/reopen；Help 三状态/全零/filter/page/create/publish/archive/republish；Sub-admin 空/混合/filter 与固定 8 权限均通过 |
| 自动化测试 | PASS | Contract verify：109 paths / 121 operations / 192 schemas / 66 errors；RC readiness PASS；Portal typecheck PASS；定向旧+新 Phase 5B `22/22`，最终新增 re-validation `15/15`，Portal 完整 `112/112`；学生 smoke `79/79`；Web runtime config PASS；lint `0 error / 5` 条既有 `admin-service.ts` warning；production build PASS |
| 浏览器 | PASS (LOCAL DEV) | 本地 development-only `/phase5b-contract-mock` 的学生/教师/管理员 × content/empty/error 共 `9/9` DOM 通过，9 个场景 console warning/error 均 `0`；390×844 下全部 `scrollWidth=383 <= innerWidth=390`；不是正式产品入口、部署或 Backend E2E |
| 新增 Contract CR | NOT REQUIRED BY WEB | 本次 Web strict binding/Mock 未发现新的 Contract 字段/status/schema/response 缺口，Web 新增 CR 为 0。共享工作区另有并发 Android Phase 5A 提交的 `CR-20260901-001`；该提案随后在 Phase 5C.1 被判定为 `REJECTED / NOT_CONTRACT_DEFECT`，Web 无需因它重新绑定 |
| Legacy API | REMAINS / NOT MIGRATED | 正式学生 `api.js`、Portal `api-client.ts`、旧 `3.0.0-web-snapshot`/adapter 仍存在；排除 Phase 5B validation-only 文件后关键签名仍命中 15 个 Web 文件。本阶段未迁移、删除、兼容或宣称旧 API 已退役 |
| Phase 5B 最终条件 | PASS (CONTRACT/MOCK GATE) | Phase 5C handoff 第 10 节 Web validation-only 条件已满足；不得扩大为真实 Backend、PostgreSQL/COS、权限、事务/并发、跨端 E2E、Staging、Production 或发布通过 |

详细证据见 [Phase 5B handoff](../handoffs/phase-5b-web-core-contract-mock-validation.md) 的 re-validation 区块。

### Phase 5B Re-validation 后续前置条件

1. `CR-20260901-001` 已被 Contract review 判定为 `REJECTED / NOT_CONTRACT_DEFECT`；当前 Web binding 无需重生，Contract version/SHA 保持不变。
2. 正式 Legacy API 只在 Phase 7 按 Web Legacy Migration Findings 逐 Slice 迁移；development-only Mock 不得成为产品入口。
3. Backend/PostgreSQL/COS 可用后再执行 conformance、权限、maintenance fail-closed、幂等/expectedVersion、真实上传、事务/并发、跨端 E2E 与 Staging gate。

## Phase 5C Contract CR Consolidation

| 检查项 | 状态 | 结果 |
|---|---|---|
| Git / 写入边界 | PASS | 在 `C:\Users\23328\Desktop\new_version`、分支 `API-contract-Making`、HEAD `2ce203f271635284cf71ec3622ac59f0953e4f0c`、clean 工作树开始；只修改 `contracts/`、STATUS 与 Phase 5C handoff；未修改 Android/Web/Backend/数据库实现或业务文档；未 Commit/Push/Merge/Tag |
| 权威输入 | PASS | 已对照四份业务权威、Phase 2 确认规则、Phase 3 Domain/Database Design、当前 OpenAPI RC、Android/Web CR Bundle 与 12 份 CR；旧 API/DTO/Client 不作为需求来源 |
| CR 收集/去重 | PASS | Android 4；Web 12（其中 CR-001～004 复用 Android 主 CR）；重叠 4 个来源发现标记 `DUPLICATE`；去重后 12 份唯一 CR |
| 最终评审 | DONE | CR-001～012 全部 `ACCEPTED`；`REJECTED=0`、影响 Contract 正确性的 `NEEDS_BUSINESS_DECISION=0`；每份 CR 已更新最终审批记录 |
| Android/Web 冲突 | PASS | 没有相反要求；Session、媒体、学生资料和邀请的四个跨端重叠项语义一致；current-semester 空态与 createCourse error 已统一 |
| Contract 版本 | UPDATED | `1.0.0-contract` / RC / SHA `ff15441...c8478f` → `1.1.0-contract` / RC / SHA `1d538483f96b95d777cc4dd02526b78a214bd663e036ea5a6c77f43dfa38d99d` |
| Contract 内容 | DONE | Session/current-semester 空态、媒体唯一 finalization 通道、PENDING 本人资料、邀请预览、direct-upload PUT、教师邀请管理 read、semester/feedback/help/sub-admin summaries、createCourse semester 404/409 已落实 |
| Contract validation | PASS | 最终 `verify_contract.py`：109 paths / 121 operations / 192 schemas / 66 errors；Redocly lint PASS；RC readiness PASS；Draft 2020-12 媒体实例 3 合法/4 非法组合验证 PASS；metadata/SHA 一致 |
| 首次验证失败 | FIXED | 首次修改后 verify 真实发现 `MEDIA_ALLOCATION_EXPIRED` 已改为 200 result code 却残留 Error catalog；删除双通道残留后重跑全部 PASS |
| Legacy Migration Findings | NOT EXECUTED BY DESIGN | 未迁移或兼容 Android/Web 旧 Endpoint、DTO、API Client、generated snapshot 或旧语义；继续作为 Phase 7 输入 |
| 尚未验证 | NOT EXECUTED | Android/Web 新 binding、严格 Mock、客户端 unit/lint/build/browser/device、Backend conformance、真实 PostgreSQL/COS、跨端 E2E、Staging/Production |

最终交付：[Phase 5C handoff](../handoffs/phase-5c-contract-cr-consolidation.md)。

### Phase 5C 下一阶段前置条件

1. Android、学生 Web、教师/管理员 Web 与 Backend 分别锁定 `1.1.0-contract` + 新 SHA，禁止旧/新双 response fallback。
2. 按 Phase 5C handoff 第 10 节重新验证 Session、媒体、PENDING profile、邀请、四类 summary、无 current 与 createCourse error 场景。
3. Legacy Migration Findings 仅在 Phase 7 迁移客户端边界，不得恢复旧字段/Endpoint/语义。
4. Backend/数据库/COS 可用后再执行 conformance、权限、幂等、事务/并发、真实上传、跨端 E2E 与 Staging gate。

## Phase 5B Web 只读 Contract CR 全量审查

| 检查项 | 状态 | 结果 |
|---|---|---|
| Git / 审查边界 | PASS | 在 `C:\Users\23328\Desktop\new_version`、分支 `API-contract-Making`、HEAD `81f45feb441a9e5ddba0e265eac98e1c4d3eee48` 开始；只读检索可跨目录，写入仅限 PROPOSED CR、STATUS 与 handoff；并行出现的 Android CR/handoff 原样保留 |
| Legacy 判定门禁 | PASS | 所有旧 API/DTO/`3.0.0-web-snapshot` 命中先检查现行 operation 与语义；完整支持时标记 `LEGACY_MIGRATION`，不根据旧结构要求兼容 |
| 审查范围 | DONE | 已覆盖学生 Web、教师 Portal、管理员 Portal 的认证、Dashboard、课程/邀请/成员/名单、Session/媒体/Record/统计、申请/耐力/成绩，以及学期、账号、分管理员、反馈、规则、模式、帮助、审计核心 Use Case；单个 CR 阻塞不停止独立场景 |
| Contract 基线 | UNCHANGED | `1.0.0-contract` / `RC` / `/api/v1` / SHA-256 `ff15441b84f0729626a49c6898ea4896e80321b8e873a933768a509fd4c8478f`；未修改 OpenAPI/source/metadata，未提升版本、未生成新 SHA |
| Web CR Bundle | PROPOSED | 12 份唯一 CR；复用 CR-001～004，新建 CR-005 直传 method、006 邀请 management read、007 学期 summary、008 feedback summary、009 help summary、010 sub-admin summary、011 current semester absence、012 createCourse semester error |
| 分类 | PASS | `BLOCKING`：CR-001/002/003/005；`LOCAL`：CR-004/006～012；`DUPLICATE`：Web 再次命中 CR-001～004，0 个重复文件；`NOT_CONTRACT_DEFECT` 与 `BUSINESS PENDING` 已单列 |
| 已通过场景 | PASS (STATIC CONTRACT) | 登录/会话/改密/模式、课程和成员、Record 复核与统计、申请/耐力/成绩、管理员概览/当前课程、账号操作、规则、模式、help/feedback 内容与 mutation、audit 等成功/列表/空数组/已声明错误可表达；不等于 Backend 或完整 Web Mock 通过 |
| 被 CR 阻塞 | PARTIAL | 学生 Session 空态、媒体拒绝和直传、PENDING 资料、邀请终止/教师管理、四个管理员全局 summary、无 current semester 空态、createCourse 学期失败语义 |
| 数据库支持 | PASS (STATIC DESIGN) | Phase 3 的 invitation、semester、feedback、help、admin profile/index 和现有业务关系静态支持所需 read model；真实 migration/query plan/事务/并发未执行 |
| 尚未验证 | NOT EXECUTED | 剩余严格 RC Mock、两个 Web 项目实际迁移、Backend conformance/权限/幂等、真实 PostgreSQL/COS、完整浏览器/可访问性、跨端 E2E、Staging/Production |
| 修改边界 | PASS | 未修改 Web/Android/Backend/数据库/业务文档、Mock、fixture、私有字段、兼容逻辑、OpenAPI、Contract version 或 SHA |

最终交付：

- [Web Contract CR Bundle](../handoffs/web/contract-cr-bundle.md)
- [Web Legacy Migration Findings](../handoffs/web/legacy-migration-findings.md)

### Phase 5B 下一阶段前置条件

1. 独立 Contract review 逐份评审 CR-001～012；保持 `PROPOSED` 时不得进入 Contract 或客户端兼容修复。
2. 接受项必须更新确定性 Contract source、提升版本并生成新 SHA；Web/Android 再共同重载同一 Version + SHA。
3. 已支持的旧边界只按 Legacy Migration Findings 迁移；不得保留旧字段、双 response 通道、硬编码 upload method、私有 total 或 Fake Success。
4. 新 Contract 与 Backend/数据库可用后，再执行剩余严格 Mock、conformance、权限、事务/并发、COS、浏览器与跨端 E2E。

> 下方 Phase 5A 与既有 Phase 5B Mock 区块保留各自审计/提交时快照；其中旧的“所选 Slice 无 CR”只适用于当时代表性 Slice，不覆盖本次 Web 全量只读审查。

## Phase 5A Android Contract CR 全量续审

| 检查项 | 状态 | 结果 |
|---|---|---|
| Git / 并发边界 | PASS | 续审在根目录 `C:\Users\23328\Desktop\new_version`、分支 `API-contract-Making`、HEAD `ab7dbec139bd5a14896ac41a4ca6b9eb17442bd3` 开始；审计期间共享分支被另一 Phase 5B 任务推进至 `81f45feb441a9e5ddba0e265eac98e1c4d3eee48`，本任务未 reset、stash、覆盖或改写并发提交 |
| 审计范围 | DONE | 已继续检查启动、认证、课程/入班、Dashboard、Session、媒体、Record、进度、耐力、成绩、申请、反馈、帮助、通知、本人资料与账号安全页面，以及相关 Repository/Gateway/Controller/State/Use Case；互不依赖场景在单个 CR 阻塞后继续审查 |
| Legacy 判定门禁 | PASS | 每个旧 API/DTO/旧 Contract 命中先回答新 operation 是否存在、是否完整支持当前页面语义；已完整支持的一律标记 `LEGACY_MIGRATION`，不根据旧结构反向创建 CR |
| Contract 基线 | UNCHANGED | `1.0.0-contract` / `RC` / `/api/v1` / SHA-256 `ff15441b84f0729626a49c6898ea4896e80321b8e873a933768a509fd4c8478f`；未修改 OpenAPI/source/metadata，未提升版本、未生成新 SHA |
| Android CR Bundle | PROPOSED | 共 4 份唯一 CR：CR-001 活动 Session 空态、CR-002 媒体 finalization 拒绝通道、CR-003 PENDING 稳定本人资料投影、CR-004 邀请终止状态通道；CR-001 为既有保留，未重复创建 |
| 分类 | PASS | `BLOCKING`：CR-001/002/003；`LOCAL`：CR-004；`DUPLICATE`：Session 空态续审命中既有 CR-001，0 个重复文件；`NOT_CONTRACT_DEFECT`：旧/撤销/DEV_ONLY/客户端本地行为及现有 Contract 已可表达项 |
| 已通过场景 | PASS (STATIC CONTRACT) | 版本/维护门禁、OTP/会话、换绑/注销、课程内容与空态、ACTIVE 邀请与加入、Session 内容/控制、媒体成功链、Record 提交/列表/详情、进度、耐力结果、成绩、申请、反馈、帮助、通知和通用 actor 可由当前 RC 表达；不等于 Android Mock/UI 或 Backend 通过 |
| 被 CR 阻塞 | PARTIAL | CR-001 阻塞 Session Idle/完整开始闭环；CR-002 阻塞 Record 与申请媒体拒绝/过期；CR-003 阻塞 PENDING 完整本人资料/预填；CR-004 只阻塞四种邀请码终止状态 |
| 尚未验证 | NOT EXECUTED | 严格 Android RC fixture/Compose/设备、Android 与学生 Web 同版本实际绑定、Backend/权限/幂等/事务/并发、真实 PostgreSQL/COS、E2E/Staging/Production；历史课程/转班导航另为业务 `PENDING`，不转成 CR |
| Android 验证 | PARTIAL | `verifyOpenApiContractBinding` 与 `compileDebugKotlin` PASS；全量 `testDebugUnitTest` 为 328 tests / 1 个既有失败：`AcceptedContractStaticPolicyTest.semesterUiUsesPublicLabelsAndWrapsWithoutInternalIdFallback` |
| Contract 验证 | PASS | `verify_contract.py` 为 `109 paths / 120 operations / 183 schemas / 66 errors`；`check_rc_readiness.py` PASS；这些结果不批准 PROPOSED CR |
| 修改边界 | PASS | 未修改 Android 源文件、Android 测试/Mock、OpenAPI、Contract version/SHA、业务规则、Web、Backend 或数据库；未新增假数据、私有字段、TODO、stub 或兼容逻辑 |

最终交付：

- [Android Contract CR Bundle](../handoffs/android/contract-cr-bundle.md)
- [Android Legacy Migration Findings](../handoffs/android/legacy-migration-findings.md)
- [Phase 5A 历史与续审 handoff](../handoffs/phase-5a-android-core-contract-mock-validation.md)

### Phase 5A 下一阶段前置条件

1. 独立 Contract 任务分别评审 CR-001～004；在其保持 `PROPOSED` 时，不得进入 Contract 修复或客户端双通道兼容。
2. 接受项必须提升 Contract 版本并生成新 SHA，Android 与学生 Web 再分别重载同一 Version + SHA；已支持旧边界只按 `LEGACY_MIGRATION` 迁移。
3. 单独修复 Android 既有 unit test 失败，再执行严格 RC fixture、全量 unit/lint/assemble、Compose/设备和跨端字段一致性验证。
4. Backend/数据库/COS 可用后再做 conformance、权限、幂等、事务、并发与 E2E；静态 Contract 审计和 Mock 均不能替代产品验收。

> 下方 Phase 5B 区块保留其提交时快照；其中关于“Phase 5A 只有 CR-001”的描述已被上方后续 Android 全量续审取代，Phase 5B 自身的 Web 验证结论不变。

## Phase 5B Web 核心 Contract 与轻量 Mock 验证

| 检查项 | 状态 | 结果 |
|---|---|---|
| Git / 权威输入 | PASS | 起始根目录 `C:\Users\23328\Desktop\new_version`、分支 `API-contract-Making`、HEAD `ab7dbec139bd5a14896ac41a4ca6b9eb17442bd3`；起始工作区只有 Phase 5A 的 `STATUS`、CR 和 handoff 未提交变化，本轮原样保留；已读取根与 Portal AGENTS、Phase 0B/STATUS、四份业务权威、Phase 5A handoff、RC Contract 和数据库支持输入 |
| 轻量范围 | PASS | 新增 development-only `/phase5b-contract-mock`，只覆盖教师密码登录、本人课程、Record 复核列表/详情、追加审核、课程进度，以及管理员密码登录、系统概览和当前课程只读目录；未迁移全部 Portal 页面 |
| Contract 基线 | PASS | 预览独立锁定根 `1.0.0-contract` / `RC` / `/api/v1` / SHA-256 `ff15441b84f0729626a49c6898ea4896e80321b8e873a933768a509fd4c8478f`；生成类型 `--check` 与 metadata/SHA 门禁均通过；本轮未修改 Contract source/OpenAPI/metadata |
| 教师登录 | PASS (MOCK UI) | `PasswordSessionRequest → 201 SessionTokenPair` 可展示角色、账号状态和本人信息；Token 不渲染；`INVALID_CREDENTIALS ErrorEnvelope` 可表达登录错误 |
| 课程管理入口 | PASS (MOCK UI) | `CoursePage/Course` 提供学期、责任教师、时间窗、两类目标、成员数、状态和版本；`items=[]` 表达无课程，错误使用 `ErrorEnvelope` |
| Record 列表 / 详情 | PASS (MOCK UI) | `ExerciseRecordPage/ExerciseRecord` 分离 `actualDurationSeconds`、`creditedMinutes`、`currentReview.studentVisibleReason` 和媒体；空数组与依赖错误均可表达 |
| “待审核”边界 | PASS (AUTHORITY) | 权威业务不存在 PENDING Record；页面命名为“打卡复核列表”，提交即 `VALID`，只追加 `VALID/INVALID`，未新增私有审核状态或恢复旧 `REVIEWED/publicComment` DTO |
| 审核操作 | PASS (MOCK UI) | `AppendRecordReviewRequest` 只含 `result / studentVisibleReason / expectedVersion`；`201 RecordReview` 表达追加序号、前后结果、教师与时间；失败保持原结果，不显示 Fake Success |
| 课程统计 | PASS (MOCK UI) | `StudentCourseProgressPage` 按两类原始分钟、认证分钟、分类封顶、总分钟和展示百分比呈现；`displayPercent` 只显示，不参与业务判断 |
| 管理员功能 | PASS (MOCK UI) | `AdminDashboard` 可表达模式、学期、账号摘要和 5 个显式健康状态；`AdminCurrentCourseDirectory` 可表达三项汇总与只读课程指标，不补造成员/Record/媒体下钻 |
| 空态 / 错误态 | PASS (BROWSER) | 教师 4 个空态、5 个错误态；管理员学期/课程空态及 3 个错误态均可见；所有错误严格使用 `ErrorEnvelope`，浏览器 console warning/error 为 0 |
| 移动端 | PASS (BROWSER) | 390×844 视口渲染正常，`scrollWidth 383 <= innerWidth 390`，无横向溢出；恢复默认视口后 console 仍为空 |
| 数据库支持 | PASS (STATIC DESIGN) | Phase 3 关系、索引、current projection 与统计 view 静态支持所选查询；真实 PostgreSQL、migration、query plan、事务、并发和权限均 NOT EXECUTED |
| Contract Change Request | NOT REQUIRED | 所选 Phase 5B 闭环未发现字段/status/schema 缺口；未新增 CR。Phase 5A 的 `CR-20260831-001` 仍只阻塞学生 Session 空态，不由本轮处理 |
| 旧 Web 边界 | PARTIAL / REMAINS | 完整学生/Portal 仍绑定旧 adapter 与 `3.0.0-web-snapshot`；`creditedDurationSeconds/publicComment` 等签名仍命中 15 个当前 Web 文件，管理员教师删除 Demo 仍含已撤销的课程交接 blocker；本轮隔离验证未顺带迁移或修复 |
| Portal 验证 | PASS | 修改前基线 typecheck PASS、90/90 tests；修改后 typecheck PASS、定向 7/7、完整 97/97 tests，lint 0 error / 5 条既有 `admin-service.ts` warning，production build 识别 `/phase5b-contract-mock`；保留既有 `punycode`、大 chunk 和 route-classification 非阻断 warning |

详细证据见 [Phase 5B handoff](../handoffs/phase-5b-web-core-contract-mock-validation.md)。

### Phase 5B 下一步前置条件

1. 将本轮隔离 RC 预览的字段与错误语义逐 Slice 迁入正式 `api-client.ts`、教师页面和管理员页面；不能把 development-only route 当成产品入口。
2. 迁移 Record 边界时删除旧 `REVIEWED / creditedDurationSeconds / publicComment` 依赖，统一为 `VALID/INVALID / creditedMinutes / studentVisibleReason`，再重载同一 Contract Version + SHA。
3. 在独立管理员 Web Slice 删除教师账号“有课程必须交接”的旧 Demo blocker；按 `P4-DECISION-05` 不查询、修改或转移 Course 责任关系。
4. 真实 Backend 可用后执行 Contract conformance、角色权限、maintenance fail-closed、幂等/expectedVersion、事务/并发和浏览器 E2E；此前不得将 Mock 结果提升为产品或 Staging 通过。

## Phase 5A Android 核心 Contract 与轻量 Mock 验证（初次检查记录）

| 检查项 | 状态 | 结果 |
|---|---|---|
| Git / 权威输入 | PASS | 起始根目录 `C:\Users\23328\Desktop\new_version`、分支 `API-contract-Making`、HEAD `ab7dbec139bd5a14896ac41a4ca6b9eb17442bd3`、工作区 clean；已读取根 AGENTS、Phase 0B/STATUS、四份业务权威、Phase 4 Contract 与数据库支持输入 |
| Contract 基线 | PASS | `1.0.0-contract` / `RC` / `/api/v1` / SHA-256 `ff15441b84f0729626a49c6898ea4896e80321b8e873a933768a509fd4c8478f`；本轮未修改 OpenAPI/source/metadata |
| 登录 | PASS (STATIC) | `createStudentSession → 201 SessionTokenPair`；失败使用统一 `ErrorEnvelope` |
| 课程列表与详情 | PASS (STATIC) | `StudentDashboard.course/progress` nullable 可表达 0/1 当前课程；`StudentCourse` 提供学期、责任教师、时间窗和两类目标 |
| Session 内容 | PASS (STATIC) | `ExerciseSession` 分离状态、服务端 business date/timestamps/duration/version；200 已声明 |
| Session 空状态 | BLOCKED | `getOwnActiveExerciseSession` description 写明无 Session 返回 404，但 responses 没有 404，`x-error-codes` 没有 `RESOURCE_NOT_FOUND`；严格 Mock 无合法表达 |
| Record 提交/结果 | PASS (STATIC) | Request 只有 `category / description / mediaAssetIds` 且拒绝额外字段；Response 由服务端分别返回 actual duration、0/60/120 credited minutes、business date、媒体和当前 Review |
| 个人记录空/错状态 | PASS (STATIC) | `ExerciseRecordPage.items=[]` 合法；统一 `ErrorEnvelope` 可表达错误 |
| Android / Web 同字段 | BLOCKED | Android 仍绑定 `3.0.0-contract`；Web 仍绑定 `3.0.0-web-snapshot`/旧 adapter，并存在 `creditedDurationSeconds`、`publicComment` 对 RC `creditedMinutes`、`studentVisibleReason` 的旧边界；未跨目录迁移 |
| 数据库支持 | PASS (STATIC DESIGN) | Session/Record/Review/progress 的关系、partial unique、每日唯一、view/index 已设计；真实 PostgreSQL/migration/query plan/事务/并发均 NOT EXECUTED |
| Contract Change Request | PROPOSED | 已提交 [CR-20260831-001](../../../contracts/change-requests/CR-20260831-001-active-session-empty-state.md)；未批准、未修改 Contract、未提升版本 |
| Android 基线测试 | FAIL (PRE-EXISTING) | 修改前执行 `:app:testDebugUnitTest`：328 tests / 1 failure，失败为 `AcceptedContractStaticPolicyTest.semesterUiUsesPublicLabelsAndWrapsWithoutInternalIdFallback`；同次 `verifyOpenApiContractBinding`、旧 snapshot 生成和 `compileDebugKotlin` 通过 |
| Android Mock 实现 | NOT EXECUTED | Contract 门禁触发后停止；没有新增私有字段、RC fixture、Mock 成功路径或客户端 workaround |

详细证据见 [Phase 5A handoff](../handoffs/phase-5a-android-core-contract-mock-validation.md)。

### Phase 5A 初次检查当时的下一步前置条件（已由上方全量续审更新）

1. 独立 Contract 任务评审 `CR-20260831-001`；在其仍为 `PROPOSED` 时不得修改 Android/Web/Backend 行为。
2. 若接受，声明 `getOwnActiveExerciseSession` 的空状态 status/schema/error code，提升 Contract 版本并生成新 SHA；不得静默覆盖 `1.0.0-contract`。
3. Android 重新加载新 Contract 后再建立严格内容/空/错误 Mock，并证明 Mock 没有额外字段；学生 Web 在独立 Phase 加载同一版本并统一字段语义。
4. 单独处理起始 HEAD 的 Android unit test 失败；修复后再执行全量 unit、lint、assemble 和必要的 Compose/设备验证。

## P4-DECISION-05 架构一致性清理

| 检查项 | 状态 | 结果 |
|---|---|---|
| 唯一 Contract 基线 | PASS | Version `1.0.0-contract`；Status `RC`；OpenAPI SHA-256 `ff15441b84f0729626a49c6898ea4896e80321b8e873a933768a509fd4c8478f`；metadata 与实际文件一致 |
| 修改前冲突扫描 | PASS | Phase 3 数据设计发现教师 Course 责任移交、删除 blocker、`建立/交接` 和通用 blocker 旧措辞；Phase 3A 模块边界/交接记录发现教师与分管理员职责 blocker 混写 |
| 最小架构清理 | PASS | 只将教师删除与学生/分管理员 blocker 分离；明确不查询 Course 责任、不让 `course-enrollment` 参与、不修改/转移 `responsible_teacher_subject_id`；未重设 Domain、表、模块 Owner 或总体架构 |
| 分管理员规则 | PASS | 分管理员删除前职责移交及其 blocker 保留，未被教师规则清理误删 |
| Contract 完整性 | PASS | `verify_contract.py` 仍为 `109 paths / 120 unique operations / 183 schemas / 66 errors`；OpenAPI SHA 与全 `contracts/` 树摘要在清理前后完全一致 |
| Change Request 门禁 | PASS | `contracts/change-requests/README.md` 已存在；RC 后任何外部行为变化仍要求 CR、版本提升、新 SHA 和下游重新加载 |
| Backend 架构基线引用 | PASS | 架构索引、Phase 3 数据设计、三份 Phase 3A 文档和 Phase 3A handoff 均显式引用当前 Version + Status + SHA；Phase 4 handoff 与本状态继续记录同一基线 |
| 剩余规则冲突 | PASS | 架构复扫未发现任何正向“教师删除前必须交接”或“Course 责任阻止教师删除”规则；所有相关命中均为明确禁止/否定或仍有效的分管理员职责规则 |
| Runtime / 客户端 | NOT EXECUTED | 未修改 Android、Web、Backend Runtime、Mock 或 Contract Test；它们必须在各自后续任务中显式锁定同一 Version + SHA |

详细证据见 [P4-DECISION-05 架构一致性 handoff](../handoffs/phase-4-p4-decision-05-architecture-consistency.md)。

## Phase 4 完成结果

| 检查项 | 状态 | 结果 |
|---|---|---|
| Git 基线 | PASS | 根目录 `C:\Users\23328\Desktop\new_version`；分支 `API-contract-Making`；起始 HEAD `a3c4320303073f72e962a17159d67aeee4bbcf6e`；起始工作区 clean |
| 权威输入 | PASS | 已读取根 `AGENTS.md`、本状态、Phase 1 legacy API inventories、Phase 2/3/3A handoff、Phase 3 Domain/数据库与内部架构设计，以及四份 `docs/business/` 权威；未从旧 API、DTO、Mock 或 ORM 反推 Contract |
| 公开版本 | PASS | 公开基路径固定为 `/api/v1`；仓库 Contract 版本为 `1.0.0-contract`；状态为 `RC` |
| Contract 规模 | PASS | `109` 个 path、`120` 个唯一 operationId、`183` 个 schema、`66` 个集中错误码；完整 Method/Path/角色/权限/资源范围/系统模式/幂等索引已生成 |
| Use Case 覆盖 | PASS | 认证、账号、学期、课程、邀请/入班、成员、名单、Session、媒体、Record/审核、统计、申请/认证、耐力、成绩、反馈、帮助、模式、通知、审计、教师/学生/分管理员和角色 Dashboard 全部覆盖 |
| DTO / Error | PASS | RequestDTO、ResponseDTO、nullable/空数组规则、统一 `ErrorEnvelope`、operation 级 error code 与 HTTP 状态均明确；DTO 不复制数据库表 |
| 权限与认证 | PASS | Bearer 认证、匿名边界、角色、责任教师/本人/组织资源范围、固定八项管理员权限和 maintenance fail-closed 均逐 operation 声明 |
| 分页 / 时间 | PASS | 列表使用绑定 operation 与筛选条件的不透明 keyset cursor；instant 使用 RFC 3339 UTC `Z`，业务日期按 `Asia/Shanghai` 由 Backend 固定 |
| 上传 | PASS | allocation → 直传 → finalize/权威探测 → 正式绑定；Record、申请材料和名单的类型、数量、单文件/总大小、视频时长/音轨和名单行数均进入 Contract |
| 幂等 / 并发 | PASS | 写 Use Case 均声明 UUID `Idempotency-Key` 或天然幂等；重放、reuse conflict、expectedVersion/HTTP 412 明确；原始邀请码只在首次成功及完全相同重放返回，禁止原值持久化、日志和审计 |
| 业务决定 | PASS | 新增 `P4-DECISION-05`：删除教师账号不要求责任教师交接，也不建立交接业务；管理员不得借删除修改/转移责任教师、管理课程或改写课程事实 |
| 教师删除边界 | PASS | `deleteTeacherAccount` 只删除当前账号资料并保留 opaque historical subject；无责任教师交接 Endpoint、无课程责任 blocker、无课程 mutation |
| 数据设计支持 | PASS | Phase 3 数据关系、约束和索引静态支持当前 Contract 查询/事务；真实 PostgreSQL、查询计划、migration 和并发行为未测试 |
| 状态治理 | PASS | `DRAFT / RC / APPROVED / LOCKED` 和 RC 后 Change Request + 版本提升规则已记录；本次只达到 `RC` |
| Backend / 客户端 | NOT EXECUTED | 未修改 Backend、Android 或 Web，未生成 Domain/ORM，未实现任何 Endpoint |

## Phase 4 产物

- [API Contract 使用与治理说明](../../../contracts/README.md)
- [OpenAPI 3.1 协议](../../../contracts/openapi.yaml)
- [operation catalog](../../../contracts/operation-catalog.md)
- [Use Case 覆盖矩阵](../../../contracts/coverage.md)
- [数据库设计支持审计](../../../contracts/database-support.md)
- [Contract metadata 与 SHA-256](../../../contracts/contract-metadata.json)
- [RC Change Request 流程](../../../contracts/change-requests/README.md)
- [Phase 4 handoff](../handoffs/phase-4-api-contract.md)

## Phase 4 验证结果

| 验证 | 真实结果 |
|---|---|
| 确定性生成 | PASS；连续生成的 `openapi.yaml` SHA-256 均为 `ff15441b84f0729626a49c6898ea4896e80321b8e873a933768a509fd4c8478f` |
| Contract 自定义验证 | PASS；`109 paths, 120 unique operations, 183 schemas, 66 error codes`；同时检查唯一 operationId、全部 `$ref`、权限、错误、分页、上传、状态和关键业务边界 |
| OpenAPI lint | PASS；Redocly CLI：`Woohoo! Your API description is valid.`，无 warning |
| RC readiness | PASS；状态为 `RC`，`contracts/decisions/` 下无 `PENDING-*` 决策 |
| 严格 UTF-8 / Python AST / JSON / Markdown link | PASS；Contract 与四份业务文档的文本编码、生成脚本语法、metadata JSON 和相对链接均有效 |
| `git diff --check` | PASS；未发现 whitespace error |
| 业务规则回归扫描 | PASS；没有恢复“教师删除前必须完成责任教师交接”，出现的交接文本均为明确否定；没有交接 operation |
| 修改路径范围 | PASS；只修改 `contracts/`、用户明确授权的四份 `docs/business/`、`docs/rebuild/STATUS.md` 和 `docs/rebuild/handoffs/` |

## Phase 4 规则与接口现状

- 业务规则：**已修改**；只新增并同步 `P4-DECISION-05`，撤销“教师账号删除前必须完成责任教师交接”，以管理员不得修改责任教师或管理课程为准；
- Contract：**已修改**；`1.0.0-contract` / `/api/v1` 已进入 `RC`，其 SHA-256 见 metadata；
- Backend/Android/Web：**未修改、未实现**；当前 Contract 通过不等于真实 Endpoint、客户端迁移或产品验收；
- 数据库：**仅完成静态设计支持审计**；没有创建 migration、schema、seed 或运行中 PostgreSQL；
- 旧 API 引用：**仍存在且未迁移**；继续以 [Android legacy inventory](../inventories/android-legacy-api.md) 和 [Web legacy inventory](../inventories/web-legacy-api.md) 为边界证据，旧调用/DTO 不构成本 Contract 的业务权威；
- Mock/TODO/空接口：现有客户端开发态 Mock 状态未改变；本阶段没有新增 Mock 成功路径、TODO、stub、空 Endpoint 或 Backend Fake Success；Contract 文档中相关词只用于禁止或变更影响说明；
- 设计文本漂移：**已清理**；Phase 3/3A 架构已按 `P4-DECISION-05` 删除正向交接/教师 Course blocker 语义，并增加当前 Contract Version + SHA 基线；Backend 仍不得恢复该 blocker或 Course mutation。

## Phase 4 未执行的产品验证

- Backend build/typecheck/unit/integration、Contract conformance、Domain Error Mapper 和真实 Endpoint：NOT EXECUTED；本轮禁止修改 Backend；
- PostgreSQL migration/constraint/query plan/transaction/RLS/concurrency：NOT EXECUTED；本轮没有数据库实现；
- Android、学生 Web、教师/管理员 Portal 的 generated DTO、transport、Mock 和 UI：NOT EXECUTED；本轮禁止修改客户端；
- 真实 COS 上传、登录、浏览器、Android 设备、跨端 E2E：NOT EXECUTED；没有可供产品验收的 Backend；
- Staging、Production、部署、push、PR、merge、tag 和 release：NOT EXECUTED；`RC` 尚不允许进入 Staging。

## 下游重新加载前置条件

1. Android、学生 Web、教师/管理员 Portal 与 Backend 必须锁定 metadata 中的 `1.0.0-contract` 和 SHA-256，禁止继续从 legacy DTO 或 Mock 推导协议。
2. Backend generated DTO 只能进入 API/Contract Adapter；Domain Error 经集中 API Mapper 转为 Contract Error，ORM/数据库 Row 不得直接暴露。
3. Backend 必须使用已完成 P4-DECISION-05 清理的 Phase 3/3A 架构文档；教师删除不得查询 Course 责任 blocker、调用 Course mutation或转移责任教师。
4. 进入 `RC` 后的任何字段、状态、错误、权限、路径、状态码、描述或行为变化都必须先建立 Change Request、评估三端与 Backend 影响并提升 Contract 版本。
5. Mock 与 Backend 可以按 `RC` 开始实现；只有完成所需 conformance/集成验收并将 Contract 提升到 `APPROVED` 后，才允许进入 Staging。

## 上一阶段 Phase 3A 完成结果

| 检查项 | 状态 | 结果 |
|---|---|---|
| Git 基线 | PASS | 根目录 `C:\Users\23328\Desktop\new_version`；分支 `API-contract-Making`；起始 HEAD `8a6635420542418828093dfceb1da4d0c3e4fa78`；起始工作区 clean |
| 权威输入 | PASS | 已读取根 `AGENTS.md`、本状态、Phase 0B、Phase 2/3 handoff、Phase 3 Domain/数据库设计和四份当前 `docs/business/` 权威；Portal 子目录 `AGENTS.md` 不适用于本轮授权路径 |
| 总体形态 | PASS | 固定为 Modular Monolith + Clean Architecture + DDD Lite + Vertical Slice Delivery；一个部署单元，内部业务模块独占写入，不提前拆微服务 |
| 运行时/编译期方向 | PASS | 运行时明确 Middleware/Guard → API → Application → Domain → Port → Infrastructure；源码固定 `api → application → domain`、`infrastructure → inner Port`、`bootstrap → composition` |
| 层职责 | PASS | API、Application、Domain、Infrastructure、Bootstrap 的允许/禁止项已逐层记录；业务权限、系统模式、事务、审计和错误映射位置明确 |
| 模块边界 | PASS | 17 个业务/支撑模块均有唯一写 Owner；管理员 Actor 不形成跨表万能 `admin` 模块，`admin-governance` 只拥有分管理员治理和固定八项权限 |
| 跨模块协作 | PASS | 模块间生产代码禁止直接 import；消费方 Application Port + `bootstrap/integration` + 提供方公开 Application 能力为同步边界，另允许有版本事件/outbox 和 Owner 公开 Read Model |
| Repository Port | PASS | 统一放 `src/modules/<owner>/application/ports/`；具体实现放 `infrastructure/persistence/repositories/`；Domain 不声明 Repository，禁止按表机械生成 CRUD |
| 模型隔离 | PASS | Contract DTO ↔ API Mapper ↔ Application input/output/Domain ↔ Persistence Mapper ↔ ORM Row 明确隔离；查询 fast path 仍返回 Application Query Result，不泄漏 Row |
| 事务边界 | PASS | 一个顶层写 Use Case 一个明确事务；Application 持有边界，跨模块参与能力加入同一 Unit of Work；成功 mutation + AuditEvent + 已确认站内通知原子提交，外部 I/O 在长事务外 |
| 错误边界 | PASS | Domain Error → Application Error/Result → API Error Mapper → Contract code/status；SQLSTATE、constraint、SQL、stack、object key 和 secret 不向客户端暴露 |
| 目录与测试 | PASS | 只确认 Backend 目录骨架；`tests/architecture/` 的层依赖、模块隔离、Port 位置、模型、shared allowlist、composition、事务、错误、权限/mode 和 read-model 测试方案已固定 |
| Phase 6.0 架构前置 | PASS | 技术栈只能实现当前规则，不能反向覆盖；先建立架构测试再交付首个 Vertical Slice；当前不存在阻塞 Phase 6.0 初始化的层级、Owner、Port、事务或 Mapper 歧义 |
| 代码 / Contract / migration | NOT EXECUTED | 本阶段只新增/更新授权 Markdown；没有初始化 Backend、创建 migration、修改 Contract、Android/Web、Redis、消息队列或微服务 |

## Phase 3A 产物

- [Backend 内部架构蓝图](../../architecture/backend-architecture.md)
- [Backend 模块边界与 Owner](../../architecture/backend-module-boundaries.md)
- [Backend 依赖与架构测试规则](../../architecture/backend-dependency-rules.md)
- [架构文档索引](../../architecture/README.md)
- [Phase 3A handoff](../handoffs/phase-3a-backend-architecture-and-module-boundaries.md)

## Phase 3A 验证结果

| 验证 | 真实结果 |
|---|---|
| 修改路径范围检查 | PASS；仅 `docs/architecture/`、`docs/rebuild/STATUS.md`、`docs/rebuild/handoffs/` 有本轮变化 |
| `git diff --check` + 新文件 whitespace 扫描 | PASS |
| 严格 UTF-8 解码 | PASS；全部本轮 Markdown 可严格解码 |
| Markdown 相对链接检查 | PASS；本轮 Markdown 的本地相对链接目标均存在 |
| Markdown fence/结构检查 | PASS；code fence 成对，三份输出和规定章节齐全 |
| 关键架构规则一致性扫描 | PASS；三份文档统一使用 17 个 Owner 模块、Application Repository Port、模块零直接 import、Application 事务和三模型 Mapper 边界 |
| 禁止事项扫描 | PASS；没有创建 Backend、migration、Contract/client 变化，也没有引入 Redis、MQ、微服务、空接口、TODO 或 Fake Success |

## Phase 3A 规则与接口现状

- 业务规则：**未修改**；四份 `docs/business/` 只读，仍是唯一业务权威；
- Contract：**未修改**；Contract DTO 只被定义为未来 API 边界，不新增字段、路径或版本；
- Backend/数据库：**未实现**；目录骨架只存在于文档，没有创建源码、schema、migration、seed 或运行中资源；
- 旧 API 引用：**仍存在**；本阶段没有迁移、恢复或删除任何 `/api/v1` 调用；
- Mock/Fake/TODO/空接口：现有实现状态未改变；本阶段没有新增 Mock、Fake Success、TODO、占位模块、空接口或空成功响应；
- Redis/MQ/微服务：**未引入**；Outbox 仅作为同一 PostgreSQL 内的可选已批准协作模式，不代表新增外部中间件。

## Phase 3A 未执行的产品验证

- Backend build/typecheck/lint/unit/integration/architecture tests：NOT EXECUTED；尚未初始化正式 Backend 代码或选择技术栈；
- PostgreSQL migration/constraint/transaction/RLS 测试：NOT EXECUTED；本轮无 migration；
- Contract conformance、真实 COS、登录、浏览器、Android、跨端 E2E：NOT EXECUTED；不属于文档阶段；
- Staging、Production、部署、发布、push/PR/tag：NOT EXECUTED。

## Phase 6.0 前置条件

1. 以三份 Phase 3A 文档、Phase 3 Domain/数据库设计和四份当前业务权威共同作为初始化输入；不得从旧 API、DTO、Mock 或框架默认目录反推架构。
2. Contract 必须先在其独立 Phase 完成版本提升和 Backend 加载；Contract 不足时先提交 Contract Change Request，不能在 Backend 内补造 DTO。
3. Phase 6.0 选择的语言、框架、ORM 和架构测试工具必须能执行当前依赖断言；工具限制不能反向改变 Owner、Port、事务或 Mapper 边界。
4. 先创建 `tests/architecture/` 门禁和最小 Composition Root，再按单个 Vertical Slice 建立真实代码；不得一次性生成 17 个空模块。
5. 首个写 Slice 必须同时具备权限/maintenance fail-closed、幂等/并发、事务回滚、Audit/通知、Mapper/错误和真实 PostgreSQL 集成测试。
6. 不得在初始化时引入 Redis、消息队列、微服务、外部 Push、跨模块 Repository 或跨模块表访问。

## 上一阶段 Phase 3 完成结果

| 检查项 | 状态 | 结果 |
|---|---|---|
| Git 基线 | PASS | 根目录 `C:\Users\23328\Desktop\new_version`；分支 `API-contract-Making`；起始 HEAD `30997a5fbf640eda9586c9a0c3fb031a757ecde8`；起始工作区 clean |
| 权威输入 | PASS | 已读取根 `AGENTS.md`、本状态、Phase 0B/Phase 2 handoff 和四份 `docs/business/` 权威；没有从旧 DTO/API/Mock 生成表 |
| P4 输入决定 | PASS | P4-DECISION-01 至 04 已在 Phase 3 内确认：名单 XLSX/CSV、100 MB/500 人；申请 JPEG/PNG/WebP、每申请 3 张/单张 10 MB；最终成绩 INT + 50 字备注；正式记录/媒体/审计保留且注销账号相关数据删除 |
| 上线范围 | PASS | 官方名单、耐力跑、免测、认证、最终成绩、反馈、帮助、维护、分管理员、账号注销、站内通知、正式审计全部进入正式设计 |
| Domain 分层 | PASS | Domain Model、Database Entity、Contract DTO 明确分离；Statistics 等只读投影不作为客户端可写表 |
| 数据关系 | PASS | 当前 LoginAccount/Profile 与不含 PII 的历史 UserSubject 分离；并覆盖权限、学期/Course/Enrollment、名单、Session/Record/Media/Review、耐力、申请/认证、成绩、反馈、帮助、模式、通知和审计 |
| 唯一约束 | PASS | 学号/工号/email/login/invitation、当前学期、Enrollment、进行中 Session、每日 Record、审核 command、规则组合、通知 source 等均有明确数据库保护 |
| 事务边界 | PASS | 账号相关数据删除、Roster snapshot、Record+Media+初始 Review、Application+Evidence+Decision/Credit、FinalGrade、Feedback+Reply、Help+Revision、Mode+公告+站内通知、所有成功 mutation+AuditEvent 均明确原子边界 |
| 文件存储 | PASS | 图片/视频/ZIP 本体在 COS；PostgreSQL 只保存 object key、MIME、bytes、checksum、状态、owner/业务绑定等 metadata；名单源文件解析后丢弃 bytes；签名 URL 不落库 |
| 时间 | PASS | instant 统一 UTC；Session business date 固定为 Backend 接受 start 时 `started_at` 的上海日期 |
| 通知边界 | PASS | 只设计站内通知中心和本人 `read_at`；无短信、邮件、Android/iOS Push、device token、Redis 或消息队列 |
| 安全与审计 | PASS | RLS、最小权限、secret digest、当前账号数据物理删除、opaque 历史主体、不可修改 AuditEvent、同事务审计和脱敏 ZIP 均前置设计 |
| 索引/删除 | PASS | 常用列表、队列、唯一规则、keyset cursor、cleanup worker 均有索引；运动记录、正式媒体和审计保留，账号终止不级联这些历史 |
| 代码 / Contract / migration | NOT EXECUTED | 本阶段只设计并同步权威文档，没有创建正式 Backend、数据库 migration、Contract DTO 或客户端实现 |

## Phase 3 产物

- [Phase 3 Domain 与数据库设计](../../architecture/phase-3-domain-and-database-design.md)
- [架构文档索引](../../architecture/README.md)
- [Phase 3 handoff](../handoffs/phase-3-domain-and-database-design.md)
- [总业务流程](../../business/00-overview.md)
- [学生端业务流程](../../business/10-student-flow.md)
- [教师端业务流程](../../business/20-teacher-flow.md)
- [管理员端业务流程](../../business/30-admin-flow.md)
- [Phase 2 handoff 范围覆盖说明](../handoffs/phase-2-business-truth-and-mvp.md)

## Phase 3 验证结果

| 验证 | 真实结果 |
|---|---|
| `git diff --check` | PASS |
| 严格 UTF-8 解码 | PASS；全部本轮 Markdown 可严格解码 |
| Markdown 相对链接检查 | PASS；本轮 Markdown 的本地链接目标均存在 |
| Fence/结构检查 | PASS；Phase 3 设计 code fence 成对，关键章节和通过条件齐全 |
| 旧排除规则残留扫描 | PASS；当前业务/架构不再把上线能力列为初版排除；Phase 2 handoff 只保留显式标注的历史覆盖说明 |
| 通知边界扫描 | PASS；站内通知明确存在，外部短信/邮件/设备 Push 明确不存在 |
| 核心规则一致性扫描 | PASS；四份业务权威和架构统一使用上海开始日期、VALID Record + 当前认证学时、P4-DECISION-01 至 04 和正式审计 |

## Phase 3 规则与接口现状

- 业务规则：**已修改**；记录正式审计进入上线、Session 按开始时上海日期、完整上线闭集、仅站内通知中心和 P4-DECISION-01 至 04；
- Contract：**未修改**；下一阶段只能从当前业务权威与 Phase 3 设计生成并提升版本；
- 数据库：**仅设计，未实现**；没有 migration、schema、seed 或运行中 PostgreSQL 变化；
- 旧 API 引用：**仍存在**；本阶段没有迁移或删除现有 `/api/v1` 调用；
- Mock/Fake：现有开发态 Mock 仍不构成业务权威；本阶段没有新增空表、空接口、TODO、占位状态或 Fake Success；
- Redis/MQ/外部 Push：**未引入**。

## Phase 3 未执行的产品验证

- 构建、单元测试、浏览器和设备测试：NOT EXECUTED；本轮只修改 Markdown 设计；
- PostgreSQL migration/constraint/transaction/RLS 测试：NOT EXECUTED；尚无正式实现；
- 真实 COS 上传、探测、绑定、回滚和清理：NOT EXECUTED；尚无 Backend；
- 真实登录、跨端 E2E、Staging、Production、部署和发布：NOT EXECUTED；
- Contract 生成、版本提升和下游重新加载：NOT EXECUTED，属于 Phase 4。

## Phase 4 前置条件

1. 以四份当前业务权威和 Phase 3 设计生成 Contract，不从旧 DTO、旧 API 或 Mock 反推字段。
2. Contract 覆盖完整上线闭集、expected version、command id、稳定错误、keyset cursor 和文件 allocation/finalization。
3. Contract 必须原样落实已确认的名单 XLSX/CSV + 100 MB/500 人、申请 JPEG/PNG/WebP + 每申请 3 张/单张 10 MB、FinalGrade int32 + remark maxLength 50，以及账号数据删除/历史保留语义；不得另行猜测或改成 Record 限制。
4. 提升 Contract 版本，并让 Backend、Android、学生 Web、教师 Web 和管理员 Web 明确重新加载。
5. Contract 不足时提交 Change Request；不得先建 Backend 空成功接口或数据库占位状态。

## 上一阶段 Phase 2 完成结果

| 检查项 | 状态 | 结果 |
|---|---|---|
| Git 基线 | PASS | 根目录 `C:\Users\23328\Desktop\new_version`；分支 `API-contract-Making`；起始 HEAD `4e6bb9a1dc615b7b59089e58797d1e923f12d416`；起始工作区 clean |
| 业务权威 | PASS | 仅更新四份 `docs/business/` 权威文档；建立 `ACCEPTED`、`PENDING`、`REJECTED` 状态语义和 Phase 2 决策登记 |
| 角色权限 | PASS | 管理员负责当前学期和教师账号前置；教师创建、管理和审核本人班级并生成邀请码；学生只能通过有效邀请码加入且不能自行创建或自由选择班级 |
| 核心状态机 | PASS | Session 为 `ACTIVE ↔ PAUSED → COMPLETED`；正式 Record 提交即默认 `VALID`，当前审核结果通过追加记录在 `VALID ↔ INVALID` 间变化；不存在正式 Draft/Submitted/Approved/Rejected/重提链 |
| 运动时长 | PASS | Backend 累计全部 `ACTIVE` 区间并完全排除 `PAUSED`；正式实际运动时长与 0/60/120 分钟计入有效学时明确分离 |
| 媒体边界 | PASS | 照片 0–6 张、视频 0–1 段且合计至少一项；JPEG/PNG 单张 ≤10 MB，MP4 1–15 秒且含音轨、单段 ≤100 MB；单条 Record 合计 ≤250 MB；客户端预检且 Backend 权威复检 |
| 统计口径 | PASS | MVP 只累计当前为 `VALID` 的 Record；每名学生按类别独立累计并按类别目标封顶后求和；完成率封顶 100%，UI 四舍五入整数展示，业务判断使用原始分钟 |
| 初版范围 | PASS | 使用闭集 MVP；只纳入登录、学期/教师账号前置、教师建班和邀请码、学生入班、运动、媒体、提交、教师复核、结果查看和有效学时统计 |
| 阻塞性歧义 | PASS | Phase 2 决策登记不存在阻塞性业务 `PENDING`；核心闭环满足进入数据库与 Contract 设计的业务前置条件 |
| 代码 / Contract / 数据库 | NOT EXECUTED | 本阶段按授权只确认和修改业务文档，没有修改实现代码、Contract 或数据库 |

## Phase 2 验证结果

| 验证 | 真实结果 |
|---|---|
| Phase 2 决策状态扫描 | PASS；12 项 `ACCEPTED`、3 项 `REJECTED`，无 Phase 2 `PENDING` 决策 |
| 计时与统计一致性扫描 | PASS；四端文档统一使用 Backend `ACTIVE` 累计、`PAUSED` 排除、0/60/120 分档、`VALID` 统计和原始分钟判断 |
| 媒体一致性扫描 | PASS；总览、学生和教师文档统一数量、JPEG/PNG/MP4、10/100/250 MB 与 Backend 权威复检规则 |
| MVP 权限与范围扫描 | PASS；管理员、责任教师、学生职责及初版排除项已显式记录 |
| `git diff --check` | PASS |

## Phase 2 规则与接口现状

- 业务规则：**已修改**；增加 Phase 2 决策登记、闭集 MVP、显式状态机、Backend 权威计时、媒体限制和统计公式；
- Contract：**未修改**；后续只能从 `ACCEPTED` 决策生成，不得从旧 API、Mock 或客户端 DTO 推导；
- 数据库：**未修改**；正式实际运动时长、分档后的计入有效学时和当前审核结果必须作为不同业务概念建模；
- 旧 API 引用：**仍存在**；本阶段没有迁移或删除现有 `/api/v1` 调用；
- Mock/Fake：现有开发态 Mock 不构成业务权威，也不属于初版正式成功路径；本阶段未修改实现；
- TODO、空接口：本阶段未做代码实现审计，也未新增 Backend Fake Success 或空成功接口。

## Phase 2 未执行的产品验证

- 未执行构建、单元测试、浏览器或设备测试；本轮只修改 Markdown 业务规则；
- 未执行真实登录、Backend、媒体上传、数据库、跨端 E2E、Staging、Production、部署或发布；
- 未执行 Contract 生成、版本提升或客户端重新加载；这些属于后续阶段。

## Phase 2 详细产物

- [总业务流程与 Phase 2 决策登记](../../business/00-overview.md)
- [学生端业务流程](../../business/10-student-flow.md)
- [教师端业务流程](../../business/20-teacher-flow.md)
- [管理员端业务流程](../../business/30-admin-flow.md)
- [Phase 2 业务真相与初版 MVP handoff](../handoffs/phase-2-business-truth-and-mvp.md)

## Phase 2 当时记录的 Phase 3 前置条件（已覆盖）

原 Phase 2 的核心时长、Record、Review 和媒体前置已经被本轮吸收；原“初版排除”已由业务负责人撤销，不再是有效限制。当前下一阶段条件以上方“Phase 4 前置条件”为准。

## 上一轮 Portal 跟进结果

| 检查项 | 状态 | 结果 |
|---|---|---|
| Git 基线 | PASS | 根目录 `C:\Users\23328\Desktop\new_version`；分支 `API-contract-Making`；起始 HEAD `0f4d1272886e5cbb355eedbb3daa1ee4595cdd5d`；起始工作区 clean |
| 业务权威 | PASS | 教师与管理员找回密码只要求已验证学校邮箱，不要求用户输入组织代码 |
| 找回密码 UI | PASS | 中英文页面已删除“学校组织代码”输入、校验、错误映射和文案；邮箱成为首个焦点输入 |
| 请求边界 | PASS | 未登录找回由 API Client 注入 `NEXT_PUBLIC_BNBU_ORGANIZATION_CODE`，当前 BNBU 部署默认为 `BNBU`；已登录改密继续优先使用 `/organizations/current` 返回的组织代码 |
| Contract / Backend / Android | PASS | 均未修改；现有 Contract 仍要求 `organizationCode`，但该 DTO 字段已从页面表单收口到 API Client 传输边界 |
| Portal 验证 | PASS | `typecheck` 通过；`lint` 0 error / 5 条既有 warning；定向回归 31/31；完整 `npm test` 90/90；production build 成功 |
| 浏览器验证 | PASS | `http://127.0.0.1:4300/` 中英文找回页组织代码输入/文字均为 0；布局正常；console warning/error 为 0 |

## 上一轮 Web 上线树清理结果

| 检查项 | 状态 | 结果 |
|---|---|---|
| Git 基线 | PASS | 根目录 `C:\Users\23328\Desktop\new_version`；分支 `API-contract-Making`；起始 HEAD `7bcf8da772f2538629103ac44c0084612cf6afb6`；起始工作区 clean |
| 历史文件清理 | PASS | 从当前 Web 树删除 57 个跟踪文件：旧数据库、联调/造数 helper、历史产品/计划/验收材料、旧业务口径、Portal 模板/死代码和学生旧测试入口 |
| 学生 Test Tools | PASS | 删除 `TEST_TOOLS_ENABLED` public runtime、capability probe、internal advance-duration Client、运行时状态、`test-tools.js` 与相关 smoke 覆盖 |
| 学生旧 Mock | PASS | 删除 `MOCK_INVITES` 和只供 smoke 使用的免测预览资源；正式邀请码、申请、运动和工作区继续只走现有真实 API Client |
| Portal 无关模板 | PASS | 删除 D1/Drizzle 示例、配置、binding 类型与依赖；删除 ChatGPT auth starter、退役 ticket workspace、空 roster engine 和未使用 re-export facade |
| Portal Demo/正式 UI | PASS | 未删除 `admin-mock-data`、teacher/admin/roster demo adapter 或共用页面；Demo 与 real 继续复用同一页面结构 |
| 学生容器发布面 | PASS | `Dockerfile.local` 改为只复制 preview server 和学生 `index/assets/css/js`；README、smoke、runtime test 与 student package metadata 不再进入该镜像层 |
| 文档权威边界 | PASS | Web README 改指 `docs/business/` 与 `docs/rebuild/inventories/web-legacy-api.md`；Phase 1B inventory 已回填本轮删除结果 |
| 敏感 seed | ACTION REQUIRED | 含硬编码远程数据库凭据的旧 seed 已删除；凭据仍存在于 Git 历史，必须在数据库侧轮换。未执行历史重写 |
| 部署链路选择 | PENDING | `.github/workflows/pages.yml` 仍会发布整个 `frontend/`；Cloudflare/Sites 与 Docker 链路均保留。正式部署目标尚未由用户选择，本轮未越权删除任一链路 |
| Contract / Backend / Android | PASS | `contracts/`、当前 `BNBU-Sports-Backend/`、`BNBU-ANDROID/` 与四份 `docs/business/` 均未修改 |

## 上一轮验证结果

| 命令 | 真实结果 |
|---|---|
| `npm run test:web`（Web root） | PASS；public runtime config checks，退出码 0 |
| `npm run test:student`（Web root） | PASS；79/79 checks，退出码 0 |
| `npm run typecheck`（Portal） | PASS；Contract snapshot verify、generated `--check`、两个 TypeScript project 均通过 |
| `npm run lint`（Portal） | PASS；0 error，5 条 `admin-service.ts` 既有 unused warning，退出码 0 |
| `npm test`（Portal） | PASS；vinext production build 完成，89/89 tests，退出码 0；保留 chunk > 500 kB 和 route classification 警告 |
| 全树残留扫描 | PASS；当前 Web 代码无已删除 Test Tools、D1/Drizzle、旧 Mock 邀请或被删文件引用；Phase 1B 历史证据已标记“已删除” |
| `git diff --check` | PASS |
| `docker build --check --file Dockerfile.local .` | NOT EXECUTED；Docker Desktop Linux daemon 未运行，无法连接本机 named pipe |

## 上一轮规则与接口现状

- 业务规则：**未修改**；旧 `业务流程审2.md` 已删除，权威仍只有四份 `docs/business/`；
- Contract：**未修改**。Portal `3.0.0-web-snapshot` 及 generated types 仍是现有构建依赖，不是新权威 Contract；
- 旧 API 引用：**仍存在**。学生、教师和管理员真实业务请求仍使用旧 `/api/v1` Client/DTO；本轮只删除 Test Tools 和确定无调用边界；
- Mock/Fake：学生旧 synthetic/Fake/Test Tools/邀请 fixture 已删除；Portal development-only demo/admin/teacher/roster Mock 有意保留并继续与正式模式共用 UI；
- TODO、空接口：本轮未新增 TODO、空成功接口或 Backend Fake Success；管理员正式耐力规则写入仍因 Contract 缺口 fail closed 为 `BACKEND_REQUIRED`；
- Android 与 Web：Android 测试开关属于独立技术栈，本轮只读未修改；Web Test Tools 已从运行链路删除。

## 上一轮未执行的产品验证

- Dockerfile 实际镜像构建：NOT EXECUTED；本机 Docker daemon 未运行；
- 浏览器人工回归、真实账号登录、真实 Backend、数据库、跨端 E2E、Staging、Production、部署与发布：NOT EXECUTED；
- GitHub Pages 与 Cloudflare/Sites/Docker 正式目标切换：NOT EXECUTED；需要用户先确定唯一发布路径；
- 数据库凭据轮换和 Git 历史清理：NOT EXECUTED；前者需外部数据库权限，后者属于破坏性仓库操作，均未获得本轮授权。

## 详细产物

- [Web 旧 API 审计及处置回填](../inventories/web-legacy-api.md)
- [Phase 2 Web 边界清理 handoff](../handoffs/phase-2-web-boundary-cleanup.md)
- [Phase 2 Web 上线树清理 handoff](../handoffs/phase-2-web-release-tree-cleanup.md)
- [Phase 2 Portal 找回密码组织代码移除 handoff](../handoffs/phase-2-portal-recovery-organization-code-removal.md)

## 上一轮遗留前置条件

1. 立即在数据库侧轮换旧 seed 暴露的远程凭据；不要把删除文件当作凭据失效证明。
2. 明确正式部署目标：Docker/host Nginx、GitHub Pages 或 Cloudflare/Sites；随后删除或收敛其余发布链路，并验证最终 artifact 清单。
3. Docker daemon 可用后执行 `docker build --check --file Dockerfile.local .`，并构建 `student` / `student-staging` target 核对镜像内容。
4. 新 Contract 明确管理员耐力规则写接口和免测材料统一 route 后，再迁移其余 `/api/v1` 请求；不得从冻结 snapshot 或旧 Client 推导业务规则。
5. 进入 Staging 前完成真实登录、浏览器 hydration/console、角色菜单、Backend、数据库与跨端 E2E 验收。
