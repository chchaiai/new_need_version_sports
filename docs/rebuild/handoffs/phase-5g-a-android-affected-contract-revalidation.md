# Phase 5G-A Android Affected Contract Re-validation handoff

> 日期：2026-09-01（Asia/Shanghai）
>
> 完成状态：`DONE`
>
> Phase 5G-A 最终状态：`PASS`

## 1. 执行基线与边界

| 项目 | 结果 |
|---|---|
| Git 根目录 | `C:\Users\23328\Desktop\new_version` |
| 分支 | `API-contract-Making` |
| 起始 HEAD | `3e0f16091307f0a37e055afe8b14b6884367f11e` |
| 起始工作区 | CLEAN；开始时 `git status --short` 无输出 |
| 已读取 AGENTS | 根 [AGENTS.md](../../../AGENTS.md)；Android 范围内无更深层 AGENTS |
| 当前 Phase | Phase 5G-A Android Affected Contract Re-validation |
| 允许写入 | Android validation-only Contract generation 配置、binding/fixture/Phase 5G-A tests、[STATUS](../STATUS.md) 与本 handoff |
| 禁止写入 | OpenAPI、Contract metadata/version/SHA、业务权威、Web、Backend、数据库、正式 Android runtime/Legacy transport、migration/infra/deploy |
| 禁止操作 | Commit、Push、Merge、Tag、Deploy、Phase 7A Legacy Migration |

执行期间工作树中出现了另一组 Web 侧修改和 Phase 5G-B 命名文件；它们不是本阶段创建或修改的内容，也没有被当作业务或 Contract 依据。本阶段保留这些并发差异，所有结论只来自固定 Contract、Android validation-only 路径和本 handoff 明列的测试。

## 2. 权威输入与固定 Contract

已读取根 `AGENTS.md`、`docs/rebuild/STATUS.md`、Phase 5C.2、Phase 5F、Phase 5A、Phase 5A.1、Phase 5D-A handoff、当前 OpenAPI/metadata，以及只读的 Android 正式 runtime 与 Legacy Migration Findings。

| 检查 | 真实结果 |
|---|---|
| Contract Version | `1.2.0-contract` |
| Contract Status | `RC` |
| metadata SHA-256 | `667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a` |
| OpenAPI 实际 SHA-256 | `667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a` |
| Contract verify | PASS：109 paths / 121 unique operations / 193 schemas / 66 errors |
| RC readiness | PASS |
| OpenAPI / metadata / Version / SHA 修改 | 无 |

旧 Android validation gate 首次按原配置运行时因仍期望 `1.1.0-contract` / SHA `1d538483...d99d` 而失败。实际根 Contract 与 metadata 一致，因此该计划内 stale-binding finding 按分流规则归属 `CODEGEN_BINDING`，不是 Contract defect；它已在允许的 validation-only generation/binding 路径内修复，没有形成新的未关闭 Client Defect。

## 3. Validation-only binding 与 codegen

[app/build.gradle.kts](../../../BNBU-ANDROID/app/build.gradle.kts) 新建隔离的 Phase 5G-A 任务与生成包：

- `verifyPhase5gaContractBinding` 直接加载根 `contracts/openapi.yaml` 与 `contract-metadata.json`，fail closed 校验 LF、Version、Status、SHA、`/api/v1`、121 operations 和 metadata 精确字段；
- `phase5gaOpenApiGenerate` 只生成 model，不生成 API/client supporting files，输出到 build 目录和 `edu.bnbu.student.mvp.phase5ga.generated` test-only package；
- `verifyPhase5gaGeneratedOpenApiModels` 校验本阶段受影响 schema、Phase 5A.1 mapping、包边界、CertificationKind、CertificationDetails 和 Password shared schemas；
- Debug unit 编译前自动生成隔离 binding；没有手改 generated DTO，也没有把它放入正式 source/runtime；
- Phase 5A.1 对 Media nullable primitive/enum 的 `schemaMappings/importMappings` 原样保留，7 个错误 wrapper 继续禁止生成。

旧 `phase5a` validation 生成包引用已从历史回归测试切换为本阶段 `phase5ga` 隔离生成包；测试逻辑与正式 runtime 均未迁移。

## 4. Certification schema 精确结果

| 项目 | 结果 |
|---|---|
| `CertificationKind` | 精确只有 `SCHOOL_TEAM`、`STUDENT_CLUB` |
| `UNKNOWN` fallback | 不存在 |
| `CertificationDetails.certificationKind` | required、non-null、generated type 为 `CertificationKind` |
| 任意 String fallback | 不存在 |
| request binding | `CreateCertificationApplicationRequest.certification: CertificationDetails` |
| shared response binding | `StudentApplication.certification: CertificationDetails?`；共享 EXEMPTION/CERTIFICATION response union 允许字段层 nullable，但 CERTIFICATION schema-shaped fixture gate 强制详情存在 |
| Mapper | Phase 5G-A test-only validation mapper 使用穷尽 `when` 映射两枚 enum；无 production mapper 变更 |

## 5. 合法 request、7 个 response surface 与 round-trip

[Phase5gaCertificationContractRevalidationTest.kt](../../../BNBU-ANDROID/app/src/test/java/edu/bnbu/student/mvp/phase5ga/Phase5gaCertificationContractRevalidationTest.kt) 对两枚 kind 分别执行：

```text
generated request DTO
→ Gson JSON
→ strict schema-shaped gate
→ generated request DTO
→ Gson re-serialization
→ response fixture
→ generated response DTO / page DTO
→ explicit validation model
```

Request 结果：

| kind | operation | DTO 构造 | Gson | schema | 字段保持 |
|---|---|---|---|---|---|
| `SCHOOL_TEAM` | `createStudentApplication` | PASS | PASS | PASS | PASS；未改写 |
| `STUDENT_CLUB` | `createStudentApplication` | PASS | PASS | PASS | PASS；未改写 |

Response 结果：

| operationId | response shape | SCHOOL_TEAM | STUDENT_CLUB |
|---|---|---|---|
| `createStudentApplication` | `StudentApplication` | PASS | PASS |
| `supplementStudentApplication` | `StudentApplication` | PASS | PASS |
| `listOwnApplications` | `StudentApplicationPage` | PASS | PASS |
| `getOwnApplication` | `StudentApplication` | PASS | PASS |
| `listCourseApplications` | `StudentApplicationPage` | PASS | PASS |
| `getCourseApplication` | `StudentApplication` | PASS | PASS |
| `decideStudentApplication` | `StudentApplication` | PASS | PASS |

两类 round-trip 均为 `PASS`。全过程没有根据 `organizationOrTeamName`、team/name 字段或旧 subtype 推断，没有默认 SCHOOL_TEAM/STUDENT_CLUB，也没有 UNKNOWN fallback。

## 6. 非法 fixture fail-closed

以下 7 类分别对 request 和 response 验证：

| 非法情况 | Request | Response |
|---|---|---|
| `certificationKind` 缺失 | REJECTED | REJECTED |
| `certificationKind = null` | REJECTED | REJECTED |
| 未知 enum | REJECTED | REJECTED |
| 任意 String | REJECTED | REJECTED |
| 客户端私有 subtype 替代 | REJECTED | REJECTED |
| `CERTIFICATION` 但没有 CertificationDetails | REJECTED | REJECTED |
| extra private field | REJECTED | REJECTED |

Kotlin strict fixture + generated Gson 链路为 `14/14 REJECTED`。另以当前 OpenAPI schema 运行 Draft 2020-12 JSON Schema 独立验证：两类合法 request/response 共 `4/4 PASS`，同一 7×request/response 非法集合 `14/14 REJECTED`。没有为测试增加兼容 fallback 或客户端私有 Contract 字段。

## 7. Password 共享 Contract 影响

Android 没有 Teacher/Admin Password 产品流程，本阶段只验证共享 schema 生成和构建边界：

- `PasswordChangeRequest` 正常生成，Contract 字段为 `currentPassword/newPassword/expectedVersion`；
- `PasswordResetRequest` 正常生成，Contract 字段为 `otpProof/newPassword`；
- `UpdateSubAdminRequest` 正常生成且没有 `newPassword/confirmNewPassword`；
- generated Kotlin、Android unit 与 assemble 均未因 1.2.0 Password schema 变化失败；
- 未新增 Android Password UI、Teacher/Admin 行为、Repository 或网络代码。

结果：`PASS`。

## 8. Deterministic generation 与 generated Kotlin compile

使用相同 Gradle generation + verification 命令连续强制执行两次，并以排序后的相对路径与逐文件 SHA-256 构造 UTF-8 manifest：

| 项目 | 第一次 | 第二次 |
|---|---:|---:|
| Kotlin 文件数 | 196 | 196 |
| manifest SHA-256 | `475fa8f3e67746ca0b4c0d0f359872aa0405001ea22592ba9e7acd71fc758d4a` | `475fa8f3e67746ca0b4c0d0f359872aa0405001ea22592ba9e7acd71fc758d4a` |

结果：`PASS`。`:app:compileDebugUnitTestKotlin` 同时通过，证明 generated Kotlin 可正常编译。Generator 仍输出既有 OpenAPI 3.1 beta 和 `Failed to get the schema name: null` 提示，但 Phase 5A.1 强类型 gate、本阶段模型 gate、编译与运行测试均通过，未出现错误 wrapper 回归。

## 9. 测试与构建证据

| 命令 / 门禁 | 真实结果 |
|---|---|
| `python contracts/scripts/verify_contract.py` | PASS：109 / 121 / 193 / 66 |
| `python contracts/scripts/check_rc_readiness.py` | PASS |
| `:app:verifyPhase5gaContractBinding` | PASS |
| `:app:phase5gaOpenApiGenerate` × 2 | PASS；196 files，两次 manifest SHA 相同 |
| `:app:verifyPhase5gaGeneratedOpenApiModels` | PASS |
| `:app:compileDebugUnitTestKotlin` | PASS |
| Phase 5G-A 定向 unit | PASS：4/4，0 failed / 0 error / 0 skipped |
| Phase 5A 历史回归 unit | PASS：9/9，0 failed / 0 error / 0 skipped |
| Android 全量 `testDebugUnitTest` | PASS：341/341，0 failed / 0 error / 0 skipped |
| OpenAPI Draft 2020-12 fixture validation | PASS：合法 4/4；非法 14/14 均拒绝 |
| `:app:lintDebug` | PASS：0 error / 31 warning / 1 information；最终在同源码与 Contract SHA 的 JDK 17 临时镜像执行 |
| `:app:assembleDebug` | PASS；`app-debug.apk` 已生成 |
| connected-device | `NOT EXECUTED`；validation-only 改动不进入正式 runtime，现有设备套件不覆盖该隔离 binding |

原工作区直接运行 lint 时，Gradle daemon criteria 使用 JDK 25.0.3，Android Lint 在 analysis 前发生内部 JDK 版本异常；这不是源码 lint error。为保持禁止路径 `gradle/gradle-daemon-jvm.properties` 不变，最终在 `%LOCALAPPDATA%\Temp\codex-phase5ga-lint-20260901` 的机械镜像中使用 Temurin 17 运行；已核对 `build.gradle.kts`、两份 Android test、OpenAPI 和 metadata 的 SHA 与原工作区一致。该复验得到 0 error / 31 warning / 1 information，原仓库 daemon 配置未改。

## 10. 正式 Android runtime 与问题分流

- 正式 Android 仍使用 `BNBU-ANDROID/app/openapi/openapi.snapshot.yaml` 与 `contract.properties` 中的旧 `3.0.0-contract`、SHA `020594cb...ace4f` 和 hand-written/runtime transport。
- 状态：`REMAINS / NOT MIGRATED`。
- 未执行 Repository 切换、endpoint 替换、旧 DTO 删除、正式网络链修改或 Phase 7A。
- 旧 runtime 不支持本轮 CertificationKind 不构成新 Contract defect，继续分类为 `LEGACY_MIGRATION`。
- 新 `PROPOSED CONTRACT_CR=0`；新需跟踪 `CLIENT_DEFECT=0`；新 `NEEDS_BUSINESS_DECISION=0`。计划内 stale validation binding finding 1 项已在本阶段修复。
- 本阶段没有修改正式 Android 产品源码、OpenAPI、metadata、业务规则、Web、Backend 或数据库。

## 11. 最终 25 项输出

| # | 要求 | 结果 |
|---:|---|---|
| 1 | Phase 5G-A 最终状态 | `PASS` |
| 2 | Contract Version | `1.2.0-contract` |
| 3 | Contract SHA | `667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a` |
| 4 | binding 是否精确匹配 | 是；Version/Status/SHA/metadata/operation count 全匹配 |
| 5 | generated `CertificationKind` | 精确 `SCHOOL_TEAM/STUDENT_CLUB`，无 UNKNOWN |
| 6 | required/non-null | PASS；typed enum，无 String fallback |
| 7 | SCHOOL_TEAM request | PASS |
| 8 | STUDENT_CLUB request | PASS |
| 9 | 7 个 response surface | 7/7 PASS，两类均覆盖 |
| 10 | round-trip | 两类均 PASS |
| 11 | 非法 fixture | request 7/7 + response 7/7 均拒绝 |
| 12 | generated Kotlin compile | PASS |
| 13 | deterministic generation | PASS；196 files，两次 manifest SHA 相同 |
| 14 | 定向 unit | PASS：4/4 |
| 15 | Android 全量 unit | PASS：341/341 |
| 16 | lint | PASS：0 error / 31 warning / 1 information |
| 17 | assembleDebug | PASS；APK 已生成 |
| 18 | connected-device | `NOT EXECUTED`；仅 validation-only binding/test 改动 |
| 19 | 是否修改 OpenAPI | 否 |
| 20 | 是否修改业务规则 | 否 |
| 21 | 是否执行 Legacy Migration | 否；`REMAINS / NOT MIGRATED` |
| 22 | 新增 Contract CR 数量 | 0 |
| 23 | 新增 Client Defect 数量 | 0 个需跟踪的新 defect；另有计划内 stale pin finding 1 项，已作为 CODEGEN_BINDING 在本阶段修复 |
| 24 | 新增 NEEDS_BUSINESS_DECISION 数量 | 0 |
| 25 | 是否满足通过条件 | 是；全部必需条件满足 |

## 12. Phase 结束报告

```text
完成状态：DONE
修改文件：BNBU-ANDROID/app/build.gradle.kts；BNBU-ANDROID/app/src/test/java/edu/bnbu/student/mvp/phase5a/Phase5aContractRevalidationTest.kt；BNBU-ANDROID/app/src/test/java/edu/bnbu/student/mvp/phase5ga/Phase5gaCertificationContractRevalidationTest.kt；docs/rebuild/STATUS.md；本 handoff
执行的测试：Contract Version/SHA binding；Contract verify；RC readiness；Android Contract generation；连续两次 deterministic generation；generated Kotlin compile；Phase 5G-A Certification 定向 unit；合法/非法 fixture；Gson serialization/deserialization；round-trip；Phase 5A 回归；Android 全量 unit；lint；assembleDebug
真实测试结果：binding PASS；Contract 109/121/193/66 与 readiness PASS；两类 request、7 个 response surface、两类 round-trip PASS；非法 request/response 14/14 拒绝；generated compile PASS；定向 4/4、Phase 5A 9/9、全量 341/341；lint 0 error；assemble PASS
未执行测试及原因：connected-device NOT EXECUTED，因为本轮改动只进入 validation-only generated test source/config，未进入正式 runtime；真实 Backend/PostgreSQL、跨端 E2E、Staging、Production 与部署均超出本阶段
是否修改了业务规则：否
是否修改了 Contract：否；OpenAPI、metadata、Version、Status、SHA 均不变
是否存在旧 API 引用：是；正式 Android 旧 3.0.0-contract snapshot/transport 仍存在，分类 LEGACY_MIGRATION，本阶段未迁移
是否存在 Mock、TODO、空接口：既有 debug/local Mock、Legacy client 与 Backend 占位保持；本轮没有新增产品 Fake Success、TODO、stub 或空接口
下一阶段前置条件：Phase 7A 必须单独授权；正式 runtime 迁移后重新执行正式 mapper/network/Compose/device/Backend 验证；任何 Contract 漂移先重新锁定 Version/SHA
```

本 handoff 的 `PASS` 只证明固定 `1.2.0-contract` 在 Android validation-only generated binding 上的受影响范围可生成、可编译并按 fixture 正确消费；不代表正式 Android runtime、真实 Backend/数据库、设备、Staging、Production、部署或发布验收。
