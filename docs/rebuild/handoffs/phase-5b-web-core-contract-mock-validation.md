# Phase 5B Web：核心 Contract 与轻量 Mock 验证 / Re-validation handoff

> 最新 Re-validation 日期：2026-09-01（Asia/Shanghai）
>
> 当前完成状态：`PASS (1.1.0-contract WEB CONTRACT/MOCK GATE)`
>
> 当前锁定：`1.1.0-contract` / `RC` / SHA-256 `1d538483f96b95d777cc4dd02526b78a214bd663e036ea5a6c77f43dfa38d99d`
>
> 结论边界：Phase 5C 第 10 节的 Web validation-only binding、strict Mock、自动化与本地浏览器门禁已通过；正式 Web Legacy transport 尚未迁移，真实 Backend、权限、数据库、事务、并发、Staging 与发布仍未验证。下方原 2026-08-31 `1.0.0-contract` scoped validation 作为历史快照保留。

## 0. 2026-09-01 Phase 5B Re-validation

### 0.1 执行边界与基线

| 项目 | 结果 |
|---|---|
| Git 根目录 / 分支 | `C:\Users\23328\Desktop\new_version` / `API-contract-Making` |
| 起始 HEAD / 工作树 | `18782a5fa909c03179a72611f159a41e4f2c8dd8` / clean |
| 读取的 AGENTS | 根 [AGENTS.md](../../../AGENTS.md)；Portal [AGENTS.md](../../../BNBU-Sports-Web-new/portal-teacher-admin/AGENTS.md) |
| 权威输入 | [STATUS](../STATUS.md)、四份 [业务权威](../../business/README.md)、[Phase 5C handoff](phase-5c-contract-cr-consolidation.md) 第 10 节、当前 Contract metadata/OpenAPI、Web CR Bundle 与 Legacy Migration Findings |
| 允许写入 | 两个 Web 项目的 Phase 5B validation-only binding/fixture/test；既有 development-only preview；STATUS 与本 handoff；发现新 Web Contract 缺陷时才可新增 PROPOSED CR |
| 禁止且未修改 | `contracts/openapi.yaml`、Contract source/metadata/catalog/coverage、正式 Legacy transport/DTO/adapter、Android、Backend、数据库、四份业务权威、infra、部署与发布 |
| 并发变化 | 执行中共享工作区出现 Android re-validation 文件与 `CR-20260901-001`；本 Web Phase 只读核对，未覆盖、暂存、修改或计入 Web 修改文件 |

修改前执行 `npm run phase5b:contract:check` 得到真实失败：validation-only 门禁仍期望 `1.0.0-contract`，而根 metadata 已是 `1.1.0-contract`。该失败证明旧 binding 没有被错误当作新 Contract 通过；随后只机械重生两个 validation-only generated binding，并更新精确 Version/SHA 门禁，不接入正式学生 `api.js` 或 Portal `api-client.ts`。

### 0.2 Contract Version / SHA binding

| 项目 | 真实结果 |
|---|---|
| Contract version / status / base | `1.1.0-contract` / `RC` / `/api/v1` |
| 指定 SHA | `1d538483f96b95d777cc4dd02526b78a214bd663e036ea5a6c77f43dfa38d99d` |
| 根 OpenAPI 实际文件 SHA | PASS；与指定 SHA 完全相同 |
| `contract-metadata.json` | PASS；Version/status/base/SHA 与指定绑定一致 |
| Portal validation binding | `app/phase5b-contract.generated.ts`；机械生成及 `--check` PASS |
| 学生 Web validation binding | `frontend/student/phase5b-contract.generated.ts`；机械生成及独立 TypeScript/`--check` PASS |
| OpenAPI / Contract 修改 | 无；本轮没有运行 Contract build、没有修改 source/OpenAPI/metadata，也没有提升版本 |

### 0.3 Phase 5C Web re-validation 场景

| 场景 | 状态 | 真实验证结果 |
|---|---|---|
| Session 内容 / Idle / 错误 / start | PASS | 200 `ExerciseSession`、404 `RESOURCE_NOT_FOUND` Idle、401 认证、503 维护/依赖严格分离；只有 404+code 进入 Idle；Idle→`StartExerciseSessionRequest`→ACTIVE 闭环通过 |
| ACTIVE / PENDING profile | PASS | 两态 `StudentDashboard.student` required；ACTIVE 的 `studentStatus/progress.student` 与本人一致；PENDING 在 `course=null/progress=null` 时仍保留完整姓名、学号、性别、年级等公开 StudentSummary，不使用本地补造 |
| 邀请预览 | PASS | 扫码/手输共同使用 ACTIVE、EXPIRED、REVOKED、COURSE_CLOSED、NOT_CURRENT 五种 200 内容态并保留安全 course/expiresAt；未知/畸形为 422 `INVITATION_INVALID` |
| Record / application direct upload | PASS | Record image、Record video、application image allocation 都严格使用 Contract `PUT`、精确 requiredHeaders 和原始 byte body；过期后取得新 ID/URL/expiry，不复用旧签名 |
| Roster direct upload | PASS | CSV 与 XLSX 两种 request/content-type 均产生 `PUT + exact requiredHeaders + byte body`；过期后新 allocation；没有 multipart/硬编码私有 method |
| 媒体 finalization | PASS (WEB MOCK) | VERIFIED/REJECTED/EXPIRED 只用 200 `MediaFinalizationResult`；rejectionCode 不变量通过；依赖失败保持 `ErrorEnvelope`；幂等重放保持同一 committed result；没有 ErrorEnvelope 双通道 |
| 教师邀请管理 | PASS | refresh/relogin/other-device 后 `CourseInvitationPage` 恢复 ID/version/status/revocable；空数组合法；read fixture 无 raw code/digest；撤销版本冲突返回真实 `VERSION_CONFLICT` |
| 学期 summary | PASS | no current / one current / 2 UPCOMING / 2 ARCHIVED 均可表达；status filter 与 cursor page 不缩小 summary，summary 与同一 fixture snapshot 一致 |
| Feedback summary | PASS | 五状态、全零、pending=`WAITING+IN_PROGRESS+WAITING_TECH`、waiting-tech、completed 口径通过；search/category/status/page 不缩小 summary；处理/重开后 re-read 计数与 items 一致 |
| Help summary | PASS | PUBLISHED/DRAFT/ARCHIVED、全零、filter/page 不缩小 summary；create/publish/archive/republish 后每次 re-read 计数与 items 一致 |
| Sub-admin summary | PASS | 空、ACTIVE/DISABLED 混合、state filter 不缩小 total/active；公开 `AdminPermission` 闭集恰为 8 |
| Teacher Dashboard / current absence | PASS | current 内容态与 `currentSemester=null` 空态通过；null 时六项 current-work counts 为 0；standalone current absence 为 404；依赖故障不映射为空态 |
| `createCourse` | PASS | CURRENT 成功；UPCOMING/ARCHIVED/no-current 均为 409 `SEMESTER_NOT_CURRENT`；unknown ID 为 404 `RESOURCE_NOT_FOUND`；并发切换为冲突且不产生 Course/Fake Success |
| 私有/旧字段卫生 | PASS | 全量 re-validation fixture 未出现 `creditedDurationSeconds`、`publicComment`、`courseCode`、`teachingClassNumber`、`reviewStatus`、`resubmission`、raw invitation code/digest、`SEMESTER_NOT_UPCOMING` 或 `Fake Success` |

### 0.4 自动化、浏览器与真实结果

| 验证 | 真实结果 |
|---|---|
| 修改前 `phase5b:contract:check` | FAIL（预期且已记录）：expected `1.0.0-contract`，received `1.1.0-contract` |
| `python contracts/scripts/verify_contract.py` | PASS：109 paths / 121 unique operations / 192 schemas / 66 errors |
| `check_rc_readiness.py` | PASS：无 Contract PENDING，状态为 RC |
| `npm run typecheck` | PASS：旧 Portal snapshot 门禁、Portal/学生 1.1.0 Phase 5B binding `--check`、Portal/worker/学生 validation TypeScript 全部通过 |
| Phase 5B 定向 | PASS：旧 Mock + 新 re-validation 合计 `22/22`；最终新 re-validation 单独 `15/15` |
| Portal `npm test` | PASS：production build + `112/112` tests |
| 学生 `npm run test:student` | PASS：`79/79` smoke checks；这些是既有正式/Legacy 学生回归，不等于已经迁移到 1.1.0 |
| Web `npm run test:web` | PASS：preview runtime config checks |
| Portal `npm run lint` | PASS：0 error；5 条既有 `admin-service.ts` unused warning；本轮新增 warning 为 0 |
| Production build | PASS；保留既有 Node `punycode`、chunk >500 kB、vinext route-classification warning |
| 浏览器 DOM | PASS：本地 dev server 上学生/教师/管理员 × content/empty/error 共 `9/9` 预期内容全部命中 |
| 浏览器 console | PASS：九个场景 warning/error 均为 0 |
| 390×844 | PASS：九个场景均 `scrollWidth=383 <= innerWidth=390`，无横向溢出；随后恢复默认视口 |
| OpenAPI SHA 复核 | PASS：结束前仍为指定 SHA，OpenAPI 未变化 |
| Backend/PostgreSQL/COS/E2E/Staging/Production | NOT EXECUTED：无真实实现证据或不在本 Phase 授权范围；Mock/build 不替代产品验收 |

浏览器证据来自 development-only `/phase5b-contract-mock`，不是正式登录或产品入口。因端口 4300 已被既有本地进程占用，本轮受控 dev server 使用自动选择的 4301；HTTP 与 DOM 均来自同一工作区当前代码。

### 0.5 新增 CR、Legacy API 与最终条件

- Web 本轮新增 Contract CR：**0**。所有 Phase 5C Web 清单项都能由 `1.1.0-contract` 公开字段/status/schema/response 严格表达。
- 共享工作区并发出现 [CR-20260901-001](../../../contracts/change-requests/CR-20260901-001-android-media-finalization-codegen.md)，状态 `PROPOSED`，来源为 Android Phase 5A Kotlin/Gson codegen。它不是本 Web Phase 创建或修改；Web `openapi-typescript` binding 与现有 wire fixture 可消费当前 shape。若该 CR 后续接受并提升 Contract，Web 必须按新 Version + SHA 重跑本节，不能保留兼容 shim。
- Legacy API：**REMAINS / NOT MIGRATED**。排除 `phase5b-*` validation-only 文件后，`3.0.0-web-snapshot | creditedDurationSeconds | publicComment` 仍命中 15 个 Web 文件；正式 transport center 仍是学生 `frontend/student/js/api.js` 与 Portal `app/api-client.ts`。
- Phase 5B 最终通过条件：**PASS（仅 Contract/strict Mock/client validation gate）**。不表示正式 Web 已迁移，不表示 Backend、数据库、COS、权限、事务/并发、跨端 E2E、Staging、Production、部署或发布通过。

### 0.6 Re-validation 阶段结束报告

```text
完成状态：DONE（PASS：WEB CONTRACT/MOCK GATE）
修改文件：两个 Web validation-only generated binding、strict fixture/test、development-only preview、Portal scripts/package/tsconfig、STATUS 与本 handoff；并发 Android/CR 文件未归入本轮
执行的测试：Contract verify/RC readiness、双 binding check、Portal/worker/学生 validation typecheck、定向/完整 unit+build、student smoke、web runtime、lint、九个浏览器内容/空/错态、console、390x844
真实测试结果：全部 Web re-validation 门禁 PASS；Portal 112/112，student 79/79，定向 22/22，lint 0 error/5 existing warning，浏览器 9/9 且 console 0
未执行测试及原因：真实 Backend/PostgreSQL/COS/权限/事务/并发/跨端 E2E/Staging/Production 未实现、无环境证据或越出本阶段边界
是否修改了业务规则：否
是否修改了 Contract：否；保持 1.1.0-contract / RC / 指定 SHA
是否存在旧 API 引用：是；正式 Legacy transport 与 15 个关键签名命中文件仍存在，未迁移
是否存在 Mock、TODO、空接口：存在 development-only strict Mock 与既有 Portal demo；未新增 TODO、Backend stub、空接口、Fake Success、客户端私有字段或兼容逻辑
下一阶段前置条件：Android PROPOSED CR 若接受则提升 Contract 并让 Web 重新绑定；Phase 7 再迁移 Legacy；真实 Backend 后做 conformance/E2E/Staging gate
```

## 1. Phase 开场基线

| 项目 | 结果 |
|---|---|
| Git 根目录 | `C:\Users\23328\Desktop\new_version` |
| 分支 | `API-contract-Making` |
| 起始 HEAD | `ab7dbec139bd5a14896ac41a4ca6b9eb17442bd3` |
| 起始工作区 | 非 clean；只有 Phase 5A 的 `docs/rebuild/STATUS.md`、`contracts/change-requests/CR-20260831-001-active-session-empty-state.md`、`docs/rebuild/handoffs/phase-5a-android-core-contract-mock-validation.md` 未提交变化；本轮保留且未覆盖或顺带存档 |
| 已读取 AGENTS | 根 [AGENTS.md](../../../AGENTS.md)；Portal [AGENTS.md](../../../BNBU-Sports-Web-new/portal-teacher-admin/AGENTS.md) |
| 权威输入 | [STATUS](../STATUS.md)、[Phase 0B scope](../00-scope.md)、四份 [业务权威](../../business/README.md)、[Phase 5A handoff](phase-5a-android-core-contract-mock-validation.md)、[Contract README](../../../contracts/README.md)、coverage、operation catalog、database support、metadata 与 OpenAPI |
| 允许实现目录 | `BNBU-Sports-Web-new/`；治理输出为 `docs/rebuild/STATUS.md`、`docs/rebuild/handoffs/`；Contract 缺口只允许新增 CR |
| 禁止实现目录 | Android、Backend、Contract source/OpenAPI/metadata、业务文档、数据库、infra、E2E 和其他未授权目录 |

## 2. 为什么采用隔离轻量预览

现有 Portal 完整 Demo 仍绑定 `3.0.0-web-snapshot`，教师/管理员页面还消费旧生成类型、adapter 和页面模型。把整套 Demo 一次迁到根 RC 会同时影响登录、refresh/error、教师全工作区、管理员全工作区、名单、测试和旧 snapshot 门禁，不符合 Phase 5 的低成本验证目标。

本轮新增 development-only 路由：

```text
http://127.0.0.1:4300/phase5b-contract-mock?role=teacher&scenario=content
http://127.0.0.1:4300/phase5b-contract-mock?role=teacher&scenario=empty
http://127.0.0.1:4300/phase5b-contract-mock?role=teacher&scenario=error
http://127.0.0.1:4300/phase5b-contract-mock?role=admin&scenario=content
http://127.0.0.1:4300/phase5b-contract-mock?role=admin&scenario=empty
http://127.0.0.1:4300/phase5b-contract-mock?role=admin&scenario=error
```

该路由不接管正式登录或 workspace，也不进入 Backend fallback。它只消费独立生成的当前根 RC 类型和直接 object literal fixture；完整旧 Demo 保持原状，后续按 Vertical Slice 迁移。

## 3. 唯一 RC 绑定

| 项目 | 结果 |
|---|---|
| Version | `1.0.0-contract` |
| Status | `RC` |
| public base path | `/api/v1` |
| OpenAPI SHA-256 | `ff15441b84f0729626a49c6898ea4896e80321b8e873a933768a509fd4c8478f` |
| 根 OpenAPI 生成类型 | [phase5b-contract.generated.ts](../../../BNBU-Sports-Web-new/portal-teacher-admin/app/phase5b-contract.generated.ts)；由 `openapi-typescript ../../contracts/openapi.yaml --immutable --alphabetize` 机械生成 |
| 门禁 | `verify-phase5b-contract.mjs` 同时核对 metadata Version/Status/base path/SHA、OpenAPI 实际 SHA，并用生成命令 `--check` 防止类型漂移 |
| 本轮是否修改 Contract | 否；`contracts/src/`、OpenAPI、metadata、catalog 和 coverage 内容均未修改 |

Portal 原 `3.0.0-web-snapshot` 门禁仍继续执行。新门禁不是把旧 snapshot 宣称为 RC，而是让隔离 Phase 5B route 同时明确消费根 RC；正式 Portal 尚未完成替换。

## 4. UI → Contract → 数据库静态矩阵

| 页面 / Use Case | UI 需要 | 当前 RC 提供 | 数据库设计支持 | 结论 |
|---|---|---|---|---|
| 教师密码登录 | 登录类型、identifier、成功 actor/过期时间；失败 code/requestId | `PasswordSessionRequest → 201 SessionTokenPair`；错误为 `ErrorEnvelope` | account/session/credential 关系已设计 | `PASS (MOCK UI / STATIC DB)` |
| 本人课程入口 | 学期、课程名称、责任教师、时间窗、两类目标、成员数、状态 | `CoursePage.items[] / Course / SemesterSummary / CourseTargets` | Course/current target pointer、teacher index、Enrollment count 可支持 | `PASS` |
| 打卡复核列表 | 学生、业务日期、实际时长、计入分钟、当前结果 | `ExerciseRecordPage / ExerciseRecord / RecordReviewSummary` | Session/Record、current review、每日唯一与查询索引可支持 | `PASS` |
| 打卡详情 | 说明、媒体、提交时间、学生可见原因 | `ExerciseRecord.media / description / submittedAt / currentReview.studentVisibleReason` | purpose-aware media metadata 与 current review 可支持 | `PASS` |
| 追加审核 | VALID/INVALID、学生可见原因、expectedVersion、追加历史 | `AppendRecordReviewRequest → 201 RecordReview`；409/412/错误集合已声明 | append-only Review/current pointer、version/command unique 可支持 | `PASS` |
| 课程进度 | 两类目标、Record/认证分钟、封顶、剩余、总分钟、展示百分比 | `StudentCourseProgressPage / ProgressCategory` | progress view 和 Record/current certification indexes 可支持 | `PASS` |
| 管理员概览 | mode、当前学期、学生/教师摘要、耐力规则、5 项健康状态 | `AdminDashboard / SystemMode / Semester / HealthStatus` | mode singleton、学期、账户摘要和健康 projection 可构造 | `PASS` |
| 当前课程目录 | 三项汇总、课程/教师/状态、Record 有效/无效、累计与人均分钟 | `AdminCurrentCourseDirectory / AdminCurrentCourseItem / Metrics` | 学生级封顶统计 view、Course/Enrollment/Record indexes 可支持 | `PASS` |

本矩阵中的数据库结论只表示 Phase 3 关系、约束、索引和 view 在静态设计上可支持查询；没有 migration、运行中 PostgreSQL、RLS、query plan、事务或并发证据。

## 5. “待审核列表”业务边界

用户列出的重点页面包含“待审核列表”，但四份当前业务权威已经明确：

- Record 提交成功即形成正式事实，当前结果默认为 `VALID`；
- 不存在正式 `PENDING / SUBMITTED / APPROVED / REJECTED` 审核链；
- 教师是事后复核并追加 `INVALID`，或追加新的 `VALID` 纠正；
- 原 Record、媒体、计入分钟和审核历史不可覆盖。

因此本轮页面使用“打卡复核列表与详情”，不建立 `PENDING` 字段、待审核状态、客户端筛选标志或 Fake queue。`listCourseExerciseRecords` 当前允许按 `reviewResult=VALID|INVALID` 查询，足以支持确认后的复核列表语义；这不是 Contract 缺口，也不需要 CR。

## 6. 严格 Mock 与状态表达

严格 fixture 位于 [phase5b-contract-fixtures.ts](../../../BNBU-Sports-Web-new/portal-teacher-admin/app/phase5b-contract-fixtures.ts)，所有对象 literal 使用当前 RC 生成 schema 的 `satisfies` 约束。定向测试同时检查旧签名没有进入本组 fixture。

| 状态族 | 严格表达 |
|---|---|
| 教师内容 | `SessionTokenPair`、`CoursePage.items[1]`、`ExerciseRecordPage.items[1]`、`AppendRecordReviewRequest/RecordReview`、`StudentCourseProgressPage.items[1]` |
| 教师空态 | `CoursePage.items=[]`、`ExerciseRecordPage.items=[]`、无 Record 时不构造审核请求、`StudentCourseProgressPage.items=[]` |
| 教师错误 | `INVALID_CREDENTIALS ErrorEnvelope`；课程/Record/审核/统计使用 `DEPENDENCY_UNAVAILABLE ErrorEnvelope`，原事实不伪造或改写 |
| 管理员内容 | `SessionTokenPair`、`AdminDashboard`、`AdminCurrentCourseDirectory.items[1]` |
| 管理员空态 | `AdminDashboard.currentSemester=null` 与数量 0；目录 summary 三项为 0 且 `items=[]` |
| 管理员错误 | 登录、dashboard 和目录都使用已声明 `ErrorEnvelope`；包含稳定 code、message、requestId、details=null |

确认未进入本组 fixture 的旧字段/状态包括：

```text
creditedDurationSeconds
publicComment
courseCode
teachingClassNumber
reviewStatus
resubmission
```

`actualDurationSeconds` 与 `creditedMinutes` 分开显示；`displayPercent` 只作为 UI 整数显示，业务边界继续使用原始整数分钟。

## 7. 浏览器与测试证据

### 修改前基线

| 验证 | 真实结果 |
|---|---|
| `npm run typecheck` | PASS；旧 `3.0.0-web-snapshot` binding/check 和两个 TypeScript project 均通过 |
| `npm test` | PASS；production build + `90/90` tests |

### 修改后

| 验证 | 真实结果 |
|---|---|
| `npm run typecheck` | PASS；旧 snapshot 门禁、Phase 5B root RC metadata/SHA/生成检查、两个 TypeScript project 全部通过 |
| 定向 `node --import tsx --test tests/phase5b-contract-mock.test.mjs` | PASS；`7/7` |
| `npm test` | PASS；build 识别 `/phase5b-contract-mock`，完整 `97/97` tests |
| `npm run lint` | PASS；0 error；5 条 warning 均为既有 `admin-service.ts` unused 项，本轮新增文件 warning 为 0 |
| 最终静态卫生检查 | `git diff --check` PASS；10 个本轮文本文件严格 UTF-8 且无行尾空白；STATUS/handoff 相对链接检查 PASS；root OpenAPI SHA 仍为声明值 |
| build warning | 保留既有 Node `punycode` 弃用、chunk >500 kB、vinext route classification warning；均非本轮新增失败 |
| 教师内容 DOM | 登录、课程、Record 列表/详情、追加审核、两类进度字段全部可见；Token 未渲染 |
| 教师空态 | 4 个空态分别可见：无课程、无 Record、无可审核 Record、无成员进度 |
| 教师错误态 | 登录、课程、Record、审核、统计 5 个错误状态分别可见 |
| 管理员内容 DOM | 登录、系统概览、5 个健康项、课程目录 summary/metrics 全部可见 |
| 管理员空态 | `currentSemester=null` 显示“暂无”，目录 `items=[]` 显示空态 |
| 管理员错误态 | 登录、dashboard、目录 3 个 `ErrorEnvelope` 错误分别可见 |
| 浏览器 console | 教师/管理员内容、空态、错误态 warning/error 均为 0 |
| 390×844 响应式 | `innerWidth=390`、`scrollWidth=383`、无横向溢出；视觉检查通过，随后恢复默认视口 |

浏览器证据来自本地 development server，不是正式部署 artifact、真实登录或 Backend E2E。

## 8. 剩余旧 Web 边界

本轮没有把隔离预览结论扩大为完整客户端迁移。按 `3.0.0-web-snapshot | creditedDurationSeconds | publicComment` 复扫、排除本轮 `phase5b-*` 后，当前 Web 仍有 15 个命中文件，主要包括：

- 学生 `frontend/student/js/api.js`、`screens/checkin.js` 与 smoke；
- Portal `openapi.snapshot.yaml`、`contract.json`、`openapi.generated.ts`；
- `api-client.ts`、`teacher-api-types.ts`、`teacher-data.ts`、`teacher-workspace.tsx`、`admin-courses.tsx`；
- 旧 contract/checkin/input tests。

另有一个与当前业务权威直接冲突的既有 Demo 边界：`admin-users.tsx` 仍以 `assignedCourseCount > 0` 禁用教师账号删除，并提示必须先课程交接。`P4-DECISION-05` 已撤销这一 blocker；本轮管理员代表 Slice 只覆盖概览和课程只读目录，因此按跨 Slice 规则记录但不顺带修改。后续独立管理员账号 Slice 必须移除该查询、禁用条件和文案，且不得修改或转移课程责任教师。

## 9. 修改文件

### Web 实现责任目录

- `portal-teacher-admin/package.json`
- `portal-teacher-admin/app/phase5b-contract.generated.ts`
- `portal-teacher-admin/app/phase5b-contract-fixtures.ts`
- `portal-teacher-admin/app/phase5b-contract-mock.tsx`
- `portal-teacher-admin/app/phase5b-contract-mock.module.css`
- `portal-teacher-admin/app/phase5b-contract-mock/page.tsx`
- `portal-teacher-admin/scripts/verify-phase5b-contract.mjs`
- `portal-teacher-admin/tests/phase5b-contract-mock.test.mjs`

### 治理输出

- `docs/rebuild/STATUS.md`
- `docs/rebuild/handoffs/phase-5b-web-core-contract-mock-validation.md`

## 10. Phase 结束状态

```text
完成状态：DONE (SCOPED VALIDATION)
修改文件：Web 8 个文件，治理输出 2 个文件；未覆盖 Phase 5A 的 3 个既有未提交变化
执行的测试：Portal 修改前/后 typecheck、修改前/后完整 tests/build、lint、Phase 5B 定向测试、RC SHA/生成门禁、六个浏览器场景、移动视口
真实测试结果：typecheck PASS；定向 7/7；完整 97/97；lint 0 error / 5 个既有 warning；六个浏览器场景与 390×844 通过；console warning/error 0
未执行测试及原因：真实 Backend、数据库、权限、事务、并发、E2E、Staging/Production 均无本轮实现或越出授权范围
是否修改了业务规则：否；只按现有权威把“待审核列表”收口为事后复核列表
是否修改了 Contract：否；根 Contract 保持 1.0.0-contract / RC / 原 SHA
是否存在旧 API 引用：是；完整 Web 仍绑定旧 snapshot/adapter，15 个文件命中关键旧签名
是否存在 Mock、TODO、空接口：存在 development-only Phase 5B strict Mock 和既有 Portal demo；本轮未新增 TODO、Backend stub、空接口或 Fake Success
下一阶段前置条件：逐 Slice 迁移正式 Web adapter/UI；移除旧 Record 字段和教师删除交接 blocker；真实 Backend 后再做 conformance/E2E
```

## 11. 证据边界

- `DONE` 只适用于本轮选定的低成本 UI/Contract/数据库静态验证；
- development-only Mock 不是正式登录、正式审核、真实数据或权限证据；
- production build 通过不代表部署或发布；
- Contract status 仍是 `RC`，不是 `APPROVED` 或 `LOCKED`；
- Phase 5A 的 `CR-20260831-001` 仍为 `PROPOSED`，本轮没有接受、拒绝或修改它；
- 未 Push、Merge、Tag、部署或发布。
