# Phase 3A Backend 内部架构蓝图与模块边界 handoff

> 日期：2026-08-31（Asia/Shanghai）
>
> 分支：`API-contract-Making`
>
> 起始 HEAD：`8a6635420542418828093dfceb1da4d0c3e4fa78`
>
> 完成状态：`DONE`（架构文档范围）
>
> 实现状态：`NOT EXECUTED`
>
> Phase 4 后续唯一 Contract 基线：`1.0.0-contract` / `RC` / OpenAPI SHA-256 `ff15441b84f0729626a49c6898ea4896e80321b8e873a933768a509fd4c8478f`；本 handoff 的架构输入不得扩展该协议

## 1. 目标与边界

本阶段在正式 Backend 初始化前固定：

- HTTP 请求的职责链；
- API/Application/Domain/Infrastructure/Bootstrap 的允许与禁止依赖；
- 业务模块的唯一写 Owner；
- Repository Port 与实现的统一位置；
- Contract DTO、Application/Domain、Persistence Model 的 Mapper 边界；
- 写 Use Case 的事务、权限、系统模式、审计、通知和错误边界；
- 跨模块同步 Port、Read Model、Event/Outbox 规则；
- Phase 6.0 必须建立的架构依赖测试。

只修改了：

- `docs/architecture/`；
- `docs/rebuild/STATUS.md`；
- `docs/rebuild/handoffs/`。

没有修改或创建 Backend、数据库、Contract、Android、Web、infra、部署或产品测试代码。

## 2. 权威输入

已读取：

- 根 `AGENTS.md`；
- `docs/rebuild/STATUS.md`；
- `docs/rebuild/00-scope.md`；
- Phase 2/3 handoff；
- `docs/architecture/phase-3-domain-and-database-design.md`；
- 四份当前 `docs/business/` 业务权威。

仓库中另有 Portal 子目录 `AGENTS.md`，但本轮既不进入也不修改 Portal，因此不适用。旧 API、旧 DTO、Mock、页面导航和框架默认目录没有成为架构输入。

## 3. 核心架构决定

### 3.1 总体形态

固定采用：

```text
Modular Monolith
+ Clean Architecture
+ DDD Lite
+ Vertical Slice Delivery
```

一个 Backend 部署单元内按业务 Owner 严格隔离；不提前拆微服务，不为简单查询制造空层，也不先生成所有模块空壳。

### 3.2 运行时与编译期方向

```text
HTTP
→ Middleware / Guard
→ API + API Mapper
→ Application Use Case
→ Domain
→ Application Port
→ Infrastructure Adapter
→ PostgreSQL / COS
```

源代码依赖固定为 `api → application → domain`，Infrastructure 实现内层 Port，Bootstrap 只做装配。Domain 不认识 Contract、HTTP、ORM、日志框架、环境变量、系统时间或其他模块内部类型。

### 3.3 Repository Port

统一位置：

```text
src/modules/<owner>/application/ports/
```

具体实现统一位置：

```text
src/modules/<owner>/infrastructure/persistence/repositories/
```

Domain 不声明 Repository；禁止按每张表机械生成 CRUD；Read Port 返回 Application Query Result，不能返回 ORM Row。

### 3.4 模块间依赖

业务模块生产代码禁止直接 import 其他业务模块。同步协作采用：

```text
消费模块 Application Port
→ bootstrap/integration adapter
→ 提供模块 application/public 能力
```

最终一致协作可以使用有版本的 PostgreSQL outbox/event；只读协作使用 Owner 公开 Read Model。共享同一个 PostgreSQL 不授权跨模块 SQL、ORM relation 或 Repository。

### 3.5 事务与副作用

一个顶层写 Application Use Case 对应一个明确事务。跨模块参与能力加入同一 Unit of Work；成功 mutation、AuditEvent 和业务已确认的站内通知同事务。COS 上传/探测、密码 hash、XLSX/CSV 解析和 ZIP 生成放在长事务外，通过短事务状态机、CAS 和 PostgreSQL worker 衔接。

没有引入 Redis、消息队列、微服务或外部通知渠道。

### 3.6 三模型与错误

```text
Contract DTO
↕ API Mapper
Application Command/Result 或 Domain Model
↕ Persistence Mapper
ORM Entity / Database Row
```

Domain Error 先转换为 Application Error/Result，再由 API Error Mapper 转为 Contract code/status。SQLSTATE、constraint 名、SQL、stack、object key 和 secret 不向客户端暴露。

## 4. 模块 Owner 结果

共固定 17 个业务/支撑模块：

1. `identity-access`；
2. `admin-governance`；
3. `academic-term`；
4. `course-enrollment`；
5. `exercise-session`；
6. `media-evidence`；
7. `exercise-record`；
8. `record-review`；
9. `endurance`；
10. `applications-certification`；
11. `grading`；
12. `statistics`；
13. `feedback`；
14. `help-content`；
15. `system-mode`；
16. `notification-center`；
17. `audit`。

管理员是 Actor，不是通用业务模块。分管理员和固定八项权限归 `admin-governance`；学期、账号、课程只读、反馈、换算规则、系统模式、帮助和审计仍分别归各自 Owner。不存在可以直接访问全部表的 `AdminService` 或 `AdminRepository`。

## 5. 主要跨模块事务 Owner

| 动作 | 顶层 Owner | 原子参与者摘要 |
|---|---|---|
| 邀请加入 | `course-enrollment` | identity、current term、audit |
| Record 提交 | `exercise-record` | enrollment、completed session、verified media、initial review、audit |
| Review 追加 | `record-review` | record、course ownership、notification、audit |
| 申请决定 | `applications-certification` | course、media、endurance/credit、notification、audit |
| 最终成绩发布 | `grading` | course ownership、notification、audit |
| 系统模式切换 | `system-mode` | admin permission、notification、audit |
| 账号终止 | `identity-access` / `admin-governance` 入口 | 学生进行中业务和分管理员职责 blockers、current account data delete、grant revoke、audit；教师删除无 Course 责任 blocker或 Course mutation；正式历史保留 |

完整参与者和事务外步骤见模块边界文档。

## 6. 架构测试门禁

Phase 6.0 必须先建立 `tests/architecture/`，覆盖：

- `layer-direction`；
- `module-isolation`；
- `port-placement`；
- `model-boundaries`；
- `shared-kernel-allowlist`；
- `composition-root`；
- `transaction-boundaries`；
- `error-mapping`；
- `authorization-and-mode`；
- `read-model-ownership`。

具体测试工具可以随最终语言/框架选择，但检查语义和 CI 阻断条件不可更改。

## 7. 产物

- [Backend 内部架构蓝图](../../architecture/backend-architecture.md)；
- [Backend 模块边界与 Owner](../../architecture/backend-module-boundaries.md)；
- [Backend 依赖与架构测试规则](../../architecture/backend-dependency-rules.md)；
- [架构文档索引](../../architecture/README.md)；
- [Rebuild Status](../STATUS.md)。

## 8. 验证结果

| 验证 | 真实结果 |
|---|---|
| 修改路径范围检查 | PASS；变化只位于三个授权路径 |
| `git diff --check` + 新文件 whitespace 扫描 | PASS |
| 严格 UTF-8 解码 | PASS |
| Markdown 相对链接检查 | PASS |
| Markdown fence/关键章节检查 | PASS |
| 三文档关键规则一致性 | PASS；总体形态、17 模块、Application Repository Port、零跨模块 direct import、Application 事务、Mapper/error 边界一致 |
| 禁止路径/能力扫描 | PASS；无 Backend/migration/Contract/client 变化，无 Redis/MQ/微服务/空接口/TODO/Fake Success |

## 9. 未执行

- Backend 初始化、build、typecheck、lint、unit/integration/architecture tests：`NOT EXECUTED`；无正式 Backend 代码；
- PostgreSQL schema/migration/constraint/transaction/RLS：`NOT EXECUTED`；
- Contract DTO/OpenAPI/version bump：`NOT EXECUTED`；
- 真实 COS、登录、浏览器、Android、跨端 E2E：`NOT EXECUTED`；
- Staging、Production、部署、发布、push/PR/tag：`NOT EXECUTED`。

## 10. 阶段结束登记

```text
完成状态：DONE

修改文件：
docs/architecture/backend-architecture.md
docs/architecture/backend-module-boundaries.md
docs/architecture/backend-dependency-rules.md
docs/architecture/README.md
docs/rebuild/STATUS.md
docs/rebuild/handoffs/phase-3a-backend-architecture-and-module-boundaries.md
docs/rebuild/handoffs/README.md

执行的测试：
修改路径范围、whitespace、严格 UTF-8、相对链接、Markdown fence/结构、关键规则一致性、禁止事项扫描

真实测试结果：
全部文档级检查 PASS

未执行测试及原因：
Backend/数据库/Contract/客户端/真实环境测试均 NOT EXECUTED；本阶段只做架构文档且未创建实现

是否修改了业务规则：
否

是否修改了 Contract：
否

是否存在旧 API 引用：
是；既有旧 API 仍存在，本阶段未迁移、恢复或删除

是否存在 Mock、TODO、空接口：
既有实现状态未改变；本阶段未新增 Mock、TODO、占位模块、空接口或 Fake Success

下一阶段前置条件：
Contract 独立 Phase 完成并由 Backend 加载；Phase 6.0 先建立架构测试和最小 Composition Root，再按 Vertical Slice 实现；不得反向修改本阶段 Owner、Port、事务和 Mapper 边界
```

Phase 3A 没有发现阻塞 Phase 6.0 初始化的架构歧义。该结论只表示蓝图完整，不表示 Backend、数据库、Contract 或产品已经实现。
