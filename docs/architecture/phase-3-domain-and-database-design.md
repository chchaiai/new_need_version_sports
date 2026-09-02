# Phase 3：Domain 与数据库设计

> 设计日期：2026-08-31（Asia/Shanghai）
>
> 设计状态：`DONE (DESIGN)`；Phase 5F 已完成 `CertificationKind` 与密码生命周期的 Contract ↔ Domain/Database alignment
>
> 上线范围：四份业务权威文档确认的完整闭集能力；不得用空表、占位状态、Mock 或 Fake Success 代替任何上线能力
>
> 实现状态：`NOT EXECUTED`；本文不创建 Backend、数据库、migration、Contract DTO 或客户端代码
>
> 当前唯一 Contract 基线：`1.2.0-contract` / `RC` / OpenAPI SHA-256 `667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a`；本文不得扩展或改写该协议，缺口必须先走 Change Request
>
> Phase 5F 更新日期：2026-09-01（Asia/Shanghai）；本次只更新权威设计，不创建 Backend、ORM Entity、migration、SQL、seed 或真实数据库对象

## 1. 权威输入与设计边界

本设计只使用以下权威输入：

- [总业务流程](../business/00-overview.md)；
- [学生端业务流程](../business/10-student-flow.md)；
- [教师端业务流程](../business/20-teacher-flow.md)；
- [管理员端业务流程](../business/30-admin-flow.md)；
- [Phase 0B 基线与重写范围](../rebuild/00-scope.md)；
- [Phase 2 业务真相 handoff](../rebuild/handoffs/phase-2-business-truth-and-mvp.md)；
- [Phase 3A Backend 架构](backend-architecture.md)、[模块边界](backend-module-boundaries.md)与[依赖规则](backend-dependency-rules.md)；
- [Phase 5E 业务决定 handoff](../rebuild/handoffs/phase-5e-remaining-business-decision-closure.md)；
- [Phase 5C.2 Final Contract Consolidation handoff](../rebuild/handoffs/phase-5c2-final-contract-consolidation.md)、当前 [OpenAPI](../../contracts/openapi.yaml) 与 [Contract metadata](../../contracts/contract-metadata.json)；
- `ACCEPTED` 的 [CR-20260901-002 Password Contract](../../contracts/change-requests/CR-20260901-002-password-contract.md)和 [CR-20260901-003 Certification Kind](../../contracts/change-requests/CR-20260901-003-certification-kind-round-trip.md)。

[CR-20260901-004 Student Dashboard No-current](../../contracts/change-requests/CR-20260901-004-student-dashboard-no-current-semester.md) 已是 `REJECTED / NOT_CONTRACT_DEFECT`，不进入本设计变更。Student Dashboard、current semester、Student identity 生命周期和数据库约束保持原义；Android 旧 nullable mapper 只属于 `LEGACY_MIGRATION + MAPPER/CLIENT ALIGNMENT`。

旧 API、旧 DTO、generated schema、Mock、客户端 state 和已经删除的旧数据库材料都不是数据库设计输入。后续只能用它们识别迁移和退役边界，不能反向补造业务字段或状态。

上线数据库必须真实支持：

1. 不含账号资料的历史主体、可删除登录账号、登录会话、学生/教师/管理员 profile、分管理员权限和账号注销；
2. 学期、责任教师 Course、分类目标、邀请码、Enrollment 和官方名单核对；
3. Exercise Session、`ACTIVE` 区间、媒体直传、Record 和追加 Review；
4. 耐力跑规则版本、真实用时、换算快照和免测；
5. 校队/社团认证申请、补充材料、审核、认可学时调整和撤销；
6. 最终成绩历次发布；
7. 用户反馈与公开回复；
8. 帮助中心双语文章与发布历史；
9. `NORMAL/MAINTENANCE` 系统模式；
10. 仅站内通知中心；
11. 不可修改的正式审计事件和服务器运行日志 ZIP 任务。

本设计不恢复已经被业务文档拒绝的自由选班、同学期多个有效 Course、手工增加 60 分钟、Record 重提或 attempt 链、模拟扫码成功、教师本人注销、总管理员本人注销、外部短信/邮件/设备 Push 等能力。

## 2. Domain、Database Entity 与 Contract DTO 必须分开

| 层 | 责任 | 示例 | 禁止事项 |
|---|---|---|---|
| Domain Model | 表达业务概念、状态机、不变量和行为 | `ExerciseSession.complete()`、`Application.requestSupplement()`、`FinalGrade.publish()` | 不包含表名、JSON 字段、HTTP status、SQL 或 COS 签名 URL |
| Database Entity | 保存事实、关系、约束、索引、并发版本和审计 | `exercise_record`、`application_decision`、partial unique index | 不直接成为 API request/response；不把查询方便字段冒充业务真相 |
| Contract DTO | 后续 Phase 定义跨网络输入、输出和错误 | `StartSessionRequest`、`NotificationProjection` | 不直接映射表；不得接受客户端提交正式时长、换算分、当前审核结果或审计时间 |

`Statistics`、`StudentStatus`、`CourseDisplayStatus` 和耐力跑当前展示是 Domain read model。它们可由数据库 view/query 投影，但不能成为客户端可写 source of truth。

`MediaAsset.objectKey`、checksum、密码 hash、验证码 digest、邀请 digest、审计安全元数据和内部权限历史属于服务端数据，不直接暴露给 Contract DTO。

## 3. 总体关系

```text
Organization
├─ UserSubject（不含 PII、保留历史关联）
│  ├─ LoginAccount ── AuthSession / Credential / Challenge（注销时删除）
│  ├─ StudentProfile / TeacherProfile / AdminProfile（当前资料，账号终止时删除）
│  ├─ Enrollment ── ExerciseSession ── ExerciseRecord
│  │                    │               │                  ├─ Review (append-only)
│  │                    │               ├─ ActiveInterval  └─ RecordReviewState
│  │                    │               ├─ Application ── Decision / CreditRevision
│  │                    │               ├─ EnduranceOutcome ── Measurement / Conversion
│  │                    │               └─ FinalGradeState ── Publication
│  │                    ├─ EnrollmentEvent
│  │                    └─ FeedbackTicket ── FeedbackReply
│  ├─ Course ── TargetRevision / Invitation / RosterSnapshot
│  └─ AdminPermissionGrant
├─ Semester ── SemesterTransition
├─ EnduranceRuleTable ── RuleRevision ── RuleInterval
├─ HelpArticle ── HelpArticleRevision ── Keyword
├─ SystemModeState ── SystemModeTransition
├─ InAppNotification
├─ AuditEvent
└─ AuditArchiveJob ── COS ZIP metadata

MediaAsset ── Record 或 ApplicationSubmission（只能绑定一种）

Statistics =
  current VALID Record credited minutes
  + current non-revoked certification credit minutes
  → category cap
  → total
```

`Course` 是责任教师在当前学期建立的体育教学班，不是预设课程目录；没有课程代码或教学班号。内部 UUID 区分同名 Course。

## 4. Domain 对象与聚合边界

### 4.1 身份与治理

| Domain 对象 | 类型 | 关键职责与不变量 |
|---|---|---|
| `Organization` | 聚合根 | 数据隔离边界；当前预置 BNBU；业务时区固定 `Asia/Shanghai` |
| `User` | 聚合根 | 用例层协调 UserSubject、可选 LoginAccount、当前角色 Profile 与 `DeleteAccount`；不是数据库表或 Contract DTO 的一对一映射 |
| `UserSubject` | 身份实体/历史主体 | 只保存 organization、角色快照和终止时间；不含邮箱、登录名、学号、姓名或凭据；账号删除后保留供业务、媒体和审计历史 FK 使用 |
| `LoginAccount` | 账号实体 | 当前登录资格、验证邮箱和 `ACTIVE/DISABLED`；成功删除/注销时物理删除，不使用 `CLOSED` 假装删除 |
| `AuthSession` | 安全实体 | 保存 refresh credential digest、password version 和撤销状态；本人改密保留当前并撤销其他，self reset/停用撤销全部，账号删除/注销时连同账号物理删除 |
| `PasswordCredential` | 安全实体 | 保存 PHC、`mustChangePassword` 等价状态和单调递增 `passwordVersion`；系统/他人分配的 Teacher/Admin 初始密码只能是 temporary credential |
| `AuthChallenge` | 安全实体 | 保存 purpose-scoped digest、失败次数、到期/锁定/消费状态；`PASSWORD_RESET` challenge 保持反枚举且只能消费一次 |
| `StudentProfile` | Entity | 当前学号、姓名、性别、年级等；学号组织内唯一；`ACTIVE/PENDING` 由当前账号邮箱和 Enrollment 投影；注销时删除 |
| `TeacherProfile` | Entity | 当前工号和教师资料；工号组织内唯一；只能管理本人负责的 Course；账号删除时删除 |
| `AdminProfile` | Entity | 当前 `SUPER/SUB` 资料；分管理员登录账号全局唯一且不可修改；当前业务状态仅 `ACTIVE/DISABLED`；账号删除时删除 |
| `AdminPermissionGrant` | 历史事实 | 固定八项权限的授予与收回区间；只有总管理员可以改变 |
| `DeleteAccount` | Domain command | 二次验证、学生进行中 Session/分管理员未移交职责等角色适用 blocker 检查与不可逆删除；教师账号删除不以 Course 责任为 blocker且不触发 Course 变更；成功事实写安全 AuditEvent，不建立保留账号资料的“注销空壳表” |

### 4.2 教学、运动与成绩

| Domain 对象 | 类型 | 关键职责与不变量 |
|---|---|---|
| `Semester` | 聚合根 | `UPCOMING → CURRENT → ARCHIVED`；组织内最多一个 `CURRENT` |
| `Course` | 聚合根 | 属于一个 Semester 和一名责任教师；`OPEN → CLOSED` |
| `CourseTargetRevision` | 历史事实 | 两类目标版本快照；合计固定 1,200 分钟 |
| `CourseInvitation` | Entity | 高熵 token 的 digest；撤销、到期和 Course/Semester 条件共同决定有效性 |
| `Enrollment` | 聚合根 | `ACTIVE/REMOVED`；同一学生同一学期最多一个有效 Course |
| `RosterSnapshot` | 聚合根/快照 | 学校某时点官方名单；当前指针可回到先前快照，但不修改任何业务事实 |
| `RosterReconciliationItem` | 核对事实 | 五类比较发现；逐项记录处理，不因证据不足自动合并身份 |
| `ExerciseSession` | 聚合根 | `ACTIVE ↔ PAUSED → COMPLETED`；只用服务端时间；业务日期在开始时固化 |
| `ActiveInterval` | Session 子实体 | 保存每段 `ACTIVE` 区间；暂停 gap 完全不计时 |
| `MediaAsset` | 聚合根 | PostgreSQL 只存 COS 元数据；只绑定 Record 或 ApplicationSubmission 之一 |
| `ExerciseRecord` | 聚合根 | 提交成功才产生；运动事实不可变；正式时长与 0/60/120 计入分钟分开 |
| `Review` | 历史事实 | 初始系统 `VALID` 及教师后续 `VALID/INVALID` 判断只追加 |
| `RecordReviewState` | 当前投影 | 指向最后一条 Review；不覆盖历史 |
| `EnduranceRuleTable` | 聚合根 | 固定四个性别/年级组/距离组合；当前指向一份完整有效 revision |
| `EnduranceMeasurement` | 历史事实 | 责任教师确认的整数秒真实用时及性别/年级组/距离快照 |
| `EnduranceConversion` | 历史事实 | 唯一规则匹配产生的分数/等级/规则 revision 快照；规则变化不追溯改写 |
| `EnduranceOutcomeState` | 当前投影 | 当前为未记录、实测或免测；实测和免测不能同时成为当前结果 |
| `StudentApplication` | 聚合根 | `EXEMPTION/CERTIFICATION`；`SUBMITTED/SUPPLEMENT_REQUIRED/APPROVED/REJECTED`；`CERTIFICATION` 必须持有完整认证详情，`EXEMPTION` 不得持有认证详情 |
| `CertificationApplicationDetail` | immutable Value Object | 由 `StudentApplication` 持有；包含 `CertificationKind`、trim 后非空名称和有效期，创建后不从名称或客户端旧 subtype 重建分类 |
| `CertificationKind` | Domain enum | `applications-certification` 模块拥有的闭集，只允许 `SCHOOL_TEAM/STUDENT_CLUB`；不是 generated Contract enum，也不是 ORM/数据库类型 |
| `ApplicationSubmission` | 历史事实 | 首次或补充材料提交；证据图片只追加，不覆盖 |
| `ApplicationDecision` | 历史事实 | 教师批准、驳回或要求补充材料；处理意见学生可见 |
| `CertificationCreditRevision` | 历史事实 | 认证认可学时的批准、调整和撤销；当前 revision 决定统计贡献 |
| `FinalGradePublication` | 历史事实 | 教师每次发布的任意 `INT` 整数最终成绩及最多 50 字符可选备注；重新发布只追加 |
| `Statistics` | Domain read model | 有效 Record 与当前认证学时按类别累计、分别封顶后求和 |

### 4.3 服务与系统治理

| Domain 对象 | 类型 | 关键职责与不变量 |
|---|---|---|
| `FeedbackTicket` | 聚合根 | 五种类别、五种状态；状态变更必须与一条公开回复一起保存 |
| `FeedbackReply` | 历史事实 | 学生可见的追加处理记录；不能编辑或删除 |
| `HelpArticle` | 聚合根 | `DRAFT/PUBLISHED/ARCHIVED`；当前指向完整双语 revision |
| `HelpArticleRevision` | 历史事实 | 每次保存的双语标题/正文、分类、关键词、排序权重快照 |
| `SystemModeState` | 组织单例 | `NORMAL/MAINTENANCE`；所有普通业务 fail closed |
| `SystemModeTransition` | 历史事实 | 原/目标模式、原因、维护公告和预计恢复时间；只追加 |
| `InAppNotification` | 聚合根/消息事实 | 只在站内中心展示；`readAt` 只影响本人阅读状态，不影响业务结果 |
| `AuditEvent` | 历史事实 | 正式审计事件不可修改、补写或删除 |
| `AuditArchiveJob` | 聚合根 | PostgreSQL 任务表驱动运行日志 ZIP；不需要 Redis 或消息队列 |

`PasswordCredential` 和 `AuthChallenge` 是 `identity-access` 的安全 Domain/支持实体，不进入业务 UI Domain。它们只保存 hash/digest、次数、到期和消费/撤销状态，并在所属登录账号删除/注销时物理删除。

### 4.4 Phase 5F 密码生命周期不变量

现有身份与安全模型足以承载 `1.2.0-contract` 的密码语义，结论为 `CURRENT DESIGN SUFFICIENT`。以下是不新增表或列也必须由 Domain/Application 明确执行的不变量：

1. 系统或他人分配给 Teacher、Sub-admin 或初始 Super-admin 的初始密码只能建立 temporary credential，`mustChangePassword = true`。个人密码只能由账号本人通过 `changeOwnPassword`，或通过本人已验证学校邮箱的 self reset 形成；两者成功后均设置 `mustChangePassword = false`。
2. `passwordVersion` 是 `PasswordCredential` 的非负单调认证版本，与 Contract `CurrentActor.version` / `expectedVersion` 使用的账号聚合 optimistic version 不是同一个概念。任何成功密码变化都替换 PHC、同时递增 credential password version 与账号 aggregate version，并使旧认证状态失效；`AuthSession` 保存建立/继续时对应 password version。版本不匹配、session 已撤销/到期或账号不是 `ACTIVE` 时均不得认证成功。
3. `changeOwnPassword` 只允许 `ACTIVE` Teacher/Admin self，校验当前密码和 expected version。成功时保留并把当前 session 迁移到新 `passwordVersion`，撤销其他 session，清除 gate；不得让旧的其他 session 继续使用。
4. self reset 只接受本人已验证学校邮箱的有效、未消费 `PASSWORD_RESET` proof。成功时把 challenge 置为已消费，递增 `passwordVersion`、清除 gate、撤销全部旧 session，且不签发新 session；proof 已解析到 `DISABLED` 账号时不得修改 credential、gate 或 access state，已删除/不存在账号不得破坏反枚举外观。停用失败后的 challenge 是否还能再次提交不作为业务状态，由一次性 challenge 的既有安全生命周期和 Contract conformance test 决定，不能被 mapper 猜测。
5. logout current 只撤销当前 session；logout all 撤销该账号全部当前 session；账号停用也撤销全部 session。账号恢复为 `ACTIVE` 不自动恢复旧 session 或旧权限。
6. `UpdateSubAdmin` 只允许修改姓名、已验证学校邮箱、部门、固定权限和 expected version。该 Domain command 不接收 password/credential mutation，不调用 credential 写 Port，也不存在独立 Admin-on-behalf reset 路径。
7. 密码、OTP、Token、PHC 和 digest 不进入普通日志、业务记录、Contract response 或 AuditEvent；审计只保存安全动作、结果和 request ID。

本 alignment 不引入 password policy、password strength、password history、temporary-password 专表、Redis、消息队列、新 ErrorCode 或新业务状态；个人密码的非空规则、Teacher 初始密码规则和 Sub-admin 初始密码规则继续按已接受业务分别执行。

## 5. PostgreSQL 物理模型

### 5.1 通用约定

- 表名、列名统一 `snake_case`；历史主体使用 `user_subject`，可登录账号使用 `login_account`，避免把已删除账号与保留业务主体混成一行。
- 业务 PK 统一 `uuid`；建议 Backend 生成 UUIDv7，数据库不依赖特定 extension。
- 所有 instant 使用 `timestamptz`，连接固定 `SET TIME ZONE 'UTC'`；客户端负责本地展示。
- Semester 起止日、证书有效日期和 `business_date` 使用 `date`，不伪装成 UTC 午夜。
- duration 使用 `bigint` 毫秒或 `integer` 秒；学时使用整数分钟；文件大小使用 `bigint` bytes。
- 状态字段使用 `text + CHECK`，不使用难演进的 PostgreSQL enum。
- 可变聚合使用 `version bigint NOT NULL DEFAULT 0`；成功 mutation 后 `version + 1`。
- append-only 表使用 `sequence_no`、`command_id` 和 immutable trigger；runtime 无 `UPDATE/DELETE`。
- 根业务表带 `organization_id`；复合 FK 必须同时保护 organization、Semester、Course、Enrollment 和角色归属。
- 聚合根指向其首个/current history row 的循环 FK（例如 Course→TargetRevision、HelpArticle→Revision）使用预生成 UUID 和 `DEFERRABLE INITIALLY DEFERRED` 复合 FK，使根与首条历史能在同一事务建立且 commit 前必须完整。
- 所有保留业务事实 FK 默认 `ON DELETE RESTRICT` 并指向 `user_subject`；`login_account`、credential、session、challenge 和当前 profile 属账号相关数据，按本节定义显式删除，不允许保留半删除账号行。
- 物理列中的人员引用统一命名为 `*_subject_id`；例如 `student_subject_id`、`responsible_teacher_subject_id`、`actor_subject_id` 和 `recipient_subject_id` 都引用 `user_subject`，需要当前账号/profile 的写操作再由 trigger 和事务检查。

### 5.2 历史主体、当前账号、权限与账号删除

#### `organization`

`id uuid PK`、`code text UNIQUE NOT NULL`、`name text NOT NULL`、`business_timezone text CHECK (= 'Asia/Shanghai')`、`created_at timestamptz NOT NULL`。

#### `user_subject`

| 列 | 类型/约束 | 说明 |
|---|---|---|
| `id` | `uuid PK` | 仅供内部业务历史关联的 opaque subject ID |
| `organization_id` | `uuid NOT NULL FK organization ON DELETE RESTRICT` | 隔离边界 |
| `role_snapshot` | `text CHECK IN ('STUDENT','TEACHER','ADMIN')` | 建立时的基础角色，不由客户端改写 |
| `created_at` | `timestamptz NOT NULL` | 主体建立时间 |
| `closed_at` | `timestamptz NULL CHECK(closed_at >= created_at)` | 账号成功删除/注销时一次性写入 |

`user_subject` 不保存邮箱、登录名、学号、工号、姓名、profile 字段、credential 或 session。organization/role/created_at immutable，`closed_at` 只能从空变为非空一次；历史业务、正式媒体 owner 和 AuditEvent FK 指向该表，账号删除后不级联。`UNIQUE(id, organization_id)` 支持复合归属 FK。

#### `login_account`

| 列 | 类型/约束 | 说明 |
|---|---|---|
| `subject_id` | `uuid PK FK user_subject ON DELETE RESTRICT` | 一个当前主体最多一个登录账号 |
| `organization_id` | 非空复合归属 FK | 必须与 subject 一致 |
| `email_normalized` | `text NOT NULL` | trim/lower 后学校邮箱 |
| `email_verified_at` | `timestamptz NULL` | 权威验证时间 |
| `access_state` | `text NOT NULL CHECK IN ('ACTIVE','DISABLED')` | 当前账号状态；不存在 `CLOSED` 行 |
| `created_at`、`updated_at`、`version` | 通用字段 | UTC/并发 |

`UNIQUE (organization_id, email_normalized)` 保护当前学校邮箱唯一；邮箱比较使用 normalized value，不依赖数据库默认 collation。deferred trigger 验证 subject 尚未 closed。成功删除/注销物理删除该行；`user_subject.closed_at` 与 AuditEvent 表达历史终止事实，不能通过补回 `login_account` 静默恢复旧账号。

#### `auth_session`

`id uuid PK`、`organization_id`、`subject_id FK login_account(subject_id) ON DELETE CASCADE`、`refresh_token_digest bytea UNIQUE`、`password_version bigint NOT NULL CHECK(password_version >= 0)`、`issued_at`、`last_seen_at`、`expires_at`、`revoked_at`、`revoke_reason`。只保存 purpose-scoped digest，不保存 access/refresh token 原文。

索引 `(subject_id, revoked_at, expires_at)` 支持“所有设备退出”。认证必须同时验证账号 `ACTIVE`、session 未撤销/未到期，且 session `password_version` 与当前 credential version 相等。本人改密在递增 credential version 后只把当前 session 更新到新版本并撤销其他 session；self reset、停用和 logout all 撤销全部适用 session；删除/注销在同一事务物理删除全部 session，不把会话作为审计历史保留。

#### `password_credential` 与 `auth_challenge`

- `password_credential`：`subject_id PK/FK login_account ON DELETE CASCADE`、`password_phc text NOT NULL`、`must_change boolean NOT NULL`、`password_version bigint NOT NULL CHECK(password_version >= 0)`、`changed_at timestamptz NOT NULL`；只供教师和管理员密码登录，账号删除时物理删除。创建 credential 时必须显式写入 `must_change`，不使用会把 temporary credential 静默当作最终密码的默认值；
- `auth_challenge`：`id PK`、organization、可空 `subject_id FK login_account ON DELETE CASCADE`、purpose、目标邮箱 digest、验证码 digest、失败次数、最大次数、到期、锁定、消费和创建时间；OTP/待验证邮箱原文不落表，账号删除事务也按 subject/目标邮箱 digest 删除全部相关 challenge。challenge 请求可为不存在账号保存不可识别的反枚举临时事实；只有有效 proof 解析到当前 `ACTIVE` 账号后才允许密码 mutation，消费与 credential/session/audit 变更同事务。

#### `student_profile`

`subject_id uuid PK FK user_subject ON DELETE RESTRICT`，另含 organization、`student_number text NOT NULL`、`name text NOT NULL`、`gender CHECK IN ('FEMALE','MALE')`、`grade_year CHECK BETWEEN 1 AND 4`、可空 college/major/administrative_class、时间和 version。

- `UNIQUE (organization_id, student_number)` 直接保护当前学号唯一；
- constraint trigger 验证存在同 organization、角色为 `STUDENT` 且未终止的 subject/login account；
- 注销成功时物理删除整行，Enrollment、Record、Media 和 Audit 历史只保留 subject ID，不引用 profile；
- 不保存 `student_profile.status`。当前登录账号邮箱已验证且有 `ACTIVE` Enrollment 投影为学生 `ACTIVE`；邮箱已验证但无有效 Enrollment 投影为 `PENDING`。

#### `teacher_profile`

`subject_id uuid PK FK user_subject ON DELETE RESTRICT`、organization、`employee_id text NOT NULL`、`name text NOT NULL`、可空 title/college/department、时间和 version；`UNIQUE (organization_id, employee_id)`；constraint trigger 验证当前 `TEACHER` login account。删除教师登录账号不检查其负责的 Course 作为 blocker，也不修改或转移 `responsible_teacher_subject_id`；成功删除时 profile 整行物理删除，已有 Course 和历史事实继续引用 opaque subject/业务快照。

#### `admin_profile`

| 列 | 类型/约束 |
|---|---|
| `subject_id` | `uuid PK FK user_subject ON DELETE RESTRICT` |
| `organization_id` | 复合归属 FK |
| `admin_kind` | `text CHECK IN ('SUPER','SUB')` |
| `login_name_normalized` | `text NULL`；`SUB` 必填且创建后 immutable |
| `name` | 非空 |
| `department` | 可空 |
| `created_by_super_admin_subject_id` | `SUB` 必填 |
| `created_at`、`updated_at`、`version` | 通用字段 |

- `UNIQUE (login_name_normalized) WHERE login_name_normalized IS NOT NULL` 保护当前分管理员登录账号全局唯一；
- 管理员学校邮箱只保存在 `login_account.email_normalized`，由统一 organization-scoped unique 保护，不在 profile 复制第二份真相；
- 每个组织 `UNIQUE (organization_id) WHERE admin_kind='SUPER'` 由 partial unique 保护；当前业务不允许总管理员删除；
- `SUB` 当前业务状态只从 `login_account.access_state` 投影 `ACTIVE/DISABLED`；成功删除/注销后 profile 和 login account 均不存在，不伪造第三种可选管理状态。

#### `admin_permission_grant`

`id PK`、organization、`admin_subject_id`、`permission_code`、`granted_by_super_admin_subject_id`、`granted_at`、可空 `revoked_by_super_admin_subject_id/revoked_at`、`command_id`。

`permission_code` 只允许：

```text
COURSE_VIEW
SEMESTER
USERS_ACCOUNTS
FEEDBACK
GLOBAL_RULES
SYSTEM_MODE
HELP_CENTER
AUDIT_QUERY
```

`UNIQUE (admin_subject_id, permission_code) WHERE revoked_at IS NULL` 防止重复当前授权。SUB 创建提交时 deferred trigger 保证至少一项当前权限。只有组织唯一总管理员可 INSERT/revoke；分管理员不能授权。账号删除/注销事务先撤销当前 grant，历史 grant 保留且仅引用 subject。

#### 账号删除/注销事实

不建立保留账号资料的注销空壳表，也不保留 `CLOSED login_account`。学生必须二次邮箱验证且无进行中 Session/其他已定义 blocker；分管理员本人注销或总管理员删除前必须完成职责移交。教师账号删除不要求 Course 责任移交、不建立责任教师交接业务，Course 责任不是删除 blocker；管理员不得在该 Use Case 中修改/转移责任教师、管理 Course 或改写课程事实。成功事务必须原子完成：

1. 锁 `user_subject`、`login_account`、对应 profile、全部 session/challenge，以及仅对学生/分管理员适用的角色专属 blocker；教师删除不为 blocker 查询或锁定 Course；
2. 再次检查身份复验、角色和该角色适用的 blocker；教师路径不检查 Course 责任；
3. 如为 SUB，撤销全部当前 permission grant；
4. 将 `user_subject.closed_at` 从空写为数据库当前时间，并插入不含 PII 的 AuditEvent；
5. 物理删除 password credential、session、全部相关 challenge、对应 profile 和 `login_account`。

任一步失败整体回滚，不能出现“账号仍可登录但 profile 已删”或“显示注销成功但数据仍在”的状态。保留的运动记录、正式媒体、审核、成绩、权限历史和 AuditEvent 只通过 opaque subject ID 关联，不允许反查已删除邮箱/登录名/姓名/学号。总管理员本人注销和教师本人注销没有表单或 Domain command；使用同一学校身份重新注册/恢复也不在当前业务闭集内，Backend 不得静默复活或重新绑定旧 subject。

### 5.3 Semester、Course、Enrollment 与官方名单

#### `semester` 与 `semester_transition`

`semester`：`id PK`、organization、academic_year、term_type `FIRST/SECOND/SUMMER`、display_name、start/end `date`、status `UPCOMING/CURRENT/ARCHIVED`、created_by、时间、version、`create_command_id UNIQUE`。

- `UNIQUE (organization_id, academic_year, term_type)`；
- partial `UNIQUE (organization_id) WHERE status='CURRENT'`；
- `ARCHIVED` 不可恢复，`CURRENT` 只能在切换事务中变为 `ARCHIVED`。

`semester_transition` 保存 from/to Semester、actor、command 和 occurred_at；`UNIQUE(to_semester_id)`、`UNIQUE(organization_id, command_id)`；只追加。

#### `course`

| 列 | 类型/约束 |
|---|---|
| `id` | `uuid PK` |
| organization/Semester | 非空复合 FK |
| `responsible_teacher_subject_id` | `uuid FK user_subject ON DELETE RESTRICT`；建立 Course 时必须存在当前 TeacherProfile/LoginAccount；教师账号删除后继续引用 opaque subject，禁止修改或转移 |
| `name`、`description` | name trim 后非空；name 不唯一 |
| `checkin_opens_at`、`checkin_closes_at` | `timestamptz`，`closes > opens` |
| `status` | `OPEN/CLOSED` |
| `current_target_revision_id` | 复合 FK 指向本 Course revision |
| `current_roster_snapshot_id` | 可空复合 FK 指向本 Course snapshot |
| 关闭、时间、version、command | 通用约束 |

`UPCOMING/ACTIVE` 是展示投影，不是可写状态。Course 关闭后拒绝新 Enrollment、Session 和教学 mutation，但历史只读保留。

#### `course_target_revision`

`id PK`、course、`revision_no`、`course_related_target_minutes`、`other_target_minutes`、effective_at、actor、command、created_at。

- 两列非负且合计 `1200`；
- `UNIQUE(course_id, revision_no)`、`UNIQUE(course_id, command_id)`；
- 只追加；Course current pointer 决定当前目标。

#### `course_invitation`

`id PK`、organization/course 复合 FK、`code_digest bytea UNIQUE`、display_suffix、status `ACTIVE/REVOKED`、expires_at、创建/撤销 actor、时间、version、`create_command_id UNIQUE`。原始邀请码不落库。

有效条件同时包含：digest 匹配、`ACTIVE`、未过期、Course `OPEN`、Semester `CURRENT`，以及学生在当前 Semester 没有其他 `ACTIVE` Enrollment。

#### `enrollment` 与 `enrollment_event`

`enrollment`：`id PK`、organization/Semester/course/student 复合 FK、status `ACTIVE/REMOVED`、joined_at、updated_at、version、`join_command_id UNIQUE`。

- `UNIQUE(course_id, student_subject_id)`：同一学生不能重复加入同一 Course；恢复复用原行；
- partial `UNIQUE(organization_id, semester_id, student_subject_id) WHERE status='ACTIVE'`：同学期最多一个有效 Course；
- 正常邀请加入直接 `ACTIVE`，没有待审批状态。

`enrollment_event`：`id PK`、enrollment、sequence、from/to status、actor、可空学生可见原因、command、occurred_at；移出原因非空；`UNIQUE(enrollment_id, sequence_no)` 和 `UNIQUE(enrollment_id, command_id)`；只追加。

#### `roster_snapshot`、`roster_entry` 与 `roster_reconciliation_item`

`roster_snapshot` 保存：`id PK`、organization/course、`snapshot_no`、`source_format CHECK IN ('XLSX','CSV')`、source_display_name、`source_byte_size bigint CHECK(source_byte_size BETWEEN 1 AND 104857600)`、`source_checksum_sha256`、`entry_count integer CHECK(entry_count BETWEEN 1 AND 500)`、imported_by_subject_id、imported_at、`import_command_id`。`UNIQUE(course_id, snapshot_no)`、`UNIQUE(course_id, import_command_id)`。只在整个源文件解析和校验成功后产生，不创建“假成功/空 snapshot”。

`entry_count` 是不含表头的人员数据行总数；重复行和内容错误行也先计入 500 上限，不能通过制造无效行绕过资源限制。通过结构校验但身份重复/冲突的行进入 reconciliation finding；无法解析或缺少必需结构时整次失败。

官方源文件只作为导入输入；解析前按真实内容识别 XLSX/CSV，不能只信扩展名。当前业务要求保留运动媒体而未要求保留名单源文件本体，因此解析后丢弃 source bytes，仅保留 structured snapshot、格式、来源显示名、文件大小和 checksum；不能把本地临时文件路径存入数据库。

`roster_entry` 保存 snapshot、`row_no`、学校名单中的 normalized student number、name 和权威比较所需字段；`UNIQUE(snapshot_id, row_no)`。不能对 student number 建 snapshot 内唯一约束，因为重复行本身必须形成 `DUPLICATE_OR_AMBIGUOUS` 发现。

`roster_reconciliation_item` 保存 snapshot、`finding_type`：

```text
MATCHED
ROSTER_ONLY
MEMBER_ONLY
IDENTITY_CONFLICT
DUPLICATE_OR_AMBIGUOUS
```

另含可空 roster_entry/enrollment、`resolved_at`、`resolved_by_subject_id`、非空处理说明、created_at、version、command。`UNIQUE(snapshot_id, finding_no)`；原 finding 不修改，resolution 字段只能从空变为一组完整非空值一次，随后 immutable，并写 AuditEvent。证据不足时不能通过任意 ID 自动合并。

回退名单只在同一事务中把 `course.current_roster_snapshot_id` 指向本 Course 的旧 snapshot、提升 Course version 并写 AuditEvent；不得更新 Enrollment、Record、Review、Application、Endurance、Certification 或 Grade。

### 5.4 Session、Media、Record 与 Review

#### `exercise_session` 与 `exercise_session_active_interval`

`exercise_session` 保存 organization/Semester/course/enrollment/student 复合 FK、status `ACTIVE/PAUSED/COMPLETED`、`business_date date`、started/completed time、完成后 `actual_duration_ms`、state_version 和 `start_command_id UNIQUE`。

- `business_date = started_at AT TIME ZONE 'Asia/Shanghai'` 的日历日期，只在 Backend 接受开始命令时固化；
- partial `UNIQUE(student_subject_id) WHERE status IN ('ACTIVE','PAUSED')`；
- `COMPLETED` 终态且 actual duration 不可修改。

`exercise_session_active_interval` 保存 session、sequence、opened/closed_at、close_reason、open/close command：

- `closed_at > opened_at`；
- `UNIQUE(session_id, sequence_no)`；
- partial `UNIQUE(session_id) WHERE closed_at IS NULL`；
- exclusion constraint 防止同一 Session 区间重叠；
- 完成事务按数据库 instant 汇总全部闭合区间，客户端时钟不入账。

#### `media_asset`

| 列 | 类型/约束 | 说明 |
|---|---|---|
| `id` | `uuid PK` | 媒体 ID |
| `organization_id`、`owner_subject_id` | 非空复合 FK | 上传主体；只指向 opaque subject |
| `purpose` | `RECORD_EVIDENCE/APPLICATION_EVIDENCE` | allocation 时确定 |
| `session_id` | record evidence 必填，application evidence 为空 | 上传上下文 |
| `record_id` | `BOUND` record evidence 才非空 | 正式 Record |
| `application_submission_id` | `BOUND` application evidence 才非空 | 首次/补充材料 |
| `object_key` | `text UNIQUE NOT NULL` | 服务端生成，不含 PII |
| `media_kind` | `IMAGE/VIDEO` | application 只能 IMAGE |
| `mime_type`、`byte_size`、`checksum_sha256` | Backend/COS 权威元数据 | checksum 固定 32 bytes |
| `provider_etag` | 可空 | 仅诊断，不作为 checksum |
| `duration_ms`、`has_audio`、width/height | 内容探测结果 | 视频规则校验 |
| `status` | `ALLOCATED/UPLOADED/VERIFIED/BOUND/REJECTED/EXPIRED` | 单向生命周期 |
| `position`、各状态时间、version | 状态字段 | 绑定后 immutable |

状态约束：

- `VERIFIED/BOUND` 必须有权威 MIME、正 byte size、checksum 和 verified_at；
- `BOUND` 必须恰好绑定 `record_id` 或 `application_submission_id` 之一；
- record 图片只允许 JPEG/PNG 且单张不超过 10 MB；record 视频只允许 MP4、1–15 秒、含音轨且不超过 100 MB；
- application evidence 只允许 Backend 内容探测为 `image/jpeg`、`image/png` 或 `image/webp` 的图片，`byte_size <= 10485760`（10 × 1024 × 1024 bytes），不允许 PDF、视频或其他格式；
- deferred aggregate trigger 在 commit 前按 Application 汇总首次和全部补充 submission 的 `BOUND` evidence，保证总数不超过 3；不能只限制单个 submission 而让补充材料绕过总上限；
- 相同 checksum 不唯一，因为不同业务可合法提交相同内容。

PostgreSQL 不保存图片/视频 bytea、COS 本体或签名 URL。Backend 鉴权后即时签发最小权限短时 URL。

#### `exercise_record`

`exercise_record` 保存 organization/Semester/course/enrollment/student、`session_id UNIQUE`、从 Session 固化的 business_date、category `COURSE_RELATED/OTHER`、1–200 字 description、不可变 actual_duration_ms、`credited_minutes CHECK IN (0,60,120)`、媒体 count/total bytes、submitted_at 和 `submit_command_id UNIQUE`。

映射 CHECK：

```text
actual_duration_ms < 3,600,000                 -> credited_minutes = 0
3,600,000 <= actual_duration_ms < 7,200,000   -> credited_minutes = 60
actual_duration_ms >= 7,200,000                -> credited_minutes = 120
```

- `UNIQUE(enrollment_id, business_date)` 保护同一学生/Course/Session 开始所属上海日期最多一条 Record；
- Record 媒体数量为 0–6 图片、0–1 视频、合计至少一项、总量不超过 250 MB；
- partial unique `(record_id) WHERE media_kind='VIDEO' AND status='BOUND'`、`UNIQUE(record_id, position)` 与 deferred aggregate trigger 共同保护媒体约束；
- Record 没有 `DRAFT/SUBMITTED/APPROVED/REJECTED/resubmission/attempt` 状态。

#### `review` 与 `record_review_state`

`review`：`id PK`、record、sequence、from_result、result `VALID/INVALID`、actor_type `SYSTEM/TEACHER`、reviewer、学生可见 reason、command、occurred_at。

- Record 创建时 sequence 0、SYSTEM、from null、result `VALID`；
- 教师 Review 必须 `from_result <> result` 且 reason 非空；
- `UNIQUE(record_id, sequence_no)`、`UNIQUE(record_id, command_id)`；
- 只允许 INSERT/SELECT。

“同一记录不能重复审核”不能实现为 `UNIQUE(record_id)`，因为业务允许 `INVALID → VALID` 纠正。正确保护是 command/sequence 唯一、expected version、from/current 一致且相同结果不得重复追加。

`record_review_state`：`record_id PK`、current_review_id/result/sequence、version、updated_at；复合 FK 保证当前指针确实指向同一 Record 的同一 Review。

### 5.5 耐力跑规则、真实用时与换算

#### `endurance_rule_table`、`endurance_rule_revision` 与 `endurance_rule_interval`

`endurance_rule_table` 保存 `id PK`、organization、gender `FEMALE/MALE`、grade_group `Y1_Y2/Y3_Y4`、distance_meters `800/1000`、current_revision_id、version、updated_at。

- `UNIQUE(organization_id, gender, grade_group, distance_meters)`；
- constraint trigger 只允许 `FEMALE+800` 或 `MALE+1000`；
- 每个组织必须预置恰好四个组合，但预置数据属于后续 migration seed，不在本文创建；
- 页面“删除”只删除当前表某条区间并形成新 revision，不删除 RuleTable 聚合根。

`endurance_rule_revision`：`id PK`、rule_table、revision_no、actor、command、created_at；`UNIQUE(rule_table_id, revision_no)`、`UNIQUE(rule_table_id, command_id)`；只追加。

`endurance_rule_interval`：`id PK`、revision、`lower_seconds/upper_seconds` 非负整数且 lower ≤ upper、`score` 0–100 整数、`level` `EXCELLENT/GOOD/PASS/FAIL`、可空 remark。

数据库保护：

- `UNIQUE(revision_id, lower_seconds, upper_seconds)`；
- exclusion constraint 使同 revision 的闭区间不重叠；
- level 必须与 score 一致：95–100 优秀、92–94 良好、60–91 及格、0–59 不及格；
- deferred validation function 在 current pointer 改变前检查 revision 非空、相邻区间连续无 gap、无 overlap、分数越高的用时不更慢，并确保每个被覆盖的整数秒只匹配一行；
- 当前预置 revision 每表 101 行、四表合计 404 行；99–1 分为连续 3 秒档，100/0 分覆盖首尾。后续管理员编辑仍必须整表验证。

管理员一次添加、编辑或删除在数据库中表现为“复制当前完整规则 → 应用一处变更 → 验证完整新 revision → 原子切换 current pointer”。失败时旧 revision 和 current pointer 均不变。

#### `endurance_measurement`、`endurance_conversion` 与 `endurance_outcome_state`

`endurance_measurement` 保存 `id PK`、organization/Semester/course/enrollment/student subject、`sequence_no`、`duration_seconds integer CHECK >= 0`、gender/grade_group/distance snapshot、confirmed_by_teacher_subject_id、command、confirmed_at。`UNIQUE(enrollment_id, sequence_no)`、`UNIQUE(enrollment_id, command_id)`；只追加。

`endurance_conversion` 与 measurement 一对一且可空，保存 `measurement_id PK/FK`、rule_table/revision/interval FK、score/level snapshot 和 converted_at。只有唯一 interval 匹配时才允许创建；无匹配或多匹配时 measurement 可以保留，但 conversion 显示“不可用”，不得猜测相邻分数。

`endurance_outcome_state`：`enrollment_id PK`、`outcome CHECK IN ('UNRECORDED','MEASURED','EXEMPT')`、可空 current_measurement_id、可空 approved_exemption_application_id、version、updated_at。

- `MEASURED` 必须且只指向 measurement；
- `EXEMPT` 必须且只指向本 Enrollment 的已批准免测申请；
- `UNRECORDED` 两个指针都为空；
- conversion 与最终成绩、Record/认证学时完全独立；
- 新规则 revision 不回算、覆盖或删除既有 conversion snapshot。

### 5.6 免测、校队/社团认证及认可学时

#### `student_application`

| 列 | 类型/约束 |
|---|---|
| `id` | `uuid PK` |
| organization/Semester/course/enrollment/student | 非空复合 FK |
| `application_no` | 组织内用户可见编号，`UNIQUE(organization_id, application_no)` |
| `application_type` | `text NOT NULL CHECK IN ('EXEMPTION','CERTIFICATION')` |
| `current_status` | `SUBMITTED/SUPPLEMENT_REQUIRED/APPROVED/REJECTED` |
| `current_submission_id`、`current_decision_id` | 复合 FK 指向本申请历史 |
| `submitted_at`、`updated_at`、`version` | 通用字段 |
| `create_command_id` | `UNIQUE` |

没有客户端可写 Draft。首次正式提交事务成功才创建 Application 和 `SUBMITTED` 状态；本地准备不是正式 Application。

合法状态转换只有：

```text
首次提交                       -> SUBMITTED
SUBMITTED + REQUEST_SUPPLEMENT -> SUPPLEMENT_REQUIRED
SUPPLEMENT_REQUIRED + 补充提交 -> SUBMITTED
SUBMITTED + APPROVE            -> APPROVED
SUBMITTED + REJECT             -> REJECTED
```

`APPROVED/REJECTED` 对申请审核为终态；已批准认证的学时调整/撤销使用独立 CreditRevision，不把申请退回其他状态。

`certification_application_detail` 与 certification application 一对一，采用最小增量，不重新设计申请系统：

| 列 | 类型/约束 | 说明 |
|---|---|---|
| `application_id` | `uuid PK/FK student_application(id) ON DELETE RESTRICT` | 一份申请最多一个认证详情；与父申请同 organization/Course/Student 边界 |
| `certification_kind` | `text NOT NULL CHECK IN ('SCHOOL_TEAM','STUDENT_CLUB')` | `CertificationKind` 的唯一持久化事实；禁止 null、未知值、任意字符串和名称推断 |
| `organization_or_team_name` | `text NOT NULL CHECK(btrim(organization_or_team_name) <> '')` | 仅保存提交名称，不承担 discriminator 作用 |
| `valid_from` | `date NOT NULL` | 证书日历日期 |
| `valid_to` | `date NOT NULL CHECK(valid_to >= valid_from)` | 证书日历日期 |

deferred constraint trigger 在事务提交前验证：`application_type='CERTIFICATION'` 恰好存在一行 detail，且 `application_type='EXEMPTION'` 不存在 detail。这样 `CERTIFICATION` 不可能以缺失/空 kind 提交，EXEMPTION 也不会携带伪认证详情。数据库 closed-set 继续使用本设计统一的 `text + CHECK` 策略，不为单一字段引入 PostgreSQL enum。

##### `CertificationKind` Mapper 与 round-trip 边界

`CertificationKind` 的双向映射必须显式且穷尽，生成的 Contract 类型只存在于 API 边界：

| 方向 | 映射 | 失败语义 |
|---|---|---|
| Contract → Domain | generated `CertificationKind.SCHOOL_TEAM` → API Mapper → Domain `CertificationKind.SCHOOL_TEAM`；`STUDENT_CLUB` 同名映射 | 缺失、null 或未知 Contract 值在 schema/API Mapper 边界拒绝，不能建立 Domain command |
| Domain → Persistence | Domain `SCHOOL_TEAM` → Persistence Mapper → database text `SCHOOL_TEAM`；`STUDENT_CLUB` 同名映射 | 无 default、无 `UNKNOWN`、无名称/旧 subtype 推断；写入前的非穷尽分支是实现缺陷 |
| Persistence → Domain | database `SCHOOL_TEAM/STUDENT_CLUB` → Persistence Mapper → 对应 Domain enum | null、未知或任意字符串属于内部数据不变量破坏，必须 fail closed 并报告内部错误，不能伪装正常业务结果 |
| Domain → Contract | Domain enum → Application Result → API Mapper → 同名 Contract enum | 不允许 silently fallback、default 或省略 response field |

创建、列表、详情、补充材料响应和教师决定响应必须从该持久化事实恢复同一个值，保证 `SCHOOL_TEAM → SCHOOL_TEAM`、`STUDENT_CLUB → STUDENT_CLUB`。Mapper 只转换表示形式；`ApplicationType=CERTIFICATION` 时详情必需、日期和名称规则由 Domain factory/aggregate 校验，数据库约束是最后防线。

##### Existing data 与未来 migration 安全

Phase 5F 静态扫描确认：当前 checkout 的 Backend、infra 和 E2E 目录仍为占位说明；仓库不存在 PostgreSQL schema/migration、SQL、seed、dump、已接入开发数据库或已验收 Staging/Production 数据。旧 Android/Web `applicationSubtype`、Mock 和 fixture 只是 Legacy Migration evidence，不是数据库行或可审计映射来源。因此当前正式设计按**未来空库**处理：首个 migration 可直接创建 `certification_kind text NOT NULL CHECK (...)`，不需要回填脚本。

该结论不授权假设仓库之外永远没有数据。任何 migration 前必须对目标环境只读盘点；一旦发现任何既有 `CERTIFICATION` 行，立即标记 `DATA_MIGRATION_DECISION_REQUIRED` 并停止自动 migration 设计。后续只能采用业务负责人批准的可审计来源、逐行人工确认，或明确的数据清理方案；绝不允许根据 `organization_or_team_name`、`teamName`、关键词、旧客户端 subtype 或默认值猜测分类。

#### `application_submission` 与证据

`application_submission` 保存 application、sequence、submission_kind `INITIAL/SUPPLEMENT`、submitted_by_student、submitted_at、command；`UNIQUE(application_id, sequence_no)`、`UNIQUE(application_id, command_id)`；只追加。

绑定该 submission 的 `media_asset` 必须：

- owner 是申请学生；
- purpose 为 `APPLICATION_EVIDENCE`；
- status 由 `VERIFIED` 原子变为 `BOUND`；
- 全部为 Backend 内容探测的 JPEG/PNG/WebP 图片，且每张不超过 10 MB；
- `UNIQUE(application_submission_id, position)`。

同一 Application 的 `INITIAL + SUPPLEMENT` 全部 `BOUND` evidence 合计最多 3 张，由 deferred aggregate trigger 保护。教师要求补充材料后，学生可以在总量仍有空间时追加新的 `SUPPLEMENT` submission；事务把 current status 从 `SUPPLEMENT_REQUIRED` 变回 `SUBMITTED`，旧 submission 和证据不覆盖。达到 3 张时 Backend 必须拒绝额外图片，不得返回 Fake Success。

#### `application_decision`

`id PK`、application、sequence、from/to status、`decision CHECK IN ('APPROVE','REJECT','REQUEST_SUPPLEMENT')`、teacher、学生可见意见、command、occurred_at。`UNIQUE(application_id, sequence_no)`、`UNIQUE(application_id, command_id)`；只追加。

- 决策人必须是申请 Course 当前责任教师；
- APPROVE → `APPROVED`，REJECT → `REJECTED`，REQUEST_SUPPLEMENT → `SUPPLEMENT_REQUIRED`；
- reason/处理意见 trim 后非空；
- current status/decision pointer 与 decision 同事务更新；
- 相同命令或相同 current status 不能重复处理。

#### `certification_credit_revision` 与 `certification_credit_state`

`certification_credit_revision` 保存 certification application、revision_no、`action CHECK IN ('APPROVE','ADJUST','REVOKE')`、两类认可分钟、teacher、student-visible reason、command、occurred_at。

- 两类分钟均非负；
- `APPROVE/ADJUST` 时任一类可为 0，但合计必须大于 0、≤1,200，且各类不能超过执行时 Course 当前分类目标；
- `REVOKE` 时两类均为 0，原因非空；
- `UNIQUE(application_id, revision_no)`、`UNIQUE(application_id, command_id)`；
- 只追加。

`certification_credit_state`：`application_id PK`、current_revision_id、`current_state ACTIVE/REVOKED`、两类 current minutes、version、updated_at。复合 FK 保证 current 数值与 revision 一致。

Application 首次批准与 `APPROVE` credit revision 必须同事务；调整或撤销只改变 current state，不改 Application 的已批准事实和旧 revision。多个认证的当前认可分钟在 Statistics 中共同累计，再由 category target 封顶。

免测 APPROVE 与 `endurance_outcome_state → EXEMPT` 同事务；批准后不创建真实用时、分数或等级，也不影响 20 小时进度和 FinalGrade。

### 5.7 最终成绩与 Statistics

#### `final_grade_publication` 与 `final_grade_state`

`final_grade_publication`：`id PK`、organization/Semester/course/enrollment/student、sequence、`grade_value integer NOT NULL`、`remark text NULL CHECK(char_length(remark) <= 50)`、published_by_teacher_subject_id、command、published_at。`UNIQUE(enrollment_id, sequence_no)`、`UNIQUE(enrollment_id, command_id)`；只追加。

PostgreSQL `integer` 对应有符号 32-bit `INT`。业务没有增加 0–100 范围，因此不得添加该 CHECK，也不得让进度或耐力跑自动计算成绩。备注为空和 NULL 均可由 Contract 统一 normalize 为 NULL；50 字符使用 PostgreSQL `char_length`，不按 UTF-8 bytes 计数。

`final_grade_state`：`enrollment_id PK`、current_publication_id、version、updated_at。教师第一次发布或修改再发布都插入新 publication 并更新 pointer；没有管理员审批、学生调整申请或覆盖旧发布。

#### Statistics 只读模型

不建立客户端可写 `statistics` source-of-truth 表。建议普通 SQL view/Repository query：

- `student_course_progress_v`：
  - `record_minutes`：当前 Review 为 `VALID` 的 Record credited minutes；
  - `certification_minutes`：所有当前 `ACTIVE` certification credit；
  - 每 category 先分别展示两种来源，再对二者之和按当前 Course target 封顶；
  - 输出两类原始累计、两类封顶累计、总有效分钟、剩余分钟、原始完成比例和是否达标；
- `course_progress_summary_v`：先取得每个学生按 category 封顶后的结果，再汇总 Course 累计和人均。

`INVALID` Record 与 `REVOKED` certification 当前贡献均为 0，但原事实不改写。UI 四舍五入整数百分比不入库；全部业务判断只使用原始整数分钟。耐力跑 measurement/conversion、免测和 FinalGrade 不进入 20 小时 Statistics。

### 5.8 用户反馈与帮助中心

#### `feedback_ticket` 与 `feedback_reply`

`feedback_ticket` 保存 `id PK`、organization、`ticket_no UNIQUE within organization`、student、category：

```text
FUNCTION_BUG
FEATURE_SUGGESTION
ACCESSIBILITY
PRIVACY
OTHER
```

另含非空 description、`current_status`：

```text
WAITING
IN_PROGRESS
WAITING_TECH
COMPLETED
CLOSED
```

以及 submitted_at、updated_at、version、`create_command_id UNIQUE`。

`feedback_reply` 保存 ticket、sequence、from/to status、admin author、非空 public_reply、command、replied_at。`UNIQUE(ticket_id, sequence_no)`、`UNIQUE(ticket_id, command_id)`；只追加。

- 创建 ticket 初始 `WAITING`，不创建虚假回复；
- 处理保存必须选择非 `WAITING` 状态，并在同一事务追加一条公开回复；
- 后续可以在四个非 WAITING 状态间选择；`COMPLETED/CLOSED` 可回到 `IN_PROGRESS/WAITING_TECH`；
- 不能删除 ticket/reply、编辑既有回复、添加内部备注/附件/优先级/平台/版本或指定处理人；
- 教师不是 feedback handler。

#### `help_article`、`help_article_revision` 与 `help_article_keyword`

`help_article`：`id PK`、organization、`status CHECK IN ('DRAFT','PUBLISHED','ARCHIVED')`、current_revision_id、first_published_at、updated_at、version、create_command_id。

`help_article_revision` 保存 article、revision_no、双语 title/body、固定 category、`sort_weight numeric`、actor、command、created_at。固定 category 只允许：

```text
LOGIN_AND_VERIFICATION
JOIN_AND_CORRECTION
CHECKIN_AND_HOURS
EVIDENCE_UPLOAD
COURSE_AND_GRADE
EXEMPTION
ORGANIZATION_CERTIFICATION
NOTIFICATION
MAINTENANCE
SERVICE_FEEDBACK
```

`help_article_keyword`：revision、keyword、position；`UNIQUE(revision_id, keyword)`、`UNIQUE(revision_id, position)`。

约束：

- 任意保存都要求中英文标题非空、category 合法、sort weight 为有限数值；
- `PUBLISHED` revision 必须中英文正文非空且至少一个关键词；
- 合法转换只有 `DRAFT→PUBLISHED`、`PUBLISHED→ARCHIVED`、`ARCHIVED→PUBLISHED`；published 内容编辑保持 `PUBLISHED` 并立即切换 current revision；
- `DRAFT` 不能由其他状态回退得到；没有 delete、定时发布、审批或版本回滚；
- `UNIQUE(article_id, revision_no)`、`UNIQUE(article_id, command_id)`，历史只追加；
- expected version 冲突时不覆盖当前 revision。

学生查询只投影当前 locale 的 `PUBLISHED` current revision；每页最多 5 条，排序 `sort_weight DESC, updated_at DESC, id DESC`。

### 5.9 系统模式与站内通知中心

#### `system_mode_state` 与 `system_mode_transition`

`system_mode_state`：`organization_id PK/FK`、`mode CHECK IN ('NORMAL','MAINTENANCE')`、`policy_version`、current_transition_id、updated_at、version。每个组织恰好一行，初始化为 `NORMAL`。

`system_mode_transition` 保存 organization、sequence、from/to mode、非空 reason、actor、command、occurred_at，以及仅进入 MAINTENANCE 时必填的中英文公告标题/正文和 `estimated_recovery_at`。`UNIQUE(organization_id, sequence_no)`、`UNIQUE(organization_id, command_id)`；只追加。

- from 与 to 必须不同；
- MAINTENANCE 公告五项内容与 mode/current pointer 在同一事务；
- estimated recovery 只是告知 instant，不创建自动恢复任务；
- NORMAL 恢复只由授权管理员明确执行；
- 模式切换不更新、重算或删除任何其他业务事实。

所有普通业务 mutation 先取得 organization-scoped shared advisory transaction lock，再读取 mode 必须为 `NORMAL`；模式切换取得同 key 的 exclusive advisory transaction lock。这样模式切换与已经开始的普通写事务有确定顺序，避免“检查为 NORMAL 后跨过切换提交”。MAINTENANCE 下只允许鉴权、读取当前维护公告，以及有 `SYSTEM_MODE` 权限的必要恢复治理。

#### `in_app_notification`

| 列 | 类型/约束 |
|---|---|
| `id` | `uuid PK` |
| `organization_id`、`recipient_subject_id` | 非空复合 FK 指向 user_subject |
| `notification_type` | 稳定 allowlist 类型 |
| `source_type`、`source_id`、`source_event_no` | 产生通知的正式业务事件引用 |
| `title_zh/title_en`、`body_zh/body_en` | 服务端生成的双语消息快照 |
| `target_route`、`target_id` | allowlist 站内目标；不是任意 URL |
| `created_at` | `timestamptz NOT NULL` |
| `read_at` | 可空；只由本人标记 |

`UNIQUE(recipient_subject_id, source_type, source_id, source_event_no, notification_type)` 防止命令重试重复通知。正式结果 transaction 插入对应站内通知：

- Enrollment 移出/恢复；
- Review 当前结果变化；
- 免测/认证申请结果、补充材料要求、认证调整/撤销；
- 耐力跑真实用时/换算结果；
- FinalGrade 新发布；
- Feedback 状态和公开回复；
- 进入维护/恢复等面向受影响用户的系统结果。

组织范围模式通知使用 `INSERT ... SELECT` 为当时受影响的当前有效用户生成直接收件行，避免未来用户看到历史通知，也不引入广播已读辅助状态。

站内通知没有 `DELIVERED/PUSHED/FAILED` 状态，不保存 device token，不调用短信、邮件或 Android/iOS 系统 Push，不需要 Redis、消息队列或第三方推送服务。`read_at` 的写入失败只影响阅读状态，不回滚或改写来源业务；业务详情页始终是最终事实来源。打开通知列表不自动写审计，显式“标为已读”可不写正式审计，避免递归噪声。

### 5.10 正式审计日志与运行日志 ZIP

#### `audit_event`

| 列 | 类型/约束 | 说明 |
|---|---|---|
| `id` | `uuid PK` | 事件 ID |
| `organization_id` | `uuid NOT NULL` | 强制范围 |
| `occurred_at` | `timestamptz NOT NULL` | 服务端时间 |
| `actor_subject_id` | 可空 FK user_subject RESTRICT | 系统动作可空 |
| `actor_role_snapshot` | `text NOT NULL` | 发生时角色 |
| `operation_type` | `text NOT NULL` | 稳定动作名 |
| `outcome` | `SUCCESS/REJECTED/DENIED/FAILED/ERROR` | 真实结果 |
| `target_type`、`target_id` | 类型和可空稳定引用 | 不用多态 FK |
| `reason_code` | 可空 | 不保存敏感正文 |
| `request_id`、`request_event_index` | 请求关联和事件序号 | 不保存原幂等 secret |
| `metadata_schema_version` | 正整数 | allowlist 版本 |
| `safe_metadata` | object `jsonb` | 仅动作专属白名单 |

`UNIQUE(organization_id, request_id, request_event_index)` 防止重复审计。AuditEvent 是历史引用，不因目标生命周期级联删除。

禁止进入 AuditEvent/ZIP：密码、验证码、Token、secret、原始邀请码/幂等键、原始 IP/设备指纹/User-Agent、完整个人资料、媒体内容、COS object key、签名 URL、内部备注或原始业务快照。

审计表由独立 owner 拥有；Backend runtime 只可 INSERT，审计 reader 只可按组织 SELECT，运行时角色无 UPDATE/DELETE/TRUNCATE。immutable trigger 再次拒绝修改；migration owner 不用于运行时。

至少审计：认证安全、学期、教师/分管理员/权限/账号终止、Course/目标/邀请/Enrollment、官方名单、Session/媒体/Record/Review、耐力规则/真实用时/换算、申请/认证学时、最终成绩、反馈、帮助中心、系统模式、通知生成失败、审计 ZIP 请求/完成/失败/下载。

成功 mutation 的 AuditEvent 与业务改变同一 transaction；AuditEvent INSERT 失败则业务回滚。权限拒绝、校验驳回和事务回滚后的失败事件没有可共同提交的业务改变，使用独立短事务记录真实 outcome。数据库本身不可用时只能保留脱敏 operational log，不能伪造审计已经成功。

#### `audit_archive_job`

`id PK`、organization、requested_by、from_instant、to_instant_exclusive、status `REQUESTED/RUNNING/SUCCEEDED/FAILED/CANCELLED/EXPIRED`、COS object_key/mime/size/checksum、failure_code、时间、version、`request_command_id UNIQUE`。

- 管理页面日期按上海时区转换为 UTC 半开区间；
- ZIP 本体在 COS，PostgreSQL 只存元数据，不存 blob 或签名 URL；
- Backend worker 用 `FOR UPDATE SKIP LOCKED` 领取 PostgreSQL job，在事务外生成/上传，短事务 CAS 写成功/失败与 AuditEvent；
- 下载前重新鉴权并即时签发短时 URL；
- 使用 PostgreSQL job table + Backend worker，不引入 Redis 或消息队列。

## 6. 关键数据库约束总表

| 业务规则 | 数据库保护 | 事务保护 |
|---|---|---|
| 当前学号/工号/学校邮箱唯一 | profile/login account organization-scoped unique | normalize 后写入，冲突映射领域错误 |
| 分管理员当前登录账号全局唯一且 immutable | profile global partial unique + immutable trigger | 只有总管理员可创建，编辑不接受 login name |
| SUB 至少一项固定权限 | permission CHECK + deferred trigger | 创建 Subject/LoginAccount/Profile/首批 grants 同事务 |
| 停用后全部退出 | `login_account.access_state` + session revoke fields | 锁 account/session 后批量 revoke |
| 删除/注销账号相关数据 | login/account-data FK 与 `user_subject.closed_at` one-way trigger | 锁完整删除集，写 safe audit 后物理删除，任一步失败回滚 |
| 同组织最多一个总管理员 | constraint trigger + 受限创建函数 | 只在初始化流程产生 |
| 学年/学期唯一、唯一当前学期 | composite unique + CURRENT partial unique | 锁组织和 from/to Semester |
| 两类 Course target 合计 1,200 分钟 | revision CHECK | 新 revision 和 current pointer 同事务 |
| 邀请码唯一 | global unique digest | 服务端高熵生成、碰撞重试 |
| 同学生不能重复加入同一 Course | `UNIQUE(course_id, student_subject_id)` | 恢复原 Enrollment |
| 同学期最多一个有效 Course | ACTIVE partial unique | 锁 Student 和同学期 Enrollment |
| 官方名单仅 XLSX/CSV、≤100 MB、≤500 人且快照不可改写 | format/byte/count CHECK + snapshot/entry immutable triggers | transaction 外完整解析，事务内再次检查 metadata 才插入和切换 pointer |
| 名单回退不改业务事实 | current pointer FK 只能指向本 Course | 只更新 pointer/version/audit |
| 同学生最多一条进行中 Session | ACTIVE/PAUSED partial unique | start 锁 Enrollment/Student |
| Session 完成不可恢复 | state CHECK + restricted write | expected version + transition table |
| Session 开始上海日期固定 | generated/constraint verification | Backend 用服务端 started_at 写入 |
| 一 Session 最多一 Record | `UNIQUE(session_id)` | submit 锁 Session |
| 同 Enrollment/业务日期一 Record | `UNIQUE(enrollment_id, business_date)` | 不接受客户端日期 |
| 正式时长与计入分钟分开 | 独立列 + 0/60/120 映射 CHECK | 从 completed Session 复制/计算 |
| Record 媒体数量、格式、大小 | status CHECK、partial unique、deferred aggregate trigger | 锁全部 asset 后重新探测汇总 |
| 申请证据仅 JPEG/PNG/WebP、单张≤10 MB、每申请总计≤3 张 | purpose-aware CHECK + deferred application aggregate trigger | Backend 权威 MIME/bytes/checksum 后锁全部申请证据再绑定 |
| Media 只能绑定一个业务目标 | one-of CHECK | BOUND CAS 与目标创建同事务 |
| Review 默认有效且历史只追加 | initial Review + immutable trigger | Record submit 同事务创建 current state |
| 不重复审核但允许纠正 | command/sequence unique、from ≠ result | 锁 state + expected version |
| 固定四套耐力规则 | combo unique + gender/distance trigger | migration seed 与完整性测试 |
| 耐力区间唯一连续 | exclusion + deferred整表校验 | 创建完整 revision 后原子切换 |
| 历史换算不被规则改写 | conversion 引用 immutable revision/interval + snapshots | 新规则只影响后续 measurement |
| 实测/免测当前互斥 | outcome one-of CHECK | measurement 或 exemption approval 更新 pointer |
| 申请命令与处理不重复 | application/submission/decision command unique | 锁 current state/version |
| 认证分类 required/non-null/closed set | detail `certification_kind NOT NULL` + `CHECK IN ('SCHOOL_TEAM','STUDENT_CLUB')` + type/detail deferred trigger | CERTIFICATION Domain factory 要求完整 detail，创建事务原样写入；EXEMPTION 禁止 detail |
| 认证分钟范围正确 | revision CHECK + current composite FK | 按执行时 Course target 再校验 |
| 最终成绩为 INT、备注≤50 字且历史只追加 | integer/`char_length` CHECK + publication sequence/command unique | 教师发布后更新 current pointer |
| Feedback 状态必须伴随公开回复 | reply + deferred current-state trigger | update ticket 和 insert reply 同事务 |
| Help 合法发布状态和内容 | state CHECK + deferred revision validation | 完整 revision、pointer、state 同事务 |
| 系统模式组织单例 | organization PK + from ≠ to | exclusive advisory lock + transition/audit |
| 站内通知不重复 | recipient/source/event/type unique | 与正式结果 mutation 同事务 |
| 审计不可修改 | 独立 owner、privilege、reject trigger | 成功 mutation 与 AuditEvent 同事务 |

partial unique、exclusion 或 deferred constraint 冲突必须映射为稳定 Domain conflict。不得向客户端暴露 SQLSTATE、constraint 名、SQL 或内部 FK。

## 7. 事务边界

### 7.1 通用规则

- 普通业务 mutation 使用 `READ COMMITTED + organization shared advisory xact lock + SELECT ... FOR UPDATE + UNIQUE/CHECK/FK`。
- 学期切换、耐力规则整表切换和管理员批量导入可使用 `SERIALIZABLE` 或组织级 exclusive advisory lock。
- 固定锁顺序：Organization/mode → UserSubject/LoginAccount → Semester → Course → Enrollment → Application/Session → 按 UUID 排序的 MediaAsset → Record/Outcome/current state → Account sessions → AuditEvent。
- create 命令保存 `command_id`；更新命令要求 expected `version`。相同 command 返回原结果，不重复创建历史或通知。
- COS 上传、内容探测、密码 hash、CSV/XLSX 解析和 ZIP 生成放在数据库 transaction 外；正式绑定/current pointer/业务状态只在短 transaction 内改变。
- 数据库使用服务端时间；客户端不提交正式 created/transition/audit time、Session duration、credited minutes、换算 score/level 或当前状态。
- 成功 mutation 的 AuditEvent 与业务事实同事务；面向用户的正式结果通知也在该事务插入。站内通知的后续 `read_at` 不参与来源业务事务。

### 7.2 创建/切换 Semester

创建：锁 Organization，验证组合和日期，插入 `UPCOMING` Semester 与 AuditEvent，同事务提交。

切换：

1. 取得 organization exclusive lock，锁目标 `UPCOMING` 和当前 `CURRENT`；
2. 用上海业务日期验证目标已经到达 `start_date`；
3. current 改 `ARCHIVED`，target 改 `CURRENT`；
4. 插入 `semester_transition`；
5. 插入 AuditEvent；
6. 任一步失败整体回滚，CURRENT partial unique 是最终并发保护。

### 7.3 教师/分管理员建立、权限和账号终止

教师 CSV 解析、列校验和每行独立 password hash 在事务前完成，明文密码不落文件/日志/审计。事务内再次检查 email/employee ID 冲突，整批插入 UserSubject/LoginAccount/Profile/Credential（`must_change=true`、初始 `password_version`）和脱敏汇总 AuditEvent；任一行失败整批回滚。

创建分管理员：

1. 验证操作者是总管理员，normalize login/email，hash 初始密码；
2. 锁 Organization，检查全局 login、组织 email 和至少一项 permission；
3. 插入 UserSubject、LoginAccount、AdminProfile、Credential（`must_change=true`、初始 `password_version`）和全部初始 permission grants；
4. deferred trigger 再验证至少一项当前权限；
5. 写 AuditEvent；整笔提交。

初始 Super-admin 的 provisioning 不属于公共 API，但写入相同 credential 模型时也必须显式 `must_change=true`。不允许通过 seed、运维脚本或数据库默认值绕过 temporary-password gate。

本人改密：password hash 在事务外完成；事务内锁 LoginAccount/Credential/当前 Session/其他未撤销 Session，验证账号 `ACTIVE`、当前密码结果和账号 expected version，替换 PHC、递增 credential `password_version` 与账号 aggregate `version`、设置 `must_change=false`，把当前 Session 更新到新 password version 并撤销其他 Session，写不含秘密的 AuditEvent 后整体提交。返回的 `CurrentActor.version` 是更新后的账号 aggregate version。任一步失败不得部分更新 credential、gate 或 session。

self reset：先按反枚举流程验证并解析一次性 `PASSWORD_RESET` proof，password hash 在事务外完成；事务内锁 Challenge/LoginAccount/Credential/全部 Session。账号不是 `ACTIVE` 时返回稳定停用结果且不改变 credential/gate/state；该失败下 challenge 的安全 terminal/重试处理不得被解释为业务成功。成功时消费 challenge、替换 PHC、递增 credential `password_version` 与账号 aggregate `version`、设置 `must_change=false`、撤销全部 Session并写安全 AuditEvent，不创建新 Session。logout current/all 分别锁定并撤销目标 Session 集合，重复撤销幂等。

编辑权限、停用、启用：锁 Admin Subject/LoginAccount/Profile 和 current grants；总管理员更改允许字段，按差异追加/revoke grant；`UpdateSubAdmin` 的命令/Repository 调用图中没有 Credential 写入；停用必须撤销所有 session；写 AuditEvent。login name immutable。

学生/分管理员本人注销或管理员删除分管理员：身份复验和 hash 可在事务前；事务中按固定顺序锁 Subject、LoginAccount、Profile、对该角色适用的职责/Session/进行中业务 blocker、全部 session/challenge/current grants，确认 blocker 已清除。管理员删除教师时只处理身份与账号相关锁和校验，不查询 Course 责任作为 blocker，不锁定或修改 Course，也不转移 `responsible_teacher_subject_id`。各路径共同写 `user_subject.closed_at` 和不含 PII 的 AuditEvent，物理删除 credential、session、全部相关 challenge、Profile、LoginAccount；SUB current grants 同事务撤销；已有 Course、运动记录、正式媒体、审核、成绩、权限历史和 AuditEvent 的 subject FK 一律不删除。任一步失败整体回滚。

### 7.4 Course、Enrollment 与官方名单

创建 Course：锁 current Semester 和 Teacher，确认身份/状态/时间；插入 Course、初始 TargetRevision、current pointer 和 AuditEvent。

修改 target：锁 Course/current revision，验证两类合计 1,200，插入新 revision、更新 pointer/version、写 AuditEvent。旧 revision 不更新；Statistics 读取新 target。

生成/撤销 Invitation：锁 Course，确认责任教师、Course `OPEN`、Semester `CURRENT`；生成 digest/撤销和 AuditEvent 同事务。

加入：

1. 按 digest 锁 Invitation/Course；
2. 锁 Student 及 current Semester Enrollment；
3. 检查邀请有效、账号/邮箱/身份、无其他 ACTIVE Enrollment；
4. 创建或取得 StudentProfile，插入 ACTIVE Enrollment 和初始 event；
5. 插入 AuditEvent；
6. unique 冲突整体回滚，不产生待审批行。

移出/恢复：锁 Course、Student、Enrollment；验证责任教师与合法转换；追加 EnrollmentEvent、更新 current status/version、插入给学生的站内通知和 AuditEvent。

官方名单导入：

1. transaction 外按文件真实内容确认 XLSX/CSV，验证 `byte_size <= 104857600`、解析后人数 `<= 500`、normalize 字段、计算 checksum，并生成五类 comparison findings；格式/大小/人数/内容任一失败不创建 snapshot；
2. 锁 Course/current members，重新确认 membership version，并重验解析结果的 source format/byte size/entry count；
3. 批量插入 immutable snapshot、entries、findings；
4. 更新 Course current roster pointer/version；
5. 写 AuditEvent；任一步失败整体回滚。

逐项处理只锁 finding/Course 并填写 resolution fields、写 AuditEvent；证据不足保持 unresolved。名单回退锁 Course 和目标 snapshot，只切换 pointer/version 和 AuditEvent。

### 7.5 Session、媒体与 Record 提交

开始 Session：锁 Enrollment/Student，确认 access、`ACTIVE` membership、Semester `CURRENT`、Course `OPEN`、允许时间、按学生类别封顶后的总有效分钟小于 1,200、无进行中 Session；使用数据库 instant 计算上海 business date，插入 Session/首 interval/AuditEvent。

暂停/继续/完成：锁 Session/current open interval，检查 expected version 和合法转换；用数据库时间关闭/打开 interval。完成时汇总全部 ACTIVE interval、写不可变 actual duration 和 AuditEvent；完成后无恢复路径。

媒体：

1. 短事务创建 `ALLOCATED` asset 和受限上传授权；
2. 客户端直传 COS；
3. Backend 通过 COS HEAD/内容探测取得真实 MIME、bytes、checksum、视频时长和音轨；
4. 短事务 CAS 为 `VERIFIED` 或 `REJECTED` 并写 AuditEvent；
5. 只有 VERIFIED asset 可进入 Record/Application 提交。

Record 提交事务：

1. 锁 Enrollment、completed Session 和按 UUID 排序的全部 MediaAsset；
2. 验证归属、尚无 Record、assets purpose/session/owner 正确且未绑定；
3. 权威汇总图片/视频/单文件/总 bytes，验证至少一项；
4. 验证 category、description、business-date uniqueness；
5. 从 Session 复制 actual duration，计算 0/60/120 credited minutes；
6. 插入 immutable Record、初始系统 VALID Review、RecordReviewState；
7. CAS 绑定 MediaAsset、position；
8. 插入 AuditEvent；
9. commit 时 deferred aggregate trigger 再校验。

回滚后 COS 对象仍是未绑定 VERIFIED asset，不能显示 Record 成功；过期 worker 后续清理。

### 7.6 追加 Review

1. 锁 ReviewState、Record、Enrollment、Course；
2. 验证操作者是当前责任教师、expected version；
3. 验证 new result 与 current 不同，学生可见 reason 非空；
4. 插入 next Review，更新 current state；
5. 插入给学生的站内通知与 AuditEvent；
6. 同事务提交。

该事务不更新 Record、Media、Session duration 或 credited minutes。`INVALID` 只让当前统计贡献为 0；恢复 `VALID` 后使用原分档。

### 7.7 耐力规则、真实用时和免测

规则修改：transaction 外构造完整 candidate revision；transaction 内取得 organization/rule-table exclusive lock，确认 expected version，插入全部 interval，执行 deferred 整表校验，切换 current pointer，写 AuditEvent。任何区间错误时整笔回滚。

确认真实用时：

1. 锁 Enrollment/Course/EnduranceOutcome；
2. 确认责任教师且当前不是已批准免测；
3. 从 StudentProfile 快照 gender/grade group/distance，锁对应 RuleTable/current revision；
4. 插入 Measurement；
5. 恰好一个 interval 匹配时插入 Conversion；否则明确保存“换算不可用”而不猜值；
6. current outcome 指向 Measurement；
7. 插入学生站内通知与 AuditEvent。

批准免测见申请事务：ApplicationDecision 与 EnduranceOutcome `EXEMPT` 同事务。批准后不创建 Measurement/Conversion/学时/最终成绩。

### 7.8 申请、补充材料与认证学时

首次申请：

1. application evidence 在事务前上传并 VERIFIED；
2. 锁 Enrollment、全部 assets；
3. 验证 type-specific 数据；`CERTIFICATION` 必须由 Domain factory 接受完整 `CertificationApplicationDetail` 和闭集 `CertificationKind`，`EXEMPTION` 不得携带认证详情；再验证新 assets 数量为 1 至 3、JPEG/PNG/WebP、单张 `byte_size <= 10485760`、owner/purpose/未绑定；deferred trigger 在新 Application 建立后再次保证总数不超过 3；
4. 插入 Application、认证申请的一对一 detail（含原样 `certification_kind`）、初始 Submission，绑定 assets，current status `SUBMITTED`；
5. 写 AuditEvent；失败整体回滚。

补充材料：只允许 `SUPPLEMENT_REQUIRED`；锁 Application、全部历史 evidence 和新 assets，再次确认合计不超过 3，插入 SUPPLEMENT submission、绑定新 assets、current status 改回 `SUBMITTED`、写 AuditEvent。旧证据不变；超出总数或单张大小时整体失败。

教师决定：

1. 锁 Application/current state/Course；
2. 验证责任教师、expected version、状态可处理；`REQUEST_SUPPLEMENT` 还要求当前 evidence 少于 3 张；
3. REQUEST_SUPPLEMENT/REJECT 插入 Decision，更新 status/pointer；
4. EXEMPTION APPROVE 同事务更新 EnduranceOutcome `EXEMPT`；
5. CERTIFICATION APPROVE 同事务插入第一条 CreditRevision/State，验证两类分钟；
6. 插入学生站内通知和 AuditEvent；
7. 同事务提交。

认证调整/撤销：锁 Application/CreditState/Course target；插入 ADJUST 或 REVOKE revision，更新 current state，插入学生通知和 AuditEvent。旧分配不修改；Statistics 随 current state 即时反映。

### 7.9 最终成绩

锁 Enrollment、Course、FinalGradeState，确认责任教师/expected version、`grade_value` 是 PostgreSQL `integer` 可表示的 INT、可选 `remark` 的 `char_length <= 50`；插入 next Publication、更新 current pointer、插入学生通知和 AuditEvent。首次发布与重新发布使用同一事务；不读取进度或耐力跑决定 grade 合法性，也不增加 0–100 校验。

### 7.10 Feedback 与 Help

Feedback 创建：锁 Student，生成 organization-scoped ticket number，插入 `WAITING` Ticket 和 AuditEvent。

Feedback 处理：锁 Ticket，验证有 `FEEDBACK` 权限和 expected version；选择非 WAITING target status，插入非空 public Reply，更新 current status/version，插入学生通知和 AuditEvent。没有“先改状态、后补回复”的两段提交。

Help 保存：锁 Article/current revision，验证权限/expected version/合法转换与内容完整性；插入完整 Revision/keywords，更新 pointer/state/version，写 AuditEvent。published 编辑仍 published 并即时生效；非法状态、缺少双语正文/关键词或并发冲突整体回滚。

### 7.11 系统模式和站内通知

切换系统模式：

1. 取得 organization exclusive advisory xact lock，锁 ModeState；
2. 检查 `SYSTEM_MODE` 权限、expected version、from ≠ to；
3. MAINTENANCE 时验证原因、中英文公告和预计恢复时间；NORMAL 时验证恢复原因；
4. 插入 Transition，更新 ModeState/current pointer/policy version；
5. 为当时受影响的有效用户 bulk insert 站内通知，unique source 防重；
6. 插入 AuditEvent；
7. 同事务提交，成功后客户端重新读取 current mode。

通知列表只读；标记已读事务锁本人 notification 并写 `read_at`，重复标记幂等。任何用户不能修改他人的 read state，也不能通过 notification target 绕过目标业务鉴权。

### 7.12 审计 ZIP

请求事务验证总管理员或 `AUDIT_QUERY` 权限和日期范围，插入 `REQUESTED` Job 与 AuditEvent。Worker 用 PostgreSQL 领取，在 transaction 外汇总并脱敏日志、生成 ZIP、上传 COS，再以短事务 CAS 写成功/失败状态和 AuditEvent。下载时重新验证身份、组织、权限、job 状态和到期；签名 URL 即时返回且不落库。

## 8. 索引方案

| 查询/约束 | 索引 |
|---|---|
| 当前 Email/student number/employee ID | `login_account(organization_id, email_normalized)`、student/teacher profile identifier 各自 unique |
| 分管理员登录账号 | `admin_profile(login_name_normalized) WHERE NOT NULL` unique |
| 当前管理员及权限 | `login_account(organization_id, access_state, subject_id)`；`admin_profile(organization_id, admin_kind, subject_id)`；`admin_permission_grant(admin_subject_id, permission_code) WHERE revoked_at IS NULL` |
| 未撤销登录会话 | `auth_session(subject_id, expires_at, id) WHERE revoked_at IS NULL` |
| 唯一 current Semester | `semester(organization_id) WHERE status='CURRENT'` unique |
| Semester 列表 | `semester(organization_id, status, start_date DESC, id)` |
| 教师 current Courses | `course(organization_id, responsible_teacher_subject_id, semester_id, status, id)` |
| 管理员 current Course 列表 | `course(organization_id, semester_id, status, checkin_opens_at, id)` |
| Invitation lookup | `course_invitation(code_digest)` unique |
| 学生 current Enrollment | ACTIVE partial unique `(organization_id, semester_id, student_subject_id)` |
| 教师成员列表 | `enrollment(course_id, status, joined_at, id)` |
| Roster snapshots | `roster_snapshot(course_id, snapshot_no DESC)` |
| Roster entries/search | `roster_entry(snapshot_id, student_number_normalized, row_no)` |
| 未处理 roster findings | `roster_reconciliation_item(snapshot_id, finding_type, finding_no) WHERE resolved_at IS NULL` |
| 进行中 Session | `exercise_session(student_subject_id) WHERE status IN ('ACTIVE','PAUSED')` unique |
| Session history | `exercise_session(enrollment_id, started_at DESC, id)` |
| 打开 interval | `active_interval(session_id) WHERE closed_at IS NULL` unique |
| 未绑定媒体清理 | `media_asset(status, upload_expires_at, id) WHERE status IN ('ALLOCATED','UPLOADED','VERIFIED')` |
| Session/Application 媒体 | `media_asset(session_id, status, created_at, id)`；`media_asset(application_submission_id, position)` |
| 学生 Record 列表 | `exercise_record(student_subject_id, semester_id, submitted_at DESC, id)` |
| Course Record 队列 | `exercise_record(course_id, submitted_at DESC, id)` |
| Daily Record | `exercise_record(enrollment_id, business_date)` unique |
| Review history | `review(record_id, sequence_no DESC)` |
| 四套 rule table | `endurance_rule_table(organization_id, gender, grade_group, distance_meters)` unique |
| Rule interval match | `endurance_rule_interval(revision_id, lower_seconds, upper_seconds)` + GiST exclusion |
| Student endurance history | `endurance_measurement(enrollment_id, sequence_no DESC)` |
| Teacher application queue | `student_application(course_id, current_status, submitted_at, id)` |
| Student application list | `student_application(student_subject_id, submitted_at DESC, id)` |
| Application history/media | submission/decision/credit `(application_id, sequence_no DESC)`；asset `(application_submission_id, position)` |
| Certification kind | `NO INDEX REQUIRED`；当前 Contract/Use Case 不按 kind 筛选、排序或高频统计，一对一 detail 由 `application_id` PK 定位；未来只有真实查询与 `EXPLAIN (ANALYZE, BUFFERS)` 证明后才评估索引 |
| FinalGrade current/history | `final_grade_state(enrollment_id)` PK；`final_grade_publication(enrollment_id, sequence_no DESC)` |
| Statistics | `exercise_record(enrollment_id, category, credited_minutes, id)`；`record_review_state(current_result, record_id)`；`certification_credit_state(current_state, application_id)` |
| Feedback admin queue | `feedback_ticket(organization_id, current_status, submitted_at DESC, id)` |
| Feedback student list | `feedback_ticket(student_subject_id, submitted_at DESC, id)` |
| Feedback search identifiers | `feedback_ticket(organization_id, ticket_no)` unique；student number/name/email lookup通过 profile indexes |
| Help public list | `help_article_revision(category, sort_weight DESC, created_at DESC, id)` joined by current published pointer |
| Help admin list | `help_article(organization_id, status, updated_at DESC, id)` |
| Help keyword search | normalized keyword B-tree/trigram only after真实查询证明需要 |
| Current system mode | `system_mode_state(organization_id)` PK |
| Mode history | `system_mode_transition(organization_id, sequence_no DESC)` |
| Notification center | `in_app_notification(recipient_subject_id, created_at DESC, id DESC)` |
| Unread count | partial `in_app_notification(recipient_subject_id, created_at DESC, id) WHERE read_at IS NULL` |
| Notification idempotency | `(recipient_subject_id, source_type, source_id, source_event_no, notification_type)` unique |
| Audit default cursor | `audit_event(organization_id, occurred_at DESC, id DESC)` |
| Audit filters | organization + operation/outcome/actor/target + occurred_at DESC + id |
| Audit ZIP worker | partial `audit_archive_job(status, created_at, id) WHERE status IN ('REQUESTED','RUNNING')` |

列表默认使用 keyset cursor，不用大 offset。业务文档已确认 Feedback 每页最多 6 条、Help 学生列表每页最多 5 条、Audit 每页最多 50 条；这些 page limit 进入 Contract，不作为数据库表字段。

不为所有列盲目建索引，不给 `safe_metadata` 建通用 GIN，不建立可写/materialized Statistics。新增索引必须由真实量级和 `EXPLAIN (ANALYZE, BUFFERS)` 证明，避免写放大。

## 9. 删除、保留与 COS 生命周期

| 数据 | 删除/保留策略 |
|---|---|
| Semester | 状态单向归档；无普通删除 |
| Course | `OPEN→CLOSED`；无普通删除/恢复 |
| Enrollment | `ACTIVE↔REMOVED`；event 只追加 |
| Roster | snapshot/entry/finding 保留；回退只换 current pointer |
| Session/interval | 完成后只读；不级联 |
| Record/Review/绑定媒体 | P4-DECISION-04 明确保留；正式历史无普通 UPDATE/DELETE，账号注销不删除 |
| Endurance rule/result | revisions/measurement/conversion 只追加；规则变化不追溯 |
| Application/证据/decision/credit | 只追加；撤销用新 revision |
| FinalGrade | publication 只追加 |
| Feedback | ticket current state 可变，reply 只追加；无删除 |
| Help | article current pointer/state 可变，revision 只追加；无删除 |
| Mode | state 单例可变，transition 只追加 |
| Notification | 正式消息不可改内容；只允许本人一次性设置/保留 read_at；retention 需治理决定 |
| AuditEvent | P4-DECISION-04 明确保留；runtime 永久不可修改/删除，账号注销和目标变化不级联 |
| UserSubject | 不含账号资料的 opaque 历史锚点；账号删除后只保留 ID、organization、role snapshot、created/closed time |
| LoginAccount/Credential/Session/Challenge/Profile | P4-DECISION-04 明确属于注销账号相关数据；成功删除/注销事务物理删除 |
| AuthChallenge | 未绑定账号的到期临时 challenge 可按明确 TTL 清理；已绑定或目标邮箱匹配的 challenge 随账号删除 |
| 未绑定 MediaAsset | 到期 `EXPIRED`，worker 幂等删 COS；确认对象删除后完成清理 |
| Audit ZIP | 到期删 COS 并标 `EXPIRED`；不删除 AuditEvent |

P4-DECISION-04 的“保留”表示运动记录、正式绑定媒体和 AuditEvent 不随账号注销删除，当前也不配置自动删除 lifecycle；以后若因法律或合同要求改变，必须先更新业务权威与迁移方案。“注销账号相关数据删除”要求在线主库在成功事务后不再保留 LoginAccount、Credential、Session、相关 Challenge 或当前 Profile。通知、未绑定上传、Audit ZIP 和备份窗口仍需安全治理给出明确 TTL；备份恢复流程必须重放账号删除事实，不能让已删除账号数据重新变为在线可访问数据。

## 10. 数据库安全与隐私

- 生产 PostgreSQL 只允许私网/TLS；客户端不直连数据库或 COS 管理接口。
- 分离 migration owner、Backend runtime、read-only reporting、audit writer、audit reader 和 maintenance 角色；runtime 无 DDL、superuser、table owner 或 bypass RLS。
- 根表、Notification 和 AuditEvent 启用 organization-scoped RLS；服务仍显式写 organization/ownership predicate。
- Profile、application evidence、feedback 和 notifications 遵守最小披露；管理员只取得业务文档授权的字段。
- 密码使用现代内存困难 hash PHC；每个账号独立 salt。OTP、refresh token、邀请码和 idempotency secret 只存 purpose-scoped digest/HMAC。
- SQL 全参数化；排序、筛选、Audit metadata、notification route/type 全部 allowlist。
- COS object key 服务端生成、不可预测且不含 PII；读写短时最小权限签名，URL 不落库。
- 上传文件不能只信扩展名/MIME header；Backend 对内容进行权威探测、checksum 和 decompression/pixel/duration 安全校验。
- Help Markdown 使用禁止脚本、危险 URL 和 raw HTML 的安全 renderer；所有用户输入文本按目标上下文转义，数据库原文不能直接拼接为 HTML。
- 站内通知只保存完成提示所需的最小内容和安全 target，不复制完整个人资料、证明材料、审计 metadata 或可长期访问的 URL。
- Audit safe metadata 按 operation schema allowlist；未知字段拒绝写，不采用“先记录秘密再查询脱敏”。
- 账号相关数据物理删除与历史引用分离；AuditEvent 不存原始身份快照，业务历史只通过不含 PII 的 `user_subject.id` 关联，不能据此恢复账号。
- 备份启用加密/PITR，定期恢复演练；验证 unique、RLS、immutable trigger、审计不可变性及 COS/DB 引用一致性。

## 11. 时间规则

- 所有 instant 统一 `timestamptz`/UTC；客户端按本地时区展示。
- `date` 是日历语义，不转换成“UTC 午夜”。
- Session `business_date` 固定为 Backend 接受 start 命令时 `started_at` 在 `Asia/Shanghai` 的日期；暂停、跨午夜、断网、完成和延迟提交均不改变。
- Session duration 是非重叠 ACTIVE interval 的 instant 差值总和，PAUSED gap 完全排除。
- Rule/Review/Decision/Grade/Feedback/Help/Mode/Notification/Audit 时间只取服务端/数据库 time。
- 日期范围使用 UTC 半开区间 `[from, next_day_to)`，避免 23:59:59.999999 边界。
- 证书有效期是 `date`；是否在当前日期内有效必须明确使用上海业务日期，不能使用客户端日期。

## 12. 并发、幂等与故障语义

- command unique 处理重复 create；expected version 处理并发 update；append history 同时有 sequence unique。
- current pointer 使用复合 FK 指向同一聚合历史，不能指到其他 Course/Application/Article。
- external I/O 与 PostgreSQL 不能形成单一 ACID transaction。媒体/ZIP 使用状态机、CAS 和幂等 cleanup；COS 成功不等于业务提交成功。
- 通知是同库辅助事实，不是外部 delivery。source unique 防止重试重复；read state 不参与来源业务判定。
- system mode advisory lock 使普通 write 与切换有确定先后；客户端缓存不能绕过服务端 mode gate。
- AuditEvent 写入失败时成功 mutation 回滚；数据库整体不可用时真实失败，不合成审计或业务成功。
- projection/view 失败不能改写 source facts。缓存只能标记陈旧并在恢复后重建。

## 13. 已确认决定与刻意未推测字段

已确认并进入 schema：

1. 正式审计日志属于上线范围；
2. Session 业务日期取开始时的上海日期；
3. 官方名单、耐力跑、免测、认证、最终成绩、反馈、帮助、维护、分管理员、账号注销全部上线；
4. 通知只在站内通知中心，不发送短信、邮件或 Android/iOS 系统 Push；
5. Statistics 同时使用当前 VALID Record 和当前有效认证认可学时；
6. 文件本体全部在 COS，PostgreSQL 只存 metadata；
7. `P4-DECISION-01`：官方名单只接受 XLSX/CSV，单文件最大 100 MB（数据库边界 `104857600` bytes），单次最多 500 人；
8. `P4-DECISION-02`：免测、校队或社团申请材料只接受 JPEG/PNG/WebP，同一申请首次和全部补充合计最多 3 张，单张最大 10 MB（数据库边界 `10485760` bytes）；
9. `P4-DECISION-03`：最终成绩是 PostgreSQL `integer`/Contract `int32`，可选备注最多 50 个字符，不增加 0–100 范围；
10. `P4-DECISION-04`：运动记录、正式媒体和 AuditEvent 保留；账号注销删除 LoginAccount、Credential、Session、相关 Challenge、学校邮箱/登录名和当前 Profile，历史只关联 opaque subject。

以下不是空表或延迟业务，而是仍需在不改变上述决定的前提下完成的产品/安全治理细节，本文不从旧 DTO 猜测：

- notification 文案的最终产品 copy；
- notification、未绑定上传、Audit ZIP 和备份的具体 retention/清除窗口。

这些剩余治理值应在对应能力实现前确定并形成可测试限制；它们不能改变本文已确认的业务状态机和 P4-DECISION-01 至 05，也不能用 Fake Success 临时代替。

## 14. 当前 RC Contract 与实现门禁

当前唯一有效基线 `1.2.0-contract` / `RC` / OpenAPI SHA-256 `667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a` 必须表达：

- AuthSession revoke、分管理员固定权限、账号注销二次验证、学生进行中 Session/分管理员职责 blocker conflict、教师账号删除无 Course 责任 blocker且无 Course mutation、账号相关数据删除结果；
- Semester/Course/Invitation/Enrollment、官方名单 XLSX/CSV、100 MB/500 人限制、import/findings/resolution/revert；
- Session 合法动作和 expected version，不接受客户端正式时间/duration/business date；
- Media allocation/finalization、Record submit、申请证据 JPEG/PNG/WebP、每申请≤3 张、单张≤10 MB、purpose 和 Backend 权威拒绝；
- Review append、current result 和学生可见原因；
- 四套耐力规则 revision/interval、Measurement、可空 Conversion 和 Exempt outcome；
- Application initial/supplement/decision、Certification credit adjust/revoke；`CertificationDetails.certificationKind` required/non-null，闭集为 `SCHOOL_TEAM/STUDENT_CLUB`，并在创建与全部响应中稳定 round-trip；
- FinalGrade `int32` publish/re-publish、可选 remark `maxLength: 50`，值不从 Statistics 推导且无 0–100 限制；
- Statistics 分别返回 Record/Certification 原始分钟、category cap 和展示比例；
- Feedback 五类别/五状态、每次处理必须公开回复、page ≤6；
- Help 双语 revision、三状态、十类别、optimistic conflict、page ≤5；
- SystemMode current/transition/维护公告和 fail-closed；
- In-app Notification list/read、无外部 delivery status；
- Audit list/detail/filter/keyset page ≤50、ZIP request/status/download；
- 稳定 request/command ID 和 constraint/domain error mapping。

Password Contract 还要求：所有系统/他人分配的 Teacher/Admin 初始密码进入 temporary gate；本人改密与 verified-email self reset 清除 gate 并按各自规则撤销 session；`ACTIVE/DISABLED` 由账号 access state 表达；`UpdateSubAdmin` 不承载 password mutation；challenge 保持反枚举。第 4.4、5.2 与 7.3 节已由现有表/列完整承载，因此密码部分为 `CURRENT DESIGN SUFFICIENT`，不需要新表、新列或新的 migration 设计。

`CR-20260901-004` 不改变本节：合法 Student actor 的 Dashboard 继续要求 current Semester；不得增加 nullable current、占位 Semester、Student identity 状态或数据库空态来迁就旧 Android mapper。

进入正式 Backend migration 前必须：

1. 为所有 table、CHECK、FK、partial unique、exclusion、deferred validation、RLS 和 immutable trigger 编写 migration tests；认证详情测试必须覆盖 kind 缺失/null/未知值、CERTIFICATION 缺 detail、EXEMPTION 携带 detail 和两个合法值；
2. 并发测试双入班、双 Session、双每日 Record、重复 Review、并发 rule switch、重复 application decision、grade publish、feedback update、mode switch、notification/audit idempotency；
3. transaction rollback 测试覆盖 Record+Media+Review、申请+证据+decision/credit、Feedback+Reply、Help+Revision、Mode+公告+通知、所有业务+AuditEvent；
4. 权限测试覆盖责任教师 Course ownership、八项 admin permission、maintenance fail-closed、Notification ownership 和 Audit organization isolation；
5. 用真实 PostgreSQL/COS 测试上传、探测、绑定、回滚、过期清理和短时下载；
6. 测试 Teacher/Admin temporary credential gate、本人改密 current-session retained/others revoked/gate=false、self reset all-session revoke/no-login/gate=false、password version mismatch、disabled、logout current/all、challenge anti-enumeration 与 `UpdateSubAdmin` 无 credential mutation；继续测试账号停用撤销全部 session，删除/注销物理删除 LoginAccount/Credential/Session/Challenge/Profile，同时保留 opaque UserSubject、已有 Course、运动记录、正式媒体和 AuditEvent；教师删除测试必须证明不检查 Course 责任 blocker、不修改或转移责任教师；
7. 对 CertificationKind 编写 API Mapper 与 Persistence Mapper 穷尽测试、两个方向的 round-trip 测试以及非法数据库值 fail-closed 测试；任何目标环境出现既有认证行时必须先进入 `DATA_MIGRATION_DECISION_REQUIRED`，不得执行推断回填；
8. 以 seed validation 确认四套规则各 101 行、合计 404 行并能唯一匹配当前覆盖范围；
9. 不引入 Redis、消息队列、短信、邮件、device token 或系统 Push。

## 15. 通过条件映射

| Phase 3 条件 | 设计证据 | 状态 |
|---|---|---|
| 数据库支持所有核心 Use Case | 第 4、5、7 节覆盖完整上线闭集 | `PASS (DESIGN)` |
| 关键规则有数据库约束 | 第 6 节 + 各表 unique/check/FK/trigger | `PASS (DESIGN)` |
| 常用查询有索引方案 | 第 8 节逐项列出 | `PASS (DESIGN)` |
| 状态流转与业务文档一致 | Session、Review、Application、Feedback、Help、Mode 等均按权威状态 | `PASS (DESIGN)` |
| 数据库安全和审计前置 | 第 5.2、5.10、9、10 节 | `PASS (DESIGN)` |
| `CertificationKind` Contract ↔ Domain ↔ Persistence 对齐 | 第 4.2、5.6、6、7.8、8、14 节 | `PASS (DESIGN)` |
| Password Contract 生命周期支撑 | 第 4.4、5.2、7.3、14 节；现有表/列足够 | `PASS (CURRENT DESIGN SUFFICIENT)` |
| 正式 Backend/数据库已实现 | 本 Phase 明确不实施 | `NOT EXECUTED` |
