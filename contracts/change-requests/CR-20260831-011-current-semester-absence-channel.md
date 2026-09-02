# CR-20260831-011：统一“尚无当前学期”的公开空态通道

- 状态：`ACCEPTED`
- 提交人：Phase 5B Web 只读 Contract 审查
- Contract 当前版本：`1.0.0-contract` / `RC` / `ff15441b84f0729626a49c6898ea4896e80321b8e873a933768a509fd4c8478f`
- Contract 落地版本：`1.1.0-contract` / `RC` / `1d538483f96b95d777cc4dd02526b78a214bd663e036ea5a6c77f43dfa38d99d`
- 业务权威：[管理员端业务流程](../../docs/business/30-admin-flow.md) 第 6、8 节；[教师端业务流程](../../docs/business/20-teacher-flow.md) 第 4、5 节
- Web 审计分类：`LOCAL`

## 变更原因与 Use Case

“尚未建立第一个 CURRENT 学期”是现行 Contract 自己承认的合法状态：`SemesterSwitchRequest.expectedCurrentSemesterVersion` 在无 current 时必须为 null，`SemesterSwitchResult.archivedSemester` 可为 null，`AdminDashboard.currentSemester` 也可为 null。

但两个 Web 读取边界不能一致表达这个状态：

- `getCurrentSemester` 只有 `200 SemesterSummary`，没有 nullable success，也没有 `404/RESOURCE_NOT_FOUND`；
- `TeacherDashboard.currentSemester` required 且 non-null，operation 同样没有 absence error。

因此初始管理员设置期与教师在尚无 current 时登录的合法空态只能被伪造成学期、未声明错误或整页依赖错误。

## 旧边界门禁复核

- 对应的新 Contract operation 是否存在：是，`getCurrentSemester`、`getTeacherDashboard`、`getAdminDashboard` 均存在。
- 新 Contract 是否完整支持页面/Use Case：有 current 时完整；无 current 的公开通道在 standalone/teacher projection 中缺失且与 Admin projection 不一致。
- 分类理由：缺口由现行 RC 内部的 nullable/非 nullable 矛盾直接证明，不要求保留旧 Web 的“404 当 null”实现。

## API 影响

| 项目 | 变更要求 |
|---|---|
| `getCurrentSemester` | 冻结唯一 absence channel；建议不存在时返回已声明的 `404 ErrorEnvelope(code=RESOURCE_NOT_FOUND)`，或选择明确 nullable 200，不能继续未声明 |
| `getTeacherDashboard` | 建议将 `currentSemester` 改为 required nullable，并在 null 时返回 0 个 current-course业务摘要；若选择 operation error，必须声明稳定 status/code，且页面仍能区分空态与依赖失败 |
| `getAdminDashboard` | 保持 currentSemester nullable，作为既有合法空态；必要时补充跨 operation 一致性说明 |
| 学生 Dashboard | 当前业务没有证明已注册学生会处于首个 current 建立前；本 CR 不据此擅自改变学生语义，Contract review 应明确其不变量 |
| Error / status | absence 不得复用 `DEPENDENCY_UNAVAILABLE`、空对象或私有 code |
| 时间 / 并发 | 空态以服务端组织事实为准；客户端时间不能推断 CURRENT |

## 兼容性与下游

- 教师 Web：可以展示“尚无当前学期，暂不能创建课程”的正式空态，而不是假错误或 placeholder semester。
- 管理员 Web：初始 Dashboard 的既有 null 语义保持；学期创建与首次 switch 可继续。
- Android/学生 Web：若调用 standalone current-semester operation，必须与 Web 共用同一 absence channel；不得各自保留旧 404/null 猜测。
- Backend / 数据库：Phase 3 只约束“最多一个 CURRENT”，允许 0 个，静态支持该空态。
- Mock：CR 接受前不得为 teacher dashboard 构造私有 nullable field；已有 current 内容态可继续验证。

## 验证与迁移

1. Contract review 选择并记录 standalone absence channel，同时冻结 dashboard null/error 组合。
2. 接受后更新 source/OpenAPI/coverage/tests，提升版本和 SHA。
3. Contract tests 覆盖 0 个 current、首次 switch、1 个 current，以及依赖失败与业务空态可区分。

## 审批记录

- 2026-08-31：Phase 5B Web 只读审查确认 RC 已允许无 current，却未让两个核心读取边界表达，提交 `PROPOSED`。
- Contract review：`ACCEPTED`（Phase 5C，2026-09-01）；`getCurrentSemester` 无 current 时返回 `404 RESOURCE_NOT_FOUND`，`TeacherDashboard.currentSemester` 为 required nullable，null 时所有 current-semester 工作量 count 为 0。
