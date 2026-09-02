# CR-20260831-007：提供学期管理页的全局状态摘要

- 状态：`ACCEPTED`
- 提交人：Phase 5B Web 只读 Contract 审查
- Contract 当前版本：`1.0.0-contract` / `RC` / `ff15441b84f0729626a49c6898ea4896e80321b8e873a933768a509fd4c8478f`
- Contract 落地版本：`1.1.0-contract` / `RC` / `1d538483f96b95d777cc4dd02526b78a214bd663e036ea5a6c77f43dfa38d99d`
- 业务权威：[管理员端业务流程](../../docs/business/30-admin-flow.md) 第 8.1 节
- Web 审计分类：`LOCAL`

## 变更原因与 Use Case

学期管理页必须展示当前学期及日期范围、全部 `UPCOMING` 数量和全部 `ARCHIVED` 数量。`listSemesters` 已能分页返回完整 `Semester` item，但 `SemesterPage` 只有 `items/page`；`AdminDashboard` 只补充可空 current semester，不提供另外两项全局数量。

客户端遍历所有 keyset pages 再计数不能形成权威摘要：Contract 没有跨页 snapshot 一致性，且摘要明确不应随当前 status filter 或 cursor 缩小。因此现行 RC 无法严格表达该页面顶部摘要。

## 旧边界门禁复核

- 对应的新 Contract operation 是否存在：是，`listSemesters`、`getAdminDashboard`、创建/编辑/切换 operations 均存在。
- 新 Contract 是否完整支持页面/Use Case：列表、空态和 mutations 完整；全局 UPCOMING/ARCHIVED 摘要缺失。
- 分类理由：缺口由当前业务权威直接要求，不来自旧管理 DTO 或旧页码结构。

## API 影响

| 项目 | 变更要求 |
|---|---|
| Method / Path | 建议保持 `GET /api/v1/semesters` |
| operationId | 保持 `listSemesters`，或新增同权限 summary read operation |
| Response | 建议给 `SemesterPage` 增加 `summary`：可空 current semester（含日期范围）、`upcomingCount`、`archivedCount`；不得把当前页 items 数量当全局值 |
| Filter / pagination | summary 以当前组织全部学期为口径，不随 `status/cursor/limit` 缩小；items 继续按现有 filter/keyset 分页 |
| 空态 | 初始组织允许 current=null、两项 count=0；不得合成学期 |
| 权限 / error | 保持 `ADMIN + SEMESTER`、现有 200/400/401/403/429/500/503 语义 |
| 时间 / 并发 | summary 和 items 的一致性时间或 snapshot 口径必须公开；mutation version 规则不变 |

## 兼容性与下游

- 管理员 Web：只消费 Contract summary，不全量抓页、缓存私有 total 或从筛选结果推算。
- 其他客户端：不影响 Android/学生/教师业务。
- Backend / 数据库：Phase 3 `semester(organization_id,status,...)` 与唯一 CURRENT 约束静态支持状态计数；真实 query plan 未验证。
- Mock：CR 接受前只能验证列表 item/空数组，不能补造顶部数量。

## 验证与迁移

1. Contract review 冻结 summary 是否嵌入 page，以及独立于 filters 的口径。
2. 接受后更新 source/OpenAPI/tests，提升版本和 SHA。
3. 覆盖初始无 current、一个 current、多 UPCOMING/ARCHIVED、带 filter 与翻页时 summary 不变的 Contract tests。

## 审批记录

- 2026-08-31：Phase 5B Web 只读审查确认学期列表存在但全局状态摘要不可表达，提交 `PROPOSED`。
- Contract review：`ACCEPTED`（Phase 5C，2026-09-01）；`SemesterPage.summary` 返回可空 current、UPCOMING/ARCHIVED 全局数量和 `generatedAt`，与 items 来自同一提交读取快照且不随筛选/分页缩小。
