# Phase 5C.2-B Android CR Independent Review Handoff

> 日期：2026-09-01
>
> 完成状态：`DONE`
>
> 固定 Contract：`1.1.0-contract` / `RC`
>
> 固定 SHA-256：`1d538483f96b95d777cc4dd02526b78a214bd663e036ea5a6c77f43dfa38d99d`

## 1. 结论先行

| 来源 CR | 正式记录 | 最终状态 | 是否 Contract defect | 核心结论 |
|---|---|---|---|---|
| `CR-5DA-001` | [CR-20260901-003](../../../contracts/change-requests/CR-20260901-003-certification-kind-round-trip.md) | `ACCEPTED` | 是 | 当前 `CertificationDetails` 无法无损提交/回显 `SCHOOL_TEAM / STUDENT_CLUB`；新增 required/non-null closed enum |
| `CR-5DA-002` | [CR-20260901-004](../../../contracts/change-requests/CR-20260901-004-student-dashboard-no-current-semester.md) | `REJECTED / NOT_CONTRACT_DEFECT` | 否 | 合法 Student actor 与 no-current 不可同时到达；原提案混入旧 Android nullable workspace/mapper 假设 |

统计：`ACCEPTED=1`、`REJECTED=1`、`PARTIALLY_ACCEPTED=0`、`NEEDS_BUSINESS_DECISION=0`。

## 2. Phase 基线、写入边界与输入完整性

| 项目 | 结果 |
|---|---|
| Git 根目录 | `C:\Users\23328\Desktop\new_version` |
| 分支 / 起始 HEAD | `API-contract-Making` / `9d8a773bf8ef8097efc05b6d4571485b62b50333` |
| 起始工作树 | clean：`## API-contract-Making` |
| 已读取 AGENTS.md | 根 `AGENTS.md`；Android 下无嵌套 AGENTS；Portal 嵌套 AGENTS 只识别，未进入其写入范围 |
| 允许修改 | 两份正式 CR 评审记录、本 handoff、`docs/rebuild/STATUS.md` |
| 禁止且未修改 | OpenAPI、Contract metadata/source/Version/SHA、业务文档、Android/Web/Backend、Domain/数据库设计、Mock、migration 与部署文件 |
| 原 CR 文件完整性 | Phase 5D-A 没有建立独立 CR 文件；只有 handoff 第 6 节的两个嵌入式提案。为满足 RC 后 CR 治理，本 Phase 保留来源编号并补建一份 ACCEPTED 和一份 REJECTED 正式记录 |

权威输入已读取并对照：根规则、本 STATUS、[Phase 5D-A handoff](phase-5d-a-android-full-contract-surface-audit.md)、两个嵌入式提案、四份业务权威、[Phase 3 Domain/Database Design](../../architecture/phase-3-domain-and-database-design.md)、[Phase 5C consolidation](phase-5c-contract-cr-consolidation.md)、[CR-011](../../../contracts/change-requests/CR-20260831-011-current-semester-absence-channel.md)、[Password CR](../../../contracts/change-requests/CR-20260901-002-password-contract.md)、当前 [OpenAPI](../../../contracts/openapi.yaml)、metadata/database-support，以及 Android 当前页面、Use Case、legacy gateway 和锁定 1.1 model-only binding。

旧 API、旧 DTO 和旧 `ApplicationSubtype` / nullable workspace 仅作为 `Legacy Migration Evidence`；没有作为 Contract Authority。

## 3. 固定 Contract 基线

| 检查 | 结果 |
|---|---|
| Version | `1.1.0-contract` |
| Status | `RC` |
| metadata SHA | `1d538483f96b95d777cc4dd02526b78a214bd663e036ea5a6c77f43dfa38d99d` |
| 实际 OpenAPI SHA | 精确匹配 metadata 和固定值 |
| 结构 | 109 paths / 121 unique operations / 192 schemas / 66 errors |
| 本阶段 Contract 修改 | **无** |

## 4. CR-5DA-001 Review

### 4.1 最终状态与根因

`ACCEPTED`。这是 Contract defect，不是单纯 Android UI、Mapper、codegen 或旧 API 差异。

根因是共享 request/response schema 缺少正式认证子类。`ApplicationType=CERTIFICATION` 只说明大类；`organizationOrTeamName` 是名称，不是可靠 discriminator。两个不同业务事实可以产生完全相同的 wire JSON，提交后无法稳定恢复原分类，构成真实信息丢失和 round-trip 失败。

### 4.2 证据

1. 业务权威明确学生可提交“校队或社团认证”，教师审核“校队和社团认证”，并分别核对其组织/队伍名称；两者属于正式上线闭集，不是旧客户端私有能力。
2. Android 当前页面提供 `SchoolTeam` 和 `StudentClub` 两个选择，提交、列表/detail label 和 Profile 展示都需要分类；这证明实际消费需求，但不决定 wire 字段命名。
3. `CertificationDetails` 当前只有名称和两个日期；`CreateCertificationApplicationRequest` 与 `StudentApplication` 共用该 schema，没有其他 enum/字段能恢复分类。
4. Draft 2020-12 实例验证证明：当前合法 payload 通过；增加 `certificationKind` 会因 `additionalProperties:false` 被拒绝；内存候选 schema 对两个合法值通过，并拒绝缺字段和未知值。
5. Phase 3 已有 certification application/detail/credit 流程，但 detail 只保存名称与有效期，没有 kind；因此现有 Domain/Database design **不完整支持**该新字段，必须后续修正，不能宣称已支持。

### 4.3 接受内容与推荐 Contract 修改

- 新增 `CertificationKind`：closed enum `SCHOOL_TEAM | STUDENT_CLUB`；
- `CertificationDetails.certificationKind`：`required / non-null`，引用该 enum；
- Request 变化：`createStudentApplication` 的 certification branch；
- Response 变化：`createStudentApplication`, `supplementStudentApplication`, `listOwnApplications`, `getOwnApplication`, `listCourseApplications`, `getCourseApplication`, `decideStudentApplication`；
- HTTP status、`error.code`、pagination、上传、权限、operation 数量：不变；
- 新 operation / 新 error code：无；
- 不接受把两个值塞进 `ApplicationType`、按名称推断、optional/nullable kind、自由字符串或客户端私有字段。

### 4.4 Breaking 与下游影响

整体为 **breaking change**：认证创建 request 新增 required 字段，严格消费者/生成绑定和 fixtures 必须重载新 Version/SHA。Android、学生 Web、教师 Web 和 Backend 都受申请 DTO/mapper 影响。数据库设计需新增等价非空闭集列；当前无已验收 runtime 数据证据，不能自动假设无需迁移，也不能从名称回填。

## 5. CR-5DA-002 Review

### 5.1 最终状态与根因

`REJECTED / NOT_CONTRACT_DEFECT`。根因是 Phase 5D-A 把组织初始化 no-current 空态与合法学生 Dashboard 状态混为一谈，并受 Android 旧 fan-out workspace 的 nullable mapper 影响。

### 5.2 场景 A：存在 CURRENT

- `getCurrentSemester` → 200；
- `getStudentDashboard` → 200，`currentSemester` required/non-null；
- ACTIVE 可返回完整 course/progress；PENDING 仍有 current semester 与本人资料，course/progress/endurance/finalGrade 可为 null。

当前 schema validation 对 PENDING/current + 四个 nullable业务投影的合法实例通过。

### 5.3 场景 B：不存在 CURRENT

- `getCurrentSemester` → 404 `RESOURCE_NOT_FOUND`，这是 CR-011 已接受的 standalone absence channel；
- `getTeacherDashboard` → 200，required/nullable `currentSemester=null`，六项 current-work count 为 0；教师账号可在管理员尚未建立首个 current 时存在，所以这是可达业务空态；
- `getStudentDashboard` 没有合法业务调用。学生 Profile/账号只能随有效 current invitation 和 ACTIVE Enrollment 原子建立；current 之后只能原子切换，不存在单独归档产生的空窗。PENDING 也仍属于 current 学期内的已退班学生。

因此 Student Dashboard 不应返回 `currentSemester=null`，也不应新增 404 或把其他字段改为新的 no-current empty state。异常数据触发的不变量失败不得伪装为 200 空态；现有 500 可承载实现层不变量失败。

### 5.4 Teacher / Student 跨端一致性

角色生命周期不同，所以 schema nullability 不必相同。跨端一致性是 Android 与学生 Web 对同一 Student 状态保持 required currentSemester，同时 Teacher Web 对合法初始化状态保持 nullable empty；不是把 Teacher 的 bootstrap empty state复制到 Student。

### 5.5 拒绝内容、Breaking 与下游影响

拒绝：StudentDashboard nullable current、Dashboard 404、额外 error code、新 operation、placeholder Semester，以及 course/progress 的新 no-current 语义。本 CR 不修改 Contract，因此无 breaking change。

Android 后续按 `LEGACY_MIGRATION + MAPPER/CLIENT ALIGNMENT` 处理：旧 `V1StudentWorkspaceGateway.currentSemester: Semester?` 和 `getOptionalOne` 不能反推新 Contract。锁定 1.1 generated `StudentDashboard.currentSemester` 已是非空。学生 Web 保持同样 binding；Teacher/Admin no-current 行为不回退。

## 6. 跨 CR 一致性

| 检查 | 结论 |
|---|---|
| 两个 CR 互相影响 | 无；一个是申请分类 round-trip，一个是 Dashboard 状态可达性 |
| Password CR | 无冲突；Password CR 只涉及 gate、本人改密/reset、Sub-admin request 和 Admin errors |
| Phase 5C 12 个 CR | CR-001～010/012 无重叠；CR-011 明确保留 standalone 404 和 Teacher nullable，本评审不回退它 |
| Student / Teacher empty state | 保持已接受差异：Student PENDING 在 current 下用 course/progress null；Teacher bootstrap 可 no-current + zero counts |
| Domain/Database | CR-001 需要新增当前设计缺失的 certification kind；CR-002 不需要数据变更 |
| 错误归类 | `CR-5DA-002` 重新归类为 `LEGACY_MIGRATION + MAPPER/CLIENT ALIGNMENT`；`CR-5DA-001` 保持 Contract defect |
| 新业务歧义 | 0；不需要 `NEEDS_BUSINESS_DECISION` |

## 7. 验证与真实结果

| 验证 | 真实结果 |
|---|---|
| `python contracts/scripts/verify_contract.py` | PASS：109 paths / 121 unique operations / 192 schemas / 66 errors |
| `python contracts/scripts/check_rc_readiness.py` | PASS：无 PENDING，状态 RC |
| Redocly OpenAPI lint | PASS：API description valid，无 warning |
| Version / Status / SHA | PASS：`1.1.0-contract` / `RC` / 固定 SHA 精确匹配 metadata 与实际文件 |
| 内部 `$ref` 完整性 | PASS：缺失引用 0 |
| 当前 certification 实例 | PASS；名称/日期合法 payload 通过；附加 kind 被当前 schema 拒绝，证明当前协议不能提交分类 |
| 候选 certification 实例 | PASS；SCHOOL_TEAM/STUDENT_CLUB 通过，缺字段和未知值拒绝 |
| Student Dashboard current/PENDING | PASS；current 非空且 course/progress/endurance/finalGrade 为 null 的实例合法 |
| Student Dashboard no-current | PASS（预期拒绝）；`currentSemester=null` 有 1 个 schema error |
| Teacher Dashboard no-current | PASS；null + 六项 zero counts 的实例合法 |
| operation absence channel | PASS；standalone current 有 404+RESOURCE_NOT_FOUND，Student/Teacher Dashboard 没有 404 |
| Android/Domain/DB 静态 mapping assertions | PASS `9/9`；两个 UI 分类、旧 subtype、当前生成字段、legacy nullable workspace、Phase 3 kind 缺失、DB 初始 0 current 均确认 |
| 文档与写入范围 | PASS；`git diff --check` 无 whitespace error；4 个变更 Markdown 均为严格 UTF-8、本地链接可达；变更路径仅为两份 CR、本 STATUS 与本 handoff |
| 产品 runtime / Backend / PostgreSQL / E2E | NOT EXECUTED；本 Phase 是评审证据，不是实现或产品验收 |

## 8. Final Contract Consolidation 精确清单

1. 实施既有 [Password CR](../../../contracts/change-requests/CR-20260901-002-password-contract.md) 的 AC-01～AC-06；本评审没有改变其范围。
2. 实施 [CR-20260901-003](../../../contracts/change-requests/CR-20260901-003-certification-kind-round-trip.md)：新增 `CertificationKind` 和 `CertificationDetails.certificationKind` required/non-null，并更新确定性 source、verify assertions、coverage/database-support/README、生成物、Version/SHA。
3. **不实施** [CR-20260901-004](../../../contracts/change-requests/CR-20260901-004-student-dashboard-no-current-semester.md)：不改 `getStudentDashboard`、`StudentDashboard.currentSemester`、status/error 或关联 nullable 字段。
4. 不夹带旧 Android subtype、旧 workspace、客户端私有字段、额外 filter/endpoint/error 或数据库字段名到公共 Contract。

进入 Final Contract Consolidation 的 Contract 决策条件已经具备。CR-001 的 Domain/Database design alignment 必须在 Backend 初始化/迁移前另行授权并完成；这不重新打开业务决定，也不授权本 Phase 修改数据库设计。

## 9. 后续重新验证范围

### Android / 学生 Web

- 新 Contract Version/SHA codegen；认证创建两个 kind、列表/detail/supplement/Profile round-trip、unknown enum fail-closed；
- ACTIVE/current Dashboard；PENDING/current + course/progress null；不得增加 Student no-current success fixture；
- standalone `getCurrentSemester` 404 与依赖错误分开；移除旧 fan-out nullable workspace 假设；
- unit/lint/build、真实页面内容/空/错态、设备/浏览器 console，再到 Backend conformance/E2E。

### Teacher Web / Backend / Database

- 教师申请列表/detail/decision 展示两个 kind 且 round-trip 不丢失；
- Teacher Dashboard current 与 no-current zero-count 场景保持；
- Backend Contract Adapter、Domain enum/value object、数据库非空约束与 mapper；申请幂等重放和历史读取；
- 真实 PostgreSQL migration/constraint/query、跨端 E2E 和 Staging 必须在独立阶段验收。

## 10. Phase 结束报告

```text
完成状态：DONE
修改文件：两份正式 CR 评审记录、docs/rebuild/STATUS.md、本 handoff
执行的测试：Contract verify、RC readiness、Redocly lint、Version/SHA、引用完整性、当前/候选 Schema 实例、Android/Domain/DB 静态 mapping、文档/范围收尾检查
真实测试结果：Contract 109/121/192/66、readiness、lint、SHA、refs 和全部目标实例/静态断言 PASS；CR-001 ACCEPTED，CR-002 REJECTED
未执行测试及原因：未执行 Android/Web 产品 build/runtime、Backend、数据库、浏览器/设备、E2E、Staging/Production；本阶段未修改实现或 Contract
是否修改了业务规则：否
是否修改了 Contract：否；OpenAPI、metadata、source、Version、SHA 不变
是否存在旧 API 引用：是；Android 正式 runtime 仍有 Legacy API/fan-out，CR-002 已纠正为 Legacy Migration/Mapper
是否存在 Mock、TODO、空接口：既有 validation-only Mock/legacy/TODO 未改；本阶段未新增 Fake Success、客户端私有字段、TODO 或空接口
下一阶段前置条件：Final Contract Consolidation 只落实 Password CR AC-01～AC-06 与 CR-20260901-003；不落实 CR-20260901-004；Backend 前完成 certification kind 的 Domain/DB design alignment
```
