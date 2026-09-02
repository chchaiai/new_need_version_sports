# Phase 3A：Backend 模块边界与 Owner

> 设计日期：2026-08-31（Asia/Shanghai）
>
> 边界状态：`DONE (DESIGN)`
>
> 实现状态：`NOT EXECUTED`
>
> 当前唯一 Contract 基线：`1.2.0-contract` / `RC` / OpenAPI SHA-256 `667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a`；模块边界不得补造 Contract 行为

## 1. Owner 的含义

本文中的 Owner 不是人员或团队名称，而是代码和数据的唯一写入责任：

- 只有 Owner 模块可以定义、重建和保存该模块的 Aggregate；
- 只有 Owner 模块的 Infrastructure 可以直接访问该模块拥有的表；
- 其他模块只能持有 opaque ID、调用公开 Application 能力、消费明确事件或读取公开 Read Model；
- 业务角色不等于模块。学生、教师、管理员只是 Actor，同一角色的不同动作仍归属各自业务模块；
- 共享 PostgreSQL 不等于共享表。物理同库不能作为跨模块 SQL、ORM relation 或 Repository 复用的理由。

每个 Owner 的 Repository Port 统一位于本模块 `application/ports/`，具体 Repository Implementation 位于本模块 `infrastructure/persistence/repositories/`；模块边界不会产生共享 Repository 或第二套放置规则。

模块边界依据四份当前业务权威和 [Phase 3 Domain 与数据库设计](phase-3-domain-and-database-design.md) 的聚合边界确定，不从旧 API、旧 DTO、页面导航或数据库表名反推。

## 2. 最终模块清单

### 2.1 核心业务与治理模块

| 模块目录 | 唯一 Owner 范围 | 主要 Domain 对象 / 数据 | 对外公开的 Application 能力 | 明确不拥有 |
|---|---|---|---|---|
| `identity-access` | 组织身份、认证、当前账号资料和账号相关数据删除 | `Organization`、`UserSubject`、`LoginAccount`、`AuthSession`、Credential、Challenge、Student/Teacher/Admin Profile | 登录/验证码/改密/会话撤销；取得当前主体摘要；建立或删除账号资料；账号注销/删除协调入口 | Course/Enrollment、管理员业务权限的授予历史、业务对象状态 |
| `admin-governance` | 分管理员治理与固定八项权限历史 | `AdminPermissionGrant` 及分管理员治理 Policy | 创建/编辑/启停/删除分管理员的治理编排；权限判断与权限摘要；管理员概览的只读组合入口 | 学期、课程、反馈、换算规则、系统模式、帮助、审计等目标业务事实 |
| `academic-term` | 学期生命周期和唯一当前学期 | `Semester`、`SemesterTransition` | 创建/编辑 `UPCOMING`；切换唯一 `CURRENT`；读取/断言当前学期 | Course、Enrollment、课程展示状态 |
| `course-enrollment` | 教学班、分类目标、邀请、成员关系和官方名单 | `Course`、`CourseTargetRevision`、`CourseInvitation`、`Enrollment`、`EnrollmentEvent`、`RosterSnapshot`、`RosterReconciliationItem` | 建班/编辑/关闭；目标 revision；邀请；加入/移出/恢复；名单导入/处理/回退；成员与课程只读投影 | 登录账号、Session、Record、认证、成绩或管理员代审 |
| `exercise-session` | 一次运动过程、ACTIVE 区间、正式时长和开始时上海业务日期 | `ExerciseSession`、`ActiveInterval` | 开始、暂停、继续、完成 Session；读取已完成的不可变运动事实 | Media、Record、Review、任意手工时长修改 |
| `media-evidence` | COS 媒体元数据从 allocation 到验证、绑定和过期清理的生命周期 | `MediaAsset` | 分配上传、服务端探测/验证、锁定已验证资产、事务内绑定 Record/ApplicationSubmission、未绑定清理 | Record 或 Application 是否业务允许；Contract 签名 URL 的长期保存 |
| `exercise-record` | 正式运动记录、分类、说明、正式时长快照和 0/60/120 计入分钟 | `ExerciseRecord` | 提交 Record；读取 Record 历史和教师审核所需安全投影 | Session 计时、媒体技术生命周期、Review 历史、统计汇总 |
| `record-review` | Record 初始系统判断、教师追加判断和当前结果投影 | `Review`、`RecordReviewState` | 初始化系统 `VALID`；责任教师追加 `VALID/INVALID`；读取当前结果和历史 | 修改 Record/Media/Session 时长或恢复当日提交名额 |
| `endurance` | 四套耐力规则、真实用时、换算快照和当前实测/免测结果 | `EnduranceRuleTable/Revision/Interval`、`EnduranceMeasurement`、`EnduranceConversion`、`EnduranceOutcomeState` | 整表 revision 切换；确认真实用时并换算；事务内设置免测结果；读取历史/当前结果 | 申请材料、认证认可学时、最终成绩 |
| `applications-certification` | 免测/校队/社团申请、补充材料提交、决定和认证认可学时 revision | `StudentApplication`、`CertificationApplicationDetail`、Domain `CertificationKind`、`ApplicationSubmission`、`ApplicationDecision`、`CertificationCreditRevision/State` | 首次申请/补充；教师要求补充/批准/驳回；认证学时批准/调整/撤销 | generated Contract enum、MediaAsset 技术状态、耐力规则、Record 学时、最终成绩 |
| `grading` | 责任教师最终成绩的历次发布和当前指针 | `FinalGradePublication`、`FinalGradeState` | 发布/重新发布 INT 成绩和最多 50 字备注；读取当前与历史 | 耐力换算结果、20 小时进度规则或管理员审批 |
| `statistics` | 学生和课程进度的只读 Domain Read Model 与计算 Policy | `Statistics` read model | 按类别组合当前 `VALID` Record 和当前未撤销认证分钟，分类封顶后求总计/完成率；课程级汇总 | 可写统计表、客户端上报统计值、跨模块表直查 |

### 2.2 学生服务与系统支撑模块

| 模块目录 | 唯一 Owner 范围 | 主要 Domain 对象 / 数据 | 对外公开的 Application 能力 | 明确不拥有 |
|---|---|---|---|---|
| `feedback` | 学生反馈、当前状态和追加公开回复 | `FeedbackTicket`、`FeedbackReply` | 创建反馈；管理员处理并同时追加公开回复；学生/管理员查询 | 教师指派、内部备注、通过反馈直接修改正式业务事实 |
| `help-content` | 双语帮助文章、revision、关键词和发布状态 | `HelpArticle`、`HelpArticleRevision`、Keyword | 草稿保存、发布、已发布编辑、下线、重新上线；学生语言投影 | 实时维护公告、业务权限或课程事实 |
| `system-mode` | 组织当前 `NORMAL/MAINTENANCE` 状态和只追加切换历史 | `SystemModeState`、`SystemModeTransition` | 读取/断言当前模式；授权切换；维护公告投影 | 普通业务对象、自动定时恢复、外部 Push |
| `notification-center` | 站内消息事实和本人 `read_at` | `InAppNotification` | 在来源业务事务中创建防重消息；列表/未读数/本人标记已读 | 业务完成状态、短信、邮件、device token、Android/iOS Push |
| `audit` | 不可修改 AuditEvent 和运行日志 ZIP 任务 | `AuditEvent`、`AuditArchiveJob` | 同事务写安全 AuditEvent；授权列表/详情；ZIP 请求、worker 状态和安全下载 | 可编辑审计、完整业务快照、普通访问日志作为审计替代 |

`shared/`、`bootstrap/`、全局 Middleware 和技术健康探测不是业务模块。它们没有业务表 Owner 权，也不能成为规避上表边界的落点。

## 3. 为什么不存在通用 `admin` 业务模块

管理员是 Actor，不是所有后台功能的共同 Domain。管理页面对应的能力归属如下：

| 管理动作 | Owner 模块 |
|---|---|
| 分管理员和固定八项权限 | `admin-governance` |
| 教师账号、学生账号只读资料、账号删除 | `identity-access` |
| 学期 | `academic-term` |
| 当前课程只读目录 | `course-enrollment` |
| 耐力换算表 | `endurance` |
| 用户反馈 | `feedback` |
| 系统模式 | `system-mode` |
| 帮助中心 | `help-content` |
| 审计查询与 ZIP | `audit` |

因此不得建立一个可以直接访问所有表的 `admin` Repository 或 `AdminService`。`admin-governance` 只负责管理员身份治理与权限；管理员概览是 Application 只读组合，通过各 Owner 公开 Read Port 取得摘要，不能直接跨表查询或获得新的写权限。

## 4. 跨模块协作协议

### 4.1 同步协作

需要立即得到结果或参与同一事务时：

1. 消费模块在自己的 `application/ports/` 声明它真正需要的能力；
2. 提供模块在自己的 `application/public/` 暴露公开 Use Case、参与式写能力或 Read Model；
3. `bootstrap/integration/` 的 adapter 完成两者之间的模型转换和装配；
4. 两个业务模块不直接 import 对方目录，也不共享 Repository；
5. 调用方只能传 opaque ID、ActorContext 和最小命令数据，不能构造提供方内部 Entity；
6. 需要原子提交时，参与式能力加入顶层 Use Case 的现有 Unit of Work，不自行 commit。

Integration adapter 只做边界转换和委派，不保存业务规则。若适配时出现新的业务决定，必须停止并回到权威文档，而不是把决定藏进 adapter。

### 4.2 事件协作

后续动作允许最终一致时可以使用明确事件：

- Domain Event 先属于产生它的模块内部；
- 跨模块使用时转换为有版本的 Integration/Outbox Event，只包含最小非敏感数据；
- 事件发布与来源事实同事务写入 PostgreSQL outbox，提交后由幂等 worker 消费；
- 消费方不得通过事件修改来源模块事实；
- 重放必须幂等，失败不得把来源业务回滚成假状态；
- 初版不因采用 Outbox 而引入 Redis、消息队列或拆微服务。

当前 Phase 3 已明确必须与来源 mutation 同事务写入的站内通知和 AuditEvent，不得擅自降级为“以后可能送达”的外部事件。

### 4.3 只读协作

跨模块查询只允许：

- 提供模块公开的 Application Read Port / Read Model；
- 提供模块拥有并维护的只读数据库 view，由提供模块自己的 Adapter 查询；
- 经明确设计的 projection，由来源事件可重建且不成为 source of truth。

禁止 `statistics`、管理员概览或其他查询模块在自己的 SQL/ORM 中直接 join 其他模块私有表。需要高性能组合查询时，应先定义稳定的公开 Read Model 和所有权，再实现 provider-owned view/adapter；不能以“同一个数据库”为理由绕过边界。

## 5. 跨模块原子流程 Owner

下表固定顶层 Use Case Owner 和事务参与者。参与者只通过公开 Port/能力加入，不转移数据 Owner。

| 业务动作 | 顶层 Use Case Owner | 同事务参与模块 | 事务外步骤 |
|---|---|---|---|
| 学生通过邀请建立身份并加入 | `course-enrollment` | `identity-access`、`academic-term`、`audit` | 邮箱验证码发送/验证流程按 Auth 独立短事务完成 |
| 创建/切换学期 | `academic-term` | `admin-governance` 权限读取、`audit` | 无外部网络等待 |
| 教师建立和账号删除 | `identity-access` | `admin-governance` 权限读取、`audit`；删除不查询 Course 责任 blocker，`course-enrollment` 不参与且不发生 Course mutation | CSV 解析、password hash、删除确认在长事务外 |
| 分管理员建立和账号终止 | `identity-access`；治理入口由 `admin-governance` 编排 | `admin-governance`、分管理员职责 blocker 的公开查询、`audit` | password hash、二次身份验证在长事务外 |
| 导入官方名单 | `course-enrollment` | `audit` | XLSX/CSV 内容识别、≤100 MB/≤500 行解析和 checksum 在事务外 |
| 开始/暂停/继续/完成 Session | `exercise-session` | `course-enrollment`、`statistics` eligibility、`system-mode`、`audit` | 无客户端时间参与 |
| 分配和验证媒体 | `media-evidence` | `identity-access` owner 摘要、`audit` | COS 上传、HEAD、内容/MIME/时长/音轨探测在事务外 |
| 提交 ExerciseRecord | `exercise-record` | `course-enrollment`、`exercise-session`、`media-evidence`、`record-review`、`audit` | 媒体必须已在先前短事务中变为 `VERIFIED` |
| 教师追加 Review | `record-review` | `exercise-record`、`course-enrollment`、`notification-center`、`audit` | 无外部通知渠道 |
| 确认耐力真实用时并换算 | `endurance` | `course-enrollment`、`notification-center`、`audit` | 完整 candidate rule revision 可在事务外构造 |
| 提交/补充/决定申请 | `applications-certification` | `course-enrollment`、`media-evidence`、批准免测时的 `endurance`、`notification-center`、`audit` | 申请图片先上传并完成权威验证 |
| 调整/撤销认证认可学时 | `applications-certification` | `course-enrollment`、`notification-center`、`audit` | Statistics 后续读取 current state，不回写历史 |
| 发布/重新发布最终成绩 | `grading` | `course-enrollment`、`notification-center`、`audit` | 不读取 Statistics 或耐力分来决定成绩合法性 |
| 处理 Feedback | `feedback` | `admin-governance` 权限读取、`notification-center`、`audit` | 不创建教师指派或外部通知 |
| 保存/发布/下线 Help | `help-content` | `admin-governance` 权限读取、`audit` | Markdown 安全渲染可在读取边界完成，不能改变发布事实 |
| 切换系统模式 | `system-mode` | `admin-governance` 权限读取、`notification-center`、`audit` | 不等待外部渠道；预计恢复时间不触发自动切回 |
| 请求审计 ZIP | `audit` | `admin-governance` 权限读取 | 日志汇总、脱敏、ZIP 生成和 COS 上传由 PostgreSQL worker 在事务外完成 |

“同事务参与”不允许一个顶层 Handler 直接取得参与模块的 Repository。Composition Root 必须让参与式公开能力使用同一 transaction scope；集成测试必须证明任一参与者失败时完整回滚。

## 6. Statistics 与组合读模型边界

`statistics` 是独立的只读业务能力，不是“共享 SQL”目录：

1. `exercise-record` 提供 Record 的 credited minutes 和归属投影；
2. `record-review` 提供当前 `VALID/INVALID` 投影；
3. `applications-certification` 提供当前未撤销认证分钟投影；
4. `course-enrollment` 提供每类目标和有效成员范围；
5. `statistics` 使用自己的纯计算 Policy 完成分类累计、分类封顶、总和与完成率；
6. UI 四舍五入只在输出映射发生，开始新 Session 等业务判断继续使用原始分钟；
7. 任何 projection 都可从 Owner 事实重建，客户端不能写，缓存失败不能反向改写 source facts。

课程级累计和管理员概览同样先通过学生级公开统计结果汇总，不能绕过学生级分类封顶后直接聚合全班表数据。

## 7. `shared/` 边界

`shared/` 只允许稳定、无业务归属、被至少两个模块真实复用的基础能力，例如：

- 通用 `EntityId`/opaque identifier 基础类型；
- `Clock`、`IdGenerator` 抽象；
- 基础 Domain/Application error 类型；
- transaction abstraction；
- request correlation、keyset pagination 等无业务语义基础结构。

禁止放入：

- `CourseStatus`、`ReviewResult`、`ApplicationStatus`、`AdminPermission` 等业务枚举；
- Contract DTO、ORM Entity 或表 Row；
- 业务 Repository、跨模块查询、通用 CRUD；
- “Utils” 中的业务校验；
- 被单一模块使用但为了方便而上移的代码。

若一个 shared 类型后来获得业务含义，必须迁回 Owner 模块。`shared/` 的新增项要由架构测试 allowlist 管理。

## 8. 边界变更规则

以下情况不能由实现自行决定：

- 一个事实需要从一个 Owner 迁移到另一个 Owner；
- 需要跨模块直接写表或共享 Repository；
- 需要新增跨模块同步循环依赖；
- 需要把当前模块拆成独立部署服务；
- 需要 Redis、消息队列、外部通知渠道或分布式事务；
- 需要恢复业务权威已拒绝的能力。

出现上述情况必须停止当前实现，提交架构 Change Request，并同步本文、依赖规则、数据设计和相应测试。Phase 3A 不批准任何微服务拆分，也不批准通用 `admin`、`shared database service` 或跨模块 ORM relation。
