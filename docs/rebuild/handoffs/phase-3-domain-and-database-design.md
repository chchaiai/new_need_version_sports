# Phase 3 Domain 与数据库设计 handoff

> 日期：2026-08-31
>
> 分支：`API-contract-Making`
>
> 起始 HEAD：`30997a5fbf640eda9586c9a0c3fb031a757ecde8`
>
> 完成状态：`DONE`（设计范围）
>
> 实现状态：`NOT EXECUTED`

## 本阶段结论

已经把四份业务权威和业务负责人本轮补充决定转化为完整上线闭集的数据设计，主产物为：

- [Phase 3 Domain 与数据库设计](../../architecture/phase-3-domain-and-database-design.md)。

本文和架构文档都是设计证据，不表示 Backend、PostgreSQL schema、migration、Contract、客户端、Staging 或 Production 已经完成。

## 本轮确认并同步的业务决定

1. 正式审计日志属于上线范围，不排除在首版之外；
2. Record 每日唯一使用 Session 开始时的上海日期；
3. 官方名单、耐力跑、免测、校队/社团认证、最终成绩、用户反馈、帮助中心、维护模式、分管理员治理、账号注销、站内通知和审计全部必须上线；
4. 这些能力不能用预建空表、占位状态、TODO、Mock、空接口或 Fake Success 代替；
5. 通知渠道只限站内通知中心，不发送短信、邮件或 Android/iOS 系统 Push；
6. 上线 Statistics 同时累计当前 `VALID` Record 和当前有效认证认可学时；
7. `P4-DECISION-01`：官方名单只接受 XLSX/CSV，单文件最大 100 MB，单次最多 500 人；
8. `P4-DECISION-02`：申请材料只接受 JPEG/PNG/WebP，同一申请首次和全部补充合计最多 3 张，单张最大 10 MB；
9. `P4-DECISION-03`：最终成绩使用 INT，可选备注最多 50 字符，不增加 0–100 范围；
10. `P4-DECISION-04`：运动记录、正式媒体和审计日志保留；注销账号相关 LoginAccount、Credential、Session、Challenge、邮箱/登录名和当前 Profile 删除，保留历史只关联 opaque subject。

上述决定已经同步到四份 `docs/business/` 权威，并在 Phase 2 handoff 增加显式覆盖说明。P4 编号只表示下一阶段 Contract 输入，当前仍是 Phase 3；没有恢复自由选班、多有效 Course、增加 60 分钟、Record 重提、教师本人注销或总管理员本人注销等被拒绝能力。

## 修改边界

本轮只修改：

- `docs/architecture/`；
- `docs/business/`；
- `docs/rebuild/STATUS.md`；
- `docs/rebuild/handoffs/`。

没有修改：

- `contracts/`；
- `BNBU-Sports-Backend/`；
- `BNBU-ANDROID/`；
- `frontend/`；
- `portal-teacher-admin/`；
- infrastructure、migration、seed、测试代码或部署配置。

## Domain 与数据库覆盖

| 范围 | 主要 Domain/表 |
|---|---|
| 身份与安全 | 不含 PII 的 UserSubject、可物理删除的 LoginAccount/Profile/PasswordCredential/AuthChallenge/AuthSession、DeleteAccount command |
| 管理员治理 | AdminPermissionGrant，固定八项权限，SUPER/SUB 边界 |
| 学期与教学 | Semester、SemesterTransition、Course、TargetRevision、Invitation、Enrollment、EnrollmentEvent |
| 官方名单 | RosterSnapshot、RosterEntry、RosterReconciliationItem、Course current roster pointer |
| 运动与凭证 | ExerciseSession、ActiveInterval、MediaAsset、ExerciseRecord、Review、RecordReviewState |
| 耐力跑 | EnduranceRuleTable/Revision/Interval、Measurement、Conversion、OutcomeState |
| 申请与认证 | StudentApplication、ApplicationSubmission/Decision、CertificationCreditRevision/State |
| 成绩与统计 | FinalGradePublication/State、Statistics read model |
| 学生服务 | FeedbackTicket/Reply、HelpArticle/Revision/Keyword |
| 系统治理 | SystemModeState/Transition、InAppNotification、AuditEvent、AuditArchiveJob |

## 关键约束

- 学号、工号、学校邮箱、分管理员 login、邀请码均有数据库唯一约束；
- 同一学生不能重复加入同一 Course；
- 同一学生同一学期最多一个 `ACTIVE` Enrollment；
- 同一学生最多一条 `ACTIVE/PAUSED` Session；
- 一条 Session 最多一个 Record；
- 同 Enrollment、同 Session 开始所属上海日期最多一条 Record；
- Record 正式时长和 0/60/120 credited minutes 分列并用 CHECK 验证映射；
- Record 媒体数量、类型、单文件和总大小由 CHECK/partial unique/deferred aggregate trigger 保护；
- 官方名单格式、100 MB 和 500 人上限由 snapshot CHECK 与事务前后双重校验保护；
- 免测/认证申请只接受 JPEG/PNG/WebP，单张 ≤10 MB，同一申请跨首次/补充累计 ≤3 张；
- Review command/sequence 唯一，允许合法 `VALID↔INVALID` 纠正但阻止重复审核；
- 耐力规则固定四个组合，revision 区间必须连续、无 gap/overlap、分数和等级一致；
- 实测与免测当前结果互斥；
- FinalGrade 使用 PostgreSQL integer，可选 remark 的 `char_length ≤ 50`，不增加 0–100 CHECK；
- Feedback 状态更新必须和一条公开回复同事务；
- Help 发布必须有双语正文和至少一个关键词；
- 通知按 recipient/source/event/type 唯一；
- AuditEvent 运行时不可 UPDATE/DELETE/TRUNCATE。

## 关键事务

必须原子提交的组合包括：

- Semester current 切换 + transition + AuditEvent；
- 分管理员 UserSubject/LoginAccount/Profile/Credential/首批权限 + AuditEvent；
- 账号删除/注销写 opaque Subject 终止时间 + safe AuditEvent，并物理删除 LoginAccount/Credential/Session/Challenge/Profile；保留运动记录/正式媒体/审计；
- Course + 首个 TargetRevision/current pointer + AuditEvent；
- Enrollment current state + EnrollmentEvent + 站内通知 + AuditEvent；
- 经 XLSX/CSV、100 MB、500 人校验的 Roster snapshot/entries/findings + Course pointer + AuditEvent；
- Record + 初始 VALID Review/current state + MediaAsset binding + AuditEvent；
- Review append/current state + 学生站内通知 + AuditEvent；
- Rule 完整 revision + current pointer + AuditEvent；
- Application + 最多 3 张 JPEG/PNG/WebP evidence binding + AuditEvent；
- ApplicationDecision + EnduranceOutcome 或 CertificationCredit + 通知 + AuditEvent；
- INT FinalGrade + 最多 50 字 remark Publication/current pointer + 通知 + AuditEvent；
- Feedback status + Reply + 通知 + AuditEvent；
- Help Revision/keywords/current pointer/state + AuditEvent；
- SystemMode transition + 双语公告 + current state + 站内通知 + AuditEvent。

COS 上传、文件探测、密码 hash、名单解析和 ZIP 生成不放在长数据库事务；使用短事务状态机和幂等 CAS 衔接。

## 文件、时间与通知

- 图片/视频本体在 COS；PostgreSQL 保存 object key、purpose、MIME、bytes、SHA-256、内容探测结果、状态、owner 和业务绑定；
- 官方名单源文件只作导入输入，解析成功后丢弃 bytes；PostgreSQL 保存 structured snapshot、XLSX/CSV 格式、100 MB 内的 byte size、checksum 和 ≤500 的人数；
- 申请图片本体在 COS；同一申请首次与补充总计 ≤3 张，单张 ≤10 MB；
- 审计 ZIP 本体也在 COS，只保存 metadata；签名 URL 不落库；
- PostgreSQL instant 统一 `timestamptz`/UTC，客户端本地展示；
- `business_date` 在 Backend 接受 Session start 时按 `Asia/Shanghai` 固化；
- 站内通知只有消息事实和本人 `read_at`，没有 delivery/push 状态、device token、外部渠道、Redis 或 MQ。

## 安全与审计

- organization-scoped RLS 和显式 organization predicate 双层隔离；
- migration owner、runtime、audit writer/reader 等数据库角色分离；
- password/OTP/refresh/invitation/idempotency secret 不存原文；
- 文件 object key 不含 PII，访问 URL 短时且最小权限；
- 账号删除/注销物理删除当前账号相关数据；不含 PII 的 UserSubject 和运动记录、正式媒体、审计历史不级联；
- 成功业务 mutation 与 AuditEvent 同事务，审计写失败则业务回滚；
- Audit metadata 只允许 action-specific 安全字段，禁止 credential、完整 PII、媒体、COS key 和签名 URL。

## 验证结果

| 验证 | 真实结果 |
|---|---|
| `git diff --check` | PASS |
| 严格 UTF-8 解码 | PASS |
| 本轮 Markdown 相对链接 | PASS |
| Markdown fence 与关键章节 | PASS |
| 旧排除规则残留扫描 | PASS |
| 上海业务日期一致性 | PASS |
| `VALID` Record + 当前认证认可学时一致性 | PASS |
| 仅站内通知/无外部 Push 一致性 | PASS |
| 正式审计上线一致性 | PASS |
| P4-DECISION-01 至 04 跨文档一致性 | PASS |

## 未执行

- Backend、PostgreSQL migration/schema/seed：NOT EXECUTED；
- Contract DTO/OpenAPI/version bump：NOT EXECUTED；
- 单元/集成/并发/RLS/migration test：NOT EXECUTED；
- 真实 COS、登录、浏览器、Android、跨端 E2E：NOT EXECUTED；
- Staging、Production、部署、发布：NOT EXECUTED；
- Git push/PR/tag：NOT EXECUTED；本轮只执行用户明确授权的精确路径本地 Git 存档，不进行远端或发布操作。

## 规则与遗留现状

- 业务规则：已修改并同步当前权威；
- Contract：未修改；
- 旧 API：仍存在，本轮没有迁移或删除；
- Mock/Fake：现有开发态 Mock 不构成业务权威，本轮没有新增 Fake Success；
- TODO/空接口：本轮没有新增 Backend TODO、空接口或空成功响应；
- 数据库：只完成设计，没有创建正式实现。

## Phase 4 前置条件

1. 从当前业务权威和 Phase 3 设计生成 Contract，禁止从旧 DTO/API 猜测。
2. Contract 原样编码已确认的名单 XLSX/CSV + 100 MB/500 人、申请 JPEG/PNG/WebP + 每申请 3 张/单张 10 MB、FinalGrade int32 + remark maxLength 50 和账号删除/历史保留语义。
3. Contract 覆盖全部状态、command id、expected version、稳定错误、keyset cursor 和 COS allocation/finalization。
4. 提升 Contract 版本并让所有下游重新加载。
5. Contract 缺口必须提交 Change Request；不得先实现数据库占位状态、空成功接口或 Fake Success。
