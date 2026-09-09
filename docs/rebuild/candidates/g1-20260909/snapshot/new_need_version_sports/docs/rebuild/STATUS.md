# 当前进度状态

## 2026-09-09 Phase 7.0 Foundation 已接受，SEC-01 已关闭；发布合并候选

- 7.0 执行 Owner Z，H 完成一次定向审核及 SEC-01 关闭复核；用户在关闭后明确要求开始，并授权 H 侧代理执行 GitHub 提交、PR 与合并核验。
- 原始入场/Phase6C合并基线：`200ff07e22ff6e2e253d965765a498088af2463c`。Phase6发布条件已满足，下方旧待发布字段是历史快照。
- 已接受 Foundation：Docker 单入口、真实 HTTP/PostgreSQL 健康检查、migration、Foundation 事务、CertificationKind 四层映射及 BE-CR005-COMPAT。Z 的完整 G0 原始结果为1035/1035（Contract1003、Architecture18、Integration14），0失败/0跳过。H核对候选与结果绑定，未重复运行Docker。
- SEC-01 CLOSED：新 audit 在 `2026-09-09T03:06:49.072Z` 为0告警，绑定 lockfile `4ee60feb03aa2cec5d71d572045936f7986ea2638efc8cba7363e04f4851e9af`。该结果是当时依赖公告快照，不是全系统安全认证。
- Contract保持 `1.3.0-contract / RC / 5c87eeb9bca39585cea2e3c80c60d58813b4367e1a60b161ed8c7f82af4a19ed`。业务、Contract、Android、Web不变。
- 本发布候选合并并核验已审字节后，7.0 DONE / G1 READY条件生效；实际PR和合并SHA以GitHub及入场核验为准，不预填未来SHA。详见[7.0接受与发布记录](handoffs/new-req-phase-7-0-acceptance.md)。原[Z修复交接](handoffs/new-req-phase-7-0-foundation.md)保留为验收前证据快照。
- G1计划为Z负责7.1+7.2、H负责7.3+7.4；从同一实际合并Commit建立独立工作区并冻结Port/表Owner后并行。业务认证、权限、媒体服务和业务事务尚未实现或验收；正式客户端旧API/Mock迁移仍归Phase8。

## 2026-09-09 Phase6C 技术验收通过；修复与Phase7接收记录待同一PR发布

- 用户已明确“好的，审核通过，准备交接收尾”。6C进度Client Defect `6C-WEB-PROGRESS-01` 关闭；新增阻塞Contract CR为0。用户兼任Android/架构/Contract Owner、6C汇总和人类Reviewer，Web Owner甘洛夷；Phase7 Owner H/Z，Reviewer用户。
- PR #11真实来源 `ef9c6312411ce6198d406665945d99be4c6e7082` 已合并main `93d18fd317e0f622bf306b8707ea1d92d23322dd`，两者文件树相同；Android与已接受来源 `333f6dfa42f89cbee9cce387638d05a88a7fdd74` 无差异。本轮 `codex/phase6c-progress-consistency` 另建PR，不继续使用PR #11。
- 已审Web修复：学生92/92、Portal247/247（含定向107和新增21项）、类型/生成一致性/构建通过。6C逐例对应：三组原union59/59、当前Web校验器54/54、进度3/3，与未变Android已接受证据一致；未重跑设备，不将Mock、协议用例当成真实后端测试。
- 唯一Contract保持 `1.3.0-contract / RC / 5c87eeb9bca39585cea2e3c80c60d58813b4367e1a60b161ed8c7f82af4a19ed`。本次无业务/协议/架构/Android/Backend/数据库或部署改动；产品改动仅此前已审Web Mapper及测试。
- **当前本地验收已通过，发布待用户操作。** 本轮修复和收尾记录合并到main并核验实际交付/合并SHA及已审字节后，Phase6 DONE / Phase7.0 READY 条件生效；H/Z尚未实际接收，7.0尚未开始。实际未来SHA取Git/PR记录并由7.0入场回填，不为填写未来SHA再补纯文档PR。
- [6C验收与证据](handoffs/new-req-phase-6c.md)、[H/Z后端接收包](handoffs/new-req-phase-6-to-phase-7.md)已更新。7.0仍须人类确认技术栈/Owner/路径并通过BE-CR005-COMPAT及CertificationKind等Domain/Database对齐；7.1不能跳过。正式客户端旧API/Mock迁移留Phase8，真实Backend/E2E/恢复/性能和上线验收继续后移。

以下为历史记录，上方状态和6C交接优先。

## 2026-09-08 Web R05/R06 用户接受；面向 H/Z 准备 Phase7 交接

- 用户明确“ok，审核通过，我们主要是要交接给phase7的同学”；Phase7负责人H/Z，Reviewer为用户。Web本地修复与交接文件已接受，用户将上传到原PR #11。实际修复交付Commit/合并Commit尚未产生，不以`164201b1ba36154dfbdc346d061f30fd98602902`入场基线冒充。
- 本次实测学生92/92、Portal226/226，类型检查、确定性生成与构建通过；R05未知计入量贯穿汇总展示，R06固定Schema运行时校验；原复核20输入符合预期。原同事133项及全部关闭陈述保留为历史。[用户接受与日志](handoffs/phase-6b-web-review-evidence/verification.json)。
- Android来源`333f6dfa42f89cbee9cce387638d05a88a7fdd74`已在PR #12合并main `5800550d369e1c7acf5223773d244689a7cfe0df`。两端Contract保持`1.3.0-contract / RC / 5c87eeb9bca39585cea2e3c80c60d58813b4367e1a60b161ed8c7f82af4a19ed`。
- [Phase6→Phase7接收包](handoffs/new-req-phase-6-to-phase-7.md)交代固定身份、输入与旧条款、7.0兼容门禁、切片交付和后移责任。H/Z可先读资料；PR #11合并后仍须核验实际基线并完成6C最终验收，才登记Phase6 DONE/Phase7.0 READY。Phase7.0未开始，BE-CR005-COMPAT未运行，7.1尚不可开始。
- 本次只新增接收/验证记录，已审产品修复字节未再改变；Contract、业务正文、架构正文、Android、Backend与数据库/部署未改。真实后端/E2E/性能未验收，旧API/Mock和Phase8责任继续保留。GitHub由用户操作。

以下记录为各自时点的历史状态，以上更新优先。

## 2026-09-08 Phase6A DONE + Phase6B Web DONE（PR #11 待合并，随后 6C）

### 6A Android（main 已接受）

- Android七步本地计划已完成7/7；用户兼任Owner/架构负责人/人类Reviewer，已在手机查看独立人工审查APK并明确接受第6步，授权本次第7步收尾。GitHub发布待用户操作，未代填交付Commit、PR通过或合并。
- 当前Android分支`codex/phase6a-contract-mock`，开发基线`2ba9355e38373b8d2350eb8efe4071048337c320`。Phase5协议及其最终分工记录已在该main基线汇合。Contract仍为`1.3.0-contract / RC / 5c87eeb9bca39585cea2e3c80c60d58813b4367e1a60b161ed8c7f82af4a19ed`，来源`f702c590ff10b11f7de038332868c988ab4cec11`，未改版本或状态。
- Android独立工程实际生成324模型并构建，1156协议用例、255Mapper、71Mock通过；真实模拟器74/74、同APK横屏大字体1/1通过。人工启动器另有模拟器2/2，用户iQOO12Pro人工查看通过；不写真机自动化46/46或完整App验收。
- 第3～6步15项Android Finding和第7步1项复现入口Finding均关闭，开放Android Finding及新增阻塞Contract CR为0。Phase5发布检查将后移Backend7.0接收人算入门禁的继承工具问题仍单列。另已修复主机入口因当前STATUS正常推进导致旧发布哈希报错：不可变输入继续核验当前字节，仅历史STATUS取固定入场Commit，再运行原校验器；未改Contract断言。正式App旧API/Mock/旧1.2验证绑定与Phase8迁移责任保留。
- 入口：[Android阶段交接](handoffs/new-req-phase-6-android.md)、[接收记录](handoffs/new-req-phase-6-android-evidence/acceptance.json)、[原始证据](handoffs/new-req-phase-6-android-evidence/README.md)。

### 6B Web（PR [#11](https://github.com/chchaiai/new_need_version_sports/pull/11)，`e04b0f8`，审查整改完成）

- 分支`codex/phase6b-web`；T01–T08完成；Owner甘洛夷。交接：[phase-6b-web-handoff](handoffs/phase-6b-web-handoff.md)。
- PR #11审查报告`REQUEST_CHANGES`项R01–R07+G01全部关闭：`loadApiWorkspace` TDZ修复；`processingStage`→processing审核态；`cappedCompletedMinutes`分类完成量；UNAVAILABLE不填零；`creditedMinutes`保持null；两端wire运行时校验；Fixture续传窗口30分钟。
- 测试：学生smoke **92/92**；Portal `npm test` **133/133**；`npm run typecheck` exit 0。未改Contract字节、业务正文、Android、Backend。
- Android与Web分开审查；Web待PR #11合并后由用户执行6C跨端汇总。整个Phase6继续IN_PROGRESS；Phase7.0等待6C阶段验收。正式App迁移、真实Backend/E2E未验证；无部署或零Bug承诺。

以下为历史停点，其“Phase6 NOT_STARTED”等状态已由上方当前记录更新；保留原文便于追溯。

## 2026-09-08 Phase6B Web T04–T08 完成（审查前）

- **T04** 学生端：`phase6b-contract-mapper.js` + `api.js` 双轨；smoke **90/90**。
- **T05** Portal：`phase6b-contract-mapper.ts` + `teacher-data.ts` 双轨；1.3.0 文案；原生 `<select>` → `AppSelect`。
- **T06** Portal 全量 `npm test`：**130/130**（含 `rendered-html`）。
- **T07** `phase5gb-contract-revalidation`：**13/13**（`python3`；ADMIN gated 54 项对齐 1.3.0）。
- **T08** 6B 完成回执：[phase-6b-web-t08-completion](handoffs/phase-6b-web-t08-completion.md)。正式网络迁移仍归 Phase 8。

## 2026-09-08 Phase6B Web T04 学生端运行时 Mapper 完成

- 新增 `frontend/student/js/phase6b-contract-mapper.js`：1.3.0 严格读取（`ExerciseRecord` / `StudentCourseProgress` / `publicReason` / 非法值拒绝）。
- `api.js`：`mapServerRecord`、`mapStudentProgressProjection`、`selectCurrentStudentProgress`、`mapProgressTarget` 双轨支持 legacy 与 1.3.0 contract wire。
- `v81-review.js`：支持 `publicReason.code` → 六类固定公开原因；`checkin.js` 文案升至 1.3.0（补证动作已定义，生产后端未就绪前不写）。
- `student-smoke.mjs`：**90/90 通过**（新增 3 项 phase6b mapper 用例）。未改 Contract、业务正文、Android、Backend。

## 2026-09-08 Phase6B Web T03 fixture 对齐完成

- 分支 `codex/phase6b-web`；基线仍为 `2ba9355` / `1.3.0-contract` / `5c87eeb9…f4a19ed`。
- 新增 `phase5b-contract-shared-fixtures.ts`：统一 `publishedRule`、`StatisticsCheckpoint`、`MaterialVersion`、`RecordReviewSummary` 等 1.3.0 结构。
- 学生端与 Portal fixture 已对齐：`StudentCourseProgress`（checkpoint/state）、`ExerciseRecord`（material/review）、`Course`（publishedRule）、邀请预览、`StartExerciseSessionRequest`、审核 union、`CourseCreateRequest.rule` 等。
- 移除 1.2.0 残留：`finalGrade`、`creditedMinutes`、`studentVisibleReason`、`categories` 顶层进度字段。
- `npm run typecheck` **通过**；`phase5b-contract-revalidation` + `phase5b-contract-mock` **22/22 通过**。
- `phase5gb-contract-revalidation`：**NOT_RUN**（测试依赖本机 `python` + PyYAML 解析 OpenAPI，当前环境无 `python` 命令）。
- 未改 Contract、业务正文、Android、Backend。产品运行时 JS（`api.js` 等）仍待后续 Mapper 迁移任务。

## 2026-09-08 Phase6B Web T01 已接收，T02 绑定升级进行中

- Phase6 入场基线：`2ba9355e38373b8d2350eb8efe4071048337c320`（PR #10 合并后）；独立工作区 `new_need_version_sports-phase6b`，分支 `codex/phase6b-web`；原目录 `new_need_version_sports` 保留不动。
- Contract：`1.3.0-contract / RC / 5c87eeb9bca39585cea2e3c80c60d58813b4367e1a60b161ed8c7f82af4a19ed`；工作区实测 SHA 一致，dirty state clean（T01 后 T02 有未提交 Web 改动）。
- 6B Web 负责人：甘洛夷；6A Android、总体架构、6C 汇总：用户。T01 接收回执见 [phase-6b-web-t01-receipt](handoffs/phase-6b-web-t01-receipt.md)。
- T02 进度：`verify-phase5b-contract.mjs` 与两端 fixture 常量已升至 1.3.0；`phase5b:contract:generate` + `--check` 通过（Portal/Student 生成物一致，14352 行）。**T03 已完成**：fixture/Mock 对齐 1.3.0，`npm run typecheck` 通过。
- Phase5 通过不代替 Web 本轮验证；正式网络迁移仍归 Phase8；后端未构建不单独阻断 Phase6。

## 2026-09-08 新版Phase5 DONE，Phase6 READY / NOT_STARTED

- 新版Phase5「新 API Contract / OpenAPI」完成7/7步。用户已作为Contract Owner/Reviewer审核接受，协议及验证包已通过PR #9发布，合并后文件树与已审核来源一致；本地最终状态/分工回填待用户同步GitHub，不改变已发布协议身份。
- 实际来源Commit：`f702c590ff10b11f7de038332868c988ab4cec11`；已发布合并输入基线：`d7e241ebf5293eb0fed42187544fedc73ecef53f`；[PR #9](https://github.com/chchaiai/new_need_version_sports/pull/9)于2026-09-08T04:20:43Z合并。开发基线`974587c3778a53803a7959ea0f64677581e239f4`只用于历史对比，不能作新RC输入。
- Contract：`1.3.0-contract / RC / 5c87eeb9bca39585cea2e3c80c60d58813b4367e1a60b161ed8c7f82af4a19ed`；157 paths /176 operations /316 schemas /99 errors。公开路径仍`/api/v1`，有破坏性变更。RC未提升为APPROVED，未授权部署。
- 最新明确分工：6A Android开发、总体架构及6C验收结果汇总由用户负责；6B Web负责人为甘洛夷。未代填Web接收、Review或实际加载结果。Phase5任务书T09交付跨端验证包；两端实际加载确认、逐任务Reviewer与可写路径属于Phase6 T01，不额外加作Phase5技术门禁。Backend7.0人员及选型兼容在该阶段入场落实，未通过不得进入7.1。
- [最终接收入口](../../contracts/validation/step07_handoff/README.md)、[Web交接要求](../../contracts/validation/step07_handoff/WEB_HANDOFF.md)、[发布与分发清单](../../contracts/release-manifest.json)固定来源、版本、SHA、差异和后续责任。12个BD、28个AT、41个Phase2学生页面、21个GAP及992固定协议用例均有对应。
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

证据：[验证入口](../../contracts/validation/step06_final/README.md)、[同SHA结果](../../contracts/validation/step06_final/result.json)、[CR/GAP](../../contracts/validation/step06_final/disposition.json)、[候选分发清单](../../contracts/release-manifest.json)。下一步仅在用户授权第七步后做最终Review与接收材料、具名分发及用户GitHub操作；本步不自行开始。

以下各步骤的版本、计数、停点和待办属于历史，以本节及当前metadata为准。

## 2026-09-08 新版Phase5第五步本地完成（整体IN_PROGRESS）

- 本地完成5/7步，剩2步；5.1名单→5.2耐力OCR→5.3技术治理→5.4学生全出口/历史备注已经完成，现停止，不进入第六步。用户兼任Owner/Reviewer，Codex执行/自检，未代签独立Review；GitHub仍由用户操作。
- 工作目录`start4/repos/phase5-contract`；分支`codex/phase5-contract-v81`，HEAD仍`974587c3778a53803a7959ea0f64677581e239f4`，没有commit/push/merge/部署。未提交候选`1.3.0-contract.phase5-step05.1 / DRAFT / bb57149dd3a28926ae3d9daa5345353b5529c03fc13c6ba2e338851c1924159c`，157 paths /176 operations /316 schemas /99 errors。
- 完成用途/课程绑定来源、名单纸图草稿与显式身份确认、完整snapshot发布和综合名单/导出；耐力4.30歧义保留、明确日期/秒数、所有选中行及来源前驱预检后原子确认、原文/纠错历史保留。仅SUPER治理AI/OCR配置与人工窗口，无新增分管理员或跨教师代审权限，真实探测与缺来源分开。
- 学生只取原始耐力与学时，移除最终成绩入口及转换分/等级/排名/remark，通知拆专用安全DTO；缓存、通知、下载、日志等全出口约束进入Contract。新grade无remark；历史remarks保留，仅全体已认证当前TEACHER只读并审计，不按原责任人/成员/分组收窄。用户明确授权两份业务正文同步已有H13，无新增业务决定，其余业务/Phase4设计字节保留。
- 最终验证`07_phase5_execution/T05/verification-03`：生成两次/verify/lint通过；Python/JS各273例、34结构破坏、248有限设计模型；TS58合法/9非法断言与往返，357 Kotlin模型编译。第4步436例/39变体/437模型，第3步224例/21变体/38计时，原CR-00559例/39变体和JS/JVM回归通过。
- DRAFT readiness exit1仅因DRAFT，为EXPECTED_BLOCKED。新Android模型运行拒绝待第六步候选门禁/Phase6，编译不等于运行验证；Backend7.0兼容及Phase7鉴权/来源/真实学校样本/事务，Phase9缓存通知/恢复/E2E均NOT_RUN。没有产品Mock/TODO/空接口新增；现有旧API/消费者未迁移，不宣称产品已运行。
- 最后完整编译前发现耐力batch误带名单专属null-only字段，已在源定义删除并重生成；未手改DTO。早期测试输入/路径失败及修复记录保留，不将旧SHA证据挪作当前结论。

证据：[本步CR](../../contracts/change-requests/CR-20260908-003-teaching-governance-privacy.md)、[验证入口](../../contracts/validation/step05_teaching/README.md)、[机器结果](../../contracts/validation/step05_teaching/result.json)。第六步须用户下一条授权，并按原计划处理最终唯一Version/Status/SHA及候选门禁；最终Review接收仍在第六～七步，不提前宣布Phase5 DONE。

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

证据：[CR](../../contracts/change-requests/CR-20260908-002-statistics-invitation-settlement.md)、[验证入口](../../contracts/validation/step04_courses/README.md)、[机器结果](../../contracts/validation/step04_courses/result.json)。下方第三/二步停点为历史，以本节为准。

## 2026-09-08 新版 Phase5 第三步本地完成（整体IN_PROGRESS）

- 用户授权整步第三步，并明确允许四份业务正文仅同步已接受P-01～04；没有新增业务选择。用户兼任Contract Owner/Reviewer，Codex执行/自检；最终成果Review/RC接收仍待第六～七步，不代签陈昊。
- 本地已完成3/7个主步骤，剩余4步。第三步3.1～3.4完成；当前停止，不进入第四步。GitHub由用户操作，未commit/push/merge/部署。
- 工作区`start4/repos/phase5-contract`，分支`codex/phase5-contract-v81`，HEAD仍为`974587c3778a53803a7959ea0f64677581e239f4`；候选是未提交字节。
- 当前`1.3.0-contract.phase5-step03.1 / DRAFT / 2569c529c4ce332b25d6cc66b281b52c31cf160db5e46181ad552838cdb0df87`；117 paths、129 operations、226 schemas、75 errors。第二步候选及原1.2.0 RC有独立不可变快照，不混用身份。
- 完成材料首次受理/原链/同批续传、处理阶段/六类动作/公开原因、一次补证、学校SLA/暂停/追加纠错读取。旧立即VALID、自由文本判断和固定0/60/120 Record字段由本CR替代；完整统计、邀请结算和治理隐私继续第四/五步。
- 源两次生成一致，verify/lint通过；Python与JavaScript各223例，21项变体、38项计时模型通过；TypeScript17合法/9非法断言与往返通过，249个Kotlin生成模型编译，CR-005旧七分支59例及39变体回归通过。
- DRAFT readiness实际exit1为EXPECTED_BLOCKED，未放宽门禁。新增Android联合类型运行验证留第六步候选门禁及Phase6；Backend选型兼容在7.0、实际状态机/数据/权限/校历在Phase7、恢复/E2E在Phase9，均未伪称运行通过。
- [CR](../../contracts/change-requests/CR-20260908-001-material-review-timing.md)、[验证入口](../../contracts/validation/step03_workflow/README.md)、[机器结果](../../contracts/validation/step03_workflow/result.json)。仅相关Contract/验证/状态交接和获准四份业务正文有变化；架构、产品、DB/Migration/infra、旧仓库未改。


## 2026-09-08 新版 Phase 5 第二步本地完成（整体IN_PROGRESS）

- 用户确认三处源映射修复、Android包装模型/校验方案及后端验收按新版Phase7.0执行，并授权继续完成第二步。用户兼任Contract Owner和Reviewer；Codex执行/验证/整改。接受记录归档用户实际对话，不表示用户亲自运行测试；陈昊此前“待审查”为历史，没有登记其通过。
- 按7个主步骤统计，本地执行已完成2步，剩余5步。第二步改动及本次结果现交用户查看；当前停止，不进入第三步，不提前登记最终Phase5接收。每步完成后等待下一步确认，GitHub仍由用户操作。
- Git根目录`start4/repos/phase5-contract`，分支`codex/phase5-contract-v81`，HEAD仍为`974587c3778a53803a7959ea0f64677581e239f4`，tree基线`07b1af351a2c63079a9097b6a554932722e3f62d`。本轮为未提交工作区变更，HEAD不包含新候选。
- 新工作候选：`1.2.1-contract.phase5-step02.1 / DRAFT`；SHA-256：`1df0e8a1b50b3b4c0cfa128064e8da714f949c761eec9aae9e9e64179d374b27`。只落实CR-005三处mapping，其他新版协议工作仍待完成；不得作为最终RC消费。旧`1.2.0-contract / RC / 667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a`保留于固定Git提交及外部baseline快照。
- 实际源补丁与接受的SHA一致，其他业务源保持；两次独立构建与工作区三产物一致。verify通过，mapping完整性已接入原verify；JSON Schema新旧各59/59、39项破坏变体全部检出、TypeScript七合法/28非法断言及往返通过、Kotlin196模型编译通过、JavaScript/Kotlin运行时各59/59和七次往返通过、lint通过。
- RC readiness实际exit 1，唯一原因是DRAFT不可发布，记录为EXPECTED_BLOCKED而非PASS；原门禁未放宽。最终RC在第六～七步统一定稿、检查及接收。
- Phase6完成两端验证轨与Consolidation；Phase8迁移正式网络链路。后端`BE-CR005-COMPAT`为NOT_RUN/SCHEDULED_PHASE_7_0，选型后由Backend Owner/Reviewer执行、用户跟踪，未通过不得关闭7.0或进入7.1；不单独阻断Phase5/6，实际协议缺陷仍阻塞适用阶段。
- 修改仅相关contracts源/配置/生成物/CR/说明/验证材料，以及本页、handoff与外部证据。业务正文、架构正文、正式Android/Web/Backend、数据库、infra、旧仓库未改。未commit/push/merge/部署。
- [本步验证说明](../../contracts/validation/step02_discriminators/README.md)与[机器结果](../../contracts/validation/step02_discriminators/implementation-result.json)记录真实范围及限制；[Phase5交接](handoffs/new-req-phase-5.md)给出第三步前置。

以下为此前各轮记录，发生冲突时按上方最新固定基线和阶段记录判断。

> 本轮修复候选：`PR8-DOC-FIX-01 / PATCH_PREPARED / OWNER_REVIEW_PENDING`。仅补齐既有合法Session在首次材料受理前遇关闭/移出的P-02分支，并校准交付SHA。原阶段退出及H/Z接受记录属于下述来源提交；不表示本候选已获新一轮互审或负责人验收。当前候选不得直接作为Phase 5正式开工基线；验收及远端提交后再核验。来源：`25bc20dcf19ac4646a16a1e27f076ac360e27da0`；本轮证据见`docs/rebuild/handoffs/phase-4-final-alignment-review.md`。

> 更新时间：2026-09-07
>
> 当前工作：Phase 4 V8.1 已完成最终互审和负责人决定对齐，进入阶段退出；下一阶段为 Phase 5 API Contract / OpenAPI。
>
> 完成状态：`Phase 4 DONE`；`Phase 5 READY`。H/Z正式设计、追溯矩阵、联合汇总及修改后最终互审均已接受；P-01～04、GAP-H13和Contract起始身份均已决定并落实。产品、数据库、Migration、真实恢复和E2E仍为后续阶段`NOT_EXECUTED`。
>
> main已有Web通知`targetRoute`修复保持不变，见[PR #6](https://github.com/chchaiai/new_need_version_sports/pull/6)与[V8.1 Web交接](handoffs/2026-09-05-web-v81-align.md)。

本页按各部分的具体情况记录当前进度。后续工作的数字编号和事项见 [项目 README](../../README.md#后续开发路线)。

## 本轮 Phase 4 V8.1 联合设计收尾（DONE）

- 最终版本：H `P4H-FINAL-ALIGN-1.4`、Z `P4Z-FINAL-ALIGN-1.2`、G2 `P4Z-G2-FINAL-ALIGN-1.2`、矩阵`P4-TRACE-V8.1-1.3`、联合汇总`P4-HZ-FINAL-ALIGN-1.1`。旧PENDING/UNKNOWN/LOCKED仅作历史快照，均有最终替代登记。
- P-01～04已按负责人决定对齐。实际学校工作日表作为运行输入转后续阶段，不再视为Phase 4业务规则未决。
- Phase 5起始Contract固定为`main / 73945754a8dbd490709a0a92fda696febf6433eb / 1.2.0-contract / RC / 667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a`。两个4.0.1仅作历史候选。
- 用户确认双方最终互审完成且无待整改Finding，并直接确认结束Phase 4。CR-005和新Contract发布进入Phase 5；不把它们标为已执行。
- 普通首次材料由Z-C正式固定：服务器`acceptedAt < endedAt + 24h`；同一锁定批次`completedAt < acceptedAt + 30m`；等号拒绝，边界前服务器已确认的合法Session/Record，即使材料尚未首次受理也保留原窗口；已受理的保留原同批传输，结算识别两类合法未完链。所有教师可只读查看历史FinalGrade remark，学生不可见，新成绩不创建remark。
- Phase 2页面清单、流程、七状态矩阵及Android UI foundation已在最终矩阵§8.3对应到B/C/E/F/G1/G2与AT；后续Contract/客户端/Backend/数据/环境/Release Owner和Phase 5～11完成阶段已登记。

- 原始设计基线为`main@dbdedf9be958af08dd4a2c56d23191c626cca625`；H设计阶段分支为`codex/phase4-huang-review-timing`，统一发布分支为`docs/phase4-v81-partial-handoff`。Contract仍为`1.2.0-contract / RC / 667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a`。
- P4-Z归档前v10 为 `8eb159dd…aafe`，登记被接受 v9 `d3f5b911…229a46`；G2接受登记快照 `7618a69a…1f62`，H 内容 Review 版 `55b04e2c…e6d4`；联合汇总 `8ff37739…567c` 已由 H 定向确认，无 P0/P1 finding。 这些SHA标识接受/审阅快照，当前归档文件由Git提交与路径定位。
- [P4-H 正式整包](../architecture/new-requirements/p4-design-huang-v81.md) 位于仓库内唯一落点，包含 B/D/F/G1/G3；归档前被接受源快照SHA-256为 `cb5f01c61784f002ad43947f52f505653821678ecda7cb50d957b4be3ea5126d`。不另建重复的客户端分层或 Contract 缺口正式副本。
- H↔Z 八项引用为 8 确认/0 不一致/0 待补；ISS-019/020/021 已闭合。联合汇总 J-11 中“未发现 H 仓库内正式稿”仅是 Z 隔离工作区观察，现已由 H 确认实际落点。
- 四项原PENDING已由负责人决定并完成设计对齐；GAP-H15～H18按Phase 4关闭。实际日历表仍作为后续运行输入，不冒充已提供。
- GAP-H13已按“所有教师只读可见历史remark”关闭。`CR-20260901-005`继续作为Phase 5 Contract工作；不得据Phase 4 DONE直接进入Backend、数据库/Migration、正式客户端binding或E2E。
- H原设计阶段仅修改H正式稿、本页及Handoff；周润基已接受其整包并获负责人授权，统一发布Z主稿、G2、联合汇总、H整包、Handoff、STATUS六份文档。此次只归位文件并调整链接/接受/发布元数据，外部源附件及四项`.DS_Store`不动。业务正文、Contract、产品代码、数据库/Migration和infra不改；不合并或部署。发布检查见PR说明，不重跑稳定算法及上游测试。

## 本轮 Web V8.1 展示设计（复审修复已重测）

- 业务权威为 `origin/main@8c9826822f35876f8d01480f8baf184027711dfe` 的 V8.1 四份正文；协议权威为仓库 `1.2.0-contract`。
- 已按 PR #5 复审：恢复 1.2.0 绑定/门禁；退回补证与学生补证包不再非正式写入；删除有限审核授权；英文 `score/grade/rank/points` 通知拦截；拆出模板/OCR/补录/1.3.0 邀请写入。
- PR #6：`mapServerNotification()` 保留正式 `targetRoute`；`FINAL_GRADE` 整条省略；`EXERCISE_RECORD` / `APPLICATION` 按路由打开，不再误进打卡页。
- 未改 Contract、业务正文、Android、Backend。正式补证、维护剩余秒、锁定批次续传仍只在交接表登记。

## 前次删除指定待决说明

- 用户要求先忽略并删除总览“0.4 待决边界”，版本仍为 V8.1；已删除该标题、说明与表格，清理四份当前业务正文对该节的引用，不在其他当前业务章节重新列出该表。
- 本次是文档删减，不等于原问题已得到业务答案；不新增公开分类、不改变已确认审核/期限/SLA 等规则，也不将此前讨论建议视为 ACCEPTED。
- 开始分支 `codex/latest-main-20260904`，HEAD 为 `98ef558355e75dfd62dee6e8a806d6da7ebf5f17`；工作区、暂存区干净，PR #3 仍 OPEN，沿用同一分支追加提交。
- 修改四份业务正文、本页、新增[章节删除交接](handoffs/2026-09-04-business-remove-pending-section.md)，并仅将既有复核交接的一处失效链接固定到删除前 Git 快照；共七份文档。历史交接正文及旧提交保留，历史记录中的第 0.4 节描述属于删除前状态。
- 七份文档精确差异、V8.1 保持、三份六类原因表与 19 项共享规则检查通过；50 处本地链接、3 处锚点、259 行表格及格式检查通过，83 个受保护文件哈希不变；Git 范围和空白检查通过。未修改 Contract、客户端、Backend、数据库、两份 README 或部署配置，未运行产品测试。

## 前次业务版本更正（历史记录）

- 用户明确本次最新业务逻辑应为 V8.1，原 v8.0 当前版本标记有误。本轮只更正版本及发布说明，不新增业务决定，六类公开原因、BD-20260904-01/02 和四项 PENDING 原样保留。
- 开始分支 `codex/latest-main-20260904`，HEAD 为 `5fb596baafeefb91f426f6bfadd6cde609e9dff7`；工作区和暂存区干净。远端 PR #3 仍 OPEN，head 与本地一致；沿用同一分支追加提交，不新开 PR、不合并、不部署。
- 更正四份业务权威、业务目录 README 和项目 README 的当前版本标记；同步本页并新增[版本更正交接](handoffs/2026-09-04-business-version-v8.1.md)，共八份文档。项目 README 仅替换三处当前版本，历史方案和既有交接中的 v8.0 保留。
- Contract 仍为 `1.2.0-contract / RC`，不改变版本、SHA 或生成物；客户端、Backend、数据库和业务参数均未改。既有旧 API、Mock/演示和占位目录未迁移或清理。
- 本轮精确版本替换与业务条款/PENDING 保持检查通过；82 处本地链接、12 处锚点、280 行表格及格式检查通过，81 个受保护文件哈希不变，Git 范围和空白检查通过；具体结果见版本更正交接。未运行产品构建、单测或 E2E：本轮仅修改文档版本标记和交付说明。

## 前次业务文档 PR 发布（历史记录）

- 用户授权将最新业务逻辑提交到目标仓库 PR。本轮发布既有已确认文档，不把上一轮针对四项 PENDING 的建议视为接受，不新增业务决定。
- 开始基线：`codex/latest-main-20260904` / `49d992a1333294ea561923cfea0b7d25864a4d91`；六份已跟踪文档修改、三份新增交接，暂存区为空。已核对 `project` 对应目标仓库，`origin` 为不同的 Backend 仓库；未向其他远程推送。
- 业务内容提交：`c173c6aaedf9c7f8bfdd6c66b360320ae8cb5839`，精确包含开始时的九份文档。推送 `project` 的 `codex/latest-main-20260904`，创建 [PR #3](https://github.com/chchaiai/new_need_version_sports/pull/3) 指向 `main`；本页及[发布交接](handoffs/2026-09-04-business-pr-publication.md)随同一 PR 分支回填。
- PR 创建后核验为 OPEN、非草稿、MERGEABLE / CLEAN；当时 head 与内容提交一致，base 为 `49d992a1333294ea561923cfea0b7d25864a4d91`，远端九个文件与本地范围一致。状态查询没有返回 CI 检查项，不代表 CI 通过；最终发布范围与证据见交接。
- 提交前九份文档 UTF-8、围栏、空白、302 行表格、57 处本地链接及 8 处锚点检查通过；共享规则与上一轮已验证版本一致。根 AGENTS 与全部 Contract 跟踪文件共 39 个受保护文件哈希不变，暂存范围与文件内容检查通过。发布交接回填后，十份文档的 323 行表格、68 处本地链接、8 处锚点及格式检查通过；前述 39 个文件与八份原样发布文档共 47 个文件哈希不变。
- 发布总范围为四份业务权威、业务目录 README、STATUS、三份既有交接及一份新发布交接，共十份文档；本轮只新增发布交接、更新 STATUS，其他八份待发布文档原样提交。未切换分支、重写提交、合并、直接推送 main 或部署。
- 未运行产品构建、单元测试、Backend/数据库、真实上传/计时/通知/权限或 E2E；本轮没有对应实现改动，不把文档检查、可合并状态或 PR 创建当作产品验收。

以下三节保留前次修改的执行记录；其中“本轮”“未提交”等描述属于各次历史时间点，相关文档现已随 PR #3 提交。

## 前次复核决定同步（历史记录，已随 PR 提交）

- 开始基线：`codex/latest-main-20260904` / `49d992a1333294ea561923cfea0b7d25864a4d91`；开始时四份业务正文和 STATUS 已修改，两个前次交接未跟踪，暂存区为空。本轮保留这些改动，不提交、推送、切分支、合并或部署。
- `BD-20260904-02 / ACCEPTED`：补证后经教师判无效直接终结，不再补证；六类公开原因不增项，不将仍有疑虑等同已证实违规。
- 用户补充确认本版责任教师完成本学期教学，不存在学期中删除责任教师；取消原删除后的有限审核接管、授权入口、权限与待办流程，保留完成教学后的常规账号治理和历史保留。对应业务目录入口仅同步这一能力说明。
- 学生补证与教师 SLA 在维护期间暂停，服务端确认恢复 NORMAL 后继续剩余时间；不扣除维护时段，不重新发放完整窗口。教师端维护时只展示公告，不保留原本人改密例外；管理员明确允许的安全治理能力保持。
- 教师 SLA 从异常正式进入待办开始；通过/判无效/退回成功结束本轮。退回启动学生 24/72 小时计时，补证正式受理结束学生计时，并开启新的教师两个学校工作日 SLA。
- 课程关闭禁止新业务起点，不截断关闭前服务器确认的合法业务链；既有会话、首次材料、续传、审核补证、已受理教学申请及结算按原规则继续。关闭不等于结算/归档，不放宽原期限或补证次数。
- “不允许隐藏备注”仅约束打卡审核，保留固定公开分类与可选公开说明；最终成绩管理不设置备注。换算规则行备注、历史事实和其他模块原规则不随之删除。
- 总览第 0.4 节及其他正文引用的未决范围仍为 PENDING：六类均不适用时的终局标准、首次材料受理/期限边界、学校工作日日历与日内边界、非维护故障事后确认的错误逾期补救。不以本轮明确决定替代尚未提供的业务选择。
- 修改四份正文、业务目录 README 的一行介绍、本页并新增[业务复核决定交接](handoffs/2026-09-04-business-review-followup.md)。历史交接、Contract、代码、数据库和架构保持不变；本轮七份文档精确计划比较、共享规则、48 处本地链接、8 处锚点、254 行表格、41 个受保护文件哈希与 Git 范围检查通过；8 个补证计时算例和 8 个轮次状态推演通过，均非产品运行测试。

## 前次审核公开原因补充（历史记录，冲突处以 BD-20260904-02 为准）

- 开始基线：`codex/latest-main-20260904` / `49d992a1333294ea561923cfea0b7d25864a4d91`；工作区已有前次开发范围调整的四个已跟踪修改和一个新增交接，暂存区为空。本轮保留这些未提交改动，不覆盖或重新归档历史。
- 用户接受六类固定中英公开原因及适用动作方案，登记为 `BD-20260904-01 / ACCEPTED`。教师动作仍只有通过、退回补证、判为无效三个；退回进入待补证，教师判定或系统逾期均可形成记录无效状态，不改变学生账户状态。
- 退回和判为无效共用原因目录、按动作限制选项，必须选一个固定分类，可加一句公开说明。固定分类及系统原因提供中英名称，补充说明保留原文；学生补证页、记录详情和站内通知一致，不设置隐藏审核备注。
- “补证逾期”是系统公开原因，不是教师选项。按最终截止和服务器受理事实判断；逾期无效的原记录不能再次补证。按时受理后等待复核、已确认故障顺延及有权限的历史纠错边界保留，纠错不重开补证。
- 本轮仅修改四份业务正文、本页并新增[审核公开原因交接](handoffs/2026-09-04-review-public-reasons.md)；保留 v8.0 基线版本，不修改 Contract、代码、架构、数据库或前次交接。四份正文精确差异、三份共享分类/期限/展示块、39 处本地链接、8 处锚点、251 行表格、Git 范围和空白检查通过；未执行产品测试，不以文档完成代替产品验证。

## 前次开发范围调整（历史记录，已随 PR 提交）

- 开始基线：`codex/latest-main-20260904` / `49d992a1333294ea561923cfea0b7d25864a4d91`，工作区干净、暂存区为空。
- 用户确认当前不开发 iOS。已删除业务目录内 5 处显式引用，并将“其他学生端”的泛指收紧为 Android / Web；总流程明确 Android 学生端、Web 学生端和教师/管理员 Web 端的开发范围。
- 前次只调整 v8.0 业务基线的客户端开发范围；当时未改运动、计入、审核、期限、权限及仅站内通知规则。“三端职责”指学生、教师、管理员三个角色，继续保留。
- 前次修改总流程、学生流程、管理员流程及本页，新增[开发范围交接](handoffs/2026-09-04-business-platform-scope.md)；当时教师流程、业务目录 README、历史报告、客户端代码、Contract、架构和数据库未改。前次业务范围检索、精确正文差异、31 处本地链接与 4 处锚点、Git 范围和空白检查通过；该结果不作为本轮新增审核规则的验证结果。

## 各部分现状

| 部分 | 现有成果与证据 | 未完成事项 |
|---|---|---|
| 新需求 | P4-Z A/C/E/G2、[P4-H B/D/F/G1/G3整包](../architecture/new-requirements/p4-design-huang-v81.md)、P-01～04和GAP-H13决定对齐及最终互审均完成，见[Phase4交接](handoffs/new-req-phase-4.md) | Phase4 DONE；Phase5 READY。产品实现和真实运行证据进入后续阶段 |
| 业务规则 | [总流程](../business/00-overview.md)、[学生](../business/10-student-flow.md)、[教师](../business/20-teacher-flow.md)、[管理员](../business/30-admin-flow.md) 为 V8.1；当前开发范围 Android / Web，已同步用户本轮确认的补证、维护、SLA、关闭与职责/备注边界 | 仍须完成页面、状态与 Contract 设计；文档删减不代表原问题已解决或产品已运行 |
| UI / 用户流程 | Android 学生端、Web 学生端、教师 / 管理员 Portal 已有页面和交互代码 | 本轮新增需求对应的入口、页面、Loading / Empty / Error 与权限反馈尚未设计 |
| Domain / 数据库 | [领域与数据库设计](../architecture/phase-3-domain-and-database-design.md) 继续作为旧基线；P4-Z/H 增量已补状态机、不变量、事实归属、事务/并发、统计/材料/结算与迁移恢复边界 | 当前仍只有设计，没有新 Backend 的真实表、Migration、环境盘点、数据库执行或恢复演练 |
| Backend 架构 | [架构职责](../architecture/backend-architecture.md)、[模块边界](../architecture/backend-module-boundaries.md)、[依赖规则](../architecture/backend-dependency-rules.md) 继续有效；P4-H/Z 已给出新需求的模块 Owner 和跨模块保护边界 | Contract 与 PENDING 门禁未关闭；最小 Composition Root、模块实现和可执行架构测试尚未建立 |
| API Contract | 当前工作候选`1.2.1-contract.phase5-step02.1 / DRAFT`，规模109/121/193/66；[metadata](../../contracts/contract-metadata.json)与实际SHA一致；旧1.2.0 RC字节保留 | [CR-005](../../contracts/change-requests/CR-20260901-005-explicit-discriminator-mappings.md)协议修复已实施；Phase5其余需求、最终RC、Phase6/7消费验收仍待完成，候选未发布 |
| Android | 已有 Kotlin 客户端、旧接口清单、隔离的 DTO 生成和 Contract / Mock 验证；[已有验证记录](handoffs/phase-5g-a-android-affected-contract-revalidation.md) 包含 341/341 单测通过、构建通过 | 正式绑定仍为 `3.0.0-contract`，网络链路尚未迁移至新 Contract；没有本仓库真实 Backend 接入和真机 E2E 验收 |
| Web | 已有学生端与 Portal；[已有验证记录](handoffs/phase-5g-b-web-affected-contract-revalidation.md) 包含 affected 13/13、Portal 125/125、Student smoke 79/79、类型检查、构建和浏览器检查 | Portal 正式快照仍为 `3.0.0-web-snapshot`；验证绑定未替换正式旧 API / DTO，演示数据与 BACKEND_REQUIRED 边界仍存在 |
| Backend 实现 | [实现目录](../../BNBU-Sports-Backend/README.md) 的 Git 跟踪内容只有 README | 无可启动服务、真实认证、Use Case、PostgreSQL 持久化或 COS 接入 |
| 联调与部署 | [infra](../../infra/README.md) 与 [E2E](../../tests/e2e/README.md) 入口均为说明文件 | 没有当前基线的真实服务闭环、Docker 联调、Staging、Production 或稳定观察验收 |

Android / Web 测试数字是历史验证记录，不是本次重新执行的结果。当前状态依据文件、元数据与交接证据核对；文档、静态检查、Mock 和真实运行验收必须分别记录。

## 历史 Contract 基线与阻塞（当前以页首为准）

```text
Version: 1.2.0-contract
Status: RC
Public base path: /api/v1
SHA-256: 667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a
```

三组待处理的 discriminator wire 值是 `EXEMPTION / CERTIFICATION`、`ADD / UPDATE / DELETE`、`MAINTENANCE / NORMAL`。隐式 schema 名与实际 wire 值不一致，结构验证成功不能关闭该兼容性问题。

CR 须经独立评审；接受后发布新的 Version / SHA，重新生成 Android / Web 与计划采用的 Backend 绑定，并验证三组合法值 round-trip 和未知值拒绝。阻塞未解除前不进入 Backend 实现。

## 目前可推进的工作

1. 按 V8.1 与 `BD-20260904-01/02` 已确认正文设计教师逐轮待办、学生补证终结、维护暂停/恢复和课程关闭后的旧业务入口；若后续实现遇到未明确业务，仍按 AGENTS 由用户确认，不由实现自行补造。
2. 设计材料版本、AI 任务、逐轮 SLA 与补证计时、最优计入组合、结算版本的领域/数据库变化；不继续实现已取消的删除后接管与最终成绩备注能力。
3. 据新业务提出 Contract 变更，连同既有 discriminator 阻塞统一评审；发布新 Version / SHA 后让下游重新验证。
4. 之后按模块实现真实服务与客户端接入，并执行交接报告中的验收场景。

本轮仅删除指定说明，不宣称原问题已解决或全部业务分支闭合。学校外部反馈渠道、工作日日历和模型效果仍须有真实来源与验证。原“责任教师失效后的非记录教学阻塞 → 接管”不再作为本版预期流程，不得借历史交接重新引入。

## 交接与证据边界

- 本轮：[V8.1 Web 展示设计](handoffs/2026-09-05-web-v81-align.md)。前次为[章节删除交接](handoffs/2026-09-04-business-remove-pending-section.md)、[V8.1 版本更正](handoffs/2026-09-04-business-version-v8.1.md)、[业务文档 PR 发布](handoffs/2026-09-04-business-pr-publication.md)、[业务复核决定同步](handoffs/2026-09-04-business-review-followup.md)、[审核公开原因与补证终结](handoffs/2026-09-04-review-public-reasons.md)和[客户端开发范围调整](handoffs/2026-09-04-business-platform-scope.md)。v8.0 原方案见[历史更新报告](handoffs/2026-09-04-teacher-first-business-update.md)；历史说明与现行正文冲突处不再适用。
- 前次 v8.0 业务更新以 `71655cc18d0c29b159eebc4ba293a25a27bcfe7e` 为修改前基线；其报告中的分支、提交评审和 PR 状态是历史上下文。前次发布从 `49d992a1333294ea561923cfea0b7d25864a4d91` 开始，已提交文档并向指定目标仓库推送业务分支、创建 PR #3，未合并或部署。
- 历史导入记录见[Phase 0 交接](handoffs/phase-0-repository-import-and-team-guide.md)；[历史状态](handoffs/baseline-status-2026-09-02.md)只供追溯。
- 前次发布原样提交业务改动，仅为记录 PR 更新 STATUS 并新增发布交接；没有修改项目 README、Contract、Android、Web、Backend、数据库设计、实现或既有交接。当时四项 PENDING 及既有 Contract 门禁保持；本轮删除待决说明不修改 Contract 门禁。
- 当前仍有旧 API、Mock/演示路径与占位目录，历史客户端测试数字未重跑；本轮仅执行文档与变更范围检查，结果见交接报告。
- 原有 Backend CI 删除状态保留，本轮未新增 CI 或部署任务。
