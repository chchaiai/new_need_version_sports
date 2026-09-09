# P7-Z-CR-HISTORICAL-STUDENT-01：注销后历史主体的协议表示

状态：DIRECTION_CONFIRMED / SPECIFIC_PROPOSAL_PENDING；阻止 G1 完整冻结。负责人在 2026-09-09 14:55/14:56 确认采用 CR 处理方向，并要求本轮 G1 候选汇合、联合验收前完成具体决定和落地；本方案尚未批准，Contract 与业务正文未修改。无需新增零碎互审，随下一份完整候选集中处理。

基线 `f95c3833870fe0da55a297aa28c958ec53e9e935`，Contract `1.3.0-contract / RC`，canonical SHA `5c87eeb9bca39585cea2e3c80c60d58813b4367e1a60b161ed8c7f82af4a19ed`。

## 已确定的业务边界和冲突

`docs/business/10-student-flow.md` §5.6 明确注销删除登录账号、凭据、会话、挑战、学校邮箱及当前学生资料中的姓名/学号等；保留必要课程关系、运动记录、媒体、审核、成绩、审计历史，仅关联无登录能力且不含当前账号资料的历史主体。之前提议误写 §5.5，本版纠正。

`StudentSummary` 强制非空姓名/学号、FEMALE/MALE、1–4 年级，不能表示已删除资料的主体。`Enrollment.student` 强制引用它；Course 成员投影调用 Identity.student 时，已注销主体不能再生成合法现有 DTO。不能伪造姓名、学号、性别或年级，不能恢复资料，也不能悄悄丢弃 Enrollment 或把问题当成教师无权读取。

账号删除事务已实现，不代表“注销后所有历史查询可用”已完成。依赖新表示的完整注销与历史查询验收保持 PENDING。

## 提请批准的具体表示

建议保留现有 `StudentSummary` 的含义和字段不变，只供仍有当前学生账号/资料的场景使用。为可能承载历史主体的出口新增显式联合类型 `StudentReference`，以必填 `kind` 作为 discriminator，明确映射到两个互斥 schema：

- `CurrentStudentReference`：仅允许且必填 `kind: CURRENT_STUDENT` 和 `student: StudentSummary`。
- `DeletedStudentReference`：仅允许且必填 `kind: DELETED_STUDENT` 和 `studentId: UUID`。

两个分支均 `additionalProperties: false`。以上是 CR 类型提议，未写入产品或冻结 OpenAPI。CURRENT 表示存在当前账号，不等同 StudentSummary.studentStatus=ACTIVE；PENDING 学生仍使用当前分支。DELETED 不附带姓名、学号、性别、年级、邮箱、删除时间或可恢复资料的字段；显示文案由客户端根据 kind 本地化生成“已注销学生”，不能写回 StudentSummary.name。

建议沿用同一历史主体已公开的 opaque studentId，以保留记录/课程之间的合法关联；不暴露新的数据库内部键，不生成可反查个人资料的凭据。若 Owner 不接受复用原公开 ID，应在本 CR 接受时同时明确映射策略，不能由实现自行新增身份对应表。

建议不改 `Enrollment.status` 等业务枚举。账号是否已注销与成员 ACTIVE/REMOVED、记录状态、进度状态是不同事实；不得强行把注销映射为 REMOVED。历史引用不授予登录、恢复成员、发起运动等命令权，命令继续核验当前身份和既有业务资格。

## 全部 StudentSummary 引用盘点及建议范围

对当前 OpenAPI 静态遍历得到 **10 个直接引用 schema、33 个可通过响应间接到达的 operation**。详细字段路径、operationId、HTTP 路径和响应见 [机器盘点](P7-Z-CR-historical-student-impact.json)。33 是潜在影响范围，不表示全部都会返回注销主体，也不表示这些操作已实现。

建议替换为 StudentReference 的七个直接出口：

- `Enrollment.student`：成员列表、加入/移出/恢复结果，以及 roster finding 引用的 Enrollment。列表保留历史关系；删除账号的命令仍不能因存在历史行而成功。
- `ExerciseRecord.student`：学生自己的记录、教师班级记录及待审队列共享结构；教师历史查询支持 DELETED，注销后的原账号仍无法调用学生接口。
- `StudentCourseProgress.student`：自己的进度、成员进度、班级进度及仪表盘/考核行中的嵌套进度；保留原 checkpoint 与状态。当前学生的场景只能实际产生 CURRENT。
- `StudentApplication.student`：学生/教师申请列表、详情和操作响应；历史申请事实保留，是否还可执行某个决定仍按原业务判定，不由新 DTO 自动开放。
- `FeedbackTicket.student`：学生和管理员反馈列表/详情/处理响应；必须同时处置下述 currentVerifiedEmail，不能只改 student 后残留当前邮箱。
- `SettlementReportRow.student`：不可变结算历史行。原结算 checkpoint 数值及来源不重算；返回时只允许不含当前个人资料的历史身份投影，存储快照也不能保留一份被当作“当前资料缓存”的复制品。
- `CourseChangeImpact.affectedStudents[]`：名称/描述变更影响集合；不能因学生注销而静默缩减历史影响数量，也不从结果重新建立当前账号。

第八个条件出口 `AssessmentRosterRow.student` 建议改为 `StudentReference | null`。保留原 null 表示未解析/未关联，已知历史主体使用 DELETED，不能与 null 混同。该对象的 registrationState 等仍不得新增枚举；现有注册状态能否准确覆盖已注销行须在接受时逐例确认，不能顺便改业务判定。

两项维持当前对象：`StudentAccount.student` 和 `StudentDashboard.student`。它们分别是当前账号管理投影和当前本人仪表盘；不把已注销主体重新列为可登录账号，不为已注销凭据返回仪表盘。仍需回归这些对象内嵌的 progress 新联合类型。

## 同时需要明确的隐私出口

以下问题与本方案一起交由 Owner 决定，不能以“已改 student 字段”宣称注销闭环：

1. `FeedbackTicket.currentVerifiedEmail` 在现有 Contract 已是 `string | null`，并明确注销删除当前邮箱绑定后返回 null。因此不需要新增其 nullable 分支，只须保证新 DELETED 主体与既有 null 规则一致，并增加交叉校验；不能改 student 后继续回放旧邮箱。反馈正文/历史回复中的用户自述信息需按明确的历史保留规则处理，不能凭本 CR 任意删除业务内容。
2. `AssessmentRosterRow.rosterStudentNumber/rosterName` 是名单来源字段，不能用它们给 DELETED 主体补回当前学生资料。建议已关联 DELETED 的展示行两字段为 null，保持未关联名单行的既有语义；原始不可变名单文件及审计保留边界须由 Owner 一并确认，Z 不自行修改原始版本内容。
3. 已生成的结算/申请/记录响应快照、读缓存、导出及命令回执，不能回放旧个人资料来绕过新投影。精确回执和隐私清除的冲突须在协议接受时统一明确；建议对历史身份展示按当前是否已删除投影，事实/版本/分钟等原结果不重算，删除事务清理持有当前资料的派生缓存。
4. 主体类别由 Identity 的权威存续事实提供，历史读不要求已删除的 login_account 存在；但必须区分“确认删除”和“数据缺失/依赖失败”，后者保持不可用，不能一概返回 DELETED。同一请求快照内不混合删除前后状态。

## Backend、Android、Web 影响与版本方案

Backend：接受后由 Identity 增加正式当前/历史主体查询能力，Course/Record/Progress/Application/Feedback/Settlement 等按模块所有权接入。旧 student() 当前资料接口不悄悄扩展返回私有字段；各模块消费正式公开 Port。清查持久化的 StudentSummary 复制品、缓存及回执，迁移方案与数据删除策略先审后做。Z 不修改 H 所有权源码。

Android：`app/openapi/openapi.snapshot.yaml` 与 `contract.properties` 按统一版本/SHA 更新，通过 Gradle 重新生成 build/generated/openapi 模型；不手改生成目录。增加联合类型解码/往返、缺少或未知 kind、DELETED 携带 PII 的拒绝用例；涉及学生记录/申请/进度 Mapper 与 UI 的分支按 Owner 路径修改，保留当前账号场景行为。

Web：Portal 和 Student 两份 phase5b-contract.generated.ts 由现有生成入口更新；共享 fixtures、运行时校验器与 teacher/student Mapper 必须穷举分支，已注销展示不读取 name/studentNumber/gradeYear，仍使用 enrollmentId/recordId 等资源键进行有权限的历史导航。严禁以默认姓名/年级填充旧模型。Phase 5/6 协议绑定回归按实际影响做；不因本 CR 提前启动整个 Phase 8 网络迁移。

这是对历史出口响应形状的破坏性变更，不能在旧版本/SHA 下暗改。具体新版本号由 Contract Owner 决定；建议两个现有 CR 在本轮 G1 集中接受时一起审查、明确各自范围，再统一生成唯一 canonical SHA、更新 release/fixtures、各端快照与验证绑定。运行入口只接受同一新版本；未准备好的客户端不得宣称兼容，回滚不能通过重新输出已删除资料实现。

## 接受后的验收清单

1. 新联合类型的正反 schema 与跨端往返：CURRENT 完整对象、DELETED 仅 opaque ID；拒绝缺 kind、未知 kind、混合分支、DELETED 附带 PII、以 null 假冒明确历史主体。
2. 真实 PostgreSQL + HTTP：学生有 Enrollment、记录、申请、结算历史后注销；确认当前账号/凭据/会话/挑战/资料删除，必要事实及稳定历史关联保留。
3. 所属教师/获授权管理员可读历史投影；其他教师/组织不可读；学生旧 token 不可恢复；不存在主体与依赖故障不被误判为已注销。
4. 10 个直接 schema/33 个潜在响应操作逐个标记“会返回历史/只返回当前/不适用”，不能只验 Enrollment。覆盖分页计数与游标、反馈邮箱、名单展示、结算不可变事实及缓存/回执。
5. 注销与历史查询并发不泄漏删除后资料，不把无法读取当前资料返回成通用 500；真实 Session 阻塞/释放通过 H 集成验证。故障注入证明清理与必要事实保留原子性。
6. Android/Web 渲染“已注销学生”且不产生可登录/恢复入口；生成物、快照、错误分支与版本/SHA 一致。完成后集中审查、联合验证，再关闭 G1 包。

本次只有方向确认、具体提案和静态盘点，没有新协议或新业务实现。仍待 Owner 批准上述字段方案、PII 相邻出口策略和版本，再由相应 Owner 落地。H/Z 其余独立工作继续；不额外发起零碎互审。
