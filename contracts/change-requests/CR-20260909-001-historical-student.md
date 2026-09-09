# P7-Z-CR-HISTORICAL-STUDENT-01：注销历史身份（正式接受记录）

- 决定状态：ACCEPTED；实施及消费者验证状态见新版本交接，不等于 G1 验收。
- Contract Owner / 人类 Reviewer：用户；Codex 实施、自检。用户已在本任务明确同意建议并授权依次完成协议、Android 与 Web 适配。Web 原 Owner 甘洛夷，本次修复由用户侧承担。
- 旧基线：main / f95c3833870fe0da55a297aa28c958ec53e9e935；1.3.0-contract / RC / 5c87eeb9bca39585cea2e3c80c60d58813b4367e1a60b161ed8c7f82af4a19ed。
- 原提案：[PR15 固定原文](https://github.com/chchaiai/new_need_version_sports/blob/d2d361d76b8f2e59623c49a5dbaf83895a4d2608/docs/rebuild/candidates/g1-20260909/snapshot/coordination/P7-Z-CR-historical-student-01.md)。保留原候选/失败证据，不改写同事快照。
- 目标：1.4.0-contract / RC；仓库既有 minor-line 递增，明确 breaking；/api/v1 不变。
- 业务权威：四份 docs/business 正文及本次同步的“P7 注销历史身份补充”。

## 接受的完整边界

StudentSummary 保持当前账号含义。StudentReference 以必填 kind 显式映射两个闭集分支：CURRENT_STUDENT 携带必填 student:StudentSummary；DELETED_STUDENT 仅携带原公开 opaque studentId。后者拒绝所有额外字段及个人资料，不新增删除时间。PENDING 当前学生也使用 CURRENT；成员 ACTIVE/REMOVED 不因账号注销自动变更。

七处出口 Enrollment.student、ExerciseRecord.student、StudentCourseProgress.student、StudentApplication.student、FeedbackTicket.student、SettlementReportRow.student、CourseChangeImpact.affectedStudents[] 改用联合类型。AssessmentRosterRow.student 为联合类型或 null；null 仅表示未解析/未关联。StudentAccount.student、StudentDashboard.student 继续当前资料；学生本人接口的嵌套引用也仅允许当前身份，旧凭据不能进入。

已注销反馈的 currentVerifiedEmail 必须 null。关联已注销主体的名单展示行 rosterName/rosterStudentNumber 必须 null。原 MATCHED_VERIFIED_JOINED 行在当前核对中改为 NOT_REGISTERED_OR_JOINED，不计注册完成；保留确认身份分母、名单行和历史关系，名单外和既有未解决冲突区别保留。冻结报告、成绩、原统计检查点不重算。

原始学校名单、必要业务证据按已有受限权限和保留规则保留；不得用于补回当前资料，本 CR 不授权删除历史业务正文。当前资料副本、缓存、导出、响应快照和回执不得绕过删除。回执先验身份权限，保持原业务结果/版本/分钟等事实，不重执行命令；仅身份展示按当前删除事实脱敏，此例外优先于这些身份字段的“原字节重放”。清除派生当前资料副本，并以权威读取屏障阻止陈旧缓存泄露；恢复时重放删除事实。

确认删除由 Identity 权威提供，数据缺失/依赖故障不冒充删除；同一响应使用一致身份快照。历史身份不授予登录、恢复、运动或其他写权限。

## 影响、迁移及验收

新增3个 schema，8处直接出口；完整响应影响清单由新版本验证生成。角色/资源归属、Endpoint/Method、RequestDTO、上传、时间/分钟规则不变；响应形状和身份重放语义有 breaking change，所有正常 CURRENT 响应亦须适配。

Android 修正原提案路径：仅 BNBU-ANDROID/contract-validation 与 tools/phase6，新版本模型/锁/fixtures/Mapper/Mock 和设备验证；不改 app/openapi 或旧 phase5ga 正式链。Web 更新当前 Phase6 Portal/Student 生成类型、运行校验器、Mapper 和用例，旧生产 API 迁移仍属 Phase8。H/Z 按原模块所有权适配正式 Port/投影/缓存/回执，迁移与真实事务自行验证；我们不编辑其独立候选。

新增正反 Schema、真实生成模型往返、两端类型/Mapper/Mock 检查。H/Z 尚须真实 PostgreSQL/HTTP 注销与历史查询、权限、Session 并发、缓存/回执/导出和故障原子性验证；不能以 Schema PASS 代替。统一新 SHA 发布后消费，不得混接旧结构；回退仅能用仍遵守删除规则的兼容版本，禁止恢复个人资料。

最终字节/证据待用户审查，GitHub 操作归用户；G1 保持 PARTIAL / NOT_TRACK_READY，直至后端联合验收。
