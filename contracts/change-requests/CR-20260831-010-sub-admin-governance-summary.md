# CR-20260831-010：提供分管理员治理页的全局账号摘要

- 状态：`ACCEPTED`
- 提交人：Phase 5B Web 只读 Contract 审查
- Contract 当前版本：`1.0.0-contract` / `RC` / `ff15441b84f0729626a49c6898ea4896e80321b8e873a933768a509fd4c8478f`
- Contract 落地版本：`1.1.0-contract` / `RC` / `1d538483f96b95d777cc4dd02526b78a214bd663e036ea5a6c77f43dfa38d99d`
- 业务权威：[管理员端业务流程](../../docs/business/30-admin-flow.md) 第 4.1 节
- Web 审计分类：`LOCAL`

## 变更原因与 Use Case

分管理员设置页顶部必须展示分管理员总数、状态为 `ACTIVE` 的数量和固定可分配权限数量。当前 `AdminPermission` 已以 closed enum 完整冻结 8 项权限，Web 可以从该公开闭集建立标签映射；但 `listSubAdmins` 返回的 `SubAdminPage` 只有 `items/page`，无法得到前两项全局账号数量。

按 state 分别遍历全部 keyset pages 没有 snapshot 一致性，并会把治理摘要变成高成本客户端扫描。因此现行 RC 对页面的账号摘要支持不完整。

## 旧边界门禁复核

- 对应的新 Contract operation 是否存在：是，sub-admin list/get/create/update/state-transition/deletion 均存在。
- 新 Contract 是否完整支持页面/Use Case：账号列表、详情和管理动作完整；total/ACTIVE 全局 counts 缺失。固定 8 项权限已经由 `AdminPermission` 支持，不为它重复增加私有字段。
- 分类理由：只提交现行 Contract 真正缺少的账号聚合，不复刻旧 Demo 的 summary DTO。

## API 影响

| 项目 | 变更要求 |
|---|---|
| Method / Path | 建议保持 `GET /api/v1/admin/sub-admins` |
| operationId | 保持 `listSubAdmins`，或新增 SUPER-only summary read operation |
| Response | 建议给 `SubAdminPage` 增加 `summary`：`totalCount`、`activeCount`；固定权限数量继续以 `AdminPermission` 的 8 项 closed enum 为权威 |
| Filter / pagination | summary 不随 state/cursor/limit 缩小；items 继续 keyset 分页 |
| 空态 | total=0、active=0、items=[]；固定权限数仍为 8，不由空列表推导 |
| 权限 / error | 保持 `SUPER_ADMIN_ONLY` 与现有错误通道 |
| 一致性 | 创建、启停、删除成功后返回或后续 read 必须给出一致 summary；客户端不乐观补数为事实 |

## 兼容性与下游

- 管理员 Web：只在总管理员治理页消费；不得把当前页长度或本地 mutation 结果当权威 total。
- Android/学生/教师 Web：无直接影响。
- Backend / 数据库：Phase 3 `admin_profile`、`login_account.access_state` 与 current admin indexes 静态支持计数；真实 query plan 未验证。
- Mock：CR 接受前不增加 private summary；接受后覆盖空、ACTIVE/DISABLED 混合和 state filter 不影响摘要。

## 验证与迁移

1. Contract review 冻结 summary 的组织/SUPER scope 与过滤独立性。
2. 接受后更新 Contract source/OpenAPI/tests，提升版本和 SHA。
3. Backend conformance 验证 create/disable/enable/delete 后 counts，并继续验证权限闭集恰为 8 项。

## 审批记录

- 2026-08-31：Phase 5B Web 只读审查确认分管理员账号全局摘要缺失，提交 `PROPOSED`。
- Contract review：`ACCEPTED`（Phase 5C，2026-09-01）；`SubAdminPage.summary` 返回 total/active 全局数量和 `generatedAt`；固定权限数量继续由 8 值 `AdminPermission` 闭集表达。
