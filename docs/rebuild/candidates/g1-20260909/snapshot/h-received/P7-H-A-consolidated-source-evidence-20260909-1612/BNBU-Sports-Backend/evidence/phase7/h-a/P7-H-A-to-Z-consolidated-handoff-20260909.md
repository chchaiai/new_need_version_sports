# P7-H-A → Z 集中交接（2026-09-09）

状态：**PARTIAL / NOT_TRACK_READY**。本次交付 H 最新源码与原始证据，不是 G1 验收通过，也不是整个 Phase 7 已完成。本次只生成交换材料及只读接收 Z 包，未启动双方联调、覆盖工作区或执行 GitHub 操作。

## 1. 固定身份及包关系

| 项目 | 值 |
|---|---|
| 仓库 | https://github.com/chchaiai/new_need_version_sports |
| 原 Phase 7 入场 Commit | `200ff07e22ff6e2e253d965765a498088af2463c` |
| G0 合并后共同基线 / H 实际 HEAD | `f95c3833870fe0da55a297aa28c958ec53e9e935` |
| H 分支 | `codex/phase7-h-a-session-evidence` |
| 候选代码 | 基线上未提交源码；HEAD 不代表这些候选已被提交 |
| Contract | `1.3.0-contract / RC` |
| Contract canonical LF SHA-256 | `5c87eeb9bca39585cea2e3c80c60d58813b4367e1a60b161ed8c7f82af4a19ed` |
| 工作项 | WI-0035，H 实施，Z 定向技术复核，用户最终验收/GitHub 操作 |

本文件配套 `P7-H-A-consolidated-source-evidence-20260909-1612.zip`。包中包含三个 H 模块当前完整源码、五个 H 迁移、原始测试、复现测试程序、仅用于测试的 Z v1.3 迁移依赖、SHA 清单及本交接说明。不是完整仓库/部署包，不含 `.git`、凭据、依赖目录或 Z 最新源码的副本。

**H 源码以本次包为准，不再叠加旧增量包。**旧 `P7-H-A-integration-snapshot-20260909.zip` 的 37/83 结果是历史快照；56/77/83 等旧报告不代表本次结果。旧包保持原样以便追溯。

## 2. 已实现范围

| 范围 | 当前实现 | 不能据此推断 |
|---|---|---|
| Session | 开始/暂停/恢复/完成、真实 ACTIVE 区间、原归属与版本、加密幂等、本人/原责任教师受限查询、数据库约束 | Z 完整权限/注销并发联调已通过 |
| Media | 分配、权威上传观察/内容检查事实及绑定仓储；不可变对象版本和 checksum；正式批次数量/清单核验 | 真实 COS 直传、内容探测和故障恢复已完成 |
| Record 首次受理 | 原 Session 归属、未调整首次窗口、锁定材料清单、同事务写入记录/绑定/审计/加密回执/outbox；冻结 POST 接口及微秒投影 | 调整窗口、后续批次处理和完整 Record 产品已完成 |
| 离线游泳 | 全部 VERIFIED、前后阶段清单、说明、无续传宽限、同事务绑定 | 客户端阶段标签已证明拍摄真实性；记录已有效或已计入 |
| 维护/故障计时 | 已确认区间裁剪、并集去重、精确计时、缺失覆盖拒绝 | 已接入期限持久化、事故认定或 P-04 纠错 |

首次受理响应只表示材料受理；Outbox 只表示同事务保存待处理事件，不表示通知已送达、AI 已运行或运动有效。

## 3. 实测与证据边界

| 检查 | H 实际结果 | 证据 |
|---|---|---|
| 真实 PostgreSQL / HTTP | 44 通过，0 失败/跳过/TODO | `h-a-submission-postgres-final.tap` |
| H 原生单元测试 | 92 通过，0 失败/跳过/TODO | `h-a-submission-unit-complete.tap` |
| TypeScript / ESLint | exit 0 | WI-0035 执行记录、`H-A-submission-checkpoint.md` |
| 架构诊断 | unexpected=[]；正式 gate 仍 false | `h-a-current-architecture-diagnosis.json` |

两份 TAP 的 SHA-256：

```text
h-a-submission-postgres-final.tap
ffda3a2f825c6d67154e65b1f1f60a798217c7b9da62649ee117c188c3872f63
h-a-submission-unit-complete.tap
2d4a9671b0e4b1e3a5301b93efecbc05add154ad84106c21f5355027b0e508a8
```

冻结 Node 24.19.0、PostgreSQL 17.6，原 lockfile SHA `4ee60feb03aa2cec5d71d572045936f7986ea2638efc8cba7363e04f4851e9af`。所有测试只使用隔离合成数据；临时容器已清理，原始报告保留。最终新增区间工具后重跑了全部单元、类型/静态检查，数据库实现未再变化。

44 项覆盖真实事务/HTTP、H 迁移 up/down/up、同键并发、维护期间原回执重放、身份失效、原资源归属、截止等号、checksum 冲突、审计和 Outbox SQL 失败回滚、游泳离线分支、绑定回滚。

**测试 Identity/Course/Mode/activity provider 是明确的测试替身，不能计作真实 Z 权限验证。**没有真实 COS、生产数据或学校真实目录验证。本轮只核对现存证据并打包，没有重新运行 Docker 测试。

## 4. Z 已到达材料（本次更新）

已收到 `P7-Z-A-backend-snapshot-20260909-1608.zip`：

```text
ZIP SHA-256
e91d4f3a15c43ab6674719619a32aed2776ec770ae4eaa765317dda318da5e92
```

只读核对：清单 169 项中 167 项非 `.env` 文件长度/SHA 匹配，0 不匹配；两个 `.env` 示例按工作区安全规则未读取/校验；未发现路径穿越。包内 Contract 规范化 LF SHA 与共同输入一致。未解包覆盖、运行脚本或将文档操作建议视为新授权。

因此“尚未收到 Z 最新源码/1070–1100”已经过时，改为“**最新 Z 源码已收到，尚未兼容核查和真实联调**”。Z 包还包含 1110；整体声称 13 个迁移（0000、1000–1110）。本次没有逐个审查迁移语义。

Z 包报告 1160 总计、1156 通过、4 失败、0 跳过。失败与查询参数错误码 CR 有关（期望 400/INVALID_REQUEST，实际 500）；这些是 Z 报告、H 未复现，不能忽略后宣布全绿。新增 `listStudentAccounts` 不在 H 之前复核的 12 个操作中，需要单独核对该增量，不能沿用旧审核结论。历史学生 DTO/PII 的协议决定仍未关闭。本次没有批准或修改任何 Contract。

## 5. 装配清单与可写边界

H 源码路径：

```text
BNBU-Sports-Backend/src/modules/exercise-session/**
BNBU-Sports-Backend/src/modules/media-evidence/**
BNBU-Sports-Backend/src/modules/exercise-record/**
BNBU-Sports-Backend/migrations/1500_exercise_session.sql
BNBU-Sports-Backend/migrations/1510_session_command_replay.sql
BNBU-Sports-Backend/migrations/1600_record_media_assets.sql
BNBU-Sports-Backend/migrations/1700_first_record_material.sql
BNBU-Sports-Backend/migrations/1710_record_command_state.sql
```

根 Owner 登记的完整对照：

```text
exercise_session.session → exercise-session
exercise_session.active_interval → exercise-session
exercise_session.command_replay → exercise-session
media_evidence.record_asset → media-evidence
exercise_record.record → exercise-record
exercise_record.first_material → exercise-record
exercise_record.first_material_asset → exercise-record
exercise_record.command_replay → exercise-record
exercise_record.acceptance_outbox → exercise-record
```

Z 包已报告登记前七张；后两张是本次新增，应比较后补入，不要求重复登记。1710 在 1700 后执行，回退时顺序相反。完整 Z 最新迁移链＋H 五个迁移尚未共同验证。

根 bootstrap、迁移入口、共享错误封装、测试发现、依赖和 Owner 注册保持 Z 负责。H 不直接修改 Z 根文件。包内 v1.3 迁移目录仅是隔离测试夹具，**不得作为生产或最新 Z 迁移覆盖源**。接入前保护各自未提交修改，禁止直接整目录覆盖、清理或自动合并。

关键接入口：Session 的 `api/routes.ts`、`api/query-routes.ts`；Record 的 `api/submission-routes.ts`；错误策略 `application/submission-error-policy.ts` 和 Media 的 `application/media-error-policy.ts`。构造依赖以随包 TypeScript Port 原文为准，不能只凭本说明猜签名。

## 6. 尚需完成、由谁推进

| 项目 | 责任与下一步 |
|---|---|
| H 调整截止与未完成材料链 | H 继续实现资格、期限持久化、后续检查/绑定及恢复；当前区间工具不能直接标记完成 |
| 真实活动/前后凭证依据 | H 负责落实消费侧验证；跨模块来源由双方按现有职责对接。`assertUnadjusted` 没有真实提供方，禁止默认成功 |
| Z 源码装配/身份/模式/课程/注销 | Z 主持根装配，H 配合模块适配；新包已到达，不再重复索要同一源码 |
| 对象存储 | H 完成适配与故障测试；获准隔离目标/配置仍需确认，不在交接文件传播凭据 |
| 查询错误 CR / 历史学生表示 | Reviewer/协议责任人决策；Z 落实其范围，H 定向复核影响；不自行改冻结 Contract |
| 正式 G1 / 后续 G2 | 真实联合验证和问题关闭后由 Reviewer 验收；本包不自动开放 G2，更不表示 Phase 7 全部完成 |

## 7. 最小复查方式

1. 一次核对本包清单、基线、Contract 身份和新增接入口；无需重审已接受 Foundation。
2. H 与 Z 各自继续未完成实现；跨边界问题合并为一张清单，不按每个小文件来回审核。
3. 接到明确联调安排后，再在批准的隔离集成工作区装配双方完整源码，跑真实权限、注销/会话并发、迁移、提交/续传、存储失败恢复和公共错误回归。
4. 只定向审核实际变更与失败，保留原断言和失败证据；双方报告不简单相加充当联合测试。
5. 集中反馈缺口和精确文件/签名/失败日志。GitHub 仍由用户操作。

本文件与配套包仅提供交接材料，不授权收件方覆盖工作区、改协议、部署或替用户发布。
