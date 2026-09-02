# CR-20260831-008：提供管理员反馈队列的全局概况

- 状态：`ACCEPTED`
- 提交人：Phase 5B Web 只读 Contract 审查
- Contract 当前版本：`1.0.0-contract` / `RC` / `ff15441b84f0729626a49c6898ea4896e80321b8e873a933768a509fd4c8478f`
- Contract 落地版本：`1.1.0-contract` / `RC` / `1d538483f96b95d777cc4dd02526b78a214bd663e036ea5a6c77f43dfa38d99d`
- 业务权威：[管理员端业务流程](../../docs/business/30-admin-flow.md) 第 11.1 节
- Web 审计分类：`LOCAL`

## 变更原因与 Use Case

反馈管理页要求展示全局反馈总数、待处理数量、`WAITING_TECH` 数量和 `COMPLETED` 数量。“待处理”必须按 `WAITING + IN_PROGRESS + WAITING_TECH` 计算，并排除 `COMPLETED/CLOSED`；概况点击只改变列表筛选。

`listFeedbackForAdmin` 的搜索、分类、状态过滤和每页最多 6 条均已定义，但 `FeedbackPage` 只有 `items/page`，没有任何全局 counts。遍历全部 keyset pages 会受到 filters、并发变化和请求量影响，不能提供权威概况。

## 旧边界门禁复核

- 对应的新 Contract operation 是否存在：是，管理员 feedback list/detail/process operations 均存在。
- 新 Contract 是否完整支持页面/Use Case：列表、详情、公开回复和状态变化完整；全局概况缺失。
- 分类理由：counts 与组合口径来自当前业务权威，不要求兼容旧 feedback DTO。

## API 影响

| 项目 | 变更要求 |
|---|---|
| Method / Path | 建议保持 `GET /api/v1/admin/feedback` |
| operationId | 保持 `listFeedbackForAdmin`，或新增同权限 summary read operation |
| Response | 建议给 `FeedbackPage` 增加 `summary`：`totalCount`、`pendingCount`、`waitingTechCount`、`completedCount`，均为非负整数 |
| Count 口径 | `pendingCount = WAITING + IN_PROGRESS + WAITING_TECH`；`waitingTechCount = WAITING_TECH`；`completedCount = COMPLETED`；total 包含所有五种状态 |
| Filter / pagination | summary 以管理员当前组织和权限范围内全部 feedback 为口径，不随 q/category/status/cursor/limit 缩小 |
| 空态 | 四项均为 0 且 `items=[]`；加载失败必须使用现有 ErrorEnvelope，不保留假 counts |
| 权限 / error | 保持 `ADMIN + FEEDBACK` 与现有状态码/error codes |

## 兼容性与下游

- 管理员 Web：概况与列表筛选分别消费，不能将当前页长度作为 total。
- 学生 Web / Android：学生 feedback operations 不变。
- Backend / 数据库：Phase 3 feedback current status 与 admin queue index 静态支持分组计数；真实并发 snapshot/query plan 未验证。
- Mock：CR 接受前不新增 private summary fixture；接受后覆盖五状态组合、筛选不缩小 summary 与全零空态。

## 验证与迁移

1. Contract review 冻结 summary 口径和一致性时间。
2. 接受后更新 Contract source/OpenAPI/tests，提升版本和 SHA。
3. Web 只在加载新 binding 后实现概况；Backend conformance 验证状态切换后 counts 与列表一致。

## 审批记录

- 2026-08-31：Phase 5B Web 只读审查确认 feedback 核心列表存在但业务概况不可表达，提交 `PROPOSED`。
- Contract review：`ACCEPTED`（Phase 5C，2026-09-01）；管理员列表改用 `AdminFeedbackPage`，全局 summary 固定 total/pending/waitingTech/completed 口径并与 items 使用同一提交读取快照。
