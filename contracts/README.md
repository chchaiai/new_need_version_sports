# BNBU Sports API Contract

本目录是 Android、Web 与 Backend 唯一共同遵守的 API 边界。公开基路径固定为 `/api/v1`，仓库 Contract 版本为 `1.2.0-contract`。

当前状态：`RC`。已确认 Use Case、公共规范、角色权限、错误、上传与幂等边界可用于 Mock 和 Backend 实现；尚未达到 `APPROVED`，不得据此声称已允许进入 Staging。

## 权威与产物

- 可消费的唯一协议：[openapi.yaml](openapi.yaml)。
- 确定性编写源：`src/*.py`；不得手改生成的 OpenAPI、operation catalog 或 metadata。
- 全量 Method/Path/operationId/角色/权限索引：[operation-catalog.md](operation-catalog.md)。
- Use Case 覆盖与阻塞项：[coverage.md](coverage.md)。
- 数据库设计支持审计：[database-support.md](database-support.md)。
- 生成摘要与 OpenAPI SHA-256：[contract-metadata.json](contract-metadata.json)。
- RC 后变更流程：[change-requests/README.md](change-requests/README.md)。

业务规则仍只来自：

- [总业务流程](../docs/business/00-overview.md)
- [学生端业务流程](../docs/business/10-student-flow.md)
- [教师端业务流程](../docs/business/20-teacher-flow.md)
- [管理员端业务流程](../docs/business/30-admin-flow.md)

旧 API、客户端 DTO、Mock、数据库字段名和 ORM Entity 都不是 Contract 的业务权威。

## Phase 5C RC consolidation

`1.1.0-contract` 合并并接受 `CR-20260831-001` 至 `CR-20260831-012`。本 RC 明确 Session/当前学期空态、媒体 finalization 和邀请预览的唯一通道，提供稳定学生本人投影、直传 `PUT` method、教师邀请管理读取、四类管理员全局摘要，并修正创建课程的 current-semester error/status 语义。

Android/Web 的 Legacy Migration Findings 没有进入 Contract；旧 Endpoint、旧 DTO、旧字段和旧语义仍只作为 Phase 7 客户端迁移清单。

## Phase 5C.2 RC consolidation

`1.2.0-contract` 在 `1.1.0-contract` RC 上只落实两个正式 `ACCEPTED` CR：

- `CR-20260901-002`：Teacher/Admin 临时初始密码使用统一首次改密 gate；40 条经评审的 Admin 正常业务 operation 增加 `FIRST_PASSWORD_CHANGE_REQUIRED`；本人改密与自助 reset 明确 ACTIVE/disabled、gate clear 和 session 语义；`UpdateSubAdminRequest` 删除两个代设密码字段。
- `CR-20260901-003`：新增闭集 `CertificationKind = SCHOOL_TEAM | STUDENT_CLUB`，并把 required/non-null `certificationKind` 加入共享 `CertificationDetails`，保证创建与响应 round-trip。

本轮包含 required request/response 字段新增、required nullable request 字段删除及新增可观察失败分支，属于 breaking Contract change。仓库 RC 治理要求外部行为变化提升 Contract 版本；上一轮同类 consolidation 使用 `1.0.0-contract → 1.1.0-contract`，本轮沿用该既有 minor-line 递增方式提升到 `1.2.0-contract`，状态保持 `RC`。

`CR-20260901-004` 为 `REJECTED / NOT_CONTRACT_DEFECT`，没有进入本版本：`StudentDashboard.currentSemester` 仍 required/non-null，`getStudentDashboard` 不增加 no-current 404，standalone `getCurrentSemester` 仍使用 `404 RESOURCE_NOT_FOUND`。

`CertificationKind` 的 Phase 3 Domain/Database alignment 尚未实施；Backend 初始化前必须补充 Domain 闭集值和数据库非空闭集持久化约束，不得根据组织名称推断。该设计前置不回退已接受的公共 Contract 字段。

## 状态门禁

| 状态 | 含义 | 允许事项 |
|---|---|---|
| `DRAFT` | 仍在设计 | 评审、结构 lint、修正已确认规则 |
| `RC` | 已无 PENDING，候选协议稳定 | Mock 与 Backend 实现 |
| `APPROVED` | 已通过要求的验收 | 进入 Staging |
| `LOCKED` | 生产发布基线 | 仅按正式 Change Request 演进 |

进入 `RC` 后，任何字段、状态、错误、权限、路径、状态码或语义变化都必须先建立 Change Request、评估 Android/Web/Backend 影响并提升 Contract 版本。不能把“只改描述”当作绕过流程的理由；描述同样可能改变外部行为。

## 公共通信规则

### DTO 与错误

RequestDTO 和 ResponseDTO 只表达 API 边界，不复制数据库表。对象默认拒绝未声明字段；响应属性默认必需。只有 schema 明确允许时才接受或返回 `null`：必需但暂无值的 nullable 响应字段必须显式返回 `null`，数组必须返回空数组而不是 `null`。请求中的省略和显式 `null` 语义不同。

全部错误使用同一结构，客户端只按 `code` 分支：

```json
{
  "code": "COURSE_ALREADY_JOINED",
  "message": "你已经加入该课程",
  "requestId": "req_xxx",
  "details": null
}
```

稳定错误码、HTTP 状态和说明集中在 `x-error-catalog`；每个 operation 的允许错误列在 `x-error-codes`。Controller 不得散落自造字符串，Domain/Application 错误必须经 API Mapper 转换。

### 认证、权限与系统模式

- 受保护 operation 使用 `Authorization: Bearer <access-token>`；refresh credential 只允许进入刷新请求体，禁止出现在 URL。
- 每个 operation 都声明 `x-roles`、`x-admin-permissions`、`x-resource-scope` 和 `x-system-mode`。
- 分管理员业务权限固定为八项；`SUPER_ADMIN_ONLY` 能力不下放。
- `NORMAL_REQUIRED` 在模式缺失、未知或非 `NORMAL` 时 fail closed；只有显式标记 `ALLOWED_DURING_MAINTENANCE` 的认证恢复、模式查询/切换等能力可继续。

### 幂等与并发

- 业务命令默认要求 UUID `Idempotency-Key`；同已认证 actor（匿名命令使用规范化业务主体）、operationId、规范化资源标识、key 和规范化命令的重试返回原已提交结果。
- 同一 scope 的 key 携带不同命令返回 `IDEMPOTENCY_KEY_REUSED`。
- 天然幂等命令在 operation 上单独说明；只读 operation 不要求 key。
- 创建课程邀请是含敏感结果的幂等命令：原始邀请码只在首次成功响应及其完全相同的幂等重放中返回，不进入后续查询、日志或审计，也不得持久化原始值；Backend 必须在只保存 digest/HMAC 的前提下重现同一已提交响应。
- 可并发修改的聚合使用 RequestDTO 的 `expectedVersion`；过期版本返回 `VERSION_CONFLICT` / HTTP 412。

### 分页、时间与上传

- 列表使用不透明 keyset cursor；cursor 与 operation 和规范化筛选条件绑定，客户端不得解析。页大小上限由各 operation 声明。
- instant 为带显式 `Z` 的 RFC 3339 UTC；`date` 为 `YYYY-MM-DD`。运动业务日期由 Backend 在 Session 开始时按 `Asia/Shanghai` 固定。
- 上传采用 allocation → 短期直传 → finalize/权威探测 → 绑定正式事实。内部 object key、长期公开 URL 和客户端声明都不是正式事实。
- 三类上传的格式、数量、单文件大小、总大小、视频时长/音轨和名单行数集中在 `x-upload-policies`，对应 RequestDTO 同时表达可静态约束的部分。

## Contract 与 Backend 内部分层

```text
OpenAPI / Contract DTO
→ API / Contract Adapter
→ Application Use Case
→ Domain
→ Persistence Mapper
→ ORM Entity / Database Row
```

`operationId` 表达明确 Use Case 语义。生成 DTO 只能进入 `api` 或专门的 Contract Adapter，不得直接进入 Domain；OpenAPI 不生成 ORM Entity。Domain 可以拥有不对外暴露的内部状态和规则，但对外状态必须可映射到已确认的 Domain 状态机。不得为了少写 Mapper 强迫数据库列、Contract 字段和 Domain 属性同名。

## 构建与验证

```powershell
python -m pip install -r contracts/requirements.txt
python contracts/scripts/build_contract.py
python contracts/scripts/verify_contract.py
npx --yes @redocly/cli@latest lint contracts/openapi.yaml --config contracts/redocly.yaml
python contracts/scripts/check_rc_readiness.py
```

生成、结构验证、Redocly lint 和 RC readiness 当前都必须通过。任一失败都表示下游不能重新生成或加载本版本。
