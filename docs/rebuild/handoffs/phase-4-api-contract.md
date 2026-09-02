# Phase 4 新 API Contract Handoff

> 日期：2026-08-31
>
> 完成状态：`DONE`（Contract 阶段）
>
> Contract：`1.0.0-contract`
>
> 状态：`RC`
>
> 公开基路径：`/api/v1`
>
> OpenAPI SHA-256：`ff15441b84f0729626a49c6898ea4896e80321b8e873a933768a509fd4c8478f`

## 1. 执行边界

- Git 根目录：`C:\Users\23328\Desktop\new_version`
- 分支：`API-contract-Making`
- 起始 HEAD：`a3c4320303073f72e962a17159d67aeee4bbcf6e`
- 起始状态：clean
- 已读取：根 `AGENTS.md`、`docs/rebuild/STATUS.md`、四份 `docs/business/`、Phase 1 legacy API inventories、Phase 2/3/3A handoff、Phase 3 Domain/数据库与 Backend 内部架构文档
- 允许修改：`contracts/`、`docs/rebuild/STATUS.md`、`docs/rebuild/handoffs/`；用户随后明确授权为撤销教师交接规则而同步四份 `docs/business/`
- 禁止修改且未修改：Backend、Android、Web、`docs/architecture/` 和其他目录

本轮可以跨目录只读检索，但没有跨越上述写入边界。没有 commit、push、PR、merge、tag、部署或发布。

## 2. 交付结果

唯一可消费协议是 [OpenAPI 3.1 文件](../../../contracts/openapi.yaml)。确定性 Python registry 生成 OpenAPI、[operation catalog](../../../contracts/operation-catalog.md) 和 [metadata](../../../contracts/contract-metadata.json)，不得手改生成文件。

最终规模：

| 项目 | 结果 |
|---|---:|
| Public paths | 109 |
| Unique operationIds | 120 |
| Component schemas | 183 |
| Error codes | 66 |

[Use Case 覆盖矩阵](../../../contracts/coverage.md)记录全部核心业务域；[Contract README](../../../contracts/README.md)记录认证、权限、错误、null、分页、时间、上传、幂等、层边界与状态治理；[数据库支持审计](../../../contracts/database-support.md)只证明 Phase 3 设计静态可支撑查询/事务，不是数据库实测。

## 3. 新确认的业务规则

`P4-DECISION-05` 已进入四份业务权威：

- 删除教师账号不要求先完成责任教师交接，也不建立责任教师交接业务；
- 管理员不能借账号删除修改或转移课程责任教师、管理课程或改写课程事实；
- 删除只移除 LoginAccount、Credential、Session、Challenge、学校邮箱和当前 Profile 等账号资料；
- 已有课程、成员、Record、正式媒体、审核、成绩、审计和历史责任快照继续引用不具登录能力且不含当前账号资料的 opaque historical subject。

因此 Contract 的 `deleteTeacherAccount` 不含课程责任 blocker，不返回 `responsibleCourseCount`，也没有任何责任教师交接或管理员课程 mutation Endpoint。

Phase 4 收尾已完成 [P4-DECISION-05 架构一致性清理](phase-4-p4-decision-05-architecture-consistency.md)：Phase 3/3A 文档不再包含正向责任教师交接或教师 Course 责任 blocker，且已显式锁定本 Contract Version + SHA。清理没有修改 Contract 内容或 SHA。

## 4. 公共 Contract 规则

- 每个 operation 明确 Method、Path、operationId、角色、八项管理员权限之一或空权限、资源范围、系统模式、认证、幂等和允许错误。
- 受保护 operation 使用 Bearer access token；refresh credential 只进入请求体。匿名 operation 显式声明 `ANONYMOUS`。
- 全部错误映射到统一 `ErrorEnvelope`；客户端按稳定 `code` 分支，Controller 不得散落错误字符串。
- 对象默认 `additionalProperties: false`；只有 schema 明确允许时才可为 `null`。数组返回空数组，不返回 `null`。
- 列表使用 operation/filter-bound opaque keyset cursor；instant 是显式 `Z` 的 RFC 3339 UTC，运动业务日期由 Backend 在 Session 开始时按上海时区固定。
- 写命令要求 UUID `Idempotency-Key` 或显式天然幂等；不同命令复用同 scope key 返回 `IDEMPOTENCY_KEY_REUSED`；并发更新使用 `expectedVersion` 和 HTTP 412。
- 创建课程邀请的原始邀请码只在首次成功及完全相同的幂等重放中返回，不进入后续 read、日志或审计，也不得持久化原值；Backend 必须在 digest/HMAC 边界内安全重现。
- 上传固定为 allocation → 短期直传 → finalize/权威探测 → 正式绑定；文件限制集中在 `x-upload-policies` 并同步进入 DTO 可表达约束。
- `NORMAL_REQUIRED` 在模式缺失、未知或非 `NORMAL` 时 fail closed；只有明确标记的恢复/治理操作可在维护模式继续。

## 5. 状态与 Change Request

当前仅为 `RC`：允许 Mock 和 Backend 实现，不允许声称已进入 Staging。

从本版本起，任何 Contract 外部行为变化都必须先按 [Change Request 流程](../../../contracts/change-requests/README.md)建立记录，引用已确认业务权威，评估 Android、Web、Backend、数据库、Mock 和 Staging 影响，提升 Contract 版本并重新生成 SHA-256。`APPROVED` 才允许进入 Staging，`LOCKED` 才是生产发布基线。

## 6. 验证证据

| 命令/检查 | 真实结果 |
|---|---|
| `python contracts/scripts/build_contract.py` | PASS；生成成功，连续两次 OpenAPI SHA-256 相同 |
| `python contracts/scripts/verify_contract.py` | PASS；109 paths、120 unique operations、183 schemas、66 errors |
| `npx --yes @redocly/cli@latest lint contracts/openapi.yaml --config contracts/redocly.yaml` | PASS；API description valid，无 warning |
| `python contracts/scripts/check_rc_readiness.py` | PASS；状态 RC，无 `PENDING-*` 决策 |
| 严格 UTF-8 / Python AST / JSON / Markdown links | PASS |
| `git diff --check` | PASS |
| 修改路径审计 | PASS；仅授权目录有变化 |

## 7. 未执行与剩余边界

- Backend、数据库 migration、真实 PostgreSQL/COS、Contract conformance：`NOT EXECUTED`；
- Android/Web generated DTO、transport、Mock、UI、浏览器/设备和跨端 E2E：`NOT EXECUTED`；
- Staging/Production、部署、push/PR/merge/tag/release：`NOT EXECUTED`；
- 旧 API 引用：**仍存在**，本轮没有迁移或删除；见 [Android inventory](../inventories/android-legacy-api.md) 和 [Web inventory](../inventories/web-legacy-api.md)；
- Mock/TODO/空接口：没有新增；现有客户端开发态 Mock 未改变，Contract 通过不等于真实产品实现。

## 8. 下游接入前置

1. 每个下游锁定 `1.0.0-contract` 与 metadata SHA，不从旧 DTO/API/Mock 反推字段。
2. generated DTO 只进入 API/Contract Adapter；Domain、Persistence 和 ORM 继续使用 Mapper 隔离。
3. Backend 建立集中 Domain/Application Error → Contract Error 映射、角色/权限/ownership Guard、maintenance fail-closed、幂等和上传安全门禁。
4. 使用已完成 P4-DECISION-05 清理的 Phase 3/3A 架构；不得恢复教师 Course 责任 blocker或账号管理 Course mutation。
5. RC 后修改先走 Change Request；完成真实 conformance 与集成验收后再决定是否提升 `APPROVED`。

## 9. Phase 结束报告

- 完成状态：`DONE`
- 修改文件：`contracts/` Contract 与治理产物、四份业务权威中的 `P4-DECISION-05`、`docs/rebuild/STATUS.md`、本 handoff
- 执行的测试：确定性生成、自定义 Contract verification、Redocly lint、RC readiness、UTF-8/AST/JSON/Markdown links、whitespace 与范围审计
- 真实测试结果：全部 PASS；详细数据见第 6 节
- 未执行测试及原因：Backend/数据库/客户端/真实上传/E2E/Staging 均不在本轮实现范围
- 是否修改业务规则：是；只修改 `P4-DECISION-05`
- 是否修改 Contract：是；建立 `1.0.0-contract` RC
- 是否存在旧 API 引用：是；仍在客户端，未迁移
- 是否存在 Mock、TODO、空接口：现有 Mock 状态未改变；本轮未新增 TODO、空接口或 Fake Success
- 下一阶段前置条件：见第 8 节
