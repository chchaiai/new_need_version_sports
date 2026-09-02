# Phase 5C.1：CR-20260901-001 Contract Review Handoff

## 1. 最终结论

`REJECTED / NOT_CONTRACT_DEFECT`

Android Media Finalization 的反序列化失败不是 Contract Schema / wire interoperability defect。当前 `1.1.0-contract` 可以无歧义地表达四类合法结果，四个实际 fixture 均严格通过根 OpenAPI Schema 校验；失败归属 OpenAPI Generator Kotlin 7.24.0 对 OpenAPI 3.1 nullable inline `anyOf` 的 codegen/generated binding 配置与能力缺口。

不修改 OpenAPI，不提升 Contract Version，不修改 SHA，不进入 Phase 5D。

## 2. Git 与执行边界

| 项目 | 本轮基线 / 边界 |
|---|---|
| Git 根目录 | `C:\Users\23328\Desktop\new_version` |
| 分支 | `API-contract-Making` |
| 起始 HEAD | `dfbc39eeef2843ba20e2c4f203bce0ebf4d2df23` |
| 起始状态 | clean |
| 已读取 AGENTS | 根 `AGENTS.md`；跨目录只读检索时读取 `BNBU-Sports-Web-new/portal-teacher-admin/AGENTS.md` |
| 当前 Phase | Phase 5C.1 CR-20260901-001 Contract Review |
| 允许修改 | 目标 CR、`docs/rebuild/STATUS.md`、本 handoff |
| 禁止修改 | `contracts/openapi.yaml`、Contract metadata/SHA/version、Android/Web/Backend 源文件、业务文档及其他 CR |
| 完成标准 | 在两种唯一允许结论中完成可复现归因，记录下游影响，保持 Contract 不变 |

## 3. 对照输入

- 当前 Contract：`1.1.0-contract` / `RC` / SHA-256 `1d538483f96b95d777cc4dd02526b78a214bd663e036ea5a6c77f43dfa38d99d`。
- 目标 CR：[CR-20260901-001](../../../contracts/change-requests/CR-20260901-001-android-media-finalization-codegen.md)。
- 根 Schema：`MediaAsset`、`MediaFinalizationResult`、`MediaFinalizationRejectionCode` 及 `POST /api/v1/media-assets/{mediaAssetId}/finalization` 的 200 response。
- Android 生成链：`org.openapitools:kotlin 7.24.0`、`jvm-okhttp4`、`serializationLibrary=gson`、`dateLibrary=java8`、model-only 隔离包。
- Android 原始 blocker fixture：`VERIFIED` 图片、`VERIFIED` 视频、`REJECTED`、`EXPIRED`。
- Phase 2/3 业务语义：`P2-MEDIA-01`～`P2-MEDIA-03`、学生流程第 7.5 节，以及 Phase 3 MediaAsset 状态/metadata 和 allocation→upload→probe→terminal state 设计。
- Web 对照：同一根 Contract 生成的学生与 Portal validation binding。
- Backend 对照：当前 `BNBU-Sports-Backend` 仅有未来实现说明，没有 runtime DTO/binding。

## 4. Wire JSON 与 OpenAPI 严格校验

四个 fixture 直接取自 Android blocker test，没有改写字段、类型或 null：

| Fixture | 关键非 null 值 | status / rejectionCode | Draft 2020-12 |
|---|---|---|---|
| VERIFIED image | `image/jpeg`、4 bytes、SHA-256、100×100 | `VERIFIED` / null | PASS，0 error |
| VERIFIED video | `video/mp4`、5 bytes、SHA-256、5000 ms、audio=true、1920×1080 | `VERIFIED` / null | PASS，0 error |
| REJECTED | 探测 metadata 全部 null | `REJECTED` / `MEDIA_CONTENT_INVALID` | PASS，0 error |
| EXPIRED | 探测 metadata 全部 null | `EXPIRED` / `MEDIA_ALLOCATION_EXPIRED` | PASS，0 error |

校验以 `contracts/openapi.yaml` 的根引用为入口，并由 Python `jsonschema.Draft202012Validator` 逐个验证实际对象。结果证明失败 fixture 不是宽松 Mock、不是旧 DTO，也不是偏离 OpenAPI 的 wire JSON。

## 5. Schema 可表达性与歧义审查

`MediaAsset` 对 nullable primitive/enum 使用 OpenAPI 3.1 / JSON Schema 2020-12 的 `anyOf`：一个分支为具体 string/integer/boolean/enum，另一个分支为 `null`。两个分支的 JSON 类型互斥，实例判定稳定。

`MediaFinalizationResult` 使用 `allOf` 继承 `MediaAsset`，再把 `status` 收窄为 `VERIFIED / REJECTED / EXPIRED`。`MediaAsset` 上的条件约束进一步要求：

- `REJECTED` 必须携带已定义且非 allocation-expired 的 rejection code；
- `EXPIRED` 必须携带 `MEDIA_ALLOCATION_EXPIRED`；
- 其余状态的 rejection code 必须为 null。

这是交集约束，不是具有重叠 discriminator 的替代分支；nullable value/null 分支也不存在类型重叠。Phase 2/3 已确认的媒体数量、格式、大小、客户端预检/Backend 权威复检和终态语义与该 Schema 一致，没有需要业务决定的 `PENDING`。

OpenAPI 3.1 明确规定 Schema Object 是 JSON Schema Draft 2020-12 vocabulary 的超集，并以 `allOf` 表达组合：[OpenAPI 3.1.0 Schema Object](https://spec.openapis.org/oas/v3.1.0.html#schema-object)。

## 6. 当前 Android binding 的真实失败点

锁定的生成任务真实输出以下错误形态：

- `contentType` 被声明为非 null 的空 `MediaAssetContentType` class；
- `byteSize / checksumSha256 / durationMilliseconds / hasAudio / widthPixels / heightPixels` 被声明为对应的非 null 空 wrapper class；
- `rejectionCode` 被声明为空 `MediaAssetRejectionCode`，没有使用已经正确生成的 `MediaFinalizationRejectionCode` enum。

因此 Gson 看到合法 wire primitive/enum 时，会尝试按 object wrapper 解码，并在创建 generated DTO 阶段失败；Android Mapper 尚未获得 DTO，不能成为这次首要故障点。

生成日志同时报告：

- OpenAPI 3.1 support is still in beta；
- `Failed to get the schema name: null`。

OpenAPI Generator Kotlin capability 表将 `allOf / anyOf / oneOf` union 标为不支持；`generateOneOfAnyOfWrappers` 也只支持特定 `jvm-retrofit2` 组合，不是当前 `jvm-okhttp4` 路径：[Kotlin generator capability](https://openapi-generator.tech/docs/generators/kotlin/)。上游 [issue #20213](https://github.com/OpenAPITools/openapi-generator/issues/20213) 还给出了 OpenAPI 3.1、`additionalProperties: false` 与 nullable `anyOf` 生成无效 wrapper model 的同类复现。

结论是 generator 没有忠实实现合法 Schema，而不是合法 Schema 无法互操作。

## 7. 不修改 Contract 的标准生成链证明

在仓库外隔离目录中，保持以下内容全部不变：

- `contracts/openapi.yaml` 的 bytes、version、SHA 和 wire shape；
- OpenAPI Generator 7.24.0；
- Kotlin generator、`jvm-okhttp4`、Gson 和 Java 8 date library。

只使用 generator 官方 `schemaMappings` / `importMappings` 配置：

| Inline schema | Kotlin mapping |
|---|---|
| `MediaAsset_contentType` | `kotlin.String?` |
| `MediaAsset_byteSize` | `kotlin.Long?` |
| `MediaAsset_checksumSha256` | `kotlin.String?` |
| `MediaAsset_durationMilliseconds` | `kotlin.Long?` |
| `MediaAsset_hasAudio` | `kotlin.Boolean?` |
| `MediaAsset_widthPixels` | `kotlin.Int?`（generator 对相同 inline schema 复用于 width/height） |
| `MediaAsset_rejectionCode` | `MediaFinalizationRejectionCode?`，并导入已生成 enum |

真实结果：

1. generated Kotlin model 编译通过；
2. Gson 2.11 对四个原始 fixture 全部反序列化成功；
3. 图片/视频的 primitive metadata 保持真实值；
4. REJECTED/EXPIRED 的 rejection enum 分别为 `MEDIA_CONTENT_INVALID` / `MEDIA_ALLOCATION_EXPIRED`。

这不是手写 DTO、生成后改写、Mapper fallback 或私有 wire 字段，而是同一官方生成器的显式 mapping 配置。它证明公共 Contract 无需为 Android 修改。

后续 Android 任务仍应在 DTO 解码后由 strict raw-JSON/Mapper gate 检查额外字段和 status/rejection 条件约束，因为 Gson 类型本身不会自动实现全部 JSON Schema 条件。

## 8. Web / Backend 影响判断

| 下游 | 当前事实 | Contract 修改判断 |
|---|---|---|
| 学生 Web / Portal | `openapi-typescript 7.13.0` 从同一 Contract 正确生成 `string/number/boolean/null` 与 rejection enum/null；两个 `--check` 门禁通过 | 无需修改；改 Contract 会触发无必要的 binding/version/SHA churn |
| Backend | 当前目录只有未来实现 README，没有 runtime DTO、adapter 或 response serializer | 没有待修复的 Contract interop 失败；不得用尚不存在的实现证明需要改 Contract |
| Android | 默认生成配置产生错误 wrapper；官方 mapping 配置可在 Contract 不变时正确生成和解码 | 独立 Android codegen/generated binding 责任 |

## 9. 执行的验证与真实结果

| 验证 | 真实结果 |
|---|---|
| 四个原始 fixture × 根 Draft 2020-12 Schema | PASS；4/4，全部 0 error |
| `:app:phase5aOpenApiGenerate` + 定向 `generatedMediaFinalizationModelCannotDecodeTheFourValidTerminalFixtures` | PASS；负向 test 确认当前生成 binding 对四类合法 fixture 全部失败 |
| 未修改 Contract + 官方 mappings 的 generator 7.24.0 | PASS；生成完成，nullable primitive/enum 类型正确 |
| 映射后 `:app:compileDebugUnitTestKotlin` | PASS |
| 映射后 Gson 2.11 解码四个原始 fixture | PASS；4/4 |
| Portal `npm run phase5b:contract:check` | PASS；学生与 Portal validation binding 均与当前 version/SHA/OpenAPI 一致 |
| `contracts/scripts/verify_contract.py` | PASS；109 paths / 121 operations / 192 schemas / 66 errors |
| `contracts/scripts/check_rc_readiness.py` | PASS |
| Contract version / metadata / SHA 核对 | PASS；保持 `1.1.0-contract` / `RC` / `1d538...99d` |
| 三份本轮文档严格 UTF-8 / 相对链接 | PASS；全部可严格解码，本地链接目标均存在 |
| `git diff --check` / 修改路径核对 | PASS；最终仅目标 CR、STATUS 与本 handoff 发生变化 |

未执行完整 Android unit/lint/assemble/device、浏览器、真实 Backend/PostgreSQL/COS、跨端 E2E、Staging、Production、部署或发布。本阶段没有修改客户端或 Contract，完整产品回归不能替代也不属于本次归因；Android 修复任务应按实际改动风险重新执行对应门禁。

## 10. 后续前置条件

1. 另开 Android 授权任务，在 `build.gradle.kts`/生成配置和 generated binding gate 内落实确定性 mapping；不得由本 CR 修改公共 Contract。
2. Android 以当前 `1.1.0-contract` + 当前 SHA 生成 DTO，证明四类合法 fixture 成功、非法 status/rejection/extra-field 组合失败。
3. 对生成配置变更重跑相称的 unit/lint/assemble/device；正式 runtime Legacy API 迁移仍按独立 Slice 授权。
4. Phase 5D 未进入；不得从本 handoff 推导自动提升 Contract 或客户端修改授权。

## 11. Phase 结束报告

```text
完成状态：DONE
修改文件：CR-20260901-001、docs/rebuild/STATUS.md、本 handoff
执行的测试：四 fixture Draft 2020-12；当前 Android 生成/负向 blocker；不改 Contract 的官方 mapping 生成、Kotlin 编译、Gson 4/4；Web binding check；Contract verify/RC readiness；文档与 Git 边界检查
真实测试结果：上述定向验证全部 PASS；当前默认 Android binding 的 4/4 解码失败被确认为 generator/generated binding 缺陷，不是 Contract defect
未执行测试及原因：完整 Android/Web/浏览器/设备/Backend/数据库/COS/E2E/Staging/Production/部署/发布未执行；本轮只做归因且未修改实现或 Contract
是否修改了业务规则：否
是否修改了 Contract：否；OpenAPI、Version、metadata、SHA 均不变
是否存在旧 API 引用：是；Android/Web 正式 Legacy transport 仍存在，本轮不迁移
是否存在 Mock、TODO、空接口：既有 Phase 5 validation-only fixture 仍存在；未新增或修改产品 Mock、TODO、空接口、Fake Success
下一阶段前置条件：独立 Android 任务修正 generator configuration/generated binding 并重跑相称门禁；Phase 5D 未进入
```
