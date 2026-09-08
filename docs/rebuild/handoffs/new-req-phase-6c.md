# Phase 6C 汇总验收与发布条件

2026-09-09（Asia/Shanghai）。新版阶段全名为 **Phase 6 Android / Web Contract + Mock 验证**；6A Android、6B Web、6C 跨端汇总。它不是旧文件名中的 phase5a/5b/5ga/5gb。

## 结论与接受范围

**6C 技术门禁通过，进度一致性修复已获用户审核接受；本次收尾包等待用户提交、PR 审核及合并。** 用户原话：“好的，审核通过，准备交接收尾”。用户担任 Android Owner、架构负责人、Contract Owner、6C 汇总人和人类 Reviewer；Codex 执行与自检，不登记独立人类复审。Web Owner 为甘洛夷，接收侧修复由用户授权完成。

本包合并到 main、发布脚本记录的实际交付 Commit 被纳入合并结果、下列已审文件字节核验一致后，**Phase 6 DONE / Phase 7.0 READY** 条件生效。合并前 H/Z 可阅读和准备方案，不能把本地接受写成远端已发布。无需为预填将来 SHA 再补一次纯记录 PR：交付 SHA 取实际提交与上传回执，合并 SHA 取新 PR 的真实合并记录；H/Z 在自己的 7.0 入场记录中登记并核验。

## 固定身份

| 对象 | 已核验事实 |
|---|---|
| 仓库 | `https://github.com/chchaiai/new_need_version_sports.git` |
| 本轮基线 / 已合并 PR #11 | `93d18fd317e0f622bf306b8707ea1d92d23322dd` |
| PR #11 Web 修复来源 | `ef9c6312411ce6198d406665945d99be4c6e7082` |
| PR #11 来源与合并树 | 均为 `5f97c758f9bf9c0210204d44426f6d436afc4800` |
| Android 交付 / PR #12 合并 | `333f6dfa42f89cbee9cce387638d05a88a7fdd74` / `5800550d369e1c7acf5223773d244689a7cfe0df`；Android 路径与本轮基线无差异 |
| 本轮新分支 | `codex/phase6c-progress-consistency`，新 PR 合入 main；不继续使用已关闭的 PR #11 |
| Contract | `1.3.0-contract / RC`，公开路径 `/api/v1` |
| OpenAPI SHA-256 | `5c87eeb9bca39585cea2e3c80c60d58813b4367e1a60b161ed8c7f82af4a19ed` |
| Contract 来源 | `f702c590ff10b11f7de038332868c988ab4cec11`；本轮协议字节、版本、状态未改 |
| 992 固定输入 SHA-256 | `d3c2a37f4bad298f383b70579a3e5d22e5e117cd0cee238beb6b6d336dc0deef` |

## 跨端核对与问题处置

| 核对内容 | 对应证据与结论 |
|---|---|
| 生成与实际绑定 | Web 类型/生成一致性检查通过；Android 已接受的 324 模型生成/构建与当前 Android 源码一致。两端实际加载同一 RC/SHA |
| 三组原 discriminator | 6C 使用 Web 已安装的 Ajv 8.17.1 / ajv-formats 3.0.1 加载固定协议：59/59，含七个合法分支的 JSON 往返；逐例对上 Android 已接受 schema/生成模型往返结果。此项是隔离验证，不新增正式网络调用 |
| 共同 schema 输入 | 实际 Web 运行时校验器覆盖的五个根类型中，固定语料有54例，逐例与 Android 接受/拒绝结果一致；保留 required、null、枚举、日期和未知字段断言，不改输入 |
| 审核/错误与 Mock | Web 247项套件及学生92项包含处理态与终局分离、未知计入量、认证/首次改密、空态与依赖错误区分、维护和公开原因等；对应 Android 已接受 Mapper/Mock 证据。不是以两端总数相等代替语义核对 |
| 进度一致性 | 归属错误、分类分钟矛盾是 Client Defect `6C-WEB-PROGRESS-01`。Web 已补校验，新增21项回归；原3例对照为正常接受、错误归属拒绝、错误剩余量拒绝，与 Android 一致。状态 `CLOSED_USER_ACCEPTED` |
| 重算展示差异 | Android 可明确展示历史检查点；Web 隐去数值并标记重算中。两者都不将旧结果冒充当前结果，属于允许的展示差异 |
| CR / 业务 | 本轮新增阻塞 Contract CR 为0，无新增业务决定。P-01～04沿用正式决定；日历/服务器截止/故障纠错的实际执行仍由后端验证 |

本轮核对不是两端重新执行全部992例。Android沿用已接受且源码未变的1156协议、255 Mapper、71 Mock、模拟器74/74、横屏大字体1/1及人工启动器2/2记录；用户 iQOO12Pro 人工查看是用户报告，不是真机自动化。Web最终247项已包含定向107项，不能相加。

## 本次验证与复现

- 学生 `npm run test:student`：92/92。
- Portal `npm test`：247/247，包括构建及21项新增回归；定向 `node --import tsx --test tests/phase6b-wire.test.mjs`：107/107。
- Portal `npm run typecheck`：exit 0，包括固定协议与生成一致性；`git diff --check` 通过。
- 6C：[可复现核对脚本](new-req-phase-6c-evidence/consolidate.mjs)、[逐例结果](new-req-phase-6c-evidence/consolidation.json)、[接受、文件哈希与原始日志索引](new-req-phase-6c-evidence/verification.json)。原修复前3例结果保留于 [pre-fix-progress.json](new-req-phase-6c-evidence/pre-fix-progress.json)。

从仓库根执行 `node docs/rebuild/handoffs/new-req-phase-6c-evidence/consolidate.mjs`，读取当前协议、Web依赖和 Android 接受证据；将新结果保存到独立文件，不覆盖历史结果。依赖先按 Portal package-lock 执行 `npm ci`。Web常规命令见[运行时校验器说明](../../../BNBU-Sports-Web-new/frontend/student/js/contract/README.md)。Windows Portal 的继承测试使用外部 python3 命令适配到现有 Python/PyYAML；日志如实记录，未削弱断言。构建有 >500 kB chunk 提示，未做性能验收。

## 保留责任与 H/Z 入场

真实 Backend、PostgreSQL/迁移、鉴权与事务、权威校历、对象存储、AI/OCR质量、恢复、E2E和部署均未因6C通过而验收。正式客户端仍有旧 API、Mock/DEV_ONLY及迁移清单，Android由用户、Web由甘洛夷在Phase8落实；本轮没有新增产品Mock/TODO/空接口。

[Phase 6 → Phase 7 接收包](new-req-phase-6-to-phase-7.md)是H/Z的完整入口。7.0须确认技术栈、唯一小任务Owner、Reviewer（用户）、可写路径和测试环境，执行 `BE-CR005-COMPAT` 及包括 CertificationKind 的 Contract/Application/Domain/Database 对齐；未通过不得关闭7.0或进入7.1。H/Z尚未具名回复实际接收结果，本记录不代签。每完成一个批准工作包即汇报，GitHub仍由用户操作。
