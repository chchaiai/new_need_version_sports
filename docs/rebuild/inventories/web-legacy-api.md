# Phase 1B：Web 旧 API 审计

> 审计日期：2026-08-31（Asia/Shanghai）
>
> Git 基线：`API-contract-Making` @ `ae257360aee7c74cd4be040560fd15909b927cea`
>
> 原审计范围：`BNBU-Sports-Web-new/` 全部只读；2026-08-31 获得 Web 精确路径和治理文档写入授权后，已回填处置结果
>
> 业务权威：`docs/business/00-overview.md`、`10-student-flow.md`、`20-teacher-flow.md`、`30-admin-flow.md`
>
> 判定边界：本文记录审计基线与已授权处置结果；不把旧 Endpoint、DTO、Mock、错误码或 OpenAPI snapshot 提升为新 Contract。

## 结论摘要

| 检查项 | 结论 |
|---|---|
| 当前 Web 代码边界 | 2 个当前源项目、3 个角色界面：静态学生端 `frontend/student/`；共享教师/管理员 Portal `portal-teacher-admin/` |
| Axios / Fetch | 未发现 Axios、XHR、SWR、Apollo、GraphQL、RTK Query、TanStack Query、Zustand 或 Redux 请求依赖；产品网络栈为原生 `fetch` |
| API Client | 学生端集中于 `frontend/student/js/api.js`；Portal 集中于 `portal-teacher-admin/app/api-client.ts` |
| 请求 Hooks / 状态管理请求 | 没有 React Query；Portal 页面普遍在 `useEffect` / event handler 中直接调用 service，`AdminStore` 负责健康检查或 demo state；`useStudentProfile` 是未接入真实 loader 的通用缓存 Hook |
| Request / Response Type | 学生端为无类型 plain object/raw JSON；Portal 有手写认证类型、`teacher-api-types.ts` 别名和页面直接使用的 generated Contract projection |
| generated SDK | `openapi.generated.ts` 是 8,580 行的类型文件，不是可调用 SDK；绑定旧 snapshot `3.0.0-web-snapshot`，133 operations / 313 schemas |
| 页面直接调用 HTTP | 未发现产品页面直接拼接 Backend URL；但学生页面直接调用 `api.js`，Portal 根组件直接调用 `api-client.ts`，仍绕过 `ViewModel → Use Case → Repository → API Adapter` |
| 页面直接使用 Contract DTO | 存在。管理员规则、反馈、帮助和审计页面直接持有 Contract-derived projection；教师工作区直接持有 `Semester` Contract type；学生页面无 TS 类型但直接读取 raw response 字段 |
| 旧 Mock | 学生运行时 synthetic workspace、关联 Fake Success 与 `TEST_ONLY` 邀请 fixture 均已删除；Portal `?mock=teacher/admin`、admin/teacher/roster fixture 仍为 development-only，UI 结构与正式模式共用 |
| 测试/调试/开发入口 | 审计基线共登记 60 项：`PRODUCT` 2、`DEV_ONLY` 34、`TEST_ONLY` 7、`UNKNOWN` 17；17 项现已全部按人工决定删除或 QA 隔离，当前该批 `UNKNOWN=0` |
| 未使用旧 Client | 已删除已决策的 student detail/discard、teacher create/attempt-context、Portal staff self-deletion、admin course/score-rule 等无调用边界；仅保留明确 `TEST_ONLY` client 与冻结 generated 声明 |
| Android 与 Web 语义冲突 | `add-sixty-minutes`、`resubmissions`、学生 local review 的运行时冲突已通过删除解决；免测上传 route 冲突仍交新 Contract |
| 业务规则冲突 | 已删除学生增加 60 分钟、记录重提、免登录 Fake Success 与管理员旧 score-rule 审批调用；正式管理员耐力规则写链仍因 Contract 不足返回 `BACKEND_REQUIRED`，不得标记为已实现 |

`UNKNOWN` 不用旧实现自行补齐。凡是新 Contract 尚未确定的 route、字段、状态、分页、错误码和聚合方式，后续都必须走 Contract Phase。

## 已授权处置回填

- 学生免登录 review、review banner、synthetic workspace，以及运动、规则试算、申请、邮箱、注销、帮助/反馈、通知等关联 non-API/Fake Success 分支均已删除；学生正式登录和正式 API UI 保持同一套界面。
- `?sysmode=normal|maintenance|planned` 仅在公开运行配置 `APP_ENV=qa` 时解析；production、local、test、staging 均忽略 override 并继续遵循正常 SystemMode 链路。Web Test Tools runtime 与能力探测已删除。
- 已删除 Web `add-sixty-minutes`、record `resubmissions` / `attempt-context` 的 Client、页面、DTO sidecar 和相关运行文案；冻结 OpenAPI snapshot/generated types 仍声明这些 operations，但没有 Web 运行时调用者。
- 已删除 student correction-request 本地写成功、启动 demo-session 探测与 demo 登录 Client/preview route。
- 已删除无 UI 调用者的 admin demo service，以及已决策的 admin course、旧 score-rule 审批和 teacher/staff self account-deletion Client；Portal 管理员 demo/正式模式现在共用同一套耐力规则 UI，正式写入因 Contract 缺口继续 fail closed。
- 已删除 `npm run api`、`npm run mock-api`、`npm run demo:setup`、`test:api` 等旧运行脚本，以及 Web 内嵌 `backend/`、setup helper、旧 quality smoke 和不可执行 handoff patch；历史内容只从 Git 历史查阅。
- 当前真实 Backend `BNBU-Sports-Backend/`、Android、`contracts/` 与四份业务权威文档均未修改。

## 审计方法与覆盖面

已覆盖以下文件类型和调用链：

- 当前产品源码：学生 `js/`，Portal `app/`、`worker/`；
- 网络基础设施：两套 API Client、preview proxy、Vite proxy、Docker healthcheck；
- Contract 绑定：snapshot、descriptor、generated types、生成/校验脚本和测试；
- 状态与请求入口：学生 app singleton/localStorage、React `useEffect` / handlers、AdminStore、自定义 Hook；
- Mock：student review fixture、Portal demo/admin/roster fixture、旧 Mock API、测试夹具；
- 非产品请求：demo setup、handoff helper、quality smoke、Backend tests；
- 页面到 Endpoint 的静态调用追踪，以及无产品调用者的 exported client method。

排除目录只有依赖/构建产物：`node_modules/`、`.vinext/`、`dist/`、`coverage/`。`handoff/`、`backend/`、`database/` 没有从扫描中删除，而是单独标为非当前浏览器运行链。

## 网络基础设施盘点

| 层 | 文件 | 当前事实 | 旧 Contract 耦合 / 后续处置 |
|---|---|---|---|
| 学生 HTTP Client | `frontend/student/js/api.js:30,66,678-808` | 同源固定 `/api/v1`；原生 `fetch`；手写 envelope、401 refresh、幂等键、token localStorage、错误映射和分页 | 保留通用 HTTP 能力；替换旧 route/envelope/error/DTO；不得让 UI 直接消费 transport |
| Portal HTTP Client | `portal-teacher-admin/app/api-client.ts:10-15,828-1053` | 同源固定 `/api/v1`；原生 `fetch`；手写认证恢复、refresh、幂等键、FormData、错误映射 | 同上；当前 `portal-app.tsx` 仍直接调用此 HTTP Client |
| 学生 preview proxy | `frontend/preview-server.cjs:5-11,116-123` | `/api/*` 转发 `API_HOST:API_PORT`；`/minio/*` 转发对象存储；默认 `127.0.0.1:3000/9000` | 本地基础设施，不是新部署 Contract；`MINIO_PUBLIC_AUTHORITY` 仍绑定旧签名 URL 适配方式 |
| Portal dev proxy | `portal-teacher-admin/vite.config.ts:52-57` | `/api/v1` 转发 `BNBU_LOCAL_BACKEND_ORIGIN`，默认 `http://127.0.0.1:3000` | 仅开发代理；生产 API origin/route 必须由新架构明确 |
| 对象上传 | 两套 Client | 先从 API 获取 `uploadUrl/uploadMethod/requiredHeaders`，再原生 `fetch` PUT，最后 confirm/poll/bind | 动态 URL 不是硬编码 Endpoint，但字段和状态仍是旧 Contract DTO |
| Portal worker | `portal-teacher-admin/worker/index.ts:29-43` | `env.ASSETS.fetch` 只读取站点静态资源 | 不是 Backend API；不计入产品业务请求 |
| 请求库 | 两个 `package.json`、lockfile | 无 Axios、React Query、SWR、Redux/RTK Query、Apollo/GraphQL、ky、superagent | 无第三方 Client 需要迁移 |

两套 Client 都把 token 存入浏览器 `localStorage`。这是当前实现事实，不等于已批准的生产会话设计。

## 学生端：实际或条件可达请求

“实际”表示当前产品源码有调用链；“条件”表示依赖真实登录、页面操作、记录状态或运行环境，但不是死代码。所有 `/api/v1` 前缀在表中省略。

### 启动、认证、加入与账号

| 页面 / 触发 | Method + 旧 route | 请求 / 响应耦合 | 可达性 | UI 边界与结论 |
|---|---|---|---|---|
| 启动、每 15 秒轮询 | `GET /system-mode` | raw `mode/policyVersion/updatedAt` | 条件：非无配置 localhost preview | `app.js` 经 API function 调用；保留 Use Case，替换 route/DTO |
| Access Token 过期 | `POST /auth/refresh` | `refreshToken` → raw AuthSession | 实际，自动重试一次 | Client 内部；替换旧 session Contract |
| 退出 | `POST /auth/logout` | `refreshToken`，Bearer token → empty data | 实际，best effort | Client 内部；本地先清 session |
| 已登录状态下的安全错误映射 | `POST /audit-logs/client-errors` | allowlist 后的 `platform/level/errorCode/category/retryable/route/requestId` → `auditLogId/receivedAt` | 条件：real mode、存在 access token、且原错误不是本路由 | `logSafeClientError` fire-and-forget；是 Client 内部真实请求，不得在迁移时漏掉 telemetry Contract |
| 邮箱登录页 | `POST /auth/student-sign-in-codes` | `{organizationCode, account, channel, locale}` → challenge | 实际 | `verification.js` 直接读取 `challengeId/expiresAt`，页面直接使用 response DTO |
| 邮箱登录页 | `POST /auth/student-sign-in-codes/verify` | `{challengeId, code, deviceId}` → AuthSession | 实际 | 页面调用 API client function；Client 存 raw session |
| 加课扫码/手输 | `GET /course-invites/{inviteToken}/preview` | raw invite preview | 实际 | `join.js` 直接读取 `enrollmentOpen` 和课程字段 |
| 加课确认 | `POST /course-invites/{inviteToken}/join-capabilities` | profile plain object → `joinCapability` | 实际 | 页面 form object 直接成为 Request DTO |
| 加课确认 | `POST /course-invites/{inviteToken}/join` | `X-Join-Capability` header → join result/AuthSession | 实际；`rawRequest` | 第二步由 `api.js` 编排；route/shape 属于旧 Contract |
| 登录/恢复/工作区 | `GET /me` | raw current user + profile | 实际 | `loadApiStudentIdentity` 做部分映射；仍由 JS 对字段名硬编码 |
| 首次绑定/换绑邮箱 | `POST /me/email-verification-challenges` | `{newEmail, currentEmail, expectedVersion, locale}` → challenge | 实际 | `binding.js` 直接读取 challenge DTO |
| 首次绑定/换绑邮箱 | `POST /me/email-verification-challenges/{challengeId}/verify` | 两个验证码 → CurrentUser | 实际 | 页面直接提交 transport shape |
| 账号注销 | `POST /me/account-deletion-challenges` | expected version/mode/locale → challenge | 实际 | `profile.js` 直接持有 challenge id/version/expiry |
| 账号注销确认 | `POST /me/account-deletion-challenges/{challengeId}/confirm` | challenge/version/code → result | 实际 | 学生业务保留与否由业务文档；route/DTO 待替换 |

### 工作区、课程、成绩、通知、帮助与反馈

| 页面 / 触发 | Method + 旧 route | 可达性 | 原始字段 / 映射 | 结论 |
|---|---|---|---|---|
| 工作区 fan-out | `GET /semesters/current` | 实际；404 当 optional null | semester raw fields | 旧缺失语义不得复制到新 Contract |
| 工作区 fan-out | `GET /enrollments`（cursor 全量） | 实际 | `status/studentId/classSectionId/version` | 与 Android 同 Use Case，聚合方式不同 |
| 工作区 fan-out | `GET /class-sections`（cursor 全量） | 实际 | 页面所需课程/教师/窗口字段直接从 section 映射 | Web 拉全量 list，Android 按 enrollment 拉 detail；新 Contract 决定聚合，不自行选边 |
| 工作区 fan-out | `GET /courses/{courseId}` | 实际；逐 course fan-out | `courseCode/courseName` | 可能 N+1；保留 Use Case，重设计读模型 |
| 工作区 fan-out / 记录页 | `GET /exercise-records?limit=50&sort=-businessDate`（cursor） | 实际 | 只保留 `REVIEWED` + currentReview `VALID/INVALID` | 与“提交后默认有效”存在展示时序风险；新 Contract 明确 projection |
| 凭证详情 | `GET /exercise-records/{recordId}/evidence-context` | 实际 | `mediaIds` | `checkin.js` 通过 API helper 加载 |
| 工作区 fan-out | `GET /student-scores`（cursor） | 实际 | 旧自动计分字段、发布状态 | 当前最终成绩业务不应由旧自动计分 shape 决定 |
| 工作区 fan-out | `GET /student-progress?limit=100`（cursor） | 条件；404/501/503 视为 capability absent | 分类 target/completed/recognized | 新 Contract 决定是否保留独立 projection |
| 工作区 fan-out | `GET /class-sections/{id}/progress-target` | 条件；capability fallback | target raw fields | 页面 fallback 会本地从 records 重算，可能产生双权威 |
| 工作区 fan-out | `GET /activity-certification-applications?limit=100` | 条件；404 当旧 Backend 缺能力 | certification raw fields | 缺失时回退旧 exemption projection；不是 Mock success，但存在双数据模型 |
| 工作区 fan-out | `GET /activity-certification-applications/{id}/recognition-allocation-revisions?limit=100` | 条件 | revision raw fields | Android 清单未列同一路径；Contract 待统一 |
| 通知中心 | `GET /notifications?limit=100`（cursor） | 实际 | raw notification → view mapper | 旧可选能力；业务只保证站内业务页结果，不保证额外通知 |
| 点击通知 | `POST /notifications/{id}/read` | 实际 | Notification response | `app.js` 直接读取 `readAt` |
| 帮助中心 | `GET /help-articles?locale=...` | 实际，真实模式 | projection array + meta | 失败只可回退已缓存的真实文章，不回退 synthetic success |
| 反馈页面 | `GET /feedback`（cursor） | 实际 | raw ticket list | `support.js` 直接把 DTO 放入 UI state |
| 提交反馈 | `POST /feedback` | 实际 | `{category, content}` → raw Feedback | 页面直接构造 Request DTO、直接插入 Response DTO |
| 耐力跑试算 | `POST /activity-conversion-rules/preview` | 实际 | time/gender/grade → score projection | 保留试算 Use Case；不得复制旧换算 DTO |

### 免测、运动 Session、记录与媒体

| 页面 / 触发 | Method + 旧 route | 可达性 | 请求 / 响应耦合 | 结论 |
|---|---|---|---|---|
| 免测列表 | `GET /exemption-application-details`（cursor） | 实际 | StructuredExemptionApplication → JS mapper | 保留 Use Case，替换旧 DTO/route |
| 新建申请 | `POST /exemption-applications` | 实际 | 页面 facts/form → application draft | 页面 service 直调，缺 Use Case/Repository |
| 更新申请 | `PATCH /exemption-applications/{id}` | 实际 | subtype/reason/org/mediaIds/expectedVersion | raw DTO 进入页面 state |
| 提交申请 | `POST /exemption-applications/{id}/submit` | 实际 | expectedVersion → application | raw `id/version/status` 被页面直接读取 |
| 申请材料初始化 | `POST /exemption-applications/{id}/media-uploads` | 实际 | purpose/type/size/hash → MediaUploadSession | 与 Android 的通用 `/media-uploads` 语义冲突，必须由新 Contract 统一 |
| 申请材料直传 | `PUT {uploadUrl}` | 实际 | binary + requiredHeaders → ETag | 动态对象存储请求；受旧 upload DTO 约束 |
| 申请材料确认 | `POST /media-uploads/{uploadSessionId}/confirm` | 实际 | ETag → media | 与运动证明共用 |
| 申请材料轮询 | `GET /media/{mediaId}` | 实际，最多 20 次 | `uploadStatus` | 旧枚举与轮询策略待替换 |
| 查看申请材料 | `POST /media/{mediaId}/access-url` | 实际 | `{purpose: VIEW_ORIGINAL}` → signed URL | 页面打开 raw `accessUrl` |
| 进入/冲突恢复 | `GET /exercise-sessions/active` | 实际 | ExerciseSession | Web 只取 active，Android 另有按 id 重读 |
| 开始运动 | `POST /exercise-sessions` | 实际 | enrollment/clientObservedAt → session | 保留 Use Case |
| 暂停 / 继续 / 结束 / 放弃 | `POST /exercise-sessions/{id}/pause|resume|finish|cancel` | 实际 | expectedVersion/clientObservedAt/reason → session | 四条旧 route；页面直接依赖 version/state |
| 原测试能力探测 | `GET /internal/test-tools/capabilities` | **已删除**；无当前调用者 | capabilities list | 旧 internal route 不进新产品 Contract；public runtime gate、Client helper 与状态字段均已删除 |
| 创建记录草稿 | `POST /exercise-records` | 实际 | session/credit/sport/description | 保留 Use Case，替换 DTO |
| 提交记录 | `POST /exercise-records/{id}/submit` | 实际 | `mediaIds/expectedVersion` | 保留正式提交 Use Case |
| 运动证明初始化 | `POST /media-uploads` | 实际 | EXERCISE_RECORD context + media metadata | 保留动态上传能力，替换 DTO |
| 运动证明直传 | `PUT {uploadUrl}` | 实际 | binary + required headers → ETag | `checkin.js` 还会 `fetch(blob:)` 读取本地 Blob；后者不是 Backend HTTP |
| 运动证明确认/绑定 | `POST /media-uploads/{session}/confirm`；`POST /media/{id}/bind` | 实际 | ETag、sessionId、version | 旧 upload/bind Contract |
| 运动证明轮询/详情 | `GET /media/{id}` | 实际 | raw media status/metadata | 轮询和详情共用旧 DTO |

## 教师/管理员 Portal：实际或条件可达请求

所有 `/api/v1` 前缀省略。Portal 的 demo mode 会由 `api-client.ts` 阻断 HTTP；下表只列 real mode。

### 公共认证与系统模式

| 页面 / 触发 | Method + 旧 route | 调用层 | DTO / 结论 |
|---|---|---|---|
| 登录 | `POST /auth/password-login` | `portal-app.tsx` → `api-client.ts` | UI 根组件直连 HTTP Client；raw AuthSession |
| 会话恢复 | `GET /me` | `portal-app.tsx` → `api-client.ts` | UI 根组件直接使用 CurrentUserData |
| refresh / logout | `POST /auth/refresh`；`POST /auth/logout` | Client 内部 / root component | 旧 token/session Contract |
| 找回密码前组织上下文 | `GET /organizations/current` | `portal-app.tsx` 直接调用 Client | 读取 `organizationCode`；页面与 transport 直接耦合 |
| 发起 / 完成找回密码 | `POST /auth/account-recovery-requests`；`POST /auth/account-recovery-requests/complete` | `portal-app.tsx` 直接调用 Client | UI 直接构造 Request DTO |
| 启动及 15 秒轮询 | `GET /system-mode`（unauthenticated） | `portal-app.tsx` → `system-mode-service.ts` | 保留 Use Case；demo 读取 admin mock state |
| 教师/管理员已登录状态下的安全错误映射 | `POST /audit-logs/client-errors` | `logSafeClientError` → `rawRequest` | 条件：real mode、存在 access token、角色为 `ADMIN/TEACHER`；fire-and-forget；平台字段分别为 `WEB_ADMIN/WEB_TEACHER` |

### 教师 real mode

| 页面 / 操作 | Method + 旧 route | 实际调用 / DTO | 结论 |
|---|---|---|---|
| 工作区首次加载 | `GET /class-sections`；`GET /courses`；`GET /semesters/current` | `teacher-workspace` → `teacher-data`; generated aliases | 全量 cursor；页面经 view mapper，但直接触发 service |
| 缺失 catalog fallback | `GET /courses/{courseId}` | 条件：section 引用未在 list 中 | N+1 fallback；保留 Use Case，重建读模型 |
| 每班目标 | `GET /class-sections/{id}/progress-target` | 每个 active section | N+1；旧 ProgressTarget DTO |
| 保存窗口与目标 | `PATCH /class-sections/{id}`；`POST /class-sections/{id}/progress-target/revisions` | 页面传 body/version | 真实写请求；页面直接编排两个 Endpoint，存在部分成功风险 |
| 生成邀请 | `POST /class-sections/{id}/course-invites` | 页面操作 | 保留 Use Case |
| 加载学生 | `GET /enrollments?classSectionId=...`；`GET /students/{studentId}` | 逐班、逐学生 fan-out | generated DTO → TeacherStudentView；高 N+1 |
| 移出成员 | `POST /enrollments/{id}/remove` | 页面操作 | expectedVersion/reason |
| 打卡加载 | `GET /exercise-records`；每条 `GET /exercise-records/{id}`；`GET .../evidence-context`；`GET .../reviews?limit=1&sort=-reviewVersion` | 实际，多层 fan-out | generated record/review DTO → TeacherCheckinView |
| 打卡审核 | `POST /exercise-records/{id}/reviews` | 实际，含 version conflict retry | 保留有效/无效 Use Case；旧 reason/error/版本字段待替换 |
| 查看凭证 | `POST /media/{id}/access-url` | 点击凭证 | raw signed URL；页面打开 URL |
| 成绩加载 | `GET /student-scores` | 实际 | 旧自动计分/发布 DTO → TeacherGradeView |
| 成绩“重算/发布” | `POST /student-scores/{id}/recalculate`；`POST /student-scores/{id}/publish` | 实际 | 当前 real mode 没有“教师填写任意最终成绩”的对应 HTTP 链；旧自动计分语义不能迁入 |
| 免测加载 / 审核 | `GET /exemption-application-details`；`POST /exemption-applications/{id}/review` | 实际 | generated StructuredExemptionApplication / review body |
| 官方名单读取 | `GET /class-sections/{id}/roster-imports/current`；`GET .../roster-imports`；`GET /roster-imports/{id}/entries`；`GET /roster-alignment-results?...` | roster service | generated Contract DTO 在 API service/projection 层 |
| 官方名单导入 / 对齐 | `POST /class-sections/{id}/roster-imports`（FormData）；`POST /roster-imports/{id}/align` | 页面操作 | multipart + version |
| 官方名单确认 / 重开 | `POST /roster-alignment-results/{id}/confirm|reopen` | 页面操作 | 两条旧状态转换 route；新业务/Contract 重新确认 |

教师 real UI 没有 `POST /class-sections` 调用；旧 `teacher-data.createClassSection()` 已删除。demo 分支仍可在同一套教师 UI 中本地生成 `mock-course-*`，不得把 demo 成功当真实课程创建能力。

### 管理员 real mode

| 页面 / 操作 | Method + 旧 route | DTO / UI 耦合 | 结论 |
|---|---|---|---|
| AdminStore 启动/刷新 | `GET /health/admin` | 手写 health response，页面/store 直接使用 | 实际；只建立空 real admin state + health，不加载完整管理状态 |
| 系统概览 | `GET /semesters/current`；`GET /system-mode` | raw projection 进入 workspace | 实际；只读 |
| 当前课程只读页 | 教师同一组 `GET /class-sections`、`/courses`、`/semesters/current`、`/enrollments`、`/exercise-records`、`.../progress-target`、`/teachers/{id}` | admin page 复用 teacher service | 实际；不调用 admin course create/update |
| 学生/教师账户列表详情 | `GET /students`；`GET /students/{id}`；`GET /class-sections`；`GET /teachers/{id}` | `admin-users.tsx` 直接持有 profile projections | 实际；教师列表通过 class-section teacher id fan-out，不是独立 list endpoint |
| 审计列表/详情 | `GET /audit-logs?...`；`GET /audit-logs/{id}` | `AuditLogProjection` 直接进入页面 state/render | 实际；页面直接读取原始 actor/target/outcome/request metadata |
| 请求运行日志 ZIP | `POST /exports`；轮询 `GET /exports/{id}`；`POST /exports/{id}/download-url` | generated ExportJob/ExportDownload 直接进入页面 | 实际；页面轮询 9 次并打开 raw download URL |
| 反馈列表 | `GET /feedback` | generated Feedback 直接进入页面 | 实际；real mode 写操作仍调用 demo-only `updateTicket()`，无真实更新请求 |
| 帮助文章列表 | `GET /help-articles?locale=...` | generated HelpArticle 直接进入页面 | 实际；real mode create/edit/publish 仍是 demo-only local mutation，真实写链缺失 |
| 学期页面 | `GET /semesters/current` | CurrentSemesterProjection | 实际；create/update/switch 仍是 demo-only local mutation，真实写链缺失 |
| 系统模式页面 | `GET /system-mode` | SystemModeProjection | 实际；`switchSystemMode()` 仍是 demo-only local mutation，真实写链缺失 |

管理员耐力规则页在 demo/real 使用同一套 `EndurancePanel` UI；demo mutation 写 localStorage，real mutation 与学期、用户、系统模式、反馈、帮助等未接能力一样返回 `BACKEND_REQUIRED`。这不是空接口成功，也不是已接真实 API。

## 页面直接调用、DTO 泄漏与原始字段读取

| 类型 | 位置 | 证据 | 判定 |
|---|---|---|---|
| UI → HTTP Client | `portal-app.tsx:43-56,562-705,876-1040` | 直接调用 login/getMe/logout/getOrganization/recovery | 明确跨越 ViewModel、Use Case、Repository、API Adapter |
| UI → API module | 学生 `screens/join/binding/checkin/profile/services/support/verification.js` | 页面直接 import `../api.js` 并传 form/plain object | 没有页面内 `fetch` Backend URL，但仍是 UI 直连 API Adapter/Client |
| 页面直接 `fetch` | `student/screens/consent.js:12-19` | 读取同源 Markdown asset | 非 Backend；允许保留静态资源 Use Case |
| 页面直接 `fetch` | `student/screens/checkin.js:1815` | `fetch(blob:)` 把本地 object URL 转回 Blob | 非 Backend；不计旧 API Endpoint |
| generated DTO → 页面 | `admin-support.tsx`、`admin-help.tsx` | `FeedbackProjection[]`、`HelpArticleProjection[]` | 明确 Contract DTO 泄漏 UI |
| generated DTO → 页面 | `admin-audit.tsx` | Audit/Export projection 直接进入 state/render | 原始服务端字段直接渲染/筛选 |
| generated DTO → UI | `teacher-workspace.tsx:97` | 直接 import `Semester` Contract alias | 教师大部分数据已映射为 View type，但 Semester 仍泄漏 |
| raw JS response → 页面 | student join/auth/binding/profile/support/services/checkin | 页面读 `status/version/challengeId/expiresAt/readAt/mediaIds/accessUrl` 等 | JavaScript 无类型不等于无 DTO 耦合 |
| Request Hook | `use-student-profile.ts` | 可接 `loadProfile` 并去重/cache；当前没有任何调用者传 loader | 当前不产生网络请求；属于未启用边界 |

Portal 教师路径相对最好：`teacher-data.ts` 与 roster projection 把大部分 generated DTO 映射为 View type。但它仍同时承担 Service、Repository、API Adapter 和业务投影职责，不能原样视为目标七层架构。

## Contract、generated types 与测试绑定

| 项目 | 文件 / 事实 | 结论 |
|---|---|---|
| Snapshot | `portal-teacher-admin/openapi/openapi.snapshot.yaml`，348,260 bytes | 旧候选 Contract，不是新设计权威 |
| Descriptor | `openapi/contract.json` | `3.0.0-web-snapshot`、source state `LOCAL_UNCOMMITTED_CANDIDATE`、133 operations、313 schemas |
| Generated types | `app/openapi.generated.ts` | 8,580 行、仅类型，无可调用 HTTP SDK |
| Runtime type import | `teacher-api-types.ts`、`admin-service.ts`、roster API/projection | 直接依赖 `components["schemas"]` |
| Build gate | `package.json` 的 `typecheck` → `contract:check` | 先 verify snapshot，再 regenerate `--check`；直接删除会破坏 typecheck |
| Portal tests | `tests/contract-binding.test.mjs` | 固定 candidate version/hash/generated output |
| Student tests | `student-smoke.mjs:172-175` | 学生端测试跨项目读取 Portal snapshot |

安全退役顺序：先建立新 Contract 和客户端 DTO/Domain 映射，再迁移 runtime types 与 tests，最后删除旧 snapshot、descriptor、生成脚本/依赖和 Contract 专用断言。`api-client.ts` / `api.js` 的通用传输职责不能按“Contract 文件”一并删除。

## 测试按钮、调试入口、Fake Success、Mock 触发器与开发专用操作（审计基线）

### 分类口径

- `PRODUCT`：正式产品流程的一部分；即使名称含“试算/预检”，也不是测试后门；
- `DEV_ONLY`：当前有明确的 development、local/test/staging runtime gate，或只能由开发命令启动；
- `TEST_ONLY`：只有自动测试、测试 fixture 或独立联调 helper 调用，当前产品 UI 无调用链；
- `UNKNOWN`：意图看似测试/预览，但当前代码没有足够隔离，或运行源码中存在无调用者的 Fake/危险边界。该标签保留审计时的代码事实；其后续人工决定单独记录，不表示代码已经完成处置。

分类依据是当前代码的**实际可达性和门禁**，不是命名或注释。`Fake Success` 指没有获得 Backend 成功事实却更新本地业务状态、显示成功或生成业务投影；普通本地表单校验和媒体预览不算 Fake Success。

本专项逐文件核对的运行边界包括：学生 `app.js/login.js/api.js/data.js/store.js/session.js` 及 `join/checkin/binding/services/support/profile` screens；`preview-server.cjs`；Portal `portal-app.tsx/api-client.ts/system-mode-service.ts`；教师 `teacher-workspace.tsx/teacher-data.ts`；roster reconciliation 的 API/mock/data/UI 文件；管理员 `admin-store.tsx/admin-service.ts/admin-mock-data.ts` 及 courses/semesters/users/subadmins/rules/system/help/support/audit/workspace 页面；两个 `package.json`、demo/setup/handoff/quality helpers 和全部现行 test files。下表保留处置前分类证据，现状以“17 项 UNKNOWN 人工决策与实施结果”、文首回填及各行“已删除”标记为准；历史说明文档中的“Mock/测试”文字不作为运行入口证据。

### 学生端运行时入口与操作

| 入口 / 按钮 / 操作 | 分类 | 是否调用旧 API | Mock / Fake | 是否绕过正常业务流程；人工决定 |
|---|---|---|---|---|
| 登录页“免登录预览” `login.localReview` | **UNKNOWN** | 否；`setApiRequestMode("review")` 会阻断 Backend 请求 | `createLocalReviewWorkspace()` 基于整套 Mock workspace | `login.js:51-57` 没有 build/appEnv gate；直接建立 authenticated review session，绕过登录、身份和 Backend。**人工决定：删除** |
| review banner“退出测试” | **UNKNOWN** | 否 | 清除本地 review session | 只在上述未隔离入口之后出现；不伪造业务成功，但继承入口的发布边界问题。**人工决定：随免登录 review 删除** |
| 登录页“学生端测试入口 → 进入账号密码登录” | **DEV_ONLY** | 后续仍走旧 `POST /auth/student-sign-in-codes` 与 verify；没有 password-login 调用 | 否 | 只在 public config `appEnv === "local"` 显示；实际打开与普通邮箱验证码相同的 screen，和“账号密码登录”文案不一致，不绕过验证 |
| loopback 且未配置 `APP_ENV` 的启动模式 | **DEV_ONLY** | 不查询旧 `GET /system-mode` | 默认本地 NORMAL UI | `shouldQuerySystemMode()` 的 localhost preview 分支；绕过 Backend 只为无后端本地预览，host 条件明确 |
| URL `?sysmode=normal|maintenance|planned` | **UNKNOWN** | **不调用**旧 `GET /system-mode` | 本地合成 NORMAL/MAINTENANCE/planned 状态 | `app.js:47-63,82-89` 无 hostname/appEnv gate；可绕过客户端启动期 SystemMode 查询。**人工决定：仅 QA 环境保留，必须建立明确 QA 门禁** |
| 原 `APP_ENV=local|test|staging` + `TEST_TOOLS_ENABLED=true` 能力探测 | **DEV_ONLY** | 审计时调用 `GET /internal/test-tools/capabilities` | 否；404/未知能力 fail closed | **已删除**：移除 public runtime flag、能力探测、状态字段和 Client helper，不再进入 Web 运行链路 |
| real session“增加 60 分钟”按钮 | **UNKNOWN** | `POST /exercise-sessions/{id}/add-sixty-minutes`，随后 `GET /exercise-sessions/active` | 否；使用 Backend 返回事实 | `showAdd60` 只检查 real session/serverId，没有检查 runtime gate 或 `testToolCapabilities`；绕过真实运动时间流逝。**人工决定：删除** |
| review session“增加 60 分钟”按钮 | **UNKNOWN** | 否 | `addMockActiveDuration()` 直接增加本地 60 分钟并显示 Mock 成功 | 继承无门禁 review 入口；绕过计时和 Backend。**人工决定：随免登录 review 删除** |
| review 运动全链：开始、暂停、继续、结束、提交 | **UNKNOWN** | 否 | 非 API 分支本地计时；提交后 `setTimeout` 生成 record、凭证摘要和学时进度成功投影 | Fake Success；绕过 Session、媒体上传、记录提交和教师审核，继承无门禁 review 入口。**人工决定：随免登录 review 删除** |
| review 规则试算 | **UNKNOWN** | 否；跳过旧 `POST /activity-conversion-rules/preview` | `mockEnduranceConversion()` 本地公式返回分数 | 绕过管理员当前生效规则；虽标注 Mock/试算，入口仍继承无门禁 review 模式。**人工决定：随免登录 review 删除** |
| 正式“全局规则试算” | **PRODUCT** | `POST /activity-conversion-rules/preview` | 否 | 只返回预览、不写正式成绩；属于正常产品辅助流程，不是测试后门 |
| review 免测/免打卡申请提交 | **UNKNOWN** | 否 | 新增 `mock-exemption-*`、本地证明图、审核中状态并显示“Mock 申请已提交” | Fake Success；绕过 draft、上传、bind、submit 和 Backend 审核队列。**人工决定：随免登录 review 删除** |
| review 邮箱绑定/变更 | **UNKNOWN** | 否 | challenge 固定为 `mock-email-verification`，自动填 `123456` 并显示 Mock 验证成功 | Fake Success；绕过邮件发送、验证码和账号版本校验。**人工决定：随免登录 review 删除** |
| review 账号注销 | **UNKNOWN** | 否 | challenge 固定为 `mock-account-deletion`，自动填 `123456`；最终只本地 logout | 绕过真实注销挑战和服务端终态；没有删除 Backend 账号。**人工决定：随免登录 review 删除** |
| review 帮助中心与问题反馈 | **UNKNOWN** | 否 | mock published articles；新增 `mock-feedback-*` 并显示本地受理成功 | 反馈是 Fake Success；绕过发布帮助 API 和反馈提交/查询。**人工决定：随免登录 review 删除** |
| review 通知已读/全部已读 | **UNKNOWN** | 否 | 仅修改当前 workspace；review 下 `saveOverlay()` 不落盘 | 绕过通知 read Endpoint，但不生成新的业务记录。**人工决定：随免登录 review 删除** |
| `joinConfirm` correction-request 非 real 分支 | **UNKNOWN** | 否 | 直接新增 `mock-course-*` ACTIVE enrollment | Fake Success；当前 API workspace 固定 `courseJoinRequest: null`，没有现行 UI 状态来源，但运行源码保留可写分支。**人工决定：删除** |
| 原 `MOCK_INVITES` 邀请码表 | **TEST_ONLY** | 否 | 固定有效/过期邀请 fixture | **已删除**：产品模块和 smoke test 均不再保留该旧 Mock 邀请表 |
| 原 `advanceTestExerciseSessionDuration()` | **TEST_ONLY** | 审计时测试中 Mock `POST /internal/test-tools/exercise-sessions/{id}/advance-duration` | 测试替换 fetch | **已删除**：Client helper、safe-log route token 和对应 smoke test 均已移除 |
| 启动时 `demoAccountInfo()` 探测 | **UNKNOWN** | 浏览器 `GET /dev/demo-session`，不是 `/api/v1` | preview server 读取本地凭据状态 | `app.js:771-776` 无 appEnv gate且每次启动调用，虽无可见 demo 按钮仍把开发探针留在产品源码。**人工决定：删除** |
| `loginDemoUser()` / `demoSignIn()` | **UNKNOWN** | 浏览器 `POST /dev/demo-session`，preview server 再调旧 `POST /api/v1/auth/refresh` | 使用真实 demo 账号，不是假数据 | 当前无 UI/action 调用者；如恢复会绕过学生正常验证码登录。**人工决定：删除** |

### 教师/管理员 Portal 运行时入口与操作

| 入口 / 按钮 / 操作 | 分类 | 是否调用旧 API | Mock / Fake | 是否绕过正常业务流程；人工决定 |
|---|---|---|---|---|
| 登录页“跳过登录查看教师端/管理端” | **DEV_ONLY** | 否；`api-client` 切换 demo 并阻断请求 | `demoUsers` + 各角色 fixture | `process.env.NODE_ENV === "development"` 编译门禁；绕过认证、session restore 和 Backend SystemMode |
| URL `?mock=teacher` / `?mock=admin` | **DEV_ONLY** | 否 | 自动进入同一 demo workspace | 只在 development 解析；页面显示 TEST/免登录预览 banner |
| demo banner“复位预览” | **DEV_ONLY** | 否 | 清缓存；admin 删除 `ADMIN_STORAGE_KEY`；component remount | 绕过业务撤销/审计，仅重置本地 demo state |
| demo banner“返回登录” | **DEV_ONLY** | 否 | 清 demo mode/query/hash | 不伪造成功；退出本地预览 |
| demo 密码设置“发送验证码”预览 | **DEV_ONLY** | 否 | 直接把 UI 推进 reset step；最终提交按钮强制 disabled | 仅预览流程，绕过邮件只为展示，不会显示最终修改成功或更改密码 |
| demo URL `?systemMode=` / `?sysmode=` | **DEV_ONLY** | 否；跳过旧 `GET /system-mode` | 本地 NORMAL/MAINTENANCE override | 只在 demo workspace 调用 `readPreviewSystemModeStatus()`；绕过真实 SystemMode 供 UI 预览 |
| development 登录页（未进入 workspace） | **DEV_ONLY** | 不查询旧 `GET /system-mode` | 无业务 Mock；只显示开发登录 UI | `IS_LOCAL_REVIEW_ENTRY && workspaceMode === null` 时直接跳过轮询；绕过启动 gate 只为未配置 Backend 的 UI 预览 |
| 教师 demo 初始课程/学生/记录/成绩/免测数据 | **DEV_ONLY** | 否 | `initialCourses/Students/Records/Grades/Exemptions`、`demoSemester` | 整个工作区为本地投影；所有业务事实均非 Backend 验收 |
| 教师 demo 新建课程 | **DEV_ONLY** | 否 | 新增 `mock-course-*` 并显示成功 | Fake Success；真实模式明确不调用无适配能力的旧 create route |
| 教师 demo 保存打卡时间窗与学时目标 | **DEV_ONLY** | 否 | 修改 React state 并显示本地保存成功 | Fake Success；绕过 class-section PATCH、target revision、版本和审计 |
| 教师 demo 生成/撤销邀请码 | **DEV_ONLY** | 否 | 生成 `MOCK-*` 或本地 revoke | Fake Success；绕过邀请创建、替换/撤销和服务端有效性 |
| 教师 demo 打卡审核：有效、无效、无效改回有效 | **DEV_ONLY** | 否 | 更新本地审核/汇总并显示 Mock 成功 | Fake Success；绕过 Review append、version、并发锁和审计历史 |
| 教师 demo 学生操作：移出课程、减免、补录学时 | **DEV_ONLY** | 否 | 本地改 membership/waiver 或新增 `local-supplement-*` | Fake Success；绕过 enrollment remove、通知、证据、审计；补录还明确不占每日提交额度 |
| 教师 demo 成绩保存/发布 | **DEV_ONLY** | 否 | 本地换算/更新分数并把全班标为 published | Fake Success；绕过服务端成绩重算、发布与通知 |
| 教师 demo 免测/组织认证审核及撤销抵扣 | **DEV_ONLY** | 否 | 本地 approve/reject/supplement、设置分数/抵扣并更新成绩 | Fake Success；绕过申请 Review 和后续独立成绩/抵扣流程 |
| 教师 demo 凭证预览 | **DEV_ONLY** | 否 | 读取 fixture 文件，不取 media access URL | 绕过对象存储授权，仅作为本地视觉预览，不产生成功业务事实 |
| 教师 demo 名单导入、对齐、确认异常、重新打开 | **DEV_ONLY** | 否 | `rosterMockService` + fixture + `bnbu-teacher-roster-reconciliation-demo-v1` localStorage | Fake Success；创建本地名单版本/处理状态，明确不修改学校服务器或真实 Enrollment |
| 名单导入“本地预检” | **PRODUCT** | 预检本身不调 API；real confirm 才调用旧 roster import/alignment API | real mode 无 Mock | 正常导入前校验步骤，不绕过最终 Backend；demo confirm 另按上一行处理 |
| 管理员 demo overview/course/audit/help/support 等读取 | **DEV_ONLY** | 否 | `admin-mock-data.ts`、demo course/audit projection、localStorage | 绕过真实查询；audit archive 下载在 demo 被禁用 |
| 管理员 demo 学期新增/编辑/设当前 | **DEV_ONLY** | 否 | `admin-service.mutate()` 更新 localStorage 并显示成功 | Fake Success；real 页面只读，绕过正式学期写接口和审计 |
| 管理员 demo 批量建立/删除教师 | **DEV_ONLY** | 否 | 本地导入/删除 teacher state | Fake Success；real UI 禁用，绕过真实账号、课程交接和审计 |
| 管理员 demo 分管理员新增/编辑/启停/删除 | **DEV_ONLY** | 否 | 独立 localStorage；浏览器 PBKDF2 verifier | Fake Success；不是服务端账号/权限事实，real UI 禁用 |
| 管理员 demo 耐力规则新增/编辑/删除 | **DEV_ONLY** | 否 | localStorage rule table | Fake Success；绕过正式规则版本、生效与审计 |
| 管理员 demo SystemMode 切换 | **DEV_ONLY** | 否 | localStorage system mode + storage event | Fake Success；只改变 preview gate，不改变 Backend 全局模式 |
| 管理员 demo 帮助文章保存/状态流转、反馈工单更新 | **DEV_ONLY** | 否 | localStorage mutation | Fake Success；绕过发布内容、工单状态、并发版本和审计 |
| 无 UI 调用者的 admin demo service：通用用户写、验证码解锁、强制登出、课程转移、恢复审核、维护公告、全量 purge、成绩纠正 | **UNKNOWN** | 否；调用会先要求 demo mode | 运行源码中的 localStorage mutation | 当前无页面调用者，不是产品能力也不应自动视为测试需求；特别是 purge/强制登出等名称具有高风险。**人工决定：整体删除** |

### 开发服务器、命令、helper 与自动测试

| 入口 / 操作 | 分类 | 是否调用旧 API | Mock / Fake | 是否绕过正常业务流程；人工决定 |
|---|---|---|---|---|
| `npm run preview` + public runtime config | **DEV_ONLY** | proxy `/api/*` 至配置的 Backend；`/dev/demo-session` 已删除 | 不返回业务 Fake | 本地服务器；public runtime 只暴露 allowlist 后的 `APP_ENV`，Test Tools gate 已删除 |
| Portal `npm run dev` | **DEV_ONLY** | Vite 把 `/api/v1` 转发至 `BNBU_LOCAL_BACKEND_ORIGIN` | 启用 development-only 跳过登录入口和 `?mock=` | 命令本身不伪造成功；选择 demo 入口后才绕过认证/业务流程 |
| preview server `/dev/demo-session` | **DEV_ONLY** | 审计时 POST 会使用本地 refresh token 调旧 `/api/v1/auth/refresh` | 真实 demo 账号 | **已删除** route 与学生 Client/启动探测 |
| `npm run demo:setup [-- --force]` | **DEV_ONLY** | 审计时会发多个真实 `/api/v1` 请求并直写测试数据 | 不是 Mock | **已删除**命令和 helper |
| `npm run mock-api` | **DEV_ONLY** | 审计时提供旧 `/api/health`、`/api/auth/me`、`/api/teacher/*` | 内存固定成功响应 | **已删除**命令和旧 Mock server |
| `npm run api` → `backend/server.js` | **UNKNOWN** | 审计时提供大量旧 `/api/*` | 真实 MySQL + demo token 分支 | **已删除**命令与 Web 内嵌 Backend；历史只由 Git 保留 |
| 原 `npm run seed` | **DEV_ONLY** | 审计时不经 HTTP，直接数据库 seed | 固定 seed data | **已删除** root script、旧 `database/` 与 seed 实现；硬编码数据库凭据仍须在外部系统轮换 |
| 原 `handoff/make-test-record-15.cjs`、`handoff/make-test-record.ps1` | **TEST_ONLY** | 审计时调用多个真实 `/api/v1`、对象上传 | 非 Mock | **已删除**：不再保留绕过正常流程的造数 helper |
| `frontend/quality-smoke.cjs` | **TEST_ONLY** | 审计时 HEAD/GET Web 与旧 Mock `/api/health` | 依赖旧 Mock health | **已删除**旧质量脚本 |
| `frontend/preview-runtime-config.test.cjs`、`frontend/student/student-smoke.mjs` | **TEST_ONLY** | 替换 fetch；覆盖当前旧 API Client route | workspace/Fetch/Blob/Contract fixture | 纯进程测试；`MOCK_INVITES`、Test Tools gate 和 internal advance-duration 覆盖已删除 |
| Portal `tests/*.test.mjs` | **TEST_ONLY** | Mock fetch/HTTP server，固定 generated snapshot | admin/roster/DTO fixture | 测试成功不证明 Backend、Staging 或业务真实成功 |
| `backend/test/phase3-api.test.cjs` | **TEST_ONLY** | 审计时进程内请求旧 Backend | 测试数据库/fixture | 随 Web 内嵌 Backend **已删除** |
| Portal `contract:*`、typecheck、lint、build、`db:generate` | **DEV_ONLY** | 不发产品 HTTP；Contract tooling 读取/生成旧 snapshot/types | 否 | 工程命令，不是 UI/Fake Success；仍构成 generated Contract 与开发数据库工具耦合 |

### 17 项 `UNKNOWN` 人工决策与实施结果

> 决策日期：2026-08-31；实施日期：2026-08-31。17 项均已按决定完成，当前该批 `UNKNOWN=0`。

- **已删除**：1 学生免登录 review、4 real add-60、13 correction-request 非 real 写分支、14 启动 demo-session 探测、15 demo 登录边界、16 无 UI admin demo service；
- **已随 1 删除**：2 review 退出入口，以及 5–12 的 review add-60、运动全链、规则试算、申请、邮箱、注销、帮助/反馈、通知本地分支；
- **已完成 QA 隔离**：3 `?sysmode=normal|maintenance|planned` 仅当 `APP_ENV=qa` 时解析；非 QA 环境忽略 override；
- **已移出当前运行链**：17 root scripts 不再暴露 `api/mock-api/demo:setup/test:api`，`backend/` 已删除，历史只由 Git 保存。

没有发现“real API 请求失败后自动返回 Mock success 并继续写正式业务”的通用 fallback。学生相关 Fake Success 已删除；Portal development-only demo 仍明确不调用 Backend，不得作为正式链路验收证据。

## 审计时已声明但未实际调用的旧 Client

| 文件 / method | 声明的旧 route | 当前调用证据 | 判定 |
|---|---|---|---|
| student `getRecord()` | `GET /exercise-records/{id}` | 只有定义，无产品/测试调用 | **已删除** |
| student `getFeedback()` | `GET /feedback/{id}` | 只有定义 | **已删除** |
| student `getExemptionApplication()` | `GET /exemption-applications/{id}` | 只有定义 | **已删除** |
| student `discardRecord()` | `POST /exercise-records/{id}/discard` | 产品无调用 | **已删除** |
| 原 student `advanceTestExerciseSessionDuration()` | `POST /internal/test-tools/exercise-sessions/{id}/advance-duration` | **已删除**；无当前调用者 | 原 TEST_ONLY boundary 已从 Client 与 smoke test 删除；不进新产品 Contract |
| Portal staff deletion challenge/confirm | `POST /me/account-deletion-challenges...` | 仅 API Client tests；render test明确断言 app 不引用 | **已删除** UI-less legacy boundary；学生账号注销不受影响 |
| teacher `createClassSection()` | `POST /class-sections` | 只有定义；render test断言 workspace 不引用 | **已删除**；真实课程创建能力仍缺失 |
| teacher `fetchExerciseRecordAttemptContext()` | `GET /exercise-records/{id}/attempt-context` | 只有定义 | **已删除** |
| admin `listAdminCourses()` | `GET /courses` | 只有定义；页面复用 teacher service | **已删除**重复 adapter |
| admin `createAdminCourse()/updateAdminCourse()` | `POST /courses`、`PATCH /courses/{id}` | 无 UI 调用 | **已删除**，不替换 |
| OpenAPI 其余 operations | snapshot 共 133 operations | 只有一部分被当前 service 引用 | generated 声明不等于实际网络请求或产品需求 |
| `handoff/api-base.patch` | patch 中旧 fetch/client | 不可执行文本 | **已删除**；历史只由 Git 保留 |
| 旧 `/api/*` Express/Mock routes | 旧 route family | 当前学生/Portal Client 无引用 | Web 内嵌 Backend/Mock **已删除** |

## 非产品浏览器网络请求

为避免遗漏，下列请求已扫描但不计入三角色产品运行时：

- `Dockerfile.local`、`portal-teacher-admin/Dockerfile.staging`：容器内 `fetch` healthcheck，只探测 Web 页面；
- `scripts/setup-demo-student.cjs`：审计时通过旧 `/api/v1` 创建 demo 学生、Session、记录、媒体和审核；现已删除；
- `handoff/make-test-record-15.cjs`、`handoff/make-test-record.ps1`：历史联调 helper 已从当前 Web 树删除，仅由 Git 历史保留；
- `frontend/quality-smoke.cjs`、`backend/test/phase3-api.test.cjs`：依赖旧 Web Backend/Mock 的测试路径已删除；Portal 现行 tests 仍只发进程内测试请求；
- preview server `/dev/demo-session`：已删除；
- worker `ASSETS.fetch`、privacy Markdown fetch、`fetch(blob:)`：静态/本地资源，不是 Backend Contract。

## 环境变量与配置耦合

| 范围 | 变量 / 配置 | 结论 |
|---|---|---|
| 学生 public runtime | `APP_ENV` → `__BNBU_PUBLIC_CONFIG__` | preview server 只暴露单字段 allowlist；`APP_ENV` 接受 `qa`，原 `TEST_TOOLS_ENABLED` 与 capability probe 已删除 |
| 学生 query override | `?sysmode=normal|maintenance|planned` | 仅 `APP_ENV=qa` 时生效；其他环境忽略 query 并遵循正常 SystemMode 查询/本地预览规则 |
| 学生 preview proxy | `HOST/PORT/API_HOST/API_PORT/MINIO_HOST/MINIO_PORT/MINIO_PUBLIC_AUTHORITY` | 本地基础设施绑定；API base 仍固定同源 `/api/v1` |
| Portal dev proxy | `BNBU_LOCAL_BACKEND_ORIGIN` | 默认 loopback 3000；只影响 Vite dev server |
| Portal review gate | build-time `process.env.NODE_ENV === "development"` | `?mock=` 只在 development；比学生 review entry 隔离更严格 |
| Student demo setup | `DEMO_API_BASE` 等 | helper 与命令已删除，不再是当前运行配置 |
| Web 内嵌 Legacy Backend | DB/CORS/demo-token 等 env | Runtime 已删除；历史仅由 Git 保留，不影响当前真实 Backend |
| `.env*` | 当前 Web 树未发现受版本控制的 `.env*` 文件 | 不证明本机/部署没有外部环境变量 |

浏览器不能通过 query string 或 localStorage 改写 API origin；两套 Client 都固定同源 `/api/v1`。这是当前安全约束，可保留思想，但新 API prefix 仍须由新 Contract 决定。

## Android 与 Web 语义对照

| Use Case | Android Phase 1A | Web Phase 1B | 判定 |
|---|---|---|---|
| 增加 60 分钟 | 审计时真实 route 条件可达；Android Phase 1A 已决定删除旧入口 | 审计时 Web 门禁更弱 | **已解决**：Web 页面、Client 与运行文案已删除；generated snapshot 声明不构成调用 |
| INVALID 记录重提 | Android adapter 无 main 调用者，已判定删除 | 审计时 Web 有实际 `attempt-context` / `resubmissions` 链 | **已解决**：Web UI、Client、DTO sidecar 与运行文案已删除 |
| 免测材料初始化 | Android `POST /media-uploads`，context=`EXEMPTION_APPLICATION` | Web `POST /exemption-applications/{id}/media-uploads` | **确认 Contract 冲突**：同一 Use Case 两条 route；停止选型，交新 Contract |
| 学生 local review | Android debug/local 双门禁，staging/release provider 为 null | 审计时 Web 学生入口无门禁；Portal 是 development gate | **已解决**：学生 local review 与关联 Fake Success 已删除；Portal development-only demo 保留 |
| Mock 数据来源 | Android 空 `MockStudentWorkspace.kt` 已删除；debug fixture 独立 | Web `data.js` 只保留空工作区与显示 helper，不再包含 `MOCK_INVITES` | **已解决**：不再存在学生运行时 synthetic workspace 或旧邀请 fixture |
| 班级读取 | Android 对 active enrollment 逐 id 读取 class-section detail | Web 拉 `/class-sections` 全量再关联 | route/聚合差异；不直接判业务冲突，交新 Contract 设计 |
| Session 重读 | Android有 `GET /exercise-sessions/{id}` | Web只用 `GET /exercise-sessions/active` | 恢复策略差异；需新 Contract/Use Case 明确，不自行补接口 |
| 偏好/推送/版本策略 | Android有 preferences、push-device、app-release-policy | Web 当前无对应请求；通知中心两端都有 | 平台能力差异，不自动判冲突；是否需要 Web 能力为 `UNKNOWN` |

## 与当前业务权威文档的已确认偏差

已通过本轮删除解决：学生免登录 synthetic 成功、`add-sixty-minutes`、`resubmissions` / attempt chain、管理员旧 score-rule 审批调用、管理员 course write Client、教师本人注销 Client。

当前仍需后续 Contract/模块任务处理：

1. 学生 workspace reload 只展示 `REVIEWED` 且有 currentReview 的记录；与“提交后默认有效”之间存在旧投影时序耦合，需要新 Contract 明确，不得由客户端继续猜测。
2. 教师 real mode 只有旧“重算/发布 StudentScore”链，没有“填写任意最终成绩并重新发布”的明确请求链。
3. 管理员耐力规则 demo/real 已统一为同一套 UI，但正式写入没有 Contract，当前 fail closed；不能把 demo localStorage mutation 标记为业务已完成。
4. 学期、系统模式、帮助、反馈、管理员账户等正式管理写能力当前仍是 demo-only local mutation；real mode 没有真实请求，不能标记为业务已完成。

## 后续保留、替换、删除与 Change Request

### 保留思想、替换旧边界

- 同源请求、统一 token refresh、幂等键、错误投影和 FormData/对象存储上传能力；
- 学生、教师、管理员已经确认的真实 Use Case；
- cursor 分页需要全量读取的需求，但具体 endpoint/envelope 由新 Contract 定义；
- Contract DTO 只停留在 API Adapter，UI / ViewModel / Use Case 使用 Domain/UI State；
- 真实失败不能回退 Mock success 的原则。

### 已实施的人工处置决定

- Web `add-sixty-minutes`、`exercise-records/{id}/resubmissions`、attempt-chain 产品 UI/适配器均已删除；
- 学生免登录 synthetic workspace 入口及关联 Fake Success、`joinConfirm` correction-request 非 real 写分支、demo-session 探测和 demo 登录边界均已删除；
- 无 UI 调用者的 admin demo service、admin create/update course Client、teacher/staff self account deletion Client、无调用 student detail/discard、重复 adapters、handoff patch 和旧 score-rule submit/approve 调用均已删除；
- `?sysmode=` 已限制为 `APP_ENV=qa`；
- `npm run api` / Web 内嵌 `backend/` 已从当前运行链删除，历史价值只通过 Git 保留。

### 必须交新 Contract / 对应模块任务

- Web 与 Android 免测媒体初始化 route 统一；
- 三角色工作区聚合、分页、缺失语义和避免 N+1 的读模型；
- 教师任意最终成绩填写/修改/发布 Contract；
- 管理员四套耐力跑换算表直接维护 Contract；
- 学期、系统模式、帮助、反馈、教师账号和分管理员的真实管理写接口；
- submitted 默认有效后的学生/教师投影时序；
- 是否保留通知、Web preferences、版本策略等平台差异能力。

本轮没有修改或提交 Contract Change Request；上列事项是下一 Contract Phase 的输入，不是本文作出的接口决定。

## 通过条件核对

| 条件 | 结果 |
|---|---|
| Web 所有实际网络请求形成清单 | PASS：学生、教师、管理员、公共认证、动态对象上传和非产品请求已分表 |
| 页面直接调用 HTTP | PASS：Backend URL 无页面直拼；UI 直调 API Client/service 位置已标出；两个非 Backend 页面 fetch 已单列 |
| 页面直接使用 Contract DTO | PASS：generated projection、raw JS response 与原始字段读取位置已标出 |
| 旧 Mock | PASS：学生运行时 review/Fake 已删除；Portal development-only demo/admin/roster 与 `TEST_ONLY` fixture 已分类；旧 Mock/Express Backend 已删除 |
| 测试按钮、调试入口、Fake Success、Mock 触发器、开发操作 | PASS：保留 60 项审计基线（2 / 34 / 7 / 17），17 个 `UNKNOWN` 已全部按人工决定实施，当前该批 `UNKNOWN=0` |
| 未使用旧 Client | PASS：已决策的无调用 client、重复 adapter 与旧 route family 已删除；明确 `TEST_ONLY` client 和 generated-only 声明单列 |
| Android 与 Web 语义冲突 | PASS：增加 60 分钟、重提、学生 local review 已解决；免测 upload route 冲突仍交新 Contract |
| Web 精确路径实施 | PASS：只修改授权的 `BNBU-Sports-Web-new/`；当前 Backend、Android、Contract 和业务权威文档未改 |
| UNKNOWN 未由旧实现补规则 | PASS：17 个运行边界由用户明确决策并实施；Contract/平台能力不明项仍保留 `UNKNOWN` |

## 阶段治理限制

用户已明确授权本轮写入 `docs/rebuild/STATUS.md` 与 `docs/rebuild/handoffs/`；实施结果、测试证据和后续 Contract 前置条件已同步，不扩展到业务权威文档或 Contract。
