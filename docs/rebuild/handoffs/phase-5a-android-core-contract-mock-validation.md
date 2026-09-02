# Phase 5A Android：核心 Contract 与轻量 Mock 验证 handoff

> 日期：2026-08-31（Asia/Shanghai）
>
> 完成状态：`PARTIAL`（初次检查 BLOCKED；后续 CR 全量续审 DONE；严格 Mock/Contract 修复 NOT EXECUTED）
>
> 当前结论：初次检查因 `CR-20260831-001` 停止实现；用户随后授权继续审查其他互不依赖场景，最终得到 4 份唯一 `PROPOSED` CR。权威收口见 [Android Contract CR Bundle](android/contract-cr-bundle.md) 与 [Legacy Migration Findings](android/legacy-migration-findings.md)。

> 本文件第 1～8 节保留初次检查的历史证据；第 9 节记录续审收口。续审仍未修改 Android 源码、OpenAPI、Contract 版本或 SHA。

## 1. Phase 开场基线

| 项目 | 结果 |
|---|---|
| Git 根目录 | `C:\Users\23328\Desktop\new_version` |
| 分支 | `API-contract-Making` |
| 起始 HEAD | `ab7dbec139bd5a14896ac41a4ca6b9eb17442bd3` |
| 起始工作区 | CLEAN；`git status --short --branch` 仅为 `## API-contract-Making` |
| 已读取 AGENTS | 根 [AGENTS.md](../../../AGENTS.md)；Portal 子目录规则不适用于本轮 Android 写入范围 |
| 权威输入 | [STATUS](../STATUS.md)、[Phase 0B scope](../00-scope.md)、四份 [业务权威](../../business/README.md)、[Phase 4 Contract handoff](phase-4-api-contract.md)、Contract metadata/README/coverage/database support/OpenAPI |
| 允许实现目录 | `BNBU-ANDROID/`；治理输出为 `docs/rebuild/STATUS.md`、`docs/rebuild/handoffs/`；Contract 不足时只提交 CR |
| 禁止实现目录 | Web、Backend、Contract source/OpenAPI/metadata、业务文档、数据库、infra、E2E |

## 2. 唯一 Contract 基线

| 项目 | 结果 |
|---|---|
| Version | `1.0.0-contract` |
| Status | `RC` |
| public base path | `/api/v1` |
| OpenAPI SHA-256 | `ff15441b84f0729626a49c6898ea4896e80321b8e873a933768a509fd4c8478f` |
| 规模 | `109 paths / 120 operations / 183 schemas / 66 errors` |
| 本轮是否修改 Contract 内容 | 否；只新增 `PROPOSED` Change Request，OpenAPI/source/metadata 均未修改 |

## 3. 核心页面低成本矩阵

| 页面 / 状态 | UI 需要 | Contract 提供 | 结论 |
|---|---|---|---|
| 登录成功 | access/refresh token、到期时间、当前 actor | `createStudentSession → 201 SessionTokenPair` | `PASS (STATIC)` |
| 登录错误 | 稳定 code、公开 message、requestId、可空安全 details | 各失败响应统一 `ErrorEnvelope`；operation 声明登录错误集合 | `PASS (STATIC)` |
| 课程列表空状态 | 当前学生可能没有活动课程，不能合成课程 | `StudentDashboard.course` 与 `progress` 都可为 null；`studentStatus=PENDING` 可表达已退班 | `PASS (STATIC)`；学生当前课程闭集为 0 或 1，不需要客户端私有列表字段 |
| 课程内容/详情 | 课程、当前学期、责任教师、打卡时间、两类目标 | `StudentCourse`、`SemesterSummary`、`TeacherSummary`、`StudentCourseTargets` | `PASS (STATIC)` |
| Session 内容 | ACTIVE/PAUSED/COMPLETED、服务端业务日期/时间/时长/version | `ExerciseSession`；`200` 已声明 | `PASS (STATIC)` |
| Session 空状态 | 没有 ACTIVE/PAUSED 时回到 Idle/可开始，不得显示假 Session | operation description 写 404，但 responses 无 404，error codes 无 `RESOURCE_NOT_FOUND` | `BLOCKED` |
| Session 错误 | 入班、课程、时间窗、目标、重复 Session、维护/依赖错误 | `startExerciseSession` 的 operation errors + `ErrorEnvelope` | `PASS (STATIC)` |
| Record 提交 | 客户端只提交分类、1–200 字说明、已验证 media IDs | `SubmitExerciseRecordRequest` 只有 `category / description / mediaAssetIds`，且 `additionalProperties=false` | `PASS (STATIC)`；不得提交时长、业务日期、计入分钟或审核结果 |
| Record 成功 | 服务端实际时长、0/60/120 计入分钟、业务日期、媒体、默认 VALID | `ExerciseRecord` 分离返回上述字段 | `PASS (STATIC)` |
| 个人记录内容/空状态 | 可分页记录；零记录显示空，不伪造记录 | `ExerciseRecordPage.items` 为无 `minItems` 的 array，允许 `[]`；cursor 可空 | `PASS (STATIC)` |
| 通用失败 | 区分真实错误和可重试依赖失败 | `ErrorEnvelope` + operation-specific `x-error-codes` | `PASS (STATIC)`；只有已声明的 Session-empty 组合才可映射 Idle |

## 4. Contract blocker

`GET /api/v1/student/exercise-sessions/active` / `getOwnActiveExerciseSession` 当前同时存在：

- description：`Returns ... or 404 when none exists.`；
- responses：只有 `200 / 401 / 403 / 429 / 500 / 503`；
- `x-error-codes`：没有 `RESOURCE_NOT_FOUND`。

严格 Mock 因而不能为“无进行中 Session”选择合法的 status/schema/error code。Android 若使用 `200 null`、空对象、客户端 `NO_ACTIVE_SESSION` 或合成 Idle Session，都会违反 RC Contract 或本 Phase 禁止私有字段/假成功的规则。

已提交 [CR-20260831-001](../../../contracts/change-requests/CR-20260831-001-active-session-empty-state.md)，建议保持成功 DTO 不变，新增 operation 级 `404 ErrorEnvelope + RESOURCE_NOT_FOUND`。该建议仍是 `PROPOSED`，不等于 Contract 已批准或已修改。

## 5. Android 与 Web 当前边界

| 客户端 | 当前绑定 | 与 RC 的关键差异 | 结论 |
|---|---|---|---|
| Android | `3.0.0-contract` / SHA `020594cb6c0dc220bf96f30326a04144cb8081ec44f56bc8b3746ea4001ace4f` | 正式运行时和旧生成模型尚未加载 `1.0.0-contract` | 未迁移；本轮因 CR 门禁停止 |
| 学生 Web / Portal | Portal metadata 为 `3.0.0-web-snapshot`；学生端仍使用旧 API adapter | 旧 Web Record 使用 `creditedDurationSeconds`、`publicComment` 等；RC 使用 `creditedMinutes`、`studentVisibleReason` | 跨端实际对齐未通过；必须在独立 Web Phase 重载同一新 Contract |

可共享且已确认的语义基线为：

- `actualDurationSeconds` 是服务端实际运动事实；
- `creditedMinutes` 只能是 `0 / 60 / 120`，不能由客户端从实际时长重新推导；
- `businessDate` 是服务端开始 Session 时固定的上海日历日期；
- `currentReview.result` 只有 `VALID / INVALID`，原因字段为 `studentVisibleReason`；
- 进度使用整数分钟和按类别封顶；`displayPercent` 只用于显示；
- `SubmitExerciseRecordRequest` 不接收上述服务端事实。

这张语义表是后续 Android/Web 的共同输入，不证明当前两个客户端已经加载或运行 RC。

## 6. 数据库支持边界

[Contract database support](../../../contracts/database-support.md) 静态记录：

- Session 有 `ACTIVE/PAUSED/COMPLETED`、active intervals、进行中 partial unique、数据库时钟与上海 business date；
- Record/媒体/Review 有 Session/Record 唯一、每日唯一、媒体 aggregate、append-only Review/current state；
- 学时统计有相应 view 与索引；
- 查询、幂等和并发只达到 `DESIGN-SUPPORTED`。

因此数据库设计可以支持核心查询和“零行或唯一一条进行中 Session”，但没有 migration、运行中 PostgreSQL、query plan、事务或并发测试。本 Phase 的数据库结论只能是 `PASS (STATIC DESIGN) / RUNTIME NOT EXECUTED`。

## 7. 验证结果

| 验证 | 真实结果 |
|---|---|
| 核心 schema/operation 静态检查 | 登录、课程内容、课程空状态、Session 内容、Record 请求/响应、个人记录空状态均 PASS；Session 空状态 BLOCKED |
| Contract SHA | 当前仍为 `ff15441b84f0729626a49c6898ea4896e80321b8e873a933768a509fd4c8478f` |
| `verify_contract.py` | PASS；`109 paths / 120 unique operations / 183 schemas / 66 error codes` |
| `check_rc_readiness.py` | PASS；当前仍无业务 decision PENDING，Contract status 仍为 RC；这不批准本轮新建的 PROPOSED CR |
| Android 基线 `:app:testDebugUnitTest` | `FAIL`；328 tests 中 1 个失败：`AcceptedContractStaticPolicyTest.semesterUiUsesPublicLabelsAndWrapsWithoutInternalIdFallback`。测试在本轮任何文件修改前执行，因此是起始 HEAD 的既有失败；本轮未越权顺带修复 |
| Android OpenAPI/compile 前置 | `:app:verifyOpenApiContractBinding :app:compileDebugKotlin` PASS；这只验证当前旧 Android snapshot，不验证 RC Mock |
| 文档质量 | `git diff --check`、严格 UTF-8、Markdown 相对链接检查均 PASS |
| Backend/数据库/设备/浏览器/E2E/Staging | `NOT EXECUTED`；无实现且不属于本轮授权 |

## 8. 初次检查结束状态（历史）

```text
完成状态：BLOCKED
修改文件：Contract CR、STATUS、本 handoff；Android 实现文件 0
执行的测试：核心 Contract 静态检查、Android testDebugUnitTest 基线、Contract SHA/结构复核
真实测试结果：核心 8 项静态检查 PASS，Session 空状态 BLOCKED；Android 328 tests 中 1 个既有失败
未执行测试及原因：未创建 RC Mock，故无 Mock UI/设备测试；Backend/数据库/Web/E2E/Staging 均越出本轮实现范围
是否修改了业务规则：否
是否修改了 Contract：否；只新增 PROPOSED CR
是否存在旧 API 引用：是；Android 与 Web 均仍绑定旧 3.0.0 snapshot/adapter
是否存在 Mock、TODO、空接口：现有 debug/local Mock 仍存在且未改；本轮未新增 RC Mock、TODO 或空接口
下一阶段前置条件：接受/拒绝 CR；若接受，提升 Contract 版本并生成新 SHA；Android 和 Web 再分别重载同一版本
```

## 9. CR 全量续审收口

用户授权在保留 CR-001 的前提下继续检查其他互不依赖页面与 Use Case，并新增一项强制判定：旧 API、旧 DTO 或旧 Contract 命中只有在新 Contract 自身缺 operation、字段、状态码、错误码或业务所需语义时才可成为 CR；新 Contract 已完整支持的项目一律记为 `LEGACY_MIGRATION`。

续审结果：

- `BLOCKING`：CR-001（活动 Session 空态）、CR-002（媒体 finalization 拒绝通道）、CR-003（PENDING 稳定本人资料投影）；
- `LOCAL`：CR-004（邀请码终止状态通道）；
- `DUPLICATE`：活动 Session 空态再次命中既有 CR-001，没有重复创建；
- `NOT_CONTRACT_DEFECT`：旧密码登录、FCM/system Push、学生手工耐力换算、增加 60 分钟、Session cancel、Record Draft/重提/attempt、旧申请草稿、资料编辑、永久媒体 URL、批量通知便利接口等，不据旧结构反向要求新 Contract 兼容；
- `LEGACY_MIGRATION`：当前 RC 已完整支持的认证、课程、Session 内容、Record、进度、成绩、申请、反馈、帮助、通知和账号安全边界，只需后续迁移客户端。

完整证据分为两个文件：

1. [Android Contract CR Bundle](android/contract-cr-bundle.md)：四份 CR、通过场景、阻塞映射、未验证范围与下一阶段门禁；
2. [Android Legacy Migration Findings](android/legacy-migration-findings.md)：逐项回答新 operation 是否存在、语义是否完整，并区分 `LEGACY_MIGRATION / PROPOSED CR / NOT_CONTRACT_DEFECT / BUSINESS PENDING`。

续审过程中，共享分支 HEAD 由另一 Phase 5B 任务从 `ab7dbec139bd5a14896ac41a4ca6b9eb17442bd3` 推进至 `81f45feb441a9e5ddba0e265eac98e1c4d3eee48`。本任务保留该并发提交，没有 reset、stash 或覆盖；根 OpenAPI SHA 仍为 `ff15441b84f0729626a49c6898ea4896e80321b8e873a933768a509fd4c8478f`。

```text
完成状态：PARTIAL（CR AUDIT DONE；严格 Mock/Contract 修复 NOT EXECUTED）
修改文件：CR-001～004、STATUS、本 handoff、Android Contract CR Bundle、Legacy Migration Findings；Android 实现文件 0
执行的测试：Contract verify/readiness/SHA；Android binding/compile/full unit；文档与修改范围检查
真实测试结果：Contract 校验 PASS；Android binding/compile PASS；Android unit 328 tests 中 1 个既有失败
未执行测试及原因：未创建 RC Mock，故无 Compose/设备 Mock 验证；Backend/数据库/学生 Web/E2E/Staging 超出本轮授权或无实现
是否修改了业务规则：否
是否修改了 Contract：否；只保留/新增 PROPOSED CR，版本和 SHA 未变
是否存在旧 API 引用：是；已按 Legacy Migration Findings 分类，不自动转成 CR
是否存在 Mock、TODO、空接口：既有项仍存在且未改；本轮未新增 Mock、假数据、私有字段、TODO、stub 或兼容逻辑
下一阶段前置条件：独立评审 CR；接受项提升 Contract 版本并生成新 SHA；Android/Web 重载同一版本后再做严格 Mock 与运行验证
```
