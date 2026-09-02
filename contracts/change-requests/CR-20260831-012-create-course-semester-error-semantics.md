# CR-20260831-012：修正创建课程的学期目标错误语义

- 状态：`ACCEPTED`
- 提交人：Phase 5B Web 只读 Contract 审查
- Contract 当前版本：`1.0.0-contract` / `RC` / `ff15441b84f0729626a49c6898ea4896e80321b8e873a933768a509fd4c8478f`
- Contract 落地版本：`1.1.0-contract` / `RC` / `1d538483f96b95d777cc4dd02526b78a214bd663e036ea5a6c77f43dfa38d99d`
- 业务权威：[教师端业务流程](../../docs/business/20-teacher-flow.md) 第 5.1、5.2 节；[总业务流程](../../docs/business/00-overview.md) 上线主流程
- Web 审计分类：`LOCAL`

## 变更原因与 Use Case

`createCourse` 的 description 与业务权威都要求在唯一 `CURRENT` 学期创建课程，`CourseCreateRequest` 也要求提交 `semesterId`。但 operation 唯一的学期业务错误是 `SEMESTER_NOT_UPCOMING`；全局 error catalog 对该 code 的定义是“只有 UPCOMING 学期可以编辑或设为当前”。这与创建课程需要 CURRENT 的语义相反。

同时，request 中 structurally valid 但不存在的 `semesterId` 没有 `RESOURCE_NOT_FOUND`，operation 也没有 404 response。严格 Web 客户端无法区分“目标不存在”“目标存在但不是 CURRENT”和其他无效请求，也可能向教师展示完全相反的提示。

## 旧边界门禁复核

- 对应的新 Contract operation 是否存在：是，`createCourse` 已存在且成功 Request/Response DTO 完整。
- 新 Contract 是否完整支持页面/Use Case：成功路径完整；semester target 的 stable error code/status 语义不完整且内部矛盾。
- 分类理由：该问题直接来自当前 operation description、request 和 error catalog 的冲突，不要求兼容旧 class-section/course API。

## API 影响

| 项目 | 变更要求 |
|---|---|
| Method / Path | 保持 `POST /api/v1/teacher/courses` |
| operationId | 保持 `createCourse` |
| Request | Contract review 可保留 `semesterId`，也可决定由服务器唯一 CURRENT 推导；无论选择哪种，必须只有一个公开权威 |
| Existing non-current semester | 建议新增稳定 `SEMESTER_NOT_CURRENT`（409）或等价 closed code；不得使用 `SEMESTER_NOT_UPCOMING` |
| Unknown semesterId | 若保留 request field，声明 `404 ErrorEnvelope(code=RESOURCE_NOT_FOUND)`；不能落入与存在但状态错误相同的通道 |
| No current semester | 与 CR-011 采用一致的稳定空态/业务错误语义，不得返回依赖错误或假成功 |
| Other errors | `COURSE_TARGET_TOTAL_INVALID`、认证、权限、维护、幂等、限流和依赖错误保持 |

## 兼容性与下游

- 教师 Web：可按 closed code 区分刷新 current semester、提示尚无 current 和真正的资源不存在；不得解析 message 文本。
- Android/学生/管理员：无直接创建课程入口；共享 semester semantics 仍需与 CR-011 一致。
- Backend / 数据库：Phase 3 Semester status 与 course/semester FK 静态支持存在性和 CURRENT 校验；无需新业务表。
- Mock：成功创建可以继续验证；非 current/unknown/no-current 三类错误在 CR 接受前保持 BLOCKED，不添加兼容分支。

## 验证与迁移

1. Contract review 冻结 request 是否继续携带 semesterId，以及三类失败的唯一 code/status。
2. 接受后更新 error catalog、operation responses、source/OpenAPI/tests，提升版本和 SHA。
3. Contract tests 覆盖 CURRENT 成功、UPCOMING/ARCHIVED 拒绝、unknown ID、无 current 与并发切换。

## 审批记录

- 2026-08-31：Phase 5B Web 只读审查确认 `createCourse` 使用了与 CURRENT 目标相反的 error code 且缺 404，提交 `PROPOSED`。
- Contract review：`ACCEPTED`（Phase 5C，2026-09-01）；保留 `semesterId`，未知 ID 为 `404 RESOURCE_NOT_FOUND`，存在但非唯一 CURRENT（含无 current）为 `409 SEMESTER_NOT_CURRENT`，不再复用相反的 `SEMESTER_NOT_UPCOMING`。
