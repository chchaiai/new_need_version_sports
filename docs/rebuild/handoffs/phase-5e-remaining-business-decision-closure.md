# Phase 5E Remaining Business Decision Closure handoff

> 日期：2026-09-01
>
> Git 根目录：`C:\Users\23328\Desktop\new_version`
>
> 分支：`API-contract-Making`
>
> 起始 HEAD：`90db2a5dd33d77d3ffb55db1d4fdc33990e77a16`
>
> 状态：`DONE`（两项 `NEEDS_BUSINESS_DECISION` 均已由业务负责人关闭；本阶段未修改 Contract）

## 1. 目标与写入边界

本阶段把 Phase 5D-A / 5D-B 暴露的全部 `NEEDS_BUSINESS_DECISION` 收敛为可直接选择的业务决策包。跨目录只读对照 Phase 2、当前四份业务权威、固定 Contract 和 Domain/数据库设计；写入只限：

- `docs/business/00-overview.md`；
- `docs/business/20-teacher-flow.md`；
- `docs/business/30-admin-flow.md`；
- `docs/rebuild/STATUS.md`；
- 本 handoff。

未修改 OpenAPI、Android、Web、Backend、Domain/数据库设计、Contract Version、Contract SHA 或 Change Request。

## 2. 权威输入与固定基线

| 输入 | 现场结论 |
|---|---|
| [Phase 2 handoff](phase-2-business-truth-and-mvp.md) | Record 提交默认 `VALID`；教师只管理本人课程并追加 `VALID/INVALID` Review；Phase 2 核心闭环没有待审核 Record 状态 |
| [Phase 5D-A handoff](phase-5d-a-android-full-contract-surface-audit.md) | `NEEDS_BUSINESS_DECISION = 0`；两个 Android CR 是已证明的 Contract 缺口，不是本轮业务决定 |
| [Phase 5D-B handoff](phase-5db-web-full-contract-surface-audit.md) | 全部 NBD 为 NBD-01 Teacher Dashboard Record 摘要和 NBD-02 Teacher/Admin 密码规则 |
| [总览](../../business/00-overview.md)、[学生](../../business/10-student-flow.md)、[教师](../../business/20-teacher-flow.md)、[管理员](../../business/30-admin-flow.md)四份当前业务权威 | Phase 5E 起始基线中 Teacher 工作台列出“需要关注的打卡记录”但未定义；Teacher/Admin 密码路径存在分裂、缺失或 Contract 先行语义；本轮已按最终选择更新业务权威 |
| [固定 OpenAPI](../../../contracts/openapi.yaml) | 现场文件仍为 `1.1.0-contract` / `RC` / `/api/v1`；SHA-256 精确匹配 `1d538483f96b95d777cc4dd02526b78a214bd663e036ea5a6c77f43dfa38d99d` |
| [Phase 3 Domain/数据库设计](../../architecture/phase-3-domain-and-database-design.md) | RecordReviewState、Credential `must_change/password_version`、PHC、challenge digest 和 session revoke 已有；没有 Record 风险状态、密码历史或密码策略表 |

## 3. NBD 完整性结论

| ID | 来源 | 状态 | 本轮结果 |
|---|---|---|---|
| `P5E-NBD-01` | Phase 5D-B NBD-01 | `ACCEPTED` | 业务负责人选择 `DASH-A`；其余 `DASH-B/C/D` 均 `REJECTED` |
| `P5E-NBD-02` | Phase 5D-B NBD-02 | `ACCEPTED` | 业务负责人选择 `PWD-POLICY-A + PWD-FIRST-B + PWD-ADMIN-B`，接受统一包并删除冲突的三个策略原因及限制 |

除以上两项外，Phase 5D-A / 5D-B 没有其他标记为 `NEEDS_BUSINESS_DECISION` 的事项。旧客户端行为、缺页、Client Defect、UI finding、Legacy Migration 和既有 CR 均没有被伪装成新业务决定。

## 4. `P5E-NBD-01` Teacher Dashboard Record 摘要

### 4.1 决策前已确认事实

- 正式 Record 提交即默认 `VALID`，责任教师不逐条批准正常 Record；
- 教师 Review 只追加，当前投影只有 `VALID/INVALID`；
- `TeacherDashboard` 没有 Record attention count；
- `listCourseExerciseRecords` 只支持单课程和 `reviewResult` 筛选，cursor page 没有精确 total；
- 数据库已有当前 ReviewState 和责任教师 Course 归属，能计算当前 `INVALID`，但没有风险/异常状态。

### 4.2 决策前缺失规则

缺失判定集合、当前/历史范围、Course/成员范围、去重单位、生成时点、纠正后的离队规则、卡片文案和点击目标。任何实现把它解释成“待审核”“0 分钟”“新提交”或自动风险，都在替业务负责人作决定。

### 4.3 可选方案与四层影响

| 方案 | UI | Contract | Backend | 数据库 |
|---|---|---|---|---|
| `DASH-A` 删除摘要（`ACCEPTED`） | 删除卡片/下钻 | 无 | 无 | 无 |
| `DASH-B` 当前 `INVALID`（`REJECTED`） | 显示“当前无效打卡记录”，下钻预置 `INVALID` | Dashboard 需精确总数字段；一步跨课程下钻还需教师范围列表/筛选 | 聚合当前学期、本人未关闭 Course 的 current ReviewState | 现有表可计算，可能需要索引优化 |
| `DASH-C` 从未人工 Review（`REJECTED`） | 形成新 Record 待查看队列 | 需总数和人工 Review 筛选语义 | 根据初始系统 Review 与后续人工 Review 推导 | 可推导但可能需索引；与“不逐条批准”方向冲突 |
| `DASH-D` 自动风险队列（`REJECTED`） | 展示风险原因、优先级和处理状态 | 需新字段、enum、列表和聚合 | 需完整确定性风险规则和生命周期 | 需风险快照/历史或等价投影 |

### 4.4 推荐与最终选择

决策包原推荐 `DASH-B`，理由是它能复用已经确认的 `INVALID` 当前事实而不创造待审核状态或风险引擎。业务负责人最终选择 `DASH-A`；该选择彻底移除未定义摘要，不新增聚合、计数或下钻语义，也不影响课程 Record 管理能力。

### 4.5 最终业务决定

`DASH-A` 已 `ACCEPTED`：Teacher Dashboard 不展示“需要关注的打卡记录”卡片、数量、徽标或下钻，不得改名恢复为当前无效、待审核、未人工审核或自动风险摘要。该事项没有剩余待决定内容。

## 5. `P5E-NBD-02` Teacher/Admin 密码与权限

### 5.1 决策前已确认事实

- Teacher 初始密码是 ≥8 且含大小写和数字，首次登录强制本人改密；个人密码强度在决策前未定义；
- Teacher 忘记密码只走本人已验证学校邮箱，管理员不能查看或代设 Teacher 个人密码；
- 分管理员初始密码基线只要求非空/一致、无首次改密；基线中的总管理员普通编辑可以代设分管理员新密码；
- 总管理员/分管理员均可用已验证学校邮箱找回，不要求组织代码，成功后旧 session 全失效；
- Contract `changeOwnPassword` 和 `resetPassword` 已定义角色、self scope、proof/session 行为，但新密码只 `minLength: 1`；
- Domain/数据库已有通用 `must_change`、`password_version`、PHC、challenge 和 revoke 能力。

### 5.2 决策前缺失规则

缺失统一强度/最大长度/弱密码策略、路径适用范围、Admin 首次改密、日常本人改密是否上线、reset 清除 gate、停用/删除账号处理、session 精确失效、总管理员代设权限、同旧密码/历史/定期轮换和客户端稳定错误。

### 5.3 可选方案与四层影响

完整逐项矩阵已写入[总业务流程 Phase 5E 决策包](../../business/00-overview.md)。选择摘要：

| 决策组 | 方案 | UI | Contract | Backend | 数据库 |
|---|---|---|---|---|---|
| 强度 | `PWD-POLICY-A` 非空分裂规则（`ACCEPTED`） | 移除私有 12 位限制 | 个人密码 schema 基本不变 | 保留分路径校验，个人密码只非空 | 无 |
| 强度 | `PWD-POLICY-B` 统一 ≥8 + 大小写数字（`REJECTED`） | 所有入口同提示 | 收紧多个 schema | 共用组合 validator | 无 |
| 强度 | `PWD-POLICY-C` 15–128 长密码 + blocklist（`REJECTED`） | 支持 passphrase、粘贴、明确拒绝提示 | 统一 min/max，移除 composition pattern，增加策略错误 | NFC、blocklist、不可截断 | 现有 PHC 足够 |
| 首次改密 | `PWD-FIRST-A` teacher-only（`REJECTED`） | Admin 无 gate | 基本保持 teacher-only 说明 | teacher-only `must_change` | 无 |
| 首次改密 | `PWD-FIRST-B` 所有分配的 Teacher/Admin 初始密码（`ACCEPTED`） | Admin 也先改密 | Admin operation 增加 gate 语义 | 通用 must_change | 现有列足够 |
| 他人代设 | `PWD-ADMIN-A` 保留普通编辑（`REJECTED`） | 继续密码字段 | 保留字段并补充代设语义 | 替换 credential 并定义 session revoke | 无 |
| 他人代设 | `PWD-ADMIN-B` 仅本人改/找回（`ACCEPTED`） | 编辑页删密码字段 | 移除 UpdateSubAdmin 密码字段 | 删除代设路径 | 无 |
| 他人代设 | `PWD-ADMIN-C` 独立应急重置（`REJECTED`） | 新高风险流程 | 新 operation/request/error | 复验、临时密码、revoke/gate | 现有列足够 |

### 5.4 推荐与最终选择

决策包原推荐 `PWD-POLICY-C + PWD-FIRST-B + PWD-ADMIN-B`，理由是当前登录为密码单因素，长密码、blocklist、本人验证、反枚举和明确 session 失效具有更强安全性；外部资料只支持推荐，不替代业务权威。业务负责人最终选择 `PWD-POLICY-A + PWD-FIRST-B + PWD-ADMIN-B`，并接受统一权限、会话和错误包。

最终统一包要求：本人改密只限 `ACTIVE` Teacher/Admin self、无需管理员业务权限、当前密码 + version、保留当前 session 并撤销其他 session；邮箱自助 reset 撤销全部 session、不自动登录并清除 gate；停用/删除不能借 reset 恢复；secret 不进普通日志/审计；不任意周期改密、不建密码历史。业务负责人最终删除 `TOO_LONG / BLOCKLISTED / SAME_AS_CURRENT` 及其对应限制，不新增 `PASSWORD_POLICY_VIOLATION`；个人新密码只要求非空。

### 5.5 最终业务决定

`PWD-POLICY-A + PWD-FIRST-B + PWD-ADMIN-B` 及最终统一包均已 `ACCEPTED`。个人密码只非空；所有分配的 Teacher/Admin 初始密码均为临时密码；个人密码只允许本人改密或已验证学校邮箱自助重置；权限、会话、反枚举、停用/删除与秘密审计边界按[总业务流程](../../business/00-overview.md)执行。该事项没有剩余待决定内容。

## 6. Contract CR 判断

本阶段新增 Contract CR：`0`；这是本阶段写入边界，不表示不需要后续 CR。

最终判断：

- `DASH-A`：**不需要 Contract CR**。当前 `TeacherDashboard` 本来没有该字段，后续 UI 只需不实现该摘要。
- 密码决定：**需要新的 Contract CR**。至少评审 Admin 首次改密 gate、`FIRST_PASSWORD_CHANGE_REQUIRED` 的 Admin operation 范围、删除 `UpdateSubAdminRequest.newPassword/confirmNewPassword`、reset 对 `DISABLED` 的稳定错误以及成功清除 `mustChangePassword` 的 wire 语义；不新增三个已删除的策略原因或 `PASSWORD_POLICY_VIOLATION`。

业务权威已经完成 `PENDING → ACCEPTED`。新的密码 Contract CR 必须在独立后续任务中建立、评审并按结果提升 Contract Version/SHA、要求下游重新加载；本阶段没有创建 CR，也没有修改固定 Contract。

## 7. 验证

| 检查 | 真实结果 |
|---|---|
| `git diff --check` | PASS |
| Markdown 严格 UTF-8 | PASS；本轮 5 个 Markdown 文件均可严格解码 |
| 本轮 Markdown 本地链接 | PASS；5 个文件的本地链接目标均存在 |
| Phase 5E 状态扫描 | PASS；`P5E-NBD-01/02` 均为 `ACCEPTED`，三份相关业务权威无 `P5E-NBD` 的 `PENDING` 标记，Teacher 文档已删除 Dashboard 占位 |
| Contract metadata/hash 不变 | 已现场验证；metadata 和文件均为 `1.1.0-contract` SHA `1d5384...d99d` |
| `verify_contract.py` / `check_rc_readiness.py` | PASS；`109 paths / 121 operations / 192 schemas / 66 errors`，RC readiness PASS |
| 构建、单元、浏览器、设备、Backend、数据库、E2E、Staging/Production | `NOT EXECUTED`；本轮只写业务决策/治理 Markdown |

## 8. Phase 结束模板

| 项目 | 结果 |
|---|---|
| 完成状态 | **DONE**；两项 NBD 均已关闭，Contract 改动留给独立后续 CR |
| 修改文件 | `docs/business/00-overview.md`、`20-teacher-flow.md`、`30-admin-flow.md`、`docs/rebuild/STATUS.md`、本 handoff |
| 执行的测试 | 文档 diff、UTF-8、链接、状态/边界扫描；详见第 7 节 |
| 真实测试结果 | 全部已执行文档/Contract 只读门禁通过；没有执行产品级验证 |
| 未执行测试及原因 | 产品/实现测试均未执行；本阶段未修改实现 |
| 是否修改了业务规则 | **是**；按业务负责人选择把两项决定写为 `ACCEPTED`，未选方案写为 `REJECTED` |
| 是否修改了 Contract | **否**；Version/SHA/OpenAPI 均未修改 |
| 是否存在旧 API 引用 | **是**；沿用 5D-A/5D-B 的 6 个 Android / 24 个 Web migration bundle，本轮未迁移 |
| 是否存在 Mock、TODO、空接口 | 既有 validation-only Mock、Portal demo/localStorage/`BACKEND_REQUIRED` 等仍按 5D 记录存在；本轮未新增、未修改 |
| 下一阶段前置条件 | 独立创建并评审密码 Contract CR；接受后提升 Contract Version/SHA 并要求 Backend、Android、Student Web、Teacher Web、Admin Web 重新加载 |
