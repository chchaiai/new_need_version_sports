# CR-20260831-005：冻结短时直传授权的 HTTP Method

- 状态：`ACCEPTED`
- 提交人：Phase 5B Web 只读 Contract 审查
- Contract 当前版本：`1.0.0-contract` / `RC` / `ff15441b84f0729626a49c6898ea4896e80321b8e873a933768a509fd4c8478f`
- Contract 落地版本：`1.1.0-contract` / `RC` / `1d538483f96b95d777cc4dd02526b78a214bd663e036ea5a6c77f43dfa38d99d`
- 业务权威：[总业务流程](../../docs/business/00-overview.md) `P2-MEDIA-03`、`P4-DECISION-01`、`P4-DECISION-02`；[教师端业务流程](../../docs/business/20-teacher-flow.md) 第 8、9、10、11 节
- Web 审计分类：`BLOCKING`

## 变更原因与 Use Case

Web 的 Record 凭证、申请材料和教师官方名单导入都采用“分配短时 URL → 浏览器直传字节 → finalize/import”的正式链路。当前 RC 已提供 `allocateMediaAsset` 与 `allocateRosterImport`，但 `MediaAllocation` 和 `UploadAllocation` 都只有 `uploadUrl`、`requiredHeaders` 与 `expiresAt`，没有 HTTP method；`x-public-conventions.uploads` 和 `x-upload-policies` 也只写 `DIRECT_UPLOAD`，没有规定固定使用 `PUT`、`POST` 或其他 method。

签名 URL 的 method 是签名语义的一部分。客户端不能从 URL、对象存储厂商或旧 DTO 猜测，也不能私下固定 `PUT`。因此当前 RC 无法独立生成一个确定的直传请求，Record、申请和名单三条核心链路的严格 Web Mock/Adapter 均被阻塞。

## 旧边界门禁复核

- 对应的新 Contract operation 是否存在：是，`allocateMediaAsset`、`allocateRosterImport`、`finalizeMediaAsset`、`importOfficialRoster` 均存在。
- 新 Contract 是否完整支持页面/Use Case：否；allocation 响应缺少构造 HTTP 请求所必需的 method，也没有全局固定 method 约定。
- 分类理由：旧 Web/Android DTO 曾有 upload method 不是本 CR 的依据；即使完全忽略旧 DTO，任何 HTTP 客户端仍必须知道 method。因此这是现行 RC 自身缺失的协议语义。

## API 影响

| 项目 | 变更要求 |
|---|---|
| Method / Path | 保持 `POST /api/v1/media-assets` 与 `POST /api/v1/courses/{courseId}/roster-import-allocations`；外部短时 URL 的 method 必须被公开冻结 |
| operationId | 保持 `allocateMediaAsset`、`allocateRosterImport` |
| Response DTO | 在 `MediaAllocation` 与 `UploadAllocation` 中增加 closed enum 的 `uploadMethod`，或在 Contract 全局明确两类授权永远使用同一个固定 method；两种表达只能选择一种权威来源 |
| Header / Body | `requiredHeaders` 继续为服务端签发的完整必需 header 集；明确字节 body、method 与 header 共同构成授权请求，客户端不得自行追加签名相关 header |
| Error / status | allocation API 的现有错误通道可保持；直传 URL 的非 2xx、过期和签名拒绝如何进入后续 finalize/import 仍按各 operation 已声明语义处理，不在客户端合成 API `ErrorEnvelope` |
| 上传 / 时间 | method 与 `expiresAt` 同属短时授权；过期后必须重新 allocation，不能替换 method 重试 |
| 认证 / 安全 | 不暴露内部 object key、永久 URL、签名 secret 或厂商私有字段 |

## 兼容性与下游

- Web：学生端 Record/申请上传和教师 Portal 名单上传统一消费同一公开语义；不得保留旧 `uploadMethod` 兼容字段或硬编码 PUT。
- Android：同一缺口会造成 Android 与 Web 各自猜测 method，属于明确的跨端一致性风险。
- Backend / 对象存储 Adapter：签发 method、URL 与 headers 必须一致，Contract conformance 需要逐 purpose 验证。
- 数据库：无 schema 变更；Phase 3 `MediaAsset`/临时 roster source 元数据可以支持 allocation 生命周期。
- Mock：CR 接受并产生新 Contract 前，不得用假 URL、私有 method 或跳过直传伪造成功。

## 验证与迁移

1. 独立 Contract review 选择“response 字段”或“全局固定 method”之一并冻结唯一语义。
2. 接受后修改确定性 Contract source、OpenAPI、generated binding、coverage 与 Contract tests，提升版本并生成新 SHA。
3. 为 Record image/video、application image、roster CSV/XLSX 分别验证 method、required headers、body 与过期重分配。
4. Web 与 Android 只在加载同一新 Version + SHA 后迁移；旧字段不得作为 fallback。

## 审批记录

- 2026-08-31：Phase 5B Web 只读审查确认现行 RC 未公开直传 HTTP method，提交 `PROPOSED`。
- Contract review：`ACCEPTED`（Phase 5C，2026-09-01）；`MediaAllocation` 与 `UploadAllocation` 均新增 required `uploadMethod`，本 RC 闭集值为 `PUT`。
