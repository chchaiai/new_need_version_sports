# CR-20260831-001：声明学生无进行中 Session 的空状态响应

- 状态：`ACCEPTED`
- 提交人：Phase 5A Android Contract Mock 验证
- Contract 当前版本：`1.0.0-contract` / `RC` / `ff15441b84f0729626a49c6898ea4896e80321b8e873a933768a509fd4c8478f`
- Contract 落地版本：`1.1.0-contract` / `RC` / `1d538483f96b95d777cc4dd02526b78a214bd663e036ea5a6c77f43dfa38d99d`
- 业务权威与决定编号：[总业务流程](../../docs/business/00-overview.md) 的 `P2-SESSION-01`，以及 [学生端业务流程](../../docs/business/10-student-flow.md) 第 7 节
- Android 审计分类：`BLOCKING`

## 变更原因与 Use Case

学生打开运动页面时必须先恢复本人是否存在 `ACTIVE` 或 `PAUSED` Session；不存在进行中 Session 时，页面需要表达正常的 Idle/可开始空状态，而不是伪造 Session、显示网络错误或使用客户端私有字段。

当前 `getOwnActiveExerciseSession` 的 description 已明确写明“or 404 when none exists”，但该 operation 的 OpenAPI `responses` 只声明 `200 / 401 / 403 / 429 / 500 / 503`，`x-error-codes` 也未包含 `RESOURCE_NOT_FOUND`。因此严格按 Contract 的 Android/Web Mock 无法合法表达“没有进行中 Session”。

本 Change Request 不新增业务状态，也不改变 Session 状态机；它只要求让结构化协议与当前 operation 描述及既有业务流程一致。在本 CR 被接受、Contract 提升版本并重新生成 SHA 前，Android、Web 和 Backend 不得自行选择未声明的空值、私有错误码或假成功 Session。

## 旧边界门禁复核

- 对应的新 Contract operation 是否存在：是，`getOwnActiveExerciseSession` 已存在；不要求保留旧 DTO 或旧 path 形状。
- 新 Contract 是否完整支持页面/Use Case：否；当前 RC 自身缺少 description 已承诺的 404 response 和稳定 error code，严格客户端无法表达正常 Idle。
- 分类理由：这是当前业务与当前 RC 的直接不一致，不是因为 Android 旧 API 返回过某种结构；因此保留为 `PROPOSED CR`，而不是 `LEGACY_MIGRATION`。续审再次发现同一缺口时没有创建重复 CR。

## API 影响

| 项目 | 变更 |
|---|---|
| Method / Path | `GET /api/v1/student/exercise-sessions/active` |
| operationId | 保持 `getOwnActiveExerciseSession` |
| 角色 / 管理员权限 / resource scope | 保持 `STUDENT` / 无管理员权限 / `SELF` / `NORMAL_REQUIRED` |
| RequestDTO | 无变化；仍无 request body |
| ResponseDTO | `200 ExerciseSession` 保持不变；建议新增已声明的 `404 ErrorEnvelope` |
| Error code / HTTP status | 建议在 operation 的 `x-error-codes` 增加 `RESOURCE_NOT_FOUND`，并声明 `404` response；该组合只表示当前学生没有 `ACTIVE`/`PAUSED` Session |
| 分页 / 时间 / null | 无分页、时间或成功 DTO null 语义变化；不把 `200 null` 作为隐式替代方案 |
| 上传 | 无影响 |
| 幂等 / 并发 | 只读 operation，保持 `READ_ONLY`；数据库中的进行中 Session partial unique 不变 |
| 认证 / 安全 | Bearer、本人范围和维护模式门禁不变；客户端只能在本 operation 的 `404 + RESOURCE_NOT_FOUND` 上映射 Idle，不能把其他 404 或其他错误吞成空状态 |

## 兼容性与下游

- 破坏性：对成功 DTO 非破坏；但属于 RC 后公开响应集合变化，严格客户端必须重新加载新版本，不能把它当作只改描述。
- Android：Phase 5A 当前被阻塞。新 Contract 加载后增加严格 404 Mock，并只把该 operation 的 `RESOURCE_NOT_FOUND` 映射为 Session Idle；其他 ErrorEnvelope 继续显示错误/重试。
- 学生 Web：当前仍绑定旧 `3.0.0-web-snapshot`，须在其独立客户端 Phase 重新加载同一新 Contract 并采用相同映射。
- 教师/管理员 Web：没有直接调用该学生 operation；仍须确认生成快照和共享错误处理未受影响。
- Backend / Contract Adapter：查询本人进行中 Session 得到零行时返回 `404 ErrorEnvelope(code=RESOURCE_NOT_FOUND)`；不得返回空对象、`200 null` 或 Fake Session。
- Domain 映射：无 Session 是查询结果为空，不新增 Domain 状态或实体。
- 数据库查询/约束：无需 schema 变化；现有 `status IN ('ACTIVE','PAUSED')` partial unique 与查询索引可以支持零行或唯一一行。
- Mock / fixture：新增一个严格绑定 `getOwnActiveExerciseSession` 404 response 的 ErrorEnvelope fixture；空状态 fixture 不包含 Session 私有字段。
- Staging：`NOT EXECUTED`；只有新版本 Contract、Backend 与学生客户端加载同一 SHA 并通过 conformance 后，才能验证真实零行响应与 Idle 映射；本 `PROPOSED` CR 不授权进入 Staging。

## 迁移、回滚与验证

1. 独立 Contract 任务接受或拒绝本 CR；接受前保持 `PROPOSED`，不得改动当前 RC 内容。
2. 接受后修改确定性 Contract source，同时新增 operation 级 `404`、`RESOURCE_NOT_FOUND` 和对应验证断言。
3. 提升 Contract 版本，重新生成 OpenAPI、catalog、metadata 与新 SHA-256；旧 `1.0.0-contract` 继续可识别，禁止原地静默覆盖。
4. 重新执行 `verify_contract.py`、OpenAPI lint、RC readiness、operation/error/status 一致性检查。
5. Android 与学生 Web 分别加载同一新版本，增加内容、Idle、非空错误三类 Mock；Backend 再按新版本实现或验证零行响应。
6. Contract conformance 必须证明：唯一进行中 Session 返回 `200 ExerciseSession`；零行返回 `404 RESOURCE_NOT_FOUND`；认证、维护、依赖等错误不会被客户端误映射为 Idle。
7. 如需回滚，在 Backend 尚未发送新响应前回退下游加载；一旦 Backend 已按新版本发送 404，只能整体回滚到旧 Contract/Backend/客户端组合，不能单独让客户端吞掉未声明响应。

## 审批记录

- 2026-08-31：Phase 5A 静态验证发现 description、responses 与 `x-error-codes` 不一致，提交为 `PROPOSED`。
- 业务决定：不需要新增业务决定；本 CR 不改变 `P2-SESSION-01` 状态机。
- Contract review：`ACCEPTED`（Phase 5C，2026-09-01）；`getOwnActiveExerciseSession` 以 `404 ErrorEnvelope(code=RESOURCE_NOT_FOUND)` 唯一表达无进行中 Session。
- Android / 学生 Web / Backend 确认：`PENDING`。
