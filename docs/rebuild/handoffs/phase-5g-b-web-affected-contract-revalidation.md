# Phase 5G-B Web Affected Contract Re-validation handoff

> 日期：2026-09-01（Asia/Shanghai）
>
> 完成状态：`DONE`
>
> Phase 5G-B 最终状态：`PASS`

## 1. 执行基线与边界

| 项目 | 结果 |
|---|---|
| Git 根目录 | `C:\Users\23328\Desktop\new_version` |
| 分支 | `API-contract-Making` |
| 起始 HEAD | `3e0f16091307f0a37e055afe8b14b6884367f11e` |
| 结束时共享 HEAD | `6eb4918e0cabe08c7b38929eac028be69be9d350`；由并发 Phase 5G-A 本地存档推进，本阶段未 commit |
| 起始工作区 | CLEAN；开始时 `git status --short` 无输出 |
| 已读取 AGENTS | 根 [AGENTS.md](../../../AGENTS.md)；Portal [AGENTS.md](../../../BNBU-Sports-Web-new/portal-teacher-admin/AGENTS.md)；Student 目录无更深层 AGENTS |
| 当前 Phase | Phase 5G-B Web Affected Contract Re-validation |
| 允许写入 | Student/Portal generated validation binding、affected fixture/test、必要 mapper/UI Contract 修正、[STATUS](../STATUS.md) 与本 handoff |
| 禁止写入 | OpenAPI、metadata/version/SHA、业务权威、Android、Backend、数据库/migration、完整 Legacy Migration、deployment |
| 禁止操作 | Commit、Push、Merge、Tag、Deploy、Phase 7B Legacy Migration |

Portal 子目录 AGENTS 的自动 commit 要求与本阶段用户明确的 `不得 Commit` 冲突，按更高优先级的本阶段限制未 commit。

执行期间工作树出现另一组 Phase 5G-A Android 修改、Android test 与 STATUS/handoff，随后该任务独立形成本地 commit `6eb4918` 并推进共享分支；它们不是本阶段创建或修改的内容。本阶段未回退、暂存、提交或计入 Web 测试结论，并在修改 STATUS 时保留了并发 Phase 5G-A 内容。

## 2. 权威输入与固定 Contract

已读取：根/Portal AGENTS、[STATUS](../STATUS.md)、[Phase 5C.2](phase-5c2-final-contract-consolidation.md)、[Phase 5F](phase-5f-contract-domain-database-alignment.md)、[Phase 5B](phase-5b-web-core-contract-mock-validation.md)、[Phase 5D-B](phase-5db-web-full-contract-surface-audit.md)、[Phase 5E](phase-5e-remaining-business-decision-closure.md)、四份 Phase 2 业务权威、当前 [OpenAPI](../../../contracts/openapi.yaml) 与 [metadata](../../../contracts/contract-metadata.json)。旧 Web API/DTO 仅作为 Legacy Migration Evidence。

| 检查 | 真实结果 |
|---|---|
| Contract Version | `1.2.0-contract` |
| Contract Status | `RC` |
| public base path | `/api/v1` |
| metadata SHA-256 | `667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a` |
| OpenAPI 实际 SHA-256 | `667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a` |
| Contract verify | PASS：109 paths / 121 unique operations / 193 schemas / 66 errors |
| RC readiness | PASS |
| OpenAPI / metadata / Version / SHA 修改 | 无 |

修正前现场运行旧 `phase5b:contract:check` 明确失败：Student/Portal validation pin 仍指向 `1.1.0-contract` 与旧 SHA。没有静默继续；本阶段只更新 validation binding/generation output 到固定 1.2，并在修正后重跑全部门禁。

## 3. Portal / Student generated binding

| 项目 | Student Web | Portal |
|---|---|---|
| pin | `1.2.0-contract / RC / 667ae...d74a` | `1.2.0-contract / RC / 667ae...d74a` |
| `openapi-typescript --check` | PASS | PASS |
| generated file SHA | `5cd91037cabe198fff7d7208d1645d2357399d15d45c6802f0d03eec271b8a4d` | `5cd91037cabe198fff7d7208d1645d2357399d15d45c6802f0d03eec271b8a4d` |
| generated drift | 无；两端文件逐字节一致 | 无；两端文件逐字节一致 |
| `CertificationKind` | `"SCHOOL_TEAM" | "STUDENT_CLUB"` | 同左 |
| `CertificationDetails.certificationKind` | required、non-null、`components["schemas"]["CertificationKind"]` | 同左 |
| `UpdateSubAdminRequest` | name / verifiedEmail / department / permissions / expectedVersion；无密码字段 | 同左 |

`openapi-typescript 7.13.0` 在当前无 explicit mapping 的 discriminator 上把 `CreateCertificationApplicationRequest.applicationType` 错推为 schema 名字面量。根 OpenAPI wire 值仍正确为 `CERTIFICATION`，且本阶段禁止修改 Contract。Student affected adapter 因此以显式 `CreateCertificationApplicationWireRequest` 隔离此 codegen 工具缺陷，并通过运行时 closed-object parser 保证 JSON 只发送 `applicationType: "CERTIFICATION"`。该项记为 `CLIENT_DEFECT-5GB-02`，不是 Contract CR；生成物仍保持工具确定性输出，未手改 generated file。

## 4. CertificationKind request、response 与 round-trip

### Student Web

| 场景 | Request binding | JSON | response 回显 | 结果 |
|---|---|---|---|---|
| `SCHOOL_TEAM` | typed wire adapter + generated `CertificationDetails` | `certificationKind` required/non-null | `SCHOOL_TEAM` 原值 | PASS |
| `STUDENT_CLUB` | typed wire adapter + generated `CertificationDetails` | `certificationKind` required/non-null | `STUDENT_CLUB` 原值 | PASS |

两类均执行 `typed fixture → JSON serialize/parse → closed-object validation → StudentApplication response → UI read`。组织名称只作为展示字段；mapper/parser 不读取 `organizationName`、`teamName` 或旧 `applicationSubtype` 推断 kind。

非法输入门禁：未知 enum、字段缺失、`null`、`applicationSubtype`、`teamName`、extra private field 与 null certification 均 fail closed。定向测试全部通过。

### Teacher Web response surface

| operationId | response shape | `certificationKind` |
|---|---|---|
| `createStudentApplication` | `StudentApplication` | PASS |
| `supplementStudentApplication` | `StudentApplication` | PASS |
| `listOwnApplications` | `StudentApplicationPage` | PASS |
| `getOwnApplication` | `StudentApplication` | PASS |
| `listCourseApplications` | `StudentApplicationPage` | PASS |
| `getCourseApplication` | `StudentApplication` | PASS |
| `decideStudentApplication` | `StudentApplication` | PASS |

Teacher validation UI 的申请列表/详情/决定直接显示 `SCHOOL_TEAM` 或 `STUDENT_CLUB`，不以组织名称猜分类。两类 request/response round-trip 全部保持原值。

## 5. Teacher/Admin password lifecycle

`CurrentActor.mustChangePassword` 为 required boolean；Teacher/Admin fixture 分别验证以下恢复链：

```text
createPasswordSession → refreshSession → getCurrentActor (/me)
→ page reload → new session → mustChangePassword=true
```

gate 不只存在前端内存。定向 test 断言 login、refresh、`/me` 的响应 schema 和五个恢复点；浏览器对 Admin gate validation page 做完整 reload 后仍显示同一 `CurrentActor` gate、45/45 与 10/10。

### Admin 45/45 gated operationId

```text
authorizeAuditArchiveDownload, changeOwnVerifiedEmail, createHelpArticle,
createSemester, createSubAdmin, createTeacherAccountBatch, deleteOwnAccount,
deleteSubAdmin, deleteTeacherAccount, getAdminDashboard,
getAuditArchiveJob, getAuditEvent, getCurrentCourseForAdmin,
getCurrentSemester, getEnduranceRuleTable, getFeedbackForAdmin,
getHelpArticleForAdmin, getOwnAccountDeletionImpact,
getOwnUnreadNotificationCount, getStudentAccount, getSubAdmin,
getTeacherAccount, listAuditEvents, listCurrentCoursesForAdmin,
listEnduranceRuleTables, listFeedbackForAdmin, listHelpArticlesForAdmin,
listOwnNotifications, listSemesters, listStudentAccounts, listSubAdmins,
listSystemModeTransitions, listTeacherAccounts, markOwnNotificationRead,
processFeedback, requestAuditArchive, reviseEnduranceRuleTable,
setSubAdminState, switchCurrentSemester, switchSystemMode,
transitionHelpArticleState, updateHelpArticle, updateSubAdmin,
updateUpcomingSemester, validateTeacherAccountBatch
```

以上 45 个 operation 均精确声明 `403 FIRST_PASSWORD_CHANGE_REQUIRED`；test 从当前 OpenAPI `operationId`/`x-error-codes` 枚举后与 fixture exact-set 比较，45/45 PASS。

### 10/10 gate-safe operationId

```text
requestAuthChallenge, createPasswordSession, refreshSession, resetPassword,
getCurrentActor, changeOwnPassword, logoutCurrentSession, logoutAllSessions,
getAppReleasePolicy, getSystemMode
```

以上 10 个 operation 保持 gate-safe，10/10 PASS；没有自行增删 gate 范围。

### change / reset / disabled / session

| 语义 | 结果 |
|---|---|
| `changeOwnPassword` | PASS；清除 gate，当前 session `PRESERVED`，其他 session `REVOKED`，后续 actor 为 false |
| `resetPassword` | PASS；设置本人最终个人密码，清除 gate，全部旧 session `REVOKED`，不签发 token、不自动登录 |
| disabled `changeOwnPassword` | PASS；403 `ACCOUNT_DISABLED` |
| disabled `resetPassword` | PASS；403 `ACCOUNT_DISABLED`，credential/gate/access state 不变 |
| `INVALID_CREDENTIALS` fallback | 未用于伪装 disabled；affected fixture 无 silent fallback |
| 自动恢复 disabled | 不存在 |

## 6. createSubAdmin / UpdateSubAdminRequest

- `createSubAdmin` fixture 与产品 UI 将 initial password 明确标为 temporary credential；新 Sub-admin 首次 actor 为 `mustChangePassword=true`。
- Admin 正式本地 preview 的 create dialog 显示“临时初始密码”“首次登录后必须修改”“mustChangePassword 初始为 true”。
- `UpdateSubAdminRequest` generated schema、fixture、form model、mapper/source scan 与浏览器 edit dialog 全部没有 `newPassword`、`confirmNewPassword`、`password`、`temporaryPassword` 或 credential substitute。
- UI form model 改为 create/update discriminated union；update branch 不含密码属性，save update 不再计算或替换 credential。
- 浏览器现场 edit dialog 的 `input[type=password]` 数量为 `0`，并明确说明“本次更新只发送资料、权限和版本”。

## 7. 禁止密码规则扫描

个人 Teacher/Admin 密码 UI 已删除私有 12 位限制、`minLength={12}` 与对应提示，保留业务权威接受的非空和确认一致性。

affected generated binding、fixture、Portal personal-password UI 与 tests 的源扫描结果：

```text
PASSWORD_POLICY_VIOLATION = 0
TOO_LONG = 0
BLOCKLISTED = 0
SAME_AS_CURRENT = 0
private 12-character rule = 0
```

Portal 的 Teacher batch initial-password 规则属于业务权威接受的管理员创建教师初始强密码，不是本人 personal-password 私有规则，未删除。

## 8. Browser validation

通过 Browser skill 使用本地已构建/开发页面完成真实 hydration 与 console 检查；没有以 SSR HTML 代替浏览器结果。

| Surface | 浏览器结果 |
|---|---|
| Student validation content | `SCHOOL_TEAM` 与 `STUDENT_CLUB` 的选择/JSON/回显同时可见；无名称/旧 subtype 推断文案 |
| Teacher validation content | list/detail/decision 显示两类 kind；本人改密 true→false、当前 session preserved、其他 revoked |
| Teacher error | change/reset 均显示 `ACCOUNT_DISABLED`；reset 明确不能恢复访问 |
| Admin gate | 45/45、10/10、CurrentActor 恢复；完整 reload 后仍一致 |
| Admin blocked operation | `403 FIRST_PASSWORD_CHANGE_REQUIRED` 可见；disabled reset 为 `ACCOUNT_DISABLED` |
| Admin createSubAdmin product UI | temporary initial credential、首次修改、mustChangePassword=true 文案可见 |
| Admin UpdateSubAdmin product UI | edit dialog 0 个 password input；只含资料/权限/version 语义 |
| Admin self reset validation | old sessions revoked、issued session false、后续 `/me` gate false |
| console | hydrated validation tab 0 error/warning；Admin product preview tab 0 error/warning |
| UI crash / undefined / null | 未出现 |

正式 Student SPA `http://127.0.0.1:4174/student/` 登录壳现场加载且 console 为空；认证申请页需要真实 Backend/账号，本阶段未输入真实邮箱、未伪造登录，故正式旧 runtime 的认证交互为 `NOT EXECUTED / LEGACY_MIGRATION`。Admin 产品验证使用明确的本地 `?mock=admin` preview，不向真实 Backend 写入；为检查 edit dialog 创建了本地 preview-only `phase5gb.review` 记录，没有真实账号或外部写入。

最初针对 4300 的 production-preview 探测发现 asset 404；最终进程核对证明该端口实际由本轮开始前已存在的 `vinext dev` 进程占用，因此这组证据被丢弃，不能归因 `vinext start` 或产品。独立 `vinext build` PASS；受影响 UI 使用本轮独立 dev 端口 4301 完成真实 hydration/console 验证。该环境端口冲突不计 UI/Product Finding。

## 9. Legacy runtime 边界与问题分类

### 正式 runtime

- Student `js/api.js` / `js/screens/services.js` 仍以 `applicationSubtype`、`organizationName` 表达认证；`REMAINS / NOT MIGRATED`。
- Teacher `teacher-data.ts` 仍从旧 `applicationSubtype` 映射显示分类；`REMAINS / NOT MIGRATED`。
- Portal `api-client.ts`、正式 session/UI 尚未以 1.2 generated binding 驱动完整 mustChangePassword gate/disabled lifecycle；`REMAINS / NOT MIGRATED`。
- Portal 的 `3.0.0-web-snapshot`、旧 endpoint/DTO/client 继续存在；没有删除或全量替换。

本阶段确认 3 个 affected Legacy Migration cluster；Phase 5D-B 的完整 24-bundle 清单保持有效。未切换 121 个正式 operation、未接真实 Backend、未删除旧 client、未进入 Phase 7B。

### 新问题分类

| 分类 | 数量 | 结果 |
|---|---:|---|
| `CONTRACT_CR` | 0 | 当前 1.2 Contract 能表达全部已确认 affected 语义 |
| `CLIENT_DEFECT` | 4 | CD-01 stale 1.1 validation binding（fixed）；CD-02 discriminator codegen literal（wire adapter contained，generated output 不手改）；CD-03 Portal 私有 12 位规则（fixed）；CD-04 UpdateSubAdmin UI 密码编辑（fixed） |
| `LEGACY_MIGRATION` | 3 affected clusters | Student certification、Teacher certification、Portal auth/password；全部 remains/not migrated；Full audit 24 bundles 不变 |
| `UI_PRODUCT_FINDING` | 0 | 4300 的 stale asset 证据经进程核对为既存 dev 端口冲突，已丢弃，不归因产品 |
| `NEEDS_BUSINESS_DECISION` | 0 | 无新业务歧义 |

## 10. 测试与构建证据

| 命令 / 门禁 | 本阶段真实结果 |
|---|---|
| `python contracts/scripts/verify_contract.py` | PASS：109 / 121 / 193 / 66 |
| `python contracts/scripts/check_rc_readiness.py` | PASS |
| `npm run phase5gb:contract:check` | PASS；Version/Status/SHA + Student/Portal `openapi-typescript --check` |
| `npm run typecheck` | PASS；Portal、worker、Student validation tsconfig 全部通过 |
| `npm run test:phase5gb` | PASS：13/13 |
| Portal `npm test` | PASS：125/125；命令内含 production build |
| Student `npm run test:student` | PASS：79/79 |
| Web preview `npm run test:web` | PASS |
| `npm run lint` | PASS：0 error / 5 warning；warning 均为既有 `admin-service.ts` 未使用符号 |
| `npm run build` / `vinext build` | PASS；5/5 stages；有既有 punycode deprecation 与 chunk-size warning |
| Browser hydration / DOM / console | PASS on `vinext dev`；affected validation + Admin product UI，无 console error/warning |
| `git diff --check`（Web scope） | PASS；仅 Git 提示未来 LF→CRLF 转换，无 whitespace error |

执行过程中的真实失败也未隐藏：修正前旧 1.1 binding check 失败；首版 5G-B test 因测试 YAML parser 与两条 description 文案正则失败；首次全量 124/125 因新增 i18n 文案未登记失败；4300 首次浏览器探测因 stale asset 未 hydration。前三类实现/测试问题均在允许范围修正并重跑为 PASS；4300 证据经最终进程核对确认为既存 dev 端口冲突而丢弃，另启 4301 后 browser PASS。

## 11. 最终 34 项输出

| # | 要求 | 结果 |
|---:|---|---|
| 1 | Phase 5G-B 最终状态 | `PASS` |
| 2 | Contract Version | `1.2.0-contract` |
| 3 | Contract SHA | `667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a` |
| 4 | Portal binding | PASS；1.2/RC/SHA 精确匹配，generated check PASS |
| 5 | Student Web binding | PASS；1.2/RC/SHA 精确匹配，generated check PASS |
| 6 | CertificationKind generated type | `SCHOOL_TEAM | STUDENT_CLUB`；required/non-null typed ref |
| 7 | SCHOOL_TEAM 场景 | PASS；request/JSON/response/UI 回显保持 |
| 8 | STUDENT_CLUB 场景 | PASS；request/JSON/response/UI 回显保持 |
| 9 | Certification response surfaces | 7/7 PASS |
| 10 | Certification round-trip | 两类均 PASS；不推断、不 fallback |
| 11 | Teacher/Admin mustChangePassword | PASS；login/refresh/`/me`/reload/new-session 均恢复 |
| 12 | Admin 45/45 gate | PASS；exact operationId set |
| 13 | 10/10 gate-safe | PASS；exact operationId set |
| 14 | changeOwnPassword | PASS；gate clear/current preserve/other revoke |
| 15 | resetPassword | PASS；self final password/gate clear/all revoke/no login |
| 16 | ACCOUNT_DISABLED | PASS；change/reset 均 403 stable code，无恢复 |
| 17 | session revoke | PASS；change 与 reset 语义分别验证 |
| 18 | createSubAdmin temporary-password | PASS；temporary + mustChangePassword=true |
| 19 | UpdateSubAdminRequest 密码字段扫描 | PASS；schema/type/fixture/form/mapper/payload/UI 均无密码字段 |
| 20 | 禁止密码规则扫描 | PASS；四 code 与私有 12 位规则均为 0 |
| 21 | typecheck | PASS |
| 22 | unit tests | PASS：5G-B 13/13、Portal 125/125、Student 79/79、preview PASS |
| 23 | lint | PASS：0 error / 5 existing warnings |
| 24 | production build | PASS；5/5 stages |
| 25 | browser validation | PASS on isolated hydrated dev；formal Student affected flow 因真实登录/Legacy 未执行；4300 冲突证据已丢弃 |
| 26 | 新 Contract CR 数量 | 0 |
| 27 | Client Defect 数量 | 4；3 fixed，1 codegen defect 由 wire adapter contained |
| 28 | Legacy Migration Findings | 3 affected clusters；Full audit 24 bundles 仍保留，未迁移 |
| 29 | UI/Product Findings | 0 |
| 30 | NEEDS_BUSINESS_DECISION 数量 | 0 |
| 31 | 是否修改业务规则 | 否 |
| 32 | 是否修改 Contract | 否；OpenAPI/metadata/Version/Status/SHA 均不变 |
| 33 | 是否执行 Legacy Migration | 否 |
| 34 | 是否满足 Phase 5G-B 最终通过条件 | 是；全部 blocking 条件满足 |

## 12. 修改文件

- Student validation binding：`frontend/student/phase5b-contract.generated.ts`、`phase5b-contract-fixtures.ts`
- Portal binding/fixtures/UI：`app/phase5b-contract.generated.ts`、`phase5b-contract-fixtures.ts`、`phase5gb-contract-fixtures.ts`、`phase5b-contract-mock.tsx`、`portal-app.tsx`、`admin-subadmins.tsx`、`language.tsx`
- Portal scripts/tests：`package.json`、`scripts/verify-phase5b-contract.mjs`、`tests/input-ui-coverage.test.mjs`、`tests/phase5b-contract-mock.test.mjs`、`tests/phase5b-contract-revalidation.test.mjs`、`tests/phase5gb-contract-revalidation.test.mjs`
- 文档：`docs/rebuild/STATUS.md`、本 handoff

没有修改 Android、OpenAPI、metadata、业务文档、Backend、数据库、migration、部署文件或正式 Legacy client。

## 13. Phase 结束报告

```text
完成状态：DONE
修改文件：Student/Portal generated validation binding、affected fixtures/tests、Portal personal-password UI、Admin Sub-admin affected UI、package scripts、docs/rebuild/STATUS.md、本 handoff
执行的测试：Contract verify/readiness；Version/SHA binding；Student/Portal openapi-typescript --check；typecheck；5G-B 定向 tests；Portal full unit/build；Student full smoke；Web preview tests；lint；browser hydration/DOM/console；git diff check
真实测试结果：Contract 109/121/193/66 与 readiness PASS；binding PASS；5G-B 13/13；Portal 125/125；Student 79/79；preview PASS；typecheck PASS；lint 0 error；production build PASS；hydrated affected browser console 0 error/warning
未执行测试及原因：正式 Student certification UI 需要真实 Backend/账号且正式 runtime 仍是 Legacy，本阶段未输入真实身份或执行 Phase 7B；真实 Backend、数据库、跨端 E2E、Staging、Production deployment 均超出范围；production browser 未单独执行，4300 被既存 dev 占用的证据已丢弃，affected browser 在隔离 dev 端口完成
是否修改了业务规则：否
是否修改了 Contract：否；OpenAPI、metadata、Version、Status、SHA 均未修改
是否存在旧 API 引用：是；Student/Teacher/Portal 正式 runtime Legacy API/DTO/client 仍存在，分类 LEGACY_MIGRATION，本阶段未迁移
是否存在 Mock、TODO、空接口：存在既有 development-only validation Mock、local Admin preview、正式 Legacy runtime 与 Backend 占位；本轮没有新增产品 Fake Success、TODO 或空接口
下一阶段前置条件：Phase 7B 必须单独授权；迁移时按 24-bundle matrix 分 Slice 切正式 runtime，重新执行真实 mapper/network/auth/session/UI/Backend/E2E/browser 验证；解决或确认 openapi-typescript discriminator codegen finding；任何 Contract 漂移先重新锁定 Version/SHA
```

本 handoff 的 `PASS` 只证明固定 `1.2.0-contract` 在 Web validation binding、受影响 adapter/fixture、affected product UI 边界与本地 hydrated preview 上通过；不代表正式 Student/Teacher/Admin Legacy runtime 已迁移，也不代表真实 Backend、数据库、账号、Staging、Production 或部署验收。
