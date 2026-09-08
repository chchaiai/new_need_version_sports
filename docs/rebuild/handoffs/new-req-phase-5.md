# 新版 Phase 5：新 API Contract / OpenAPI

## 2026-09-08 新版Phase5 DONE，Phase6 READY / NOT_STARTED

- 新版Phase5「新 API Contract / OpenAPI」完成7/7步。用户已作为Contract Owner/Reviewer审核接受，协议及验证包已通过PR #9发布，合并后文件树与已审核来源一致；本地最终状态/分工回填待用户同步GitHub，不改变已发布协议身份。
- 实际来源Commit：`f702c590ff10b11f7de038332868c988ab4cec11`；已发布合并输入基线：`d7e241ebf5293eb0fed42187544fedc73ecef53f`；[PR #9](https://github.com/chchaiai/new_need_version_sports/pull/9)于2026-09-08T04:20:43Z合并。开发基线`974587c3778a53803a7959ea0f64677581e239f4`只用于历史对比，不能作新RC输入。
- Contract：`1.3.0-contract / RC / 5c87eeb9bca39585cea2e3c80c60d58813b4367e1a60b161ed8c7f82af4a19ed`；157 paths /176 operations /316 schemas /99 errors。公开路径仍`/api/v1`，有破坏性变更。RC未提升为APPROVED，未授权部署。
- 最新明确分工：6A Android开发、总体架构及6C验收结果汇总由用户负责；6B Web负责人为甘洛夷。未代填Web接收、Review或实际加载结果。Phase5任务书T09交付跨端验证包；两端实际加载确认、逐任务Reviewer与可写路径属于Phase6 T01，不额外加作Phase5技术门禁。Backend7.0人员及选型兼容在该阶段入场落实，未通过不得进入7.1。
- [最终接收入口](../../../contracts/validation/step07_handoff/README.md)、[Web交接要求](../../../contracts/validation/step07_handoff/WEB_HANDOFF.md)、[发布与分发清单](../../../contracts/release-manifest.json)固定来源、版本、SHA、差异和后续责任。12个BD、28个AT、41个Phase2学生页面、21个GAP及992固定协议用例均有对应。
- 既有同SHA验证：Python/JS/JVM各992例通过，159实际生成模型往返，324Kotlin模型编译、143结构破坏、723有限设计模型通过；生成/verify/lint/readiness均通过。GitHub该PR没有运行CI，不写CI PASS。本次只回填发布事实/分工并检查范围、哈希、链接，不重复执行字节和源未变化的全套协议测试。
- 本次仅六份文档/清单回填；OpenAPI、生成源、验证代码、既有结果与业务/Phase4架构输入均保持原字节。产品Android/Web、Backend、DB/Migration/infra未改；现有旧API/Mock/占位未迁移，未新增产品Mock/TODO/空接口。
- Phase6实施尚未开始。实际Android/Web工程加载与Mock验证、真实后端鉴权/校历/来源/事务/存储/OCR/缓存通知/恢复/性能/E2E均由后续阶段完成，不因Phase5 DONE提前通过。GitHub提交/推送/PR/合并继续由用户操作。

以下第六步及更早记录为各自历史停点。

## 2026-09-08 新版Phase5第六步本地完成（整体IN_PROGRESS）

- 已完成6/7步，剩1步；第六步“固定新RC并完成最终协议门禁”完成后停止，第七步尚未开始。用户兼任Contract Owner/Reviewer，Codex执行与自检；GitHub由用户操作，未代签人类最终Review。
- 用户确认版本策略：`1.3.0-contract / RC / 5c87eeb9bca39585cea2e3c80c60d58813b4367e1a60b161ed8c7f82af4a19ed`，公开路径仍`/api/v1`，但与旧协议不兼容。157 paths /176 operations /316 schemas /99 errors。基线HEAD仍`974587c3778a53803a7959ea0f64677581e239f4`，分支`codex/phase5-contract-v81`；候选尚未提交，不把该HEAD写成新RC来源提交。
- 统一第2～5步CR和21项GAP处置；同步名单源的全局/旧上传描述与已接受的保留、确认流程。完成三组新增union及全部六组映射检查；从生成配置和可追溯模板修复nullable/数字布尔枚举/省略字段问题，未手改生成DTO或放宽协议。
- 最终同SHA证据在`07_phase5_execution/T06/verification-04-rc`：两次生成一致，verify/lint/RC readiness全部exit0；Python/JS各992/992，143项结构破坏均检出，723有限设计模型通过；TS159合法/24非法断言与往返，324个Kotlin模型编译；JVM992/992，其中159合法样例实际生成模型往返保持字段和值。
- F06-01～03技术Finding均CLOSED_SELF_VERIFIED；人类最终Review、候选source commit、Phase6具名接收人及GitHub发布待第七步。RC readiness只是一项检查，不代表整个Phase5已接收或允许Staging。
- 本步业务/Phase4架构输入字节保留，产品Android/Web/Backend、DB/Migration/infra、旧仓库未改；未stage/commit/push/merge/部署。无新增业务规则；Contract描述/版本和生成验证方案有变化。无新增产品Mock/TODO/空接口，现有旧API消费者未迁移。
- Phase6仍须实际Android/Web Contract+Mock验证及6C；Backend7.0必须完成选型兼容与CertificationKind等Domain/Database对齐，未通过不得关闭7.0/进入7.1。真实鉴权、校历、数据来源、并发事务、AI/OCR质量、缓存通知、恢复/性能/E2E均NOT_RUN；不以协议用例冒充产品可用或零Bug。

证据：[验证入口](../../../contracts/validation/step06_final/README.md)、[同SHA结果](../../../contracts/validation/step06_final/result.json)、[CR/GAP](../../../contracts/validation/step06_final/disposition.json)、[候选分发清单](../../../contracts/release-manifest.json)。下一步仅在用户授权第七步后做最终Review与接收材料、具名分发及用户GitHub操作；本步不自行开始。

以下各步骤的版本、计数、停点和待办属于历史，以本节及当前metadata为准。

## 2026-09-08 新版Phase5第五步本地完成（整体IN_PROGRESS）

- 本地完成5/7步，剩2步；5.1名单→5.2耐力OCR→5.3技术治理→5.4学生全出口/历史备注已经完成，现停止，不进入第六步。用户兼任Owner/Reviewer，Codex执行/自检，未代签独立Review；GitHub仍由用户操作。
- 工作目录`start4/repos/phase5-contract`；分支`codex/phase5-contract-v81`，HEAD仍`974587c3778a53803a7959ea0f64677581e239f4`，没有commit/push/merge/部署。未提交候选`1.3.0-contract.phase5-step05.1 / DRAFT / bb57149dd3a28926ae3d9daa5345353b5529c03fc13c6ba2e338851c1924159c`，157 paths /176 operations /316 schemas /99 errors。
- 完成用途/课程绑定来源、名单纸图草稿与显式身份确认、完整snapshot发布和综合名单/导出；耐力4.30歧义保留、明确日期/秒数、所有选中行及来源前驱预检后原子确认、原文/纠错历史保留。仅SUPER治理AI/OCR配置与人工窗口，无新增分管理员或跨教师代审权限，真实探测与缺来源分开。
- 学生只取原始耐力与学时，移除最终成绩入口及转换分/等级/排名/remark，通知拆专用安全DTO；缓存、通知、下载、日志等全出口约束进入Contract。新grade无remark；历史remarks保留，仅全体已认证当前TEACHER只读并审计，不按原责任人/成员/分组收窄。用户明确授权两份业务正文同步已有H13，无新增业务决定，其余业务/Phase4设计字节保留。
- 最终验证`07_phase5_execution/T05/verification-03`：生成两次/verify/lint通过；Python/JS各273例、34结构破坏、248有限设计模型；TS58合法/9非法断言与往返，357 Kotlin模型编译。第4步436例/39变体/437模型，第3步224例/21变体/38计时，原CR-00559例/39变体和JS/JVM回归通过。
- DRAFT readiness exit1仅因DRAFT，为EXPECTED_BLOCKED。新Android模型运行拒绝待第六步候选门禁/Phase6，编译不等于运行验证；Backend7.0兼容及Phase7鉴权/来源/真实学校样本/事务，Phase9缓存通知/恢复/E2E均NOT_RUN。没有产品Mock/TODO/空接口新增；现有旧API/消费者未迁移，不宣称产品已运行。
- 最后完整编译前发现耐力batch误带名单专属null-only字段，已在源定义删除并重生成；未手改DTO。早期测试输入/路径失败及修复记录保留，不将旧SHA证据挪作当前结论。

证据：[本步CR](../../../contracts/change-requests/CR-20260908-003-teaching-governance-privacy.md)、[验证入口](../../../contracts/validation/step05_teaching/README.md)、[机器结果](../../../contracts/validation/step05_teaching/result.json)。第六步须用户下一条授权，并按原计划处理最终唯一Version/Status/SHA及候选门禁；最终Review接收仍在第六～七步，不提前宣布Phase5 DONE。

以下停点/版本/计数为历史，以本节和当前metadata为准。

## 2026-09-08 新版 Phase5 第四步本地完成（整体IN_PROGRESS）

- 用户授权“开始第4步”，4.1统计/规则模板→4.2邀请→4.3关闭结算已完成；本地累计4/7步，剩3步。现停止，不进入第五步。用户兼任Owner/Reviewer，Codex执行/自检，未代签独立Review；GitHub由用户操作。
- 工作目录`start4/repos/phase5-contract`，分支`codex/phase5-contract-v81`，HEAD仍`974587c3778a53803a7959ea0f64677581e239f4`。候选`1.3.0-contract.phase5-step04.1 / DRAFT / 90e7bbb0af1988e1212a631c775d5d6a3e80e59f7da9b79a05f09da8f276a06b`，132 paths /146 operations /261 schemas /87 errors，尚未提交。
- 统计绑定不可变规则、完整来源/前驱及检查点，m/q/a分开，三分列和1199未达标保持；课程发布前精确可完成性校验、发布后锁定，达标/日周名额不阻止真实运动。模板仅SUPER发布，无新增分管理员权限。
- 邀请默认30分钟、5～120可选，原服务器流程固定一次10分钟宽限、两个严格端点、撤销/关闭立即终止未完流。预览只读；新学生明确开始时登记匿名流程，邮箱身份在最终入班验证，不收紧成到期前必须完成OTP。
- 课程关闭不被待办阻塞，只阻止新起点；原合法未首次受理和锁批传输均保留并阻塞结算。具名补练仅原7天收尾；完整Owner/成员/检查点原内容/前驱在共同保护下冻结报告，纠错追加历史版本，学期归档检查完整课程集合。
- 源重复生成/verify/lint通过；Python/JS各436例、39变体、437有限模型；TS43合法/9非法断言与往返、290 Kotlin模型编译。第三步224例/21变体/38计时和CR-00559例/39变体回归通过。最终证据`07_phase5_execution/T04/verification-03`。
- DRAFT readiness exit1为EXPECTED_BLOCKED，不能写RC PASS。新增Android运行兼容待第六步/Phase6，Backend7.0选型兼容及Phase7真实来源/身份/校历/事务、Phase9恢复/E2E未运行；前端产品、DB/Migration/部署/GitHub未操作。
- 本步未改四份业务正文或架构输入，保留第三步字节；仅Contract源/生成物/验证/说明和既有状态交接变化。没有产品Mock/TODO/空接口；原项目旧API引用尚待后续迁移。

证据：[CR](../../../contracts/change-requests/CR-20260908-002-statistics-invitation-settlement.md)、[验证入口](../../../contracts/validation/step04_courses/README.md)、[机器结果](../../../contracts/validation/step04_courses/result.json)。第三步前驱完整Contract快照在`07_phase5_execution/T04/step03-baseline`，入场41个既有改动文件全部核验一致；本步模型reference精确引用A-08并验证SHA。下一步须用户授权第五步：名单/OCR、AI治理、学生可见范围及历史remark；不自行开始。

以下第三/二步停点及身份仅为历史，不能拿旧结果替代本步最终SHA。

## 最新停点：第三步本地完成，等待第四步授权

本地完成3/7步，剩4步；Phase5整体IN_PROGRESS。用户仍兼任Owner/Reviewer，GitHub由用户操作。本轮明确授权四份业务正文只同步P-01～04，已应用并核对提案SHA；历史remark决定的正文承接属于第五步范围，不在此次同步内。以下第一/二步“当前停止/第三步未开始”是历史记录，以本节为当前停点。

候选`1.3.0-contract.phase5-step03.1 / DRAFT / 2569c529c4ce332b25d6cc66b281b52c31cf160db5e46181ad552838cdb0df87`，HEAD仍`974587c3778a53803a7959ea0f64677581e239f4`且尚未提交。完成材料受理/传输、审核/补证、SLA/故障纠错读取；3.1～3.4本地交付齐备，最终接收尚待第六/七步。源与产物均更新，不能再拿第二步SHA运行其固定源patch断言；第二步完整快照在`07_phase5_execution/T03/step02-baseline/contracts`。

验证：两次构建一致、verify/lint通过；Python/JavaScript各223例、21项破坏变体、38项有限计时模型通过；TypeScript17合法/9非法断言及往返、249 Kotlin生成模型编译、原CR-005七分支59例/39变体回归通过。readiness exit1仅因DRAFT，记EXPECTED_BLOCKED。新增Android联合类型运行兼容必须第六步定向验证并在Phase6接收，不能用全模型编译代替；Backend7.0选型兼容、Phase7真实实现/校历和Phase9运行恢复/E2E仍NOT_RUN。

证据：[CR](../../../contracts/change-requests/CR-20260908-001-material-review-timing.md)、[验证入口](../../../contracts/validation/step03_workflow/README.md)、[机器结果](../../../contracts/validation/step03_workflow/result.json)及外部`07_phase5_execution/T03/verification-03/`。失败已保留：旧结果enum断言、未使用枚举warning、TypeScript默认值必填行为；均有定向诊断和修复，未手改生成DTO。

下一步是第四步4.1统计/规则模板→4.2邀请→4.3关闭结算，仍须先获用户明确指令。特别核对结算同时消费尚未首次受理和已锁批传输中的合法原链。当前DRAFT的统计及其他旧接口尚未覆盖全部新业务，不能供产品迁移。未新增产品Mock/TODO/空接口；历史旧API引用和未迁移消费者仍按路线保留，不声称整个项目已清理。未执行GitHub或真实服务。


2026-09-08，Phase5整体IN_PROGRESS。用户已接受三处源修复、Android生成/校验方案与后端Phase7.0验收安排，并授权完成第二步。用户兼任Contract Owner与Reviewer，Codex执行/验证/整改；陈昊此前“待审查”保留历史。接受记录依据用户实际对话，不虚构其运行命令或额外签署。

本地执行完成2/7步，剩余5步；第二步成果现交用户查看，第三～七步未开始。当前停止等待下一步确认，GitHub由用户操作。必要克隆已授权由Codex放在start4/repos独立目录完成，仍须核验地址/分支/提交/Contract身份，不覆盖旧目录。

## 第一步：入场核验

- Repository：`https://github.com/chchaiai/new_need_version_sports.git`
- 入场 main：`974587c3778a53803a7959ea0f64677581e239f4`；tree：`07b1af351a2c63079a9097b6a554932722e3f62d`。
- 工作目录：`D:\DT\soprts\start4\repos\phase5-contract`；工作分支：`codex/phase5-contract-v81`；开始时 clean。
- 适用规则：根 `AGENTS.md`。第一步仅修改交接/状态与外部证据。第二步允许范围及实际协议变化见下节；业务/产品仍未改。
- Phase 4 修复提交 `4080553625fa02982a8ad5d1a85c3cc812108e69` 已获 PR #8 审核并合并；与入场提交整树相同。完整仓库基线不能用旧 Contract 来源提交 `73945754…` 代替。
- 第一步入场协议为 `1.2.0-contract / RC`；SHA-256：`667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a`；109 paths / 121 operations / 193 schemas / 66 errors。

## 已执行检查及证据

原始日志在用户资料包 `07_phase5_execution/T01/`，总台账为 `07_phase5_execution/执行台账.md`。31 份输入哈希与新克隆一致，含权威规则、生成源及脚本。

| 检查 | 真实结果 |
|---|---|
| `python -B -X utf8 contracts/scripts/verify_contract.py` | exit 0，旧 RC 规模与规则通过 |
| `python -B -X utf8 contracts/scripts/check_rc_readiness.py` | exit 0；该脚本不证明所有 CR 已关闭 |
| schema 冒烟 | 2 个合法及 4 个非法用例全部到达断言，6/6 |
| openapi-typescript 7.13.0 | 生成 exit 0，但三组共7个分支得到错误 schema 名 literal，CR-005 复现 |
| Redocly 2.51.2 | 初次在 valid 后 libuv 退出断言，exit 3221226505；相同规则设置 `REDOCLY_TELEMETRY=off` 后 exit 0 |

Python 3.12.14、PyYAML 6.0.3、jsonschema 4.26.0、referencing 0.37.0；Node 24.14.1、npm 11.11.0；TypeScript 5.9.3。依赖与生成输出隔离于资料包，不写正式客户端。

上述工具检查先在 `phase4-pr8-repair` 只读执行；整树与31份输入哈希核验支持复用到新克隆。日志保留实际 cwd，不宣称在新目录重跑。Java 21.0.10 已发现，仓库 Android generator pin 为7.24.0；本步未运行 Android 生成或编译。未发现仓库 GitHub workflow，不登记 CI 通过。

## 输入与后续任务

- GAP-H01～H21 全部有初始处置：H19 并入 H07；H14 已取消接管不新增 API，后续实现验证拒绝；H21 真实 AI/OCR 质量与性能归后续运行验证。其余进入计划第二～五步，已完成设计不等于 Contract 已实现。
- [CR-005](../../../contracts/change-requests/CR-20260901-005-explicit-discriminator-mappings.md)第一步仍为PROPOSED；本轮用户接受后已实施三处修复，见第7节最新记录，不能把旧状态当当前阻塞。
- 四份业务正文需要承接已接受 P-01～04 和历史 remark 决定。尤其当前“纠错不重新开放补证入口”须说明 P-04 已确认故障的有限例外；这是同步已有决定，不是新增业务决策。正文修改不在当前路径授权内。
- 真实学校工作日日历归 Phase 7 运行输入，不补造数据；Backend生成/映射方案在Phase7.0确定并验证；Phase6 Android/Web接收人按入场落实。

## 第二步：已接受修复的本地实施与验证完成

- 工作基线HEAD仍为`974587c3778a53803a7959ea0f64677581e239f4`，候选为未提交工作区内容，不冒充已发布提交。
- 当前候选`1.2.1-contract.phase5-step02.1 / DRAFT`；OpenAPI SHA-256：`1df0e8a1b50b3b4c0cfa128064e8da714f949c761eec9aae9e9e64179d374b27`。旧RC保留原Git字节与外部快照；早期0.0.0审查实验保留为历史。
- 三处源patch SHA为`9574cec5e6bb5b3fb4e0279e71bf71e51777fb9d73419527a7a5ca1466fe0511`，实际应用与接受补丁一致。build仅修改候选版本、状态和接受CR列表，其他业务源不变，输出完整语义比较无其他变化。
- 从实际源独立构建两次，与工作区OpenAPI/catalog/metadata全部字节一致。下游探针读取工作区当前OpenAPI，不在测试时另加补丁。
- verify结构检查通过，原规则断言保留，新增mapping gate；新旧Schema各59/59、39项映射破坏检出；TypeScript七合法/28非法类型断言及七次往返通过；196个Kotlin模型编译；JavaScript/Kotlin运行时各59/59及七次往返；lint通过。
- 本次16个外部检查命令15个exit 0；readiness为预先定义的exit 1，唯一原因是DRAFT。保留原门禁，不能把该结果写成RC readiness PASS；本步完成不等于最终RC可发布。

[验证说明](../../../contracts/validation/step02_discriminators/README.md)、[机器结果](../../../contracts/validation/step02_discriminators/implementation-result.json)与外部`07_phase5_execution/T02_implementation/verification-01/`给出完整证据；旧T02及T02_completion不改写。Kotlin14个相关wrapper/182个原模板模型与协议guard只证明本步隔离范围；guard不是完整Schema验证器。

## 后续验收与当前停点

原CR第5.5条后端验证要求依用户确认和新版任务书落实到`BE-CR005-COMPAT / Phase7.0`，状态NOT_RUN/SCHEDULED_PHASE_7_0；Backend Owner执行、Reviewer复核，入场落实人员，由用户总负责人跟踪。选型后先验证冻结协议，未通过不得关闭7.0/进入后续业务切片；不单独阻断Phase5/6，不把未测写成PASS。协议缺陷仍返回Phase5升版并重验。

Phase6完成两端固定最终Version/SHA的类型/序列化/Mock/受影响构建与6C汇总；正式运行网络链路迁移属Phase8。第二步已完成本地实施和检查，用户可查看当前差异；最终Phase5接收及发布仍在第六～七步，当前不进入第三步。

第三步首先是3.1普通首次受理与同批传输协议。四份业务正文对已接受P-01～04/历史remark决定的承接问题仍需在消费相关规则前处理；不得因CR-005完成而越权修改业务正文或补造规则。H20本步修复，其余GAP按已确认七步计划继续。

本轮修改相关Contract源/配置/生成物/验证与说明，未改业务规则、架构、正式客户端、Backend/数据库/Migration或infra；未新增产品Mock/TODO/空接口，旧API及占位按后续路线处理。未commit/push/merge/部署，未执行真实服务、Android/Web产品集成、数据库、上传/时钟/恢复或E2E。
