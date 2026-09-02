# CR-20260901-001：Android Media Finalization Contract Review

- 状态：`REJECTED / NOT_CONTRACT_DEFECT`
- 提交人：Phase 5A Android Re-validation
- Contract 当前版本：`1.1.0-contract` / `RC` / `1d538483f96b95d777cc4dd02526b78a214bd663e036ea5a6c77f43dfa38d99d`
- Contract 目标版本：`NOT APPLICABLE`；保持当前 `1.1.0-contract`、SHA 和 OpenAPI 不变
- 业务权威与决定编号：[总业务流程](../../docs/business/00-overview.md) `P2-MEDIA-01`～`P2-MEDIA-03`、[学生端业务流程](../../docs/business/10-student-flow.md) 第 7.5 节；本 CR 不新增或修改业务规则
- Android Re-validation 原分类：`BLOCKING`；Phase 5C.1 最终归因：`ANDROID_CODEGEN_BINDING`

## 变更原因与 Use Case

Phase 5A 按 Phase 5C handoff 锁定 `1.1.0-contract` 与指定 SHA，并使用 Android 工程已经固定的 `org.openapitools:kotlin 7.24.0`、`jvm-okhttp4`、Gson、Java 8 date library 从根 OpenAPI 生成隔离的 Kotlin model。Contract SHA、版本、121 个 operation、模型生成和 Kotlin 编译均通过，但 `MediaFinalizationResult` 的合法 JSON 不能由生成 DTO 正确反序列化。

可复现的生成结果包括：

- `MediaAsset.contentType` 的 nullable primitive schema 被生成成无字段 `MediaAssetContentType` class，而不是可承载 `image/jpeg`、`image/png`、`image/webp` 或 `video/mp4` 的 nullable string；
- `byteSize`、`checksumSha256`、`durationMilliseconds`、`hasAudio`、`widthPixels`、`heightPixels` 同样被生成成无字段 wrapper class；
- `rejectionCode` 被生成成无字段 `MediaAssetRejectionCode`，不能承载 Contract 的 `MediaFinalizationRejectionCode`；
- 对真实 `VERIFIED` fixture 提供非 null `contentType / byteSize / checksum / width / height` 时，Gson 在读取第一个 primitive 时即失败；`REJECTED / EXPIRED` 的非 null `rejectionCode` 具有同一问题。

因此，Contract 的 Draft 2020-12 静态实例验证可以通过，Android 生成源码也可以编译，但生成 binding 无法消费 CR-002 已确认的三个 200 终态。客户端若手写平行 DTO、替换字段类型、吞掉失败或增加双 response fallback，都会违反本阶段“不得新增客户端私有字段或兼容逻辑”的约束。

这不是 Legacy API 迁移问题：失败只发生在新 `1.1.0-contract` 的 `MediaAsset / MediaFinalizationResult` schema 到 Android 标准生成物的映射，且使用合法新 DTO fixture 即可复现。

## Phase 5C.1 Contract Review 结论

`REJECTED / NOT_CONTRACT_DEFECT`

| 评审问题 | 结果 | 证据 |
|---|---|---|
| 四类 wire JSON 是否严格符合当前 OpenAPI | PASS | `VERIFIED` 图片、`VERIFIED` 视频、`REJECTED`、`EXPIRED` 四个原始 fixture 均由 `Draft202012Validator` 对当前根 Schema 验证通过，错误数均为 0 |
| Schema 是否歧义或无法表达业务语义 | PASS / NO DEFECT | nullable primitive/enum 使用 OpenAPI 3.1 + JSON Schema 2020-12 的 `anyOf: [value, null]`；`MediaFinalizationResult` 以 `allOf` 继承 `MediaAsset` 并收窄 status。分支按 JSON 类型可判定，四个终态与 Phase 2/3 语义一致 |
| 当前 Android 默认生成 binding | FAIL（已归因） | Kotlin generator 7.24.0 的 `jvm-okhttp4` + Gson 路径把 nullable inline `anyOf` 生成成空 wrapper class；Gson 按错误的生成类型读取 primitive/enum 时失败 |
| 不改 Contract 的标准生成链能否表达 | PASS | 同一 generator、library、Contract 和 wire JSON，仅使用官方 `schemaMappings` / `importMappings` 把 inline schema 映射为 nullable Kotlin primitive 与现有 rejection enum，生成物编译通过，Gson 成功读取全部四类 fixture |
| Android Mapper 是否为首要失败点 | NO | 失败发生在 Gson 创建 generated DTO 时，尚未进入 Mapper；Mapper 仍需在后续 Android 任务中校验 exact keys 与 status/rejection 不变量，但不能修复当前反序列化前置失败 |
| 是否需要修改公共 Contract | NO | Contract 与 wire JSON 正确；为单一 generator 的已知 3.1 composition 支持缺陷改写公共 Schema 没有必要 |
| Web / Backend 影响 | NO CONTRACT CHANGE | Web 从同一 Contract 生成的 TypeScript binding 正确表达 nullable primitive/enum 且门禁通过；Backend 当前仅有占位 README、尚无 runtime DTO。修改 Contract 只会制造不必要的版本、SHA 与全下游重绑 |

归因边界如下：

- `MediaAsset` 的 nullable primitive/enum 和 `MediaFinalizationResult` 的 `allOf` 收窄均是合法 OpenAPI 3.1 / JSON Schema 2020-12 表达，不存在 wire-level interoperability defect。
- OpenAPI Generator 的 Kotlin capability 表明确未完整支持 `allOf`、`anyOf`、`oneOf` union；generator 运行时也明确报告 OpenAPI 3.1 支持仍为 beta，并对这些 inline nullable schema 输出 `Failed to get the schema name: null`。上游 [OpenAPI Generator issue #20213](https://github.com/OpenAPITools/openapi-generator/issues/20213) 复现了 3.1、`additionalProperties: false` 与 nullable `anyOf` 组合生成空 wrapper 的同类缺陷。
- 配置验证使用的官方映射为 `MediaAsset_contentType -> kotlin.String?`、`MediaAsset_byteSize -> kotlin.Long?`、`MediaAsset_checksumSha256 -> kotlin.String?`、`MediaAsset_durationMilliseconds -> kotlin.Long?`、`MediaAsset_hasAudio -> kotlin.Boolean?`、`MediaAsset_widthPixels -> kotlin.Int?`（generator 同一 inline schema 同时用于 width/height）以及 `MediaAsset_rejectionCode -> MediaFinalizationRejectionCode?`。这证明无需修改 OpenAPI 即可获得可编译、可解码的 generated binding。
- Android 后续应在独立授权任务内修正 generator 配置/generated binding gate，并以四类合法 fixture 加非法组合门禁验证；不得提交手写平行 DTO、生成后改写或 old/new fallback。

规范依据：[OpenAPI 3.1.0 Schema Object 与 Composition](https://spec.openapis.org/oas/v3.1.0.html#schema-object)、[OpenAPI Generator Kotlin capability](https://openapi-generator.tech/docs/generators/kotlin/)。

## 原提案 API 影响（未批准）

| 项目 | 变更 |
|---|---|
| Method / Path | 保持 `POST /api/v1/media-assets/{mediaAssetId}/finalization` |
| operationId | 保持 `finalizeMediaAsset` |
| 角色 / 管理员权限 / resource scope | 不变：`STUDENT` / 无管理员权限 / `MEDIA_OWNER` / `NORMAL_REQUIRED` |
| RequestDTO | `FinalizeMediaRequest` 业务字段和语义不变 |
| ResponseDTO | Contract review 需用 Android Kotlin/Gson 可正确生成的 JSON Schema 表达同一 `MediaFinalizationResult`；不得新增客户端私有字段，不得改变现有 wire keys 或三个终态 |
| Error code / HTTP status | 不变：预期 `VERIFIED / REJECTED / EXPIRED` 继续只走 `200 MediaFinalizationResult`；认证、权限、依赖、内部等故障继续走现有 `ErrorEnvelope` |
| 分页 / 时间 / null | 不新增分页或时间语义；必须保持各 nullable 媒体探测字段和 `rejectionCode` 的现有业务不变量 |
| 上传 | `PUT + exact requiredHeaders + byte body` 及媒体格式、大小、时长、音轨规则均不变 |
| 幂等 / 并发 | 保持现有 `Idempotency-Key` 与相同命令重放同一终态 |
| 认证 / 安全 | 不改变 Bearer、本人媒体范围、短期 URL、内部 object key 不暴露等边界 |

## 原提案兼容性与下游（未批准）

- 破坏性：目标是 wire-compatible schema 表达修正，但必须提升 Contract 版本并由所有下游重新锁定新 SHA；不得静默覆盖当前 RC。
- Android：禁止提交手写平行 DTO、生成后字段改写或 old/new 双通道 fallback。必须由新 Contract 直接生成可反序列化的 nullable primitive 和 rejection enum。
- 学生 Web：保持现有 wire shape 和唯一终态通道；重新生成后需证明没有字段变化。
- 教师/管理员 Web：无新增媒体写能力；读取正式媒体事实的 wire shape 不得被改写。
- Backend / Contract Adapter：继续输出当前已确认 JSON keys、枚举和 null 不变量，不得为了某一客户端引入另一套 response。
- Domain 映射：`VERIFIED / REJECTED / EXPIRED` 及稳定拒绝原因不变。
- 数据库查询/约束：预计无数据库变化；本 CR 不授权修改持久化模型。
- Mock / fixture：复用 Phase 5A 的图片成功、视频成功、内容拒绝、过期、依赖失败和幂等重放 fixture；新增 Android 生成 DTO 的真实反序列化 gate。

## 原提案迁移、回滚与验证（未批准）

1. Contract review 先复现 `org.openapitools:kotlin 7.24.0` model-only 生成结果，并确认缺陷属于 Contract schema 表达与既定 Android generator 的不兼容；保持 `PROPOSED` 时不得修改 OpenAPI。
2. 若接受，只调整确定性 Contract source 中 nullable primitive / enum 的可生成表达；不增加字段、不改变 wire JSON、不恢复 ErrorEnvelope 双通道。
3. 提升 Contract 版本并生成新 SHA；Android、Web 与 Backend 分别显式重载，禁止在客户端保留当前坏 binding 的兼容 shim。
4. Contract 验证继续覆盖 Draft 2020-12 的 3 个合法、4 个非法媒体实例；同时新增 Android Kotlin/Gson 生成、编译和反序列化验证。
5. Android 必须证明 `VERIFIED` 图片、`VERIFIED` 视频、`REJECTED` 和 `EXPIRED` 四类合法 fixture 都由生成 DTO 正确读取，错误 status/rejection 组合与额外字段仍被拒绝。
6. 回滚应整体回到当前 `1.1.0-contract` 加客户端未迁移状态；不得只保留客户端手写字段或双通道猜测。

## 审批记录

- 2026-09-01：Phase 5A Re-validation 在精确锁定 `1.1.0-contract` / SHA 后复现；Contract 静态校验、生成和 Kotlin 编译通过，但合法 `VERIFIED` fixture 无法由生成 `MediaFinalizationResult` 反序列化，提交为 `PROPOSED`。
- 业务决定：不需要；本 CR 不改变媒体业务规则或 wire 语义。
- 2026-09-01 Phase 5C.1 Contract review：`REJECTED / NOT_CONTRACT_DEFECT`。四类 wire fixture 均严格符合当前 OpenAPI；同一 Contract 经官方 generator mapping 可生成、编译并由 Gson 正确读取，故缺陷归属 Android codegen/generated binding 配置。
- Android：`ACTION REQUIRED`；需另开 Android 授权任务修正生成配置和 generated binding gate，本 CR 不授权客户端源文件修改。
- 学生 Web：`NO CONTRACT ACTION`；当前 TypeScript binding 与门禁通过。
- Backend：`NO CONTRACT ACTION`；当前无 runtime DTO 实现可迁移。
- Contract version / SHA / OpenAPI：保持不变；不进入 Phase 5D。
