# 仓库导入与团队指南交接

> 日期：2026-09-02（Asia/Shanghai）
>
> 当前任务：新一轮需求收集的文档准备，以及当前分支文件导入目标仓库。
>
> 文档任务状态：DONE；仓库导入等待 PR 创建结果回填。
>
> 需求收集状态：PARTIAL，老师会议的实际需求资料尚未提供。

## 授权与范围

用户授权将当前分支全部内容提交为目标仓库的 Pull Request，并完善 README 中的当前进度、AGENTS.md / 系统提示词模板与工程原则、后续阶段和团队协作方式。

用户补充要求：后续阶段使用从 0 开始的数字编号；当前进度按各部分的具体情况表述，不使用原阶段标识。

本次修改范围为根 README、当前状态和本目录交接记录。业务文档、架构文档、根 AGENTS.md、Contract、客户端、Backend、数据库和 CI 均只读。原状态正文存档，保留原编号，仅修正归档后的相对链接。

## 起点与发布方式

| 项目 | 值 |
|---|---|
| 工作区 | `C:\Users\23328\Desktop\new_version` |
| 起始分支 | `API-contract-Making` |
| 起始 HEAD | `f4948d32803992cca4236064f542f45a950faca2` |
| 起始状态 | 干净；468 个 Git 跟踪文件，无 Git submodule 条目 |
| 已读取 AGENTS.md | 根 `AGENTS.md`；本次写入范围内无下级 AGENTS.md |
| 目标仓库 | [chchaiai/new_need_version_sports](https://github.com/chchaiai/new_need_version_sports) |
| 目标基线 | `main` / `62238a17853ce962fc12e7baeae345fbaea4a3cf`；只有初始 README |
| 历史关系 | 本地分支与目标 main 无共同祖先 |
| 导入方式 | 将当前完整 Git 文件树作为目标 main 上的新快照提交，通过独立 PR 分支导入；本地原分支和既有提交历史保留 |
| 完整性标准 | PR 分支的 Git tree 必须与文档定稿后的本地源分支 Git tree 完全一致 |

“全部内容”指当前分支的全部 Git 跟踪文件和本次文档成果。不把 `.git`、忽略的缓存、依赖目录和本机配置当作项目内容；目标仓库得到完整文件快照，本地旧提交历史不额外导入。

本次授权包含文档提交、push 和创建 PR；不包含合并到 main 或部署。

## 修改文件

| 文件 | 变化 |
|---|---|
| [README.md](../../../README.md) | 新增当前各部分情况、阅读入口、0–12 路线、6A / 6B 验证、7.0–7.6 Backend 切片、团队分工、AGENTS.md 模板、任务提示词及交接要求 |
| [STATUS.md](../STATUS.md) | 改为组成部分视角的当前状态，说明具体成果、遗留项和推进条件 |
| [状态存档](baseline-status-2026-09-02.md) | 保存重启前的完整状态正文；只调整相对链接 |
| 本文件 | 记录授权、源与目标基线、导入方式、验证和遗留问题 |

## 核实的现状

- 根 Contract 仍为 `1.2.0-contract` / `RC`，实际 SHA-256 与 metadata 均为 `667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a`。
- `CR-20260901-005` 仍为 `PROPOSED / BLOCKING`，未修改或关闭。标准结构检查不能证明 discriminator 的跨生成器兼容。
- Android 正式 `contract.properties` 仍为 `3.0.0-contract`；Portal 正式 `contract.json` 仍为 `3.0.0-web-snapshot`。
- Backend、infra、E2E 目录的 Git 跟踪文件均为说明文件，不存在当前 Backend 的运行验收。
- Backend CI workflow 引用 `backend/`、旧工具及依赖路径，而这些路径不在当前分支；本次按全部内容要求保留该文件，记录为后续独立修复事项。
- 根 AGENTS.md 规则未修改。README 模板是供人复用的说明，不自动替换生效规则。

## 本次验证

| 验证 | 真实结果 |
|---|---|
| `python -B contracts/scripts/verify_contract.py` | PASS：109 paths、121 unique operations、193 schemas、66 errors |
| `python -B contracts/scripts/check_rc_readiness.py` | PASS：metadata 状态和 decisions 目录检查通过；该脚本不检查 PROPOSED CR，不能据此关闭 CR-005 |
| 临时只读 Python 文档检查 | PASS：4 份文档严格 UTF-8、代码围栏闭合、119 个本地链接及锚点有效；未新增持久化测试文件 |
| 当前进度与路线编号 | PASS：README 当前进度与 STATUS 可见文字不含阶段标识；后续路线一级阶段准确为 0–12 |
| 原状态存档比较 | PASS：与起始 HEAD 中的 STATUS 全文逐字比较，除相对链接位置调整外内容完整保留 |
| Contract Version / Status / 实际 SHA | PASS：与原基线完全一致 |
| 写入范围 / `git diff --check` | PASS：仅本次 4 份文档；业务、架构、AGENTS、Contract、产品代码及 CI 无修改；空白检查通过 |
| 当前 Git 树发布前检查 | 未发现 submodule、超过 GitHub 单文件限制的文件、被跟踪的私钥 / 本机凭据文件或所扫描的高确定性凭据模式；这不是完整安全审计 |
| 源与 PR 文件树、远端 PR 状态 | 待 push 与创建 PR 后核实 |

未计划重跑 Android / Web 全量构建、单测、浏览器或真机测试：本轮不改产品代码；README 中已有数字明确标为历史记录。Backend / 数据库 / COS / Docker E2E / Staging / Production 未执行，当前无对应实现与本轮授权。

## 交付结果

PR 尚未创建；完成后在此填写链接和验证状态。

## 未完成项与下一步

- 业务规则变化：无。Contract / Version / SHA 变化：无。
- 旧 API：仍存在，Android / Web 正式运行链路尚未迁移。
- Mock / 演示：仍存在，用于界面或 Contract 验证，不等于真实服务。
- 占位：Backend、infra、E2E 仍有说明性占位；本次没有新增产品 TODO 或空接口，也没有全库 TODO 清零验收。
- 需求收集：等待老师会议材料，不能虚构需求编号对应的业务内容。
- 后续实现前置：业务范围确认、受影响设计评审、Contract CR 处理、新 Version / SHA 与两端重验证通过。
- 团队任务仍需指定实际人类 Owner / Reviewer；本次不代填业务决定人或生产发布批准人。
