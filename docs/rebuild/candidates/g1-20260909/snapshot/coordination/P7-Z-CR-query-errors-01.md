# P7-Z-CR-QUERY-ERRORS-01：列表查询参数缺少允许的请求校验错误

状态：OPEN / H_STATIC_REVIEW_SUPPORTS_MINIMAL_CHANGE；H 建议接受，尚无 Contract Owner 的具体接受及新版本/SHA。只暂停这个错误响应分支，Z 其他开发继续。用户已转交原提议，本次仅在本地整理复核反馈，未自动发送。未修改 Contract、业务规则或已发送的错误映射公共文件。

## 可复现问题

基线 `f95c3833870fe0da55a297aa28c958ec53e9e935`，Contract `1.3.0-contract / RC`，canonical SHA `5c87eeb9bca39585cea2e3c80c60d58813b4367e1a60b161ed8c7f82af4a19ed`。

真实 HTTP + PostgreSQL 测试发现以下请求应当拒绝为请求参数错误，但当前返回 `500 INTERNAL_ERROR`：

- 已认证教师：`GET /api/v1/teacher/courses?limit=0`（同类明确约束：101、非整数值 2.5，以及不属于课程状态枚举的 status）。
- 所属教师：`GET /api/v1/courses/{courseId}/members?status=INVALID`。
- 已认证学生：`GET /api/v1/student/notifications?read=maybe`。

应用已拒绝这些非法参数；问题发生在 API 错误表示。上述操作声明 HTTP 400 / BadRequest，但其 `x-error-codes` 没有 `INVALID_REQUEST`。`contracts/README.md` 第 83 行明确：每个 operation 的允许错误列在 `x-error-codes`。当前统一 Mapper 因找不到允许错误而保守降为 500。

全局目录中 `INVALID_REQUEST` 表示请求形状、语法或跨字段组合无效；`INVALID_CURSOR` 仅表示 opaque cursor 无效或不再适用。请求没有 cursor 时，不能把非法状态或页大小伪装成 INVALID_CURSOR；也不能通过放宽 Mapper 无声添加允许错误。

## 最小建议，待 Contract Owner 接受

为下列已经注册的 12 个 GET operation 补充允许的 `INVALID_REQUEST`，沿用已存在的 HTTP 400 / BadRequest 和全局错误定义；无新增业务规则、Endpoint、DTO 或自造错误码：

- `listSemesters`
- `listOwnCourses`
- `listCourseMakeupAuthorizations`
- `listOwnMakeupAuthorizations`
- `listCourseInvitations`
- `listCourseMembers`
- `listPublishedRuleTemplates`
- `listSubAdmins`
- `listTeacherAccounts`
- `listOwnStudentNotifications`
- `listOwnNotifications`
- `listSystemModeTransitions`

12 项是对当前注册操作的 Contract 静态盘点；本轮直接 HTTP 复现为前述三组，不把盘点当作其余九项已完成复现。Contract Owner 可一并检查其他操作的路径/查询参数校验声明；范围扩大须单独记录，不在本轮自行修改。

如接受，须按既有 CR 流程修改权威协议、增加版本并生成新 SHA，相关消费者加载同一版本后再验证。具体版本号与接受决定留给 Owner，不由 Z 预定。

## 2026-09-09 H 静态复核与验收范围澄清

H 核对相同 canonical SHA 后，支持仅在上述 12 项 `x-error-codes` 加入既有 `INVALID_REQUEST`；无响应结构、权限、分页和业务语义变更，不扩大全局 Mapper，不自动扩大 operation 范围。H 本次未复现 Z 的 HTTP 500，也未修改文件或启动联调。

H 对测试范围的纠正已采纳：`type: integer` 和数值范围本身不等于必须拒绝指数表示，也没有完整规定重复标量 query 的选择/拒绝策略。最新验收用例已移出 `limit=1e1` 和 `limit=2&limit=3`，仅保留 0、101、2.5、非法状态和 `read=maybe`；原报告仍保留。三组明确违反范围/枚举的用例仍失败，没有借收窄输入将缺口变绿。

当前实现仍有仅十进制数字字符串/单一标量的解析限制，这是已有实现行为，不能标记为冻结 Contract 已批准的要求。本 CR 不新增或批准这些限制；指数写法、重复参数及其他数字序列化形式单独留为 `QUERY_SERIALIZATION_PENDING`，统一确定后再做解析与兼容性回归。

Backend 后续仅修这 12 项错误允许列表的加载/映射和负向测试。Android/Web 需要重新生成或加载相同版本/SHA，并更新相关错误分支；成功 DTO、正常请求不变，不因此启动 Phase 8 正式网络迁移。发布仍须 Owner 接受 CR、提升版本并核验新 SHA；H 的“建议接受”不是发布批准。

## 验证与当前处理

`BNBU-Sports-Backend/tests/integration/g1/g1.test.ts` 中原三个及新增学生目录一项、共四个 `PENDING query-error Contract CR` 用例保留真实 400 / INVALID_REQUEST 期望并持续失败；没有改成期望 500，没有 skip、todo、expected-failure 或放宽断言。完整 Docker 单入口应保留 FAIL，不能用之前的 1125 PASS 替代本轮证据。

首次失败中这些检查混在三个功能用例末尾；已独立为三个明确的待修复用例，以便其余成员筛选、前后分页和通知回执用例完整运行。原失败报告保存在 `evidence/phase7/G1-Z/attempts/`，当前详细结果见 `evidence/phase7/G1-Z/vitest-g1.json` 和 `closeout-verification.json`。

本分支停止依据：根 `AGENTS.md` 的“Contract 不够用 → 提交 Contract Change Request → 修改并提升版本 → 下游重新加载”，以及 `contracts/README.md` 的 operation 级允许错误限制。停止只针对协议未批准的外部错误响应，不影响已明确授权的 Z 功能。

## 2026-09-09 Z 独立收口新增发现：学生目录（单独待接受）

本轮新增当前学生目录 `GET /admin/student-accounts` / `listStudentAccounts` 的真实实现后，同样复现 `limit=0`、`status=DISABLED`、`q=` 返回 500 / INTERNAL_ERROR。该操作明确要求 limit 1–100、status 为 ACTIVE/PENDING、q 最少一个字符，声明 HTTP 400，但 `x-error-codes` 缺少 INVALID_REQUEST。

建议将它作为第13个候选操作单独提交 Owner 决定。它不在 H 已复核的原12项内，不宣称 H 已接受范围扩展，也没有改写冻结 Contract 或全局 Mapper。四个普通测试保留400 / INVALID_REQUEST期望及真实失败；其余正常查询、权限和分页测试独立执行。

补充盘点限制：既有教师/分管理员列表实现对部分非法范围或状态仍返回 INVALID_CURSOR，虽未表现为500，也不能据此宣称其请求校验语义正确。原12项包含这两个操作；统一接受错误码修正后须一并纠正其错误映射，并增加对应负向覆盖，不只是把当前四项失败变绿。指数/重复标量参数规则继续单独待定。
