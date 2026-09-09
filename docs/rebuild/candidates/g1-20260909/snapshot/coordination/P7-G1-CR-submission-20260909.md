# G1 当前候选与 CR 集中提交说明 — 2026-09-09

提交目的：供之前 Phase 的协议负责人按用户16:29转交方案集中决策、修订并发布新Contract。H/Z继续已明确的独立工作；依赖新协议的分支保留待完成。此为协议决策用的阶段候选材料，Z/H均PARTIAL，不是G1验收通过或新的互审轮次。

执行次序：当前候选与CR集中提交 → 协议负责人明确具体方案、补协议并给出统一新版本/SHA → H/Z及Android/Web按所属范围适配和验证受影响部分 → 补齐真实链与联合验证 → Reviewer完成G1验收 → 形成共同Commit后进入后续Phase7/G2。

当前4项失败及历史表示缺口如实随候选提交；它们不会被隐藏，也不要求用旧协议把测试变绿才递交决策材料。历史学生具体决定与落地必须在本轮G1联合验收前完成。原先已接受的Foundation不重新全文审核。

## 固定输入与当前候选

- Z实际HEAD：`f95c3833870fe0da55a297aa28c958ec53e9e935`；未提交候选。H随包manifest声明相同基线，Z仅核对收到的文件和声明，不声称远程H Git状态已复测。
- 冻结Contract：`1.3.0-contract / RC`；canonical LF SHA `5c87eeb9bca39585cea2e3c80c60d58813b4367e1a60b161ed8c7f82af4a19ed`。业务及Contract文件不变；现有方向回复不等于具体schema已获批。
- Z最新Docker结束 `2026-09-09T08:25:29.353Z`：1160项中1156通过、4失败、0跳过；4项均查询参数错误码缺口。Contract1003、Architecture22、Foundation14通过，G1 117/121。65个操作，124项输入SHA与当前字节一致。
- Z包包含Auth/Course、当前学生目录、相关权限/并发/回执修复与13个迁移（0000、1000–1110）；H两张新增表的根Owner登记已补齐，共9张。没有改动扫描逻辑。
- H最新来源为16:12集中包，59项manifest文件核对成功；44PG/HTTP+92原生单测为H原始报告，Z未复跑。H仍PARTIAL，H源码单独保存，未装入Z、未运行两轨联合迁移/服务；计数不相加作联调结果。

## 本次需要协议负责人明确的事项

**一、P7-Z-CR-HISTORICAL-STUDENT-01。** 详细提案及影响盘点随包。请明确具体采用的类型/字段、相邻个人信息策略与版本方案：

- 建议新增 `StudentReference`，必填kind，CURRENT_STUDENT分支携带原StudentSummary；DELETED_STUDENT分支仅携带既有公开opaque studentId。各分支闭合，不能伪造姓名、学号、性别、年级。StudentSummary本身继续用于当前账号场景。
- 已盘点10个直接schema、33个潜在响应operation；建议7个历史出口替换，AssessmentRosterRow保留null并可引用新联合；StudentAccount/StudentDashboard当前本人字段保持原模型。它们的嵌套对象影响仍须回归。
- 同时明确名单来源姓名/学号的展示、不可变历史源保留，以及派生缓存/精确回执中的旧个人资料清理。FeedbackTicket.currentVerifiedEmail既有nullable规则继续适用，注销后必须null，不能遗漏相邻邮箱。
- 确认删除与资料缺失/依赖失败必须区分；新增表示不授予任何命令资格。Backend和两端均按明确版本绑定，不手改生成物或用私有字段绕过。

**二、P7-Z-CR-QUERY-ERRORS-01。** 详细原12项列表、HTTP复现与H静态意见随包。请分别明确原12项和新增第13项listStudentAccounts是否接受补充既有INVALID_REQUEST/HTTP400；第13项没有沿用H的原12项审核结论。

- 仅调整受影响operation的允许错误，保留成功DTO、权限和分页业务语义；不放宽全局Mapper。
- 明确范围/枚举/空字符串的现有约束继续验证。指数表示、重复标量参数等序列化规则单独注明采用方式，不能仅凭integer类型引入额外拒绝要求。
- 教师/分管理员列表当前部分非法请求误用INVALID_CURSOR，接受后同范围修正并补负向验证；不能只把4项现有失败用例变绿。

两个CR各自范围须明确；建议统一发布唯一新版本、canonical SHA、fixtures和生成/验证记录。具体版本由协议负责人决定。本包没有擅自编辑权威OpenAPI，也不代替其接受决定。

## 已确认、不必重复提问的目录安排

正式来源未确认前，可用明确标记的测试目录完成测试环境联调。现有两套合成目录的版本、适用测试学期及覆盖已登记，示例运行配置默认unavailable，实际进程仅development。真实目录验收仍未通过，缺失/不完整不得产生正式发布凭据。学校正式来源/学期/维护人由负责人后续协调。

Course发布需要运动日程和规则/学期绑定；教师SLA需要学校工作日、节假日/调休和版本。二者分开，不能互相替代。详见测试目录登记。

## 新协议返回后的实施和未完成项

Z处理Identity/Course及相关根装配、错误映射和受影响回归；H按其Session/Media/Record所有权适配。Android/Web负责人更新同版本绑定、解码和展示并验证影响范围，不提前开展整个Phase8迁移。正式G1仍需真实权限、注销/Session并发、数据库迁移、材料提交与失败回滚等统一验证。

H仍需活动/前后凭证及未调整窗口权威来源、调整期限与后续材料链、真实存储及故障恢复；不能用assertUnadjusted默认成功代替。Z仍有依赖结算/职责等后续事实的分支；教师/管理员本人邮箱换绑按用户决定待确认。正式目录、真实COS、H完整联调及生产验证未通过，CR批准也不会自动关闭这些事项。

用户此前暂缓联调的安排继续保留。本截图提供整体顺序和协议处理路径，没有给出立即启动联调的新时间安排；当前只整理集中提交材料。GitHub、协议发布、最终验收均由既有负责人操作；本包未发送消息、未commit/push/PR/merge。

## 文件入口

- [历史学生具体CR](P7-Z-CR-historical-student-01.md)及[影响盘点](P7-Z-CR-historical-student-impact.json)
- [查询错误码CR](P7-Z-CR-query-errors-01.md)
- [测试目录登记](P7-Z-test-catalog-register-20260909.md)
- [最新H接收及Z响应](P7-Z-H-consolidated-receipt-20260909-1620.md)
- 包内Z完整代码位于 `new_need_version_sports/`；独立H来源位于 `h-received/`。这是两个候选的并列材料，不能整目录叠加成已验证服务。
