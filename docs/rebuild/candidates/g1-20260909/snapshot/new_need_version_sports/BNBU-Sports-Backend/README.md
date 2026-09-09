# BNBU Sports Backend

最新H接收（16:20）：59项哈希匹配，44+92为H原始报告、未在Z重跑；Z已补齐新增两张表Owner，共9张。最新Z复验仍1156通过/4失败/0跳过，H联调继续暂缓。接收和变更详情见G1 coordination的 P7-Z-H-consolidated-receipt-20260909-1620.md。

当前 P7-Z-A / G1 为 **PARTIAL**，共同 HEAD `f95c3833870fe0da55a297aa28c958ec53e9e935`，未提交。按用户要求集中完成 Z 的 Auth + Course，暂缓 H 联调。

本轮补齐管理员学生目录/详情，修复成员操作锁顺序、匿名注册旧凭据回放及登录access过期回放。最新Docker结果 **1160项：1156通过、4失败、0跳过**；4项均为待批准查询参数错误码CR，整体FAIL。65个注册操作、124项源输入已核验；Contract及已交接v1.3接口未变。完整完成项、来源变更和剩余依赖见 [G1 handoff](../docs/rebuild/handoffs/new-req-phase-7-g1-z.md)。

## G1 启动与验证

- **运行应用**：在锁定依赖的 Node 24.19.0 / npm 11.17.0 容器内执行 `npm run start:g1`，启动实际 G1 路由。配置和目录文件协议见 [运行说明](src/bootstrap/g1-runtime.md) 与 [环境示例](src/bootstrap/g1-runtime.example.env)。需要既有数据库迁移、组织、学校邮箱域名和两份持久密钥；不自动建库、建账号或填充目录。
- **运行自检**：在 Backend 目录执行 `bash src/bootstrap/run-g1.sh`。每次独立 PostgreSQL 17.6 / Mailpit、内部网络、新空临时库、无宿主端口；包括真实 G1 子进程的 HTTP/Mailpit/发布/重启测试。结束清理本次环境，不触碰已有本地 Mailpit。
- **结果**：[summary](evidence/phase7/G1-Z/summary.json)、[宿主与清理状态](evidence/phase7/G1-Z/host-entry.json)、[实际注册操作](evidence/phase7/G1-Z/api-inventory.json)。测试总数及输入 SHA 以当次原始报告和 closeout-verification.json 为准，失败同样如实记录，不以旧测试报告替代新候选验证。

负责人已批准邮件先接本地。本地 Mailpit HTTP Send API 已接入，须显式配置；不承诺投递外部学校邮箱。新入口只接受 development profile。原 `npm run start:foundation` 仍只有健康探针，其行为保留。

课程发布可加载经 Owner 批准、按原始字节 SHA 固定的目录文件，绑定组织/学期版本/完整规则。文件缺失、SHA 错误或依赖不可用时明确拒绝；尚未提供真实目录时显式使用 `P7_PLAN_CATALOG_MODE=unavailable`，不内置合成成功数据。测试中的文件都是合成输入，不能算权威校历接入。H 会话/媒体/记录、结算/职责来源以及历史学生投影 CR 仍待收口，HTTP ready 不表示完整 G1 READY。

固定 Contract 保持 `1.3.0-contract / RC`，canonical SHA `5c87eeb9bca39585cea2e3c80c60d58813b4367e1a60b161ed8c7f82af4a19ed`；依赖锁文件未变。未提交候选交由最终 Reviewer 操作 commit/push/PR/merge。

以下记录仅描述已接受的 7.0 Foundation 及 SEC-01 历史范围，其中旧 HEAD、未实施业务和旧验收条件不代表当前 G1 状态。原始 7.0 冻结工作区保持不变。

## Foundation 历史说明：Docker 单入口

在仓库根目录执行：

```bash
bash BNBU-Sports-Backend/src/bootstrap/run-foundation.sh
```

宿主机使用 Git、Bash 和 Docker Engine/Compose；不需要宿主机 Node/npm。入口验证固定 HEAD 与 canonical Git SHA、修改路径白名单和 `git diff --check`，按 digest 获取镜像并在容器内 `npm ci`，并在镜像构建阶段执行在线 `npm audit --json`。已知依赖告警非零或审计响应无效时构建失败；运行验证器还核对审计绑定的 lockfile SHA。每次使用唯一 Compose project、新空 PostgreSQL 数据目录；无宿主机端口映射、内部网络、仅合成数据。随机数据库密码只通过临时进程环境注入，显式忽略 `.env`，退出时删除本次容器/网络/数据。

Node test 容器内串行执行：环境、依赖与审计绑定 → 原始 OpenAPI/fixture SHA → 重新生成类型且字节无差异 → strict typecheck → lint → 契约兼容 → 架构 → 真实 PostgreSQL migration、四层 round-trip、HTTP health、事务和重建测试。遇到非零立即失败；数据库正常启动检查使用 TCP，避免把初始化临时 Unix socket 当成最终实例。

主要证据：

- `evidence/phase7/7.0/summary.json`：容器步骤、命令、cwd、退出码、版本和用例分母。
- `evidence/phase7/7.0/host-entry.json`：完整宿主机入口退出码与清理退出码；复核通过需要二者均为 0，不能只看旧 summary。
- `evidence/phase7/7.0/compatibility-cases.json`：992 个原始 fixture 的逐例结果和六组 union 索引。
- `evidence/phase7/7.0/architecture.json` 与 `vitest-*.json`：架构结论、真实测试名和结果。
- `evidence/phase7/7.0/source-manifest.json`：实际测试容器源码的逐文件 SHA-256；汇总记录其整体 SHA。
- `evidence/phase7/7.0/dependency-audit.json` 和 `.meta.json`：构建时的原始在线审计、时间与 lockfile SHA；使用构建缓存时复用该明确标时的审计快照。
- `evidence/phase7/7.0/sec-01/`：整改前记录、修复版本查询、精确安装和依赖树证据。
- `evidence/phase7/7.0/intake.json`、`host-*.json`、`container-versions.json`、`postgres-runtime.json`：PRE 与实际环境。
- `evidence/phase7/7.0/attempts/`：前次结果归档；失败记录不覆盖成成功。

宿主机启动/构建失败也产生 FAIL 汇总；清理失败使整个入口非零。重跑会产生新的时间、project 与结果，复核以当次入口输出和 source manifest 为准。

## Foundation 历史说明：固定输入和 SEC-01 修正后的工具

- HEAD：`200ff07e22ff6e2e253d965765a498088af2463c`。
- Contract：`1.3.0-contract / RC`；canonical Git/LF OpenAPI SHA-256：`5c87eeb9bca39585cea2e3c80c60d58813b4367e1a60b161ed8c7f82af4a19ed`。
- Fixture：原始 `contracts/validation/step07_handoff/fixtures.json`，SHA-256 `d3c2a37f4bad298f383b70579a3e5d22e5e117cd0cee238beb6b6d336dc0deef`。
- Node `24.19.0` / npm `11.17.0`，Node 镜像 digest `sha256:a9f5f7c91a432850b2a8a7797adf5eadb6c733ceed61167806cee7ea7fbc29df`。
- PostgreSQL `17.6`，镜像 digest `sha256:f3bd19c606e442c3d7bdfa8002e03fe260a1023351e0ea4598032022b68dd6e3`。执行机原生 `linux/arm64`。
- TypeScript `5.9.3`、Fastify `5.12.3`、openapi-typescript `7.13.0`、Ajv `8.20.0`、ajv-formats `3.0.1`、yaml `2.9.0`、pg `8.16.3`、node-pg-migrate `9.0.0`、Vitest `4.1.11`、ESLint `9.39.4`。
- `@vitest/mocker` 随 Vitest 精确锁定 `4.1.11`。仅对 `@redocly/openapi-core@1.34.19` 的 `js-yaml` 设置 `4.3.2` override，修复该传递链；openapi-typescript 和 Redocly 本身版本不变。另对 `vitest@4.1.11` 的 `vite` 固定 `7.3.6`，保留未告警的原工具版本，避免 npm 顺带升到 Vite 8。
- 补充编译/静态检查依赖：`@types/node 24.13.3`、`@types/pg 8.23.1`、`@typescript-eslint/parser 8.70.0`。全部精确锁定于 package-lock，`npm ls --depth=0` 实测留证。

## Foundation 历史说明：实现与验证范围

`src/bootstrap/main.ts` 是原生 Node TypeScript Composition Root，负责配置、PostgreSQL pool、HTTP server 和资源生命周期。只有 `/health/live` 和 `/health/ready`：ready 必须实际执行 `SELECT 1`；数据库不可用返回 503。启动所需配置为 `PGHOST/PGDATABASE/PGUSER/PGPASSWORD`，`PGPORT` 默认 5432、`LISTEN_HOST` 默认 127.0.0.1、`PORT` 默认 3000。`npm run start:foundation` 在已安装依赖的固定 Node 容器内启动；统一集成测试会实际派生该入口进程并通过 HTTP 验证启动及 SIGTERM 退出。

`src/shared/api/contract.generated.ts` 从原始冻结 OpenAPI 生成，`npm run contract:generate` 生成、`contract:check` 检查。Ajv 使用 2020-12 与完整 formats；保留 schema 自身 unknown-field 策略，关闭 coercion/default/removeAdditional/$data。`strict: false` 允许 OpenAPI 注解，不关闭 schema 断言。

契约测试运行全部 992 例（159 合法）：原 union 59 例/7 个合法分支全部 round-trip；新增三组 union 及直接相关例同样运行。测试专用 API/Application/Domain 表示探针对六组 union 的分支标记作显式双向映射，其余内容作严格不可变值保存。这证明表示兼容，不代表对应业务用例已经实现。

`applications-certification` 是唯一生产模块。API Mapper 仅映射独立 Application Command/Result，Domain 使用闭集 Value Object，Persistence Mapper 独立重建并拒绝未知 DB 值。Repository Port 在 Application，具体实现仅访问自己的 `foundation_probe.certification_kind`，不控制顶层事务。Application 通过不含 driver/Row 的 scope 启动事务；连接/BEGIN/COMMIT 的 driver 错误映射为固定 Port 错误，回调错误保留，失败执行 rollback，scope 随结束失效。

`0000_foundation.sql` 仅建立 probe schema/table：`uuid PRIMARY KEY` 与 `text NOT NULL CHECK (certification_kind IN ('SCHOOL_TEAM','STUDENT_CLUB'))`。迁移入口只接受测试名/用户 `p7_foundation`；down、up 和清空重建均在每次新建的测试库实测，不是生产恢复方案。后续波次必须另建业务 migration。

架构检查覆盖层依赖、DTO/Row 泄漏、模块/表 Owner、Repository 位置、事务控制归属、共享文件 allowlist 和 import cycle，并用违反规则的反例验证检查器。静态规则是当前 TypeScript/显式 SQL 的门禁，不宣称可证明任意动态语言程序。业务跨模块事务、鉴权、外部邮件/对象存储/OCR/校历集成均未执行，事务覆盖标记 `NOT_APPLICABLE_TO_BUSINESS_SLICE`。

## Foundation 历史说明：已知限制与审核

H 回执 `WI-0032-phase7-z0-review.md` 提出集中 Finding SEC-01。本轮仅升级受影响依赖与必要的审计/交付配置，保留旧报告 `sec-01/before-dependency-audit.json`。旧结果是 7 个受影响包节点（3 moderate、3 high、1 critical），并非 7 个独立漏洞。修正后的精确组合经全新 `npm ci` 和在线 audit 确认为 0 个受影响包节点；单入口构建再次生成绑定当前 lockfile 的新审计，并执行完整 G0。

Vitest 选择 4.1.11，同时修复 UI 公告和 mocker 路径穿越，依据[官方公告](https://github.com/advisories/GHSA-82fw-gwwq-j7x9)，没有把旧 audit 的 `fixAvailable=3.2.7` 当成充分修复。Redocly 的 js-yaml override 使用[官方已修复版本](https://github.com/nodeca/js-yaml/security/advisories/GHSA-2883-xcg3-v3hh)；生成输出一致性仍由 G0 验证。

0 个已知依赖告警不是全系统安全认证。业务鉴权、资源归属和外部服务安全仍属后续波次；当前只运行 Vitest CLI 与内部健康路由。SEC-01 的实现完成后只交 H 核对关闭情况，不启动第二轮全文互审。

所有代码改动保留为未提交候选。交接说明见 [7.0 Foundation Handoff](../docs/rebuild/handoffs/new-req-phase-7-0-foundation.md)。仓库 STATUS、业务规则、Contract、客户端与生产配置保持原状；commit/push/PR/merge 由用户操作。
