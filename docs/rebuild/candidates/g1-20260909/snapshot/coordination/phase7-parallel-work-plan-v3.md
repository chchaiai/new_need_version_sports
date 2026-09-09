# Phase 7 并行执行计划 v3（Reviewer 修订稿）

日期：2026-09-09  
执行范围：首个半天仅完成 `7.0 Foundation`；7.0 接受后进入两个并行波次。本文件取代 v2 的串行合并包安排及更早版本。

## 1. 已核验且不得漂移的输入

- 仓库：`https://github.com/chchaiai/new_need_version_sports`
- 分支：`main`
- 实际入场 Commit：`200ff07e22ff6e2e253d965765a498088af2463c`
- Contract：`1.3.0-contract / RC`
- canonical Git/LF OpenAPI SHA-256：`5c87eeb9bca39585cea2e3c80c60d58813b4367e1a60b161ed8c7f82af4a19ed`
- API 前缀：`/api/v1`；157 paths / 176 operations；992 个冻结 fixture（159 positive）。
- Windows 自动 CRLF checkout 的原始文件字节 SHA 可能不同；身份判断以 Git blob/canonical LF 字节为准，并同时记录 checkout 原始 SHA，禁止含糊写“SHA 不一致”。
- Phase 6 发布/合并条件已经满足；旧文档中的“待发布”是历史快照。`BE-CR005-COMPAT` 仍未执行，7.1 仍锁定。
- GitHub 的 commit/push/PR/merge 继续只由用户操作。Android/Web 正式旧 API/Mock 迁移属于 Phase 8，不进入本包。

## 2. 本包 Owner、Reviewer 与最小复核规则

- `P7-Z-0 / 7.0 Foundation` 唯一执行 Owner：**Z（周润基）**。
- 技术 Reviewer：**H（黄友晟）**，只进行一次冻结候选的定向复核。
- 最终 Reviewer：**用户本人**。用户明确接受 7.0 前，不领取、不实现、不登记 7.1。
- 7.0 实施期间只有 Z 写产品工作区。H 可只读准备 7.1 清单与 7.0 Review checklist，但不得修改产品、lockfile、migration、公共入口或 Z 的证据。
- H 的复核范围仅包括：本包 changed files、直接依赖、G0 证据和未关闭 Finding；不重跑输入字节未变的 Phase 5/6 全套，不重复审稳定业务/架构正文。
- Z 修完 H 的 Finding 后，只重跑失败项、受影响项和下文规定的 G0 固定套件；不启动第二轮全文审查。只有 Contract SHA、技术栈或公共映射规则改变时，才重新执行完整 `BE-CR005-COMPAT`。

## 3. 冻结技术栈

下列为 7.0 的目标固定版本；开工预检必须把实际 `--version` 与依赖锁文件留证。任何版本不可获得或不兼容时，先报告差异并停在 PRE，不静默升级：

| 类别 | 固定选择 |
|---|---|
| Runtime | Node.js `24.19.0` |
| 包管理 | npm `11.17.0`，必须提交 lockfile |
| 语言 | TypeScript `5.9.3`，strict |
| HTTP | Fastify `5.6.1` |
| OpenAPI 类型消费 | openapi-typescript `7.13.0` |
| OpenAPI/JSON Schema 运行校验 | Ajv `8.17.1` + ajv-formats `3.0.1`，2020-12 模式 |
| YAML | yaml `2.8.1` |
| PostgreSQL 驱动 | pg `8.16.3` |
| Migration | node-pg-migrate `9.0.0` + 版本化 SQL/migration 文件 |
| 测试 | Vitest `3.2.4` |
| 静态边界检查 | TypeScript + ESLint `9.39.4` + 7.0 架构测试 |
| 数据库 | `postgres:17.6-bookworm` 隔离容器 |

实际构建与 G0 测试统一运行在 `node:24.19.0-bookworm-slim` 容器内；该官方镜像使用与执行机器相符的架构，不强制把 Apple Silicon 转成 amd64。首次 PRE 拉取后记录实际 `RepoDigest`、Image ID、CPU 架构、`node --version`、`npm --version` 和 `npm ls --depth=0`。后续复核复用同一 digest 和 `package-lock.json`，不依赖宿主机 Node/npm。

选择理由：沿用仓库已锁定的 TypeScript/Ajv/openapi-typescript 版本，减少新工具不确定性；使用 `pg` 和显式 Persistence Mapper，避免 ORM Entity 穿透业务层。7.1 的密码哈希、token/session 依赖不在本包安装，等 7.0 接受后由 7.1 单独冻结。

## 4. 精确写入边界

Z 在 7.0 只可写：

- `BNBU-Sports-Backend/package.json`
- `BNBU-Sports-Backend/package-lock.json`
- `BNBU-Sports-Backend/tsconfig.json`
- `BNBU-Sports-Backend/eslint.config.*`
- `BNBU-Sports-Backend/vitest.config.*`
- `BNBU-Sports-Backend/Dockerfile.test`
- `BNBU-Sports-Backend/.dockerignore`
- `BNBU-Sports-Backend/README.md`
- `BNBU-Sports-Backend/src/bootstrap/**`
- `BNBU-Sports-Backend/src/shared/api/**`
- `BNBU-Sports-Backend/src/shared/application/**`
- `BNBU-Sports-Backend/src/shared/domain/**`
- `BNBU-Sports-Backend/src/shared/infrastructure/**`
- `BNBU-Sports-Backend/src/modules/applications-certification/**`，仅限 `CertificationKind` 的真实四层映射、持久化约束和测试；不注册未实现业务 API。
- `BNBU-Sports-Backend/migrations/**`
- `BNBU-Sports-Backend/tests/contract/**`
- `BNBU-Sports-Backend/tests/architecture/**`
- `BNBU-Sports-Backend/tests/integration/foundation/**`
- `BNBU-Sports-Backend/docker-compose.test.yml`
- `BNBU-Sports-Backend/evidence/phase7/7.0/**`，仅机器生成的版本、用例索引和结果；不得包含连接密码、token 或真实数据。
- `docs/rebuild/handoffs/new-req-phase-7-0-foundation.md`

只读：`contracts/**`、四份 `docs/business/**`、`docs/architecture/**`、Phase 5/6 验收资料。

禁止写：`contracts/**`、业务/架构正文、Android、Web、根 `infra/**`、`.github/**`、生产配置/数据、Phase 8 清单。`docs/rebuild/STATUS.md` 只在用户接受并完成 GitHub 合并核验后由用户操作或另行授权；本包不提前改为 DONE。

## 5. 测试环境

- Z 的独立干净工作区，以 `main@200ff07...` 创建；开始和交付均记录 `git status`。
- 宿主机只要求可用的 Docker Engine/Compose；记录实际 `docker version` 与 `docker compose version`。Node、npm、生成器、校验器、测试器和 migration 工具都在 Backend test 容器内运行。
- 真实 PostgreSQL 17.6 隔离容器，仅合成数据；数据库名、用户和端口写入测试配置，秘密值只通过未提交环境变量注入，不读取或提交 `.env`。
- 每次集成验证从新空库执行 migration；测试完成销毁该测试库/容器。禁止连接生产、共享开发库或含真实学生数据的数据库。
- 健康检查必须经过真实 HTTP 服务和真实 `SELECT 1`/等价 DB 探测；数据库不可用时 fail closed，不返回假健康。
- 7.0 不需要邮件、对象存储、AI/OCR 或真实校历；只登记这些依赖仍为后续切片待落实，不能提前 PASS。

容器自检必须由单一入口（例如 `docker compose -f BNBU-Sports-Backend/docker-compose.test.yml run --rm backend-test npm run verify:foundation`）串行完成：环境/依赖清单 → canonical SHA → codegen 无差异 → typecheck/lint → Contract compatibility → 架构测试 → PostgreSQL migration → DB/health/round-trip/rollback。入口任一步非零即整体非零，并生成一个汇总 JSON；不得用多个手工截图拼成 PASS。

## 6. 半天 270 分钟执行表

| 时间 | 执行人 | 工作 | 门禁/产出 |
|---|---|---|---|---|
| T+0～20 | Z；H 只读 | 复测 Commit、clean、canonical SHA；拉取并记录 Node/PostgreSQL 镜像 digest；在容器内核对实际工具版本、依赖安装和 DB 权限；登记唯一工作包和精确路径 | `PRE`。任何固定输入不符立即停止；不得先写业务代码 |
| T+20～70 | Z | 建最小工程、Composition Root、配置/错误边界、健康检查、PostgreSQL 连接、migration up/down/rebuild 入口 | 服务可启动；DB 正常/断开两类结果真实可见；无空模块/TODO/Fake Success |
| T+70～155 | Z | 实施 `BE-CR005-COMPAT`；从原始 `contracts/openapi.yaml` 生成/消费；完成 union、边界值、未知字段、round-trip、内部命令映射 | 机器报告包含工具版本、用例 ID、分母/通过/失败、命令、cwd、exit code、日志 |
| T+155～195 | Z | 完成 Contract→Application→Domain→Database 对齐；以 `CertificationKind` 做真实 DB round-trip、非法 DB 值 fail-closed、CHECK 约束测试；补五项架构检查 | 不允许 generated DTO/数据库 Row 穿透；migration 在真实 PostgreSQL 通过 |
| T+195～220 | Z | 自检并冻结候选；运行 G0 固定套件；记录未执行项和失败诊断 | 形成单一候选与证据包，不宣称 7.1 |
| T+220～245 | H | 一次定向技术复核，只看 changed/direct-impact/G0；给出 Accept 或有限 Finding | 不重审 Phase 5/6，不扩需求，不另写一套实现 |
| T+245～270 | Z | 只修 Finding；重跑失败、受影响项和 G0 固定套件；提交用户 Reviewer | 状态最多 `READY_FOR_HANDOFF`；用户接受前不是 DONE |

如果任一步超时，删除后续可选工作而不是压缩验证。半天目标只有 7.0；不以剩余时间自动开始 Auth 或 Course。

## 7. `BE-CR005-COMPAT` 不可删减项

1. 先验证原始 OpenAPI canonical SHA；测试必须消费该文件，不复制 schema 到私有文件。
2. 三组原 union 的 59 个冻结对应例必须全部运行并留出逐例结果，其中七个合法分支全部有成功 round-trip。
3. 三组新增 union 及其直接相关 fixture 全部运行；报告确切 schema、fixture ID 和数量，禁止写“相关用例已测”而没有分母。
4. 覆盖 required、显式 null、字段省略、enum、integer、date/date-time、boolean/number enum、未知字段。
5. 未知字段的结果按具体 schema 声明判断；Ajv 不得全局 `removeAdditional`、静默 coercion/default，也不得用宽松私有 DTO 吞掉不兼容。
6. 合法输入执行 wire → generated API type → API Mapper → Application Command → Domain，再反向得到 wire；值和分支身份不变。
7. 非法输入在 API/schema 或显式 Mapper 边界失败；没有 `UNKNOWN`、default、legacy fallback 或名称推断。
8. Android/Web 的既有通过记录只作样例索引，不计为 Backend PASS。

任何失败先分类：后端工具/Mapper问题在 7.0 修；真 Contract 缺陷停止受影响实现并回 Phase 5 CR；业务未定义交用户。不得直接改 RC。

## 8. 四层表示与数据库退出条件

`CertificationKind` 必须证明：

- Contract/API：仅 `SCHOOL_TEAM | STUDENT_CLUB`。
- Application：独立 Command/Result 类型，不引用 generated DTO。
- Domain：模块私有闭集 enum/Value Object，不引用 Fastify/Ajv/pg。
- Database：`text NOT NULL CHECK (certification_kind IN ('SCHOOL_TEAM','STUDENT_CLUB'))`。
- API Mapper 和 Persistence Mapper 分离且穷尽；两个合法值双向 round-trip。
- null、未知 Contract 值不能建立 Domain command；未知数据库值 fail closed 并报告内部不变量破坏。
- migration up、新空库重建和批准测试库 rollback 路径均实测；不声称完成生产恢复演练。

同时产出五项结论：层依赖、Contract DTO 泄漏、DB Row/ORM Entity 泄漏、跨模块 Repository/表访问、事务 Owner。7.0 没有业务写用例时，事务报告应明确 `NOT_APPLICABLE_TO_BUSINESS_SLICE`，只验证 foundation probe 的提交/回滚机制，不能假称业务事务已覆盖。

## 9. G0 固定退出门禁

以下全部为 PASS 才能提交用户：

- Commit、clean、Contract version/status/canonical SHA 匹配。
- lockfile 与实际工具版本齐备，可在干净环境安装/启动。
- Docker 自检单入口从空容器/空测试库运行成功，退出码为 0；汇总 JSON 中的镜像 digest、架构、依赖版本、用例分母和各步骤退出码齐备。
- 类型检查、lint、单元测试、架构测试全通过。
- `BE-CR005-COMPAT` 的规定用例零失败；报告有分母和逐例索引。
- 真实 HTTP health + PostgreSQL 可用/不可用测试通过。
- migration up、rollback/rebuild 和约束测试在 PostgreSQL 17.6 通过。
- `CertificationKind` 四层映射、合法 round-trip、非法值 fail-closed 通过。
- 无 Fake Success、空模块、未授权路径改动、客户端改动或 Contract 改动。
- H 一次定向复核 Finding 全部关闭，或明确保留为阻塞而不报通过。
- Handoff 记录实际命令、cwd、依赖版本、exit code、日志、失败诊断、未执行项。

通过上述技术门禁后，本包进入 `READY_FOR_HANDOFF`。只有用户 Reviewer 明确接受且完成其负责的 GitHub 合并核验后，才记 7.0 DONE，并同时领取下文并行轨 `P7-Z-A` 与 `P7-H-A`；不为每个旧数字编号单独交接。

## 10. 7.0 后的两个并行波次

旧 `7.1～7.6` 仅保留为需求索引，不再逐项交接。Phase 7 对用户只产生三次正式候选交付：`G0 Foundation`、`G1 并行波次 A`、`G2 并行波次 B / Phase 7 收口`。

### 10.1 并行的共同前提

- 两人必须从用户已合并核验的同一个上一门禁 Commit 建立各自独立干净 worktree；禁止从对方未冻结的目录复制文件。
- 每个波次开始前用一次 15 分钟 PRE 冻结公共 Port 签名、表 Owner、migration 编号段和依赖版本。PRE 不是交接或审核，不要求用户重复批准；发生业务/Contract 选择才上报。
- 公共根文件只有 Z 写：Backend 根 `package.json/package-lock.json`、Composition Root、共享配置、migration 总入口。H 只写自己的模块、模块内测试和模块公开注册函数；需要新增依赖时在 PRE 一次列给 Z。
- migration 编号不交叉：Foundation `0000～0099`；波次 A 的 Z 为 `1000～1499`、H 为 `1500～1999`；波次 B 的 H 为 `2000～2499`、Z 为 `2500～2999`。
- 模块测试可以使用严格的 Port contract test adapter，但不得注册外部 Fake Success。只有合并候选经过真实 HTTP、PostgreSQL、鉴权、权限、并发、幂等和事务测试后，波次才可 PASS。
- 单轨完成只记 `TRACK_READY`，不能记 `DONE`。如果另一轨尚未完成，不反复复核已经冻结且 SHA 未变的轨道。

### 10.2 G1：并行波次 A

| 并行轨 | Owner | 覆盖原索引 | 独占写入模块 | 向另一轨提供的冻结能力 |
|---|---|---|---|---|
| `P7-Z-A Identity & Course` | Z | 7.1 + 7.2 + 必需运行支撑 | `identity-access`、`course-enrollment` 核心、`system-mode`、`audit`、`notification-center` | `ActorContext/Authorization`、责任教师/成员关系、Course 状态与模式门禁 |
| `P7-H-A Session & Evidence` | H | 7.3 + 7.4 | `exercise-session`、`media-evidence`、`exercise-record` | 完成 Session、ACTIVE 区间、Media 状态、Record/材料批次与首次受理事实 |

并行顺序：

1. PRE 冻结 `ActorContext`、Course/Enrollment 只读事实、Session/Media/Record 公开事实和错误语义。Z 在 PRE 后先提交签名；H 同期可实现不依赖这些 Port 的 Domain 与 Persistence 部分。
2. Z、H 在独立 worktree 并行实现，各自用 Docker 单入口自检。不得同时改公共根文件或同一张表。
3. 两轨均为 `TRACK_READY` 后，只交换一次完整候选与证据：H 审 Z 的 Auth/Course，Z 审 H 的 Session/Media/Record；双方并行完成一次定向 Review。
4. 每人只修自己轨道的 Finding。Z 作为集成 Steward 连接 Composition Root 和真实 adapters，运行 G1 合并 Docker 套件；集成 glue 不含业务判断。
5. G1 必须实测真实链：登录/Actor → 课程归属或成员 → Session 开始/暂停/恢复/结束 → 媒体验证/绑定 → Record/首次材料受理；覆盖越权、禁用/维护、并发 Session、幂等重试和审计失败回滚。通过后只向用户提交一次 G1 汇报。

H 的轨道不能因为 Port adapter 测试通过而提前宣布 7.3/7.4 DONE；Z 的轨道也不能因为独立 Auth/Course 测试通过而跳过合并后的资源归属和事务测试。

### 10.3 G2：并行波次 B 与 Phase 7 收口

G1 被用户接受并形成共同 Commit 后，再启动第二个波次：

| 并行轨 | Owner | 覆盖原索引 | 独占写入模块 | 重点 |
|---|---|---|---|---|
| `P7-H-B Decision & Operations` | H | 7.5A + 7.6A | `record-review`、`applications-certification`、Roster 子能力、`endurance`、OCR adapter、版本化校历接入 | 六类原因、补证、逐轮 SLA、P-01/P-04、认证学时、名单/OCR 人工确认、耐力结果 |
| `P7-Z-B Projection & Governance` | Z | 7.5B + 7.6B 剩余部分 | `statistics`、`grading`、`feedback`、`help-content`、管理员只读组合及结算编排 | 实际/可计/计入分钟分离、来源完整性、成绩历史、结算、Dashboard 与治理收口 |

波次 B 在 PRE 冻结 `ReviewOutcome`、`CertificationContribution`、Roster/Endurance 结果及统计来源 checkpoint。Z 可以并行实现统计 Policy 和读模型，但在 H 的真实 Review/Certification 来源接入前只能是 `TRACK_READY`。

两轨结束后同样只交换一次审核：Z 审 H 的 Review/OCR/Calendar/Certification，H 审 Z 的 Statistics/Grading/Settlement/治理出口。各自修复后由 Z 连接集成 glue，并在一个 Docker G2 入口中运行完整 Phase 7 回归；H 复核的已冻结业务代码不再二审。

G2 必须额外证明：未知校历不猜 SLA、维护区间正确暂停、旧 AI 回调不覆盖新 revision/人工终局、OCR 不直写正式事实、统计来源不完整不填 0、学生出口无成绩/历史 remark、历史备注仅当前认证教师只读、结算前驱完整、必要审计/通知同事务回滚。G2 通过后只向用户提交一次 Phase 7 总汇报。

### 10.4 复核次数上限

- G0：Z 自检 + H 一次定向 Review + 用户一次验收。
- G1：H/Z 同时交换审核一次 + 一次合并自检 + 用户一次验收。
- G2：H/Z 同时交换审核一次 + 一次完整回归 + 用户一次最终验收。
- 不再为 7.1、7.2、7.3、7.4、7.5、7.6 分别交接；总计三次正式汇报、两次并行交叉审核。
- 只有输入 SHA、公共 Port、数据库 schema、Contract 或业务裁决变化时，才重开受影响审核；否则不重复核对稳定证据。

## 11. 本次开始口令

用户接受本 v3 后，只启动：`P7-Z-0 — 7.0 Foundation`。Z 先回报实际工作区、HEAD/clean、canonical SHA、实际工具版本和测试 PostgreSQL；与本文不符时停在 PRE。H 此时只读准备波次 A。G0 经用户接受并形成共同 Commit 后，同时启动 `P7-Z-A` 与 `P7-H-A`；G1 接受后同时启动 `P7-H-B` 与 `P7-Z-B`。
