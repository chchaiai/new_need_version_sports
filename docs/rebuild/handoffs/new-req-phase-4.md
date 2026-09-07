# Phase 4 · V8.1 新需求联合设计最终交接（DONE）

> 本轮修复候选：`PR8-DOC-FIX-01 / PATCH_PREPARED / OWNER_REVIEW_PENDING`。仅补齐既有合法Session在首次材料受理前遇关闭/移出的P-02分支，并校准交付SHA。原阶段退出及H/Z接受记录属于下述来源提交；不表示本候选已获新一轮互审或负责人验收。当前候选不得直接作为Phase 5正式开工基线；验收及远端提交后再核验。来源：`25bc20dcf19ac4646a16a1e27f076ac360e27da0`；本轮证据见`docs/rebuild/handoffs/phase-4-final-alignment-review.md`。

> 日期：2026-09-06设计交接；2026-09-07最终接受与归档
> Owner：周润基（P4-Z）、黄友晟（P4-H）
> Reviewer：双方交叉 Review
> 批次状态：DONE
> Phase 4：DONE
> Phase 5：READY
> 执行状态：设计文档已形成；产品、Contract、数据库、Migration、回填、恢复与部署均 NOT EXECUTED。

> 最终退出依据：负责人决定文档`BNBU-P4-OWNER-DECISIONS-20260907-v1.0 / c65edff3d13184804130b623ff16e42460b0712f1e4d4bb98ca2199ea18a4034`；用户确认H/Z最终互审已完成，并于2026-09-07直接确认结束Phase 4。

## 1. 基线与授权边界

- 仓库：`new_need_version_sports`
- H设计阶段工作分支：`codex/phase4-huang-review-timing`；统一发布分支：`docs/phase4-v81-partial-handoff`。
- 原始设计基线：`dbdedf9be958af08dd4a2c56d23191c626cca625`；归档后的当前版本由Git提交定位。
- 业务规则：V8.1
- Contract：`1.2.0-contract / RC`
- Contract SHA-256：`667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a`
- 负责人已允许本批次忽略 Phase 3 Handoff 前置条件并改用 BD、AT 和已提供的业务/Phase 2 材料追溯；该豁免不消除 PENDING、REQ/Impact Matrix 缺口、Contract 门禁或 Phase 5 锁定。
- 本批次只完成设计与联合交接；负责人已授权周润基侧归档六份文档、提交/推送并发起PR，见[联合汇总§10](../../architecture/new-requirements/p4-design-deltas-v81.md#10-文档归档与-pr-发布授权2026-09-07)。不修改业务正文、Contract、产品代码、数据库/Migration或infra，不合并或部署。

## 2. 接受与审阅快照、当前仓库导航

以下行数、字节数和SHA记录归档前的接受/Review快照身份；链接指向当前仓库文件。归档仅修正链接与接受/发布元数据，新文件版本由Git提交定位，不继续声称与旧SHA逐字相同。

### 2.1 P4-Z

- [P4-Z主稿](../../architecture/new-requirements/p4-design-zhou-v81.md)归档前快照：`p4-design-zhou-v81(5).md`（v10），837 行、135717 bytes，SHA-256 `8eb159ddb9235ef29a1ead162e0702b5795c2eefd423c325f1ae2058ccfcaafe`。
- v10 登记的被接受设计版本：v9，821 行、132870 bytes，SHA-256 `d3f5b911fad2afdcca5d5476765316d0eb9da77feeac554b4fd7d3f343229a46`；“A/C/E 正文和算法相对 v9 未变”是 P4-Z 与联合汇总的报告事实。
- [G2迁移说明](../../architecture/new-requirements/p4-migration-note.md)接受登记快照：`p4-migration-note(3).md`，78 行、15901 bytes，SHA-256 `7618a69a1c377080bfbd93571a91a5757b4921756ea07554afb59f60ce7e1f62`。
- G2 被 H 独立 Review 的内容版：76 行、15101 bytes，SHA-256 `55b04e2c198ebe7b824686b9a561c2879aade4bd6510115c71c7bf1add00e6d4`；本轮逐字 diff 只含接受状态、版本证据和交接措辞，迁移/恢复边界未变。
- [联合增量汇总](../../architecture/new-requirements/p4-design-deltas-v81.md)的H审阅快照为`p4-design-deltas-v81(1).md`，93行、14765 bytes，SHA-256 `8ff377393e4a32419ac82570b1aa53fc81895e45f394a58377126ec11340567c`；该快照当时为PRE_DRAFT。后续回填及最终接受已完成，当前以其§9～10为准。

### 2.2 P4-H

- [P4-H 完整设计包](../../architecture/new-requirements/p4-design-huang-v81.md)
- 正式仓库落点：`docs/architecture/new-requirements/p4-design-huang-v81.md`
- 998 行、88804 bytes
- SHA-256：`cb5f01c61784f002ad43947f52f505653821678ecda7cb50d957b4be3ea5126d`
- B、D、F、G1、G3 全部收敛在这一份正式稿中。原计划的 `p4-client-layering-note.md` 和 `p4-contract-gap-list.md` 不再另建，避免同一概念存在多个正式定义副本。
- 当前状态：ACCEPTED。周润基于2026-09-07明确接受H整包及联合汇总为本批次PARTIAL设计交付，证据见[联合汇总§9](../../architecture/new-requirements/p4-design-deltas-v81.md#9-最终接受登记2026-09-07)；接受不等于Phase4完整DoD或运行验收。

## 3. 已完成设计

### 3.1 P4-Z 已接受范围

- A：计入引擎与课程规则版本，达到深入级设计深度。
- C：材料版本、一次补证与游泳时限，达到要点级设计深度。
- E：邀请宽限、课程关闭与期末结算，达到要点级设计深度。
- G2：迁移、回填、备份与恢复边界；不包含可执行 Migration 或环境批准。

P4-Z 的详细结束报告以 v10 §9 为准；本交接只索引，不复制其算法、材料或结算定义。

### 3.2 P4-H 已形成范围

- B：审核状态机、AI/人工边界、六类原因、异常队列、学生 Timer、逐轮教师 SLA、维护暂停、自动逾期、有效候选、幂等/并发和 AT-01～08。
- D：纸质名单/OCR 草稿、耐力跑数据、原子确认、完成状态、综合名单读模型和 AT-15/17。
- F：模板闭集、AI/OCR 服务治理、人工模式、维护暂停事实、教师维护公告、最终成绩备注差异、学生数据出口与 AT-18/28。
- G1：UI→ViewModel→Use Case→Repository→Adapter→HTTP→Backend 的客户端分层及请求/响应 DTO 双向映射边界。
- G3：ISS-006 Contract 缺口清单、Web 既有缺口、CR-005、AT-26/27 作废与成绩备注差异。

P4-H 的详细结束报告以其 §18 为准；当前只完成设计与 Reviewer 输入，不代表实现已完成。

## 4. 交叉 Review 与联合汇总结论

- H↔Z 八项概念引用：8 确认、0 不一致、0 待补。
- ISS-019：邀请宽限使用严格早于，恰好截止拒绝；设计精度问题关闭，剩余 Contract 工作归 GAP-H07。
- ISS-020：补证资格矛盾已由 H 统一为一次退回动作事实 `supplementReturnUsed` 与独立 Timer 受理生命周期；Z 定向复核通过。
- ISS-021：G2 精确内容版已进入 H 独立 Review；G2-10/12～15D 无 P0/P1 概念冲突。
- H 对联合汇总 J-01～J-13 的定向结论：确认，无 P0/P1 finding；没有重跑 A 的稳定算法样本。
- 联合汇总 J-11 的“未发现仓库内 H 正式稿”是 Z 隔离工作区的观察；H 侧已按 §2.2 确认正式落点和整包/分件关系。
- 联合汇总已由 Z 作为唯一编辑者完成回填，吸收了本 Handoff、STATUS 及 P4-H 接受快照的版本和引用事实；本批次联合收尾已完成。H 侧未修改 Z/G2/汇总设计源文件。

## 5. 历史记录 当时保留的四项业务 PENDING

本节记录此前PARTIAL交接状态；当前结论已由§11最终退出登记取代。

1. `P-20260904-01`：六类均不适用、补证后仍只有疑虑时的终局标准。
2. `P-20260904-02`：普通首次材料最晚时点，以及跨收尾/成员移出后的首次受理边界。
3. `P-20260904-03`：学校工作日日历的权威来源和日内边界。
4. `P-20260904-04`：非维护故障在错误逾期写入后才确认时的补救。

联合 Review、设计接受或本 Handoff 均不关闭以上问题。任何受影响的 Contract、Backend、客户端或数据库实现都不得使用默认值补造规则。

## 6. Contract 与阶段门禁

- `CR-20260901-005` 仍为 PROPOSED / BLOCKING；三组 discriminator 显式 mapping 尚未由独立评审接受并发布新 Contract Version/SHA。
- P4-H GAP-H13、H15～H18 仍依赖业务 Owner 决定，受影响 Contract 不能定稿。
- GAP-H19 的严格端点问题已关闭并并入 GAP-H07，但这不解除其他门禁。
- 当前不得进入 Backend foundation、数据库/Migration、正式客户端 binding 或真实 E2E；Phase 5 保持 LOCKED。
- H来源另自述工作区控制面存在两个不同SHA共用`4.0.1-contract`标签；该控制面与SHA不在本任务权威输入，Z未核实、不选择其一。此项仅保留来源自述，基线仍为本节所列`1.2.0-contract`，详见[联合汇总§8](../../architecture/new-requirements/p4-design-deltas-v81.md#8-2026-09-07-接收核对记录与版本边界)。

## 7. 证据分层

### 7.1 本轮实际观察和执行

- 实测三份 Z 侧输入和 H 正式稿的行数、字节数与 SHA。
- 逐字比较 G2 内容版与接受登记版，确认设计边界未变。
- 定向核对联合汇总 J-01～J-13、H 的版本引用、PENDING、阶段状态和正式落点。
- 执行 Markdown 内部锚点、本地链接、围栏、空白、版本引用和 Git 修改范围检查。

### 7.2 上游文档报告、未由本轮重跑

- P4-Z 的算法、单调性、计划目录、来源保护、结算快照和算术样本结果。
- Android/Web 历史测试数字与此前 PR/CI 状态。
- Z 工作区的 `.DS_Store`、分支与跟踪差异状态。

### 7.3 NOT EXECUTED

- 产品构建、单元测试、集成测试、E2E、真实上传、计时、并发、AI/OCR、性能。
- Contract 修改、生成、发布及下游 binding 更新。
- 数据库连接、DDL、Migration、回填、备份恢复、回退或部署。
- H设计/交接阶段未执行Commit、Push、Merge、PR、分支或worktree操作；后续仅六份文档发布获授权，见§10。不执行合并或部署。

## 8. H设计阶段修改文件与统一归档范围

- `docs/architecture/new-requirements/p4-design-huang-v81.md`
- `docs/rebuild/handoffs/new-req-phase-4.md`
- `docs/rebuild/STATUS.md`

H原设计阶段仅涉及上述三份文件，未修改Z/G2/联合汇总源文件；后续统一归档共六份文档，清单见联合汇总§10。业务正文、Contract、Android/Web/Backend、数据库/Migration及infra仍未修改。

## 9. 当前判断与下一工作项

本批次达到约定设计深度，H与Z联合收尾及最终接受均已完成。负责人决定与用户最终确认已关闭Phase 4业务决定门禁，因此：

```yaml
batch_status: DONE
phase_4_status: DONE
phase_5_gate: READY
product_execution: NOT_EXECUTED
database_migration: NOT_EXECUTED
```

Z已核实H三份交接文件SHA/引用并完成联合汇总回填；六份文档已提交至[PR #7](https://github.com/chchaiai/new_need_version_sports/pull/7)供审阅，未执行合并。后续按负责人安排处理PR审阅意见及剩余Phase4门禁，不因文档入库启动产品开发。

## 10. 文档归档与发布证据边界（2026-09-07）

本Handoff此前被接受来源为131行、8309字节，SHA-256 `f43198d0f3cefaeda30422ef3a84dfdc324785a0e997fbfd22e0d6f557fa7fd5`；该身份只保留为历史快照。最终状态和新SHA以§11及最终交付清单为准。

## 11. 最终退出登记

- H最终设计：`P4H-REMAINING-ENG-1.2`。1.0工程模型83 PASS / 0 FAIL；1.1决定对齐模型30 PASS / 0 FAIL；1.2关闭GAP-H13。
- Z最终送审版本：`P4Z-REMAINING-ENG-1.0 / 66d584b4b770a51197f77edbda5710a284e06416dc0b0db64c7f6c5db8e004b9`；G2为`P4Z-G2-ENG-1.0 / df18cc046751d684a32245ad8e47daf467730fc8b708439d328a2be723fd88f7`，H复跑109 PASS / 0 FAIL并以0 Finding接受。
- 用户确认双方最终审核完成；当前开放Finding为0。
- P-01～04均已决定并完成H侧设计对齐。GAP-H13最终决定为所有`TEACHER`角色可只读查看历史remark；学生不可见，新成绩不创建remark。
- Phase 5唯一起始输入为`1.2.0-contract / RC / 667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a`。CR-005、新Version/SHA、生成与跨端验证属于Phase 5/6。
- 实际校历表、产品代码、数据库/Migration、真实AI/OCR/媒体/权限、恢复演练、部署与E2E仍`NOT_EXECUTED`，按路线进入后续阶段，不冒充Phase 4执行结果。

最终结论：`Phase 4 DONE / Phase 5 READY`。本交接只解锁Phase 5 Contract工作，不解锁Backend、客户端实现、部署或生产操作。

## 12. 最终语义对齐补充

本节响应最终收尾Finding，取代本交接§1、§5～10及所引历史文件中的四项PENDING、Contract UNKNOWN、GAP-H13待定和Phase 5 LOCKED结论。正式版本为H `P4H-FINAL-ALIGN-1.4`、Z `P4Z-FINAL-ALIGN-1.2`、G2 `P4Z-G2-FINAL-ALIGN-1.2`、矩阵`P4-TRACE-V8.1-1.3`及联合汇总`P4-HZ-FINAL-ALIGN-1.1`。

### 12.1 已落实的当前规则

- P-01：规定检查完成、六类无效依据均不适用且只剩未证实疑虑时判`VALID`。
- P-02：普通首次材料严格满足服务器`acceptedAt < endedAt + 24h`；同一锁定批次严格满足`completedAt < acceptedAt + 30m`；等号拒绝。边界前服务器已确认的合法Session/Record，即使材料尚未首次受理也保留原窗口；已受理的保留原同批传输，结算须识别两类合法未完链。生命周期变化不恢复完整成员权限或新开运动资格；游泳和补证专门窗口不被覆盖。
- P-03：两个完整学校工作日按版本化学校工作日表累计172800秒，`Asia/Shanghai`日界，暂停相交区间取并集。
- P-04：错误逾期后以追加纠错恢复原剩余机会，保留旧终局、历史、已用机会和合法后继。
- GAP-H13：所有已认证`TEACHER`可只读查看历史remark；学生和其他出口不可见，新成绩不创建remark。
- Contract：Phase 5唯一输入是`CON-011 / main 73945754a8dbd490709a0a92fda696febf6433eb / 1.2.0-contract RC / 667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a`；两个4.0.1候选仅作不同历史身份。

### 12.2 Phase 2与后续阶段

Phase 2页面清单、用户流程、七状态矩阵、Android UI foundation和最终交接已在矩阵§8.3及Z §12.4对应到B/C/E/F/G1/G2和AT。Phase 5由Contract Owner完成CR-005、新Version/SHA；Phase 6由Android/Web Owner完成生成与Mock；Phase 7由Academic Term/Data/Backend Owner完成校历、Schema、状态机和迁移实现；Phase 8完成客户端真实接入及FCM清理；Phase 9完成本地E2E与恢复演练；Phase 10完成Staging、隐私与全量七态/无障碍；Phase 11由Release Owner完成发布门禁。所有后续执行当前仍`NOT_EXECUTED`。

### 12.3 main保持与最终Review

本分支已合入`origin/main@73945754a8dbd490709a0a92fda696febf6433eb`，保留PR #6的五份Web修复，不改其产品代码。最终H↔Z复核覆盖上述修改后版本、STATUS、本交接、最终报告和Review记录；检查范围为五项决定、Phase 2对应、延期Owner/阶段、完整SHA、链接/锚点、main Web文件保持及`NOT_EXECUTED`边界。Finding关闭记录见`phase-4-final-alignment-review.md`；目标开放Finding为0，PR由用户审核后决定是否合并。
