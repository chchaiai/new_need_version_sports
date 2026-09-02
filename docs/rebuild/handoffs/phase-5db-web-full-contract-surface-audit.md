# Phase 5D-B Web Full Contract Surface Audit Handoff

> 日期：2026-09-01
> 结果：**PARTIAL**
> 固定 Contract：`1.1.0-contract`
> 固定 SHA-256：`1d538483f96b95d777cc4dd02526b78a214bd663e036ea5a6c77f43dfa38d99d`

## 1. Phase 开始基线

| 项目 | 值 |
|---|---|
| 当前 Git 根目录 | `C:\Users\23328\Desktop\new_version` |
| 当前分支 | `API-contract-Making` |
| HEAD Commit | `4b4997925f4193023a126b78c3bd8aa42bb93599` |
| 起始 `git status` | clean：`## API-contract-Making` |
| 已读取 AGENTS.md | 根 `AGENTS.md`；`BNBU-Sports-Web-new/portal-teacher-admin/AGENTS.md` |
| 当前 Phase | Phase 5D-B Web Full Contract Surface Audit |
| 允许修改 | `docs/rebuild/STATUS.md`、`docs/rebuild/handoffs/**` |
| 禁止修改 | `contracts/**`、Web 产品源码、Android、Backend、`docs/business/**` 及其他未授权路径 |
| 完成标准 | 全页面/用户操作/Use Case/Repository/API/operation 映射；逐类 Findings；数量、CR Bundle、完整支撑结论和 Phase verdict |

四份 `docs/business/` 权威、`docs/rebuild/STATUS.md`、固定 OpenAPI、operation catalog/coverage、Phase 5B/5C handoff 与当前 Student/Portal 源码均已只读检查。

## 2. 审查结论总表

| 最终交付 | 结果 |
|---|---|
| Web Full Contract Coverage Matrix | DONE；见 [完整矩阵](web/phase-5db-full-contract-coverage-matrix.md) |
| 全部 in-scope 页面数量 | **53 个唯一逻辑页面/面板**：50 当前存在 + 3 初版要求但缺失；共享 Portal 页按角色展开为 58 个角色页面实例 |
| 全部 Use Case 数量 | **154**：153 条角色 × operation 映射 + 1 条未映射 Teacher Dashboard Use Case |
| 映射到 Contract 的 operation 数量 | **121 个唯一 operationId**；形成 153 条 `x-roles` 绑定 |
| 未映射 Use Case | **1**：Teacher Dashboard “需要关注的打卡记录” |
| 新增 Contract CR Bundle | **0**；见 [CR Bundle](web/phase-5db-contract-cr-bundle.md) |
| Legacy Migration Findings | **24 个 bundle**；见 [Legacy Migration Findings](web/phase-5db-legacy-migration-findings.md) |
| Client Defects | **2** |
| UI/Product Findings | **8** |
| Needs Business Decision | **2** |
| 当前 Contract 能否完整支撑 Web 初版 | **不能作完整支撑声明**：121 个 operation 足以支撑全部已确认规则，但 1 个页面 Use Case 及个人密码规则仍缺业务定义；正式 runtime 也尚未迁移 |
| Phase 5D-B | **PARTIAL** |

用户最终交付清单第 12 项写成“Phase 5D-A”。本轮标题、目标与范围均是 Phase 5D-B；本文按本轮目标把该条解释为 `Phase 5D-B = PARTIAL`。若用户确实要查询独立的 Android Phase 5D-A，则本轮 `NOT ASSESSED`，不能用 Web 审计替它下结论。

## 3. Contract 固定性与结构校验

| 检查 | 真实结果 |
|---|---|
| 文件 SHA-256 | PASS；精确等于 `1d538483f96b95d777cc4dd02526b78a214bd663e036ea5a6c77f43dfa38d99d` |
| metadata | PASS；`1.1.0-contract` / `RC` / `/api/v1` |
| `verify_contract.py` | PASS；109 paths / 121 unique operations / 192 schemas / 66 error codes |
| `check_rc_readiness.py` | PASS |
| role bindings | 153：ANONYMOUS 9 / STUDENT 42 / TEACHER 50 / ADMIN 52 |
| Contract 修改 | **无**；Version/SHA/OpenAPI/metadata 均未改变 |

结构校验与 Phase 5B strict consumer fixture 只能证明 Contract 和 validation binding；它们不是正式 Web、Backend、数据库、权限或部署验收。

## 4. Findings 分类

用户模板把 `CLIENT_DEFECT` 说明写成“Android 自身实现或 binding 问题”。由于本阶段明确审查 Web，本文保留分类名，但只用于 **Web client implementation / binding** 缺陷。

### 4.1 CONTRACT_CR

**0 个新增。**

旧 Endpoint/DTO/Client、当前缺页和旧 UI 状态都没有被转换成 CR。NBD-01/NBD-02 在业务决定前也不得先建立 CR。

### 4.2 LEGACY_MIGRATION

共 **24 个 domain bundle**。核心事实：

1. Student 正式 `api.js` 仍使用旧 auth、`/me`、enrollments/class-sections、旧 Session cancel、Record Draft、旧 media、旧 application 和旧 score/progress DTO；
2. Portal 正式 generated metadata 仍为 `3.0.0-web-snapshot`，`api-client.ts` / `teacher-data.ts` / `admin-service.ts` 继续承担正式请求；
3. Portal 多数 Admin write 在 real mode 显式 `BACKEND_REQUIRED` 或只在 demo/localStorage 成功；
4. Phase 5B 的 `phase5b-*` generated types、fixture、Mock UI 与 tests 是 validation-only；
5. 所以正式产品对固定 1.1 Contract 的可验证绑定为 **0 / 121**，不因相同 path 名偶然存在就计作已迁移。

完整逐域表见 [Legacy Migration Findings](web/phase-5db-legacy-migration-findings.md)。

### 4.3 CLIENT_DEFECT

| ID | 严重度 | 当前证据 | 与权威/Contract 的冲突 | 处置边界 |
|---|---|---|---|---|
| CD-01 | HIGH | `frontend/student/js/screens/checkin.js:1165-1209` 在未满一小时后调用 `cancelServerSession`、清零并允许当日重开；`:2031-2040` 放弃时也调用 cancel | 业务规定 Session 只能结束、Record 可贡献 0，且同一业务日机会不恢复；1.1 只有 `completeExerciseSession` + `submitExerciseRecord` | 后续 Web migration Slice 修客户端；不得给 Contract 加 cancel |
| CD-02 | HIGH | `portal-teacher-admin/app/admin-service.ts:372-373`、`admin-users.tsx:294-297`、`:327-329` 在教师仍有课程时阻止删除并要求交接 | P4-DECISION-05 与 `deleteTeacherAccount` 明确删除不以交接为前置，不转移/改写课程责任 | 后续 Admin accounts Slice 删除客户端 blocker；不改 Contract |

### 4.4 UI_PRODUCT_FINDING

| ID | 页面 | Finding | 现有 Contract |
|---|---|---|---|
| UI-01 | Student Join Request Status | 仍展示 PENDING/REJECTED/NEEDS_CORRECTION、教师审核和“修改并重新提交” | 邀请预览 + 直接原子入班已足够；该页面应删除或重构 |
| UI-02 | Student Endurance Scoring | 学生自行输入用时并请求非权威预估；申请页还写“免测后教师单独评分” | Student 只读 `getOwnEnduranceOutcome`；EXEMPT 不产生分数 |
| UI-03 | Student Grades | 依赖 `absent`、把免测显示为教师评分/可有 score，并未按当前页面明确呈现独立最终成绩 | `UNRECORDED / MEASURED / EXEMPT` + `getOwnFinalGrade` 已足够 |
| UI-04 | Student Account Deletion | 文案承诺撤销 “push-device links” | 当前闭集只有站内通知，无外部 Push/device token |
| UI-05 | Teacher Dashboard | 当前 teacher nav/route 缺 Dashboard | `getTeacherDashboard` 已存在；其中“需关注 Record”仍受 NBD-01 阻塞 |
| UI-06 | Teacher/Admin Notifications | 两个角色均缺完整通知中心；Admin 只有计数/提示 | 三个本人通知 operation 已存在 |
| UI-07 | Sub-admin Self Deletion | 共用账号/安全面板没有分管理员影响预览和本人注销动作 | `getOwnAccountDeletionImpact` + `deleteOwnAccount` 已存在 |
| UI-08 | Teacher Final Grades | 当前页面围绕旧综合分“重新计算/批量发布”表达 | `publishFinalGrade` 要求责任教师直接填写 signed int32 + 最多 50 字备注并可重新发布 |

### 4.5 NEEDS_BUSINESS_DECISION

| ID | 阻塞内容 | 已知事实 | 需要用户/业务负责人确认 |
|---|---|---|---|
| NBD-01 | Teacher Dashboard “需要关注的打卡记录” | 权威列出该摘要，但未定义集合；`TeacherDashboard` 没有对应字段。Record 提交默认 VALID，不能擅自解释为“待审核” | 判定条件、计数范围/时点、是否仅 INVALID/异常、点击后的目标筛选；确认后再判断是否需要 CR |
| NBD-02 | Teacher/Admin 个人密码与找回密码强度 | 教师初始密码明确为 ≥8 + 大小写/数字；分管理员初始密码明确只要求非空和一致；个人密码未定义统一规则。Portal 当前私自要求 ≥12，而 Contract request 只要求非空 | 个人密码/找回密码的统一长度、复杂度、适用角色和稳定错误；未确认前不得把 12 位当产品规则 |

本轮按规则只标记 PENDING，没有修改四份业务权威。

## 5. 当前 Contract 能否完整支撑 Web 初版

分两层回答：

1. **Contract 设计层：PARTIAL。** 对全部已确认规则，121 个 operation 的 request/response、content/empty/error、HTTP status、`error.code`、权限、nullable/required、enum、分页/筛选/排序、上传和幂等语义足够，新增 CR 为 0；但 NBD-01 使一个明确列出的 Teacher Dashboard Use Case 仍不能安全落到字段或查询，NBD-02 使密码校验语义不能统一确认。
2. **当前正式 Web 产品层：NO。** 正式 Student/Portal runtime 尚未绑定固定 1.1，且有 3 个初版页面缺失、24 个 migration bundle、2 个 client defect 与 8 个 UI finding。

因此不能把 Phase 5B validation-only Mock PASS、Contract RC PASS 或本次完整审计本身扩大为“Web 初版已经由 Contract 完整落地”。

## 6. Phase 结束报告

| 必报项 | 结果 |
|---|---|
| 完成状态 | **PARTIAL** |
| 修改文件 | 本 handoff、Web coverage matrix、Web CR bundle、Web legacy findings、`docs/rebuild/STATUS.md` |
| 执行的测试 | Contract SHA；`verify_contract.py`；`check_rc_readiness.py`；operation/role count；源码/路由/DTO 静态扫描；Markdown/链接/UTF-8/diff 检查 |
| 真实测试结果 | Contract SHA/verify/RC PASS；121 operation / 153 role binding 计数 PASS；53 页与 finding 分类人工复核完成 |
| 未执行测试及原因 | Web build/typecheck/lint/unit/browser、Backend、数据库、真实账号、E2E、Staging/Production 均 NOT EXECUTED；本阶段只读审查且未改产品源码 |
| 是否修改业务规则 | **否** |
| 是否修改 Contract | **否** |
| 是否存在旧 API 引用 | **是；正式 runtime 仍未迁移，24 bundles** |
| 是否存在 Mock、TODO、空接口 | **既有 validation-only Mock 与 Portal demo/localStorage/`BACKEND_REQUIRED` 仍存在；本轮未新增、未修改** |
| 下一阶段前置条件 | 先完成 NBD-01/NBD-02 业务决定；若定义后证明 1.1 不足，再独立提 CR；随后按授权的 Web migration Slice 修 CD/UI 并替换旧 Client，执行 strict test + browser gate |

## 7. 本轮交付

- [Web Full Contract Coverage Matrix](web/phase-5db-full-contract-coverage-matrix.md)
- [Web Contract CR Bundle](web/phase-5db-contract-cr-bundle.md)
- [Web Legacy Migration Findings](web/phase-5db-legacy-migration-findings.md)
