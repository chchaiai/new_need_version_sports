# Phase 5C Contract CR Consolidation Handoff

> 日期：2026-09-01（Asia/Shanghai）
>
> 完成状态：`DONE`
>
> 修改前 Contract：`1.0.0-contract` / `RC` / SHA-256 `ff15441b84f0729626a49c6898ea4896e80321b8e873a933768a509fd4c8478f`
>
> 修改后 Contract：`1.1.0-contract` / `RC` / SHA-256 `1d538483f96b95d777cc4dd02526b78a214bd663e036ea5a6c77f43dfa38d99d`

## 1. 执行边界

| 项目 | 结果 |
|---|---|
| Git 根目录 | `C:\Users\23328\Desktop\new_version` |
| 分支 | `API-contract-Making` |
| 起始 HEAD | `2ce203f271635284cf71ec3622ac59f0953e4f0c` |
| 起始工作树 | clean |
| 读取的 AGENTS | 根 `AGENTS.md`；Portal 的嵌套 `AGENTS.md` 只被识别，因本阶段禁止修改 Web，未进入其写入范围 |
| 权威输入 | 四份 `docs/business/`、Phase 2 业务收口、Phase 3 Domain/Database Design、`contracts/database-support.md`、当前 `1.0.0-contract` RC、Android/Web CR Bundle 与 12 份 CR |
| 允许修改 | `contracts/` 的 CR、确定性 source、验证脚本、生成物、治理文档；`docs/rebuild/STATUS.md`；本 handoff |
| 禁止且未修改 | Android、Web、Backend、数据库实现、四份业务权威、Mock、fixture、部署与发布文件 |
| Git/发布动作 | Commit、Push、Merge、Tag、部署、Staging/Production 均 `NOT EXECUTED` |

本阶段只修正新 Contract 自身无法完整表达已确认 Use Case 的缺陷。旧 Endpoint、旧 DTO、旧 API Client、旧字段、旧错误码和旧语义没有兼容权，也没有被用来恢复任何 Contract 表面。

## 2. CR 收集、去重与数量

| 来源 | 原始 Bundle 数量 | 说明 |
|---|---:|---|
| Android Phase 5A | 4 | CR-001～004 |
| Web Phase 5B | 12 | 复用 CR-001～004，并新建 CR-005～012 |
| Android/Web 重叠 | 4 | Web 对 CR-001～004 的发现标记为 `DUPLICATE`，未新建第二份 CR |
| 去重后唯一 CR | 12 | CR-001～012 |

因此：Android CR 总数为 **4**，Web CR 总数为 **12**，去重后 CR 总数为 **12**。`DUPLICATE` 是来源发现的处置状态；被复用的主 CR 仍按独立评审得到最终 `ACCEPTED` 状态。

## 3. 每个 CR 的最终状态与理由

| CR | 来源 | 最终状态 | 评审理由 | `1.1.0-contract` 落地 |
|---|---|---|---|---|
| CR-001 Active Session 空态 | Android；Web 重复命中 | `ACCEPTED` | operation description 已承诺无进行中 Session 为 404，但 RC 未声明 response/code；Phase 2 Session 状态机与 Phase 3 零行/唯一行查询均支持 | `getOwnActiveExerciseSession` 增加 `404 + RESOURCE_NOT_FOUND` |
| CR-002 媒体 finalization 拒绝通道 | Android；Web 重复命中 | `ACCEPTED` | 同一权威拒绝/过期同时占用 200 DTO 与 ErrorEnvelope 会造成跨端双通道；业务媒体规则和 Phase 3 媒体状态/version 已足够 | 预期 `VERIFIED/REJECTED/EXPIRED` 只返回 `200 MediaFinalizationResult`；闭集 rejection code 与状态不变量；依赖/权限等仍为 ErrorEnvelope |
| CR-003 学生本人资料投影 | Android；Web 重复命中 | `ACCEPTED` | ACTIVE/PENDING 都是已确认学生状态；Phase 3 student profile + Enrollment 可稳定投影，但原 Dashboard 在 PENDING 时无法取得既有 `StudentSummary` | `StudentDashboard.student` 为 required/non-null，并声明与重复 status/progress 本人事实一致 |
| CR-004 邀请预览终态 | Android；Web 重复命中 | `ACCEPTED` | 现有五状态同时出现在 200 DTO 与 422 文义中；学生业务明确要求查看课程、教师、学期和邀请状态 | 已识别五状态统一为 `200 CourseInvitationPreview`，安全 course/expiresAt 非空；未知、畸形或不可安全投影才为 `422 INVITATION_INVALID` |
| CR-005 直传 HTTP method | Web | `ACCEPTED` | method 是签名请求的必要协议要素，与旧 DTO 无关；Phase 3 不需要新增数据库字段 | `MediaAllocation`/`UploadAllocation` required `uploadMethod`，闭集值 `PUT` |
| CR-006 教师邀请管理读取 | Web | `ACCEPTED` | 业务要求教师生成并停止使用邀请；原 mutation 依赖公开 ID/version，但刷新后无恢复边界；Phase 3 已有 invitation ID、suffix、status、expiry、version | 新增 `GET /courses/{courseId}/invitations` / `listCourseInvitations`，只返回安全 metadata，不返回 raw code/digest |
| CR-007 学期管理摘要 | Web | `ACCEPTED` | 管理员权威明确要求 current/date、UPCOMING 与 ARCHIVED 数量；Phase 3 状态索引可支持 | `SemesterPage.summary` 增加 current、两项 counts、`generatedAt`；与 items 同一提交读取快照，忽略筛选/分页 |
| CR-008 反馈全局概况 | Web | `ACCEPTED` | 管理员权威明确给出 total/pending/waiting-tech/completed 口径；Phase 3 feedback 状态/index 可支持 | 管理员列表改用 `AdminFeedbackPage`；summary 固定四项口径且不随筛选/分页缩小 |
| CR-009 帮助中心概况 | Web | `ACCEPTED` | 管理员权威要求 PUBLISHED/DRAFT/ARCHIVED 全局数量；Phase 3 help status/index 可支持 | `HelpArticleAdminPage.summary` 增加三项 counts 与 `generatedAt` |
| CR-010 分管理员摘要 | Web | `ACCEPTED` | 管理员权威要求总数、ACTIVE 数与固定权限数；Phase 3 admin profile/account index 可支持 | `SubAdminPage.summary` 增加 total/active；权限数量继续由 8 值 `AdminPermission` 闭集表达 |
| CR-011 无当前学期通道 | Web | `ACCEPTED` | RC 的首次切换请求/管理员 Dashboard 已承认 0 个 current；Phase 3 约束为最多一个 CURRENT | `getCurrentSemester` 无 current 为 `404 RESOURCE_NOT_FOUND`；`TeacherDashboard.currentSemester` nullable，null 时 current-semester 工作量 counts 为 0 |
| CR-012 创建课程学期错误 | Web | `ACCEPTED` | 创建课程必须面向唯一 CURRENT，但原 code `SEMESTER_NOT_UPCOMING` 表达相反语义；Phase 3 FK/status 可区分不存在与非 CURRENT | 保留 request `semesterId`；unknown 为 `404 RESOURCE_NOT_FOUND`，存在但非 CURRENT（含无 current）为 `409 SEMESTER_NOT_CURRENT` |

最终状态统计：`ACCEPTED=12`、`REJECTED=0`、唯一 CR `DUPLICATE=0`、`NEEDS_BUSINESS_DECISION=0`。来源发现另有 Web `DUPLICATE=4`，均已合并到 CR-001～004。

## 4. Android / Web 冲突检查

没有发现 Android 与 Web 对同一业务语义提出相反要求。

- CR-001～004：Web 与 Android 对缺口结论一致，Web 只重复命中，不产生冲突版本。
- CR-002/005：共同要求跨端只有一个可生成的媒体终态通道和一个公开 upload method。
- CR-004/006：学生预览状态与教师管理 metadata 是不同读模型，均禁止读取/持久化明文邀请码，不冲突。
- CR-011/012：统一为“standalone current read 使用 404；Dashboard 使用 nullable；创建课程保留 semesterId 并区分 404/409”的组合。

## 5. 实际修改的 OpenAPI 内容

1. Contract version 从 `1.0.0-contract` 提升到 `1.1.0-contract`，状态保持 `RC`。
2. 新增 operation：`listCourseInvitations`；总 operation 从 120 增至 121，path 仍为 109（复用既有 `/courses/{courseId}/invitations` path item）。
3. 新增/调整 schema：直传 method、媒体 finalization 结果与拒绝码、不变量、稳定学生本人投影、教师无 current 空态、教师邀请 page、学期/feedback/help/sub-admin summary page；schema 从 183 增至 192。
4. 新增 `SEMESTER_NOT_CURRENT`，删除不再作为 ErrorEnvelope 的 `MEDIA_ALLOCATION_EXPIRED` catalog 条目；Error catalog 总数保持 66。
5. 修正 `getOwnActiveExerciseSession`、`getCurrentSemester`、`createCourse`、`previewCourseInvitation`、`finalizeMediaAsset` 的 response/error/status 语义。
6. `MediaAllocation` 与 roster `UploadAllocation` 都显式要求 `uploadMethod=PUT`。
7. OpenAPI governance 记录接受的 CR-001～012；coverage、database-support 与 README 同步到新 RC。

生成物 `contracts/openapi.yaml`、`operation-catalog.md`、`contract-metadata.json` 均只由 `contracts/src/*.py` 和 `build_contract.py` 确定性生成，没有手改。

## 6. 未解决的业务决策项

影响 `1.1.0-contract` 正确性的 `NEEDS_BUSINESS_DECISION`：**0**。

Phase 5A/5B Legacy Migration Findings 仍记录两个不进入本 CR Bundle 的 UI/产品口径事项：PENDING/退班学生如何在当前与历史课程间导航，以及教师 Dashboard“需要关注的 Record”判定口径。它们没有被 Codex 决定，没有进入本次 OpenAPI，也不影响本次 12 个 CR 对已确认 Use Case 的正确表达。

## 7. Legacy Migration Findings 处理结果

`NOT EXECUTED BY DESIGN`：本阶段没有迁移、删除或兼容任何 Android/Web 旧 Endpoint、DTO、API Client、generated snapshot、ErrorCode 或页面字段。Legacy Migration Findings 只用于确认候选问题是否真是新 Contract 缺陷，并保留为 Phase 7 客户端迁移输入。

没有恢复 add-sixty-minutes、Record draft/resubmission/attempt、系统 Push、模拟扫码、永久媒体 URL、多个 ACTIVE course、管理员课程 mutation 或其他已撤销/越权/DEV_ONLY 行为。

## 8. 验证与真实结果

| 验证 | 真实结果 |
|---|---|
| 修改前 `verify_contract.py` | `PASS`：109 paths / 120 operations / 183 schemas / 66 errors |
| 修改前 Redocly lint | `PASS`；API description valid |
| 首次修改后 `verify_contract.py` | `FAIL`：发现 `MEDIA_ALLOCATION_EXPIRED` 已成为 200 result code 但仍残留 Error catalog；已删除残留，未掩盖失败 |
| 最终 `python contracts/scripts/build_contract.py` | `PASS`；确定性生成 OpenAPI/catalog/metadata |
| 最终 `python contracts/scripts/verify_contract.py` | `PASS`：109 paths / 121 unique operations / 192 schemas / 66 errors；覆盖 operationId、ref、权限、Error/HTTP status、CR-specific schema/response assertions |
| 最终 Redocly lint | `PASS`；API description valid，无 warning |
| `python contracts/scripts/check_rc_readiness.py` | `PASS`；无 Contract PENDING，状态为 RC |
| Draft 2020-12 媒体实例验证 | `PASS`：3 个合法 `VERIFIED/REJECTED/EXPIRED` fixture 通过；4 个错误 status/rejection 组合被拒绝 |
| OpenAPI SHA 与 metadata | `PASS`：均为 `1d538483f96b95d777cc4dd02526b78a214bd663e036ea5a6c77f43dfa38d99d` |
| Backend/数据库/COS conformance | `NOT EXECUTED`；本阶段禁止实现，Phase 3 仅为 design-supported |
| Android/Web binding、Mock、浏览器/设备/E2E | `NOT EXECUTED`；本阶段禁止客户端迁移，见第 10 节重新验证清单 |
| Staging/Production/部署/发布 | `NOT EXECUTED`；无授权且本 RC 不等于 Staging acceptance |

## 9. 修改前后版本与 SHA

| 项目 | 修改前 | 修改后 |
|---|---|---|
| Contract version | `1.0.0-contract` | `1.1.0-contract` |
| Contract status | `RC` | `RC` |
| OpenAPI SHA-256 | `ff15441b84f0729626a49c6898ea4896e80321b8e873a933768a509fd4c8478f` | `1d538483f96b95d777cc4dd02526b78a214bd663e036ea5a6c77f43dfa38d99d` |
| Paths | 109 | 109 |
| Operations | 120 | 121 |
| Schemas | 183 | 192 |
| Error codes | 66 | 66 |

## 10. Phase 5A / 5B 需要重新验证的场景

### Android Phase 5A

1. Android 生成/绑定 `1.1.0-contract` 与新 SHA，拒绝旧 snapshot、额外字段和双 response fallback。
2. `getOwnActiveExerciseSession`：200 内容、404 Idle、认证/维护/依赖错误不得误映射为 Idle；再跑 Idle → start 的完整严格闭环。
3. `StudentDashboard`：ACTIVE 与 PENDING 都有完整 `student`；course/progress null 时资料不丢失；重复 studentStatus/progress.student 一致。
4. 邀请预览：ACTIVE、EXPIRED、REVOKED、COURSE_CLOSED、NOT_CURRENT 均走 200 内容态；未知/畸形 code 走 422；扫码与手输一致。
5. 媒体：allocation 的 `PUT + requiredHeaders + bytes`，图片/视频成功、内容拒绝、过期、依赖失败与幂等重放；拒绝/过期不得再保留 ErrorEnvelope 双通道。
6. 如 Android 调用 `getCurrentSemester`，验证 404 与普通依赖错误可区分。
7. 重新执行 binding、compile、全量 unit/lint/assemble、Compose/设备；Phase 5A 已记录的既有 unit failure 必须独立修复后再宣告客户端通过。

### Web Phase 5B

1. 学生 Web 重复执行 Android 的 Session、PENDING profile、邀请五状态和媒体终态一致性场景，并加载同一 Version + SHA。
2. 三类 direct upload：Record image/video、application image、roster CSV/XLSX 均使用 Contract `PUT`、精确 required headers、byte body 与过期后重新 allocation。
3. 教师邀请管理：刷新/重新登录/换设备后 list 恢复 ID/version/status/revocable，撤销并发冲突正确，任何 read fixture 不出现 raw code/digest。
4. 学期管理：无 current、一个 current、多 UPCOMING/ARCHIVED、status filter 与翻页时 summary 不变且与同一读取快照一致。
5. Feedback：五状态组合、全零空态、pending 公式、搜索/分类/状态/翻页不缩小 summary，处理/重开后重新读取一致。
6. Help：三状态组合、全零空态、搜索/分类/状态/翻页不缩小 summary，创建/发布/下线/重新上线后重新读取一致。
7. Sub-admin：空、ACTIVE/DISABLED 混合、state filter 不缩小 total/active；权限闭集仍恰为 8。
8. Teacher Dashboard：current 内容态与 `currentSemester=null + current-work counts=0` 空态；依赖故障不得伪装为空态。
9. `createCourse`：CURRENT 成功、UPCOMING/ARCHIVED/无 current 为 409 `SEMESTER_NOT_CURRENT`、unknown ID 为 404、并发切换时不产生假成功。
10. 重新生成两个 Web 项目的 Contract binding，运行 typecheck/lint/unit/build、严格 Mock、浏览器内容/空/错态与 console/移动端检查；不得把 Phase 5B development-only Mock 当产品入口。

真实 Backend 可用后，Android/Web 还需共同执行 conformance、权限、maintenance fail-closed、幂等/expectedVersion、真实 PostgreSQL/COS 和跨端 E2E；静态 Contract validation 不能替代这些验收。

## 11. Phase 结束报告

```text
完成状态：DONE
修改文件：12 份 CR 状态/审批记录；Contract 确定性 source/验证脚本/生成物/README/coverage/database-support；STATUS；本 handoff
执行的测试：修改前/后 Contract verify、RC readiness、Redocly lint、Draft 2020-12 媒体实例、SHA/metadata、最终文档/范围/whitespace 检查
真实测试结果：最终全部 Contract 检查 PASS；首次修改后 verify 的 1 个真实失败已记录并修正
未执行测试及原因：客户端、Backend、数据库、COS、浏览器/设备、E2E、Staging/Production 均因本阶段严格禁止实现/迁移或缺少运行实现而 NOT EXECUTED
是否修改了业务规则：否
是否修改了 Contract：是；1.0.0-contract RC → 1.1.0-contract RC，新 SHA 已生成
是否存在旧 API 引用：是；客户端 Legacy Migration Findings 未处理，保留给 Phase 7
是否存在 Mock、TODO、空接口：既有客户端 Mock/TODO/空壳未改；本阶段未新增 Mock、TODO、stub、Fake Success 或客户端兼容逻辑
下一阶段前置条件：Android/Web/Backend 分别加载同一 1.1.0-contract + SHA；按第 10 节重验；真实实现后再做 conformance/E2E/Staging gate
```
