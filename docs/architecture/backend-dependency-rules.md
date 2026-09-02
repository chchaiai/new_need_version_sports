# Phase 3A：Backend 依赖与架构测试规则

> 设计日期：2026-08-31（Asia/Shanghai）
>
> 规则状态：`DONE (DESIGN)`
>
> 实现状态：`NOT EXECUTED`；具体静态分析工具在 Phase 6.0 随技术栈确定，但本文件的可判定规则不得改变
>
> 当前唯一 Contract 基线：`1.2.0-contract` / `RC` / OpenAPI SHA-256 `667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a`；Contract 缺口必须先走 Change Request

## 1. 规范用语与根路径

本文中的“必须”“禁止”“只能”是架构门禁，不是建议。默认源码根路径为：

```text
BNBU-Sports-Backend/src/
├── bootstrap/
├── shared/
└── modules/<module>/
    ├── api/
    ├── application/
    ├── domain/
    └── infrastructure/
```

测试根路径为：

```text
BNBU-Sports-Backend/tests/
├── unit/
├── integration/
└── architecture/
```

如果最终技术栈要求不同源码后缀或测试 runner，可以改变机械配置，不能改变层级语义、Repository Port 位置、模块 Owner 或禁止依赖。

## 2. 层内依赖矩阵

`允许` 表示可以按最小需要依赖；不是要求每个文件都建立依赖。

| 来源层 | `api` | `application` | `domain` | `infrastructure` | `bootstrap` | 框架/ORM/SDK |
|---|---:|---:|---:|---:|---:|---:|
| `api` | 允许 | 允许 | 禁止 | 禁止 | 禁止 | 仅允许 HTTP/schema/Contract 边界库；禁止 ORM/DB/COS SDK |
| `application` | 禁止 | 允许 | 允许 | 禁止 | 禁止 | 禁止 Controller/HTTP/ORM/具体 SDK；只允许无框架基础库 |
| `domain` | 禁止 | 禁止 | 允许 | 禁止 | 禁止 | 禁止框架、ORM、HTTP、日志、配置、系统 I/O |
| `infrastructure` | 禁止 | 允许 | 允许 | 允许 | 禁止 | 允许被该 Adapter 封装的 ORM/driver/SDK |
| `bootstrap` | 仅装配 | 仅公开能力/Port | 只允许构造所需公开类型 | 允许 | 允许 | 允许配置、server、DI 和资源生命周期库 |

附加规则：

- API 不直接依赖 Domain；API Mapper 只映射 Application input/output；
- Application 不 import API DTO，即使字段完全一致；
- Domain 不 import Application Port。时间和 ID 等纯抽象来自获准的 `shared/domain/ports/`；
- Infrastructure 可以调用 Domain constructor/factory 和实现 Application Port，但不能让内层 import 它；
- Bootstrap 可以实例化具体对象，但不能调用 Domain 行为决定一次业务动作；
- test fixture 可以依赖被测层，但生产源码不能反向依赖 `tests/`。

## 3. 模块间依赖规则

业务模块之间的生产源码直接 import 一律禁止：

```text
src/modules/module-a/**  -X->  src/modules/module-b/**
```

允许的跨模块运行时协作路径只有：

```text
module-a/application/ports/<needed-capability>
  ↑ implemented by
bootstrap/integration/<module-a>-to-<module-b>
  ↓ delegates to
module-b/application/public/<public-capability>
```

或者：

```text
module-b source fact
  ↓ versioned integration/outbox event
module-a idempotent consumer / rebuildable projection
```

因此：

- 消费方 Port 使用消费方语言表达最小需要；
- 提供方公开能力使用提供方语言并保护自己的 Domain；
- integration adapter 负责模型转换，不复制业务规则；
- 只有 `bootstrap/integration/` 同时看见两个模块的公开 Application surface；
- 不得从其他模块的 `domain/`、`infrastructure/`、`api/` 或非公开 `application/` import；
- 不得通过相对路径、路径别名、barrel re-export、动态 import、反射或依赖注入 token 绕过检查；
- 不得共享跨模块 ORM relation、数据库 model、Repository instance 或 transaction-specific row 类型；
- 模块运行时循环必须由消费方 Port + Composition Root 或事件打断，生产源码 import graph 必须无模块环。

## 4. Repository 与其他 Port

### 4.1 Repository Port

所有业务 Repository Port 必须位于：

```text
src/modules/<owner>/application/ports/
```

所有具体持久化实现必须位于：

```text
src/modules/<owner>/infrastructure/persistence/repositories/
```

强制规则：

- `domain/` 禁止声明 Repository Interface；
- `api/`、`bootstrap/` 和 `shared/` 禁止声明业务 Repository；
- Repository 名称和方法按 Aggregate/业务需要设计，不按每张表生成 CRUD；
- 写 Repository 接受/返回 Domain Aggregate、Value Object 或明确保存结果；禁止返回 ORM Entity/Row；
- Read Port 可以返回 Application Query Result；不得返回 ORM Entity/Row；
- Repository 实现只能访问 Owner 模块的表/view；跨模块读取必须调用公开 Read Port；
- 具体 Repository 不自行开启或提交顶层事务；它参加 Application 提供的 transaction scope；
- constraint/driver 错误必须在 Infrastructure 边界映射，不能把 SQLSTATE、constraint 名或 SQL 泄漏到内层。

### 4.2 External Port

对象存储、内容探测、任务执行、跨模块能力和以后经批准的外部服务 Port 同样由消费 Use Case 所在 Application 声明。Infrastructure 实现技术 Port；Composition Root 实现跨模块 integration Port。

Port 必须最小化。例如业务模块只能请求“验证并锁定这些 evidence asset”之类的业务所需能力，不能取得通用 COS client、数据库连接或其他模块 Repository。

### 4.3 基础抽象

以下稳定、无业务归属的抽象允许进入 shared allowlist：

| 路径 | 允许内容 | 禁止内容 |
|---|---|---|
| `shared/domain/` | opaque ID 基础、通用不可变结果、基础 Domain error | Course/Review/Application 等业务枚举或 Policy |
| `shared/domain/ports/` | `Clock`、`IdGenerator` 等纯能力抽象 | Repository、HTTP client、ORM session |
| `shared/application/` | 基础 Application error、request correlation、keyset cursor | 业务 Use Case、Contract DTO、通用 CRUD |
| `shared/application/transactions/` | transaction runner / unit-of-work 抽象 | 具体 driver、业务锁顺序、自动 commit 的 Repository |
| `shared/api/` | Contract 公共 envelope 的最小协议映射（仅在 Contract 明确存在时） | 业务 DTO、Domain Model、ORM 类型 |

任何 shared 新增项必须同时满足：无明确业务 Owner、至少两个模块真实复用、API 稳定、架构 allowlist 测试通过。

## 5. 模型与 Mapper 规则

### 5.1 Contract DTO

Contract RequestDTO / ResponseDTO 及生成类型只能从本模块 `api/` 或获准的 `shared/api/` 引用。禁止在以下位置出现 Contract/OpenAPI 生成类型 import：

```text
application/
domain/
infrastructure/persistence/
```

API Mapper 必须把 DTO 映射为 Application Command/Query，把 Application Result 映射为 ResponseDTO。客户端提交的正式时长、business date、credited minutes、换算分、当前审核结果、审计时间等服务端事实不能因为 DTO 中存在同名字段而进入 Domain。

### 5.2 Application Command / Result

Application input/output：

- 不包含 HTTP status、header、cookie、request/response 对象；
- 不包含 ORM annotation、lazy relation 或 driver 类型；
- 可以包含 ActorContext、expected version、command id、opaque ID 和 Use Case 所需数据；
- 只返回用例需要的结果，不返回整个 Aggregate 图或内部安全字段。

### 5.3 Domain Model

Domain：

- 不使用 Contract decorator、ORM decorator、serialization annotation 或 framework base class；
- 不读取环境变量、当前系统时间或全局随机数；
- 不记录 HTTP status；
- 不持有其他模块内部 Entity；跨边界只保存已批准的 opaque ID/快照；
- 所有状态变化通过命名行为或 Policy，禁止 Application/Infrastructure 任意赋值核心状态。

### 5.4 Persistence Model

ORM Entity / Row 只能在 Owner 模块 `infrastructure/persistence/` 使用。Persistence Mapper：

- 负责 row 与 Domain Aggregate/Value Object 的重建和拆解；
- 必须验证非法持久化状态，不能静默补默认值；
- 不执行权限判断或业务状态转换；
- 不映射成 Contract DTO；
- 不把 secret digest、object key、safe metadata 或内部 FK 交给 API。

### 5.5 Query fast path

简单查询允许：

```text
API → Application Query Handler → Read Port → Infrastructure Read Adapter
```

Read Adapter 可执行 Owner 范围内的投影 SQL并直接产生 Application Query Result，无需强行重建 Aggregate。但仍必须遵守组织/资源权限、模块表 Owner、API Mapper 和错误边界；不得把 ORM Row 原样返回。

## 6. 事务与副作用依赖规则

### 6.1 事务所有权

- 顶层写 Command Handler 是事务 Owner；
- Application 通过 transaction abstraction 声明事务；Infrastructure 实现；
- 跨模块参与式 Application 能力必须加入当前 transaction scope；
- API、Domain、Mapper 和 Repository 单方法不得自行 commit；
- 禁止“先提交业务、再尽力写 AuditEvent/正式站内通知”；
- 禁止把 Controller decorator 或 ORM 默认行为当作唯一事务定义；
- 禁止跨模块各自提交后用补偿掩盖本应同库原子的业务动作。

### 6.2 外部 I/O

数据库事务中禁止等待：

- COS 文件上传、下载或内容探测；
- 邮件、短信或外部 HTTP；
- password hash 大计算；
- XLSX/CSV 全量解析；
- ZIP 生成。

允许在短事务中保存状态、CAS、metadata、outbox/task 和最终绑定。外部步骤失败必须保持真实中间/失败状态，可重试且幂等；不能返回正式业务成功。

### 6.3 时间与随机

- API 不接受客户端时间作为正式 created/transition/audit time；
- Application 通过 `Clock`/数据库时间 Port 取得权威 instant；
- Domain 方法显式接收所需时间或纯抽象；
- ID、邀请 token 和安全随机数通过用途明确的 Port 生成；
- Domain 和 Application 禁止直接调用全局系统时间/随机实现。

## 7. 认证、权限与系统模式依赖

```text
Middleware authentication
  ↓ verified ActorContext
API
  ↓
Application authorization / ownership / mode orchestration
  ↓
Domain state invariants
  ↓
Repository predicate + PostgreSQL constraint/RLS
```

规则：

- 请求体、query 或 header 中的 organization/user/role 不得覆盖 ActorContext；
- Controller Guard 不能是唯一权限校验；
- `admin-governance` 提供固定八项权限的公开判断，目标模块仍验证资源和动作；
- Course ownership、当前责任教师、Enrollment 归属等由对应 Owner 模块判断；
- 所有普通写 Use Case 通过 `system-mode` 公开 Port fail closed；未知、缺失、读取失败或非法 mode 不得当作 `NORMAL`；
- RLS/SQL predicate 不能替代 Application 权限，也不能因已有 Application 权限而省略；
- 内部 worker 必须使用明确 system actor/capability，只能执行其任务，不获得通用管理员权限。

## 8. 错误与日志依赖规则

| 边界 | 输入 | 输出 | 禁止泄漏 |
|---|---|---|---|
| Domain | 非法状态/不变量 | 命名 Domain Error | HTTP、SQL、ORM、SDK |
| Application | Domain Error、Port failure、权限/并发结果 | 稳定 Application Error/Result | Controller、status code、constraint 名 |
| Infrastructure | driver/ORM/SDK exception | Port 声明的失败类型；内部安全 cause | SQL、object key、secret、签名 URL |
| API Error Mapper | Application Error | Contract `error.code` + HTTP status + 安全 details | stack、路径、内部 ID、完整 PII |

基础访问日志、技术日志和 AuditEvent 必须区分：

- Middleware/Infrastructure 记录 requestId、耗时和安全技术结果；
- Application 通过 `audit` Port 写正式动作审计；
- Domain 不依赖日志框架；
- 不得记录密码、验证码、Token、原始幂等键、完整 PII、媒体内容、COS object key 或签名 URL；
- 记录失败不能把业务失败改成成功，也不能用日志替代正式 AuditEvent。

## 9. Bootstrap / Composition Root 限制

Bootstrap 允许：

- 配置 schema validation；
- 资源创建和销毁；
- Port/Adapter 绑定；
- Route/Middleware 注册；
- integration adapter 装配；
- transaction scope 传播；
- worker 注册和健康探测。

Bootstrap 禁止：

- `if role === ...` 形式的业务权限规则；
- Course/Session/Review/Application 状态转换；
- 直接 SQL 业务写入；
- 直接调用其他模块 Repository；
- 根据框架异常拼业务成功；
- 成为共享 `ServiceLocator` 供 Domain/Application 随时取具体实现。

生产源码只有 Composition Root 可以实例化具体 Infrastructure Adapter。业务模块 API/Domain/Application 不直接 new 具体 Repository 或 SDK client。

## 10. 架构依赖测试方案

Phase 6.0 必须在首个业务 Slice 前创建 `tests/architecture/` 并把以下测试设为 CI 必过项。工具可以是所选语言生态中的 AST/import graph/architecture test 工具组合，但测试语义固定。

### 10.1 `layer-direction`

自动扫描生产源码 import graph，断言：

- Domain 不依赖 API/Application/Infrastructure/Bootstrap/Contract/ORM/framework；
- Application 不依赖 API/Infrastructure/HTTP/ORM/具体 SDK；
- API 不依赖 Domain/Infrastructure/ORM/数据库/COS SDK；
- Infrastructure 只能依赖本模块内层；
- Bootstrap 不能被任何内层 import；
- 生产 import graph 无环。

### 10.2 `module-isolation`

断言：

- `src/modules/<a>/**` 不直接 import `src/modules/<b>/**`；
- 只有 `bootstrap/integration/` 可以同时引用两个模块的 `application/public/`；
- 不存在跨模块 ORM relation、Repository import、SQL model re-export 或动态路径绕过；
- 每个 persistence model/table/view 有且只有一个 Owner 模块登记。

### 10.3 `port-placement`

断言：

- 业务 Repository interface 只位于 `application/ports/`；
- 名称或标记为 Repository implementation 的类型只位于 `infrastructure/persistence/repositories/`；
- Domain/API/shared/bootstrap 中没有业务 Repository；
- Infrastructure Adapter 实现的 Port 确实由 Application 声明；
- Repository public signature 不含 ORM Entity/Row/driver 类型。

### 10.4 `model-boundaries`

断言：

- Contract/OpenAPI generated import 只出现在 `api/` 或获准 `shared/api/`；
- ORM decorator/package/import 只出现在 Infrastructure；
- Domain 类型无 framework/serialization/ORM annotation；
- API response 类型不引用 Persistence Model；
- API Mapper 与 Persistence Mapper 是不同组件；
- internal secret/object-storage/audit metadata 字段不会进入 Contract response mapper。

### 10.5 `shared-kernel-allowlist`

断言 `shared/`：

- 不依赖业务模块；
- 只包含审核后的目录和类型；
- 不出现业务枚举、业务 DTO、业务 Repository、通用 CRUD 或跨模块查询；
- 新增 public symbol 未加入显式 allowlist 时失败。

### 10.6 `composition-root`

断言：

- 所有具体 Adapter 只在 Bootstrap/测试 Composition Root 实例化；
- 业务模块不使用全局 service locator；
- 每个必需 Port 有且只有一个生产绑定，测试替身只存在于 tests；
- integration adapter 只做转换/委派，不依赖 provider Infrastructure。

### 10.7 `transaction-boundaries`

使用真实 PostgreSQL 集成测试验证：

- Record + Media binding + initial Review + AuditEvent 任一步失败整体回滚；
- Application + evidence + Decision/Credit/Endurance outcome + Notification + AuditEvent 整体回滚；
- Feedback status + public Reply + Notification + AuditEvent 整体回滚；
- Help Revision + pointer/state + AuditEvent 整体回滚；
- Mode Transition + current state + bulk Notification + AuditEvent 整体回滚；
- account delete removes current account data while preserving opaque subject/正式历史/audit；
- teacher account delete does not query Course responsibility as a blocker, does not mutate/transfer `responsible_teacher_subject_id`, and preserves existing Course references to the opaque subject；
- 参与模块加入同一事务，不产生部分成功或嵌套独立提交。

### 10.8 `error-mapping`

表驱动测试验证：

- 每个公开 Application Error 都映射到当前 Contract 允许的稳定 code/status；
- Domain Error 不包含 HTTP；
- unique/check/FK/concurrency/permission/unknown driver errors 不暴露 SQLSTATE、constraint 名、SQL 或 stack；
- 未识别错误 fail closed，不能返回空成功或默认业务状态。

### 10.9 `authorization-and-mode`

集成测试覆盖：

- 责任教师 Course ownership；
- 学生本人/Enrollment ownership；
- 固定八项管理员权限和总/分管理员边界；
- 管理员账号管理不能修改/转移责任教师或调用 Course mutation；教师账号删除没有 Course 责任 blocker；
- organization isolation 与 RLS；
- `NORMAL/MAINTENANCE/unknown/read-failure` 的 fail-closed 行为；
- 内部 worker 只能执行明确任务；
- Guard 绕过测试仍被 Application 权限拒绝。

### 10.10 `read-model-ownership`

断言：

- Statistics 和管理员概览只使用公开 Read Port/owner-owned view；
- 不存在跨模块私有表 join；
- projection 可从 source facts 重建且客户端不可写；
- 缓存/projection 不可用时返回真实不可用或陈旧标识，不改写 source facts。

## 11. CI 门禁与例外

Backend 每次合并前至少按顺序执行：

```text
architecture tests
→ compile / typecheck
→ lint / static analysis
→ unit tests
→ targeted PostgreSQL/COS integration tests
→ Contract conformance tests
```

任何架构测试失败都阻止合并。不得通过跳过目录、永久 ignore、复制类型、动态 import、关闭规则或把代码移入 `shared/` 来“修复”测试。

确需改变 Owner、依赖方向、事务参与者或模块通信方式时，必须先提交并批准架构 Change Request，更新三份 Phase 3A 文档及对应测试，再修改实现。框架升级或目录命名变化只有在不改变规则语义时才可作为机械配置调整。

## 12. Phase 3A 判定

本文件已经把以下内容变为可测试规则：

- API → Application → Domain 的单向依赖；
- Infrastructure → Application/Domain Port 的依赖反转；
- Bootstrap 只负责装配；
- Repository Port 统一在 Application；
- Contract、Application、Domain、Persistence 模型隔离；
- 模块之间无直接 import、无跨表/Repository 穿透；
- 写 Use Case 的事务、权限、系统模式、Audit 和错误映射位置；
- 架构测试的文件位置、检查项和 CI 失败语义。

具体工具尚未选择不会阻塞 Phase 6.0：Phase 6.0 只能选择能落实上述断言的工具，不能用工具限制反向修改架构规则。
