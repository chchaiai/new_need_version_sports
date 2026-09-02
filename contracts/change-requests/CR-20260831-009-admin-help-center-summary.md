# CR-20260831-009：提供帮助中心管理页的全局状态概况

- 状态：`ACCEPTED`
- 提交人：Phase 5B Web 只读 Contract 审查
- Contract 当前版本：`1.0.0-contract` / `RC` / `ff15441b84f0729626a49c6898ea4896e80321b8e873a933768a509fd4c8478f`
- Contract 落地版本：`1.1.0-contract` / `RC` / `1d538483f96b95d777cc4dd02526b78a214bd663e036ea5a6c77f43dfa38d99d`
- 业务权威：[管理员端业务流程](../../docs/business/30-admin-flow.md) 第 14.1 节
- Web 审计分类：`LOCAL`

## 变更原因与 Use Case

帮助中心管理页顶部必须按全部文章展示 `PUBLISHED`、`DRAFT`、`ARCHIVED` 三项数量，而且数字不能随当前搜索、分类或状态筛选缩小。`listHelpArticlesForAdmin` 已提供完整双语 item、过滤和每页最多 5 条的 keyset list，但 `HelpArticleAdminPage` 只有 `items/page`。

客户端不能以当前页长度代替全局数量；全量遍历所有分页既昂贵，也没有跨页 snapshot 一致性。现行 RC 因此不能严格表达该页面概况。

## 旧边界门禁复核

- 对应的新 Contract operation 是否存在：是，管理员 help list/get/create/update/state-transition operations 均存在。
- 新 Contract 是否完整支持页面/Use Case：文章内容、空态、编辑和状态流转完整；三个全局 counts 缺失。
- 分类理由：缺口来自当前业务权威的页面摘要，不来自旧 admin Mock 或旧 DTO。

## API 影响

| 项目 | 变更要求 |
|---|---|
| Method / Path | 建议保持 `GET /api/v1/admin/help-articles` |
| operationId | 保持 `listHelpArticlesForAdmin`，或新增同权限 summary read operation |
| Response | 建议给 `HelpArticleAdminPage` 增加 `summary`：`publishedCount`、`draftCount`、`archivedCount`，均为非负整数 |
| Filter / pagination | summary 以当前组织全部文章为口径，不随 q/status/category/cursor/limit 缩小；items 继续按既有排序与分页 |
| 空态 | 三项均为 0 且 `items=[]`；不得用旧 Mock 或本地缓存补数 |
| 权限 / error | 保持 `ADMIN + HELP_CENTER` 与现有错误通道 |
| 一致性 | 公开 summary 与 list 的一致性时间/snapshot 口径，避免状态切换后显示互相矛盾的数字 |

## 兼容性与下游

- 管理员 Web：概况点击只更新 status filter，summary 仍消费服务端全局值。
- 学生 Web / Android：published help list/detail 不变。
- Backend / 数据库：Phase 3 `help_article(organization_id,status,updated_at,id)` index 静态支持分组计数；真实 query plan 未验证。
- Mock：CR 接受前不新增 summary 假字段；接受后覆盖三状态、筛选不影响 counts 和全零空态。

## 验证与迁移

1. Contract review 冻结 summary 形状与过滤独立性。
2. 接受后更新 source/OpenAPI/tests，提升版本和 SHA。
3. Backend conformance 验证创建、发布、下线和重新上线后 counts 与列表状态同步。

## 审批记录

- 2026-08-31：Phase 5B Web 只读审查确认 help 管理操作完整但全局状态概况缺失，提交 `PROPOSED`。
- Contract review：`ACCEPTED`（Phase 5C，2026-09-01）；`HelpArticleAdminPage.summary` 返回 PUBLISHED/DRAFT/ARCHIVED 全局数量和 `generatedAt`，不随搜索、筛选或分页缩小。
