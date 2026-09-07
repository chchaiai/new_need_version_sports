# P4-H · V8.1 完整增量设计包（B / D / F / G1 / G3）

> 当前H最终设计版本：`P4H-FINAL-ALIGN-1.3`。1.0完成F、G1、G3工程DoD，1.1对齐P-01～04与Contract起始输入，1.2关闭GAP-H13，1.3与Z/G2/矩阵/联合汇总建立最终替代关系及Phase 2映射。本文较早章节中的PENDING、canonical UNKNOWN、Phase 4 IN_PROGRESS或Phase 5 LOCKED均为带版本历史快照，当前结论只认§19.2～19.8。

> 当前D限定工程增量：`P4H-D-ENG-1.1`。本增量只在§14.10～§14.16把已接受的D语义细化为可实现、可检查的内部工程设计；输入为已接受`P4H-B-ENG-1.0`，不改写原D定义、不消费同批Z-E新内容，不表示产品、数据库、真实OCR或Contract已实施。1.1仅整改`P4Z-WI0024-R2-001`所指出的耐力确认完整请求绑定与选中行唯一性。

> 当前限定工程增量：`P4H-B-ENG-1.0`。本增量只在§9.6～§9.12把已接受的B语义细化为可实现、可检查的内部工程设计；不改写原状态机、不消费同批Z-C新内容，不表示产品、数据库或Contract已实施。

> 状态：ACCEPTED（周润基于2026-09-07接受本批次PARTIAL设计交付，证据见§18.6）；Owner：黄友晟；Reviewer：周润基。
>
> 范围：黄友晟负责的 B 审核/计时、D 名单/OCR/耐力跑、F 治理/学生数据边界/系统模式、G1 客户端分层、G3 Contract 缺口；整合为一份供周润基审核的文件。
>
> 执行状态：Domain / Database / Architecture 设计已成稿；产品、Contract、数据库、Migration、真实 AI、计时与并发均 NOT EXECUTED。
>
> Phase 4：IN_PROGRESS；Phase 5：LOCKED。
>
> 日期：2026-09-06。

## 0. 基线、授权与评审版本（H设计阶段历史）

- Git 根目录：`C:\Users\31730\Downloads\BNBU-Sports-Android-master\new_need_version_sports`。
- 工作分支：`codex/phase4-huang-review-timing`。
- 基线：`main@dbdedf9be958af08dd4a2c56d23191c626cca625`；开始时工作区干净，且与 `origin/main` 一致。
- Contract 基线：`1.2.0-contract / RC`；OpenAPI Git blob SHA-256 为 `667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a`，与 metadata 一致。
- 用户于 2026-09-06 明确授权忽略本轮 Phase 3 产物门禁，直接以已合并的 `main`、V8.1 业务正文及现有交接开展 Phase 4。该授权不消除四项既有 PENDING，不解除 Contract 阻塞，也不解锁 Phase 5。
- 初轮及 Finding 发现阶段分别评审 P4-Z 735 行版本 `71b813…aec29` 和 v8 `0424ee55…878f5`。联合收尾当前输入更新为外部附件 `p4-design-zhou-v81(5).md`（Z v10），837 行、135717 bytes、SHA-256 `8eb159ddb9235ef29a1ead162e0702b5795c2eefd423c325f1ae2058ccfcaafe`；其中登记被接受的 v9 为 `d3f5b911…229a46`。本稿只记录评审/交接结论，不修改或代交 P4-Z 文件。
- H 已独立评审的 G2 内容版本为 `p4-migration-note(1).md`，76 行、15101 bytes、SHA-256 `55b04e2c198ebe7b824686b9a561c2879aade4bd6510115c71c7bf1add00e6d4`；联合收尾当前接受登记版为 `p4-migration-note(3).md`，78 行、15901 bytes、SHA-256 `7618a69a1c377080bfbd93571a91a5757b4921756ea07554afb59f60ce7e1f62`。逐字 diff 只含接受状态、版本证据和交接措辞，迁移/恢复边界未变；执行仍为 NOT EXECUTED。
- 联合汇总输入为 `p4-design-deltas-v81(1).md`，93 行、14765 bytes、SHA-256 `8ff377393e4a32419ac82570b1aa53fc81895e45f394a58377126ec11340567c`。H 对 J-01～J-13 的定向 Review 见 [§18.5](#p4h-joint-summary-review)。

设计成稿批次只新增本文件；当前联合收尾获准更新本文件、正式 Phase 4 Handoff 与 STATUS。业务正文、Contract、P4-Z/G2/联合汇总源文件、Android、Web、Backend、数据库/Migration 和 `infra/` 仍禁止修改。

**归档说明（2026-09-07）：** 本节及历史Review记录中的路径、行数和SHA对应当时输入快照；本次按[联合汇总§10](p4-design-deltas-v81.md#10-文档归档与-pr-发布授权2026-09-07)归位到仓库并同步最终接受元数据。外部原附件不变，当前文件以Git提交与路径定位，B/D/F/G1/G3正文不改。

## 1. 权威来源与解释规则

### 1.1 直接输入

- [总业务流程](../../business/00-overview.md) §0.2、§11.4、§12.1～12.4、§18～21；
- [学生端流程](../../business/10-student-flow.md) §7.5～7.8、§8；
- [教师端流程](../../business/20-teacher-flow.md) §4、§9、§14～16；
- [管理员端流程](../../business/30-admin-flow.md) §13.5、§15.5、§19.1、§19.3～19.5；
- [教师辅助优先方案交接](../../rebuild/handoffs/2026-09-04-teacher-first-business-update.md) §3、§6、§7 的 AT-01～AT-08；
- [审核公开原因交接](../../rebuild/handoffs/2026-09-04-review-public-reasons.md) §2～4；
- [业务复核决定交接](../../rebuild/handoffs/2026-09-04-business-review-followup.md) §2、§4；
- [Web V8.1 Phase 2 交接](../../rebuild/handoffs/2026-09-05-web-v81-align.md) §“业务有、合同 1.2.0 没有（或不够）”；
- [旧 Domain / 数据库设计](../phase-3-domain-and-database-design.md) §4.2、§5.4、§7.1、§7.5～7.6、§11～12；
- [Backend 模块边界](../backend-module-boundaries.md) §2.1、§4～6；
- [当前 Contract operation catalog](../../../contracts/operation-catalog.md) 与 `openapi.yaml` 的 roster、review、endurance、final grade、system mode、dashboard schema；
- [CR-20260901-005](../../../contracts/change-requests/CR-20260901-005-explicit-discriminator-mappings.md)；
- P4-Z 评审附件的 OWN-01～03、A-05、A-14/15A、A-22A～22C、C-03～05、E-07～10A、§6、§9、§10.6。

### 1.2 设计名与业务名分离

本文中的英文状态、实体、字段和能力名是 Phase 4 内部设计标识，不是 Contract wire 值、公开 API、数据库 DDL 或新增业务分类。Phase 5 必须据正式缺口清单决定实际 schema、operation 和 wire enum；不得把本文标识直接复制进 RC 后宣称兼容。

本文不从旧 `Review=VALID/INVALID`、旧 DTO、页面按钮或 Mock 反推业务。旧设计中“Record 提交即 SYSTEM VALID”“只有 VALID/INVALID 两态”“0/60/120 直接计入”的冲突部分由本稿与 P4-Z/A 增量替代；旧设计的模块 Owner、只追加历史、服务端时间、幂等、审计与事务原则继续生效。

### 1.3 仍然开放的业务边界

- `P-20260904-01`：六类均不适用、补证后仍只有疑虑时的终局标准未确认；B 不默认通过，也不把疑虑写成已证实冒用。
- `P-20260904-02`：普通首次材料最晚时点、跨收尾/成员移出后的首次受理及受理后传输终结未确认；归 P4-Z/C、E 与业务 Owner，本稿只接收已经正式受理的材料版本。
- `P-20260904-03`：学校统一工作日日历来源和日内边界未确认；B 设计 SLA 事实与接口，但不把两个学校工作日写成 48 小时或普通周一至周五。
- `P-20260904-04`：非维护故障在错误逾期写入后才确认的补救未确认；本稿不自动撤销真实已写入的终结结果，不用补偿事实重开补证。

## 2. 概念与模块所有权

<a id="p4h-b-ownership"></a>

### 2.1 P4-H 唯一定义

本文正式定义下列 H 侧跨簇概念：

1. `P4H.B.EffectiveCandidate`：见 [§6.1](#p4h-b-effective-candidate)；
2. `P4H.B.SupplementTimerFact`：见 [§7.2](#p4h-b-supplement-timer)；
3. `P4H.B.TeacherSlaRound`：见 [§7.3](#p4h-b-teacher-sla-round)；
4. `P4H.D.CourseAssessmentRosterProjection`：见 [§14.6](#p4h-d-combined-roster)；
5. `P4H.F.MaintenancePauseFact`：见 [§15.5](#p4h-f-maintenance)。

三者均由现有 `record-review` 模块拥有。`record-review` 还拥有审核 Case、轮次、判断历史、当前处理投影、AI 审核任务、教师待办投影和审核来源版本；不拥有 Record/Session/Media、材料包事实、课程成员、统计、系统模式或结算。

### 2.2 只引用的外部概念

- `P4Z.C.MaterialVersionFact`：正式位置为 P4-Z §3.1；B 只绑定其不可变 `materialVersionId`、版本号和来源版本，不复制材料清单定义。
- `P4Z.A.StatisticsProjection`：正式位置为 P4-Z §2.5；B 只提供有效候选及来源保护，不计算可计分钟、计入组合或未计入原因。
- `P4Z.E.SettlementVersion`：正式位置为 P4-Z §4.3；B 只提供审核阻塞快照与来源保护，不生成结算报告。

### 2.3 计时与触发事实归属

| 事实 | 唯一 Owner | B 的使用方式 | 禁止事项 |
|---|---|---|---|
| 一次退回动作是否已使用（`supplementReturnUsed`） | `record-review` / B | 首次合法退回原子置真并创建唯一学生计时器 | 把版 2 是否已受理混成“机会未用/已用”，或另算第二个机会 |
| `P4H.B.SupplementTimerFact` | `record-review` / B | 判断剩余、可受理与自动逾期 | 把上传开始或本地保存当正式受理 |
| `P4H.B.TeacherSlaRound` | `record-review` / B | 每次进入教师待办新开一轮 | 固定换算为 48 小时或沿用上一轮余额 |
| 学校工作日日历及日内边界 | 业务 Owner 待确认 | 通过带版本 Calendar Provider 消费 | B 自选周一至周五、节假日或工作时段 |
| `P4H.F.MaintenancePauseFact` | P4-H/F；运行事实由 `system-mode` | 以[§15.5](#p4h-f-maintenance)版本化、去重后的暂停区间参与两类计时 | B 复制系统模式历史或用预计恢复时间结束暂停 |
| 已确认非维护故障调整 | P4-H/F | 以范围、区间、版本和原因引用 | 个人离线冒充平台故障；重叠时段重复补偿 |
| 材料版本锁定/正式受理 | P4-Z/C，运行 Owner 为 `exercise-record` | 参与同一事务结束学生计时并开教师新轮次 | B 修改材料清单或 C 私自判断审核有效性 |
| 当前数据库时间 | 基础设施 | 所有起止、截止和判断只用服务端 instant | 客户端时间、图片时间或通知已读状态参与判断 |

## 3. Domain 与持久化增量

以下名称描述未来结构和约束，不是已经执行的 DDL。

### 3.1 `ReviewCase`

<a id="p4h-b-supplement-opportunity"></a>

每个正式 `ExerciseRecord` 恰有一个审核 Case，保存 `recordId`、组织/课程/Enrollment 范围引用、当前 `processingStage`、技术处理中应返回的 `resumeStage`、当前 `materialVersionId`、当前轮次、`supplementReturnUsed`、当前判断序号、当前待办引用、`version` 和更新时间。

`supplementReturnUsed` 只表示“责任教师在正常流程中的唯一一次退回补证动作已经成功”，初始为 false，首次合法退回事务内永久置 true。它同时授予并消耗教师唯一一次退回动作，因此 true 时禁止再次退回；它**不表示**学生版 2 已经提交。版 2 是否尚可受理、已受理或已逾期只由唯一 `SupplementTimerFact.acceptanceState` 与绑定的 `P4Z.C.MaterialVersionFact` 表达。两者是同一次业务机会的动作事实和受理生命周期，不是两个补证机会。

核心约束：

- `UNIQUE(record_id)`；
- 当前材料版本必须属于同一 Record；
- 正常流程轮次只能是首次轮次 1 和补证复核轮次 2；
- 只有 round 1、当前允许退回且 `supplementReturnUsed=false` 才能执行退回；成功进入 `SUPPLEMENT_REQUIRED` 时同事务置 true，之后永不回退，任何不同 command 的再次退回都拒绝；
- 当前指针必须用复合 FK 指向同一 Case 的判断、轮次和待办；
- Case 只推进处理事实，不修改 Record、Session、材料或统计结果。

### 3.2 `ReviewRound` 与 `ReviewDecision`

`ReviewRound` 是只追加轮次事实，保存 Case、`roundNo`、触发来源、绑定的 `materialVersionId`、开始/结束服务器时间、结束动作和版本。轮次 1 绑定材料版 1；补证正式受理后创建轮次 2 并绑定材料版 2。`UNIQUE(case_id,round_no)`，且同一时刻至多一个未结束轮次。

`ReviewDecision` 是只追加判断历史，保存 sequence、来源 `SYSTEM_AI / TEACHER / SYSTEM_EXPIRY / AUTHORIZED_CORRECTION`、结果 `VALID/INVALID`、教师公开原因引用、可选公开说明、AI task 或 timer 引用、绑定材料版本、操作者/系统主体和服务器时间。系统 AI 自动通过不带失败原因；系统逾期只能引用独立系统原因；人工退回本身是轮次动作，不伪造 `INVALID` 判断。

所有历史只允许 INSERT/SELECT。当前投影可以移动，既有判断、材料引用、通知和审计不可覆盖。

### 3.3 `AIReviewTask` 与 attempt 历史

<a id="p4h-b-ai-task"></a>

`AIReviewTask` 保存：task ID、Case/round/Record、精确 `materialVersionId`、课程规则版本引用、输入 fingerprint、服务配置及模型版本引用、策略版本、状态、有限 `maxAttempts`、当前 attempt、下一次允许重试时间、最终 outcome/failure class、创建/完成时间和 `version`。

任务状态使用内部工程闭集：`PENDING / RUNNING / RETRY_WAIT / SUCCEEDED / FAILED_TECHNICAL / CANCELLED_SUPERSEDED`。模型业务输出只允许 `NORMAL / ANOMALY / UNCERTAIN`；超时、不可用、解析失败不是第四种业务输出，而是技术失败。

每次外部请求建立只追加 attempt，保存 attempt number、请求 fingerprint、服务版本、开始/完成时间、脱敏结果摘要、provider event ID/result digest 和技术失败类别。密钥、完整提示词中的个人资料、原始媒体和模型内部链路不得进入普通审计或教师页面。

拟议唯一保护：

- `UNIQUE(round_id, material_version_id, input_fingerprint, policy_version)` 防止同一输入重复建任务；
- `UNIQUE(task_id, attempt_no)`；
- provider event ID 或等价结果 digest 在同一 task 内唯一；
- `attempt_no <= max_attempts`，达到有限上限后转技术状态，不无限重试。

具体重试次数、退避和 provider 参数是后续工程配置，不属于业务规则；没有真实证据前不得承诺准确率或节省工时。

### 3.4 教师待办与来源范围版本

`TeacherReviewQueueItem` 是可重建投影，不是第二个审核事实源。活动项 key 为 `(caseId, roundNo)`；同一 key 至多一项，重复 AI 回调、刷新、提醒或相同异常发现只更新来源集合，不增加待办数量。

`ReviewSourceScope` 为 provider-owned 版本行，至少按 Enrollment 和 Course 分别维护单调 `candidateRevision` 与 `blockerRevision`。有效候选的成员或其判断/材料绑定变化时递增 candidate revision；非终态阻塞集合或其轮次、Timer、SLA、技术状态变化时递增 blocker revision；一次转换同时影响两类结果时在同一事务同时递增。A 只订阅 candidate revision，避免等待 AI、提醒等变化触发无意义统计重算；E 读取 blocker revision。两个版本都支持调用方取得完整快照并在发布事务中验证集合没有新增、删除或变更，不能只给调用方已读行的行版本。

### 3.5 两类计时实体

`SupplementTimer` 保存 Case、退回动作、24/72 小时总预算、开始时间、原始截止、当前状态、已消耗/剩余预算投影、引用的维护及故障来源版本、当前有效截止、正式受理或逾期终结引用和 `version`。每个 Case 最多一条正常补证计时器。

`TeacherSlaRound` 保存 Case/审核轮次、启动原因、两个学校工作日规则引用、日历 ID/版本、开始时间、维护来源版本、当前剩余业务时间投影、是否已经超时提醒、结束动作/时间和 `version`。每个审核轮次恰有一条；教师超时不会自动结束该轮或判学生无效。

## 4. 审核状态机

<a id="p4h-b-state-machine"></a>

### 4.1 当前处理阶段

| 内部阶段 | 业务含义 | 教师待办 | 可贡献进度 |
|---|---|---|---|
| `SYSTEM_CHECK_PENDING` | 已受理材料等待服务端确定性检查 | 否 | 否 |
| `AI_REVIEW_PENDING` | 规则通过，等待绑定当前版本的 AI 任务 | 否 | 否 |
| `TECHNICAL_PROCESSING` | 确定性检查或 AI 的超时/不可用/解析失败及有限重试 | 否，技术队列单列 | 否 |
| `TEACHER_REVIEW_REQUIRED` | 首版异常、不确定、延迟材料或受控人工模式 | 是，轮次 1 | 否 |
| `SUPPLEMENT_REQUIRED` | 教师一次退回，等待学生补证 | 否 | 否 |
| `SUPPLEMENT_REVIEW_REQUIRED` | 补证已正式受理，教师最终复核 | 是，轮次 2 | 否 |
| `VALID` | 当前正式有效判断 | 否 | 进入 B 的有效候选集合 |
| `INVALID` | 当前正式无效判断 | 否 | 否 |

`VALID/INVALID` 仅表示审核完成后的当前结果。中间阶段不能压成 `INVALID`，提交成功不能压成 `VALID`。

### 4.2 合法转换

```text
SYSTEM_CHECK_PENDING
├─ 可进入自动初审 ──> AI_REVIEW_PENDING
├─ 需人工判断 ─────> TEACHER_REVIEW_REQUIRED (round 1)
└─ 技术失败 ───────> TECHNICAL_PROCESSING

AI_REVIEW_PENDING
├─ NORMAL ─────────> VALID (SYSTEM_AI)
├─ ANOMALY/UNCERTAIN -> TEACHER_REVIEW_REQUIRED (round 1)
└─ timeout/unavailable/parse failure -> TECHNICAL_PROCESSING

TECHNICAL_PROCESSING
├─ 确定性检查恢复 ───> SYSTEM_CHECK_PENDING（重新检查）
├─ AI 有剩余重试且恢复 -> AI_REVIEW_PENDING
└─ 确定性检查已通过且进入受控人工模式
                     └> TEACHER_REVIEW_REQUIRED (round 1)

TEACHER_REVIEW_REQUIRED
├─ 教师通过 ────────> VALID
├─ 教师判无效 ──────> INVALID
└─ 首次合法退回 ────> SUPPLEMENT_REQUIRED

SUPPLEMENT_REQUIRED
├─ 截止前正式受理材料版2 -> SUPPLEMENT_REVIEW_REQUIRED (round 2)
└─ 真实逾期 ───────────> INVALID (SYSTEM_EXPIRY)

SUPPLEMENT_REVIEW_REQUIRED
├─ 教师通过 ─────────> VALID
└─ 教师判无效 ───────> INVALID
```

补证复核轮次没有再次退回边；AI 回调没有从 `SUPPLEMENT_REVIEW_REQUIRED` 到 `VALID/INVALID` 的边。已完成结果的有权纠错使用单独的追加判断命令，保留原判断，不重开补证、不创建第三轮材料或普通审核轮次。

### 4.3 硬规则检查边界

材料格式、数量、归属和正式受理资格由材料/Record Owner 在进入 B 前作权威校验；不合格命令不能产生“已受理但假成功”的审核 Case。B 接收已正式受理的 `P4Z.C.MaterialVersionFact` 后，可保存确定性检查结果作为筛选输入，但这些机器发现不是六类公开教师原因，也不能直接构造“作弊”结论。

对于业务正文尚未明确可自动终结的异常，B 只能进入教师待办或技术状态，不能自行新增系统无效类别。

## 5. AI 初审与人工审核边界

<a id="p4h-b-ai-human-boundary"></a>

### 5.1 自动路径

只有以下条件同时满足时，AI `NORMAL` 才能追加系统有效判断：

1. Case 仍位于同一首版审核轮次和 `AI_REVIEW_PENDING`；
2. task、attempt、Record、材料版本、规则版本和 input fingerprint 全部匹配当前指针；
3. task 所属服务/模型/策略版本仍是请求时版本；
4. 当前没有教师判断、补证材料、新轮次或受控人工结果；
5. 回调通过幂等校验且结果可解析；
6. 当前模式和自动处理范围允许提交该结果。

任一条件不满足，回调只记录为重复、迟到或已 superseded，不改变业务结果。AI `ANOMALY/UNCERTAIN` 只创建同一轮教师待办；疑似重复是线索，不是“经核实存在重复使用或冒用材料”。

### 5.2 人工路径

教师只处理本人责任课程中当前需要动作的 Case，动作只有通过、退回补证、判为无效。教师不能改运动日期、时长、类别、材料版本或统计名额。

总管理员只治理 AI 服务和带明确范围/起止事实的人工模式，不查看原始材料代审。人工模式把尚未完成且属于范围的 Case 送到对应责任教师；恢复自动服务只处理尚未判定的任务，已经人工完成或进入补证的 Case 不重审、不覆盖。

补证版 2 正式受理后直接进入教师轮次 2。AI 可以在未来提供非裁决性技术辅助的可能性不在当前已确认范围；本稿不创建该能力，更不允许模型自动覆盖退回后的教师最终判断。

## 6. 有效候选与审核阻塞公开能力

<a id="p4h-b-effective-candidate"></a>

### 6.1 `P4H.B.EffectiveCandidate`

`EffectiveCandidate` 是 B 向 P4-Z/A 提供的审核完成结果引用，不是统计行。它只在 Case 当前阶段为 `VALID` 且当前判断、轮次、材料版本引用一致时存在，至少包含：

- `recordId`；
- `reviewCaseId`、current decision ID/sequence；
- 产生当前有效结果的 source type；
- `materialVersionId`；
- 当前 `candidateRevision`；
- 结果发生的服务器时间。

B 不在此对象提供 `actualDuration`、业务日期、类别、可计分钟或实际计入分钟；这些分别来自 Record/Session Owner 和 P4-Z/A。A 对同一 `recordId` 取得不可变 Record 事实后才计算，不能把“提交成功”“AI 任务成功”或旧默认 VALID 当候选。

纠错为无效会从下一快照移除候选；纠错为有效会加入。等待 AI、技术处理中、教师待办、待学生补证和补证待复核都不产生候选。

<a id="p4h-b-source-guard"></a>

### 6.2 集合快照与提交保护

`ReadEffectiveCandidateSnapshot(enrollmentId, expectedOrNewSnapshot)` 返回固定 candidate revision 下的完整候选集合或可验证的固定快照分页。读取失败、分页不完整或来源版本漂移必须返回“不完整/已变化”，不能返回空集合或假零进度。

`AcquireReviewSourceGuard(scope, revisionKind, expectedRevision, unitOfWork)` 是内部 Application 参与式能力，不是公开 HTTP API。它按 candidate/blocker kind 锁定 provider-owned scope version 到调用方事务提交，复核当前 revision 与期望一致；B 的任何会改变对应候选或阻塞结果的 mutation 都必须先取得同一 scope 保护。A 发布统计选择、E 冻结结算时据此排除“检查后又新增候选/待办”的窗口。

重复请求可返回原快照，但必须保留其原 revision；不得把旧快照改贴新 revision，也不得把旧结果重新切为当前。

<a id="p4h-b-review-blocker"></a>

### 6.3 `ReviewBlockerSnapshot`

B 向 P4-Z/E 提供课程范围内完整的审核阻塞快照：每个非终态 Case 的 record、当前阶段、材料版本、当前轮次、教师 SLA/补证计时引用、技术状态和 blocker revision。读取失败或只返回部分范围不是“无审核待办”。

B 只保证审核相关阻塞与来源版本；完整成员集合、名单/OCR、媒体传输、Session、申请、统计和其他结算来源仍由各 Owner 提供，E 不得要求 B 代为跨模块拼接。

## 7. 队列与计时核心

### 7.1 教师异常队列去重

<a id="p4h-b-queue-dedup"></a>

- 活动教师待办唯一 key 为 `(reviewCaseId, reviewRoundNo)`；数据库使用相应 partial unique 或等价强约束。
- 同一轮的多个 AI finding、重复/迟到回调、刷新、提醒或相同延迟说明只合并为同一项的来源集合，不增加计数。
- `TEACHER_REVIEW_REQUIRED` 与 `SUPPLEMENT_REVIEW_REQUIRED` 才进入教师当前待办数；等待 AI、技术处理中、等待学生补证分别进入自己的投影。
- 教师成功动作原子关闭本轮待办；失败、只打开详情或重复点击不关闭、不重置 SLA。
- 补证正式受理产生 round 2 的一项新待办，round 1 历史仍关闭；同一 Record 当前仍只计一次。
- 课程关闭或成员移出不删除既有待办；权限仍按当前 V8.1 责任教师边界校验，不创建跨教师接管。
- 队列是从 Case/round/source revision 可重建的读模型，丢失后重建不能修改审核事实。

<a id="p4h-b-supplement-timer"></a>

### 7.2 `P4H.B.SupplementTimerFact`

教师 round 1 的合法退回事务成功时，B 创建唯一学生补证计时事实：

- `windowBudget` 只能是总窗口 24 小时或 72 小时，默认 24；
- `startedAt` 是服务器确认退回成功的 instant；
- `baseDueAt = startedAt + windowBudget`，只保留初始对照；
- `effectiveDueAt`、`remainingDuration` 和 `acceptanceState` 必须基于当前版本化暂停/故障事实计算；
- 状态为内部 `ACTIVE / PAUSED_MAINTENANCE / ACCEPTED / EXPIRED`；
- `ACCEPTED/EXPIRED` 终态互斥，终态后不恢复、不开新 timer；
- 对尚无成功历史的新受理 command，`CanAcceptSupplement` 只有在 Case 仍为 `SUPPLEMENT_REQUIRED`、`supplementReturnUsed=true`、唯一 Timer 当前为 `ACTIVE`、尚无版 2 正式受理/终结结果、系统允许提交、材料版 2 合法，且服务器受理 instant 严格早于当前最终截止时为真。

开始上传、本地保存、客户端倒计时为零、通知送达/已读都不结束计时。符合提交条件的材料版 2 在截止前被服务器正式受理才把 Timer 置 `ACCEPTED`；其后等待教师不再消耗学生时间。相同受理 command 的重放先命中幂等历史并返回原版 2/round 2，不重新执行 `CanAcceptSupplement`；不同 command 在 `ACCEPTED/EXPIRED` 后一律拒绝。

<a id="p4h-b-teacher-sla-round"></a>

### 7.3 `P4H.B.TeacherSlaRound`

Case 每次正式进入需要教师动作的状态，都新建一条 SLA round：

- round 1：AI 异常/不确定、延迟材料或人工模式正式进入教师队列；
- round 2：材料版 2 正式受理后进入补证复核队列；
- 预算语义固定为两个学校工作日，但精确截止必须引用学校 Calendar ID/version 和日内边界；
- 教师通过、判为无效或 round 1 退回成功时结束当前 SLA；失败、详情查看、刷新或重复请求不结束；
- 等待 AI、技术处理中和等待学生补证时不存在活动教师 SLA；
- 维护期间暂停，恢复后继续本轮剩余学校工作时间，不重开、不沿用上一轮；
- 到达 SLA 只追加一次教师提醒和管理汇总事实，当前待办继续存在，不自动判学生无效。

在 `P-20260904-03` 未关闭前，可以完成实体、版本和 Provider 边界设计，但不能生成权威 `dueAt` 或实现计算器。缺 Calendar 权威时必须显式标记“期限无法计算”，不能回退到 48 小时、周一至周五或客户端时间。

<a id="p4h-b-maintenance-ref"></a>

### 7.4 对 `P4H.F.MaintenancePauseFact` 的最小引用要求

F 的正式定义见 [§15.5](#p4h-f-maintenance)。B 要求 F/`system-mode` 公开：组织范围、模式 transition ID、实际 `MAINTENANCE` 开始、服务器确认恢复 `NORMAL` 的结束、当前是否仍开放、单调 source revision，以及去重后的区间身份。

B 只消费实际 transition，不消费预计恢复时间。多个或重叠的维护/已确认故障区间按区间并集扣除，同一事实重放不重复补偿。计时投影必须记录使用的 F source revision；恢复后发现版本变化时重算剩余和新截止，不改写原退回、原截止或历史暂停区间。

<a id="p4h-b-timer-math"></a>

### 7.5 补证计时计算

对计时区间 `[startedAt, now)`，令 `N` 为已确认不应计时区间的并集：已发生的维护区间，加上范围命中且在错误逾期前已经确认的非维护平台故障调整。个人离线不属于 `N`。

```text
chargeableElapsed = duration([startedAt, now) - N)
remaining = max(0, windowBudget - chargeableElapsed)
effectiveDueAt = 从 now 起继续消耗 remaining 的最早服务端 instant
```

维护仍开放时只展示暂停与当前 remaining，不用预计恢复时间伪造最终截止。已知调整区间重叠时先取并集，不能逐条相加。`P-20260904-04` 涉及“逾期已写入后才确认故障”的情况，不能套用本公式自动回滚终态。

教师 SLA 也消费同一维护区间来源，但其预算由学校日历上的可计工作区间决定，不能套用上述 24/72 小时墙钟公式。

<a id="p4h-b-expiry-order"></a>

### 7.6 自动逾期的固定核对顺序

到期 worker 或补证受理命令必须使用同一 Case/Timer 锁和如下顺序：

1. 以 job/command ID 去重并取得当前系统模式、维护/故障 source revision；
2. 按全局锁顺序锁定 Case、当前轮次、Timer 和当前材料引用；
3. 若 Case/Timer 已 `ACCEPTED/EXPIRED` 或已被有权纠错终结，幂等返回原结果；
4. 以最新维护、故障和正式受理事实重新计算 remaining 与 `effectiveDueAt`；来源不完整、版本漂移或当前处于开放维护时不得判逾期；
5. 若已有绑定材料版 2 的正式受理事实且 `acceptedAt <` 重算后的 `effectiveDueAt`，结束学生计时，禁止逾期；
6. `remaining > 0` 时只更新可重建投影并重新安排检查，不追加判断；
7. `remaining = 0`、仍为 `SUPPLEMENT_REQUIRED` 且没有合格受理事实时，追加一次 `SYSTEM_EXPIRY / INVALID`，公开系统原因为“补证逾期 / Supplementary evidence deadline missed”；
8. 同事务关闭 Timer、更新 Case/current projection 和相关 blocker/candidate revision，插入学生站内通知与系统主体 AuditEvent；任一步失败整体回滚。

截止边界使用半开区间：正式受理必须发生在截止 instant 之前；等于截止时不算“截止前”。若受理与 worker 并发，锁后以权威服务器时间和 current facts 决定：截止前已提交成功者优先保留受理；截止后尚未受理者终结。不能按谁先返回 HTTP 响应决定。

## 8. 人工动作与公开原因

<a id="p4h-b-public-reasons"></a>

### 8.1 固定教师原因目录

下列内部 identity 仅用于 Domain 设计，实际 Contract wire 值由 Phase 5 决定：

| 内部 identity | 中文公开名称 | 英文公开名称 | 退回补证 | 判为无效 |
|---|---|---|---|---|
| `UNCLEAR_EVIDENCE` | 材料不清晰 | Unclear evidence | 允许 | 允许 |
| `MISSING_REQUIRED_EVIDENCE` | 必需材料缺失（含要求的前后照） | Missing required evidence | 允许 | 允许 |
| `EVIDENCE_SESSION_MISMATCH` | 材料与本次运动不符 | Evidence does not match this session | 允许 | 允许 |
| `INCONSISTENT_EVIDENCE` | 材料信息矛盾 | Inconsistent evidence | 允许 | 允许 |
| `AUTHENTICITY_REQUIRES_CLARIFICATION` | 材料真实性待核实 | Evidence authenticity requires clarification | 允许 | 禁止 |
| `CONFIRMED_REUSE_OR_MISUSE` | 经核实存在重复使用或冒用材料 | Confirmed reuse or misuse of evidence | 禁止 | 允许 |

教师退回或判无效必须选择一个对当前动作适用的固定原因，可附一句公开说明；不得用自由文本代替分类，不设置“其他”，不保存隐藏审核备注。通过不需要失败原因。

AI finding 不直接等于上述教师原因。特别是疑似重复只能作为教师线索，不能自动映射为 `CONFIRMED_REUSE_OR_MISUSE`。合法引用原素材、同批续传和幂等重试不属于违规重复使用。

### 8.2 系统逾期原因

“补证逾期 / Supplementary evidence deadline missed”是独立系统公开结果原因，只能由 [§7.6](#p4h-b-expiry-order) 的系统逾期事务产生，不进入教师下拉框，不成为第四个教师动作。系统事件使用系统主体，不能冒用责任教师身份。

固定分类、系统原因和教师原文公开说明在学生补证页、记录详情和站内通知中保持同一来源；通知已读不影响审核或计时事实。

## 9. 事务、幂等与并发

### 9.1 通用保护

- 所有 create/mutation 保存 `commandId`；重复命令返回同一历史结果，不追加第二条判断、轮次、计时器、待办、通知或审计。
- 更新必须携带 expected Case/version；并发变化返回当前事实，不静默覆盖。
- sequence、round、active queue item、唯一补证 Timer、AI task input 和系统逾期 decision 均有数据库唯一保护。
- 外部 AI I/O 在事务外；任务领取、attempt 结果 CAS、当前 Case 更新在短事务内。
- 成功业务事实、必要站内通知、AuditEvent 和 scope revision 在同一事务提交。
- 全部时间取数据库/服务端；读取投影失败不反向改写 source facts。
- 跨模块流程遵守既有全局锁顺序；B 作为参与者加入调用方 Unit of Work，不直接取得 C/A/E/F 的 Repository。

### 9.2 首版受理与 AI 回调

首版材料由 `exercise-record` 顶层 Use Case 原子创建 Record、材料版 1 引用和 Review Case；B 初始化为 `SYSTEM_CHECK_PENDING`，不创建默认 VALID。确定性检查完成后按 [§4](#p4h-b-state-machine) 进入 AI、教师或技术路径。

AI 回调按 task ID、attempt、provider event/result digest、material version、input fingerprint 和 expected Case version 校验。教师先完成、材料版本已变化、人工模式已接管或 callback 重复时，attempt 历史可以留痕，但 current Case 不变。两个 worker 竞争时只有一个 CAS 能产生当前转换。

### 9.3 教师动作

教师动作事务锁定 Course/Enrollment/Record/Case/current round，复核责任教师、系统模式、当前阶段、expected version、材料版本和原因适用性。通过/判无效追加 Decision；首次退回同时关闭 round 1/SLA、将 `supplementReturnUsed` 从 false 置 true、创建唯一 Timer、更新 Case，并写通知/审计。

重复退回 command 返回原 Timer；不同 command 再次退回因 `supplementReturnUsed=true` 和状态不匹配被拒绝。补证轮次 2 的状态机不存在退回转换。

<a id="p4h-b-supplement-binding"></a>

### 9.4 B 绑定 `P4Z.C.MaterialVersionFact`

补证受理顶层 Use Case 归材料/Record Owner（P4-Z/C 对应运行模块 `exercise-record`），B 通过参与式公开能力加入同一 Unit of Work：

1. 外部上传和媒体探测先完成；事务内按全局顺序取得材料与 Case/Timer 保护；
2. 幂等历史未命中时，B 验证当前为 `SUPPLEMENT_REQUIRED`、`supplementReturnUsed=true`、唯一 Timer 为 `ACTIVE` 且无版 2 成功受理/终结、系统允许业务，并按 [§7.6](#p4h-b-expiry-order) 取得 `CanAcceptSupplement=true`；
3. C 锁定合法的 `P4Z.C.MaterialVersionFact` 版 2，保证属于同一 Record、列表完整且命令幂等；
4. B 把 round 2/current Case 精确绑定该 `materialVersionId`，将 Timer 原子置 `ACCEPTED`，创建唯一 round 2 教师待办和新的 `TeacherSlaRound`；
5. 同事务递增 blocker revision；若转换改变有效候选，再递增 candidate revision，并写必要通知和 AuditEvent；任一参与者失败整体回滚。

不能先结束 Timer 再异步等待材料锁定，也不能先创建材料版 2 后因 B 失败仍显示“已受理”。重复命令返回同一材料版、同一 round 2 和同一受理结果，不产生 version 3。

### 9.5 自动逾期、受理和人工判断竞态

- 受理与逾期竞争：共同锁和权威 `acceptedAt/effectiveDueAt` 决定，结果只能 `ACCEPTED` 或 `EXPIRED` 之一。
- AI 与教师竞争：教师路径要求当前教师待办；AI 自动通过要求当前仍为 AI pending。旧 callback 不能越过 current version。
- 两次教师判断竞争：expected version、round active unique 和 decision sequence unique 只允许一个成功；失败方读取最新结果。
- 重复队列来源：`(caseId,roundNo)` active unique，来源集合以 source identity 去重。
- 维护切换与普通写：复用 `system-mode` 的组织级 mode guard，使切换与受理/判断有确定先后；维护期间教师页面操作和学生补证受理 fail closed。
- A/E 发布与 B 变化：调用 [§6.2](#p4h-b-source-guard) 的 review source guard；版本漂移丢弃旧计算/冻结结果并重读，不把旧内容贴上新版本。

### 9.6 限定工程模型与边界

<a id="p4h-b-engineering-model"></a>

`P4H-B-ENG-1.0`使用三类内部记录把§3～§9的已接受语义落到工程边界。字段名是Domain/Application设计名，不是DDL、OpenAPI、DTO或Contract wire承诺。

| 记录 | 最小内容 | 唯一/不变量 | 用途 |
|---|---|---|---|
| `ReviewCommandReceipt` | `commandId`、command kind、actor/scope、request digest、期望Case/round/material/source revision、result kind、result reference/digest、服务器时间 | 同一B command namespace内`commandId`唯一；已提交receipt只追加；同ID不同digest必须拒绝 | 证明相同命令返回原结果，不以“当前看起来幂等”代替历史 |
| `ReviewTransitionFact` | Case、before/after stage、before/after Case version、round/material、cause receipt、decision/task/timer引用、candidate/blocker revision前后值 | `afterCaseVersion = beforeCaseVersion + 1`；原转换不改写；只能表达§4.2的边或明确的技术恢复 | 将current projection与只追加历史绑定，便于重放和差异核对 |
| `ReviewOutboxFact` | stable event key、aggregate/scope、receipt/transition引用、payload class/version、脱敏payload digest、publish state | `eventKey=(transitionId,eventClass,recipientOrScopeDiscriminator)`唯一；必要事件与转换同事务落库 | 允许事务后至少一次投递，重放不产生第二个业务事实 |

`ReviewCommandReceipt`不保存原媒体、密钥、完整模型提示或教师隐藏备注。请求digest必须覆盖所有影响结果的绑定值；仅对JSON排序、空白或传输header归一化，不能忽略材料版本、原因、窗口、预期revision或actor scope。

### 9.7 命令输入、前驱版本与结果

<a id="p4h-b-command-envelope"></a>

所有B mutation先构造完整的`ReviewCommandEnvelope`：`commandId`、command kind、actor identity/scope、server-received instant、`reviewCaseId`、expected Case version、expected round/material version，以及命令必需的task/timer/source revision。缺必填绑定不得降级为“使用最新值”。

| 命令簇 | 必须绑定的额外输入 | 成功结果 | 拒绝/无操作结果 |
|---|---|---|---|
| 确定性检查/AI调度 | material/rule/input fingerprint、policy/service version | 原task/attempt或下一处理阶段引用 | Case或输入已变则`STALE_INPUT`；不创建重复task |
| AI结果应用 | task、attempt、provider event/result digest、task创建时的Case/material/input/policy | 原转换、Decision或唯一教师待办 | 重复返回原结果；迟到/被取代只追加attempt结果，current Case不变 |
| 教师通过/无效/首次退回 | 责任教师scope、current queue/round/material、动作可用的固定原因；退回另绑定24/72小时总窗口 | 原Decision或原Timer，并关闭原round/SLA/queue | 权限、阶段、版本或原因不匹配时拒绝；不关闭待办 |
| 补证受理参与 | Timer、最新F source revision、服务端受理时间、C提供的批次前已定义`MaterialVersionFact` identity | 原Timer acceptance、round 2、queue/SLA与材料版本引用 | 截止等号、来源不完整/漂移、已ACCEPTED/EXPIRED的不同command均拒绝 |
| 补证逾期 | Timer、重算所用F source revision、worker identity、数据库时间 | 原SYSTEM_EXPIRY Decision和终态Timer | 已受理、remaining大于0、开放维护或来源不完整时不逾期 |

表中“原结果”由receipt指向事务中已落库的事实。即使Case后来进入新阶段，相同command/digest也返回当时结果，不重新用当前状态裁决。相同command但digest不同返回`IDEMPOTENCY_CONFLICT`，不泄露其他actor的历史payload。

### 9.8 Unit of Work、锁和原子发布

<a id="p4h-b-uow"></a>

Application先以receipt查询处理相同command；未命中时才进入业务事务。跨模块顶层Use Case按既有全局顺序取得mode/scope guard和Record/material保护，B只在自己被分配的顺序位置参与。B内部固定按`ReviewSourceScope（仅影响投影时） → ReviewCase → active ReviewRound → SupplementTimer/AIReviewTask → active queue item`取得必要保护；已由顶层guard持有的scope不重复或反向取得。单一B命令不反向打开C/A/E/F Repository，不在B内发起隐藏的第二事务。

一次成功mutation的最小原子集为：

1. 校验expected Case/round/material/source revision和状态边；
2. 追加Decision/task/timer/round/transition中命令所需的事实；
3. 更新Case current projection，以及唯一queue/timer/task指针；
4. 依影响实际递增candidate/blocker revision；不变的revision不为了“方便”递增；
5. 插入必要通知/AuditEvent的outbox事实和完成receipt。

任一步失败整体回滚：不得出现Decision已可见但Case未转换、Timer已关闭但版2未受理、queue已关闭但教师动作未成功，或revision已递增但快照事实不存在的部分发布。外部AI请求和outbox投递在事务外；它们只能基于已提交task/event事实执行。

### 9.9 并发裁决和版本漂移

<a id="p4h-b-concurrency"></a>

| 竞态 | 共同裁决事实 | 唯一允许的结果 |
|---|---|---|
| 两个教师动作 | current round/queue、expected Case version、decision sequence | 首个合法CAS提交；另一个返回最新事实，不关闭第二次 |
| AI回调与教师动作 | task/attempt创建时绑定和current Case/round/material | 只有当前阶段合法的一边能改current；迟到AI只留attempt历史 |
| 补证受理与逾期worker | 同一Case/Timer、最新source revision、权威`acceptedAt/effectiveDueAt` | 只能`ACCEPTED`或`EXPIRED`；等于截止不是截止前 |
| 维护切换与普通写 | 组织mode guard、F source revision、数据库时间 | 维护生效后的新业务写fail closed；旧请求不凭HTTP先后解释 |
| A/E读取后与B mutation | candidate/blocker scope revision和参与式guard | revision未变才能发布；漂移则丢弃旧计算/冻结结果并重读 |

冲突返回的当前事实是受权限限定的Domain结果，不暴露内部行、锁或其他教师的操作payload。重读后的新意图必须使用新command ID；不得修改旧command的digest来强行重试。

### 9.10 来源revision和可重建投影

candidate revision只在`EffectiveCandidate`集合的成员或其当前decision/round/material绑定变化时递增。blocker revision只在非终态Case集合或其当前stage/round/material/Timer/SLA/technical绑定变化时递增。同一转换同时影响两个投影时，在一个事务中分别递增，但不强求两个数值相等。

快照页必须回传scope、revision、确定性页边界和完整性证明。任一页读取失败、revision混用、重复/缺页、行引用不存在或完整性证明不成立，整个快照是`INCOMPLETE_OR_CHANGED`，不是空集合。queue、remaining、dueAt和当前快照都可重建；Decision、round、Timer终局、receipt和transition history不可通过重建覆盖。

### 9.11 有限故障恢复边界

- worker只从已提交task/outbox事实重试；不扫描current Case后自行猜测一个缺失的业务命令。
- 发现已有receipt但其result reference缺失，或transition/current projection无法对应时，标记数据完整性故障并停止受影响Case；不重跑命令制造新结果。
- 只追加历史和current projection核对必须包含identity/revision/digest；“数量相等”不能证明恢复完整。
- 逾期已成终局后才确认的非维护故障仍受`P-20260904-04`阻塞；恢复工具不得撤销`EXPIRED/INVALID`。
- 本节只冻结停止与fail-closed边界；备份、真实数据修复、补偿事务和运行runbook仍为`NOT_EXECUTED`或R3。

### 9.12 可确定性检查模型与未满足分支

<a id="p4h-b-engineering-checks"></a>

本增量的有限内存模型只检查以下设计不变量：

1. 相同command/digest返回原结果，不增加Decision/Timer/round/queue/revision；相同command不同digest拒绝。
2. expected Case version错误时无mutation；合法转换每次只递增一个Case version。
3. 教师两个不同command竞争时只一个产生判断；迟到AI回调不覆盖教师结果。
4. 首次合法退回一次性创建Timer；同command重放返回原Timer，不同command不能创建第二Timer。
5. 补证受理与逾期互斥；截止前受理保留，等于截止拒绝，来源不完整/漂移时不逾期。
6. 事务中注入任一失败点后，Case、历史、Timer/queue、revision、outbox和receipt整体回到前驱快照。
7. candidate/blocker revision只按实际影响递增；重建投影不改写只追加事实。

实际自检使用`WI-0022-B-ENG-MODEL-1.0`，覆盖上述不变量的40个断言，结果`40 PASS / 0 FAIL`；最终程序SHA-256为`329673687211679cfab1d6c465c333472efcadb5d7615c2a22d245a694bb2a97`。首轮业务断言执行完后的总数检查写成36，与实际前置断言39不符；仅修正检查器计数后复跑通过，设计正文和业务断言未因此改变。

模型不证明真实数据库隔离级别、锁行为、所有并发交错、AI provider、媒体上传、真实日历、运行恢复、Contract或产品集成。P-01～P-04、GAP-H13及同批Z-C新内容均不是模型默认输入；受它们影响的分支继续`PENDING/BLOCKED_R3/NOT_EXECUTED`。

## 10. AT-01～AT-08 正反例推演

以下是设计级顺序推演，不是产品、数据库、模型准确率或真实并发测试。

### 10.1 AT-01：普通合格提交

正例：材料版 1 正式受理 → `SYSTEM_CHECK_PENDING` → 规则检查通过 → 绑定 task T1 → AI 返回 `NORMAL` 且 task/material/input/current version 全匹配 → 追加 `SYSTEM_AI/VALID` → 产生 `EffectiveCandidate`。教师队列计数始终不增加。

反例：Record 创建时直接写 VALID；或仅因上传完成、AI HTTP 200、旧 callback 成功就计入。均绕过版本和 current 状态，禁止。

### 10.2 AT-02：AI 不确定或疑似重复

正例：T1 返回 `UNCERTAIN` 并含疑似重复 finding → Case 进入 round 1 教师待办；同一回调重放、第二条 finding 和刷新仍只计一个 `(case,1)` 待办。教师看到线索与材料后选择合法动作。

反例：AI 疑似重复自动写“经核实存在重复使用或冒用材料”并判无效；或每个 finding 建一条待办。前者把线索冒充事实，后者破坏去重。

### 10.3 AT-03：AI 超时与重复回调

正例：AI attempt 1 超时 → `TECHNICAL_PROCESSING/RETRY_WAIT`；有限重试仍失败后保留技术状态和告警。稍后重复 timeout 不新增教学待办。确定性检查已经通过后，管理员开启明确范围人工模式才创建 round 1 教师待办；教师完成后迟到 T1 callback 只记 superseded。若失败发生在确定性检查阶段，恢复后必须回到 `SYSTEM_CHECK_PENDING` 重新检查，不能直接进 AI 或人工判断。

反例：超时默认通过、默认判学生无效、无限重试，或迟到 callback 覆盖教师结果，均禁止。

### 10.4 AT-04：补证与回调竞态

正例：round 1 绑定材料版 1；教师退回后版 1 的 AI callback 到达，因状态/轮次不匹配不改变 Case。学生材料版 2 正式受理后，round 2 精确绑定 version 2，教师只审核该版并保留 version 1/旧结果历史。

反例：只按 Record ID 接受回调，使版 1 结果覆盖 version 2；或 B 不校验材料版本直接结束 Timer，均禁止。

### 10.5 AT-05：教师首次退回

正例：round 1 教师选择适用公开原因及 24 小时（或特殊 72 小时）总窗口；成功事务结束 round 1 SLA、把唯一退回动作标记为已使用、以服务器时间创建唯一 Timer，并向学生开放这一次版 2 提交及公开原原因与当前准确截止。

反例：72 小时叠加在 24 小时上、从页面打开时间起算、退回后立即判无效、仅写自由文本或选择不适用于退回的“经核实存在重复使用或冒用材料”，均拒绝。

### 10.6 AT-06：到期未补证与到期前已受理

正例 A：无维护/调整，最终截止到达，仍待补证且无正式版 2 受理 → 系统一次追加逾期无效、关闭 Timer、通知学生，不创建教师 round 2。

正例 B：材料版 2 在最终截止前正式受理 → Timer `ACCEPTED`，开启教师 round 2；即使教师在原截止后处理，也不再产生学生逾期。

反例：worker 只看最初 base due、忽略维护/故障/受理；或教师迟审导致已按时受理的学生被判逾期，均禁止。

### 10.7 AT-07：再次退回与网络重试

正例：同一补证提交 command 重试，返回原 material version 2、受理结果和 round 2；同一教师 command 重试返回原 Decision。补证后教师只能通过或判无效。

反例：重复请求创建 version 3、第二个 Timer、第二次机会或第二条同轮判断；补证后再次退回；纠错重开补证，均被唯一约束与状态机拒绝。

### 10.8 AT-08：平台故障与个人离线

正例：24 小时 Timer 已消耗 8 小时后进入 18 小时维护，维护期间 remaining 保持 16 小时；服务器确认恢复 NORMAL 后从 16 小时继续，新的最终截止相对退回为第 42 小时。若已确认非维护故障区间与维护重叠，只按区间并集补偿一次。

反例：预计恢复时间到达便自动恢复；恢复后重新发 24 小时；维护区间和故障区间分别相加造成双重补偿；学生个人断网自行报称平台故障；真实逾期终结后因后来维护自动重开，均禁止。

非维护故障在错误逾期已经写入后才确认的场景仍受 `P-20260904-04` 阻塞，本稿不伪造修复规则。

## 11. 旧设计增量替代点

| 旧设计位置 | 旧语义 | 本稿替代 |
|---|---|---|
| 旧 §4.2、§5.4 | Review 只有系统初始 VALID 与教师 VALID/INVALID | `ReviewCase + ReviewRound + ReviewDecision` 与 [§4](#p4h-b-state-machine) 的中间阶段 |
| 旧 §5.4、§7.5 | Record 提交事务创建 SYSTEM VALID | 首版只初始化 `SYSTEM_CHECK_PENDING`，见 §9.2 |
| 旧 §7.6 | 教师追加 Review 只需 current result 不同 | 增加轮次、材料版本、动作原因、补证资格、Timer/SLA、expected version 和状态转换校验 |
| 旧统计输入 | 直接读取 current VALID | 使用 [§6.1](#p4h-b-effective-candidate) 完整快照和 source guard |
| 旧模式规则 | 普通写 fail closed | 保留，并增加两类计时对 `P4H.F.MaintenancePauseFact` 的版本引用 |

现有 `record-review` 模块 Owner 不变；不新建通用 AI 业务模块或跨模块 Review Repository。AI provider adapter 属于 Infrastructure，任务与业务结果仍由 `record-review` 拥有。

## 12. P4-Z 交叉 Review 答复

<a id="p4h-z-review-version"></a>

### 12.1 评审版本与总评

联合收尾时的评审快照：`p4-design-zhou-v81(5).md`（Z v10）/ SHA-256 `8eb159ddb9235ef29a1ead162e0702b5795c2eefd423c325f1ae2058ccfcaafe` / 837 行 / 135717 bytes。v10 登记 Z v9 与 G2 已由周润基接受并启动联合收尾；A/C/E 正文和算法相对被接受 v9 未变是 P4-Z/联合汇总报告事实，本轮 H 只复核接受元数据、三项闭合回执、版本索引、PENDING 和直接引用，不重跑稳定算法样本。v8 `0424ee55…878f5` 与初轮 `71b813…aec29` 保留为 Finding 历史证据。

结论：P4-Z 的 A/C/E/G2 在所评审版本中遵守“统计、材料、结算/迁移由 Z 定义，审核与计时由 H/B/F 定义”的总体边界。Z 指出的 ISS-020 是本稿真实 P0 内部矛盾；现已在 [§3.1](#p4h-b-supplement-opportunity)、[§7.2](#p4h-b-supplement-timer) 和 [§9.3～9.4](#p4h-b-supplement-binding) 统一。修正后未发现 A/C/E/G2 与 H 当前正式定义仍有 P0 概念冲突。

本结论覆盖 `p4-migration-note(1).md@55b04e2c…e6d4` 的内容评审，并核对其接受登记版 `p4-migration-note(3).md@7618a69a…1f62` 只有状态/交接元数据变化；不接受 P4-Z 自报的产品、数据库、并发、迁移或恢复执行结果，相关附件均明确这些为 NOT EXECUTED。

<a id="p4h-z-iss001-006-responses"></a>

### 12.2 ISS-001/006 八项逐条答复

| # | 答复 | P4-H 正式位置 | 评审意见 |
|---|---|---|---|
| 1 有效候选引用 | **确认** | [§6.1 `P4H.B.EffectiveCandidate`](#p4h-b-effective-candidate)、[§6.2](#p4h-b-source-guard) | A-05、A-14/15A、A-22A 只消费 B 当前有效结果及 candidate revision；Record 时长/日期/类别仍取其 Owner，A 不推演 B 状态。 |
| 2 补证计时引用 | **确认** | [§3.1 唯一机会语义](#p4h-b-supplement-opportunity)、[§7.2 `P4H.B.SupplementTimerFact`](#p4h-b-supplement-timer)、[§9.4](#p4h-b-supplement-binding) | ISS-020 已修正：首次退回将 `supplementReturnUsed=true`，表示唯一退回动作已使用并开放版 2；新受理要求该值为 true 且 Timer 仍 ACTIVE、无版 2 终局。C-04/05、E-07/08 只消费结果，四项业务 PENDING 未关闭。 |
| 3 教师 SLA 引用 | **确认** | [§7.3 `P4H.B.TeacherSlaRound`](#p4h-b-teacher-sla-round)、§6.3 | C/E 只消费轮次和阻塞结果，不计算 SLA。学校日历仍为 `P-20260904-03`，所以当前可确认结构与归属，不能确认真实 dueAt。 |
| 4 维护暂停引用 | **确认** | [§7.4 B 的消费边界](#p4h-b-maintenance-ref)、[§15.5 `P4H.F.MaintenancePauseFact`](#p4h-f-maintenance)、[§12.4 G2 评审](#p4h-z-g2-review) | F 从 `system-mode` 实际 transition 形成唯一暂停事实，B 只按 source revision 消费并继续剩余计时；已核对 G2-15/15A/15C 未重置、重定义或用预计恢复时间补算。 |
| 5 B 绑定 C 材料版本 | **确认** | [§3.1](#p4h-b-supplement-opportunity)、[§9.4](#p4h-b-supplement-binding) | B round/task/current Case 均绑定 `P4Z.C.MaterialVersionFact.materialVersionId`；ISS-020 修正后版 2 的新受理条件一致。C/`exercise-record` 编排同一 UoW，材料定义和审核定义没有互相复制。 |
| 6 E/客户端引用 A 统计 | **确认** | §2.2、§6.1、[§16.5 G1 统计消费](#p4h-g1-statistics) | E 与客户端都引用 P4-Z §2.5 的 `P4Z.A.StatisticsProjection`；G1 不另写分列公式、未计入口径或候选判定。A-07/A-17 两项已确认来源不重新提问。 |
| 7 结算与来源保护协作 | **确认** | [§6.2](#p4h-b-source-guard)、[§6.3](#p4h-b-review-blocker)、§9.5 | B 可提供完整审核阻塞快照及 `AcquireReviewSourceGuard`，保护到 E 提交；B 不提供成员、名单/OCR、媒体、Session、申请或统计全量，E 必须分别从各 Owner 取完整集合。当前是设计能力，真实事务未执行。 |
| 8 Contract 与联合收尾引用 | **确认** | [§17 G3](#p4h-g3-contract-gaps)、[§18 交付报告](#p4h-package-report) | Z §6 继续只是影响定位；ISS-006 在 G3 归集。当前联合收尾的正式 Handoff 同时引用 P4-Z §9、联合汇总和本稿 §18，不复制双方定义；STATUS 仅登记 PARTIAL，不宣称 Phase 5 解锁。 |

统计：8 项“确认”，0 项“不一致”，0 项“待补”。这里的“全部确认”已由 Z v9/v10 闭合回执承接，表示八条 H↔Z 设计接口在 ISS-020 修正后对应；不关闭四项业务 PENDING，也不表示任何产品/数据库/迁移已执行。

### 12.3 对 P4-Z 主稿的定向发现

1. **跨 Owner 原子保护：已由本稿补齐接口语义。** Z/A-22A～22C、E-08A～08C 要求集合版本保护持续至提交；B 的 §6.2/§9.5 提供 provider-owned scope guard。Z 无需复制 B 状态或锁实现。
2. **补证材料绑定：ISS-020 已关闭 H 侧矛盾。** Z/C-03～05 保留材料事实，B §3.1/§7.2/§9.4 统一为“退回动作已用 + Timer 尚可受理”；顶层受理事务由材料/Record Owner 编排，不存在第二次机会或双重 Owner。
3. **G2 独立评审已完成。** 对 `p4-migration-note(1).md@55b04e2c…e6d4` 的 G2-10/12～15D 定向核对未发现定义冲突；执行前所需 B/F 恢复事实清单见 [§12.4](#p4h-z-g2-review)。
4. **Contract 结论边界已对接。** Z §6 没有新建 endpoint/wire 值，符合分工；本稿 [§17](#p4h-g3-contract-gaps) 统一归集 ISS-006，Contract Owner 后续决定 operation/schema/wire。
5. **版本身份已更新。** 联合收尾当前对 Z v10 `8eb159dd…aafe`、G2 接受登记版 `7618a69a…1f62` 和联合汇总 `8ff37739…567c` 负责；底层 Review 证据继续绑定 Z v8 `0424ee55…878f5`、G2 内容版 `55b04e2c…e6d4` 与 H 修订。后续修改需给新 SHA 或 Commit，Reviewer 只复核变化段落和受影响引用，不重复稳定算法样本。
6. **邀请宽限等号已由 Z/E 明确。** Z/E-02A 与 E-AT16 规定 `acceptedAt < expiresAt + 10 分钟`，恰好截止拒绝；本稿已同步 GAP-H07/H19。该决定不外推普通首次材料等其他期限。
7. **ISS-020 接受并整改。** 原稿 §7.2 与 §9.3/9.4 条件确实相反；当前以 `supplementReturnUsed` 和 Timer acceptance lifecycle 分责。正常一次补证可受理、同 command 幂等、第二次退回/版 3 禁止，见 §3.1、§7.2、§9.3～9.5、AT-05～07。

<a id="p4h-z-g2-review"></a>

### 12.4 P4-Z/G2 独立定向 Review

内容评审对象：`p4-migration-note(1).md` / 76 行 / 15101 bytes / SHA-256 `55b04e2c198ebe7b824686b9a561c2879aade4bd6510115c71c7bf1add00e6d4`；当前接受登记版为 `p4-migration-note(3).md` / 78 行 / 15901 bytes / SHA-256 `7618a69a1c377080bfbd93571a91a5757b4921756ea07554afb59f60ce7e1f62`，内容边界未变。结论为 **确认，无 P0/P1 不一致 finding**：

| G2 位置 | 答复 | H 侧核对 |
|---|---|---|
| G2-10 | **确认** | A 仅重建派生投影，不覆盖 Session/Record、材料、B 判断或认证历史；E 历史报告不被缓存重建冒充。 |
| G2-12 | **确认** | 同一恢复点覆盖审核/计时关联、current pointer、媒体 manifest 与审计序列；签名 URL 不当持久资产，不虚构 RPO/RTO。 |
| G2-15 | **确认** | 技术恢复不代替教师改判、不重开补证、不重新结算/改成绩；先核对事实再调用各 Owner 的重建能力。 |
| G2-15A | **确认（带执行前清单）** | G2 只登记 Owner 引用，没有复制 B/F 结构。实际恢复清单必须包含 Case/round/current material、`supplementReturnUsed`、Timer budget/start/base/effective/remaining/acceptanceState 及暂停/故障 source revision、TeacherSlaRound/calendar revision，以及 F 的 transition-paired maintenance interval/sourceRevision。 |
| G2-15B | **确认** | 先核对原事实、对象、规则、报告和恢复点后事实，再重建派生结果；同总量不等于同选择/同报告。 |
| G2-15C | **确认** | 任一 B/F 时间来源或其他必要事实缺失即停止，不能默认版本、猜日期或重置倒计时；未知旧数据另触发 `DATA_MIGRATION_DECISION_REQUIRED`。 |
| G2-15D | **确认** | 八项文字情形均保持 NOT EXECUTED，尤其第八项明确等待 B/F，不在 G2 补算；没有把推演写成恢复测试通过。 |

G2-01～09、11、13～14、16～18 的边界也未发现违反 H 定义之处；其空库/既有数据判断、执行授权、备份和真实恢复证据仍由环境与后续工作项提供。本次 Review 只接受文档边界，不接受“已迁移/已恢复/可上线”的结论。

## 13. PENDING、后续边界与交付状态

### 13.1 当前不能落实现的事项

- 精确教师 SLA 截止：等待 `P-20260904-03` 的学校日历来源与日内边界；
- 错误逾期后才确认非维护故障的补救：等待 `P-20260904-04`；
- 六类均不适用时的终局判定：等待 `P-20260904-01`；
- 普通首次材料和跨收尾/成员移出受理：等待 P4-Z/C、E 对 `P-20260904-02` 的业务输入；
- DTO、endpoint、错误码和 wire enum 的实际定义：按 [§17](#p4h-g3-contract-gaps) 留给 Phase 5 Contract Owner；
- 客户端真实接入、binding 替换和 E2E：按 [§16](#p4h-g1-client-layering) 留给 Phase 8；
- 真实表、Migration、AI provider、worker、锁、性能和恢复演练：后续实现阶段。

### 13.2 本批次完成判断

- B 要求的审核状态机、AI/人工边界、AI 任务、六类原因、队列去重、学生 Timer、教师逐轮 SLA、维护引用、自动逾期顺序、计时归属、幂等/并发和 AT-01～08 已覆盖。
- D、F、G1、G3 已在 §14～17 补齐；P4-H 分工内设计已形成一个完整 Reviewer 输入包。
- 对 P4-Z 所给 8 项确认材料已逐项答复并固定评审版本；没有修改对方文件。
- 本文件已完成整包交叉Review，ISS-019/020/021和G2独立文件复核已闭合；周润基于2026-09-07接受H整包为本批次PARTIAL设计交付，证据见§18.6。四项PENDING、工程DoD和Phase4最终完成判断仍开放。
- 本稿不修改业务规则、不修改 Contract，不表示产品、数据库或 AI 已运行。

## 14. D：名单、OCR 与耐力跑数据

<a id="p4h-d-roster-ocr"></a>

### 14.1 Owner 与增量范围

本节承接现有 `course-enrollment` 对 Course、Enrollment、`RosterSnapshot` 的所有权，以及 `endurance` 对真实用时、换算快照和免测结果的所有权。OCR 是 Infrastructure 技术能力，不取得名单、身份、用时或成绩的最终判定权；服务配置和人工模式归 [§15](#p4h-f-governance)。

本节只增加纸质名单/手写成绩的“草稿—核对—确认”结构和综合名单公开读模型，不把 OCR 文本直接塞入旧正式表，也不建立跨模块共享 Repository。

### 14.2 纸质名单草稿实体

`RosterImportBatch` 由 `course-enrollment` 拥有，至少保存：batch ID、organization/course、来源类型 `XLSX / CSV / PAPER_SCAN`、原始行数、源材料安全引用及 checksum、解析/OCR task 引用、当前状态、创建者、服务器时间、command ID 和 `version`。XLSX/CSV 继续走确定性解析；只有 `PAPER_SCAN` 进入 OCR。

`RosterDraftRow` 保存 batch、源页/行位置、原始识别文本、候选学号/姓名、字段级置信提示、问题码、当前核对状态及版本。它不是账号、Enrollment、RosterEntry 或正式身份：

- `UNIQUE(batch_id, source_page, source_row_no)`，重复源行不得被静默丢弃；
- 单批总源材料不超过 100 MB，人员数据行最多 500，重复和错误行也计入；
- 候选学号/姓名只能辅助教师核对，不能按模糊姓名自动合并；
- 源图片只通过受限 opaque asset ID 访问，数据库不保存本地路径、签名 URL 或公开下载地址；
- 每次人工处理追加 `RosterDraftRowDecision`，保存 from/to、处理人、原因、command、expected version 和服务器时间；原 OCR 输出不覆盖。

纸质名单批次只有在所有身份定义行均已明确 `CONFIRMED` 或由教师带原因 `EXCLUDED`、且不存在重复/歧义未决行时，才允许生成完整 `RosterSnapshot` 并切换 Course current pointer。解析失败、OCR 成功或“识别出若干行”都不等于名单导入成功。

### 14.3 耐力跑 OCR 草稿实体与“4.30”阻断

`EnduranceCaptureBatch` 与 `EnduranceDraftRow` 由 `endurance` 拥有。每行保存源位置、候选学生、项目、原始用时文本、候选标准化值、测试日期、问题码、OCR task/config version、核对状态和 `version`。正式写入只接受教师确认后的整数秒；换算分和等级不允许作为 OCR 输入或人工反推源值。

`4.30` 必须标记 `AMBIGUOUS_TIME_FORMAT`：它可能代表 4 分 30 秒，也可能代表 4.30 十进制分钟，系统不得任选一种。教师必须对照原图并提交明确的 `mm:ss` 含义或整数秒；在消歧前，该行不能进入确认集合。相同阻断适用于错行、重号、项目/性别不匹配、低可信、日期缺失和无法匹配学生。

约束包括：

- `UNIQUE(batch_id, source_page, source_row_no)`；
- 同一确认 command 只执行一次，重试返回原结果；
- 当前行版本必须与请求的 expected version 一致；
- 选中范围内存在未解决问题时整条确认命令失败，未选中行不受影响；
- 后续纠错追加新的 `EnduranceMeasurement` 和 conversion 历史，不修改旧 measurement 或旧 OCR 输出。

### 14.4 教师确认的两个原子事务

名单快照和耐力跑成绩属于不同 Owner，不能包装成一个跨域“大事务”。“教师确认后生成快照和成绩”落实为两个分别原子的 Use Case：

1. **发布名单快照。** 在外部解析/OCR 完成后，事务锁 Course、Batch 和所有待发布行；核对责任教师、`NORMAL`、expected versions、500 行上限及无未决身份行；插入新的 `RosterSnapshot`、全部 `RosterEntry` 和 reconciliation findings，更新 `course.current_roster_snapshot_id`，追加 AuditEvent。任一步失败则 snapshot、entries 和 current pointer 全部回滚。名单快照不创建账号、Enrollment，也不移除名单外成员。
2. **确认耐力跑选中行。** 事务锁 Batch、选中 DraftRow、对应 Enrollment 和 EnduranceOutcome；核对责任教师、项目、学生性别/年级、明确整数秒、测试日期及 current rule revision；逐行插入只追加 `EnduranceMeasurement`，唯一命中规则时同时插入 `EnduranceConversion`，更新 outcome current pointer 并写 AuditEvent。无匹配或多匹配时不得猜分：该确认命令失败并保持选中草稿未确认。命令成功后所有选中行、measurement、成绩/等级 snapshot 与 current pointer 同时提交；未选中行继续待处理。

外部 OCR/VLM 调用、源文件扫描、病毒/内容探测和完整 candidate 构造都在长事务外完成。事务只信绑定 task/config/input digest 的已完成技术结果，并重新执行服务端业务校验。

### 14.5 完成状态口径

批次内部状态采用设计闭集，Phase 5 再决定 wire：

| 状态 | 精确含义 | 不代表 |
|---|---|---|
| `PARSING` | 文件/图像正在确定性解析或 OCR | 已有正式行 |
| `REVIEW_REQUIRED` | 已产生草稿，至少一行等待教师确认或处理 | OCR 正确、名单/成绩已导入 |
| `PARTIALLY_CONFIRMED` | 至少一行形成正式事实，仍有未选中或未解决行 | 全批完成、分母可发布 100% |
| `COMPLETED` | 每个源行都有终局处理，且相应正式 snapshot/measurement 事务成功 | 人数相等、学生全部注册、考核全部完成 |
| `FAILED_TECHNICAL` | 解析/OCR 技术失败且有限重试结束 | 数据业务无效、学生或教师有错 |

Roster 的 `COMPLETED` 还要求 current snapshot 已原子发布；Endurance 的 `COMPLETED` 要求所有应确认行都已有正式 measurement 或明确带原因排除。行数相等、OCR task 成功、部分确认、没有 UI 红点都不能替代这一判定。

<a id="p4h-d-combined-roster"></a>

### 14.6 `P4H.D.CourseAssessmentRosterProjection`

综合名单是 `course-enrollment` 发起的只读组合投影，不是新 source-of-truth 表。每名学生分别输出：确认名单身份、学校邮箱/入班匹配状态、原始体测录入/免测状态、两类运动进度、当前审核异常、申请待办、结算状态和未完成原因；“注册完成”“体测已录”“打卡达标”必须分列。

组合器只调用各 Owner 的公开 Read Port：

| 来源 Owner | 消费事实与版本 |
|---|---|
| `course-enrollment` | current roster snapshot、确认分母、Enrollment/current member scope revision |
| `identity-access` | 学校邮箱已验证与最小学生摘要版本 |
| `endurance` | 当前原始用时/免测结果及 outcome revision；学生投影不得含 conversion |
| `record-review` / B | `ReviewBlockerSnapshot` 与 source revision |
| `applications-certification` | 当前免测/认证待办及 revision |
| `statistics` / P4-Z A | 仅引用 P4-Z §2.5 `P4Z.A.StatisticsProjection` 的分列结果和 source token |
| `settlement` / P4-Z E | 仅引用 P4-Z §4.3 `P4Z.E.SettlementVersion` 当前状态和 blocker token |

投影保存/返回 `generatedAt`、各来源 token 和 incomplete-source 列表。任一必需来源不可用或版本漂移时显示“暂不可确认/核对中”，不得用 0、空数组、缓存旧分母或“100%”冒充当前结果。高性能实现可使用由各 Owner 维护且可重建的 projection，不允许组合模块直接 join 私有表或写回来源事实。

### 14.7 并发、回退与历史

- 发布名单与确认耐力跑均使用 command ID、expected aggregate version 和全局既定锁顺序；同一 command 重放返回同一 snapshot/measurement 集合。
- 名单回退只移动 Course 的 current roster pointer，保留全部旧 snapshot/finding，不撤销 Enrollment、测试、Record、Review 或成绩。
- 耐力跑纠错追加 measurement/conversion 并移动 outcome pointer；换算表后来变化不追溯覆盖旧 conversion。
- 综合名单导出绑定生成时的全部 source token；来源变化后必须生成新版本，不能给旧文件换标题冒充最新。

### 14.8 AT-15：人数相等但身份不同

正例：确认名单 40 人、当前成员也 40 人，但学号集合有一人不同，同时出现重复学号和名单外成员。系统分别列 `ROSTER_ONLY / MEMBER_ONLY / DUPLICATE_OR_AMBIGUOUS`，分母仍在核对，不自动合并或移出，也不显示 100%。

反例：只比较人数得出“全匹配”；用姓名相似自动合并；把名单外成员删除；过滤重复行后再算 500 行上限。均禁止。

### 14.9 AT-17：OCR 歧义、错行与部分确认

正例：手写表含 `4.30`、一条错行和三条清晰记录。前两条保持问题态；教师选中三条清晰记录后，三条 measurement 与换算 snapshot 在一个命令内原子提交，Batch 为 `PARTIALLY_CONFIRMED`，剩余行继续待处理。

反例：把 `4.30` 自动换成 270 秒；因三条已成功就标全批完成；确认后覆盖 OCR 原文；某一选中行失败但仍提交另外两条。均禁止。

### 14.10 命令收据、输入身份与原结果重放

**D-ENG-01（名单命令收据）。** `RosterImportCommandReceipt`是`course-enrollment`内部工程记录，绑定`organizationId/courseId`、`commandId`、规范化请求digest、操作者、角色/责任教师校验结果、expected Course/Batch/current roster版本、输入batch和源材料checksum、结果snapshot/finding集合、提交后的版本及服务器时间。同一归属和command重放时，digest一致才返回原snapshot与原finding身份；digest不同返回幂等冲突，不重跑OCR、不重发名单，也不以当前最新snapshot替换原结果。它不是Contract字段或跨模块共享表。〔§14.1/14.2/14.4/14.7；AT-15。〕

**D-ENG-02（耐力命令收据）。** `EnduranceConfirmCommandReceipt`由`endurance`拥有，除command/actor外，固定batch版本、按稳定顺序排列且ID唯一的选中DraftRow及各expected version、对应Enrollment/outcome前驱、测试项目/日期、明确整数秒、规则revision和原结果measurement/conversion集合。请求digest必须在可信服务端边界由这份完整、规范化的稳定语义请求派生，不信任调用方自报摘要；重试只在完整请求相同且派生digest一致时返回原提交结果。同command改变选中集合、任一值、日期或规则revision均冲突。不同command若前驱已变化则返回版本冲突，不得把已经确认的行再次解释为本次成功。〔§14.3/14.4/14.7；AT-17。〕

**D-ENG-03（完整输入而非摘要布尔）。** 两类写命令都必须以服务端读取的完整事实构造digest和校验清单，不接收调用方自报的`allResolved=true`、`rowCountMatches=true`、`ocrPassed=true`或可与请求内容脱离的digest作为完成证据。名单发布清单覆盖全部身份定义源行和终局处理；耐力确认清单覆盖本次选中行并在任何写入前拒绝重复DraftRow ID，但不把未选中行伪装为已处理。分页、游标或来源清单未完成时拒绝准备正式写入。〔§14.2/14.3/14.5；AT-15/17。〕

### 14.11 OCR任务、回调与人工决定的版本隔离

**D-ENG-04（技术attempt只追加）。** 外部解析/OCR每次调用形成内部`ExtractionAttemptFact`，绑定batch、attemptNo、taskId、输入checksum、配置/模型version、请求digest、开始/结束时间、技术结果和受限错误分类。原始媒体仍只以opaque asset引用；密钥、签名URL、原始提示及未脱敏provider payload不得进入普通日志。技术超时/不可用/解析失败只结束该attempt并按既定有限重试或人工模式处理，不把业务行写成`EXCLUDED`、不生成正式snapshot/measurement。〔§14.2/14.3/14.5；§15.2/15.3。〕

**D-ENG-05（陈旧回调防护）。** 回调必须匹配当前batch、taskId、attemptNo、输入checksum和配置version；重复同结果可幂等确认，身份不匹配、旧attempt晚到或payload digest变化均只保留技术审计，不能覆盖新草稿。某行已有教师决定后，晚到OCR不得改写原OCR输出、候选值、核对状态或正式事实；需要重新识别时创建新attempt和新候选版本，教师决定仍追加。〔§14.2/14.3/14.7；AT-17。〕

### 14.12 两个Owner内事务与确定锁序

**D-ENG-06（名单发布Unit of Work）。** 名单发布在`course-enrollment`单一事务中按`Course → RosterImportBatch → RosterDraftRow(按稳定行键升序) → current RosterSnapshot pointer`取得Owner内锁；进入锁后重新核对权限、expected versions、源行全集、500行上限、重复/歧义、每行`CONFIRMED/EXCLUDED`终局及当前前驱。事务原子写入新snapshot、全部entry、reconciliation findings、batch完成事实、Course current pointer、命令收据、AuditEvent和待发送outbox。任一步失败全部回滚；OCR task和跨Owner读不在事务内，也不反向持有其锁。〔§14.2/14.4/14.5/14.7；AT-15。〕

**D-ENG-07（耐力确认Unit of Work）。** 耐力确认在`endurance`事务中按`EnduranceCaptureBatch → DraftRow(稳定行键升序) → EnduranceOutcome(稳定学生/项目键升序)`锁定；Enrollment资格和规则匹配结果先通过公开端口准备，在提交点使用绑定revision重新核对，不能锁住D事务再进入其他Owner私有表。先校验选中DraftRow ID集合无重复，再对所有选中行完整预检；稳定排序只用于锁顺序，不得静默去重。随后原子追加measurement、唯一conversion snapshot、行决定、outcome pointer、batch派生状态、命令收据、AuditEvent与outbox。重复选择、任一选中行版本漂移、问题未解、无/多规则匹配或故障注入都回滚整条命令，不生成重复measurement/conversion，不改变row/outcome/current事实，未选中行不写。〔§14.3/14.4/14.7；AT-17。〕

**D-ENG-08（跨Owner版本令牌）。** Enrollment、身份摘要、规则revision及其他Owner结果只以公开不可变事实/令牌参与准备和提交前guard；令牌读取失败、归属不符、不完整或漂移时拒绝本次写入并重新准备。D不规定其他Owner的锁实现，不把“最后一次读取成功”当成提交时仍有效，也不把两个Owner事务拼成分布式大事务。〔§14.1/14.4/14.6；模块边界。〕

### 14.13 行决定、批次完成与纠错追加

**D-ENG-09（名单行决定）。** 每个`RosterDraftRowDecision`固定原行版本、教师明确选择的稳定学生/Enrollment候选或排除原因、匹配依据版本、from/to、command及服务器时间。姓名近似、人数相同或客户端隐藏问题码均不能自动确认。重复学号、同一学生多行、名单外成员分别形成finding；处理finding不删除原行。发布snapshot前重新验证确认行一一映射且无重复稳定身份。〔§14.2/14.8；AT-15。〕

**D-ENG-10（耐力行决定）。** 教师确认保存原始文本、明确解释后的整数秒、项目/性别/年级/日期、规则revision和源位置；`4.30`只有在教师提交明确含义后才可能进入选中集合。纠错追加新measurement/conversion及原因、操作者、前版引用，旧measurement、旧conversion和OCR原文不覆盖。新规则发布不回贴旧conversion。〔§14.3/14.7/14.9；AT-17。〕

**D-ENG-11（完成状态为派生事实）。** Batch状态只能由同一Owner根据完整源行集合、技术attempt、行决定和正式提交结果派生：存在未终局行即不得`COMPLETED`；名单还需current snapshot指向本命令成功版本，耐力还需所有应确认行有measurement或带原因排除。部分成功保持`PARTIALLY_CONFIRMED`，技术attempt失败保持技术状态；UI红点、OCR成功、已处理数等摘要不能直接写终态。相同输入重算应得到同一状态，来源异常则保持不可确认而非默认空。〔§14.5；AT-15/17。〕

### 14.14 综合名单准备清单、发布保护与可重建缓存

**D-ENG-12（投影准备清单）。** `CourseAssessmentRosterProjection`每次准备都固定course/semester、current roster snapshot及完整确认分母、正式成员scope revision与完整成员ID集合，并为每名成员收集identity、endurance、B审核、申请、A统计及批次前Z-E当前状态的公开事实ID/source token。清单保存Owner完成标记、游标/分片完成证据、归属和重复检查结果；只比较两个截断列表彼此相等不能证明完整。H只引用批次前`P4Z.E.SettlementVersion`公开状态与blocker token，不定义E字段，也不消费同批17-E新增。〔§14.6；AT-15；P4Z.E §4.3（批次前接受版本）。〕

**D-ENG-13（受保护发布）。** 准备后发布前重新核对Roster/成员scope、全部Owner token和投影前驱均未变化；任何来源失败、UNKNOWN、缺成员、重复成员、跨课程事实、旧投影或token漂移都拒绝把候选切为current。通过时只原子追加D自己的projection manifest/cache版本并更新current pointer；不写回任何来源Owner。另一任务已先发布时前驱CAS失败，重试重新准备；原命令已成功则返回原projection身份，不能把旧版本切回current。〔§14.6/14.7；AT-15。〕

**D-ENG-14（缓存和导出不是权威事实）。** 物化投影可从manifest与Owner公开事实重建；缓存丢失不得删除snapshot、measurement或来源历史。读取旧缓存时必须返回其原source token和生成版本，不能贴上新时间冒充当前；无法证明当前完整性时显示“核对中/暂不可确认”。导出绑定projection ID、source manifest digest、生成时间和访问角色，来源变化后生成新导出；学生输出继续排除conversion、最终成绩、等级和排名。〔§14.6/14.7；§15.8；AT-15。〕

### 14.15 故障恢复与可观测边界

**D-ENG-15（恢复判据）。** 崩溃恢复只依据已提交命令收据、snapshot/measurement事实、current pointer、outbox状态和追加审计判断：收据存在且原子集完整时重放原结果；收据不存在或原子集不完整时不得猜测成功，先按Owner一致性检查恢复/告警。外部OCR完成但D事务未提交时只可重新构造草稿候选；已提交教师决定或正式事实绝不由provider回调覆盖。outbox重复投递以事件ID去重，不把通知成功当业务提交成功。〔§14.4/14.7；AT-15/17。〕

**D-ENG-16（有限证据与未执行项）。** 本增量的确定性模型只覆盖命令重放/digest冲突、前驱冲突、OCR陈旧回调、名单/耐力原子失败、完成状态及投影完整性/token漂移等固定场景；它不证明真实数据库锁序、跨Owner提交、500行容量、OCR准确率、媒体安全、权限、恢复、并发或产品性能。DDL、Contract、Migration、真实数据及同批Z-E均未执行；四项PENDING和canonical UNKNOWN不因模型通过关闭。〔§14.1～14.15；手册§4/9；AT-15/17。〕

正例：同一名单发布command在原事务成功后重试，返回同一snapshot/finding；综合名单准备含完整成员清单且全部token在提交点未变，才可发布新projection。反例：同command改变行集合、旧OCR覆盖教师决定、耐力三行中一行失败仍提交两行、两个截断列表一起漏人、来源读取失败被当空集合，均必须拒绝且不得产生部分current结果。

## 15. F：治理、学生数据边界与系统模式

<a id="p4h-f-governance"></a>

### 15.1 模块边界

统一运动模板及 AI/OCR 技术治理是总管理员专属 Application 能力，但不建立可直查全库的通用 `admin` Repository。模板规则事实由课程规则 Owner 提供，服务配置/运行状态由专门治理组件拥有，教学结果仍由 B、D 及各业务 Owner 拥有。`system-mode` 继续唯一拥有 NORMAL/MAINTENANCE 与 transition 历史。

### 15.2 统一运动模板闭集

`UnifiedExerciseTemplateRevision` 是只追加版本，包含业务规则版本、发布人/时间、状态和下列闭集参数：

| 参数 | 当前允许值 |
|---|---|
| 两类总目标 | 固定 `1200` 分钟；教师发布前分配两类非负目标且合计 1200 |
| 单次起算门槛 | `30 / 45 / 60` 分钟；默认 30 |
| 达标后计算 | 实际 ACTIVE 秒向下取整为分钟 |
| 单次可计上限 | 固定 60 分钟 |
| 每日记录名额 | 每名学生最多 1 条有效计入结果 |
| 每周记录名额 | `2 / 3 / 4`；默认 3 |
| 一次补证窗口 | 总窗口 `24 / 72` 小时；正常流程至多一次 |
| 游泳首次/续传/离线 | 服务器受理 15 分钟、锁定同批续传 30 分钟、完全离线异常 24 小时 |
| 收尾 | 常规截止后固定七天；截止前 14 天提醒，不改变日/周上限 |

总管理员只能发布符合该闭集的版本，不能输入脚本、自由公式、任意加时、新原因分类或新阈值。教师只能在发布课程前选择允许项并通过可完成性检查；Course 保存精确 template/rule revision，发布后规则、目标和日程锁定。新模板只影响后来发布的 Course，不追溯重算旧 Course 或历史。改变闭集必须先有新的业务决定，不能把数据库配置当业务授权。

### 15.3 AI/OCR 技术服务治理

`GovernedTechnicalServiceRevision` 以 `VLM_REVIEW / ROSTER_OCR / ENDURANCE_OCR` 区分服务用途，保存服务连接的非敏感标识、provider/model/version、适用组织/业务范围、启用状态、策略版本、secret reference、发布人/时间和 revision。Secret 值不返回客户端、不进普通日志/审计，也不随任务复制。

`TechnicalServiceRunStatus` 只表达技术可用性、最近真实探测、待处理/失败数量、最久等待和采样窗口；缺数据为 `UNKNOWN/UNAVAILABLE`，不能显示 0 或“健康”。模型正确率、误放、异常召回、OCR 错误率和教师待办量只能来自本校真实样本、绑定样本版本和评估时间窗；模型自报置信度不是正确率。

服务治理不改变教学权限：

- 只有总管理员可配置服务、发布 revision 和选择启停范围；分管理员的八项权限、“全局规则”或“系统模式”权限均不能间接获得；
- 管理员只看脱敏技术状态和汇总，不查看原始学生媒体作判断，不选择 B 的教师原因；
- VLM 只在硬规则通过后执行，OCR 只产草稿；技术失败进入独立状态、有限重试，不能默认通过或判学生违规；
- task 必须绑定 input digest、材料/草稿版本、service revision 和策略版本；迟到或重复结果不得覆盖教师决定、新材料或新草稿；
- 配置、启停、人工模式、任务结果、重试终止和恢复全部追加系统/操作者审计。

### 15.4 人工模式

`ManualModeWindow` 是版本化事实，至少包含 service purpose、organization/course 可选范围、原因、开始/结束服务器时间、启停操作者、source revision 和当前状态。相同 command 幂等；开始必须明确范围，结束只影响尚未终局的任务。

人工模式只把已经通过确定性硬校验、但因 AI 不可用或待验证而无法得出结果的材料，路由到对应课程责任教师。它不允许管理员代审、不产生跨教师接管、不让 OCR 草稿跳过教师确认，也不自动通过。服务恢复后只继续处理尚未判定的任务；已由教师完成的 Case/草稿结果不重审、不覆盖。

<a id="p4h-f-maintenance"></a>

### 15.5 `P4H.F.MaintenancePauseFact`

该事实由 `system-mode` 根据服务器确认的 transition 唯一形成，供 B、C 与 G2 引用，不由任何计时器复制定义。最小结构为：

```text
maintenanceIntervalId
organizationId
enteredByTransitionId + pausedAt
returnedByTransitionId? + resumedAt?
isOpen
sourceRevision
```

规则与约束：

1. `pausedAt` 只能取成功 `NORMAL → MAINTENANCE` transition 的数据库时间；`resumedAt` 只能取之后成功 `MAINTENANCE → NORMAL` transition 的数据库时间。
2. 预计恢复时间只属于公告展示，不是 `resumedAt`，不能自动关闭区间或推进计时。
3. 每组织至多一个 open interval；transition ID 唯一，source revision 单调；重复请求/事件不重复创建区间。
4. closed interval 满足 `resumedAt > pausedAt`；非法、失败或目标模式不变的切换不产生 PauseFact。
5. 读取能力按组织/时间范围返回规范化、不重叠的实际区间及 source revision；若当前维护开放，区间右端为空。消费者保存所用 revision，提交前漂移必须重算或拒绝。
6. B 的学生 Timer 和教师 SLA 只扣除实际维护区间并在恢复后续计剩余量；不重开完整窗口、不补扣维护期。G2 只能迁移/恢复这些来源事实和版本，不能重置、合并成预计时间或另建计算器。

非维护平台故障调整是单独的经确认事实；B 在计算时与 MaintenancePauseFact 取区间并集去重。个人离线不进入任一平台不可用事实。错误逾期后才确认故障的补救仍受 `P-20260904-04` 阻塞。

### 15.6 教师维护公告边界

只有服务器明确返回 `MAINTENANCE`，教师端才进入维护页，并只展示中英文维护公告和预计恢复时间。教师不能进入教学页面、审核、名单/OCR、结算、本人改密、密码找回或其他教师端动作；旧页面、缓存、本机时间和重复请求都不能绕过。

切回 NORMAL 后，客户端重新获取当前 mode/version 和最新业务事实再恢复入口。通知送达/已读、预计恢复时间到达、网络错误或本地倒计时结束都不能代表系统已恢复。管理员本人改密及明确允许的安全治理能力不把权限扩展给教师。

### 15.7 最终成绩备注差异

V8.1 权威业务要求：责任教师发布 signed `INT` 最终成绩，**不设置备注，也不通过其他字段变相保存备注**。打卡审核的固定公开原因/公开补充说明和耐力换算规则行备注是另外两个概念，继续保留，不得混用。

旧 Phase 3 与当前 `1.2.0-contract` 仍把 `FinalGradePublication.remark` / `PublishFinalGradeRequest.remark` 定为可空、最多 50 字，并向学生暴露最终成绩读取。这是 [GAP-H13](#p4h-g3-contract-gaps)，不是本文可静默改写的字段。后续处理必须同时满足：新 V8.1 写入不创建成绩备注；历史 publication/审计不得物理删除；历史备注对何种教师治理读取可见须由 Contract/迁移设计明确；学生任何出口都不得取得最终成绩或历史备注。

<a id="p4h-f-student-data"></a>

### 15.8 学生分数隐藏的全部读取/输出出口

学生仅可读取本人的原始耐力项目、整数秒/展示用时、测试日期或免测状态，以及运动目标、实际计入、剩余量和公开原因。最终成绩、耐力换算分、等级、排名及含这些值的成绩备注在所有出口一律禁止：

| 出口 | 必须保护 |
|---|---|
| Backend student query/read model | 学生专用 projection 从 schema 源头不含 grade/score/level/rank/conversion/grade remark；不能先取完整内部对象再靠 UI 隐藏 |
| 学生 dashboard、课程详情、进度、记录、耐力、结算页 | 只显示允许的原始事实和分钟分列；空态/错误态也不得回退旧成绩模型 |
| API serialization、Graph/聚合响应、分页与搜索 | 按 ActorContext 和资源范围 fail closed；字段、嵌套对象、排序键和筛选条件都不得泄漏 |
| 站内通知、未读摘要、目标路由与深链 | 创建和读取双重过滤；包含分数语义的整条消息拒绝，不做可能误导的局部涂抹 |
| 导出、下载、报表、打印与分享 | 学生导出只含本人允许事实；教师内部报表不得通过可猜 URL 或转发 token 变成学生出口 |
| 本地数据库、缓存、离线快照、状态恢复与备份 | 不持久化禁止字段；升级时清除旧学生成绩缓存，缓存失败不得回退遗留 workspace |
| 日志、崩溃报告、分析、埋点和可观测性 | 不把值、字段名组合、通知正文或排名作为事件属性；仅保留非敏感技术结果 |
| Mock、fixture、预览、演示与测试快照 | 正式构建不可注入学生成绩；测试数据也验证 schema 不含禁止字段 |

权限必须在 Backend/Contract adapter 最终执行，客户端防护是第二道边界而不是授权来源。当前 Contract 的 `getOwnFinalGrade`、`StudentDashboard.finalGrade` 和学生 `EnduranceOutcome.conversion` 均须进入 G3；仅在页面 CSS 隐藏不合格。

### 15.9 已取消有限授权

`BD-20260904-02 / ACCEPTED` 已取消学期中删除责任教师、删除后有限审核授权、跨教师接管入口、接管待办和到期/撤销流程。P4-H 不设计 `LimitedReviewGrant`、接管 scope、临时 Reviewer 或管理员代审能力；技术故障、教师 SLA 超时、课程关闭也不能恢复它。

既有 Course 的责任教师完成本学期教学与结算后才进入普通账号治理；删除账号不转移 Course 责任，历史 opaque subject、课程、判断和成绩保留。旧 UI/API 若仍有接管入口必须拒绝/移除，但不存在一个需要保留的新授权状态机。

### 15.10 AT-18：学生旧出口

正例：使用学生身份依次访问旧页面、API、dashboard、通知、导出、深链和离线缓存，只得到本人允许的原始用时/日期/免测/分钟事实；schema 中不存在最终成绩、换算分、等级、排名或成绩备注，旧缓存升级后被清除。

反例：API 仍返回 `finalGrade` 但 UI 不渲染；通知藏有“85 points”；导出含换算等级；本地旧 workspace 可离线查看；用空 remark 代替移除成绩对象。均不合格。

### 15.11 AT-28：服务治理与管理员边界

正例：总管理员发布合法模板、切换指定服务范围/人工模式并留下审计；分管理员即使有“全局规则”也不能配置服务；管理员看技术汇总但不能代审；教师在自己课程接收人工待办并作教学判断。

反例：把服务配置下放分管理员；管理员查看原图并点击通过；AI 故障默认通过；OCR 直接写正式名单/用时；恢复服务后覆盖教师结果；动作无版本/操作者/时间。均禁止。

### 15.12 服务配置命令、版本与运行证据

**F-ENG-01（治理命令收据）。** `GovernedServiceCommandReceipt`是治理组件内部逻辑记录，按service purpose与规范化组织/业务scope绑定command、actor、角色、完整稳定请求、expected service/current revision及原结果。请求身份在可信服务端边界由purpose、scope、provider/model非敏感标识、策略版本、secret reference身份和目标启用状态规范化派生，不信任调用方自报digest；权限检查先于原结果读取。同一actor/scope/command只有完整请求相同才返回原revision，内容变化返回冲突，不回显secret、不重新探测服务。它不是Contract类型。〔§15.1/15.3；AT-28。〕

**F-ENG-02（发布原子集）。** 新服务revision只允许总管理员在expected current revision仍匹配时发布；purpose闭集、scope归属、provider/model标识、策略与secret reference必须完整，secret明文、连接凭据、学生材料和自由脚本一律拒绝进入请求快照、普通审计或outbox。Owner内事务原子追加不可变revision、移动current pointer、保存命令原结果及脱敏AuditEvent/outbox；失败不留下半个revision或指针。旧task继续绑定原service/policy/input版本，不因current pointer变化被重贴新配置。〔§15.3；模块边界。〕

**F-ENG-03（状态快照不是健康推断）。** `TechnicalServiceRunStatusSnapshot`固定purpose/scope、采样窗口、最后成功探测、输入任务总量、终局/待处理/失败分列、来源revision、数据完整性和生成时点。来源不全、窗口不一致或指标读取失败时整体标`UNKNOWN/UNAVAILABLE`，不得以空列表、0或最近一次成功冒充当前健康。正确率/召回/OCR错误率另绑定本校样本集身份、标注版本和评估窗口；服务自报置信度、管理员查看数或教师待办量不能替代。普通状态出口只返回脱敏聚合，不含secret、prompt、原媒体、学生标识或教学判断。〔§15.3；GAP-H21。〕

### 15.13 人工模式的范围、任务切换与迟到结果

**F-ENG-04（人工模式窗口）。** `ManualModeCommandReceipt`按purpose及规范化scope绑定command、actor、expected source revision、动作`OPEN/CLOSE`、原因和原窗口结果。每个purpose/scope至多一个open窗口；OPEN使用服务器提交时点，CLOSE只能关闭所引用的当前窗口并追加结束事实，重复完整命令返回原结果，换scope/动作/原因冲突。权限、scope和前驱在写入前重验，原子写窗口、source revision、审计与outbox；失败或no-op不产生窗口。〔§15.4；AT-28。〕

**F-ENG-05（任务归属保护）。** 进入人工模式只为已经通过确定性硬校验且尚未终局的task创建责任教师人工待办，绑定task/attempt、input digest、材料或草稿版本、service/policy revision和manual window revision；管理员、分管理员和非责任教师不能取得教学决定能力。AI/OCR晚到结果必须逐项核对这些身份与current decision revision；窗口结束或服务恢复仅影响尚未判定task，任何教师终局后回调都记为陈旧技术结果而不覆盖、不重开、不重复通知。〔§15.3～15.4；B/D任务边界。〕

### 15.14 系统模式transition与维护区间发布

**F-ENG-06（模式命令身份）。** `SystemModeTransitionReceipt`由`system-mode`拥有，绑定organization、command、actor/权限、from/to、expected mode/source revision、公告的非敏感展示字段及原transition结果；服务端从完整稳定请求派生身份。权限先验，同command完整相同才重放；更改组织、目标模式、前驱或公告内容冲突。预计恢复时间只随公告版本保存，不参与`resumedAt`或计时事实。〔§15.5～15.6。〕

**F-ENG-07（transition原子集）。** `NORMAL → MAINTENANCE`在同一Owner事务以数据库提交时点写transition、创建唯一open `MaintenancePauseFact`、递增source revision、更新current mode/pointer、命令收据、审计和outbox；已有open区间、前驱漂移或任一步失败均无部分写。`MAINTENANCE → NORMAL`锁定当前open区间，以严格晚于`pausedAt`的提交时点追加关闭transition和`resumedAt`，关闭同一interval并递增revision；找不到唯一open区间、目标模式未变或重复不同命令均拒绝。历史transition与closed interval只追加，不覆盖。〔§15.5。〕

**F-ENG-08（规范化读取清单）。** 维护读取返回organization、查询范围、完整有序interval清单、是否含唯一open项、source revision和完整性见证；closed项满足`resumedAt>pausedAt`，按开始时点稳定排序且不得重叠。读取失败、重复transition、多个open、倒序/重叠或分页不完整时fail closed并报告来源异常，消费者不得自行去重后继续。规范化只验证/合并同一事实的重复投递，不把相邻独立维护、预计时间或非维护故障改写成一个历史区间。〔§15.5；G2-15A～15D。〕

**F-ENG-09（消费guard）。** B等消费者以原业务窗口、MaintenancePauseFact清单/revision及已确认非维护故障调整分别准备区间并计算并集；提交Timer/SLA结果前重新校验相同source revision，漂移则重算或拒绝。恢复后从原窗口剩余量续计，不新开完整窗口、不把维护期间算作可用时间，也不把个人离线变成平台故障。错误逾期后才确认故障的补救仍为`P-20260904-04 / BLOCKED_R3`，本增量不撤销或重写终局。〔§7.2～7.5/15.5。〕

### 15.15 学生投影、缓存与全部出口的结构性拒绝

**F-ENG-10（正向白名单投影）。** Backend按ActorContext、学生本人资源范围及用途选择学生专用projection schema，只显式构造项目、整数秒/展示用时、日期/免测、目标、实际计入、剩余量和公开原因；不得先序列化教师/内部完整对象再删除字段。Mapper对嵌套对象、分页、排序/筛选元数据和扩展字段递归执行白名单，出现grade/score/level/rank/conversion/final remark或未知可疑结构即拒绝整个payload并登记Contract/来源不一致，不以null、空串、别名或自由文本掩盖。〔§15.8；AT-18。〕

**F-ENG-11（缓存身份与升级清除）。** 学生缓存键必须包含opaque actor subject、资源scope、projection schema version和source revision；缓存内容仍只能是白名单投影，不能缓存后再依当前角色裁剪。升级发现旧schema、未知workspace、身份切换或清除失败时删除/隔离旧缓存并返回不可用，禁止回退遗留文件、跨账号复用或离线展示旧成绩。服务端权限撤销、source revision变化和登出使相应缓存失效；TTL不是授权。〔§15.8；AT-18。〕

**F-ENG-12（间接出口）。** 通知在创建与读取时双重校验template和ActorContext；含禁止成绩语义的整条学生消息拒绝，不做局部涂抹。导出/下载以不可猜opaque artifact绑定生成者、角色、scope、内容SHA和短期授权，取件时重新鉴权；教师文件不能靠转发URL成为学生出口。深链只定位受保护资源，不携带结果。日志、崩溃报告、分析、审计和outbox只留动作/技术状态/opaque ID，不记录禁止字段、值、通知正文、secret、prompt或原媒体。Mock/fixture必须通过同一schema拒绝检查且不得进入正式构建。〔§15.8；AT-18。〕

### 15.16 取消能力与恢复边界

**F-ENG-13（不存在替代授权）。** 旧`LimitedReviewGrant`、跨教师接管、管理员代审、接管待办及其创建/续期/撤销入口在路由、Use Case和Backend授权三层均必须不存在或明确拒绝；不能更名为临时协作者、故障处理人或课程关闭代理。相同拒绝命令可幂等返回同一拒绝，不产生grant、待办、课程责任迁移或通知。历史判断、opaque actor、课程和审计保留，只读历史不恢复能力。〔§15.9；GAP-H14。〕

**F-ENG-14（恢复不改判）。** 治理/模式恢复先核对不可变revision、command receipt、current pointer、transition/interval序列、task绑定和教师decision revision；缺失或混合恢复点时停止。可重建状态快照和待办projection，但不能重新发出已消费命令、把技术结果改成教学结果、覆盖教师终局、重开人工窗口或用预计恢复时间补造维护结束。真实备份、数据库、媒体、权限和演练由G2/环境工作项另行验证。〔§15.3～15.5；G2-12～15D。〕

### 15.17 F有限模型证据与未执行项

**F-ENG-15。** `WI-0026-H-REMAINING-MODEL-1.0`以固定内存状态验证服务revision/权限/secret拒绝/命令重放、人工模式唯一窗口与迟到结果、维护开闭/前驱/实际区间/revision、学生白名单/旧缓存失败关闭和取消授权拒绝；每个失败用例检查业务状态不变。模型中的权限、时点、Provider、schema与来源保护均为可信桩，不证明真实数据库锁、并发、Secret Manager、AI/OCR、缓存平台、日志管线或安全测试。完整源码、SHA和实际结果随WI交接。

**F-ENG-16。** F工程正文到此逻辑可实现且可检查；P-01/P-03/P-04相关的终局、学校日历及错误逾期补救仍分别`BLOCKED_R3`，GAP-H13仍只登记差异。产品、Contract、数据库、Migration、真实数据、服务探测、权限集成、恢复、部署和性能全部`NOT_EXECUTED`。本节不消费同批Z-G2新增，不宣称其恢复DoD完成。

## 16. G1：客户端分层说明

<a id="p4h-g1-client-layering"></a>

### 16.1 唯一调用链

```text
UI
  ↓ 用户意图 / render state
ViewModel / Presentation
  ↓ application input
Client Use Case
  ↓ domain command/query
Repository Interface
  ↓
Repository Implementation
  ↓
API Adapter / Mapper
  ↓ Request DTO
HTTP Client
  ↓ HTTP request                 ↑ HTTP response
Backend
  ↑ Response DTO
API Adapter / Mapper
  ↑ domain result/error
Repository Implementation → Client Use Case → ViewModel → UI
```

以“加入课程”为例：UI 只发出邀请码确认意图；ViewModel 管理 loading/success/error；Use Case 组合当前身份与加入命令；Repository Interface 声明加入能力；Implementation 调用 Adapter；Adapter 把 domain input 转为当前 Contract Request DTO，再把 Response DTO/Error 映射为 domain result；HTTP Client 只发送；Backend 最终检查邀请、宽限、成员、学期、课程状态和权限。

### 16.2 每层责任

| 层 | 负责 | 禁止 |
|---|---|---|
| UI | 渲染、采集意图、无障碍和平台交互 | 调 HTTP、判断最终权限、解析 DTO |
| ViewModel / Presentation | loading/success/empty/error/forbidden/maintenance/中断恢复，取消过期 UI 请求 | 保存业务 source of truth、计算权威截止/成绩 |
| Client Use Case | 编排单个客户端用户目标，执行客户端可验证前置条件 | 重写 Backend 业务规则、构造假成功 |
| Repository Interface | 以客户端 Domain 类型声明所需能力和错误语义 | 暴露 URL、header、DTO、HTTP status |
| Repository Implementation | 选择远端/受控缓存来源、协调 Adapter、执行缓存策略 | 把缓存当权限、直接向 UI 返回 DTO |
| API Adapter / Mapper | Domain request ↔ Request DTO、Response DTO/error ↔ Domain result 的双向映射；拒绝未知 closed set | 保存业务状态、吞掉未知字段/状态、发明默认值 |
| HTTP Client | method/path/header/body、传输、认证 token 注入和原始网络错误 | 理解课程/审核/计时业务 |
| Backend | 身份、权限、资源范围、状态机、事务、幂等、并发与服务器时间的最终裁决 | 信任客户端计算或客户端声称的成功 |

### 16.3 DTO 边界

Request DTO / Response DTO 只存在于网络 Adapter 一侧。它们可以由固定 Contract 生成，但不能进入 UI state、ViewModel public model、Client Use Case 参数或客户端 Domain Entity。反向请求映射同样必须显式：Domain 不 import generated DTO，Mapper 负责字段、枚举、时间、null 和错误的穷尽转换。

遇到未知 enum、缺失 required、额外不安全字段、不可解析时间或不允许的 role payload 时 fail closed，返回明确“版本/数据暂不可用”，不能映射成第一个枚举、空列表、0、NORMAL 或成功。

### 16.4 Repository Interface 与 Implementation

Interface 位于客户端 application/domain 边界，描述“加入课程”“取得待办”“取得综合名单”等业务能力；Implementation 位于 data/infrastructure，负责调用具体 Adapter、可取消请求和受控缓存。测试可替换 Interface 实现，但 Mock 不能进入正式构建或建立正式业务事实。

一个 Repository Interface 不等于一个 Backend 数据库 Repository。客户端不能因名为 Repository 就跨模块直连表；Backend 模块仍按现有 Owner/Port 规则工作。

<a id="p4h-g1-statistics"></a>

### 16.5 统计、时间与敏感结果映射

- 进度客户端只消费 P4-Z §2.5 `P4Z.A.StatisticsProjection` 的已命名字段、来源版本和未计入原因；不复制选择算法、日/周上限或候选有效性。
- 补证剩余、教师 SLA、维护暂停和恢复只消费 B/F 的服务器投影；客户端本机计时仅做显示刷新，重新连接必须用服务器事实校准。
- 学生端映射执行 [§15.8](#p4h-f-student-data) 的输出拒绝；即使 DTO 误含禁止字段也不得进入 Domain/UI，同时必须报告 Contract 不一致。
- HTTP 200 只表示取得响应；只有合法 DTO 映射为合法 domain result 后才进入 success。写请求重试复用同一 idempotency key，不凭超时判断失败或成功。

### 16.6 Phase 边界

Phase 4 只确定上述依赖方向、数据边界、错误语义和 Owner 引用，状态均为 `NOT EXECUTED`。Phase 5 先用 G3 形成正式新 Contract/RC；Phase 8 才在 Android/Web 中生成 binding、实现 Repository/Adapter、替换 Mock、接入真实 Backend，并执行网络错误、维护、并发、恢复和 E2E 验证。

### 16.7 请求身份、映射结果与过期响应隔离

**G1-ENG-01（依赖方向可检查）。** 客户端构建图必须使UI/ViewModel只依赖application/domain，Use Case只依赖Repository Interface，具体Repository与API Adapter位于data/infrastructure，generated DTO只在Adapter编译边界可见。任何UI/ViewModel/domain对HTTP client、URL、status或generated DTO的直接import均为构建检查失败；同名Repository不得被误当Backend数据库访问。〔§16.1～16.4。〕

**G1-ENG-02（写请求身份）。** Use Case首次发起写意图时生成/取得稳定command identity，并将ActorContext、资源scope、domain payload和expected revision交Repository；Repository重试、网络恢复或进程内重建必须复用同一identity与完整domain语义。Adapter只映射到已确认Contract字段，不按重试次数改请求、不以新key隐藏不确定结果。超时后先查询/重放原命令；不同内容复用key必须映射为冲突，不能展示假成功。〔§16.2/16.5；B/D/E命令边界。〕

**G1-ENG-03（响应映射闭集）。** Adapter先验证HTTP与payload结构，再穷尽映射required/null、closed enum、服务器时间、版本、原结果和业务错误；HTTP 200但缺required、未知closed set、角色不允许字段或敏感嵌套时返回明确版本/安全错误并阻止缓存/UI。未知错误不得降级为成功、空集合、0、NORMAL或第一个枚举；可扩展字段只有在Contract明确开放且不影响安全/语义时才能忽略。〔§16.2～16.5。〕

**G1-ENG-04（过期响应）。** ViewModel为每个用户意图维护generation/资源身份；切换账号、课程、筛选或新请求后，旧响应即使成功也不得覆盖当前state。取消只停止客户端等待，不代表Backend事务回滚；迟到写响应仍按command identity查询原结果。维护、forbidden、版本漂移、离线和普通网络错误是不同domain状态，只有服务器mode/version证明MAINTENANCE，客户端倒计时或网络失败不能伪造。〔§15.6/16.2。〕

### 16.8 缓存、测试替身与工程验收

**G1-ENG-05（受控缓存）。** Repository缓存项绑定opaque actor、资源scope、domain schema version、source revision、内容SHA和获取时服务器状态；命中仍经当前ActorContext与白名单校验。写命令、权限判断、当前mode、Timer/SLA和结算资格不得由缓存最终裁决。来源版本漂移、身份切换、未知schema或敏感清除失败时fail closed；离线只显示明确允许且带陈旧标记的非敏感历史，不制造current成功。〔§15.8/16.4～16.5。〕

**G1-ENG-06（测试矩阵）。** Phase 8实现前冻结以下验收入口：每个Adapter的合法/缺字段/未知enum/额外敏感字段/时间异常/业务错误fixture；同command丢响应重放与不同内容冲突；旧响应隔离；账号/课程切换清缓存；维护与网络错误分离；学生payload递归无禁止字段。Mock只实现Repository Interface并以测试构建注入，正式构建图发现Mock/fixture、直连HTTP或generated DTO越层即失败。当前只设计这些检查，未运行Android/Web/Backend或E2E。

**G1-ENG-07。** G1工程DoD只冻结层次、映射、缓存、并发显示与测试入口，不选择Contract候选、不生成binding、不修改Android/Web。真实compile、静态依赖、fixture、网络、进程恢复、无障碍和E2E均`NOT_EXECUTED`；同批Z-G2不成为本节输入。

## 17. G3：Contract 缺口清单

<a id="p4h-g3-contract-gaps"></a>

### 17.1 清单性质与分级

本节是 ISS-006 的唯一 P4-H 汇总位置，只记录现有 `1.2.0-contract / RC / 667ae751…81597d74a` 与 V8.1 设计之间的能力差异，不新增 endpoint、DTO 字段、error code 或 wire enum。Phase 5 Contract Owner 必须逐项决定正式表达，并发布新 Version/SHA；设计名不得直接成为 wire。

分类含义：

- **阻塞 Phase 5**：上游业务或设计决定仍不精确，受影响 Contract 不得起草为确定语义；
- **阻塞 Phase 6**：已有独立 Contract 缺陷必须在 Backend foundation 前接受并发布；
- **可随新 RC 处理**：业务/Phase 4 边界已足够清楚，可由 Phase 5 在同一新 RC 中设计，但新 RC 未发布前不得进入对应 Phase 6/8 实现；
- **非 Contract 问题**：现 Contract 无需新增业务能力，主要是移除旧 UI/实现、运行治理、迁移或验证工作。

优先级 `P0` 表示权限、数据泄露、状态/事务或阶段门禁；`P1` 表示完整业务闭环；`P2` 表示运行证据或非阻塞可观测性。

### 17.2 Phase 2 Web 缺口对照

| Web Phase 2 记录 | 本清单位置 |
|---|---|
| 教师退回补证只展示、不写入 | GAP-H02、GAP-H04 |
| 六类原因与独立公开说明不完整 | GAP-H03 |
| 系统“补证逾期”无正式原因码 | GAP-H03 |
| 中间审核阶段仅展示词表 | GAP-H02 |
| 维护剩余秒/暂停区间缺失 | GAP-H05 |
| 正式补证包不可写 | GAP-H04 |
| 锁定批次续传、教师 SLA 不可用 | GAP-H04、GAP-H05 |

这七项来自 [Web V8.1 Phase 2 交接](../../rebuild/handoffs/2026-09-05-web-v81-align.md) §“业务有、合同 1.2.0 没有（或不够）”；该交接已正确撤回非正式写入，不能把 UI 草稿当已支持的 Contract。

### 17.3 主缺口清单

| ID | 缺口/当前证据 | 权威来源 | 影响消费者 | 优先级 | 分类 |
|---|---|---|---|---|---|
| GAP-H01 | `ExerciseRecord.creditedMinutes` 仍是旧 `0/60/120`，缺实际整分钟、门槛/日周最优组合、规则版本、三分列及 source token | P4-Z A；总流程 §8、§11.3；AT-09～14 | Backend、Android、Web、统计/结算 | P0 | 可随新 RC 处理 |
| GAP-H02 | Review 只有 `VALID/INVALID` 和追加判断，缺系统检查、AI、技术处理、教师待办、待补证、自动逾期等阶段及 task/round/version | 本稿 §3～5；Web Phase 2；AT-01～04 | Backend、教师 Web、Android、学生 Web | P0 | 可随新 RC 处理 |
| GAP-H03 | 教师六类原因不是 closed set，公开补充说明未独立；系统“补证逾期”无独立代码/actor | 本稿 §8；总流程 §12.2～12.3；Web Phase 2 | Backend、两端 UI、通知、审计 | P0 | 可随新 RC 处理 |
| GAP-H04 | 运动材料仍缺正式 material version、每版上限/阶段、一次补证写入、锁定同批续传、受理事实和 15/30/24 游泳语义 | P4-Z C；学生 §7.5～7.7；Web Phase 2；AT-04～08、19～21 | Backend、媒体服务、Android、学生/教师 Web | P0 | 可随新 RC 处理 |
| GAP-H05 | SystemMode 只有当前模式/transition，缺 `MaintenancePauseFact`、学生 remaining/effective due、逐轮教师 SLA、暂停来源版本与 blocker 投影 | 本稿 §7、§15.5；管理员 §13.5；Web Phase 2 | Backend worker、Android、Web、结算、G2 | P0 | 可随新 RC 处理 |
| GAP-H06 | 缺统一运动模板 revision、闭集选择、Course rule version 锁定和可完成性结果 | 本稿 §15.2；管理员 §19.2；AT-22 | Backend、教师/管理员 Web、统计 | P1 | 可随新 RC 处理 |
| GAP-H07 | 邀请仅由绝对 `expiresAt` 表达，缺 5～120 分钟选择、到期前流程登记、一次 10 分钟宽限及其终止原因；精确谓词为 `registeredAt < expiresAt` 且 `acceptedAt < expiresAt + 10m`，恰好端点拒绝 | P4-Z v8 E-01～03/E-AT16；总流程 §9.4；AT-16 | Backend、Android、学生/教师 Web | P0 | 可随新 RC 处理 |
| GAP-H08 | Roster 只支持 XLSX/CSV 正式导入，缺纸质扫描、OCR draft/row issue、教师确认、部分/完成状态及综合名单版本 | 本稿 §14.2、§14.5～14.6；总流程 §10；AT-15 | Backend、教师 Web、报表/结算 | P1 | 可随新 RC 处理 |
| GAP-H09 | 现有 `confirmEnduranceMeasurement` 可确认单条，但缺手写/OCR batch、草稿、`4.30` 阻断、选中行原子确认和 batch status | 本稿 §14.3～14.5；教师 §11.1；AT-17 | Backend、教师 Web、OCR adapter | P1 | 可随新 RC 处理 |
| GAP-H10 | 缺总管理员 AI/OCR service revision、脱敏状态、scope、人工模式和 task/config version 管理能力 | 本稿 §15.3～15.4；管理员 §19.1、§19.3；AT-28 | Backend、管理员/教师 Web、AI/OCR worker | P0 | 可随新 RC 处理 |
| GAP-H11 | Course close 现有 operation 未表达“只阻止新起点”、既有链继续、结算 blocker、`SettlementVersion`、纠错新版报告和 source guards | P4-Z E；总流程 §17、§21；AT-23～25 | Backend、教师/管理员 Web、Android 历史入口 | P0 | 可随新 RC 处理 |
| GAP-H12 | Contract 仍有学生 `getOwnFinalGrade`、`StudentDashboard.finalGrade`，且学生 `EnduranceOutcome` 可嵌 conversion；与所有学生出口禁分数/等级/排名冲突 | 本稿 §15.8；总流程 §13、§15；AT-18 | 学生隐私、Backend、Android、学生 Web、通知/导出 | P0 | 可随新 RC 处理 |
| GAP-H13 | FinalGrade request/response 仍 required nullable `remark maxLength:50`，V8.1 明确新最终成绩无备注；历史 remark 保留/可见边界未定 | 本稿 §15.7；`BD-20260904-02`；当前 OpenAPI FinalGrade schema | Contract、grading、数据库迁移、教师 Web | P0 | 阻塞 Phase 5 |
| GAP-H14 | 旧“有限审核授权/接管”已取消；当前 catalog 未发现专用接管 operation，不应为 AT-26/27 补 Contract | `BD-20260904-02`；本稿 §15.9 | 旧 Web/Backend 代码、授权测试、文档 | P0 | 非 Contract 问题 |
| GAP-H15 | 学校工作日日历及日内边界未定，不能把两个学校工作日编码为 `48h` 或普通工作周 | `P-20260904-03`；本稿 §7.3 | Contract 时间投影、Backend SLA、教师 Web | P0 | 阻塞 Phase 5 |
| GAP-H16 | 普通首次材料最晚时点及跨收尾/成员移出受理边界未定 | `P-20260904-02`；P4-Z C/E | Contract、Backend、Android、学生 Web | P0 | 阻塞 Phase 5 |
| GAP-H17 | 六类均不适用、补证后仍只有疑虑时的终局标准未定 | `P-20260904-01`；本稿 §1.3 | Contract reason/action、Backend、教师 Web | P0 | 阻塞 Phase 5 |
| GAP-H18 | 错误逾期写入后才确认非维护故障的补救未定 | `P-20260904-04`；本稿 §7.5、§15.5 | Contract correction、Backend worker、审计/通知 | P0 | 阻塞 Phase 5 |
| GAP-H19 | **已关闭的设计精度项：** Z/E 已确认 `acceptedAt < expiresAt + 10m`，恰好端点拒绝；剩余工作并入 GAP-H07 的新 RC 表达与测试 | P4-Z v8 E-02A/E-AT16；本稿 §12.3 finding 6 | Contract、Backend、两端邀请 UI | P1 | 可随新 RC 处理 |
| GAP-H20 | 三组 `oneOf` discriminator 缺 explicit mapping，生成器得到与 wire 不同的 literal | CR-20260901-005 | Android、Web、Backend codegen/adapter | P0 | 阻塞 Phase 6 |
| GAP-H21 | AI/OCR 正确率、误放/召回、真实错误样本、重试/恢复和性能尚无运行证据 | 管理员 §19.3；本稿 §15.3 | 运维、模型评估、Phase 7/8 验收 | P2 | 非 Contract 问题 |

### 17.4 CR-005 独立性

`CR-20260901-005` 保持 `PROPOSED / BLOCKING` 独立条目，只为现有 student application、endurance rule change、system mode 三组 discriminator 增加 explicit mapping；不新增业务值、字段或 operation。它不能与 GAP-H01～H19 合并成“V8.1 已解决”，也不能因手写客户端 Adapter 暂时可用而关闭。接受后必须发布不同 Version/SHA，并由 Android、Web、Backend 对三组 wire round-trip 共同复验。

### 17.5 AT-26 / AT-27 作废依据

AT-26“责任教师失效后有限接管”和 AT-27“授权到期/撤销/待办清空”来自 2026-09-04 较早的 teacher-first 方案。随后 `BD-20260904-02 / ACCEPTED` 明确责任教师完成本学期教学、取消学期中删除及删除后接管；当前四份业务正文已同步删除有限授权、入口、权限与待办。因此：

- AT-26、AT-27 不再是 V8.1 实现验收条件，不能据此创建 Contract schema/operation；
- 需保留的回归是“旧入口/请求被拒绝、无跨教师/管理员代审、历史不删除”，归 GAP-H14 的实现与授权测试；
- 作废不删除旧交接历史，也不表示旧产品能力已迁移或清理。

### 17.6 Phase 5 输入与停止条件

Phase 5 可先处理“可随新 RC 处理”的差异，但在 GAP-H13、H15～H18 的 Owner 决策前不得把受影响语义定稿。GAP-H19 已由 Z/E 关闭精度问题并并入 GAP-H07，不再作为第五项业务 PENDING。CR-005 必须独立接受；新 RC 必须给出全新完整 SHA，并在 Phase 6/8 只按该 SHA 生成/实现。任何需要发明业务原因、日历或历史 remark 处置的情况都应停止并回到相应 Owner。

### 17.7 缺口账本身份与阶段门禁

**G3-ENG-01（账本行）。** 每个GAP行必须固定gap ID、语义摘要、定义Owner/消费Owner、精确来源版本或完整SHA、受影响operation/schema能力、优先级、阻塞阶段、依赖决定、当前状态和关闭证据。行可追加状态历史但不得复用ID或以改标题覆盖旧结论；同一缺口跨客户端/Backend只保留一行和多个消费者。本文设计名、候选字段和示例错误均不是wire承诺。〔§17.1～17.3。〕

**G3-ENG-02（Contract身份三分）。** G3同时登记仓库设计RC `1.2.0-contract / 667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a`与控制面两个不同的`4.0.1-contract`候选SHA `72174317df23f7030b74a2957f8e75ec669e872e18d39d06e060c95b61f6a7be`、`31f6d3b4d45503f8b4bcb93a83565e1cb957ad4352c036dcde018e15466233ae`；三者用途和证据分开，canonical保持`UNKNOWN`。名称、operation数量或较新时间不能选赢家；Phase 5输入必须由Contract Owner发布唯一新Version+SHA及分发清单。〔根AGENTS；控制面contracts。〕

**G3-ENG-03（可执行与R3分组）。** GAP-H01～H12、H19中已有设计语义的部分可交Contract Owner起草候选，但发布前仍需统一新RC；GAP-H13、H15～H18分别绑定最终成绩备注与P-03/P-02/P-01/P-04，保持`BLOCKED_R3`且不得写确定wire。GAP-H14、H21保持非Contract实现/运行项；GAP-H20作为CR-005独立阻塞Phase 6，不与V8.1新增能力互相冒充关闭。部分可起草不等于Phase 5已解锁。〔§17.3～17.6。〕

### 17.8 Contract Owner交接与关闭证据

**G3-ENG-04。** Contract Owner收到的输入必须包含本清单版本/SHA、追溯矩阵版本/SHA、每个gap的Owner决定状态、三个Contract身份和NOT_EXECUTED清单。对可执行行逐项给出正式operation/schema/error/wire映射或明确不需要Contract变化的理由；对R3行保持占位阻塞而不猜值。发布物须有唯一未复用Version、canonical OpenAPI完整SHA、release/distribution manifest及source commit，不能只回传文件名或“4.0.1”。〔§17.1/17.6；GAP-H20。〕

**G3-ENG-05。** H/Z只在收到唯一发布身份后做只读核验：OpenAPI、release manifest、distribution snapshot字节一致，gap处置表无遗漏，Android/Web/Backend消费目标都指向同一SHA；实际生成、round-trip、未知值拒绝和E2E分别留给Phase 6/8执行证据。任一manifest不一致、同名异SHA、漏gap或R3未决被默认化即拒绝交接。G3只能把行标为`DESIGNED/VERIFIED`，不得把未运行检查标`EXECUTED`。

**G3-ENG-06。** 当前H剩余包完成的是缺口账本工程身份和停止条件；没有修改Contract、选择canonical、关闭GAP-H13/H15～H18或接受CR-005。队列18仍等待Contract Owner，队列03/07/09/12/14及相应Z消费项仍等待正式业务决定。Phase 4保持`IN_PROGRESS`，Phase 5保持`LOCKED`，最终门禁只能由负责人确认。

## 18. P4-H 整包交付与 Z 审核入口

<a id="p4h-package-report"></a>

### 18.1 Reviewer 建议顺序

周润基可按依赖顺序审核，避免来回：

1. B：§2～10，重点核对 `EffectiveCandidate`、材料版本、计时与 E 结算 source guard；
2. D：§14，重点核对综合名单是否只引用 P4-Z A/E，不复制统计/结算；
3. F：§15，重点核对 MaintenancePauseFact 是否满足 C/G2 且不重置计时；
4. G1：§16，核对客户端只消费 P4-Z §2.5，不再写算法；
5. G3：§17，核对 P4-Z §6 的影响项是否都被归集、分类是否需要调整；
6. 最后只回复具体 Finding，Owner 定向修改对应段落及直接引用，不重跑已稳定的 B 全量检查。

### 18.2 当前交付状态

| 项目 | 状态 |
|---|---|
| P4-H/B | ACCEPTED（本批次设计）；AT-01～08 已映射 |
| P4-H/D | ACCEPTED（本批次设计）；AT-15/17 已映射 |
| P4-H/F | ACCEPTED（本批次设计）；AT-18/28 已映射 |
| P4-H/G1 | ACCEPTED（本批次设计）；分层与双向 DTO 映射边界已明确 |
| P4-H/G3 | ACCEPTED（本批次设计）；ISS-006、Web 缺口、CR-005、AT-26/27 作废与 remark 差异已归集 |
| P4-Z v10 / 被接受 v9 | Z v10 `8eb159dd…aafe` 已登记接受；八项引用 8 确认 / 0 不一致 / 0 待补，ISS-019/020/021 已在 Z 闭合回执中关闭 |
| P4-Z/G2 独立文件 | ACCEPTED / REVIEWED；当前登记版 `7618a69a…1f62`，内容评审版 `55b04e2c…e6d4` 的 G2-10/12～15D 无 P0/P1 不一致 finding，执行前证据清单仍开放 |
| 联合增量汇总 | H 侧 REVIEWED / CONFIRMED；`8ff37739…567c` 的 J-01～J-13 无 P0/P1 finding，等待 Z 吸收本稿新 SHA 与正式 Handoff/STATUS 引用 |
| 产品/Contract/数据库/Migration/AI/客户端接入 | NOT EXECUTED |
| Phase 4 / Phase 5 | IN_PROGRESS / LOCKED |

### 18.3 联合 Handoff 引用规则

正式 [Phase 4 Handoff](../../rebuild/handoffs/new-req-phase-4.md) 引用 P4-Z v10 `8eb159dd…aafe` 及其 §9 报告、G2 接受登记版 `7618a69a…1f62`、联合汇总 `8ff37739…567c`，同时引用本稿本节和最终文件 SHA；不复制双方定义形成第三份真相。ISS-019/020/021 已关闭，当前仍因四项 PENDING、工程/追溯 DoD 和 Contract 门禁保持 `PARTIAL / Phase 4 IN_PROGRESS / Phase 5 LOCKED`。只有剩余条件完成后，负责人才能判断 Phase 4 是否进入 `READY_FOR_HANDOFF/DONE`。

<a id="p4h-z-v8-feedback-closure"></a>

### 18.4 Z v8 三项反馈处理结果

1. ISS-020：**已整改。** 唯一机会使用 `supplementReturnUsed` 表示教师一次退回动作已成功；版 2 可受理要求该值为 true 且 Timer ACTIVE、无既有受理/终结。未增加第二次机会。
2. ISS-019：**已同步。** 邀请严格使用 `acceptedAt < expiresAt + 10m`，恰好截止拒绝；GAP-H19 不再阻塞 Phase 5，剩余 Contract 工作并入 GAP-H07。
3. ISS-021：**已完成 Review。** G2 精确 SHA `55b04e2c…e6d4` 无 P0/P1 不一致，执行前 B/F 恢复事实清单已在 §12.4 明列。

Z v9/v10 已按本节所列变化位置完成定向复核并关闭 ISS-019/020/021；相关问题不再等待重复答复。后续只需由 Z 吸收联合收尾产物的新 SHA、路径和阶段状态，不重跑 A 的稳定算法样本或重审未变化章节。

<a id="p4h-joint-summary-review"></a>

### 18.5 联合汇总 H 侧 Review 与正式落点确认

评审对象：`p4-design-deltas-v81(1).md` / 93 行 / 14765 bytes / SHA-256 `8ff377393e4a32419ac82570b1aa53fc81895e45f394a58377126ec11340567c`。H 对 J-01～J-13、重点 J-11 的结论为 **确认，无 P0/P1 finding**：

1. J-02 的 Z v10、G2 接受登记版、H 修订版三组版本和 SHA 均与本轮实测一致；联合汇总状态仍为 PRE_DRAFT，H 的本次确认不冒充 Z 已吸收后的最终版本。
2. J-06/07 只导航双方唯一定义，八项跨簇引用、ISS-019/020/021 闭合状态、GAP-H19→H07 和 CR-005 独立门禁均与 H 当前稿一致。
3. J-08～10 保留四项 PENDING、Phase 3 豁免/REQ 追溯缺项和后续 Phase 4 工程工作，没有把设计接受写成产品、数据库或迁移已执行。
4. J-11 所称“未发现仓库内 H 正式稿”只适用于 Z 的隔离工作区；H 侧正式落点已确认是 `docs/architecture/new-requirements/p4-design-huang-v81.md`。B、D、F、G1、G3 全部收敛在这一份文件，原计划的 `p4-client-layering-note.md` 与 `p4-contract-gap-list.md` 不再另建，避免同一定义出现多个正式副本。
5. H 侧按分工生成 `docs/rebuild/handoffs/new-req-phase-4.md` 并更新 `docs/rebuild/STATUS.md`；两者只记录本批次 PARTIAL 交接，不把 Phase 4 标为 DONE，不解锁 Phase 5。

请 Z 后续只核对本节、正式 Handoff/STATUS 以及三者的新 SHA/引用；若联合汇总仅吸收这些交接事实，无需重新评审稳定设计正文。

### 18.6 最终接受与归档登记（2026-09-07）

周润基已明确接受H整包及联合汇总为本批次PARTIAL设计交付，原文和对象见[联合汇总§9](p4-design-deltas-v81.md#9-最终接受登记2026-09-07)。被接受H源附件为998行、88804字节，SHA-256 `cb5f01c61784f002ad43947f52f505653821678ecda7cb50d957b4be3ea5126d`。早期REVIEW_READY或待接受描述是历史状态；本次只同步接受/归档元数据，B §1～11及D/F/G1/G3 §14～17设计正文保持不变。

负责人授权周润基侧统一提交六份文档PR，具体边界见[联合汇总§10](p4-design-deltas-v81.md#10-文档归档与-pr-发布授权2026-09-07)。当前仓库版本由Git提交与路径定位，不将源附件SHA冒称新SHA。Phase4 IN_PROGRESS、Phase5 LOCKED，四项PENDING保持；产品、Contract、数据库、Migration及恢复均NOT EXECUTED。

## 19. 负责人决定对齐增量

<a id="p4h-owner-decision-alignment"></a>

### 19.1 决定来源与适用状态

本节只消费负责人决定文档`BNBU-P4-OWNER-DECISIONS-20260907-v1.0`的业务问题答案，原件SHA-256为`c65edff3d13184804130b623ff16e42460b0712f1e4d4bb98ca2199ea18a4034`。P-20260904-01～04从“等待业务选择”更新为`DECISION_ACCEPTED / DESIGN_ALIGNED`；是否已在真实产品、数据库、Contract或环境中执行仍分别为`NOT_EXECUTED`。本文前述“PENDING/未确认/BLOCKED_R3”只保留为历史输入状态，涉及这四项时以本节为当前H设计结论。GAP-H13不在四项决定内，继续保持`BLOCKED_R3`。

### 19.2 P01 审核终局

完成规定检查与必要复核、六类无效依据均不适用且只剩未证实疑虑时，B必须以`VALID`结束本轮，不得继续挂起、再次补证或记录“已证实冒用”。技术超时、对象未完整到账或必要检查未完成不满足该前提，只能保持相应技术待处理/失败事实；若确证重复使用或冒用，仍按第六类判无效。审核有效与分钟实际计入继续分离，管理员不取得教学裁决权，也不新增人脸、GPS或隐藏备注。

### 19.3 P02 普通首次材料时间

H侧消费Z拥有的正式受理事实：普通运动首次正式受理必须满足`acceptedAt < endedAt + 24h`；受理时锁定同一材料批次，全部必需对象的权威传输完成必须满足`completedAt < acceptedAt + 30m`。等于端点即超时，使用服务器完整精度与UTC时刻裁决，客户端倒计时不具权威性。课程关闭、成员移出或收尾不能截断边界前已存在的合法链，但也不能新建运动或恢复完整成员权限。该规则不覆盖游泳15分钟首次受理、游泳离线异常队列或教师退回补证24/72小时专门规则。

### 19.4 P03 学校工作日计时

教师每轮SLA预算为两个完整学校工作日，即172800秒，只在经对应Owner确认且带版本的学校工作日表所覆盖区间内累计；每个被确认工作日按`Asia/Shanghai 00:00`至次日`00:00`计时并保留入队日内时刻。维护只扣除与可计时工作日相交的区间，维护、事故和错误锁定重叠按区间并集去重。日历更新不无声改写既有轮次；范围外日期返回“无法可靠计算”。实际适用学期、工作日表、修订通知和维护责任仍需作为运行输入提供，不能以示例日历或普通周一至周五替代。

### 19.5 P04 错误逾期追加纠错

非维护平台故障在错误逾期终局写入后才确认时，以带事故引用和唯一业务标识的追加纠错恢复本来应有状态或原剩余机会；保留原终局、材料历史和后续合法决定，不删除记录、不直接回滚数据库、不重发完整24/72小时窗口，也不清零已用补证标记。剩余预算从入口真正恢复时继续；事故已恢复但错误终局仍阻断入口的区间继续排除。纠错发布必须核验原记录/轮次版本并保证更正事实、当前有效状态、计时依据和必要审计的一致提交；与后续教师决定、结算或其他纠错冲突时定向复核，不覆盖合法后继。

### 19.6 Contract起始输入与剩余缺口

Phase 5唯一选定起始输入为新仓库`main / 73945754a8dbd490709a0a92fda696febf6433eb`中的`contracts/openapi.yaml`：`1.2.0-contract / RC / 667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a`，原始文件大小450586 bytes，并与`contracts/contract-metadata.json`成对核验。候选A `72174317df23f7030b74a2957f8e75ec669e872e18d39d06e060c95b61f6a7be`仅保留为来源待核验的历史候选；候选B `31f6d3b4d45503f8b4bcb93a83565e1cb957ad4352c036dcde018e15466233ae`保留为旧Backend Contract链的历史candidate；二者均不作为本次生成、绑定、实现或验收输入。

该选择关闭“从哪个精确协议继续”的身份问题，但不关闭`CR-20260901-005`，也不表示1.2.0已覆盖本次新规则或通过跨端兼容验收。GAP-H15～H18的业务决定已接受并在H侧设计对齐，后续由Phase 5在新Version/SHA中表达；GAP-H13的历史remark教师治理读取仍等待对应Owner，GAP-H20继续由CR-005处理。负责人最终Phase 4退出确认、真实日历覆盖、Z侧决定对齐及双方差异复核尚未完成前，Phase 4保持`IN_PROGRESS`、Phase 5保持`LOCKED`。

### 19.7 GAP-H13最终决定与阶段退出

负责人最终决定：所有已认证且当前角色为`TEACHER`的教师均可只读查看历史`FinalGradePublication.remark`；不按原课程责任教师、当前课程成员或治理分组进一步收窄。该读取只作用于历史publication/审计，不允许新增、修改、删除或复制remark到新最终成绩，也不恢复管理员代审或跨教师教学裁决。学生、学生API、通知、导出、缓存、日志和公开页面继续不得取得最终成绩或历史remark。访问必须保留actor、用途、对象和读取时间审计。

据此GAP-H13更新为`DECISION_ACCEPTED / DESIGN_ALIGNED / CLOSED_FOR_PHASE4`。P-01～04、GAP-H15～H18及Contract起始输入均已完成决定对齐；双方最终互审由用户确认为已完成且没有待整改Finding。实际校历数据、CR-005、新Contract发布、产品/数据库/Migration/恢复和E2E属于后续阶段输入或执行，不再作为Phase 4业务决定阻塞。Phase 4设计阶段以`DONE`退出，Phase 5解锁为`READY`；Phase 5仍须从精确`1.2.0-contract / RC / 667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a`开始并发布新的唯一Version/SHA。

### 19.8 跨文件最终对齐与Phase 2消费

本节是H正式稿的最终替代登记。§13、§17、§18及§19.1/19.6中“等待P-01～04/GAP-H13”“canonical UNKNOWN”“Phase 4 IN_PROGRESS / Phase 5 LOCKED”等文字只描述当时输入，不再是当前门禁；分别由§19.2～19.7及本节取代。Z侧当前正式消费见[Z §12](p4-design-zhou-v81.md#p4z-final-alignment)，迁移/恢复消费见[G2 §13](p4-migration-note.md#p4z-g2-final-alignment)，追溯状态见[矩阵 §8](p4-traceability-matrix-v81.md#p4-trace-final-alignment)。

Phase 2学生端页面清单、用户流程、七状态矩阵和Android UI foundation不是新的业务规则源；它们在Phase 4分别作为B/C/E/F的场景证据及G1的客户端消费输入。维护、材料上传、审核阶段、站内通知和学生敏感字段必须按本稿当前设计及Z当前设计修正旧UI假设。Phase 5由Contract Owner把这些已确认语义写入新Contract Version/SHA；Phase 6由Android/Web Owner做Contract与Mock验证；Phase 7由Backend/Data Owner实现持久化、状态机和校历数据接入；Phase 8由客户端Owner完成真实接入。Phase 2遗留的FCM清理、隐私定稿、完整无障碍/七态和Release证据分别由Android平台Owner、隐私/运营Owner、客户端/设计Reviewer和Release Owner在Phase 8、10、10及11完成。

当前不存在Phase 4开放业务Finding。实际学校工作日表仍是Academic Term/Data Owner在Phase 7提供的版本化运行输入；CR-005和覆盖本设计的新Contract由Contract Owner在Phase 5完成；真实数据库迁移/回填/恢复由Data/Backend Owner在Phase 7设计实现并于Phase 9演练；跨端绑定和真实E2E分别在Phase 6/8和Phase 9完成。这些延期项有明确Owner和完成阶段，均不回退Phase 4的`DONE`，也不得提前标为`EXECUTED`。
