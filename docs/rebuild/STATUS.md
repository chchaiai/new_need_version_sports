# 当前进度状态

> 更新时间：2026-09-04
>
> 当前工作：同步用户对业务复核问题的明确决定：补证终结、责任教师职责、维护计时、课程关闭、逐轮教师 SLA 与备注范围。
>
> 完成状态：本轮已明确决定的业务文档同步与静态检查 DONE；全流程未决边界及系统开发整体仍 PARTIAL。当前学生端仅开发 Android / Web，教师与管理员继续使用 Web；未实施页面、Contract、Backend 或数据库迁移。

本页按各部分的具体情况记录当前进度。后续工作的数字编号和事项见 [项目 README](../../README.md#后续开发路线)。

## 本轮复核决定同步

- 开始基线：`codex/latest-main-20260904` / `49d992a1333294ea561923cfea0b7d25864a4d91`；开始时四份业务正文和 STATUS 已修改，两个前次交接未跟踪，暂存区为空。本轮保留这些改动，不提交、推送、切分支、合并或部署。
- `BD-20260904-02 / ACCEPTED`：补证后经教师判无效直接终结，不再补证；六类公开原因不增项，不将仍有疑虑等同已证实违规。
- 用户补充确认本版责任教师完成本学期教学，不存在学期中删除责任教师；取消原删除后的有限审核接管、授权入口、权限与待办流程，保留完成教学后的常规账号治理和历史保留。对应业务目录入口仅同步这一能力说明。
- 学生补证与教师 SLA 在维护期间暂停，服务端确认恢复 NORMAL 后继续剩余时间；不扣除维护时段，不重新发放完整窗口。教师端维护时只展示公告，不保留原本人改密例外；管理员明确允许的安全治理能力保持。
- 教师 SLA 从异常正式进入待办开始；通过/判无效/退回成功结束本轮。退回启动学生 24/72 小时计时，补证正式受理结束学生计时，并开启新的教师两个学校工作日 SLA。
- 课程关闭禁止新业务起点，不截断关闭前服务器确认的合法业务链；既有会话、首次材料、续传、审核补证、已受理教学申请及结算按原规则继续。关闭不等于结算/归档，不放宽原期限或补证次数。
- “不允许隐藏备注”仅约束打卡审核，保留固定公开分类与可选公开说明；最终成绩管理不设置备注。换算规则行备注、历史事实和其他模块原规则不随之删除。
- 总览第 0.4 节及其他正文引用的未决范围仍为 PENDING：六类均不适用时的终局标准、首次材料受理/期限边界、学校工作日日历与日内边界、非维护故障事后确认的错误逾期补救。不以本轮明确决定替代尚未提供的业务选择。
- 修改四份正文、业务目录 README 的一行介绍、本页并新增[业务复核决定交接](handoffs/2026-09-04-business-review-followup.md)。历史交接、Contract、代码、数据库和架构保持不变；本轮七份文档精确计划比较、共享规则、48 处本地链接、8 处锚点、254 行表格、41 个受保护文件哈希与 Git 范围检查通过；8 个补证计时算例和 8 个轮次状态推演通过，均非产品运行测试。

## 前次审核公开原因补充（历史记录，冲突处以 BD-20260904-02 为准）

- 开始基线：`codex/latest-main-20260904` / `49d992a1333294ea561923cfea0b7d25864a4d91`；工作区已有前次开发范围调整的四个已跟踪修改和一个新增交接，暂存区为空。本轮保留这些未提交改动，不覆盖或重新归档历史。
- 用户接受六类固定中英公开原因及适用动作方案，登记为 `BD-20260904-01 / ACCEPTED`。教师动作仍只有通过、退回补证、判为无效三个；退回进入待补证，教师判定或系统逾期均可形成记录无效状态，不改变学生账户状态。
- 退回和判为无效共用原因目录、按动作限制选项，必须选一个固定分类，可加一句公开说明。固定分类及系统原因提供中英名称，补充说明保留原文；学生补证页、记录详情和站内通知一致，不设置隐藏审核备注。
- “补证逾期”是系统公开原因，不是教师选项。按最终截止和服务器受理事实判断；逾期无效的原记录不能再次补证。按时受理后等待复核、已确认故障顺延及有权限的历史纠错边界保留，纠错不重开补证。
- 本轮仅修改四份业务正文、本页并新增[审核公开原因交接](handoffs/2026-09-04-review-public-reasons.md)；保留 v8.0 基线版本，不修改 Contract、代码、架构、数据库或前次交接。四份正文精确差异、三份共享分类/期限/展示块、39 处本地链接、8 处锚点、251 行表格、Git 范围和空白检查通过；未执行产品测试，不以文档完成代替产品验证。

## 前次开发范围调整（已完成，改动尚未提交）

- 开始基线：`codex/latest-main-20260904` / `49d992a1333294ea561923cfea0b7d25864a4d91`，工作区干净、暂存区为空。
- 用户确认当前不开发 iOS。已删除业务目录内 5 处显式引用，并将“其他学生端”的泛指收紧为 Android / Web；总流程明确 Android 学生端、Web 学生端和教师/管理员 Web 端的开发范围。
- 前次只调整 v8.0 业务基线的客户端开发范围；当时未改运动、计入、审核、期限、权限及仅站内通知规则。“三端职责”指学生、教师、管理员三个角色，继续保留。
- 前次修改总流程、学生流程、管理员流程及本页，新增[开发范围交接](handoffs/2026-09-04-business-platform-scope.md)；当时教师流程、业务目录 README、历史报告、客户端代码、Contract、架构和数据库未改。前次业务范围检索、精确正文差异、31 处本地链接与 4 处锚点、Git 范围和空白检查通过；该结果不作为本轮新增审核规则的验证结果。

## 各部分现状

| 部分 | 现有成果与证据 | 未完成事项 |
|---|---|---|
| 新需求 | 原 ACCEPTED 决策中无冲突部分继续生效；现含 `BD-20260904-01/02`，旧接管及教师维护改密例外已被本轮替代，见[总览](../business/00-overview.md)与[本轮交接](handoffs/2026-09-04-business-review-followup.md) | 不补造独立会议原文；后续新增需求另行登记 |
| 业务规则 | [总流程](../business/00-overview.md)、[学生](../business/10-student-flow.md)、[教师](../business/20-teacher-flow.md)、[管理员](../business/30-admin-flow.md) 为 v8.0；当前开发范围 Android / Web，已同步用户本轮确认的补证、维护、SLA、关闭与职责/备注边界 | 尚有总览第 0.4 节 PENDING，相关分支须先确认；再做页面、状态与 Contract 设计，文档不能证明已运行 |
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

1. 先确认[总览第 0.4 节](../business/00-overview.md#04-待决边界)的 PENDING，再按 v8.0 与 `BD-20260904-01/02` 设计教师逐轮待办、学生补证终结、维护暂停/恢复和课程关闭后的旧业务入口；未确认分支不进入实现。
2. 设计材料版本、AI 任务、逐轮 SLA 与补证计时、最优计入组合、结算版本的领域/数据库变化；不继续实现已取消的删除后接管与最终成绩备注能力。
3. 据新业务提出 Contract 变更，连同既有 discriminator 阻塞统一评审；发布新 Version / SHA 后让下游重新验证。
4. 之后按模块实现真实服务与客户端接入，并执行交接报告中的验收场景。

本轮明确决定已接受，但不宣称全部业务分支闭合；具体 PENDING 见总览第 0.4 节。学校外部反馈渠道、工作日日历和模型效果仍须有真实来源与验证。原“责任教师失效后的非记录教学阻塞 → 接管”不再作为本版预期流程，不得借历史交接重新引入。

## 交接与证据边界

- 本轮：[业务复核决定同步](handoffs/2026-09-04-business-review-followup.md)；前次为[审核公开原因与补证终结](handoffs/2026-09-04-review-public-reasons.md)和[客户端开发范围调整](handoffs/2026-09-04-business-platform-scope.md)。v8.0 原方案见[历史更新报告](handoffs/2026-09-04-teacher-first-business-update.md)；历史说明与本轮冲突处不再适用。
- 前次 v8.0 业务更新以 `71655cc18d0c29b159eebc4ba293a25a27bcfe7e` 为修改前基线；其报告中的分支、提交评审和 PR 状态是历史上下文，不代表本轮状态。本轮从 `49d992a1333294ea561923cfea0b7d25864a4d91` 开始，仅修改当前工作区文档，不提交、推送、合并或部署。
- 历史导入记录见[Phase 0 交接](handoffs/phase-0-repository-import-and-team-guide.md)；[历史状态](handoffs/baseline-status-2026-09-02.md)只供追溯。
- 本轮仅修改四份业务正文、业务目录 README 的一行能力介绍、STATUS 和指定新交接；保留前次未提交改动，没有修改项目 README、Contract、Android、Web、Backend、数据库设计、实现或历史交接。
- 当前仍有旧 API、Mock/演示路径与占位目录，历史客户端测试数字未重跑；本轮仅执行文档与变更范围检查，结果见交接报告。
- 原有 Backend CI 删除状态保留，本轮未新增 CI 或部署任务。
