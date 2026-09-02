# P4-DECISION-05 架构一致性清理 Handoff

> 日期：2026-08-31（Asia/Shanghai）
>
> 完成状态：`DONE`
>
> 唯一 Contract 基线：`1.0.0-contract` / `RC`
>
> OpenAPI SHA-256：`ff15441b84f0729626a49c6898ea4896e80321b8e873a933768a509fd4c8478f`
>
> Contract 内容：`UNCHANGED`

## 1. 目标与边界

本轮只清理 Phase 3/3A Backend 架构文档中被 `P4-DECISION-05` 推翻的教师账号删除交接/blocker 语义，并为 Backend 架构显式记录当前唯一 Contract Version + SHA。

- 业务权威只读：四份 `docs/business/`；
- Contract 只读：`contracts/`；
- 允许修改：直接相关的 `docs/architecture/`、当前状态和 handoff；
- 禁止且未修改：Android、Web、Backend Runtime、Mock、Contract Test、数据库实现；
- 未执行：commit、push、PR、merge、tag、deploy。

## 2. 修改前冲突位置

| 文件 | 原位置 | 冲突 |
|---|---:|---|
| `docs/architecture/phase-3-domain-and-database-design.md` | 103 | 通用 `DeleteAccount` 将“职责 blocker”混用于教师删除 |
| 同上 | 219 | 明确要求教师删除前不存在其负责的 Course |
| 同上 | 260、262–263 | 明确要求教师 Course 责任移交，并将 Course 混入角色 blocker |
| 同上 | 288 | `responsible_teacher_subject_id` 写成“建立/交接”时要求当前账号，建立了未授权交接语义 |
| 同上 | 786 | 教师与学生/分管理员共用职责/Session blocker 锁与检查 |
| 同上 | 1062、1068 | 只记录 P4-DECISION-01 至 04，并要求未区分角色的 blocker conflict |
| `docs/architecture/backend-module-boundaries.md` | 118 | 教师/分管理员账号终止共用“职责 blocker”参与模块 |
| `docs/architecture/README.md` | 5 | 只记录 P4-DECISION-01 至 04 |
| `docs/rebuild/handoffs/phase-3a-backend-architecture-and-module-boundaries.md` | 157 | 账号终止参与者笼统记录为 `blockers` |

`backend-architecture.md` 与 `backend-dependency-rules.md` 没有发现相反业务规则，但未显式记录当前 Contract Version + SHA，也缺少保护 P4-DECISION-05 的架构测试断言。

## 3. 最小修改结果

- `DeleteAccount` 只为学生进行中 Session、分管理员未移交职责等适用角色检查 blocker；
- 管理员删除教师只处理 identity/account 数据，不查询或锁定 Course 作为 blocker；
- `course-enrollment` 不参与教师账号删除事务，账号管理不调用 Course mutation；
- `responsible_teacher_subject_id` 只在建立 Course 时要求当前 Teacher，账号删除后继续引用 opaque historical subject，不修改或转移；
- 明确保留分管理员删除前职责移交规则；
- migration/transaction/authorization 架构测试必须断言教师删除无 Course blocker、无责任教师 mutation；
- 未新增责任教师交接 Use Case、Domain command、Endpoint、表、状态或错误码。

## 4. Contract 基线与门禁

[Contract metadata](../../../contracts/contract-metadata.json) 和实际 OpenAPI 均确认：

- Version：`1.0.0-contract`
- Status：`RC`
- SHA-256：`ff15441b84f0729626a49c6898ea4896e80321b8e873a933768a509fd4c8478f`
- 规模：109 paths、120 unique operationIds、183 schemas、66 errors

清理前后全 `contracts/` 21 个文件的内容树摘要均为 `76252b0af9ab7ed47762cb3a4298a6478686bea19cb7f748b6f77239cf1879c5`，证明本轮没有修改 Contract 内容。

[Change Request 门禁](../../../contracts/change-requests/README.md)已存在且继续有效：任何字段、状态、错误码、权限、上传、幂等或其他外部行为不足，都必须先提交 CR、修改并验证 Contract、提升版本并生成新 SHA；下游不得私自补充或改变语义。

## 5. 已引用 Version + SHA 的下游文档

- `docs/architecture/README.md`
- `docs/architecture/phase-3-domain-and-database-design.md`
- `docs/architecture/backend-architecture.md`
- `docs/architecture/backend-module-boundaries.md`
- `docs/architecture/backend-dependency-rules.md`
- `docs/rebuild/handoffs/phase-3a-backend-architecture-and-module-boundaries.md`
- `docs/rebuild/handoffs/phase-4-api-contract.md`
- `docs/rebuild/STATUS.md`
- 本 handoff

Android、Web、Backend Runtime、Mock 和 Contract Test 当前没有在本轮修改或实现；不能声称它们已经完成绑定。它们的后续任务必须在开始时显式加载上述 Version + SHA，发现不足时停止并走 Change Request。

## 6. 验证结果

| 验证 | 结果 |
|---|---|
| Contract metadata 与 OpenAPI SHA | PASS；Version、Status、SHA 完全一致 |
| `python contracts/scripts/verify_contract.py` | PASS；109 paths、120 unique operations、183 schemas、66 errors |
| Redocly OpenAPI lint | PASS；API description valid，无 warning |
| Contract 内容树清理前后摘要 | PASS；均为 `76252b0af9ab7ed47762cb3a4298a6478686bea19cb7f748b6f77239cf1879c5` |
| 旧教师交接/blocker 复扫 | PASS；无正向旧规则，相关命中仅为禁止/否定语义 |
| 分管理员职责规则复扫 | PASS；仍保留 |
| Change Request 门禁 | PASS；已存在且未修改 |
| Android/Web/Backend Runtime/Contract | PASS；无本轮修改 |

## 7. Phase 结束报告

- 完成状态：`DONE`
- 修改文件：五份 `docs/architecture/` 文档、Phase 3A/Phase 4 handoff、`docs/rebuild/STATUS.md` 和本 handoff
- 修改原因：删除已被 P4-DECISION-05 推翻的教师责任交接/Course blocker 语义，并锁定 Backend 架构所用 RC 基线
- 执行的测试：Contract verify/hash/tree摘要、Redocly lint、旧规则复扫、分管理员规则复扫、Change Request 存在性、UTF-8/Markdown/whitespace/scope 检查
- 未执行测试及原因：没有 Runtime、数据库或客户端修改，因此未执行 build、migration、E2E、设备、Staging 或部署验证
- 是否修改业务规则：否；只同步现有 P4-DECISION-05
- 是否修改 Contract：否；Version、Status、SHA 和内容树均未改变
- 是否存在旧 API 引用：是；客户端 legacy API 仍未迁移
- 是否存在 Mock、TODO、空接口：既有状态未改变；本轮未新增
- 下一阶段前置条件：所有下游显式锁定 `1.0.0-contract` + 当前 SHA；Contract 不足先走 Change Request
