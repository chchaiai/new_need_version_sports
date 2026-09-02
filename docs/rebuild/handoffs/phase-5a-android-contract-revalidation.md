# Phase 5A Android Contract Re-validation handoff

> 日期：2026-09-01（Asia/Shanghai）
>
> 完成状态：`PASS`（Contract/Mock Re-validation scope）
>
> 最终结论：Phase 5A.1 已用官方 `schemaMappings` / `importMappings` 修复 Android validation-only 生成链；固定 `1.1.0-contract` 可重复生成、编译，并由 Gson 正确反序列化四类合法 `MediaFinalizationResult`。原 generated binding blocker 已解除，Phase 5A Re-validation 更新为 `PASS`。正式 Android runtime 仍绑定旧 `3.0.0-contract`，按明确边界继续记录为 Legacy Migration Finding，不视为已迁移。

## 1. Phase 开场基线与写入边界

| 项目 | 结果 |
|---|---|
| Git 根目录 | `C:\Users\23328\Desktop\new_version` |
| 分支 | `API-contract-Making` |
| 起始 HEAD | `18782a5fa909c03179a72611f159a41e4f2c8dd8` |
| 起始工作区 | CLEAN；`git status --short --branch` 仅为 `## API-contract-Making` |
| 已读取 AGENTS | 根 [AGENTS.md](../../../AGENTS.md)；Portal 子目录 AGENTS 只读识别，本 Android 写入不适用其局部规则 |
| 当前 Phase | Phase 5A Android Re-validation |
| 权威输入 | 根 AGENTS、[STATUS](../STATUS.md)、四份 [业务权威](../../business/README.md)、[Phase 5C handoff](phase-5c-contract-cr-consolidation.md) 第 10 节、既有 [Phase 5A handoff](phase-5a-android-core-contract-mock-validation.md)、Android CR Bundle/Legacy Migration Findings、锁定 Contract |
| 允许修改 | `BNBU-ANDROID/` 中本次 validation-only binding/test；发现新缺陷时仅新增 `contracts/change-requests/*.md`；本 STATUS/handoff |
| 禁止修改 | `contracts/openapi.yaml`、Contract source/metadata/version/SHA、业务文档、Web、Backend、数据库、infra/deploy、正式 Legacy API 迁移 |
| 完成标准 | 精确绑定指定 Version/SHA；逐项重验 Phase 5C Android 清单；全量 unit/lint/assemble 和设备基线；新缺陷只提交 PROPOSED CR；诚实判定是否最终通过 |

执行期间共享工作区出现另一任务的 Phase 5B Web 变化，并由该任务把共享分支 HEAD 推进到 `dc01d535cbfa6e0fece51e2a4cde5a2b02e4c13b`。本任务只读识别并原样保留，没有修改、暂存、回滚或把它们计入 Android 结果。

## 2. Contract Version / SHA binding

| 检查 | 状态 | 真实结果 |
|---|---|---|
| 根 Contract metadata | PASS | `1.1.0-contract` / `RC` / `/api/v1` / `121 operations` / `66 errors` |
| 根 OpenAPI 字节 SHA | PASS | LF 文件实际 SHA-256 为 `1d538483f96b95d777cc4dd02526b78a214bd663e036ea5a6c77f43dfa38d99d`，与指定值和 metadata 完全一致 |
| 隔离 Android validation binding | PASS | `verifyPhase5aContractBinding` 对版本、SHA、LF、`/api/v1` 和 121 operations fail-closed；`phase5aOpenApiGenerate` 使用 Kotlin 7.24.0、`jvm-okhttp4`、Gson 与官方 mappings 生成 model-only test source；195 个 Kotlin 文件连续两次重生的 source-tree SHA 均为 `6dd62f5e716f4dde91fad4f006576587249ef7628f097949ebb0d3649703fa2f`；没有 old/new fallback、生成后改写或手写 DTO |
| 正式 Android runtime binding | LEGACY FINDING / NOT MIGRATED | `app/openapi/contract.properties` 仍为 `3.0.0-contract` / SHA `020594cb6c0dc220bf96f30326a04144cb8081ec44f56bc8b3746ea4001ace4f` / 133 operations。它与根 1.1 Contract 仅 14 个 operationId 重合；当前 main source 使用的 68 个旧 generated model 中有 57 个在 1.1 生成模型中不存在。直接替换会实质迁移 Legacy API，超出本阶段授权，但按 Phase 5A.1 明确边界不再作为 validation-only finalization binding 的 blocker |
| OpenAPI/Contract 修改 | PASS (UNCHANGED) | `contracts/openapi.yaml`、`contracts/src/`、`contract-metadata.json` 均无本任务修改；没有原地覆盖版本或 SHA |

因此，隔离 re-validation 能证明指定 Contract 的场景和生成问题，但不能把正式 Android 客户端宣告为已绑定 1.1。

## 3. Phase 5C Android 场景矩阵

| 场景 | 状态 | 真实验证结果 |
|---|---|---|
| Active Session | PASS (STRICT FIXTURE) | `200 ExerciseSession`、`404 RESOURCE_NOT_FOUND → Idle`、`201 start` 均分离；401 认证和 503 维护/依赖错误不会误映射为 Idle；Idle 后 start 返回真实 Session；额外旧字段被拒绝 |
| StudentDashboard ACTIVE/PENDING | PASS (STRICT FIXTURE) | 两种状态均保留 required `student`；`course=null`、`progress=null` 不丢失本人资料；根 `studentStatus` 与 `student.studentStatus` 不一致被拒绝；nested extra field 被拒绝 |
| 邀请预览 | PASS (STRICT FIXTURE) | `ACTIVE / EXPIRED / REVOKED / COURSE_CLOSED / NOT_CURRENT` 五种状态均为 `200 CourseInvitationPreview`；未知/畸形 code 为 `422 INVITATION_INVALID`；扫码和手输走同一解码结果；额外兼容字段被拒绝 |
| Media allocation / upload | PASS (MOCKWEBSERVER) | 图片和视频都按 Contract 的 `PUT + exact requiredHeaders + byte body` 上传；过期 allocation 必须取得 replacement 后才上传；实际请求 method/path/header/body 均被断言 |
| Media finalization wire invariants | PASS (STRICT JSON) | 图片/视频 `VERIFIED`、内容 `REJECTED`、allocation `EXPIRED`、503 dependency failure、相同结果幂等重放均覆盖；预期拒绝/过期只走 `200 MediaFinalizationResult`，409 ErrorEnvelope fallback、非法 status/rejection 组合与额外字段均被拒绝 |
| Media finalization generated binding | PASS | nullable primitive 映射为 `String? / Long? / Boolean? / Int?`，rejection code 映射并导入既有 `MediaFinalizationRejectionCode?`；7 个错误空 wrapper 不再生成。Gson 对 VERIFIED 图片、VERIFIED 视频、REJECTED、EXPIRED 四类 fixture `4/4` 通过并逐项保留 metadata/null/enum |
| Current semester | PASS (STRICT FIXTURE) | `200 SemesterSummary`、`404 RESOURCE_NOT_FOUND → Absent` 与 `503 DEPENDENCY_UNAVAILABLE` 清晰区分，没有把依赖故障伪装为空态 |
| 额外字段 / 双 response fallback | PASS | strict key gate 拒绝测试 fixture 的 `legacyFallback / legacyProfile / fallbackCourseName / legacyError`；finalization 不接受已撤销的预期 ErrorEnvelope 通道 |

上述是本地隔离 Contract fixture/Mock 验证，不是 Backend、PostgreSQL、COS、权限、跨端 E2E、Staging 或 Production 验收。

## 4. Contract Review 与 Android 修复结论

[CR-20260901-001](../../../contracts/change-requests/CR-20260901-001-android-media-finalization-codegen.md) 在 Phase 5C.1 最终判定为 `REJECTED / NOT_CONTRACT_DEFECT`。公共 Contract、wire JSON 与四类 fixture 均正确；缺陷归属于 Kotlin generator 对 OpenAPI 3.1 nullable inline `anyOf` 的 generated binding/configuration。

Phase 5A.1 因此只修改 `phase5aOpenApiGenerate` 的官方 `schemaMappings` / `importMappings` 和 generated binding test/gate，不修改 OpenAPI、Version、SHA、业务规则或 wire shape，也没有增加客户端 shim、私有字段或生成后改写。详细实现证据见 [Phase 5A.1 handoff](phase-5a1-android-contract-codegen-fix.md)。

## 5. 测试结果

| 命令 / 验证 | 真实结果 |
|---|---|
| `python contracts/scripts/verify_contract.py` | PASS：109 paths / 121 unique operations / 192 schemas / 66 error codes |
| `python contracts/scripts/check_rc_readiness.py` | PASS：无业务 decision PENDING，status 为 RC |
| Redocly lint | 既有 Phase 5A PASS；Phase 5A.1 未重跑，因为 OpenAPI bytes/SHA 完全未变 |
| `:app:verifyPhase5aContractBinding` | PASS：指定 Version/SHA/LF/base path/operation count 均一致 |
| `:app:verifyPhase5aGeneratedOpenApiModels` | PASS：受影响的隔离 Kotlin models 均生成且只位于 test package；8 个 nullable binding 类型、enum import 与 7 个禁止 wrapper 均有 fail-closed 断言 |
| Phase 5A 定向 unit | PASS：9/9，0 failed / 0 error / 0 skipped；Gson 对四类合法 media fixtures `4/4`，strict gate 对未知终态和非法 status/rejection/extra-field 组合继续失败 |
| Android 全量 unit | PASS：337/337，0 failed / 0 error / 0 skipped |
| 已记录的旧 unit failure | FIXED (TEST ASSERTION ONLY) | 首次重跑复现旧 `AcceptedContractStaticPolicyTest` 失败；生产实现已经使用 `return safeSemesterYearTermLabel()`，测试却仍搜索旧调用文本。只修正陈旧静态断言，未改变产品逻辑或业务规则 |
| `:app:lintDebug` | PASS：0 errors / 31 warnings / 1 information。原工作区首次尝试被 daemon JDK 25.0.3 的 Android Lint 内部异常阻断；最终在源码/Contract SHA 相同的 JDK 17 临时镜像重跑成功，原工作区 daemon 配置未修改 |
| `:app:assembleDebug` | PASS |
| `:app:connectedDebugAndroidTest` | Phase 5A.1 未重跑：本次只改 validation-only generated test source/config，不进入产品 runtime；既有 Pixel_10 AVD / `android-37.1` 的 11/11 仅作为历史设备基线，不计作本轮结果 |

设备套件是现有 UI/安全存储基线，不是 1.1 正式 runtime 集成证明；其中既有 `scanEntry_offersAnIsolatedSimulatedSuccessPreview` 明确覆盖开发隔离模拟入口，不能当作真实扫码成功或 Backend 证据。

## 6. Legacy API / Mock 状态

- Legacy API：`REMAINS / NOT MIGRATED`。正式 Android 仍使用旧 hand-written OkHttp/Gson transport 和旧 `3.0.0-contract` generated snapshot；本轮没有删除 endpoint、替换 DTO、改 transport 或增加兼容层。
- 正式客户端 1.1 binding：`NOT ACHIEVED`。隔离 test binding 不进入 main source set，不能冒充产品迁移。
- 既有 Mock/Fake：现有 debug/local Mock、模拟扫码成功等仍存在且未改；本轮新增的只有 test source 中的 strict fixtures/MockWebServer，没有新增产品 Fake Success、客户端私有字段、TODO、stub 或空接口。
- 业务规则：未修改。
- Contract：未修改；原 CR 已被判定为 `REJECTED / NOT_CONTRACT_DEFECT`，本轮没有新增 CR。

## 7. 最终通过条件判定

`PASS (CONTRACT/MOCK RE-VALIDATION)`。Phase 5A.1 已解除最后一个属于本 validation scope 的 generated media binding blocker：

1. 固定 `1.1.0-contract` 的 validation binding 可重复生成，generated Kotlin 编译通过，Gson 对四类合法 fixture `4/4` 成功；不再存在手写 DTO、生成后改写或 old/new fallback。
2. 正式 Android main/runtime 仍未锁定 1.1；它明确保留为 Phase 7A Legacy Migration Finding，不冒充已完成产品迁移，也不反向阻塞本次 validation-only codegen 修复的 PASS。

下一阶段前置条件：

1. 在明确授权的 Phase 7A Android Slice 中逐步迁移 Legacy endpoint/DTO/transport；不得直接用根 Contract 覆盖旧 snapshot 后补客户端兼容字段。
2. 只有正式 runtime Slice 绑定当前 Contract 后，才执行 Compose/真实设备 media integration；validation-only test binding 不能作为产品证明。
3. Backend/PostgreSQL/COS 可用后另行执行 conformance、权限、maintenance fail-closed、幂等、真实上传、事务/并发、跨端 E2E 与 Staging gate。

```text
完成状态：DONE；Phase 5A 最终状态 PASS (CONTRACT/MOCK RE-VALIDATION)
修改文件：Android validation-only Gradle codegen/gate、Phase 5A strict/generated unit test、STATUS、Phase 5A 与 Phase 5A.1 handoff
执行的测试：Contract verify/readiness；精确 binding/生成；连续两次重生摘要；generated Kotlin compile；Gson 四 fixture；定向与全量 unit；lint；assemble
真实测试结果：Contract 109/121/192/66 与 readiness PASS；两次生成摘要一致；Phase 5A 9/9；Gson 4/4；Android unit 337/337；lint 0 errors；assemble PASS
未执行测试及原因：connected device 未重跑，因为改动只进入 validation-only test source；正式 1.1 runtime/Legacy 迁移未授权；Backend/数据库/COS/跨端 E2E/Staging/Production 超出本阶段或无真实环境
是否修改了业务规则：否
是否修改了 Contract：否；OpenAPI、metadata、Version、SHA 均不变
是否存在旧 API 引用：是；正式 Android 仍绑定旧 snapshot/transport
是否存在 Mock、TODO、空接口：既有 debug/local Mock 与模拟扫码入口仍存在；本轮仅更新 test-only strict fixtures，无新增产品 Fake/TODO/stub/空接口
下一阶段前置条件：如获授权，按 Phase 7A 迁移 Legacy；正式 runtime 绑定后再做 Compose/设备与真实 Backend 验证
```
