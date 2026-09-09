# P7-Z-A 7.1 + 7.2 开发进度

**状态：PARTIAL / IN_PROGRESS。最新 Docker 完整自检：1160 项，1156 通过、4 失败、0 跳过，整体 FAIL。** 本轮新增独立功能和回归均通过；四项查询参数错误码 CR 用例保留真实失败。尚非 TRACK_READY 或 G1 PASS。

## 16:29 协议负责人处理流程

用户转交方案明确先集中提交当前候选与CR，再由协议负责人补齐协议，H/Z及两端适配验证后进行G1验收。已整理 `coordination/P7-G1-CR-submission-20260909.md` 和配套集中包，包含完整历史表示提案、查询CR原12项及新增第13项、目录登记和最新H材料；四项失败如实提交。没有新的具体schema/版本批准，Contract保持不变，联调仍暂缓。

## 最新接收：H 16:12 集中包

59项来源文件哈希全部匹配；H提供44PG/HTTP+92单测原始通过报告，Z未重跑。H确认收到Z16:08完整包，仍明确PARTIAL，未批准CR或启动联调。新增Record回执/Outbox与迁移1710；Z已补两张表Owner，现在共9张，只有根注册及对应测试数据改变，未装入H源码或联合迁移。

本次单入口结束 `2026-09-09T08:25:29.353Z`，完整结果仍1156通过/4失败/0跳过。两个architecture来源变化和124项哈希见最新closeout；原16:08完整ZIP保留字节，本次根注册变化随下一次集中交付。详情见工作区 `coordination/P7-Z-H-consolidated-receipt-20260909-1620.md`。

## 当前范围与基线

按用户“把 P7-Z 能做的一口气做完”的要求，集中完成 G1 的 Auth、Course 和已授权的最小运行/学期/模板支撑。用户此前暂缓 H 联调的指示继续适用，G2 未启动。共同 HEAD `f95c3833870fe0da55a297aa28c958ec53e9e935`，detached HEAD；候选未提交。实际代码在 `phase7/g1-z/new_need_version_sports/BNBU-Sports-Backend`，7.0 冻结工作区保留。

根 AGENTS、docs/rebuild/STATUS.md、v3 和业务/Contract 权威输入已读取。写入仍限 Z 模块、装配、G1 测试/证据及本 handoff；没有修改 H 产品模块、客户端、Contract 或业务文档。v3 规定正式 STATUS 仅在接受和合并核验后更新，本次不提前写 DONE。

## 16:08 集中实现（本次继续回归通过）

- **成员并发**：移出/恢复先锁目标学生，再锁课程；学生自查不先锁 enrollment/semester；成员和课程影响预览改为同快照的当前学生展示投影，避免持课程锁后再逐一锁其他账号。六条真实 HTTP/PG 锁回归先失败后通过。两个真实并发命令竞争“恢复旧课”和“加入另一课”时，只有一个成功，另一方 COURSE_ALREADY_JOINED，数据库只有一个 ACTIVE 成员关系；跨教师写入拒绝。
- **注册回执安全**：匿名注册重试重新验证原账号及会话，退出、refresh 或停用后不返回旧凭据；有效重试返回完全相同的结果。已完成注册流先锁账号，再进入课程/流锁；并发首次登记如发现 owner 改变，在任何写入/发送前回滚并重读，最多两次。两个并发首次注册只建立一个账号/入课结果。
- **登录回放**：增加 access 过期检查。即使 refresh 仍有效，也不把过期 access 当作成功登录回执；学生/密码登录回归都通过，正常 refresh 仍可用。
- **管理员当前学生只读目录**：补齐冻结协议已有的 `listStudentAccounts` 与 `getStudentAccount`，支持搜索、院系/ACTIVE/PENDING 筛选、前后游标和详情。由真实管理员权限、组织和当前账号事实授权，状态来自当前学期成员事实。覆盖权限撤回、首次改密、学生/教师越权、跨组织、删除后不再返回当前资料及拒绝写接口。这里的“当前资料”查询不代替历史学生 CR。
- 根装配新增两个窄能力：当前学生展示投影和注册会话校验；Course 只经声明的 Port 使用。原已交接 v1.3 的18个公共 TS 文件与7个迁移字节不变，新增能力无需 H 改动现有签名。

现有 Auth/Course 核心、学生双邮箱换绑/注销事务、账号治理、模式/通知/审计、最小学期/固定模板、本地 Mailpit 及实际 G1 进程入口继续保留。通知回执、登录和邀请的既有并发修复继续通过。当前注册 **65 个**冻结 operation，不表示完整176个操作均已实现。

## 实际验证与证据

唯一入口为 Backend 下 `bash src/bootstrap/run-g1.sh`，固定 Docker Node24.19.0/npm11.17.0、PG17.6、Mailpit1.31.1；新命名项目、内部网络、无宿主端口及 tmpfs 测试数据。最新结束 `2026-09-09T08:25:29.353Z`。

- Contract **1003/1003**，Architecture **22/22**，Foundation **14/14**，G1 **117/121**。
- codegen、typecheck、lint、环境及锁文件审计绑定通过。审计是构建缓存中 `2026-09-09T06:13:01.132Z` 的已知公告快照，不冒充本轮新增在线审计。
- 四项失败：非法课程 limit/status、成员 status、通知 read，以及新增学生目录 limit/status/q；应用拒绝输入，但冻结 operation 缺 INVALID_REQUEST，实际返回500。均保持400 / INVALID_REQUEST期望，没有 skip、todo、expected-failure 或将500设为正确结果。
- 宿主 exit1，cleanup exit0。本次容器、网络和临时数据由入口清理。124项源输入逐一匹配测试字节；Contract、package-lock、6个Foundation模块文件及原架构检查器保持不变。

[原始汇总](../../../BNBU-Sports-Backend/evidence/phase7/G1-Z/summary.json)、[分母/全部失败/源码核验](../../../BNBU-Sports-Backend/evidence/phase7/G1-Z/closeout-verification.json)、[API清单](../../../BNBU-Sports-Backend/evidence/phase7/G1-Z/api-inventory.json)、[宿主清理](../../../BNBU-Sports-Backend/evidence/phase7/G1-Z/host-entry.json)。

修复前证据保留：成员六项 `attempts/host-20260909154818-66403/vitest-g1.json`；注册回放三项 `attempts/host-20260909155528-66925/vitest-g1.json`。早先认证五项和邀请四项 before/after 证据仍在 closeout 中。管理员夹具曾误建第二个超级管理员、误用改密请求，已改为隔离组织和实际协议；竞争用例断言已区分恢复200与入课201。原始尝试均保留。

## 剩余事项及完成边界

1. **查询参数 CR**：H仅静态支持原12项最小补充，具体Owner接受与新版本/SHA仍未提供。本轮发现 `listStudentAccounts` 为第13个候选，单独标注待接受，不把H的12项意见扩充成13项批准。既有教师/分管理员列表的部分非法输入还错误使用INVALID_CURSOR，统一修正时也须覆盖。详见工作区 `coordination/P7-Z-CR-query-errors-01.md`。
2. **历史学生 CR**：方向已确认，CURRENT_STUDENT/DELETED_STUDENT具体表示、相邻PII、版本及客户端方案仍待批准。提案已盘点10个直接schema、33个潜在响应操作。依赖新表示的注销后历史查询保持待完成，须在G1联合验收前落地；不伪造姓名/性别/年级或用私有字段绕过。
3. **权威计划目录**：负责人允许标记测试目录用于测试环境，版本/测试学期/覆盖已登记。正式来源仍缺，真实目录验收未通过；实际进程默认 unavailable，不生成正式发布凭据。Course运动日程与教师SLA工作日日历分开。
4. **后续事实来源**：非空学期结算、已有课程教师删除、分管理员职责及需要真实统计的管理员课程治理出口依赖后续权威来源，不能用零值/空成功Provider完成。教师/管理员本人邮箱换绑按用户决定继续待确认，仅学生开放。
5. **H 联调**：最新接收59项源码哈希及44PG/HTTP+92单测原始报告，未本地重跑或计入Z总数。九张表Owner已登记；真实Session/注销、媒体/COS、Record、跨轨权限/并发和完整G1链仍待集成，当前按用户指示暂缓。没有新增互审轮次。

## 修改与交付

此前16:08集中实现变更16个测试来源：bootstrap装配；Course服务、仓储及内部Port；Identity服务、治理API/仓储和两个新增公共能力；G1测试。该16项清单保存在 `attempts/host-20260909162449-68568/closeout-verification.json`；最新closeout的 `changedInputsSincePreviousRun` 仅为本次两个architecture文件。没有新增迁移，仍13个（0000、1000–1110）。另更新本handoff、Backend说明、工作区导航、CR、测试目录登记和完整源码包。

Contract仍为 `1.3.0-contract / RC`，canonical SHA `5c87eeb9bca39585cea2e3c80c60d58813b4367e1a60b161ed8c7f82af4a19ed`。业务规则和客户端未改。本轮没有加入旧API、产品Mock、TODO或空成功实现；tests中的合成数据/严格替身不等于H实际链。未运行全仓旧API审计或生产部署测试。下一步依赖明确的CR决定及权威来源，再完成受影响分支与G1统一集成验收。

完整Z源码和本轮原始证据已另存新的快照，供统一转交；不覆盖此前15:33快照，不自动发送，不操作GitHub提交/PR/合并。

## 以下为历史进度快照

以下各日期段落的计数与“未完成”描述只对应当时材料；当前结论以上文为准。

## 2026-09-09 H / WI-0035 对接补充

已读取并按 SHA 归档 H 的 `new-req-phase-7-h-a.md`。它是 PARTIAL 检查点，25 项仅覆盖计时 Domain，未提供源码或 TAP；只读远端查询未找到指定分支。没有将此文件认定为 TRACK_READY，没有复制 H 未冻结代码或发起第二轮互审。

针对 H 对暂停事实的依赖，本轮新增 `system-mode/application/public/mode-timeline.ts`，实现真实模式治理 API、同事务 mode/history/audit/notification/replay、完整实际维护区间读取。暂停事实只供业务计时器按权威规则消费，不修改 Session 正式运动时长。缺失/不一致历史 fail closed；预计恢复时间不会结束维护。原 v1 八个接口保持原字节。

新增 7 个 G1 用例覆盖维护开始/恢复及多段历史、权限撤回/首次改密/停用、两个管理员并发切换、精确幂等及规范化、审计/通知注入故障全事务回滚、安全通知过滤、缺事实/时钟回退。原有用例均通过；机器 API 清单现在由单入口从实际注册点生成，避免人工清单失效。

本轮写入：Z 的 system-mode、identity-access 及 notification-center 模块、`src/bootstrap/g1.ts` / `verify-g1.mjs`、`tests/integration/g1/g1.test.ts`、G1 证据与本 handoff。读取根 AGENTS，HEAD 仍为共同基线，detached HEAD，既有 G1 未提交改动保留；没有 GitHub 写操作。正式 STATUS 继续遵守 v3 的验收/合并更新条件。

接口协调增补见工作区 `phase7/g1-z/coordination/P7-Z-A-to-H-WI0035-interface-addendum-v1.1.md` 和同目录 `P7-Z-A-public-ports-v1.1.zip`。15 个 TypeScript 类型及其相对依赖已在固定 Docker 镜像独立编译通过。本包等待 H 签名确认，只是 PRE 协调，不是完整源码候选。H/COS 的真实链尚未执行，不能用 Z 的 1071 项或 H 自报的 25 项替代。

## 2026-09-09 H 三项 PRE 反馈 / v1.2

H 12:47 截图确认原 v1 八个文件 SHA 与共同基线，但要求补齐具体补练授权、统一失败语义和校历类型/阶段安排。本次是同一 PRE 的接口补齐，未发起新的 Foundation 审核。

- 新增 `course-enrollment/application/public/session-admission.ts`，真实实现按请求 authorizationId + course + enrollment + rule 精确加锁验证，普通 null 与具名授权分开，拒绝串用、过期、被移出/关闭/归档；返回服务器 admittedAt 和已验证绑定。Bootstrap 暴露 `sessionAdmission`；身份业务门禁补实时验证邮箱。
- 新增 `shared/api/g1-error-policy.ts`，Bootstrap 用原 OpenAPI 构造 operation 级错误策略。按 code/status 处理，不解析 message；`/me` 的停用拒绝与教师维护期改密采用各操作声明的 FORBIDDEN，原功能阻止行为保留。未知异常只返回 INTERNAL_ERROR。
- v1.2 附齐 Rule/PlanCatalog 等类型。H 的真实版本化校历仍在 G2，不提前加入 P7-H-A；G1 课程发布计划目录与未知来源处理归 Z，真实目录仍未接入，不能冒报生产可发布。

新增 19 个测试（4 个真实数据库 Admission 用例、15 个错误策略用例）及原有回归全部通过：本次 1090/1090，0 失败、0 跳过。具名授权锁与调用方回滚使用真实 PostgreSQL probe，未称为 H Session 实现或合并联调。机器错误映射覆盖 176 个 Contract operation 的公共失败出口，不表示这些 operation 都已实现；当前注册仍为 42 项。

本轮写入 Z 的 Course/Identity、shared API、Bootstrap、架构共享 allowlist、G1 单元/集成测试、G1 证据和本 handoff；原八个签名、v1/v1.1 包及 Contract 字节未变，未改 H/客户端/业务文档，没有旧 API、产品 Mock/TODO/空成功 Provider 或 GitHub 写操作。读取根 AGENTS 和阶段权威输入，HEAD 仍是共同基线、detached HEAD，保留原 G1 未提交改动。正式 STATUS 的验收/合并更新条件未满足，继续不写 DONE。

交付 `phase7/g1-z/coordination/P7-Z-A-interface-fix-v1.2.zip`，只含接口及类型依赖、错误策略、协调说明和证据摘要；17 个源码文件在独立目录用固定 Node/TypeScript 编译通过。等待 H 同一 PRE 的签名确认，未当作正式整轨交付。Auth 尾项、真实目录/邮件/权限与 H/COS 合并链仍为 PARTIAL。

## 2026-09-09 H Session 接口/最新状态接收与 v1.3

读取 H SessionAccess、应用层实现、仓储 Port、计时/媒体测试和 consolidated status。实际到达的源码/TAP 是 56 项，最新 status 自报 77；first-material 源码、77 项 TAP 与架构 JSON 本轮未提供，单独标记，不要求重审旧包。原件 11 个文件归档前后 SHA 全匹配。Z 在固定 Node、禁网、只读源码环境复现收到的 56/56，0 失败/跳过，未接入未完成的 H 生产仓储。

补齐本方两个真实缺口：1060 新增课程已发布规则生成列、课程/成员/补练复合 UNIQUE 与补练规则 FK；Identity 新增 StudentOwnerLock，以真实主体行 FOR NO KEY UPDATE 串行化，Course Admission 在身份/模式后、课程前取得该锁；Bootstrap 暴露该能力供后续 H lockOwner 委托。H 的表和迁移仍由 H 持有。

新增 4 个真实 PostgreSQL 用例验证关联串用拒绝、空 Session 集合也存在主体锁、跨主体独立、KEY SHARE 兼容、身份范围拒绝、失效 scope 失败和 Admission 同事务持锁/回滚释放；全入口 1094/1094，迁移 down/up 8 个，宿主及清理 exit 0。原破坏补练规则的断言改为数据库先行拒绝错误 FK，旧公共签名和全部历史包保留。

本轮入口：Git 根为本 handoff 所在仓库，detached HEAD，仍为共同基线 `f95c3833870fe0da55a297aa28c958ec53e9e935`；读取根 AGENTS、STATUS、v3 与 H 当前材料，已有 G1 未提交修改保留。只写 Z Identity/Course、Bootstrap、1060、G1 测试/证据和本 handoff；工作区 coordination/导航用于收发归档。禁止的 H 模块、业务/架构/Contract/客户端、根 infra/.github 未改；无 GitHub 写操作。

交付工作区 `phase7/g1-z/coordination/P7-Z-A-session-schema-locks-v1.3.zip`：新增锁接口、完整类型依赖、1000–1060 迁移依赖快照、精确 FK/锁序/SessionAccess 失败消费说明、证据和哈希清单。18 个 TS 文件在独立目录用固定 Docker TypeScript 编译通过。SQL 提供隔离库依赖验证，不授权 H 修改 Z 所有权文件或把该包当部署候选。

完成状态仍 PARTIAL；业务规则和 Contract 未变，未新增旧 API、产品 Mock/TODO/空成功 Provider。H 的 SessionAccess 未注册，因为真实仓储未提供；本人注销事务、Auth/治理尾项、真实目录/邮件/权限/COS与合并 HTTP/资源/并发链均未完成。待 H 同一 PRE 采用 FK 与委托锁，继续其真实仓储及完整同轨候选；两轨 TRACK_READY 后才正式互审和合并验证，STATUS 的正式验收/合并更新条件未满足。
