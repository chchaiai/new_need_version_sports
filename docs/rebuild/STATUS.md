# 当前进度状态

> 更新时间：2026-09-04
>
> 当前工作：按用户要求删除总览“0.4 待决边界”及当前失效引用，版本保持 V8.1，更新现有 [PR #3](https://github.com/chchaiai/new_need_version_sports/pull/3)；目标仍为 `chchaiai/new_need_version_sports:main`，未合并、未部署。
>
> 完成状态：指定章节删除、引用同步与文档检查 DONE；系统开发整体仍 PARTIAL。当前学生端仅开发 Android / Web，教师与管理员继续使用 Web；未实施页面、Contract、Backend 或数据库迁移。

本页按各部分的具体情况记录当前进度。后续工作的数字编号和事项见 [项目 README](../../README.md#后续开发路线)。

## 本轮删除指定待决说明

- 用户要求先忽略并删除总览“0.4 待决边界”，版本仍为 V8.1；已删除该标题、说明与表格，清理四份当前业务正文对该节的引用，不在其他当前业务章节重新列出该表。
- 本次是文档删减，不等于原问题已得到业务答案；不新增公开分类、不改变已确认审核/期限/SLA 等规则，也不将此前讨论建议视为 ACCEPTED。
- 开始分支 `codex/latest-main-20260904`，HEAD 为 `98ef558355e75dfd62dee6e8a806d6da7ebf5f17`；工作区、暂存区干净，PR #3 仍 OPEN，沿用同一分支追加提交。
- 修改四份业务正文、本页、新增[章节删除交接](handoffs/2026-09-04-business-remove-pending-section.md)，并仅将既有复核交接的一处失效链接固定到删除前 Git 快照；共七份文档。历史交接正文及旧提交保留，历史记录中的第 0.4 节描述属于删除前状态。
- 七份文档精确差异、V8.1 保持、三份六类原因表与 19 项共享规则检查通过；50 处本地链接、3 处锚点、259 行表格及格式检查通过，83 个受保护文件哈希不变；Git 范围和空白检查通过。未修改 Contract、客户端、Backend、数据库、两份 README 或部署配置，未运行产品测试。

## 前次业务版本更正（历史记录）

- 用户明确本次最新业务逻辑应为 V8.1，原 v8.0 当前版本标记有误。本轮只更正版本及发布说明，不新增业务决定，六类公开原因、BD-20260904-01/02 和四项 PENDING 原样保留。
- 开始分支 `codex/latest-main-20260904`，HEAD 为 `5fb596baafeefb91f426f6bfadd6cde609e9dff7`；工作区和暂存区干净。远端 PR #3 仍 OPEN，head 与本地一致；沿用同一分支追加提交，不新开 PR、不合并、不部署。
- 更正四份业务权威、业务目录 README 和项目 README 的当前版本标记；同步本页并新增[版本更正交接](handoffs/2026-09-04-business-version-v8.1.md)，共八份文档。项目 README 仅替换三处当前版本，历史方案和既有交接中的 v8.0 保留。
- Contract 仍为 `1.2.0-contract / RC`，不改变版本、SHA 或生成物；客户端、Backend、数据库和业务参数均未改。既有旧 API、Mock/演示和占位目录未迁移或清理。
- 本轮精确版本替换与业务条款/PENDING 保持检查通过；82 处本地链接、12 处锚点、280 行表格及格式检查通过，81 个受保护文件哈希不变，Git 范围和空白检查通过；具体结果见版本更正交接。未运行产品构建、单测或 E2E：本轮仅修改文档版本标记和交付说明。

## 前次业务文档 PR 发布（历史记录）

- 用户授权将最新业务逻辑提交到目标仓库 PR。本轮发布既有已确认文档，不把上一轮针对四项 PENDING 的建议视为接受，不新增业务决定。
- 开始基线：`codex/latest-main-20260904` / `49d992a1333294ea561923cfea0b7d25864a4d91`；六份已跟踪文档修改、三份新增交接，暂存区为空。已核对 `project` 对应目标仓库，`origin` 为不同的 Backend 仓库；未向其他远程推送。
- 业务内容提交：`c173c6aaedf9c7f8bfdd6c66b360320ae8cb5839`，精确包含开始时的九份文档。推送 `project` 的 `codex/latest-main-20260904`，创建 [PR #3](https://github.com/chchaiai/new_need_version_sports/pull/3) 指向 `main`；本页及[发布交接](handoffs/2026-09-04-business-pr-publication.md)随同一 PR 分支回填。
- PR 创建后核验为 OPEN、非草稿、MERGEABLE / CLEAN；当时 head 与内容提交一致，base 为 `49d992a1333294ea561923cfea0b7d25864a4d91`，远端九个文件与本地范围一致。状态查询没有返回 CI 检查项，不代表 CI 通过；最终发布范围与证据见交接。
- 提交前九份文档 UTF-8、围栏、空白、302 行表格、57 处本地链接及 8 处锚点检查通过；共享规则与上一轮已验证版本一致。根 AGENTS 与全部 Contract 跟踪文件共 39 个受保护文件哈希不变，暂存范围与文件内容检查通过。发布交接回填后，十份文档的 323 行表格、68 处本地链接、8 处锚点及格式检查通过；前述 39 个文件与八份原样发布文档共 47 个文件哈希不变。
- 发布总范围为四份业务权威、业务目录 README、STATUS、三份既有交接及一份新发布交接，共十份文档；本轮只新增发布交接、更新 STATUS，其他八份待发布文档原样提交。未切换分支、重写提交、合并、直接推送 main 或部署。
- 未运行产品构建、单元测试、Backend/数据库、真实上传/计时/通知/权限或 E2E；本轮没有对应实现改动，不把文档检查、可合并状态或 PR 创建当作产品验收。

以下三节保留前次修改的执行记录；其中“本轮”“未提交”等描述属于各次历史时间点，相关文档现已随 PR #3 提交。

## 前次复核决定同步（历史记录，已随 PR 提交）

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

## 前次开发范围调整（历史记录，已随 PR 提交）

- 开始基线：`codex/latest-main-20260904` / `49d992a1333294ea561923cfea0b7d25864a4d91`，工作区干净、暂存区为空。
- 用户确认当前不开发 iOS。已删除业务目录内 5 处显式引用，并将“其他学生端”的泛指收紧为 Android / Web；总流程明确 Android 学生端、Web 学生端和教师/管理员 Web 端的开发范围。
- 前次只调整 v8.0 业务基线的客户端开发范围；当时未改运动、计入、审核、期限、权限及仅站内通知规则。“三端职责”指学生、教师、管理员三个角色，继续保留。
- 前次修改总流程、学生流程、管理员流程及本页，新增[开发范围交接](handoffs/2026-09-04-business-platform-scope.md)；当时教师流程、业务目录 README、历史报告、客户端代码、Contract、架构和数据库未改。前次业务范围检索、精确正文差异、31 处本地链接与 4 处锚点、Git 范围和空白检查通过；该结果不作为本轮新增审核规则的验证结果。

## 各部分现状

| 部分 | 现有成果与证据 | 未完成事项 |
|---|---|---|
| 新需求 | 原 ACCEPTED 决策中无冲突部分继续生效；现含 `BD-20260904-01/02`，旧接管及教师维护改密例外已被本轮替代，见[总览](../business/00-overview.md)与[本轮交接](handoffs/2026-09-04-business-review-followup.md) | 不补造独立会议原文；后续新增需求另行登记 |
| 业务规则 | [总流程](../business/00-overview.md)、[学生](../business/10-student-flow.md)、[教师](../business/20-teacher-flow.md)、[管理员](../business/30-admin-flow.md) 为 V8.1；当前开发范围 Android / Web，已同步用户本轮确认的补证、维护、SLA、关闭与职责/备注边界 | 仍须完成页面、状态与 Contract 设计；文档删减不代表原问题已解决或产品已运行 |
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

1. 按 V8.1 与 `BD-20260904-01/02` 已确认正文设计教师逐轮待办、学生补证终结、维护暂停/恢复和课程关闭后的旧业务入口；若后续实现遇到未明确业务，仍按 AGENTS 由用户确认，不由实现自行补造。
2. 设计材料版本、AI 任务、逐轮 SLA 与补证计时、最优计入组合、结算版本的领域/数据库变化；不继续实现已取消的删除后接管与最终成绩备注能力。
3. 据新业务提出 Contract 变更，连同既有 discriminator 阻塞统一评审；发布新 Version / SHA 后让下游重新验证。
4. 之后按模块实现真实服务与客户端接入，并执行交接报告中的验收场景。

本轮仅删除指定说明，不宣称原问题已解决或全部业务分支闭合。学校外部反馈渠道、工作日日历和模型效果仍须有真实来源与验证。原“责任教师失效后的非记录教学阻塞 → 接管”不再作为本版预期流程，不得借历史交接重新引入。

## 交接与证据边界

- 本轮：[章节删除交接](handoffs/2026-09-04-business-remove-pending-section.md)。前次为[V8.1 版本更正](handoffs/2026-09-04-business-version-v8.1.md)、[业务文档 PR 发布](handoffs/2026-09-04-business-pr-publication.md)、[业务复核决定同步](handoffs/2026-09-04-business-review-followup.md)、[审核公开原因与补证终结](handoffs/2026-09-04-review-public-reasons.md)和[客户端开发范围调整](handoffs/2026-09-04-business-platform-scope.md)。v8.0 原方案见[历史更新报告](handoffs/2026-09-04-teacher-first-business-update.md)；历史说明与现行正文冲突处不再适用。
- 前次 v8.0 业务更新以 `71655cc18d0c29b159eebc4ba293a25a27bcfe7e` 为修改前基线；其报告中的分支、提交评审和 PR 状态是历史上下文。前次发布从 `49d992a1333294ea561923cfea0b7d25864a4d91` 开始，已提交文档并向指定目标仓库推送业务分支、创建 PR #3，未合并或部署。
- 历史导入记录见[Phase 0 交接](handoffs/phase-0-repository-import-and-team-guide.md)；[历史状态](handoffs/baseline-status-2026-09-02.md)只供追溯。
- 前次发布原样提交业务改动，仅为记录 PR 更新 STATUS 并新增发布交接；没有修改项目 README、Contract、Android、Web、Backend、数据库设计、实现或既有交接。当时四项 PENDING 及既有 Contract 门禁保持；本轮删除待决说明不修改 Contract 门禁。
- 当前仍有旧 API、Mock/演示路径与占位目录，历史客户端测试数字未重跑；本轮仅执行文档与变更范围检查，结果见交接报告。
- 原有 Backend CI 删除状态保留，本轮未新增 CI 或部署任务。
