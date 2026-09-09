# H 首次记录提交实现 checkpoint — 2026-09-09 16:02 +08:00

状态：PARTIAL / WI-0035 IN_PROGRESS。不是 G1 PASS、不是整个 Phase 7 只剩联调。

HEAD/base `f95c3833870fe0da55a297aa28c958ec53e9e935`，分支 `codex/phase7-h-a-session-evidence`。仅 H 未提交路径，未提交/推送/合并。
Contract 继续固定 `1.3.0-contract / RC`，LF SHA `5c87eeb9bca39585cea2e3c80c60d58813b4367e1a60b161ed8c7f82af4a19ed`；本次 HTTP 测试再次校验该 SHA。业务正文、Contract、客户端、Z/root 均未修改。

## 本批实现

- `exercise-record/application/submit-first-record.ts`：原 Session 归属检查、身份复核、同一事务锁顺序、规范化命令、加密幂等回执、首版清单、审计与 durable acceptance event。
- `exercise-record/api/submission-routes.ts`：冻结 POST record 协议，生成 FirstMaterialAcceptance，精确微秒时间投影，201 重放；公共错误装配仍由 Z 负责。
- `media-evidence/application/record-submission-media.ts`：锁定对象、已验证 checksum/内容事实、数量与阶段检查；已全部 VERIFIED 的首版在同事务绑定。尚未全部验证的普通批次锁定清单，不伪造 BOUND/READY。
- `1710_record_command_state.sql` 与对应 PostgreSQL 仓储：回执与不可变 acceptance outbox。Outbox 是待处理事实，不等于已投递通知或已完成 AI 检查。
- `submission-error-policy.ts`：类型化错误码/HTTP 状态，不猜异常文字。
- `domain/excluded-time.ts`：完整、带版本的已确认区间的裁剪/并集/微秒计时；拒绝缺失覆盖和预测恢复时间。该计算器尚未接入首次截止判定，不自行认定适用资格或执行纠错。

## 实测

冻结 Node 24.19.0 / PostgreSQL 17.6 Docker；源码及 Contract 只读，依赖按原 lockfile 安装。未升级 npm/依赖。首次启动 Node 容器的审批超时后重试成功，非测试失败。

- TypeScript `tsc --noEmit`、完整原 ESLint 命令：exit 0。
- `node --test ... evidence/phase7/h-a/session-postgres.test.mjs`：44 pass / 0 fail / 0 skip / 0 todo。含 H 全部五个迁移 up/down/up、真实 HTTP、并发同键、维护重放、失去身份、跨主体材料、截止等号、checksum 冲突、真实审计/Outbox SQL 失败回滚、离线游泳和正式绑定回滚。
- 三个 H 模块 `tests/*.node-test.ts`：92 pass / 0 fail / 0 skip / 0 todo。最终区间计算增加后重跑全部原生测试和类型/静态检查；数据库代码与 44 项运行时保持相同。
- 原架构诊断 `unexpected=[]`。官方 gate 仍 false，9 张表的根 Owner 登记由 Z 修改，未绕过正式 gate。
- 原始文件 `h-a-submission-postgres-final.tap`，SHA256 `ffda3a2f825c6d67154e65b1f1f60a798217c7b9da62649ee117c188c3872f63`。
- 原始文件 `h-a-submission-unit-complete.tap`，SHA256 `2d4a9671b0e4b1e3a5301b93efecbc05add154ad84106c21f5355027b0e508a8`。

测试中的 Identity、Course、Mode、activity eligibility 是明确标记的测试适配器。SQL 仓储、事务、媒体事实、HTTP 和加密回执是真实执行；不能将其报为实际 Z 权限或对象存储集成通过。

## 未完成与继续边界

1. 首次提交命令的必需 `RecordSubmissionEligibility.assertUnadjusted` 尚无真实来源实现。调用方必须核验活动/前后凭证来源，并拒绝维护/事故调整链；不得装配默认允许函数。区间工具不替代该来源。
2. 首次/续传的调整截止持久化、后续未就绪批次的完整处理与绑定、媒体真实直传/确认/对象探测及故障恢复仍需继续。当前不是完整 Media/Record 交付。
3. Z 全量最新源码、1070–1100 迁移、真实 Identity/Course/Mode/注销与根装配仍未在本区取得并复现；真实 COS 环境亦未获确认。不得以合成数据推断这些项目通过。
4. G2 审核、申请/OCR/日历及 Z 统计结算不因本批完成而自动开放，仍遵守 v3 G1 gate。
5. 未接旧 API；新增代码无 TODO/默认成功实现，但有尚待真实提供方接入的必需 Port，如上明确列出。

此前 `P7-H-A-integration-snapshot-20260909.zip`（37/83）保持原样，现为历史快照，不包含本批。按用户要求不要求逐小包转发/审核，本次没有再造增量 ZIP。

## 根 Owner 登记增量（供后续一次装配）

此前 7 张之外新增：`exercise_record.command_replay → exercise-record`、`exercise_record.acceptance_outbox → exercise-record`。迁移次序为 1700 后 1710；1710 down 必须先于 1700。
