# CR-20260831-002：统一媒体 finalization 的拒绝结果通道

- 状态：`ACCEPTED`
- 提交人：Phase 5A Android Contract CR 全量续审
- Contract 当前版本：`1.0.0-contract` / `RC` / `ff15441b84f0729626a49c6898ea4896e80321b8e873a933768a509fd4c8478f`
- Contract 落地版本：`1.1.0-contract` / `RC` / `1d538483f96b95d777cc4dd02526b78a214bd663e036ea5a6c77f43dfa38d99d`
- 业务权威与决定编号：[总业务流程](../../docs/business/00-overview.md) 第 11 节、[学生端业务流程](../../docs/business/10-student-flow.md) 第 7.5、9.3、9.4 节
- Android 审计分类：`BLOCKING`

## 变更原因与 Use Case

打卡图片/视频以及免测、校队或社团认证图片在直传后都必须经过 Backend 权威探测。Android 需要把成功验证、不可重试的内容拒绝、分配过期、可重试依赖错误分别表达为明确状态，才能决定继续提交、提示重新选择文件或允许重试；客户端不得同时实现两套猜测逻辑。

当前 `finalizeMediaAsset` 存在互相竞争的公开结果通道：

- operation description 明确写明“returns `VERIFIED` or `REJECTED` truthfully”，`200` 返回 `MediaAsset`，其 `status` 包含 `REJECTED`，并带可空 `rejectionCode`；
- 同一 operation 又声明 `413 / 415 / 422 ErrorEnvelope`，并列出 `MEDIA_LIMIT_EXCEEDED / PAYLOAD_TOO_LARGE / UNSUPPORTED_MEDIA_TYPE / MEDIA_CONTENT_INVALID`；这些 code 的 catalog description 正是权威文件大小、类型、时长、音轨、校验和或文件结构被拒绝；
- `MEDIA_ALLOCATION_EXPIRED` 通过 `409 ErrorEnvelope` 表达，但 `MediaAsset.status` 同时包含 `EXPIRED`；
- `rejectionCode` 只是任意非空字符串，没有与上述稳定错误码或 UI 行为的 Contract 映射。

因此同一个“不合规文件”既可以被解释为 `200 MediaAsset(status=REJECTED)`，也可以被解释为 `413/415/422 ErrorEnvelope`。严格 Mock 无法选择唯一合法通道，Android 与 Web 也可能对同一权威拒绝作出不同的重试和展示行为。

本 CR 不改变媒体格式、数量、大小、视频时长、音轨或隐私规则，只要求为已有结果建立唯一、可生成和可测试的协议语义。

## 旧边界门禁复核

- 对应的新 Contract operation 是否存在：是，`allocateMediaAsset / finalizeMediaAsset / authorizeMediaDownload` 已覆盖新的媒体流程；不要求保留旧 upload-session、confirm、bind 或 poll DTO。
- 新 Contract 是否完整支持页面/Use Case：`VERIFIED` 成功链完整，但 `finalizeMediaAsset` 的权威拒绝/过期通道不唯一，无法形成同一套跨端状态与重试语义。
- 分类理由：缺口来自当前 operation 的 200 DTO、ErrorEnvelope responses 和 error catalog 互相竞争，不来自旧 Android DTO；因此拒绝路径为 `PROPOSED CR`，成功路径仍归 `LEGACY_MIGRATION`。

## API 影响

| 项目 | 变更 |
|---|---|
| Method / Path | `POST /api/v1/media-assets/{mediaAssetId}/finalization` |
| operationId | 保持 `finalizeMediaAsset` |
| 角色 / 管理员权限 / resource scope | 保持 `STUDENT` / 无管理员权限 / `MEDIA_OWNER` / `NORMAL_REQUIRED` |
| RequestDTO | `FinalizeMediaRequest` 不增加客户端探测结果；Backend/COS 继续权威探测 |
| ResponseDTO | 必须选择并声明一个唯一拒绝通道。建议：预期的权威探测终态返回 `200 MediaAsset`，并把 `VERIFIED / REJECTED / EXPIRED` 的字段不变量写成可生成 schema；若 Contract review 选择 ErrorEnvelope 通道，则应删除或限定 operation 中不可达的成功状态，并说明客户端如何取得已提交资产的终态 |
| Error code / HTTP status | 明确 `MEDIA_CONTENT_INVALID / MEDIA_LIMIT_EXCEEDED / PAYLOAD_TOO_LARGE / UNSUPPORTED_MEDIA_TYPE / MEDIA_ALLOCATION_EXPIRED` 分别属于终态结果还是 ErrorEnvelope，禁止同一原因同时占用两种通道；认证、权限、资源不存在、维护、幂等 reuse、限流、依赖和内部错误继续使用 ErrorEnvelope |
| 分页 / 时间 / null | 无分页变化；`rejectionCode` 在 `REJECTED` 时必须非 null，并使用 Contract 声明的稳定闭集或明确映射；`VERIFIED` 时必须为 null；`EXPIRED` 的字段语义必须明确 |
| 上传 | JPEG/PNG、MP4、JPEG/PNG/WebP、单文件/aggregate、1–15 秒及音轨规则均不改变 |
| 幂等 / 并发 | 保持 `Idempotency-Key`；完全相同重放必须返回同一个已提交终态与同一通道，不能一次返回 DTO、另一次返回 ErrorEnvelope |
| 认证 / 安全 | Bearer、本人媒体范围、短期授权和内部 object key 不暴露等规则不变；客户端声明仍不是权威事实 |

## 兼容性与下游

- 破坏性：对 `VERIFIED` 成功路径可保持非破坏；对拒绝/过期路径属于行为性破坏，所有严格客户端和 Backend 必须加载同一新版本。
- Android：打卡凭证与申请材料上传协调器只实现 Contract 选定的一种终态映射；不得同时吞 ErrorEnvelope、猜 `rejectionCode` 或把拒绝伪装成上传成功。
- 学生 Web：与 Android 使用同一拒绝通道和稳定原因；不得按旧 adapter 私自选择另一套状态。
- 教师/管理员 Web：不执行学生上传 finalization；读取已绑定媒体时仍需能安全显示既有正式事实。
- Backend / Contract Adapter：一次事务/命令只提交一个权威终态；HTTP 状态、DTO、error code 与持久化状态必须一致。
- Domain 映射：媒体探测结果继续是 `VERIFIED / REJECTED / EXPIRED` 等既有事实，不新增业务审批状态。
- 数据库查询/约束：现有 purpose-aware media metadata、状态/version 和绑定关系静态可支持；预计无需 schema 变化，但必须验证一次命令只提交一个终态。
- Mock / fixture：至少覆盖图片验证成功、视频验证成功、内容拒绝、过期、依赖失败和幂等重放；每个原因只能命中一个 Contract 通道。
- Staging：`NOT EXECUTED`；新版本、Backend、COS 与学生客户端加载同一 SHA 后，才可用真实 MIME/大小/时长/音轨样本验证唯一通道和幂等重放；本 `PROPOSED` CR 不授权进入 Staging。

## 迁移、回滚与验证

1. 独立 Contract review 选择唯一拒绝通道并记录选择；本 CR 保持 `PROPOSED` 时不修改 OpenAPI、Backend 或客户端。
2. 接受后修改确定性 Contract source，收紧 `MediaAsset` 状态字段不变量、operation responses、`x-error-codes` 与 error catalog 说明。
3. 提升 Contract 版本并生成新 SHA；不得原地覆盖 `1.0.0-contract`。
4. 增加 Contract test，证明同一拒绝原因不能同时匹配 `200 MediaAsset` 和 ErrorEnvelope，完全相同幂等重放保持同一通道。
5. Android 与学生 Web 加载同一版本，分别生成同一组成功/拒绝/过期/依赖错误 fixture；Backend conformance 再验证实际 MIME、大小、时长、音轨和结构探测。
6. 回滚必须按 Contract、Backend、客户端组合整体回滚；不得只在某一客户端保留双通道兼容猜测。

## 审批记录

- 2026-08-31：Phase 5A Android CR 续审发现 success DTO 与 operation error 集合对同一权威媒体拒绝没有唯一通道，提交为 `PROPOSED`。
- 业务决定：不需要新增媒体业务规则；本 CR 只统一现有规则的公开结果表达。
- Contract review：`ACCEPTED`（Phase 5C，2026-09-01）；权威预期终态统一为 `200 MediaFinalizationResult`，`VERIFIED / REJECTED / EXPIRED` 由闭集 `rejectionCode` 不变量区分，认证、权限、依赖和内部故障继续使用 `ErrorEnvelope`。
- Android / 学生 Web / Backend 确认：`PENDING`。
