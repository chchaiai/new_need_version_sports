# CR-20260901-004：Student Dashboard No-current Semester Proposal

- 状态：`REJECTED / NOT_CONTRACT_DEFECT`
- 来源编号：`CR-5DA-002`
- 初始记录：[Phase 5D-A Android Full Contract Surface Audit](../../docs/rebuild/handoffs/phase-5d-a-android-full-contract-surface-audit.md#cr-5da-002student-dashboard-cannot-express-absence-of-current-semester)
- 评审人：Phase 5C.2-B Android CR Independent Review
- Contract 当前版本：`1.1.0-contract` / `RC`
- Contract 当前 SHA-256：`1d538483f96b95d777cc4dd02526b78a214bd663e036ea5a6c77f43dfa38d99d`
- 业务权威与既有决定：[总业务流程](../../docs/business/00-overview.md) `P2-ROLE-01`；[学生端业务流程](../../docs/business/10-student-flow.md) 第 5～6 节；[管理员端业务流程](../../docs/business/30-admin-flow.md) 第 8 节；[CR-20260831-011](CR-20260831-011-current-semester-absence-channel.md)

## 1. 提案与最终判断

原提案认为：`getCurrentSemester` 在无 CURRENT 时返回 `404 RESOURCE_NOT_FOUND`，而 `StudentDashboard.currentSemester` 为 required/non-null 且 `getStudentDashboard` 没有 404，因此 Student Dashboard 也应增加 nullable 成功空态或 absence error。

独立评审结论：**不接受**。这两个 operation 的可调用角色状态不同，不存在合法业务状态下的协议矛盾。

## 2. 场景与状态可达性

### 场景 A：存在 CURRENT Semester

- `getCurrentSemester` 返回 `200 SemesterSummary`；
- `getStudentDashboard` 返回 `200 StudentDashboard`，`currentSemester` required/non-null；
- `ACTIVE` 学生可带 course/progress；`PENDING` 学生保留本人资料和 current semester，但 course/progress/endurance/finalGrade 可为 null。

当前 Schema 和现有合法实例已经完整表达该场景。

### 场景 B：系统尚无 CURRENT Semester

- `getCurrentSemester` 返回 `404 RESOURCE_NOT_FOUND`；
- Teacher/Admin 可以在首次 CURRENT 建立前已经存在，因此 Teacher/Admin Dashboard 有明确 no-current 成功空态；`TeacherDashboard.currentSemester` 为 required/nullable，null 时六项 current-work count 为 0；
- 合法 Student actor 不能处于该初始化状态。学生身份只能通过有效课程邀请建立；有效邀请要求 Course OPEN 且 Semester CURRENT；新学生账号/Profile 与 ACTIVE Enrollment 原子创建。此后当前学期只能通过原 CURRENT → ARCHIVED 与目标 UPCOMING → CURRENT 的同一切换事务变化，业务不提供单独归档 current 的动作，因此不会形成已有 Student actor 但没有 current 的正常空窗。

所以“no current + 合法已认证 Student Dashboard 调用”不属于已接受业务状态空间。当前 Contract 不应为不可达组合新增 `200 currentSemester=null` 或 Dashboard 404。若实现因损坏数据或错误迁移遇到该组合，也不能合成业务空态；现有 500 `INTERNAL_ERROR` 可承载服务端不变量失败，但这不是新的业务规则或 success shape。

## 3. 为什么不是跨端不一致

跨端一致性要求 Android/Web 对同一角色和同一可达状态使用同一语义，不要求 Student、Teacher 和 Admin 三种生命周期不同的 Dashboard 拥有相同 nullability。

- Teacher 账号由管理员在课程/current 前置阶段创建，因此 Teacher no-current 是合法业务空态；
- Student Profile 由 current 邀请入班流程建立，PENDING 只表示当前学期内被移出，不表示系统无 current；
- standalone `getCurrentSemester` 是三角色共享的全局读取，404 说明组织层面没有 current，不自动把每个角色聚合都改成 nullable success。

## 4. Android 归因

当前正式 Android runtime 的 `V1StudentWorkspaceGateway` 仍从旧 endpoint/DTO fan-out 组装 workspace，并把 `currentSemester` 建模为 nullable、把 `/semesters/current` 404 映射成 optional value；这属于既有 `LEGACY_MIGRATION` / Mapper 行为。

锁定 `1.1.0-contract` 生成的 `StudentDashboard` 模型则正确生成非空 `SemesterSummary`。Phase 5D-A 把旧 workspace 的 nullable 假设升级成新 Contract CR，属于错误归类。后续 Android 应改为消费 `getStudentDashboard`，并把 standalone current 404 与 Dashboard 聚合分开，不应要求新 Contract 恢复旧 nullable workspace。

## 5. API 影响

| 项目 | 结论 |
|---|---|
| `getStudentDashboard` | 不修改 operation、response、status 或 `x-error-codes` |
| `StudentDashboard.currentSemester` | 保持 `required / non-null` |
| `course / progress / enduranceOutcome / finalGrade` | 保持 required/nullable；PENDING/无当前课程使用 null，不把它们与无系统 current 混同 |
| `getCurrentSemester` | 保持 no-current → 404 `RESOURCE_NOT_FOUND` |
| `getTeacherDashboard` | 保持 200 + required/nullable currentSemester；null 时 current-work counts 为 0 |
| HTTP status / error.code | 不新增、不删除、不改变 |
| 新 operation / error code | 无 |
| Breaking | 无，因为本 CR 不修改 Contract |

## 6. 下游处置与验证

- Android：归类为 `LEGACY_MIGRATION + MAPPER/CLIENT ALIGNMENT`。迁移后验证 ACTIVE/current 内容态、PENDING/current 且 course/progress null、standalone current 404 和依赖错误互不误映射；不得添加私有 nullable Dashboard 字段。
- 学生 Web：保持 required currentSemester；如迁移到 Dashboard，不增加 no-current 学生 empty fixture。
- Teacher/Admin Web：继续验证现有 no-current 空态和 standalone 404，不因本拒绝结论回退 CR-011。
- Backend：实现合法状态不变量；不得为异常数据合成 placeholder Semester 或成功空 Dashboard。
- Domain/数据库：当前设计允许组织初始化时 0 个 CURRENT，但加入要求 current 邀请，学期切换原子且没有单独归档。无需新增字段、表或状态。

## 7. 审批记录

- 2026-09-01：Phase 5D-A 以 `CR-5DA-002` 嵌入式提案提出 nullable/404 方案。
- 2026-09-01：Phase 5C.2-B 对照 Phase 2/3、CR-011、当前 Contract、Android legacy gateway 与锁定生成模型后，结论 `REJECTED / NOT_CONTRACT_DEFECT`。
- 本 CR 不进入 Final Contract Consolidation 的 OpenAPI 修改清单。
