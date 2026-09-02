# Contract 查询与 Phase 3 数据设计支持审计

本文件只判断 [Phase 3 Domain 与数据库设计](../docs/architecture/phase-3-domain-and-database-design.md)是否能支持当前 Contract 的查询和事务语义；它不是 migration、PostgreSQL、Backend 或性能实测证据。

| Contract 能力族 | Phase 3 设计支撑 | 结论 |
|---|---|---|
| 当前账号、角色、固定权限、session/challenge、账号相关数据删除 | `user_subject` 与当前 LoginAccount/Profile 分离；student profile 与 ACTIVE Enrollment 可稳定投影 ACTIVE/PENDING 本人资料；`password_credential.must_change/password_version`、`login_account.access_state`、session revoke 与 challenge digest 支持 Teacher/Admin 临时 gate、本人改密、自助 reset 和 disabled 检查；历史事实引用 opaque subject；permission grant 只追加/撤销 | DESIGN-SUPPORTED；Backend 仍须证明 gate set/clear、ACTIVE 检查、session revoke、anti-enumeration 与 safe audit 在正确事务边界实现 |
| 学期与切换 | `semester` 最多一个 CURRENT、允许初始 0 个、`semester_transition` 只追加、command unique、状态/日期索引可支持 current 空态与全局状态摘要 | DESIGN-SUPPORTED |
| Course、目标 revision、邀请、Enrollment | Course/current target pointer、target revision、邀请 digest/display suffix/status/expiry/version、`create_command_id`、同学期 ACTIVE Enrollment partial unique、responsible teacher 索引 | DESIGN-SUPPORTED；可按责任教师恢复邀请管理 metadata，Contract 不建立责任教师变更 Use Case；原始邀请码不落库，精确幂等重放须以 purpose-scoped keyed derivation 等安全方式重现 |
| 管理员当前课程汇总 | Course/Enrollment/Record/current review/certification state 及学生级封顶统计 view；课程、责任教师、状态索引 | DESIGN-SUPPORTED；只代表查询可构造 |
| 名单 | snapshot/entry/reconciliation item、500 行和 100 MiB 约束、current snapshot pointer、一次性 resolution | DESIGN-SUPPORTED |
| Session | `ACTIVE/PAUSED/COMPLETED`、active intervals、进行中 partial unique、数据库时钟与上海 business date | DESIGN-SUPPORTED |
| Record、媒体与 Review | purpose-aware media metadata、allocation expiry/state/version、Session/Record 唯一、每日唯一、媒体 aggregate trigger、append-only Review/current state | DESIGN-SUPPORTED；直传 HTTP method 是签名协议而非数据库字段，finalization 的唯一终态通道无需 schema 变更 |
| 学时统计 | `student_course_progress_v`、`course_progress_summary_v` 及 Record/current review/current certification indexes | DESIGN-SUPPORTED |
| 耐力跑 | 四套 table unique、versioned intervals、无重叠保护、measurement 与可空 conversion、current outcome state | DESIGN-SUPPORTED |
| 免测/认证 | application/submission/decision/credit revision、证据绑定、每申请 aggregate 限制、current state pointer；但 `certification_application_detail` 当前只有组织/校队/社团名称和有效期，没有 `CertificationKind` | **CONTRACT ↔ DOMAIN/DATABASE ALIGNMENT REQUIRED**；Domain 必须新增闭集分类，持久化必须增加 non-null closed-set 约束或等价设计，创建/查询/mapper 必须原样 round-trip，禁止根据名称推断 |
| FinalGrade | append-only publication、current state、signed PostgreSQL integer、remark 长度约束 | DESIGN-SUPPORTED |
| Feedback、Help | ticket/reply、article/revision/keyword、current pointer、按组织/状态的队列与管理列表索引可支持全局状态摘要 | DESIGN-SUPPORTED |
| Mode、通知、审计 ZIP | organization mode singleton/transition、in-app notification 去重/read index、append-only audit、archive job | DESIGN-SUPPORTED |
| Cursor pagination | Phase 3 为 Semester、Course、Roster、Session、Record、Application、Feedback、Help、Notification、Audit 等列表定义稳定复合索引 | DESIGN-SUPPORTED；真实查询计划未测试 |
| 幂等与并发 | command unique、state/current pointer version、锁顺序与事务边界设计 | DESIGN-SUPPORTED；并发行为未实现/未测试 |

结论：除新接受的 `CertificationKind` 外，当前已定义 operation 的查询形状和事务前置在 Phase 3 设计中有对应数据关系、约束或索引；真实数据库支持仍为 `NOT EXECUTED`。`CertificationKind` 已进入公共 Contract，但 Phase 3 Domain/Database 尚未对齐，因此 Backend 初始化/数据库实现前必须先完成独立 alignment；不得删除 Contract 字段、将其改为 nullable，或从名称自动回填。账号删除后保留 opaque `user_subject`，Course 继续引用该主体即可保持关系与历史；Contract 不利用 `responsible_teacher_subject_id` 补造责任交接 mutation。Phase 3 文本中旧的“教师删除前交接”叙述已被 `P4-DECISION-05` 撤销，后续 Backend 不得恢复该 blocker。
