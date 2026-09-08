# Phase 6 → Phase 7 后端接收包

本包用于 H/Z 接收新版 Phase 7「Backend 垂直切片实现」。Phase 7 负责人为 H/Z，Reviewer 为用户本人；每个小任务由 H/Z 明确一位执行 Owner。用户继续负责总体架构、Contract Owner 和 6C 汇总。依据用户原话：“ok，审核通过，我们主要是要交接给phase7的同学”“负责人是H和Z，reviewer依旧是我”。

## 1. 当前状态与启用条件

**6C 技术门禁和进度一致性修复已获用户接受；收尾包待用户提交并合并新的 PR。** PR #11 已合并，实际基线为 `93d18fd317e0f622bf306b8707ea1d92d23322dd`。本轮补丁在 `codex/phase6c-progress-consistency`，不再更新已关闭的 PR #11。

顺序为：用户上传本轮已审修复和收尾记录 → 创建/审核/合并新 PR → 核验实际交付与合并 Commit、文件字节及固定 Contract → Phase6 DONE / Phase7.0 READY → H/Z 报送并获准执行7.0方案。H/Z现在可阅读准备；不得把客户端通过或收到资料写成7.0兼容验证通过。

最新阶段依据为[6C汇总验收](new-req-phase-6c.md)和[核对证据](new-req-phase-6c-evidence/verification.json)。历史报告保留原时点；新交付SHA来自实际Git提交/上传回执，新合并SHA来自本轮PR真实记录，H/Z在7.0入场时登记，不用旧基线代填。这样无需仅为填未来SHA再提交一轮文档。

| 对象 | 固定身份 / 当前事实 |
|---|---|
| 仓库 | `https://github.com/chchaiai/new_need_version_sports.git` |
| 已核验 main / PR #11合并 | `93d18fd317e0f622bf306b8707ea1d92d23322dd` |
| Android 交付来源 / PR #12合并 | `333f6dfa42f89cbee9cce387638d05a88a7fdd74` / `5800550d369e1c7acf5223773d244689a7cfe0df` |
| Web R05/R06修复来源 | `ef9c6312411ce6198d406665945d99be4c6e7082`；与PR #11合并树相同 |
| 本轮进度修复与6C记录 | `codex/phase6c-progress-consistency`，以本轮新PR实际提交为准 |
| Phase7 使用的代码基线 | 本轮收尾PR合并后、经完整SHA和已审文件核验的main Commit；不是单独的93d18fd基线 |
| 唯一协议 | `1.3.0-contract / RC`；公开路径 `/api/v1` |
| OpenAPI SHA-256 | `5c87eeb9bca39585cea2e3c80c60d58813b4367e1a60b161ed8c7f82af4a19ed` |
| 协议来源 Commit | `f702c590ff10b11f7de038332868c988ab4cec11`；当前协议字节未变 |

## 2. 接收方阅读顺序

1. 根 `AGENTS.md`、后端目录适用的 AGENTS、[当前状态](../STATUS.md)；确认新工作区、分支、完整 HEAD、dirty state、Owner、Reviewer 和可写路径。旧目录保留，独立克隆/检出，不覆盖历史仓库。
2. 四份业务权威正文：[总览](../../business/00-overview.md)、[学生](../../business/10-student-flow.md)、[教师](../../business/20-teacher-flow.md)、[管理员](../../business/30-admin-flow.md)。
3. Phase 4 当前已合并设计：[H 设计](../../architecture/new-requirements/p4-design-huang-v81.md)、[Z 设计](../../architecture/new-requirements/p4-design-zhou-v81.md)、[联合增量](../../architecture/new-requirements/p4-design-deltas-v81.md)、[迁移/恢复](../../architecture/new-requirements/p4-migration-note.md)、[最终设计交接](new-req-phase-4.md)。旧接受快照 SHA 不冒充当前文件 SHA。
4. 三份架构蓝图：[架构](../../architecture/backend-architecture.md)、[依赖规则](../../architecture/backend-dependency-rules.md)、[模块边界](../../architecture/backend-module-boundaries.md)。分层和依赖约束继续有效；其中过时业务/协议条款按下节处理。
5. [Phase 5 正式输入包](../../../contracts/validation/step07_handoff/README.md)、[OpenAPI](../../../contracts/openapi.yaml)、[metadata](../../../contracts/contract-metadata.json)、[发布清单](../../../contracts/release-manifest.json)、[操作目录](../../../contracts/operation-catalog.md)、[变更索引](../../../contracts/change-requests/README.md)、[追溯表](../../../contracts/validation/step07_handoff/traceability.json)、[992 固定用例](../../../contracts/validation/step07_handoff/fixtures.json)。
6. [Android 交付](new-req-phase-6-android.md)、[Web 交接及接收侧修复说明](phase-6b-web-handoff.md)、[先前 R05/R06 接受记录](phase-6b-web-review-evidence/verification.json)，最后读[6C最终结论](new-req-phase-6c.md)和[最新验证](new-req-phase-6c-evidence/verification.json)。

完整路线原件随 start4 资料包交接：`01_phase_guides/Phase_06_Android_Web_Contract与Mock验证.docx`、`Phase_07_Backend垂直切片实现.docx`。需要完整阅读正文与表格，不能用 preview.html 代替。

### 避免把历史约定重新实现

三份旧架构蓝图仍有 `1.2.0-contract`、旧“Phase 6.0 Backend”编号；架构§7仍写提交后初始化 `VALID`，模块表仍有 `0/60/120` 计入和新成绩备注等旧描述。它们不是本轮新接口或业务要求。

本轮协议和业务以已接受的 1.3.0 及四份当前正文、Phase 4 增量为准：处理阶段与终局结果分离；时长/计入来源分离；新成绩无 remark，历史备注仅按既有只读权限提供；学生出口禁止成绩、等级、排名和历史备注。H/Z 在 7.0 对这些已知旧条款作输入对齐登记并给 Reviewer 复核；若发现尚无正式决定的新矛盾，再提最小问题，不能自行选一个版本实现。本包不重写架构或产生新业务规则。

旧 `phase-5a/5b/5ga/5gb` 文件名保留作历史验证入口，不按文件名认定新版 Phase。两个历史 `4.0.1-contract` 候选及各步 DRAFT 均不得作为后端输入。

## 3. Phase 5 和两端已经完成什么

Phase 5 交付了评审后的 API 操作、DTO、权限/错误、上传/幂等和状态边界，以及固定 Version/SHA 和可复现语料。它没有实现真实服务。

| 成果 | 已验证范围 | 证据性质 |
|---|---|---|
| Android 6A | 324 模型生成/构建；1156 协议输入、255 Mapper、71 Mock；模拟器74/74，横屏大字体1/1；独立人工启动器模拟器2/2 | 沿用已接受来源及仓库证据，本次未重跑设备 |
| Android 人工 | 用户 iQOO12Pro 查看独立审查 APK 并接受 | 用户报告；不是46项真机自动化或完整正式App验收 |
| Web 6B + 6C修复 | 学生92/92、Portal247/247、类型/生成一致性/构建通过；进度新增21项回归 | 实际已审修复字节测试，日志随包；247含定向107项，不累加。先前R05/R06为226项及20复核输入 |
| R05 | 未知计入量贯穿单条、教师/管理员汇总和展示，不编造零值、剩余量或达标结果 | Mapper/汇总及真实 React 渲染回归 |
| R06 | 固定协议生成运行时校验器，两端在映射前拒绝不合规DTO；保留合法输入 | required/null/范围/格式/嵌套未知字段/条件约束等；合法及非法例对照 |

Web 构建有大于500 kB的 chunk 提示；未进行本轮浏览器人工、真实性能或后端E2E验收。Windows 测试使用外部 `python3`→现有 Python 环境适配，未降低断言。复现命令见 [Web 校验器维护说明](../../../BNBU-Sports-Web-new/frontend/student/js/contract/README.md) 和 [Android 验证入口](../../../BNBU-ANDROID/contract-validation/README.md)。

## 4. 6C 收口记录与剩余发布事项

- 两端分别由用户接受；本轮用户原话“好的，审核通过，准备交接收尾”，关闭 `6C-WEB-PROGRESS-01` 并授权收尾。已审产品修复字节以最新verification内SHA为准，未代签独立Reviewer。
- 6C补做逐例对应：三组原union59例（七个合法分支），实际Web校验器的54个共同schema输入，3个进度对照均与未变Android已接受证据一致。Android保留历史结果，不标成本轮设备重跑；Web重算隐去数字与Android明确展示历史均不冒充当前结果。
- 当前技术门禁通过，已知阻塞Contract CR为0，本次Client Defect已关闭；Contract版本/状态/SHA未变。Backend `BE-CR005-COMPAT` 仍为7.0待执行门禁。
- **发布尚待用户执行**：本轮新PR合并并核验实际交付、合并SHA和已审字节后，Phase6 DONE / Phase7.0 READY 条件生效。此前不以PR #11合并替代本轮修复发布，不登记H/Z已经实际接收或7.0已经开工。
- 原Android16项Finding、Web R01–R07/G01和本轮进度Finding按各自接受记录收口；Legacy、校历、真实后端等后移责任继续保留。

## 5. H/Z 首个工作包：7.0 Foundation

进入实现前，由 H/Z 报送7.0方案，用户作为Reviewer确认；技术栈尚未由本包选定。最小工作包应包含：

1. 固定基线、实际语言/框架/生成器/ORM/测试工具版本、唯一执行Owner、Reviewer、允许路径和测试环境。只读跨目录不转为跨目录写权限。
2. **BE-CR005-COMPAT**：所选后端生成/消费方案加载上述原始协议，验证三组原union的七合法分支、其他相关union、required/null/省略、枚举、整数/日期、未知字段、合法往返及内部命令映射。真实结果及工具版本留证，不能用Android/Web通过代替。
3. 核对包括 `CertificationKind` 在内的 Contract→Application→Domain→Database 表示；禁止生成DTO或ORM Entity穿透业务层。对旧架构业务条款按§2作对齐，不复制旧wire。
4. 建立最小 Composition Root、配置与错误边界、健康检查、真实 PostgreSQL 连接及架构测试。迁移只在批准测试库执行；不先铺满空模块/TODO/Fake Success。
5. 7.0报告实际命令、工作目录、依赖版本、退出码、日志与失败处理。兼容性和设计对齐未通过，不得关闭7.0或进入7.1。

技术/适配问题在后端任务内修复；真协议缺陷返回Phase5走CR、新Version/SHA并通知两端重验；业务未定义交用户/对应业务Owner。不可用私有字段、静默默认或Legacy fallback绕过。

## 6. 后续切片及必须交付的真实证据

| 切片 | H/Z 负责实现并由用户复核的重点 |
|---|---|
| 7.1 Auth / Identity | 真实认证、首次改密、会话撤销、禁用、角色/资源归属、维护门禁和审计 |
| 7.2 Course / Enrollment | 规则版本、邀请严格截止、加入/移出/关闭；生命周期变化不截断合法原链，也不恢复新开资格 |
| 7.3 Exercise Session | 服务器时间、有效区间与状态机、实际时长、并发/重试、原始与计入事实分离 |
| 7.4 Media / Record | 分配/直传确认/归属/内容校验；普通首次24h、同批30m和专用窗口分别按已接受规则执行；对象存储与DB故障恢复 |
| 7.5 Review / Statistics | 处理态与终局分开、一次补证、逐轮SLA、维护暂停、P-01/P-04、当前与历史结果；完整来源统计/结算及修正历史 |
| 7.6 Admin / 其他已接受模块 | 按操作目录拆分；名单/OCR草稿与教师确认、服务治理、只读历史、隐私和已接受管理范围；不得新增代审/接管 |

每片都要交付真实持久化、migration/回滚验证、权限、异常、并发、幂等、Contract conformance和可启动版本；五项架构报告分别说明依赖检查、DTO泄漏、ORM泄漏、跨模块 Repository/表访问、事务归属及理由。业务事实与必要审计原子提交；对象存储、OCR等外部I/O不能假装与DB同一个本地事务。

某片通过后即可交Phase8接入该片，不要求整个后端完工后才通知客户端。

## 7. 不能丢失的后移责任

- [21项GAP处置](../../../contracts/validation/step06_final/disposition.json)保留完整索引。其早期 `PENDING_STEP_7` 是生成当时的历史状态，后续协议接受依据Phase5正式发布记录；`runtimeAcceptance/NOT_RUN`仍是尚须实现的责任。
- **实际校历**：Academic Term/Data业务Owner仍须提供版本化权威校历和覆盖范围；H/Z负责接入、边界及暂停交集验证。H/Z后端负责人身份不自动代替校历业务Owner。未知日历不得默认周一至周五或连续48h。
- **P-01～04**：既有规则已决定，后端需要落实；技术检查失败不等于检查完成，截止等号/原链/同批身份/故障后追加纠错不可由客户端补推。实现以完整正文、Phase4增量与协议为准。
- **AI/OCR、存储、恢复与性能**：合成语料不证明真实质量；H/Z在相应切片交适配器和故障测试，真实评估Owner及学校样本按获准范围落实，Phase7～9留证。
- **正式客户端**：Android由用户、Web由甘洛夷在Phase8迁移；旧API、缓存、Mock/DEV_ONLY及FCM清理不转给后端冒充已经完成。Web旧LM-01～24、教师Dashboard/通知中心完整UI按已登记范围继续跟踪。
- **最终验收**：Phase9真实本地E2E/恢复，Phase10 Staging与完整七态/隐私/无障碍，Phase11发布门禁。没有“前端测试通过，所以后端/完整App/上线零Bug通过”的结论。
- **继承工具问题** `VALIDATION_SCRIPT_GATE_SCOPE_MISMATCH`：Phase5旧发布检查对后移Backend接收及历史STATUS的检查范围仍有已登记问题。使用已记录的固定输入核验，不降低协议断言；后续工具维护单独处理，不把检查器错误包装成真实协议变化。

## 8. H/Z 接收回复模板

请实际核验后填写，不提前回复PASS：

```text
已收到 Phase 6 → Phase 7 接收包。
入场仓库 / 分支 / 完整 Commit：
Contract Version / Status / 实际 SHA-256：
已读取的业务、Phase4设计、架构及Phase5/6输入：
6C最终回执与Phase7.0入场状态：
7.0执行Owner（H或Z） / Reviewer（用户）：
拟用技术栈与版本、允许路径、测试环境：
BE-CR005-COMPAT及Domain/Database对齐计划：
实际校历提供者/来源待落实项：
已知阻塞或需Reviewer决定的最小问题：
```

GitHub提交/推送/PR/合并及云端、真实数据操作继续由用户执行。本次交接不实施Backend、数据库、迁移或部署。H/Z收到本轮已核验合并基线后先回复上述入场信息，由用户确认7.0小任务方案。
