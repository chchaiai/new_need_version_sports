# Phase 5A.1 Android Contract Codegen / Generated Binding Fix handoff

> 日期：2026-09-01（Asia/Shanghai）
>
> 完成状态：`DONE`
>
> Phase 5A 最终状态：`PASS (CONTRACT/MOCK RE-VALIDATION)`

## 1. 执行基线与边界

| 项目 | 结果 |
|---|---|
| Git 根目录 | `C:\Users\23328\Desktop\new_version` |
| 分支 | `API-contract-Making` |
| 起始 HEAD | `1e63cf92d8cf2a9ea09063bc92f890ce9af76ede` |
| 起始工作区 | CLEAN；`git status --short --branch` 仅为 `## API-contract-Making` |
| 已读取 AGENTS | 根 [AGENTS.md](../../../AGENTS.md)；Android 下没有更深层 AGENTS |
| 当前 Phase | Phase 5A.1 Android Contract Codegen / Generated Binding Fix |
| 权威输入 | [Phase 5A Re-validation](phase-5a-android-contract-revalidation.md)、[Phase 5C.1 CR Review](phase-5c1-contract-review-cr-20260901-001.md)、[CR-20260901-001](../../../contracts/change-requests/CR-20260901-001-android-media-finalization-codegen.md)、锁定 Contract |
| 允许写入 | Android validation-only codegen/gate/test、[STATUS](../STATUS.md) 与 Phase 5A/5A.1 handoff |
| 禁止写入 | OpenAPI/Contract source/metadata/version/SHA、业务文档、Web、Backend、正式 Legacy runtime/transport、infra/deploy |
| 禁止操作 | Commit、Push、Merge、Tag、Phase 7A Legacy Migration |

## 2. Contract 锁定结果

| 检查 | 结果 |
|---|---|
| Contract Version / Status | `1.1.0-contract` / `RC` |
| metadata SHA-256 | `1d538483f96b95d777cc4dd02526b78a214bd663e036ea5a6c77f43dfa38d99d` |
| OpenAPI 实际字节 SHA-256 | `1d538483f96b95d777cc4dd02526b78a214bd663e036ea5a6c77f43dfa38d99d` |
| Contract verify | PASS：109 paths / 121 operations / 192 schemas / 66 errors |
| RC readiness | PASS |
| OpenAPI / metadata / Version / SHA 修改 | 无 |

## 3. 实际根因

问题不是 OpenAPI Schema 或 wire JSON defect。OpenAPI Generator Kotlin 7.24.0 在 `jvm-okhttp4` + Gson 路径中不能忠实处理 OpenAPI 3.1 nullable inline `anyOf`：

- `contentType / byteSize / checksumSha256 / durationMilliseconds / hasAudio / widthPixels / heightPixels` 被生成为非空空 wrapper；
- `rejectionCode` 被生成为空 `MediaAssetRejectionCode`，没有绑定已经生成的 `MediaFinalizationRejectionCode` enum；
- Gson 收到合法 JSON primitive/enum 时尝试按 object wrapper 解码，在生成 DTO 阶段失败；
- 生成日志仍报告 OpenAPI 3.1 beta 与 `Failed to get the schema name: null`，但显式 mapping 后输出类型正确。

因此修复责任在 Android codegen configuration/generated binding gate，不在 Contract、业务规则或 Mapper fallback。

## 4. Codegen 修复

修改 [app/build.gradle.kts](../../../BNBU-ANDROID/app/build.gradle.kts) 中隔离的 `phase5aOpenApiGenerate`，正式旧 runtime 的 `openApiGenerate` 保持不变。

使用官方 `schemaMappings`：

| Inline schema | Kotlin type |
|---|---|
| `MediaAsset_contentType` | `kotlin.String?` |
| `MediaAsset_byteSize` | `kotlin.Long?` |
| `MediaAsset_checksumSha256` | `kotlin.String?` |
| `MediaAsset_durationMilliseconds` | `kotlin.Long?` |
| `MediaAsset_hasAudio` | `kotlin.Boolean?` |
| `MediaAsset_widthPixels` | `kotlin.Int?`；generator 同时复用于 height |
| `MediaAsset_rejectionCode` | `MediaFinalizationRejectionCode?` |

使用官方 `importMappings`：

- key：`MediaFinalizationRejectionCode?`；
- import：`edu.bnbu.student.mvp.phase5a.generated.MediaFinalizationRejectionCode`。

nullable enum 的 import key 必须包含 `?`；否则 Kotlin generator 会错误输出带 `?` 的 import 路径。最终方案没有手写 DTO、没有 generated source 后处理、没有客户端私有字段、没有 old/new fallback。

## 5. Generated binding gate 与可重复生成

`verifyPhase5aGeneratedOpenApiModels` 新增 fail-closed 断言：

- `MediaFinalizationResult` 的 8 个字段类型必须精确为 nullable primitive/enum；
- rejection enum import 必须存在；
- 7 个错误空 wrapper 文件必须不存在；
- 所有 generated Kotlin 继续只位于隔离 test package。

生成任务每次先删除 `app/build/generated/phase5a-contract`，再从固定根 Contract 重生。连续两次实际执行结果：

| 项目 | 第一次 | 第二次 |
|---|---|---|
| Kotlin 文件数 | 195 | 195 |
| source tree SHA-256 | `6dd62f5e716f4dde91fad4f006576587249ef7628f097949ebb0d3649703fa2f` | `6dd62f5e716f4dde91fad4f006576587249ef7628f097949ebb0d3649703fa2f` |

结果：`PASS`，generated binding 可重复生成；generated Kotlin 编译通过。

## 6. Gson fixture 与 Media Finalization re-validation

[Phase5aContractRevalidationTest.kt](../../../BNBU-ANDROID/app/src/test/java/edu/bnbu/student/mvp/phase5a/Phase5aContractRevalidationTest.kt) 先执行 exact-key/status-rejection strict gate，再把同一 `JsonObject` 交给 generated `MediaFinalizationResult` + Gson。

| Fixture | Gson | 关键断言 |
|---|---|---|
| VERIFIED image | PASS | `image/jpeg`、4 bytes、SHA、100×100；duration/audio null；rejection null |
| VERIFIED video | PASS | `video/mp4`、5 bytes、SHA、5000 ms、audio=true、1920×1080；rejection null |
| REJECTED | PASS | probe metadata 全部 null；enum=`MEDIA_CONTENT_INVALID` |
| EXPIRED | PASS | probe metadata 全部 null；enum=`MEDIA_ALLOCATION_EXPIRED` |

四类合法 fixture：`4/4 PASS`。

Media Finalization 受影响场景重新验证：

- 图片/视频 VERIFIED、REJECTED、EXPIRED 的唯一 200 result 通道；
- 503 dependency failure 与预期终态分离；
- 相同结果幂等重放；
- VERIFIED 携带 rejection code、未知终态、REJECTED 缺 code、EXPIRED 错 code 均失败；
- 409 ErrorEnvelope fallback 和额外字段均失败。

结果：`PASS`。Gson 类型本身不承担 JSON Schema 条件/额外字段验证，因此 strict raw-JSON gate 被保留并与 generated DTO 解码串联。

## 7. 测试与构建结果

| 命令 / 门禁 | 真实结果 |
|---|---|
| `:app:phase5aOpenApiGenerate` × 2 | PASS；两次 source tree SHA 完全一致 |
| `:app:verifyPhase5aContractBinding` | PASS |
| `:app:verifyPhase5aGeneratedOpenApiModels` | PASS |
| `:app:compileDebugUnitTestKotlin` | PASS；generated Kotlin 正常编译 |
| Phase 5A 定向 unit | PASS：9/9，0 failed / 0 error / 0 skipped |
| Android 全量 `testDebugUnitTest` | PASS：337/337，0 failed / 0 error / 0 skipped |
| `:app:lintDebug` | PASS：0 error / 31 warning / 1 information；最终以源码和 Contract SHA 相同的 JDK 17 临时镜像执行 |
| `:app:assembleDebug` | PASS；`app-debug.apk` 已生成 |
| `contracts/scripts/verify_contract.py` | PASS：109 / 121 / 192 / 66 |
| `contracts/scripts/check_rc_readiness.py` | PASS |

首次把 lint 与其他门禁合并在原工作区执行时，仓库 daemon criteria 强制使用 JDK 25.0.3，Android Lint 在 `lintAnalyzeDebug` 发生既有内部异常；这不是源码 lint error。为避免修改禁止路径 `gradle/gradle-daemon-jvm.properties`，最终 lint 在 `%LOCALAPPDATA%\Temp` 的机械镜像中使用 Temurin 17 执行，并核对两处修改源码与根 Contract SHA 均和原工作区一致。原仓库 daemon 配置零差异。

未执行 `connectedDebugAndroidTest`：本次修改只进入 validation-only generated test source/config，不进入正式 runtime，现有设备套件也不覆盖该隔离 binding。既有 Phase 5A Pixel_10 `11/11` 仅为历史设备基线，未计入本轮结果。

## 8. Legacy API、Mock 与范围声明

- Legacy API：`REMAINS / NOT MIGRATED`。正式 Android runtime 继续绑定旧 `3.0.0-contract` snapshot 与 hand-written transport。
- Phase 7A：`NOT STARTED`。未迁移 endpoint、DTO、transport 或正式 source set。
- Mock/Fake：既有 debug/local Mock 与模拟扫码入口未改；本轮没有新增产品 Fake Success、私有字段、TODO、stub 或空接口。
- 业务规则：未修改。
- Contract：未修改。
- Web / Backend：未修改。
- Git publication：未 Commit / Push / Merge / Tag。

本次 PASS 只代表当前 Contract 的 Android validation-only generated binding 与 Phase 5A strict fixture/Mock gate，不代表正式 1.1 runtime、真实 Backend/PostgreSQL/COS、设备媒体链路、跨端 E2E、Staging、Production、部署或发布验收。

## 9. 最终判定

```text
完成状态：DONE
修改文件：Android validation-only codegen/gate、Phase 5A strict/generated unit test、STATUS、Phase 5A 与 Phase 5A.1 handoff
执行的测试：Contract verify/readiness；精确 binding；连续两次生成；generated Kotlin compile；Gson 四 fixture；Media Finalization 定向验证；全量 unit；lint；assemble
真实测试结果：生成可重复且编译 PASS；Gson 4/4；Phase 5A 9/9；Android unit 337/337；lint 0 errors；assemble PASS
未执行测试及原因：connected device 未重跑，因为改动不进入正式 runtime 且设备套件不覆盖隔离 binding；Backend/数据库/COS/E2E/Staging/Production 超出本阶段或无真实环境
是否修改了业务规则：否
是否修改了 Contract：否；OpenAPI、metadata、Version、SHA 均不变
是否存在旧 API 引用：是；正式 Android 仍绑定旧 3.0.0 snapshot/transport
是否存在 Mock、TODO、空接口：既有 debug/local Mock 与模拟扫码入口仍存在；无新增产品 Fake/TODO/stub/空接口
下一阶段前置条件：如获明确授权，按 Phase 7A 迁移 Legacy；正式 runtime 绑定后再做 Compose/设备与真实 Backend 验证
Phase 5A 最终状态：PASS (CONTRACT/MOCK RE-VALIDATION)
```
