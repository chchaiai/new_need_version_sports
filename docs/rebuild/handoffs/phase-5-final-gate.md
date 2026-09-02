# Phase 5 Final Gate Review

> 日期：2026-09-01（Asia/Shanghai）
>
> 审查类型：`Review / Verify / Close`
>
> 最终结论：`Phase 5 Final Gate = BLOCKED`
>
> Phase 5 状态：**不得标记 `FINAL DONE`**
>
> Phase 6.0 Backend Foundation：**NOT AUTHORIZED**

## 0. 结论先行

业务规则、Phase 3 Domain/Database Design、Phase 3A Backend Architecture、CertificationKind/Password alignment、Android 5G-A 与 Web 5G-B 的既有验证证据均保持稳定。当前 Contract 文件也仍精确为：

```text
Version: 1.2.0-contract
Status: RC
SHA-256: 667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a
```

现场 OpenAPI parse、Contract verify、RC readiness、Redocly lint、operationId、`$ref`、Schema、ErrorCode/HTTP exact-set、metadata/SHA、deterministic generation、strict UTF-8/JSON 与 whitespace gate 均通过。

但 Final Gate 对 Phase 5G-B 留下的 discriminator finding 做独立复核后，不能证明其只是非阻塞客户端/tooling 问题：当前 OpenAPI 的全部 3 组 discriminator 都没有 explicit mapping，且 branch wire const 与隐式 schema-name key 不同。`openapi-typescript 7.13.0` 已可复现地产生 schema-name literal；现有 Student wire adapter 只隔离认证创建 validation 链，不能覆盖另外两组 union 或未来 Backend/codegen。

因此已按本阶段唯一允许的例外建立 [CR-20260901-005](../../../contracts/change-requests/CR-20260901-005-explicit-discriminator-mappings.md)：`PROPOSED / BLOCKING`。本轮没有修改 OpenAPI、metadata、Version、SHA 或任何 Android/Web/Backend 产品源码。

## 1. Phase 开始报告

```text
当前 Git 根目录：C:/Users/23328/Desktop/new_version
当前分支：API-contract-Making
HEAD Commit：40f6ae59b6d71d069442f015de5320c2cbc6e258
git status：clean；## API-contract-Making
当前读取的 AGENTS.md：根 AGENTS.md；BNBU-Sports-Web-new/portal-teacher-admin/AGENTS.md
当前 Phase：Phase 5 Final Gate
本轮允许修改：docs/rebuild/STATUS.md、docs/rebuild/handoffs/phase-5-final-gate.md；如发现真正阻塞问题，仅允许新增 PROPOSED CR
本轮禁止修改：docs/business/**、contracts/openapi.yaml、Contract metadata/version/SHA、Android/Web 产品源码、Backend、数据库/migration、Legacy API，以及其他未授权路径
完成标准：逐项现场核验全部 Final Gate；只有全部 PASS 才可标记 Phase 5 FINAL DONE，否则如实 BLOCKED
```

Portal 嵌套 AGENTS.md 的自动 archive 规则被本轮用户明确的 `不得 Commit` 覆盖；本轮未 commit。

## 2. 读取的权威输入

- 根 `AGENTS.md` 与 Portal 嵌套 `AGENTS.md`；
- `docs/rebuild/STATUS.md`；
- 四份 Phase 2 业务权威与 Phase 2 final handoff；
- Phase 3 handoff 与当前 Domain/Database Design；
- Phase 3A handoff、Backend Architecture、Module Boundaries、Dependency Rules；
- Phase 5C.2 Final Contract Consolidation handoff；
- Phase 5E Business Decision Closure handoff；
- Phase 5F Contract ↔ Domain/Database Alignment handoff；
- Phase 5G-A、Phase 5G-B 最终 handoff；
- Phase 5D-A / 5D-B Full Contract Surface Audit 与 Android/Web Legacy Migration Findings；
- 当前全部 CR、Contract metadata、OpenAPI、Contract validation scripts/config；
- Phase 5G-A/B 当前 binding、generated declarations 与 affected tests。

## 3. Git / Workspace Gate

| 检查 | 结果 | 证据 |
|---|---|---|
| Git root / branch / HEAD | PASS | `C:/Users/23328/Desktop/new_version` / `API-contract-Making` / `40f6ae59b6d71d069442f015de5320c2cbc6e258` |
| 起始 status | PASS | clean；仅 `## API-contract-Making` |
| 5G-A 产物 | PASS | parent commit `6eb4918` 的 Android validation-only build/test/handoff/STATUS 产物均存在且 tracked |
| 5G-B 产物 | PASS | HEAD `40f6ae5` 的 Student/Portal binding、fixture/test/UI/handoff/STATUS 产物均存在且 tracked |
| 并发路径 | PASS | 两组 commit 只在 `docs/rebuild/STATUS.md` 发生共享路径；最终 HEAD 同时包含两组产品验证产物 |
| 覆盖 / 丢失 / 冲突 | PASS | 未发现关键 Phase 5 产物缺失、冲突标记或被后续 commit 回退 |
| Contract tracked state | PASS | `contracts/openapi.yaml` 与 metadata 保持 HEAD tracked blob，Version/SHA 未漂移 |
| 既存 stale 说明 | NON-BLOCKING DOC FINDING | `contracts/README.md` 仍保留 Phase 5C.2 时点的“CertificationKind alignment 尚未实施”句子；Phase 5F 当前设计与 STATUS 已证明其完成。该句不是并发覆盖、协议内容或运行时漂移，本轮按禁止修改 Contract 文档边界未改 |

本轮结束前工作树只应包含 Final Gate 的 CR/STATUS/handoff 记录；没有自动清理、stash、commit、push、merge、rebase 或 tag。

## 4. Business Gate

| 项目 | 结果 |
|---|---|
| `NEEDS_BUSINESS_DECISION` | **0** |
| Teacher Dashboard “需要关注的打卡记录” | `DASH-A ACCEPTED`；已删除，不重新定义集合/数量/下钻 |
| Teacher/Admin password lifecycle | `PWD-POLICY-A + PWD-FIRST-B + PWD-ADMIN-B ACCEPTED` |
| 总管理员代设最终个人密码 | 禁止；只能本人改密或 verified-email self reset |
| temporary password / `mustChangePassword` | 已接受且 Contract 已落实 |
| Student Dashboard current semester | 保持 CR-004 最终结论；合法 Student actor 无 no-current success 状态，不修改 OpenAPI |
| CertificationKind | `SCHOOL_TEAM / STUDENT_CLUB`；无新业务歧义 |

自动扫描只命中业务文档中的 `PENDING` 术语定义，没有实际 PENDING decision row。Final Gate 未重新打开任何 ACCEPTED/REJECTED 决定。

## 5. Contract CR Gate

| CR | 状态 | Final Gate 判断 |
|---|---|---|
| `CR-20260901-002-password-contract.md` | ACCEPTED / 已落实 | PASS |
| `CR-20260901-003-certification-kind-round-trip.md` | ACCEPTED / 已落实 | PASS |
| `CR-20260901-004-student-dashboard-no-current-semester.md` | REJECTED / NOT_CONTRACT_DEFECT | PASS；未进入 OpenAPI |
| `CR-20260901-005-explicit-discriminator-mappings.md` | **PROPOSED / BLOCKING** | **BLOCKED** |

当前 17 个正式 CR：14 ACCEPTED、2 REJECTED/NOT_CONTRACT_DEFECT、1 PROPOSED/BLOCKING。最终计数：

```text
Blocking Contract CR = 1
PROPOSED Blocking CR = 1
NEEDS_BUSINESS_DECISION CR = 0
```

Final Gate 开始时 Blocking CR 为 0；上述 1 项来自本轮独立验证发现，并非遗留状态漏报。

## 6. Contract Version / SHA 与质量门禁

### 6.1 固定基线

| 检查 | 真实结果 |
|---|---|
| OpenAPI header | `1.2.0-contract` / `RC` |
| metadata | `1.2.0-contract` / `RC` / `/api/v1` |
| metadata SHA | `667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a` |
| actual `Get-FileHash` | 精确同上 |
| metadata inventory | 109 paths / 121 operations / 193 schemas / 66 error codes |
| Contract drift | 0；CR-005 只建立提案文件，不修改 Contract source/metadata |

### 6.2 现场执行结果

| 门禁 | 真实结果 |
|---|---|
| OpenAPI parse | PASS |
| `python contracts/scripts/verify_contract.py` | PASS；109 paths / 121 unique operations / 193 schemas / 66 error codes |
| `python contracts/scripts/check_rc_readiness.py` | PASS；无 PENDING、状态 RC+ |
| Redocly `2.49.0` lint | PASS；API description valid |
| operationId uniqueness | PASS；121 / 121 unique |
| `$ref` integrity | PASS；1426 local refs，missing 0 |
| Schema integrity | PASS；193 schemas，Draft 2020-12 meta-schema errors 0 |
| ErrorCode / HTTP status exact-set | PASS；catalog/enum 66，operation unknown codes 0，status mismatches 0 |
| metadata / SHA / counts | PASS |
| deterministic generation | PASS；连续两次 build 后 OpenAPI/catalog/metadata byte-identical |
| strict UTF-8 | PASS |
| JSON validation | PASS |
| `git diff --check` | PASS |
| discriminator semantic integrity | **FAIL；3 discriminator / 3 implicit-mapping mismatches** |

普通 parse/lint/schema validation 通过不抵消 discriminator 失败：`oneOf + const` 可完成 JSON Schema validation，但 OpenAPI discriminator 还参与 serialization/deserialization/codegen 分支选择。

## 7. Web Codegen Discriminator Finding

### 7.1 当前 Contract 的三组不一致

| Discriminator | wire 值 | implicit schema-name key | explicit mapping |
|---|---|---|---|
| `CreateStudentApplicationRequest.applicationType` | `EXEMPTION / CERTIFICATION` | `CreateExemptionApplicationRequest / CreateCertificationApplicationRequest` | 无 |
| `ReviseEnduranceRuleTableRequest.change.action` | `ADD / UPDATE / DELETE` | `Add... / Update... / DeleteEnduranceRuleIntervalChange` | 无 |
| `SwitchSystemModeRequest.targetMode` | `MAINTENANCE / NORMAL` | `EnterMaintenanceRequest / ReturnNormalRequest` | 无 |

OpenAPI 3.1.0 规定 discriminator 值默认对应 schema 名；wire 值与 schema 名不同时可用 mapping，若既不命中隐式也不命中显式 mapping，则无法确定 schema，validation 应失败。当前三个 discriminator 都命中这个条件。

### 7.2 可复现影响

- `openapi-typescript 7.13.0` 的两份确定性 generated declarations 均产生 schema-name literal，例如 `applicationType: "CreateCertificationApplicationRequest"`、`targetMode: "EnterMaintenanceRequest"`、`action: "AddEnduranceRuleIntervalChange"`。
- Phase 5G-B Student wire adapter 强制发送 `applicationType: "CERTIFICATION"`，因此当前 affected fixture 没有 silent data corruption 或 Fake Success；13/13 test 现场仍 PASS。
- 该 adapter 不覆盖 endurance/system-mode union，也不属于未来 Backend Contract Adapter。它证明“当前隔离链正确”，不能证明“根 Contract 对所有生成器正确”。
- Android 现场 targeted generation/test PASS，但 generator 输出 OpenAPI 3.1 / `oneOf` 处理警告。一个生成器成功、另一个生成错误类型，正说明当前 Contract 不是稳定的跨工具实现基线。

### 7.3 Final classification

```text
原 5G-B 分类：CLIENT_DEFECT / TOOLING_LIMITATION，wire adapter contained
Final Gate 分类：CONTRACT INTEROPERABILITY DEFECT
Blocking：YES
silent data corruption：当前 affected Web fixture 未发生
Fake Success：当前 affected Web fixture 未发生
新增业务决定：不需要
修复授权：本轮没有；仅建立 PROPOSED CR-005
```

因此无法满足“不会影响未来 Backend 根据 Contract 实现”的证明要求，Section 11 必须判 `BLOCKED`。

## 8. Contract ↔ Domain ↔ Database Gate

### 8.1 CertificationKind

| 层 | 当前设计 | 结果 |
|---|---|---|
| Contract | `CertificationKind` 精确 `SCHOOL_TEAM / STUDENT_CLUB`；required/non-null | PASS |
| Domain | `applications-certification` 自有 closed enum；不依赖 generated Contract enum | PASS (DESIGN) |
| Domain detail | immutable `CertificationApplicationDetail` 明确保留 kind | PASS (DESIGN) |
| Database Design | `certification_application_detail.certification_kind text NOT NULL CHECK IN (...)` | PASS (DESIGN) |
| Mapper | Contract → API Mapper → Domain → Persistence Mapper → row，反向同样穷尽 | PASS (DESIGN) |
| 禁止项 | 无名称推断、UNKNOWN、default、silent fallback | PASS |

结论：`PASS (DESIGN)`；Domain/Contract drift = 0，Database/Contract drift = 0。仓库没有已验收数据库 runtime；未来发现既有认证行仍需 `DATA_MIGRATION_DECISION_REQUIRED`。

### 8.2 Password

当前 Phase 3/5F 已覆盖 `mustChangePassword`、credential/session `passwordVersion`、`ACTIVE/DISABLED accessState`、`ACCOUNT_DISABLED`、current/other/all session revoke、self change、self reset、anti-enumeration、challenge digest/expiry/attempt/consume lifecycle 与 safe audit。

结论：`CURRENT DESIGN SUFFICIENT`。本轮没有新增表、列、migration、password policy、ErrorCode、Redis/MQ 或设计。

## 9. Backend Architecture Gate

Phase 3A 仍是当前 Backend 实现权威：

```text
API / Presentation
→ Application
→ Domain
→ Repository / External Port
→ Infrastructure Adapter
→ PostgreSQL / External Services
```

静态架构结论：

- Domain 不依赖 OpenAPI DTO、ORM、HTTP 或框架；
- Application 不依赖 Controller / ORM Entity；
- API 不直接访问数据库；
- Repository Port 位于 Application boundary，implementation 位于 Infrastructure；
- Contract DTO / Application / Domain / Persistence models 隔离；API Mapper 与 Persistence Mapper 分离；
- 17 个模块 ownership 与禁止生产跨模块直接 import 规则明确；
- 顶层 write Application Handler 持有 transaction；业务 mutation、audit/outbox 同事务，Repository 不 commit。

架构本身：`PASS (DESIGN)`。但根 Contract discriminator blocker 尚未关闭，因此不能授权 Composition Root / Backend Foundation 开始消费该 RC。

## 10. Android Gate

Phase 5G-A committed handoff 与当前产物确认：

- 状态 `PASS`，binding 精确为 1.2.0 + 固定 SHA；
- `CertificationKind` 两值正确，request 2/2、response 7/7、round-trip PASS；
- invalid request/response 14/14 rejected；generated Kotlin compile 与 deterministic generation PASS；
- committed evidence：定向 4/4、Phase 5A 9/9、全量 unit 341/341、lint 0 error、assembleDebug PASS；
- Final Gate 现场复跑 binding + generation/model verification + Phase 5G-A targeted test：`BUILD SUCCESSFUL`；
- connected-device：`NOT EXECUTED`，符合 validation-only 边界；
- 正式 Android runtime：旧 snapshot/transport 仍存在，`REMAINS / NOT MIGRATED`；
- Phase 5G-A 自身新增 Blocking CR 0、NBD 0。

Android 5G-A Gate：`PASS`。Android generator 当前成功不清除跨工具 discriminator blocker。

## 11. Web Gate

Phase 5G-B committed handoff 与当前产物确认：

- 状态 `PASS`，Student/Portal binding 均精确 1.2.0 + 固定 SHA；
- CertificationKind 两值、7/7 response surface、round-trip PASS；
- Teacher/Admin password gate、45/45 gated、10/10 gate-safe、change/reset/disabled/session、temporary sub-admin、UpdateSubAdmin password fields 0、private password rules 0 全部 PASS；
- committed evidence：typecheck、5G-B 13/13、Portal 125/125、Student 79/79、lint 0 error、production build、hydrated affected browser validation PASS；
- Final Gate 现场复跑双端 binding/codegen `--check` 与 affected tests：PASS / 13 of 13；
- 正式 Web runtime：24-bundle legacy boundary 仍存在，`REMAINS / NOT MIGRATED`；
- Phase 5G-B 当时新增 Contract CR 0、NBD 0。

Web 5G-B validation Gate：`PASS`。但其 codegen finding 的 `NON-BLOCKING` 归类未通过 Final Gate 独立复核，所以 Client Findings / Contract Validation / Phase 6 readiness 仍为 `BLOCKED`。

## 12. Legacy Migration 与其他 Client/UI Findings

| 项目 | Final Gate 结论 |
|---|---|
| Android legacy | 6 个 full-audit bundle / 更早细项 inventory 均有归属；正式 runtime 未迁移 |
| Web legacy | 24 个 bundle；正式 121-operation runtime 未迁移 |
| 是否误判为 Contract defect | 否；已撤销、DEV_ONLY、本地能力与旧 DTO 不反推新 Contract |
| 是否偷偷迁移 | 否；5G 只做 validation-only binding/affected evidence |
| 后续归属 | Android Phase 7A / Web Phase 7B |
| 其余 Client Defect / UI Finding | 已分类，按后续客户端 migration/product slice 处理；不要求 Phase 5 清零 |
| Tooling finding | discriminator finding 已重新分类为 blocking Contract interoperability defect；其余没有发现影响 Backend 协议确定性的隐藏项 |
| Mock / Fake Success | 既有 validation Mock/demo/simulated scan 等仍存在且边界已记录；本轮未新增；不得作为 Backend/runtime 验收 |

Legacy Migration Classification Gate：`PASS`。Legacy API = `REMAINS / NOT MIGRATED` 不是 Phase 5 失败原因。

## 13. Backend / Database Runtime 状态

以下全部仍为 `NOT EXECUTED`：

- Backend runtime；
- PostgreSQL runtime；
- database migration；
- COS；
- Contract conformance runtime；
- cross-client E2E；
- Staging；
- Production / deployment。

静态 Domain/DB/Architecture PASS 没有被描述为真实 Backend/PostgreSQL PASS。这些未执行项本来不阻塞 Phase 5；当前 blocker 是 Contract discriminator interoperability。

## 14. Final Gate Matrix

| Gate | 结果 | 证据 |
|---|---|---|
| Business | PASS | 两项 P5E NBD 已 ACCEPTED；Teacher card、password lifecycle、CR-004、CertificationKind 一致；NBD=0 |
| Domain | PASS | Certification closed Domain enum/detail；Password current design sufficient |
| Database Design | PASS | non-null closed-set `certification_kind`；password credential/session/challenge design 足够 |
| Backend Architecture | PASS | Phase 3A 分层、ports、三模型、mapping、transaction/module rules 明确 |
| Contract Version/SHA | PASS | metadata/header/actual hash 精确为 1.2.0-contract / RC / frozen SHA |
| Contract Validation | **BLOCKED** | 标准 parse/verify/readiness/lint/ref/schema/error/determinism 全 PASS；discriminator integrity 3/3 FAIL |
| Contract CR | **BLOCKED** | CR-002/003 implemented、CR-004 rejected；新增 CR-005 PROPOSED/BLOCKING，Blocking CR=1 |
| Android 5G-A | PASS | fixed binding、2 kinds、7/7、round-trip、14/14 reject、compile/determinism/unit/lint/assemble evidence |
| Web 5G-B | PASS | fixed binding、Certification/Password/gates/type/unit/lint/build/browser evidence；现场 13/13 |
| Client Findings | **BLOCKED** | 其余 finding 已分类；discriminator 无法证明为 non-blocking client/tooling-only |
| Legacy Migration Classification | PASS | Android/Web bundles 明确；remains/not migrated；Phase 7A/7B ownership |
| Phase 6.0 Readiness | **BLOCKED** | Business/Domain/DB/Architecture/client validation 稳定，但 Contract interoperability + Blocking CR 未关闭 |

## 15. 最终必报项

| # | 项目 | 结果 |
|---:|---|---|
| 1 | Phase 5 Final Gate | `BLOCKED` |
| 2 | 当前 branch | `API-contract-Making` |
| 3 | 当前 HEAD | `40f6ae59b6d71d069442f015de5320c2cbc6e258` |
| 4 | Git status | 起始 clean；结束只含本轮 CR/STATUS/handoff 未提交修改 |
| 5 | 并发工作覆盖 | 未发现关键产物覆盖/丢失/冲突；两组 5G 产物均在 HEAD |
| 6 | Contract Version | `1.2.0-contract` / `RC` |
| 7 | Contract SHA | `667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a`，metadata/header/actual 一致 |
| 8 | Contract verify | PASS；109/121/193/66 |
| 9 | RC readiness | PASS |
| 10 | Redocly lint | PASS |
| 11 | Blocking CR | **1**；CR-005 PROPOSED/BLOCKING |
| 12 | NEEDS_BUSINESS_DECISION | **0** |
| 13 | Phase 5G-A | PASS |
| 14 | Phase 5G-B | PASS（validation evidence）；其 discriminator 最终分类不通过 |
| 15 | Certification alignment | PASS (DESIGN) |
| 16 | Password alignment | CURRENT DESIGN SUFFICIENT |
| 17 | Backend Architecture readiness | PASS (DESIGN)，但不得越过 Contract blocker 开工 |
| 18 | Legacy Migration | `REMAINS / NOT MIGRATED`；Phase 7A/7B |
| 19 | Client/tooling blocking | **存在 1 项**；已重分类为 Contract interoperability blocker |
| 20 | Backend/PostgreSQL/E2E | 全部 NOT EXECUTED；另 COS/migration/conformance/Staging/Production 也未执行 |
| 21 | 修改业务规则 | 否 |
| 22 | 修改 Contract | 否；未改 OpenAPI/metadata/Version/SHA；只新增 PROPOSED CR 记录 |
| 23 | 修改 Android/Web/Backend | 否 |
| 24 | 执行 Migration | 否 |
| 25 | 执行 Legacy Migration | 否 |
| 26 | 是否具备进入 Phase 6.0 条件 | **否** |

## 16. 解除阻塞的最小前置条件

1. 独立 Contract review 处理 CR-005；不得在本 Final Gate 直接修改 Contract。
2. 如接受，新增三组 explicit discriminator mapping，提升 Contract Version/SHA，并重跑完整 Contract gate。
3. Android、Student Web、Portal 与 Backend 计划采用的 adapter/codegen 全部重载新 Version/SHA，证明三组 wire literal round-trip 与 unknown fail-closed。
4. 重跑 Phase 5 affected validation 与 Final Gate；只有 Blocking CR=0 且 discriminator integrity PASS 后，Phase 5 才可标记 `FINAL DONE`。

## 17. Phase 结束报告

```text
完成状态：BLOCKED
修改文件：
- contracts/change-requests/CR-20260901-005-explicit-discriminator-mappings.md
- docs/rebuild/STATUS.md
- docs/rebuild/handoffs/phase-5-final-gate.md
执行的测试：
- Git/workspace/commit/artifact integrity
- Contract header/metadata/actual SHA
- OpenAPI parse / verify / RC readiness / Redocly lint
- operationId / ref / schema / error-status exact-set
- deterministic generation / strict UTF-8 / JSON / git diff --check
- discriminator full scan + generated declaration inspection
- Web Phase 5G-B binding/codegen check + affected 13/13
- Android Phase 5G-A binding/generation/model verification + targeted unit
真实测试结果：常规 Contract gate 全 PASS；Android/Web affected validation PASS；discriminator 3/3 implicit-mapping mismatch，CR-005 PROPOSED/BLOCKING
未执行测试及原因：未重跑 Android connected-device、Web full suite/build/browser；已读取当前 HEAD 的 committed 5G evidence并复跑 affected binding/tests。Backend/PostgreSQL/COS/migration/conformance/E2E/Staging/Production 属后续 Phase，均 NOT EXECUTED
是否修改了业务规则：否
是否修改了 Contract：否；仅新增 PROPOSED CR，不改 OpenAPI/metadata/Version/SHA
是否存在旧 API 引用：是；Android/Web 正式 runtime 均 REMAINS / NOT MIGRATED
是否存在 Mock、TODO、空接口：存在既有 validation Mock/demo/simulated/Backend-required 边界；本轮未新增；不得当作 runtime evidence
下一阶段前置条件：先关闭 CR-005 并用新 Version/SHA 重载各下游，再重跑 Final Gate；当前不得进入 Phase 6.0
```
