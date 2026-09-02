# Phase 3A：Backend 内部架构蓝图

> 设计日期：2026-08-31（Asia/Shanghai）
>
> 架构状态：`DONE (DESIGN)`
>
> 实现状态：`NOT EXECUTED`；本文不初始化 Backend、不选择或安装框架、不创建数据库 migration，也不修改 Contract
>
> 当前唯一 Contract 基线：`1.2.0-contract` / `RC` / OpenAPI SHA-256 `667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a`；Backend 不得自行补充或改变其语义

## 1. 权威输入与适用范围

本文规定正式 Backend 内部的职责分层、依赖方向、事务位置、模型映射和组合边界。业务规则仍只以以下四份文档为权威：

- [总业务流程](../business/00-overview.md)；
- [学生端业务流程](../business/10-student-flow.md)；
- [教师端业务流程](../business/20-teacher-flow.md)；
- [管理员端业务流程](../business/30-admin-flow.md)。

Domain、关系、约束和事务事实以 [Phase 3 Domain 与数据库设计](phase-3-domain-and-database-design.md) 为直接架构输入。本文不能补造业务规则、Contract 字段或数据库字段；发生冲突时必须停止实现，先回到业务权威或对应 Change Request 处理。

`P4-DECISION-05` 是当前直接架构输入：教师账号删除不要求或建立责任教师交接，Course 责任不是删除 blocker；任何层都不得让管理员通过账号管理修改/转移责任教师、管理 Course 或改写课程事实。

本文与以下两份文档共同构成 Phase 3A 权威架构蓝图：

- [Backend 模块边界](backend-module-boundaries.md)；
- [Backend 依赖规则](backend-dependency-rules.md)。

## 2. 总体形态

初版统一采用：

```text
Modular Monolith
+ Clean Architecture
+ DDD Lite
+ Vertical Slice Delivery
```

具体含义：

| 形态 | 本项目解释 | 明确不做 |
|---|---|---|
| Modular Monolith | 一个 Backend 部署单元、一个进程边界和一套受控 PostgreSQL/COS 基础设施；内部按业务模块独占写入责任 | 不提前拆微服务，不以进程间 HTTP 代替模块边界 |
| Clean Architecture | 源代码依赖指向业务核心；框架、ORM、SQL、COS SDK 都是可替换的外层实现 | 不让 Domain 或 Application 依赖框架默认目录、ORM 类型或 Controller |
| DDD Lite | 对状态机、不变量、历史追加和跨对象规则使用 Entity、Value Object、Aggregate、Policy；简单只读查询保持简单 | 不为每个查询强行创建空 Aggregate、Domain Service 或多层转发 |
| Vertical Slice | 按可验收业务动作逐片交付 API、Use Case、Domain、Port、Adapter 和测试 | 不先铺满所有模块的空文件、TODO、空接口或 Fake Success |

物理上共享一个部署单元不表示模块可以共享内部实现。每个业务事实只有一个模块可以写；跨模块协作必须经过公开 Application 能力、消费方 Port、明确 Read Model 或事件。

## 3. 运行时调用链

一个普通 HTTP 请求的职责链固定为：

```text
HTTP Request
  ↓
Middleware / Guard
  认证、requestId、限流、基础访问日志、粗粒度维护模式门禁
  ↓
API / Presentation
  Controller / Route、Contract RequestDTO/ResponseDTO、格式校验、HTTP 映射
  ↓  API Mapper
Application
  Use Case / Command / Query、权限与资源归属编排、事务与幂等编排
  ↓
Domain
  Entity、Value Object、Aggregate、Policy、核心状态机与不变量
  ↓
Application Port
  Repository Port、跨模块 Port、Clock/ID/对象存储等能力抽象
  ↓
Infrastructure Adapter
  Repository Implementation、ORM/SQL、COS、任务执行器等技术实现
  ↓
PostgreSQL / COS / 已批准外部服务
```

返回方向相反，但不能原样穿透：

```text
Database Row / ORM Entity
  ↓ Persistence Mapper
Domain Model 或 Application Query Result
  ↓ API Mapper
Contract ResponseDTO
  ↓ HTTP Response
```

Composition Root 负责在启动时装配这条链，不是每个请求中的业务步骤。Middleware 或 Guard 可以提前拒绝明显无效请求，但不能成为业务规则的唯一执行位置；任何可从非 HTTP 入口触发的写 Use Case 都必须在 Application/Domain 再次执行权威权限、系统模式、资源归属和状态校验。

## 4. 编译期依赖方向

运行时从外到内调用，源代码依赖遵守：

```text
api ───────────────→ application ───────────────→ domain
                           ↑                         ↑
                           └──── infrastructure ─────┘

bootstrap / composition-root → api + application public surface + infrastructure
domain → 仅标准库与获准的 shared/domain 基础原语
```

更严格的项目规则如下：

- `api` 只依赖本模块 `application` 的公开命令、查询和结果类型；不直接依赖 Domain、ORM 或数据库；
- `application` 依赖本模块 Domain、自己的 Port 和稳定的 `shared/application`；不依赖 Controller、具体 Repository、ORM、HTTP 或 SDK；
- `domain` 不依赖 `api`、`application`、`infrastructure`、Contract、ORM、HTTP、日志框架、环境变量或系统时钟实现；
- `infrastructure` 实现 Application 声明的 Port，因此依赖内层接口和 Domain；内层永远不反向 import 具体 Adapter；
- `bootstrap` 可以同时看见 API、公开 Application 能力和 Infrastructure，用于配置、依赖注入、Route 注册和资源生命周期；不得承载业务判断；
- 业务模块之间不直接 import 对方目录。消费方在自己的 Application 层声明需要的 Port，Composition Root 的 integration adapter 调用提供方公开 Application 能力；
- `shared/` 不得依赖任何业务模块，也不得收纳具有明确业务归属的枚举、DTO、Repository 或“万能 Service”。

可执行的精确 import 规则和架构测试见 [Backend 依赖规则](backend-dependency-rules.md)。

## 5. 各层职责

### 5.1 API / Presentation

允许：

- Controller / Route；
- 当前 Contract 的 RequestDTO / ResponseDTO 和 schema validation；
- 从已认证请求读取 `ActorContext`、requestId、locale 等传输上下文；
- Contract DTO 与 Application Command/Query/Result 之间的显式 Mapper；
- Application/Domain error 到 Contract `error.code`、HTTP status 和安全 header 的映射；
- 协议级分页、缓存、内容类型和上传握手映射。

禁止：

- 直接调用 ORM、SQL、Repository Implementation 或 COS SDK；
- 决定核心业务规则、资源归属或事务提交顺序；
- 直接构造或修改 Domain Entity；
- 把 Contract DTO 当作 Domain Entity 或数据库写模型；
- 捕获异常后返回空成功、默认业务数据或数据库错误文本。

API 格式校验只回答“请求是否符合 Contract 形状”。“当前教师是否拥有该 Course”“Session 是否可完成”“Record 是否满足业务不变量”仍由 Application/Domain 判断。

### 5.2 Application

允许：

- 一个完整业务动作对应的 Use Case、Command/Query Handler；
- Repository Port、跨模块 Port、External Service Port；
- 权限、资源归属、系统模式、幂等、并发版本和执行顺序编排；
- 事务开启、参加、提交和回滚的边界声明；
- 调用 Domain 行为并组合多个聚合的结果；
- 生成 Application Result 或只读 Query Result；
- 在同一事务中编排 AuditEvent 和已确认的站内通知事实。

禁止：

- 依赖 Controller、HTTP status、Contract DTO、ORM Entity 或具体 Adapter；
- 在 Handler 内拼 HTTP Response；
- 绕过 Domain 方法直接改核心状态；
- 把 SQL constraint 名、SQLSTATE、COS object key 或 SDK error 暴露为业务结果；
- 让每个 Repository 方法自行开启不可见事务。

Application 回答：“一个完整业务动作按什么顺序执行，哪些参与者必须原子成功，以及失败时返回哪类稳定结果。”

### 5.3 Domain

允许：

- Entity、Value Object、Aggregate / Aggregate Root；
- Domain Service、Policy、Specification；
- Domain Event 和纯业务状态机；
- 对业务不变量的命名错误；
- 由调用方传入的当前时间、ID 或随机结果。

禁止依赖或直接执行：

- HTTP、OpenAPI / Contract DTO、Controller；
- ORM、SQL、数据库连接或事务 API；
- COS、邮件、日志、队列或第三方 SDK；
- 环境变量、全局容器、系统当前时间或随机数实现；
- 其他模块内部 Entity 或 Repository。

需要时间、ID 或随机数时，Application 通过 `Clock`、`IdGenerator` 等抽象取得值并显式传入 Domain，或向纯 Domain Policy 注入对应抽象。Domain 不使用 service locator。

### 5.4 Infrastructure

允许：

- Repository Implementation；
- ORM Model / Persistence Entity、参数化 SQL、migration 对应适配；
- Persistence Mapper；
- PostgreSQL transaction runner、advisory lock、outbox/task worker；
- COS、内容探测、缓存或已批准第三方 SDK Adapter；
- 技术日志、指标和资源健康探测。

禁止：

- 决定“业务上是否允许”；
- 让 ORM hook 成为唯一业务规则；
- 返回 ORM Entity 给 API 或把 SDK 类型泄漏到 Application；
- 绕过模块 Owner 直接读写其他模块表；
- 将外部调用成功等同于业务事务成功。

数据库 constraint、trigger 和 RLS 是 Domain/Application 规则的最后并发与安全防线，不替代内层的可读业务校验。

### 5.5 Bootstrap / Composition Root

负责：

- 读取和验证配置；
- 创建数据库、COS、HTTP server 和 worker 资源；
- 将 Port 绑定到 Adapter；
- 装配跨模块 integration adapter 和共享事务上下文；
- 注册 Route、中间件和生命周期钩子；
- 启动、健康检查和有序关闭资源。

禁止：

- 保存课程、学时、审核、权限或状态转换规则；
- 成为跨模块“万能 Service”；
- 直接替 Controller 完成业务 Use Case；
- 通过条件分支绕过模块公开边界。

## 6. Repository Port 统一位置

所有业务 Repository Interface / Port 统一放在所属模块的 Application 层：

```text
src/modules/<module>/application/ports/
```

具体实现统一放在所属模块 Infrastructure：

```text
src/modules/<module>/infrastructure/persistence/repositories/
```

本项目不允许有的模块把 Repository Port 放 Domain、另一些放 Application。Domain 通过 Application 编排获得已经重建的 Aggregate，不认识 Repository。

Repository Port 按业务动作表达最小能力，例如查找当前 Enrollment、锁定 Session、保存 Aggregate 或读取明确投影；不得按每张表机械生成通用 CRUD。写 Repository 返回/接受 Domain Aggregate 或明确的持久化结果，不返回 ORM Entity。只读查询可以使用专用 Read Port 和 Application Query Result，不要求为纯投影强行重建 Aggregate。

`Clock`、`IdGenerator` 等无业务归属且稳定的纯能力抽象可以进入 `shared/domain/ports/`；事务运行器等应用基础抽象可以进入 `shared/application/transactions/`。业务 Repository、业务枚举和业务错误不得进入 `shared/`。

## 7. 事务边界与外部副作用

默认原则：

> 一个写入型顶层 Application Use Case 对应一个明确事务边界。

规则：

1. 顶层 Command Handler 开启事务；参与同一业务动作的跨模块公开 Application 能力加入同一事务，不开启独立嵌套事务；
2. API、Domain 和单个 Repository 方法不自行提交事务；
3. 成功 mutation 所需的 AuditEvent 与业务事实同事务；业务文档要求的站内通知也在同一事务插入；
4. 幂等 `command_id`、expected `version`、锁顺序和数据库约束共同保护并发；
5. 外部网络 I/O、COS 上传/探测、密码 hash、XLSX/CSV 解析和 ZIP 生成在长数据库事务外完成；
6. 外部步骤通过短事务状态机、CAS、PostgreSQL task/outbox 和幂等 worker 衔接；初版不因此引入 Redis、消息队列或微服务；
7. 跨模块原子流程由一个明确 Owner 的顶层 Use Case 编排；任何参与模块失败，全部同库写入回滚；
8. 事务完成后才返回业务成功。外部对象已上传但数据库绑定失败时，只能进入可清理的未绑定状态，不能返回正式提交成功。

“提交运动记录”的事务必须继续落实 Phase 3 已确认组合：锁定并校验 Enrollment/Session 和全部 MediaAsset，创建 immutable ExerciseRecord，创建初始系统 `VALID` Review 与当前状态，绑定媒体，写 AuditEvent，然后整体提交。Domain 不知道数据库事务；Application 决定顺序，Infrastructure 执行锁与持久化。

跨模块事务和 Owner 清单见 [Backend 模块边界](backend-module-boundaries.md)。

## 8. 认证、权限、系统模式与审计

### 8.1 认证与 ActorContext

Middleware 验证凭据并建立不可由客户端覆盖的 `ActorContext`，至少承载已验证主体、组织和角色上下文。API 只把它传给 Application，不把请求体中的 user/organization 字段当作权威身份。

### 8.2 权限与资源归属

- Guard 可以做粗粒度角色或权限预筛；
- Application 必须执行权威应用级权限、固定八项管理员权限、资源归属和职责检查；
- Domain 执行与对象状态和业务不变量有关的规则；
- Repository/RLS 继续执行 organization、owner 和唯一性防线；
- 内部任务、测试入口或非 HTTP 调用不能绕过同一 Application 门禁。

### 8.3 系统模式

维护模式默认 fail closed。Middleware 可以快速拦截普通入口，但每个业务写 Use Case 仍通过 `system-mode` 模块的公开 Policy/Port 检查当前权威模式。只有文档明确允许的恢复治理能力进入 allowlist；缓存缺失、未知值或模式读取失败不能推断为 `NORMAL`。

### 8.4 审计

Audit 不是 Controller 日志。Application 明确构造动作专属、安全、可测试的审计输入，通过 `audit` 模块公开 Port 在同一事务写入；审计失败时成功 mutation 回滚。基础访问日志由 Middleware/Infrastructure 负责，不能冒充正式 AuditEvent，也不能包含密码、验证码、Token、完整 PII、媒体、内部 object key 或签名 URL。

## 9. 三种模型与 Mapper 边界

```text
Contract DTO
  ↕ API Mapper（api/）
Application Command / Query / Result
  ↕ Use Case 调用 Domain
Domain Model
  ↕ Persistence Mapper（infrastructure/）
ORM Entity / Database Row
```

强制规则：

- Contract DTO 只存在于 API 通信边界；生成的 Contract 类型只能从 `api/` 或明确的 `shared/api/` 协议基础代码引用；
- Application Command/Result 是用例输入输出，不承载 HTTP status、header 或 ORM annotation；
- Domain Model 只表达业务含义、状态和行为；
- ORM Entity / Database Row 只存在于 Infrastructure；
- API Mapper 和 Persistence Mapper 必须分开，不使用一个自动 Mapper 贯穿三层；
- 字段同名不表示模型可合并；正式时长、计入分钟、当前审核结果、数据库状态和客户端展示必须继续分离；
- Query fast path 可以由 Infrastructure Read Adapter 直接映射为 Application Query Result，但仍必须经过 API Mapper，且不能把 ORM Row 交给 API；
- Mapper 只转换表示形式。需要业务判断时调用 Domain Policy/Use Case，不能把规则藏在 Mapper。

## 10. 错误边界

错误按以下方向转换：

```text
Domain Error
  ↓ Application 解释/组合
Application Error 或 Use Case Result
  ↓ API Error Mapper
Contract 规定的 HTTP status + error.code
```

规则：

- Domain Error 使用业务语义，不包含 HTTP status、SQLSTATE、constraint 名或框架异常；
- Application 负责把 Port 的 not-found、conflict、concurrency、permission、dependency failure 转成稳定应用语义；
- Infrastructure 在边界捕获 ORM/driver/SDK 错误，保留内部 cause 用于安全日志，并映射为内层声明的失败类型；
- API Error Mapper 只能输出当前 Contract 允许的 code、status 和安全 details；
- 未识别错误返回统一内部错误，不暴露 SQL、堆栈、路径、凭据或对象存储信息；
- 失败不得伪造成空列表、默认状态、`200` 或 Fake Success。

## 11. 目录骨架

Phase 3A 只确认骨架，不创建以下正式目录或实现文件：

```text
BNBU-Sports-Backend/
└── src/
    ├── bootstrap/
    │   ├── composition/
    │   ├── integration/
    │   └── lifecycle/
    ├── shared/
    │   ├── api/
    │   ├── application/
    │   │   └── transactions/
    │   └── domain/
    │       └── ports/
    └── modules/
        └── course-enrollment/
            ├── api/
            │   ├── dto/
            │   ├── mappers/
            │   └── error-mappers/
            ├── application/
            │   ├── commands/
            │   ├── queries/
            │   ├── ports/
            │   └── public/
            ├── domain/
            │   ├── model/
            │   ├── policies/
            │   └── errors/
            └── infrastructure/
                ├── persistence/
                │   ├── models/
                │   ├── mappers/
                │   └── repositories/
                └── adapters/

tests/
├── unit/
├── integration/
└── architecture/
```

具体文件后缀、装饰器和注册方式服从 Phase 6.0 最终技术栈，但层职责、Port 位置和依赖方向不能被框架默认目录反向覆盖。一个简单查询可以只包含 API Mapper、Query Handler、Read Port 和 Adapter；无需创建空 Domain 对象来满足目录外观。

架构门禁测试固定放在 `BNBU-Sports-Backend/tests/architecture/`；单元和集成测试分别放在相邻的 `tests/unit/` 与 `tests/integration/`。

## 12. 实施门禁

进入 Phase 6.0 Backend 初始化时必须同时满足：

1. 以本文、模块边界文档、依赖规则文档和 Phase 3 数据设计作为架构输入；
2. 先建立架构依赖测试，再交付首个业务 Vertical Slice；
3. Repository Port 全部位于 Application，具体实现全部位于 Infrastructure；
4. Backend 明确加载 `1.2.0-contract` / `RC` / OpenAPI SHA-256 `667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a`；Contract 不足时先提交 Change Request，生成新版本和 SHA 后才能同步；
5. 不创建全模块空壳、不引入 Redis/MQ/微服务、不恢复旧 API 或 Mock 作为权威；
6. 每个写 Slice 同时具备 Domain/Application 单元测试、真实 PostgreSQL 集成测试、权限/事务回滚测试和 Mapper/错误映射测试；
7. 架构测试、编译、静态检查和目标集成测试全部通过后，才可以把该 Slice 标记为实现完成。

框架、ORM 和具体测试工具名称尚未在 Phase 3A 选择。这不是层级或模块歧义：无论技术栈如何，本文规定的依赖图、Owner、事务和映射边界都保持不变；工具选择只能实现这些规则，不能改写规则。
