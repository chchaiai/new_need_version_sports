# Phase 4 · V8.1 双向追溯矩阵

> 文件版本：`P4-TRACE-V8.1-1.2`
>
> `1.1`保留为决定前快照；§0～7中的PENDING、canonical UNKNOWN、Phase 4 IN_PROGRESS、Phase 5 LOCKED和旧文件SHA不再是当前结论。最终追溯、替代关系及Phase 2对应以§8为准。
>
> 工作项：`WI-0020`；Owner：H；Reviewer：Z；风险：R2。
>
> 冻结基线：`main / c1ffd02d1f4c77edfe71efce140396b780827df8`。
>
> 交付状态：`DESIGNED/VERIFIED` 仅表示本矩阵的来源、定位、覆盖与一致性检查完成；产品、Contract、数据库、migration、真实并发和运行验收均为 `NOT_EXECUTED`。
>
> 阶段状态：Phase 4 `IN_PROGRESS`；Phase 5 `LOCKED`。

本文件只建立导航和覆盖关系，不重新定义 A/B/C/D/E/F/G1/G2/G3 的业务、算法、状态机或事实。定义冲突时回到相应唯一 Owner；不能用本矩阵替代正式设计、业务决定或 Contract。

## 0. 证据口径与冻结输入

### 0.1 状态词

| 状态 | 本矩阵中的含义 |
|---|---|
| `DESIGNED/VERIFIED` | 冻结设计已有明确正反例或约束，且本轮只验证文件、定位和追溯关系；不代表产品已运行 |
| `EXECUTED` | 真实产品、数据库、migration、环境或端到端动作已经执行并有证据；本矩阵没有此类行 |
| `NOT_EXECUTED` | 尚未执行真实实现、运行或环境验收 |
| `PENDING` | 必须由业务/定义 Owner 回答，禁止默认关闭 |
| `BLOCKED` | 受 Contract 身份、R3决定或阶段门禁阻塞 |
| `SUPERSEDED` | 旧验收能力已被后续正式业务决定取消，只保留拒绝旧入口和历史不删除的回归 |

### 0.2 冻结文件身份

下表身份来自冻结提交的 Git blob；Windows 工作文件的纯 CRLF 差异不改变身份判断。

| 输入 | 路径 | SHA-256 | 用途 |
|---|---|---|---|
| H设计 | [P4-H](p4-design-huang-v81.md) | `bbfe82deb53d292bd70efbc7f977af171d755fbe837b58a96b33c5db8487c6f9` | B/D/F/G1/G3 唯一正式源 |
| Z设计 | [P4-Z](p4-design-zhou-v81.md) | `2480f93cf14889be9c1d7b723c2b49aa3dbff3b96569bf8e04968acbfb4fe0e1` | A/C/E 唯一正式源 |
| G2说明 | [G2迁移说明](p4-migration-note.md) | `7618a69a1c377080bfbd93571a91a5757b4921756ea07554afb59f60ce7e1f62` | G2 唯一详述 |
| 联合汇总 | [联合增量汇总](p4-design-deltas-v81.md) | `dd7c13bab27901001ed5f883e1fddc5419acafb11fcc9870e99cf0a33589d27d` | 定义导航、接受范围和未覆盖项 |
| Phase 4 Handoff | [联合交接](../../rebuild/handoffs/new-req-phase-4.md) | `17909015aef6d8ccb1d669aa3d28b07fc32fe1982b3e65522a963bc214e5ba34` | 阶段交接历史事实 |
| STATUS | [阶段状态](../../rebuild/STATUS.md) | `24a2da409091e71fc43a8d79ad5c130e42800a800454d48cfbf67e5f701b42fb` | `IN_PROGRESS / LOCKED` 状态证据 |

### 0.3 Contract身份必须分开

| 身份 | 完整SHA-256 | 状态与限制 |
|---|---|---|
| 仓库冻结设计引用 `1.2.0-contract / RC` | `667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a` | 仅作为冻结设计的已登记 RC 事实；V8.1缺口见 [H §17](p4-design-huang-v81.md#p4h-g3-contract-gaps) |
| 控制面 `4.0.1-contract` candidate A | `72174317df23f7030b74a2957f8e75ec669e872e18d39d06e060c95b61f6a7be` | candidate；未选择 |
| 控制面 `4.0.1-contract` candidate B | `31f6d3b4d45503f8b4bcb93a83565e1cb957ad4352c036dcde018e15466233ae` | candidate；未选择 |
| canonical | `UNKNOWN` | `BLOCKED`；版本文字相同不能合并字节身份，也不能由本矩阵选定 |

两个 4.0.1 候选的事实源是工作区控制面 `project-control/state/contracts.yaml`。它们不替换仓库冻结设计引用的 1.2.0 RC，也不证明任何新 RC 已发布。

## 1. 业务决定 → 设计、AT与缺口

业务决定登记以[总业务流程 §0.2](../../business/00-overview.md)为权威；详细角色行为分别见[学生流程](../../business/10-student-flow.md)、[教师流程](../../business/20-teacher-flow.md)和[管理员流程](../../business/30-admin-flow.md)。AT 原始场景索引见[业务方案交付 §7](../../rebuild/handoffs/2026-09-04-teacher-first-business-update.md)。

| 追溯键 | 业务决定与正文位置 | 唯一设计落点/消费方 | AT覆盖 | Contract/未决路由 |
|---|---|---|---|---|
| SRC-01 | `BD-20260903-01` 规则校验、AI初审、异常教师处理；总览 §12 | [H/B §4状态机](p4-design-huang-v81.md#p4h-b-state-machine)、[§5 AI/人工边界](p4-design-huang-v81.md#p4h-b-ai-human-boundary) | AT-01～04 | GAP-H02/H03/H10；新RC `PENDING` |
| SRC-02 | `BD-20260903-02` 学生只见本人数据与进度，隐藏成绩/换算分/等级/排名；总览 §13/15 | [H/F §15.8](p4-design-huang-v81.md#p4h-f-student-data)，G1消费；A/E只提供按角色允许投影 | AT-18 | GAP-H12/H13；H13为R3 `BLOCKED` |
| SRC-03 | `BD-20260903-03` 电子/纸质名单、实名核对、统一报告；总览 §10 | [H/D §14](p4-design-huang-v81.md#p4h-d-roster-ocr)、[§14.6综合名单](p4-design-huang-v81.md#p4h-d-combined-roster) | AT-15 | GAP-H08；新RC `PENDING` |
| SRC-04 | `BD-20260903-04` 邀请5～120分钟、默认30分钟、已登记流程有限宽限；总览 §9.4 | Z/E §4.1；H/G3只归集缺口 | AT-16 | GAP-H07/H19；H19设计精度已关闭，Contract表达仍 `PENDING` |
| SRC-05 | `BD-20260903-05` 800/1000米OCR草稿，教师确认正式用时；总览 §13.2 | [H/D §14](p4-design-huang-v81.md#p4h-d-roster-ocr) | AT-17 | GAP-H09；新RC `PENDING` |
| SRC-06 | `BD-20260903-06` 一次补证、24/72小时、自动逾期、故障顺延；总览 §12.3 | [H/B §3.1](p4-design-huang-v81.md#p4h-b-supplement-opportunity)、[§7.2 Timer](p4-design-huang-v81.md#p4h-b-supplement-timer)；Z/C只绑定材料版 | AT-04～08、20 | GAP-H03～H05/H18；P-04 `PENDING` |
| SRC-07 | `BD-20260903-07` 游泳前后照、15分钟受理、30分钟同批续传、24小时完全离线异常；总览 §11.5 | Z/C §3.1～3.4；B只消费正式材料版 | AT-19～21 | GAP-H04；普通首次材料另受P-02 `PENDING` |
| SRC-08 | `BD-20260903-08` 实际整分钟、单次60封顶、日/周上限、达标可继续记录；总览 §8/11.3 | Z/A §2.1～2.11；F提供模板闭集；G1只映射投影 | AT-09～14、22 | GAP-H01/H06；新RC `PENDING` |
| SRC-09 | `BD-20260903-09` 固定收尾、结算与事实纠错；总览 §21 | Z/E §4.2～4.5；A/B/D等提供版本化来源 | AT-23～25 | GAP-H11/H13；H13为R3 `BLOCKED` |
| SRC-10 | `BD-20260903-10` 统一模板、服务治理和教师优先工作台；总览 §3/5/8 | Z/A §2.1～2.3、[H/F §15](p4-design-huang-v81.md#p4h-f-governance) | AT-22、28 | GAP-H06/H10/H21；运行证据 `NOT_EXECUTED` |
| SRC-11 | `BD-20260904-01` 三个教师动作、六类公开原因、系统逾期原因、补证逾期终结；总览 §12.1～12.3 | [H/B §8](p4-design-huang-v81.md#p4h-b-public-reasons)；Z/C只消费终结/受理结果 | AT-02、05～07、20 | GAP-H03/H17；P-01 `PENDING` |
| SRC-12 | `BD-20260904-02` 补证后无效终结、取消接管、维护续计、逐轮SLA、关闭保留旧链、最终成绩无备注；总览 §6/8/12/15/18/21 | H/B/F、Z/C/E、G2分别按Owner定义；[决定边界](../../rebuild/handoffs/2026-09-04-business-review-followup.md) | AT-05～08、18、23～25；AT-26/27 `SUPERSEDED` | GAP-H05/H11～H18；P-01～04保持 `PENDING` |

反向核对：第2节每个设计簇均回指上表至少一个 `SRC-*`；第3节每个AT均回指唯一设计Owner；第4节每个GAP均回指设计簇或PENDING。

## 2. 设计簇 → 业务、AT、Contract与Owner

| 簇 | 正式定义/导航 | 回指业务源 | 正反例/不变量 | Contract与未决 | 实现Owner |
|---|---|---|---|---|---|
| A 计入引擎 | Z §2；唯一统计定义为 Z §2.5 `P4Z.A.StatisticsProjection` | SRC-08、SRC-10；BD-20260903-08/10 | AT-09～14、22；整数分钟、分类封顶、日/周选择、来源令牌、发布CAS和恢复反例 | GAP-H01/H06；核心不依赖四项PENDING | `statistics`；规则发布由 `course-enrollment` |
| B 审核流水线 | [H §3.1](p4-design-huang-v81.md#p4h-b-supplement-opportunity)、[§4](p4-design-huang-v81.md#p4h-b-state-machine)、[§6](p4-design-huang-v81.md#p4h-b-effective-candidate)、[§7](p4-design-huang-v81.md#p4h-b-supplement-timer)、§9 | SRC-01、SRC-06、SRC-11、SRC-12 | AT-01～08；状态、轮次、材料绑定、幂等、竞态、队列去重、source guard | GAP-H02～H05/H15/H17/H18；P-01/P-03/P-04 `PENDING` | `record-review` |
| C 材料版本 | Z §3；唯一材料定义为 Z §3.1 `P4Z.C.MaterialVersionFact` | SRC-06、SRC-07、SRC-11、SRC-12 | AT-19～21并消费AT-04～08；每Record最多两版、包约束、同批锁定/续传、B/C原子受理 | GAP-H04/H16；P-02 `PENDING` | `exercise-record`；资产生命周期为 `media-evidence` |
| D 名单/OCR/耐力 | [H §14](p4-design-huang-v81.md#p4h-d-roster-ocr)、[§14.6](p4-design-huang-v81.md#p4h-d-combined-roster) | SRC-03、SRC-05 | AT-15/17；草稿不是真实事实、`4.30`阻断、两个分别原子的确认事务、来源版本完整性 | GAP-H08/H09；核心不依赖四项PENDING | `course-enrollment`、`endurance`；OCR为Infrastructure |
| E 邀请/关闭/结算 | Z §4；唯一结算定义为 Z §4.3 `P4Z.E.SettlementVersion` | SRC-04、SRC-09、SRC-12 | AT-16/23～25；严格早于端点、关闭只阻止新起点、完整来源冻结、纠错追加版本 | GAP-H07/H11/H13/H16/H19；P-02及H13 `BLOCKED` | `course-enrollment`；学期切换由 `academic-term` |
| F 治理/维护/隐私 | [H §15](p4-design-huang-v81.md#p4h-f-governance)、[§15.5](p4-design-huang-v81.md#p4h-f-maintenance)、[§15.8](p4-design-huang-v81.md#p4h-f-student-data) | SRC-02、SRC-06、SRC-10～12 | AT-08/18/28；管理员权限、技术失败fail closed、实际维护区间、学生全部出口、取消接管 | GAP-H05/H10/H12～H15/H17/H18/H21；P-01/P-03/P-04 `PENDING` | 治理组件、`system-mode`及各事实Owner |
| G1 客户端分层 | [H §16](p4-design-huang-v81.md#p4h-g1-client-layering)、[§16.5](p4-design-huang-v81.md#p4h-g1-statistics) | SRC-01～12的客户端消费面 | UI→ViewModel→Use Case→Repository→Adapter/Mapper→DTO→HTTP；未知枚举、缺required和不安全payload fail closed；重试复用key | 消费GAP-H01～H12/H20；新RC前均 `NOT_EXECUTED` | Android/Web各自客户端Owner；Backend最终裁决 |
| G2 迁移/恢复 | [G2 §2～5.1](p4-migration-note.md) | SRC-06～10、SRC-12；只消费已接受结构 | 空库证据、`DATA_MIGRATION_DECISION_REQUIRED`、禁止猜测回填、同一恢复点、来源缺失停止 | Contract/数据库/环境均 `NOT_EXECUTED`；P-01～04仅登记、不回答 | 数据/环境Owner决定后由被授权执行者实施 |
| G3 Contract门禁 | [H §17](p4-design-huang-v81.md#p4h-g3-contract-gaps) | SRC-01～12 | GAP-H01～H21逐项归集；只登记差异，不发明endpoint/DTO/error/wire | H13/H15～H18阻塞Phase5；H20阻塞Phase6；canonical `UNKNOWN` | Contract Owner；H只维护缺口索引 |
| H 正式追溯/阶段文件 | 本矩阵、[H §18](p4-design-huang-v81.md#p4h-package-report)、[联合汇总](p4-design-deltas-v81.md) | SRC-01～12；只做导航 | 双向覆盖、唯一Owner、版本/SHA、状态边界和NOT_EXECUTED检查 | 不关闭任何GAP/PENDING；Phase4仍`IN_PROGRESS` | H维护矩阵与最终Handoff/STATUS指定位置；联合汇总归Z |

### 2.1 唯一定义边界

| 概念 | 唯一位置 | 允许消费 | 禁止复制 |
|---|---|---|---|
| `P4H.B.EffectiveCandidate` | [H §6.1](p4-design-huang-v81.md#p4h-b-effective-candidate) | A、E、G1只读结果与来源版本 | A不得自行从审核状态反推有效 |
| B candidate source guard | [H §6.2](p4-design-huang-v81.md#p4h-b-source-guard) | A发布、E冻结参与式校验 | 调用方不得把普通双读冒充提交保护 |
| `ReviewBlockerSnapshot` | [H §6.3](p4-design-huang-v81.md#p4h-b-review-blocker) | E、D组合投影 | B不得代供其他Owner全量事实 |
| `P4H.B.SupplementTimerFact` | [H §7.2](p4-design-huang-v81.md#p4h-b-supplement-timer) | C/G1消费可受理与剩余投影 | C/客户端不得另算截止 |
| `P4H.B.TeacherSlaRound` | [H §7.3](p4-design-huang-v81.md#p4h-b-teacher-sla-round) | C/E/G1消费状态 | 不得默认48小时/普通工作周 |
| `P4H.D.CourseAssessmentRosterProjection` | [H §14.6](p4-design-huang-v81.md#p4h-d-combined-roster) | 教师报告/结算按token消费 | 组合器不得写回来源事实 |
| `P4H.F.MaintenancePauseFact` | [H §15.5](p4-design-huang-v81.md#p4h-f-maintenance) | B/C/E/G2/G1引用实际区间与revision | 不得用预计恢复时间或复制第二套区间 |
| `P4Z.A.StatisticsProjection` | Z §2.5 | E/G1/D组合投影引用 | 不复制选择算法和三分列定义 |
| `P4Z.C.MaterialVersionFact` | Z §3.1 | B绑定不可变版本ID/来源 | B不复制材料包清单定义 |
| `P4Z.E.SettlementVersion` | Z §4.3 | D组合投影/G2引用版本 | 不用当前缓存覆盖历史报告 |

## 3. AT → 设计与反例覆盖

所有场景的业务原始索引均为[业务方案交付 §7](../../rebuild/handoffs/2026-09-04-teacher-first-business-update.md)。下表的“已覆盖”是冻结设计级推演或约束，不是产品测试。

| AT | 设计Owner与定位 | 正例/主断言 | 反例/拒绝断言 | 状态 |
|---|---|---|---|---|
| AT-01 | B；H §10.1 | 合格版1经检查/AI NORMAL后产生有效候选 | 上传或HTTP 200直接VALID | `DESIGNED/VERIFIED`; runtime `NOT_EXECUTED` |
| AT-02 | B；H §10.2 | UNCERTAIN/疑似重复进入同轮去重待办 | AI把线索写成已证实冒用或多建待办 | `DESIGNED/VERIFIED`; runtime `NOT_EXECUTED` |
| AT-03 | B/F；H §10.3 | 技术失败有限重试/人工模式，迟到回调superseded | 超时默认通过/无效、无限重试、覆盖教师 | `DESIGNED/VERIFIED`; runtime `NOT_EXECUTED` |
| AT-04 | B/C；H §10.4、Z §3.1～3.2 | round与材料版本精确绑定 | 旧版回调覆盖版2或先结束Timer后锁材料 | `DESIGNED/VERIFIED`; runtime `NOT_EXECUTED` |
| AT-05 | B；H §10.5 | 首次退回原子消耗唯一动作并开24/72总窗口 | 72叠加24、客户端起算、非法原因 | `DESIGNED/VERIFIED`; runtime `NOT_EXECUTED` |
| AT-06 | B/C；H §10.6、Z §3.2 | 真逾期一次终结；截止前受理后等待教师 | 忽略维护/受理或因教师晚审判逾期 | `DESIGNED/VERIFIED`; runtime `NOT_EXECUTED` |
| AT-07 | B/C；H §10.7、Z §3.2 | 相同command重放原结果，补证后仅通过/无效 | 版3、第二Timer、再次退回或纠错重开 | `DESIGNED/VERIFIED`; runtime `NOT_EXECUTED` |
| AT-08 | B/F；H §10.8、§15.5 | 实际平台区间取并集，恢复后续计余额 | 预计时间恢复、重发完整窗口、个人离线冒充故障 | `DESIGNED/VERIFIED`; P-04 `PENDING`; runtime `NOT_EXECUTED` |
| AT-09 | A；Z §2.7 | 29:59/30:00/45:59/90:00映射0/30/45/60 | 进位、阶梯0/60/120、PAUSED计入 | `DESIGNED/VERIFIED` arithmetic; runtime `NOT_EXECUTED` |
| AT-10 | A；Z §2.7 | 同日只选一条且求联合最优 | 同日相加或逐日贪心 | `DESIGNED/VERIFIED` arithmetic; runtime `NOT_EXECUTED` |
| AT-11 | A；Z §2.7 | 原开始日期/周、周上限、跨周补证重算 | 用结束日移周或只取最早K条 | `DESIGNED/VERIFIED` arithmetic; runtime `NOT_EXECUTED` |
| AT-12 | A/G1；Z §2.7 | 达1200仍可记录，额外有效但不计入 | 进度作准入门禁、标INVALID或累计1260 | `DESIGNED/VERIFIED` arithmetic; runtime `NOT_EXECUTED` |
| AT-13 | A；Z §2.7/2.11 | 新候选不降低最优总量，恢复保留前驱语义 | 较早30机械替代已计60或空缓存冒充首次计算 | `DESIGNED/VERIFIED` arithmetic; runtime `NOT_EXECUTED` |
| AT-14 | A/E；Z §2.7、§4.5 | 分类封顶、认证不占名额、按正式成员范围汇总 | 直接扣认证、全班封顶、改写历史分母 | `DESIGNED/VERIFIED` arithmetic/snapshot; runtime `NOT_EXECUTED` |
| AT-15 | D；H §14.8 | 人数相等仍按稳定身份列差异 | 只比人数、模糊姓名合并、自动移出 | `DESIGNED/VERIFIED`; runtime `NOT_EXECUTED` |
| AT-16 | E；Z §4.1 | 到期前登记，严格早于10分钟宽限端点完成一次 | 端点/之后接受、刷新延期、撤销后成功 | `DESIGNED/VERIFIED` predicate; runtime `NOT_EXECUTED` |
| AT-17 | D；H §14.9 | `4.30`等歧义保持草稿，选中合法行原子确认 | 猜270秒、部分失败仍提交、提前COMPLETED | `DESIGNED/VERIFIED`; runtime `NOT_EXECUTED` |
| AT-18 | F/G1/G3；H §15.8/15.10 | 学生所有出口只含允许本人事实 | API返回分数但UI隐藏、通知/导出/缓存泄漏 | `DESIGNED/VERIFIED`; runtime `NOT_EXECUTED` |
| AT-19 | C；Z §3.3～3.4 | 前后照、15分钟锁清单、30分钟续传、24小时离线异常 | 补拍前照、换批续传、客户端时间自动有效 | `DESIGNED/VERIFIED`; P-02部分 `PENDING`; runtime `NOT_EXECUTED` |
| AT-20 | C/B；Z §3.2～3.4 | 补证消费B的24/72可受理结果 | 再套游泳结束后15分钟或C自行算计时 | `DESIGNED/VERIFIED`; runtime `NOT_EXECUTED` |
| AT-21 | C；Z §3.1/3.4 | 每版独立校验媒体约束和原素材引用 | 两版历史合并计数、混用申请包上限 | `DESIGNED/VERIFIED`; runtime `NOT_EXECUTED` |
| AT-22 | A/F；Z §2.1/2.10、H §15.2 | 不可完成参数拒绝发布，发布后规则锁定 | 只验目标和或发布后换公式/模板追溯 | `DESIGNED/VERIFIED` reference algorithm; runtime `NOT_EXECUTED` |
| AT-23 | E/B；Z §4.2～4.5 | 逐项阻塞结算，来源清除后才冻结版本 | 批量无效、读取失败当空、自动延长补练 | `DESIGNED/VERIFIED` snapshot; runtime `NOT_EXECUTED` |
| AT-24 | E/B/C；Z §4.2/4.4 | 关闭前合法旧链继续，新起点拒绝 | 关闭吞待办或把本地草稿升级为旧链 | `DESIGNED/VERIFIED`; P-02部分 `PENDING`; runtime `NOT_EXECUTED` |
| AT-25 | E/A/B；Z §4.3～4.5 | 归档后追加纠错与链接前版的新报告 | 覆写旧版、重开补证/运动、跨教师接管 | `DESIGNED/VERIFIED`; runtime `NOT_EXECUTED` |
| AT-26 | F/G3；H §15.9/17.5 | 保留“无跨教师/管理员代审、历史不删除”负向回归 | 创建有限接管能力 | `SUPERSEDED` by BD-20260904-02; cleanup test `NOT_EXECUTED` |
| AT-27 | F/G3；H §15.9/17.5 | 保留旧入口/请求被拒绝的负向回归 | 实现接管授权到期/撤销状态机 | `SUPERSEDED` by BD-20260904-02; cleanup test `NOT_EXECUTED` |
| AT-28 | F/B/D；H §15.3～15.4/15.11 | 总管理员治理、脱敏汇总、教师判断、动作留痕 | 分管理员配置、管理员代审、OCR直接写正式事实 | `DESIGNED/VERIFIED`; runtime/model evidence `NOT_EXECUTED` |

## 4. Contract缺口 → 设计与验收回指

缺口正文唯一位置为[H §17.3](p4-design-huang-v81.md#p4h-g3-contract-gaps)。本表只做反向索引，不能作为新wire设计。

| GAP | 回指设计/AT | 当前分类 | 状态 |
|---|---|---|---|
| GAP-H01 | A；AT-09～14 | 实际整分钟、选择、三分列与source token | 设计清楚；新RC `PENDING` |
| GAP-H02 | B；AT-01～04 | 审核中间阶段、task/round/version | 设计清楚；新RC `PENDING` |
| GAP-H03 | B；AT-02/05～07 | 六类原因、公开说明、系统逾期actor/code | 设计清楚；P-01影响终局分支 |
| GAP-H04 | B/C；AT-04～08/19～21 | 材料版本、补证受理、游泳批次 | 设计清楚部分可进新RC；P-02分支 `BLOCKED` |
| GAP-H05 | B/F；AT-05～08/23 | 维护区间、剩余、逐轮SLA、blocker | P-03/P-04受影响分支 `BLOCKED` |
| GAP-H06 | A/F；AT-22 | 模板revision、闭集、规则锁定、可完成性 | 设计清楚；新RC `PENDING` |
| GAP-H07 | E；AT-16 | 邀请登记、宽限和严格端点 | 设计清楚；新RC `PENDING` |
| GAP-H08 | D；AT-15 | 纸质OCR名单、确认、综合名单版本 | 设计清楚；新RC `PENDING` |
| GAP-H09 | D；AT-17 | 耐力OCR草稿、歧义、选中行原子确认 | 设计清楚；新RC `PENDING` |
| GAP-H10 | F；AT-28 | AI/OCR service revision、人工模式、脱敏治理 | 设计清楚；新RC `PENDING` |
| GAP-H11 | E；AT-23～25 | 关闭旧链、结算版本、纠错报告和guards | 设计清楚部分可进新RC；P-02/H13受影响 |
| GAP-H12 | F/G1；AT-18 | 学生Contract从schema源头移除分数类字段 | 隐私P0；新RC `PENDING`，实现 `NOT_EXECUTED` |
| GAP-H13 | F/E；AT-18/25 | 新最终成绩无remark、历史remark治理/迁移边界 | R3 `BLOCKED`，阻塞Phase5 |
| GAP-H14 | F/G3；AT-26/27负向回归 | 取消有限接管，不新增Contract能力 | 非Contract；清理/拒绝测试 `NOT_EXECUTED` |
| GAP-H15 | B/F | 学校工作日历、版本、时区/日界线 | P-03 `BLOCKED`，阻塞Phase5 |
| GAP-H16 | C/E；AT-19/24 | 普通首次材料最晚时点及跨关闭/移出边界 | P-02 `BLOCKED`，阻塞Phase5 |
| GAP-H17 | B/F；AT-02/05～07 | 六类均不适用且仍有合理疑问的终局 | P-01 `BLOCKED`，阻塞Phase5 |
| GAP-H18 | B/F；AT-08 | 错误逾期后才确认非维护故障的补救 | P-04 `BLOCKED`，阻塞Phase5 |
| GAP-H19 | E/G3；AT-16 | 宽限端点精度已确定并并入H07 | 设计精度 `DESIGNED/VERIFIED`；Contract仍 `PENDING` |
| GAP-H20 | G3/G1 | CR-20260901-005三组explicit discriminator mapping | `BLOCKED` Phase6；新Version/SHA及三端round-trip未执行 |
| GAP-H21 | F；AT-28 | AI/OCR真实准确率、错误样本、重试恢复、性能 | 运行验收 `NOT_EXECUTED` |

## 5. 四项PENDING与消费边界

| ID | 未决最小问题 | 定义Owner → 消费Owner | 已完成边界 | 禁止默认 |
|---|---|---|---|---|
| `P-20260904-01` | 六类均不适用且仍有合理疑问时的终局标准 | 业务Owner；H在B/F定义 → Z在C/E引用 | 六类、动作适用性、补证后不再退回已冻结 | 不造第七类，不默认通过，不把疑虑写成已证实冒用 |
| `P-20260904-02` | 普通首次材料最晚期限及关闭/移出后受理与传输终结 | 业务Owner；Z在C/E定义 → H在B绑定 | 游泳15/30/24与关闭前合法旧链已冻结 | 不把游泳窗口推广为普通材料规则 |
| `P-20260904-03` | 权威学校工作日历、版本、时区/日界线、两个学校工作日算法 | 业务Owner；H在B/F定义 → Z在C/E/G2引用 | SLA轮次起止、维护暂停续计已冻结 | 不换算48小时，不默认周一至周五或客户端时间 |
| `P-20260904-04` | 错误逾期终结后才确认非维护故障的补救及历史保留 | 业务Owner；H在B/F定义 → Z在G2等引用 | 已确认维护/故障区间的正常续计已冻结 | 不自动撤销终态、不重开补证、不重置唯一机会 |

四项均为 `PENDING`。它们只阻塞实际消费其答案的分支；A核心、D核心、F已确定治理边界、G1分层、G3登记及本追溯矩阵可继续，但不能据此声称Phase 4完成。

## 6. 双向完整性与双轨边界

### 6.1 当前替代集合覆盖闭环

以下数量只核对负责人已允许使用的“BD决策编号＋AT场景＋已提供业务/Phase 2内容”替代追溯集合，不表示正式REQ级对应、独立Phase 2交付清单或精确版本映射已经补齐。

| 核对维度 | 预期集合 | 本矩阵落点 | 结论 |
|---|---|---|---|
| 业务决定 | BD-20260903-01～10、BD-20260904-01～02 | SRC-01～SRC-12 | 12/12 `DESIGNED/VERIFIED` |
| 设计簇 | A/B/C/D/E/F/G1/G2/G3及H正式追溯 | §2 | 10/10有业务、AT、Contract/PENDING和Owner回指 |
| AT | AT-01～28 | §3 | 28/28有定位；26/27明确`SUPERSEDED` |
| Contract缺口 | GAP-H01～H21 | §4 | 21/21有设计与门禁回指 |
| 业务PENDING | P-20260904-01～04 | §5 | 4/4保持`PENDING`且Owner/消费者分离 |
| Contract身份 | 1.2.0 RC、两个4.0.1候选、canonical | §0.3 | 三个字节身份分开；canonical `UNKNOWN` |
| Phase 3/REQ/Phase 2追溯边界 | 本批Phase 3 Handoff/Impact Matrix前置已豁免；正式REQ级对应、独立Phase 2交付清单及精确版本映射仍开放 | [联合汇总J-09/J-10](p4-design-deltas-v81.md)、[Phase 4 Handoff §1/9](../../rebuild/handoffs/new-req-phase-4.md)、[Z主稿ISS-007](p4-design-zhou-v81.md) | 当前BD/AT替代追溯`DESIGNED/VERIFIED`；剩余正式对应`NOT_EXECUTED`，由负责人落实责任与计划 |

### 6.2 Phase 3豁免与未覆盖追溯项

负责人2026-09-06授权继续有效：本批不以Phase 3 Handoff或Impact Matrix作为前置，可按上述BD/AT及已有业务/Phase 2材料追溯。该豁免不等于缺项关闭；[联合汇总J-09/J-10](p4-design-deltas-v81.md)与[Phase 4 Handoff §1/9](../../rebuild/handoffs/new-req-phase-4.md)仍要求补做正式REQ级对应、独立Phase 2交付清单和精确版本映射，并由负责人落实后续责任与计划；[Z主稿ISS-007](p4-design-zhou-v81.md)保留同一交接边界。

这是一项仍开放的追溯治理缺口，不新增REQ、BD或GAP-H编号，不并入四项业务`PENDING`，也不改变Contract身份。它不否定§1～5对当前替代集合的覆盖结果，但在补齐前禁止把本矩阵表述为已经登记并关闭全部追溯事项，Phase 4继续`IN_PROGRESS`、Phase 5继续`LOCKED`。

### 6.3 与同批Z 17-A的冲突检查

H/WI-0020只新增本文件，并更新自己独立的控制面WI和交接记录；不修改Z设计或A定义。Z 17-A拥有A计入引擎工程设计DoD，预期修改Z自己的工作区与 `p4-design-zhou-v81.md` 中A范围及其独立WI/交接。两项都只依赖冻结基线：

- 允许路径不重叠；
- H矩阵只引用 `P4Z.A.StatisticsProjection`，不复制或改写定义；
- Z 17-A不依赖本矩阵的业务结论，H队列01也不等待17-A的新增设计；
- 两包自检完成后才进入共同Review Gate；此前双方不得领取各自下一修改项。

## 7. 本轮验证与未执行事项

### 7.1 矩阵自检范围

WI-0020交接记录保存实际命令与结果，至少覆盖：冻结HEAD和工作区范围、六份冻结输入SHA证据复用、Markdown本地文件/显式锚点、追溯键唯一性、12项BD、10个簇、28项AT、21项GAP、4项PENDING、三组Contract SHA与状态词完整性。

### 7.2 NOT_EXECUTED

- 产品代码、Android/Web/Backend构建、单测、集成测试、E2E、真实权限或并发；
- OpenAPI修改、Contract发布、codegen、三端round-trip与未知值拒绝；
- 数据库DDL、migration、回填、真实数据盘点、备份、恢复、回退；
- AI/OCR真实性能、错误样本、生产服务、部署与监控；
- Git commit、push、PR、merge、rebase、reset、clean或stash。

因此，本文件完成后仅进入逻辑 `READY_FOR_REVIEW`（控制面 `READY_FOR_HANDOFF`），等待同批Z 17-A完成后交换整包。它不把任何 `NOT_EXECUTED` 项提升为 `EXECUTED`，也不改变Phase 4/5门禁。

## 8. 最终决定、Phase 2与后续阶段追溯

<a id="p4-trace-final-alignment"></a>

### 8.1 旧结论替代表

| 旧记录 | 当前正式记录 | 当前结论 |
|---|---|---|
| §0.2、§1～6中的P-01～04 `PENDING/BLOCKED` | H §19.2～19.5；Z §12.2～12.3；G2 §13.2 | 四项均`DECISION_ACCEPTED / DESIGN_ALIGNED` |
| §0.3 canonical `UNKNOWN`及G3阻塞 | H §19.6；Z §12.1；G2 §13.1 | Phase 5唯一起始输入为`CON-011 / 1.2.0-contract RC / 667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a` |
| GAP-H13 `BLOCKED` | H §19.7；Z §12.3；G2 §13.2 | 所有已认证`TEACHER`只读可见历史remark；学生及其他出口不可见；新成绩无remark |
| §6.2 Phase 2/REQ映射未完成 | 本节§8.3及Z §12.4 | 以实际Phase 2交付路径、BD和AT完成Phase 4对应；不虚构REQ编号 |
| 全文旧`Phase 4 IN_PROGRESS / Phase 5 LOCKED` | 本节§8.5、STATUS及最终Handoff | `Phase 4 DONE / Phase 5 READY` |

### 8.2 决定到设计与验收

| 决定 | 正式设计Owner | 下游消费 | AT/检查 | 状态 |
|---|---|---|---|---|
| P-01 六类均不适用且仅剩未证实疑虑 | H-B/F §19.2 | Z-C/E §12.3 | AT-02、05～07 | `DESIGNED/VERIFIED`；runtime `NOT_EXECUTED` |
| P-02 普通首次受理/同批传输 | Z-C §12.2、Z-E §12.3 | H-B、G1、G2 §13.2 | AT-19、20、24；严格端点反例 | `DESIGNED/VERIFIED`；runtime `NOT_EXECUTED` |
| P-03 两个学校工作日SLA | H-B/F §19.4 | Z-C/E、G2 §13.2 | AT-08及日历/暂停并集模型 | `DESIGNED/VERIFIED`；真实校历`NOT_EXECUTED` |
| P-04 错误逾期追加纠错 | H-B/F §19.5 | Z-E、G2 §13.2 | AT-08、23～25 | `DESIGNED/VERIFIED`；runtime `NOT_EXECUTED` |
| GAP-H13 历史remark教师可见 | H-F/G3 §19.7 | Z-E、G2 §13.2、G1出口 | AT-18/25及隐私出口检查 | `DESIGNED/VERIFIED`；Contract/迁移`NOT_EXECUTED` |

P-02的规范谓词为：普通首次`acceptedAt < endedAt + 24h`，同一锁定批次全部必需对象`completedAt < acceptedAt + 30m`，等号均拒绝并使用服务器时间。合法受理后的链不因课程关闭或成员移出被截断；游泳15/30/24和教师补证24/72仍是独立专门规则。

### 8.3 Phase 2交付物对应

| Phase 2正式交付 | Phase 4需求/设计 | Phase 5～8接力 | 证据状态 |
|---|---|---|---|
| `docs/rebuild/phase-2/android/p2a-student-ui/page-inventory.md`与`user-flows.md` | B/C/E/F业务场景；G1 UI→Use Case路径；AT-01～08、16、18～25 | Contract Owner Phase 5；Android/Web Phase 6/8 | 对应已补齐；真实接口`NOT_EXECUTED` |
| `state-matrix.md`与`interaction-accessibility.md` | 七状态映射B/F/G1 | Contract错误/状态Phase 5；Mock Phase 6；接入Phase 8 | 设计对应完成；全量设备证据留Phase 10 |
| Phase 2 Android UI foundation最终交接 | 学生不见成绩/等级/排名，连接失败不伪造维护，通知fail closed | Android Owner Phase 6/8；Release Owner Phase 11 | Phase 2 UI证据复用；产品整体未完成 |
| 运动取证/材料UI | C材料版本、P-02普通规则、游泳专门规则、B补证规则 | Contract Phase 5；Backend/Media Phase 7；客户端Phase 8 | 规则对应完成；真实上传/E2E留Phase 9 |
| 入班、关闭、通知与恢复UI | E邀请/成员/结算、G2恢复、G1投影 | Contract Phase 5；Backend Phase 7；客户端Phase 8 | 设计对应完成；真实环境留Phase 9/10 |

Phase 2材料未提供独立完整REQ编号集合，因此本矩阵使用其正式路径、页面/状态标识、既有BD和AT作为稳定键；这是可验证的实际对应，不创造伪REQ。原§6.2治理缺口就Phase 4交付而言已关闭。

### 8.4 已批准延期事项

| 事项 | Owner | 完成阶段 |
|---|---|---|
| CR-005、新Contract Version/SHA及Phase 4 wire表达 | Contract Owner | Phase 5 |
| Android/Web Contract生成与Mock、旧API清单 | Android/Web Owner | Phase 6 |
| 版本化学校工作日表、Backend状态机、Schema与迁移实现 | Academic Term/Data/Backend Owner | Phase 7 |
| Android/Web真实模块接入、FCM关闭 | Client/Android平台Owner | Phase 8 |
| 本地E2E、真实迁移/恢复演练 | Environment/Data/Backend Owner | Phase 9 |
| Staging、隐私定稿、全量七态/无障碍 | Staging、隐私/运营、设计Reviewer | Phase 10 |
| Release签名、发布与生产门禁 | Release Owner | Phase 11 |

### 8.5 最终状态

当前矩阵覆盖12项业务源、A/B/C/D/E/F/G1/G2/G3、AT-01～28、GAP-H01～H21及Phase 2实际交付对应。业务决定与Contract起始身份已确定，开放Phase 4 Finding为0；产品、Contract改写、数据库、Migration、部署和E2E仍`NOT_EXECUTED`。最终门禁为`Phase 4 DONE / Phase 5 READY`。
