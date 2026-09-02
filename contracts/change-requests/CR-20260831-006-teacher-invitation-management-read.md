# CR-20260831-006：补齐教师课程邀请的可恢复管理读取边界

- 状态：`ACCEPTED`
- 提交人：Phase 5B Web 只读 Contract 审查
- Contract 当前版本：`1.0.0-contract` / `RC` / `ff15441b84f0729626a49c6898ea4896e80321b8e873a933768a509fd4c8478f`
- Contract 落地版本：`1.1.0-contract` / `RC` / `1d538483f96b95d777cc4dd02526b78a214bd663e036ea5a6c77f43dfa38d99d`
- 业务权威：[总业务流程](../../docs/business/00-overview.md) 第 4 节“课程邀请：生成和停止使用邀请”；[教师端业务流程](../../docs/business/20-teacher-flow.md) 第 6 节
- Web 审计分类：`LOCAL`

## 变更原因与 Use Case

当前 RC 提供 `createCourseInvitation` 和 `revokeCourseInvitation`，但没有按课程列出或读取教师可管理邀请 metadata 的 operation。创建响应中的 raw `invitationCode` 被明确限制为初次成功或精确幂等重放时返回，并禁止客户端持久化；撤销路径却必须提交 `invitationId`，请求还需要邀请 `version`。

因此页面刷新、重新登录或换设备后，责任教师无法从 Contract 重新取得可撤销邀请的 `invitationId/version`，也无法可靠判断哪些邀请仍可停止使用。把这些值长期留在浏览器私有状态会让服务端邀请事实失去权威，且不能支持跨设备管理。

## 旧边界门禁复核

- 对应的新 Contract operation 是否存在：创建和撤销 mutation 已存在；教师侧邀请 list/get operation 不存在。
- 新 Contract 是否完整支持页面/Use Case：否；创建当次可以撤销，但可恢复的完整“生成 → 稍后停止使用”生命周期不成立。
- 分类理由：本 CR 不要求恢复旧 rotate/revoke route 或重新读取明文邀请码；缺口直接来自现行 `revokeCourseInvitation` 对公开 ID/version 的依赖与现行 secret 持久化禁令。

## API 影响

| 项目 | 变更要求 |
|---|---|
| Method / Path | 建议新增 `GET /api/v1/courses/{courseId}/invitations`；若选择单条读取，必须同时提供可发现 invitationId 的等价边界 |
| operationId | 建议 `listCourseInvitations` |
| 角色 / scope | `TEACHER` / `RESPONSIBLE_TEACHER` / `NORMAL_REQUIRED` |
| Request | courseId；可选服务端权威状态筛选与 keyset pagination |
| Response | 只返回管理 metadata：`invitationId`、`courseId`、安全 display suffix、服务端权威有效/撤销/过期或 revocable 语义、`expiresAt`、`version`；绝不返回 raw code/digest |
| Error / status | 200 page；400 invalid cursor、401、403、404 course、429、500、503；状态过滤与过期含义必须冻结 |
| 并发 | 返回的 version 可直接用于 `CourseInvitationRevokeRequest.expectedVersion`；撤销仍使用现有幂等与版本冲突规则 |
| 安全 | 不通过 list 泄露完整邀请码、其他课程邀请、加入成员或内部存储标识 |

## 兼容性与下游

- 教师 Web：页面只短时展示创建当次 raw code；日后管理从 metadata read model 恢复，不得写入 localStorage/private DTO。
- 学生 Web / Android：学生预览与加入路径不变；已知终止状态双通道仍由既有 CR-004 独立处理。
- Backend：按 responsible teacher/course 查询 invitation metadata；raw code 仍不落库。
- 数据库：Phase 3 `course_invitation` 已保存 course、status、expiresAt、version 与 display suffix，静态可支持；真实索引/query plan 仍未验证。
- Mock：必须覆盖无邀请、一个或多个 invitation metadata、已撤销/过期和错误态，且 fixture 中不得出现明文 code（创建响应场景除外）。

## 验证与迁移

1. 独立 Contract review 冻结 list/get 形状、有效状态口径及分页。
2. 接受后提升 Contract 版本和 SHA，再生成 Web binding。
3. Contract test 证明 reload 后可取得撤销所需 ID/version，同时任何读取 operation 都不返回 raw code。
4. Backend conformance 再验证 responsible-teacher scope、过期边界与并发撤销。

## 审批记录

- 2026-08-31：Phase 5B Web 只读审查确认邀请 mutation 已存在但管理读取链不可恢复，提交 `PROPOSED`。
- Contract review：`ACCEPTED`（Phase 5C，2026-09-01）；新增 `listCourseInvitations`，只返回责任教师可恢复管理所需的 ID、状态、suffix、到期、revocable 和 version，不返回明文 code/digest。
