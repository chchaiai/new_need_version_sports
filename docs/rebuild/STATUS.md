# 当前进度状态

> 更新时间：2026-09-04
>
> 当前工作：教师辅助优先方案的业务规则与流程更新至 v8.0。
>
> 完成状态：本轮业务文档 DONE；系统开发整体仍 PARTIAL。四份权威正文、入口与更新报告已完成；UI、领域/数据库、Contract、Backend 与客户端尚未迁移或验收。

本页按各部分的具体情况记录当前进度。后续工作的数字编号和事项见 [项目 README](../../README.md#后续开发路线)。

## 各部分现状

| 部分 | 现有成果与证据 | 未完成事项 |
|---|---|---|
| 新需求 | 用户对话中的实际诉求已整理为 10 组 ACCEPTED 决策，见[总览](../business/00-overview.md)与[交接报告](handoffs/2026-09-04-teacher-first-business-update.md) | 不补造独立会议原文；新增需求另行登记 |
| 业务规则 | [总流程](../business/00-overview.md)、[学生](../business/10-student-flow.md)、[教师](../business/20-teacher-flow.md)、[管理员](../business/30-admin-flow.md) 已更新至 v8.0 | 下一步完成新流程对应的设计与 Contract；文档不能证明已运行 |
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

1. 按 v8.0 设计教师异常队列、名单/OCR、管理员模板和服务治理、学生数据与补证页面，覆盖状态与权限。
2. 设计材料版本、AI 任务、一次补证期限、最优计入组合、结算版本和有限授权的领域/数据库变化与迁移。
3. 据新业务提出 Contract 变更，连同既有 discriminator 阻塞统一评审；发布新 Version / SHA 后让下游重新验证。
4. 之后按模块实现真实服务与客户端接入，并执行交接报告中的验收场景。

当前没有在本轮规则范围内保留核心 PENDING。模型效果、学校外部反馈渠道、责任教师失效后的非记录教学阻塞仍须在运行落地时有真实责任与证据，不能通过虚构能力或越权写入解决。

## 交接与证据边界

- 本轮：[业务更新、前后对照和验收清单](handoffs/2026-09-04-teacher-first-business-update.md)。
- 本轮基线为 `71655cc18d0c29b159eebc4ba293a25a27bcfe7e`，提交已包含导入 PR #1 的合并；不继续使用“尚未合并”的旧导入状态。用户已授权将业务文档分支提交至原仓库并创建 PR，当前进入提交评审流程；尚未合并或部署本轮更新。
- 历史导入记录见[Phase 0 交接](handoffs/phase-0-repository-import-and-team-guide.md)；[历史状态](handoffs/baseline-status-2026-09-02.md)只供追溯。
- 本轮修改业务规则、README/状态与交接报告；没有修改 Contract、Android、Web、Backend、数据库设计或实现。
- 当前仍有旧 API、Mock/演示路径与占位目录，历史客户端测试数字未重跑；本轮仅执行文档与变更范围检查，结果见交接报告。
- 原有 Backend CI 删除状态保留，本轮未新增 CI 或部署任务。
