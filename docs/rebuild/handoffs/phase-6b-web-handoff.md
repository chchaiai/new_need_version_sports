# Web 交接原文与接收侧复核说明

接收日期：2026-09-08。下方为甘洛夷提供的交接原文，来源文件 SHA-256：`7dddfbcfc1405f312e7cfeb58a7796c26a42ba0bd819448bcd1bec99d2bf004a`。

- 原文记录功能提交 `e04b0f810595e97a0d3ff87bbc006c7c58072548` 及冲突合并提交 `164201b1ba36154dfbdc346d061f30fd98602902`。原文的 DONE / 全部 CLOSED / 133 项测试是交付方当时的陈述，不等同于接收侧对该提交的最终批准。
- 接收侧复核仍复现 R05（汇总把未知计入量算成零）和 R06（运行时校验不完整），按用户授权在独立分支 `codex/phase6b-r05-r06-repair` 补修。R05 现在向汇总和展示传播未知状态；R06 使用固定协议生成校验器，在映射前验证完整 DTO。
- 本地修复验证：学生端 92/92、Portal 226/226、类型检查与构建通过；原复核的 20 个输入重新核验，8 个合法输入保留、12 个非法输入被拒绝。包含相关 Phase 5 用例及实际 Mapper/React 渲染回归，不代表完整 App、真实后端或浏览器人工验收。构建有大于 500 kB 的 chunk 提示，未做性能验收。
- Windows Portal 测试使用外部命令适配，将 `python3` 指向现有 Phase 5 Python 环境；未修改测试断言。运行时校验器的生成及复现方法见 [维护说明](../../../BNBU-Sports-Web-new/frontend/student/js/contract/README.md)。原始日志及文件身份清单保留在接收侧工作区 `start4/10_phase6b_repair/`。
- Contract 保持 `1.3.0-contract / RC / 5c87eeb9bca39585cea2e3c80c60d58813b4367e1a60b161ed8c7f82af4a19ed`。业务正文、Android、Backend 未改。此说明不代填人类 Reviewer 批准、GitHub 提交/合并或 6C 完成；这些事项仍待用户操作。

---

## 以下为同事交接原文

Phase 6B Web 阶段交接报告

交接日期：2026-09-08
完成状态：DONE（T01–T08 + 审查整改 R01–R07 / G01）
用途：供 6C 跨端汇总与 PR #11 人类复核

---

一、摘要

Phase 6B Web 已在固定 Contract 身份 1.3.0-contract / RC / SHA 5c87eeb9bca39585cea2e3c80c60d58813b4367e1a60b161ed8c7f82af4a19ed 上，完成学生端与 Portal 的绑定升级、Fixture/Mock 对齐、双轨运行时 Mapper、全量构建与测试门禁，并关闭首轮审查报告全部 Finding（R01–R07、G01）。

本轮交付的是 Contract + Mock 验证轨，不是正式网络迁移（归 Phase 8）。
Android 6A 已在 main 接受（PR #12），与本 Web 交付使用同一 Contract SHA。
下一步：复核 PR #11 → 合并 → 执行 6C 汇总。

PR：https://github.com/chchaiai/new_need_version_sports/pull/11

---

二、固定身份

入场基线：2ba9355e38373b8d2350eb8efe4071048337c320（Merge PR #10）
工作分支：codex/phase6b-web
独立工作区：/Users/louis/Projects/new_need_version_sports-phase6b
最新交付 Commit：e04b0f810595e97a0d3ff87bbc006c7c58072548
冲突解决 Commit：164201b（merge main，STATUS.md）
前序功能 Commit：c3d42be6cd60f8dd1194736e22e861bca2a22cd4
Contract：1.3.0-contract / RC
OpenAPI SHA-256：5c87eeb9bca39585cea2e3c80c60d58813b4367e1a60b161ed8c7f82af4a19ed
公开路径：/api/v1

分工：
- 6B Web Owner：甘洛夷
- 6B Web / 6C Reviewer：用户
- 6A Android：用户（已在 main 接受）

---

三、任务完成情况（T01–T08）

T01 接收回执：完成。见 docs/rebuild/handoffs/phase-6b-web-t01-receipt.md

T02 绑定 + 类型生成：完成。phase5b:contract:generate --check 通过，Portal 与学生端生成物各 14352 行且一致。

T03 Fixture/Mock 对齐：完成。新增 phase5b-contract-shared-fixtures.ts；移除 1.2.0 残留字段（finalGrade、creditedMinutes、studentVisibleReason、categories 顶层进度等）。

T04 学生端运行时 Mapper：完成。见 docs/rebuild/handoffs/phase-6b-web-t04-runtime-mapper.md

T05 Portal 运行时 Mapper：完成。见 docs/rebuild/handoffs/phase-6b-web-t05-portal-runtime-mapper.md

T06 Portal 全量构建测试：完成。npm test 133/133，含 rendered-html 与 AppSelect 门禁。

T07 phase5gb + Finding 收口：完成。phase5gb 13/13；ADMIN gated 清单对齐 54 项；测试脚本使用 python3。

T08 完成回传：完成。见 docs/rebuild/handoffs/phase-6b-web-t08-completion.md

---

四、审查整改（PR #11 REQUEST_CHANGES，均已关闭）

R01（P1）：loadApiWorkspace 在调用 mapProgressTarget 之前先取得 contractCourse，修复 TDZ ReferenceError；smoke 新增工作区加载用例。

R02（P1）：未终局审核不再当异常。Portal 将 processingStage 映射为 auditStatus: processing；学生端完整消费 reviewProcessingStage。

R03（P2）：分类完成量使用 cappedCompletedMinutes；countedRecordMinutes 单独保留，不与完成量混用。

R04（P2）：UNAVAILABLE / RECOMPUTING 不填零进度；返回 null + progressUnavailable；dashboard 显示「暂不可用 / 正在重算」。

R05（P2）：不编造计入时长。creditedDurationSeconds / creditedMinutes 保持 null；VALID 且无 hours 时显示「计入情况待确认」。

R06（P2）：两端新增 assertContractExerciseRecordWire 运行时校验，拒绝非法 category、错误类型、未知字段；附反例测试。

R07（P2）：共享 Fixture transferDueAt 修正为 acceptedAt + 30 分钟（03:45:00Z，原错误为 60 分钟）。

G01：docs/rebuild/STATUS.md 已与 main 上 Android 6A 段落合并（Commit 164201b）。

---

五、核心交付文件

学生端
- frontend/student/js/phase6b-contract-mapper.js — 1.3.0 严格读取、wire 校验、进度与记录投影
- frontend/student/js/api.js — 双轨 mapServerRecord / mapProgressTarget / loadApiWorkspace
- frontend/student/js/v81-review.js — processingStage 与计入未知阶段文案
- frontend/student/js/screens/dashboard.js — 不可用进度展示
- frontend/student/student-smoke.mjs — 92 项 smoke

Portal
- portal-teacher-admin/app/phase6b-contract-mapper.ts — Portal 1.3.0 适配与 wire 校验
- portal-teacher-admin/app/teacher-data.ts — mapExerciseRecordToCheckin 双轨；processing 审核态
- portal-teacher-admin/app/phase5b-contract-shared-fixtures.ts — 共享 1.3.0 Fixture
- portal-teacher-admin/app/teacher-workspace.tsx — AppSelect 门禁；processing 标签
- portal-teacher-admin/tests/phase6b-contract-mapper.test.mjs — Mapper 与反例测试

生成物（脚本生成，未手改）
- portal-teacher-admin/app/phase5b-contract.generated.ts
- frontend/student/phase5b-contract.generated.ts

双轨策略说明：
Legacy 路径保留 1.2.0 形态 API 的现有投影。
Contract 路径检测 recordId + currentMaterial 等 wire 特征后，经 phase6b-contract-mapper 严格读取。
不发明 creditedDurationSeconds、finalGrade、legacy categories 等 1.2.0 独有字段。

---

六、测试证据（e04b0f8 工作区实测）

在 BNBU-Sports-Web-new/ 根目录：

npm run test:student → 92/92 通过

在 portal-teacher-admin/：

npm run typecheck → exit 0
npm test → 133/133 通过（内含 phase5b mock+revalidation 22/22、phase5gb 13/13）

未执行：浏览器逐页人工审查、真实后端联调、E2E、部署。

---

七、Finding 状态

本轮 Web Finding（WEB-6B-001～006）：001/002/004/005/006 已关闭；003 为 INFO（3.0.0-web-snapshot 并行轨仍存，归 Phase 8 Legacy）。
审查 Finding R01～R07：全部 CLOSED。

---

八、约束遵守

未修改业务规则。
未修改 Contract 字节。
未手改 *.generated.ts。
未修改 contracts/**、业务正文、Android、Backend。
无新增产品 Mock / TODO / 空接口。
旧 API 引用通过双轨保留；正式迁移登记在 Phase 8。

---

九、明确未做 / 延期

真实 Backend 鉴权、事务、存储 → Phase 7（Backend 未构建）
正式 API 网络迁移 → Phase 8
Teacher Dashboard / Notification Center 完整 UI → Phase 8+（覆盖矩阵部分 MISSING）
LM-01～24 Legacy Migration → Phase 8
6C 汇总结论 → 待 PR #11 合并后由用户执行

---

十、6C 前置与建议复核

入口条件：
1. Android 6A 与 Web 6B 使用同一 Contract：1.3.0-contract / RC / 5c87eeb9…
2. 两端本地验证已通过（Android 已在 main 接受；Web smoke 92 + Portal 133）
3. 无新增阻塞 Contract CR
4. Web 待 PR #11 人类复核合并

建议复核命令：

git fetch origin codex/phase6b-web
git checkout codex/phase6b-web

cd BNBU-Sports-Web-new
npm run test:student

cd portal-teacher-admin
npm run typecheck
npm test

建议 spot-check：
- 学生 dashboard：UNAVAILABLE 进度显示「— / 暂不可用」，不显示 0 分钟占位
- 学生记录：VALID 且无 hours →「有效 · 计入情况待确认」
- Portal 审核：result=null 且 TEACHER_REVIEW_REQUIRED → 审核态「处理中」，不抛异常
- Fixture：buildPhase5bMaterialVersion 的 transferDueAt 为 03:45:00Z

---

十一、相关文档

docs/rebuild/handoffs/phase-6b-web-t01-receipt.md
docs/rebuild/handoffs/phase-6b-web-t04-runtime-mapper.md
docs/rebuild/handoffs/phase-6b-web-t05-portal-runtime-mapper.md
docs/rebuild/handoffs/phase-6b-web-t08-completion.md
docs/rebuild/handoffs/new-req-phase-6-android.md
docs/rebuild/STATUS.md
contracts/validation/step07_handoff/WEB_HANDOFF.md

---

十二、收尾登记

完成状态：DONE
分支：codex/phase6b-web @ 164201b（含 main 冲突解决）
PR：#11（MERGEABLE，待合并）
测试：student 92/92；Portal typecheck + test 133/133，全部通过
未测：浏览器人工、真实后端、E2E、部署
业务规则：未改
Contract：未改
旧 API：双轨保留，正式迁移 Phase 8
下一阶段：PR #11 合并 → 6C 跨端汇总
