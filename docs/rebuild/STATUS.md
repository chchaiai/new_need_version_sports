# 当前进度状态

> 更新时间：2026-09-02
>
> 当前工作：收集与整理老师会议提出的新需求。
>
> 完成状态：PARTIAL。团队路线和交接文档已整理，具体会议需求尚待提供；新需求的业务确认、设计、实现和验收尚未开始。

本页按各部分的具体情况记录当前进度。后续工作的数字编号和事项见 [项目 README](../../README.md#后续开发路线)。

## 各部分现状

| 部分 | 现有成果与证据 | 未完成事项 |
|---|---|---|
| 新需求 | 已确定收集、业务确认、设计、影响分析、Contract、实现和验收的推进顺序 | 老师会议原始材料与正式需求清单尚未收到；不能把路线示例登记为真实需求 |
| 业务规则 | [总流程](../business/00-overview.md)、[学生](../business/10-student-flow.md)、[教师](../business/20-teacher-flow.md)、[管理员](../business/30-admin-flow.md) 四份权威文档已有确认规则，明确角色责任、课程邀请、运动记录、审核、认证、成绩及管理边界 | 新需求尚未完成 ACCEPTED / PENDING / REJECTED 决策，不得直接进入下游实现 |
| UI / 用户流程 | Android 学生端、Web 学生端、教师 / 管理员 Portal 已有页面和交互代码 | 本轮新增需求对应的入口、页面、Loading / Empty / Error 与权限反馈尚未设计 |
| Domain / 数据库 | [领域与数据库设计](../architecture/phase-3-domain-and-database-design.md) 已覆盖状态、不变量、关系、唯一约束、事务、索引、审计和历史保留 | 当前只有设计，没有本仓库新 Backend 的 migration、真实数据库执行或运行验证；后续仅按新需求增量修改 |
| Backend 架构 | [架构职责](../architecture/backend-architecture.md)、[模块边界](../architecture/backend-module-boundaries.md)、[依赖规则](../architecture/backend-dependency-rules.md) 已明确 | 最小 Composition Root、模块实现和可执行架构测试尚未建立 |
| API Contract | `1.2.0-contract` / `RC`，`/api/v1`，109 paths / 121 operations / 193 schemas / 66 errors；[metadata](../../contracts/contract-metadata.json) 与实际文件 SHA 一致 | [CR-20260901-005](../../contracts/change-requests/CR-20260901-005-explicit-discriminator-mappings.md) 仍是 PROPOSED / BLOCKING；三组 discriminator 显式映射、版本提升与下游重验证尚未完成 |
| Android | 已有 Kotlin 客户端、旧接口清单、隔离的 DTO 生成和 Contract / Mock 验证；[已有验证记录](handoffs/phase-5g-a-android-affected-contract-revalidation.md) 包含 341/341 单测通过、构建通过 | 正式绑定仍为 `3.0.0-contract`，网络链路尚未迁移至新 Contract；没有本仓库真实 Backend 接入和真机 E2E 验收 |
| Web | 已有学生端与 Portal；[已有验证记录](handoffs/phase-5g-b-web-affected-contract-revalidation.md) 包含 affected 13/13、Portal 125/125、Student smoke 79/79、类型检查、构建和浏览器检查 | Portal 正式快照仍为 `3.0.0-web-snapshot`；验证绑定未替换正式旧 API / DTO，演示数据与 BACKEND_REQUIRED 边界仍存在 |
| Backend 实现 | [实现目录](../../BNBU-Sports-Backend/README.md) 的 Git 跟踪内容只有 README | 无可启动服务、真实认证、Use Case、PostgreSQL 持久化或 COS 接入 |
| 联调与部署 | [infra](../../infra/README.md) 与 [E2E](../../tests/e2e/README.md) 入口均为说明文件 | 没有当前基线的真实服务闭环、Docker 联调、Staging、Production 或稳定观察验收 |

Android / Web 测试数字是历史验证记录，不是本次重新执行的结果。当前状态依据文件、元数据与交接证据核对；文档、静态检查、Mock 和真实运行验收必须分别记录。

## Contract 当前基线与阻塞

```text
Version: 1.2.0-contract
Status: RC
Public base path: /api/v1
SHA-256: 667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a
```

三组待处理的 discriminator wire 值是 `EXEMPTION / CERTIFICATION`、`ADD / UPDATE / DELETE`、`MAINTENANCE / NORMAL`。隐式 schema 名与实际 wire 值不一致，结构验证成功不能关闭该兼容性问题。

CR 须经独立评审；接受后发布新的 Version / SHA，重新生成 Android / Web 与计划采用的 Backend 绑定，并验证三组合法值 round-trip 和未知值拒绝。阻塞未解除前不进入 Backend 实现。

## 目前可推进的工作

1. 收集老师会议纪要、原话、截图和补充材料，为实际诉求建立 `REQ-001` 等稳定编号。
2. 整理来源、涉及角色、问题、希望的结果和待确认点，不补造业务规则。
3. 指定每个任务的人类 Owner、Reviewer、分支 / Worktree、明确写入范围、测试标准和 Handoff。
4. 资料完整后由业务负责人逐条确认范围，再按 README 中的顺序推进。

具体会议材料是需求收集完成的前置条件。核心 PENDING 未关闭、设计未评审或 Contract 仍阻塞时，不将受影响能力推进到实现。

## 交接与证据边界

- 本次文档整理与仓库导入记录：[任务 Handoff](handoffs/phase-0-repository-import-and-team-guide.md)。
- [导入 PR #1](https://github.com/chchaiai/new_need_version_sports/pull/1) 已创建，包含完整当前文件快照，等待人工 Review；尚未合并或部署。
- 历史状态记录保存在 [状态存档](handoffs/baseline-status-2026-09-02.md)，用于追溯；本页作为当前情况入口。
- 本次不修改业务规则、Contract、Android、Web、Backend 或数据库实现。
- 按用户要求删除不适用于当前资料与项目汇总仓库的 Backend CI workflow，当前不设置 CI 任务。
- 当前仍有旧 API、Mock / 演示路径与占位目录；本次文档整理不代表这些项目已完成迁移。
