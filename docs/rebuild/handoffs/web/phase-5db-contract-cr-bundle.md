# Phase 5D-B Web Contract CR Bundle

> 固定 Contract：`1.1.0-contract`
> SHA-256：`1d538483f96b95d777cc4dd02526b78a214bd663e036ea5a6c77f43dfa38d99d`
> 本 Bundle 只记录本次 Full Contract Surface Audit 的新增结论；Phase 5B 的 12 份历史 CR 已进入 1.1，不重复计数。

## 结论

**新增 `CONTRACT_CR`：0。**

固定 Contract 的 121 个 operation 已覆盖所有当前可确认的 Web Contract-facing Use Case。旧 Endpoint、旧 DTO、旧 Client、旧页面状态和客户端私有约束均先按现行业务权威与 1.1 Contract 复核，没有因为“当前 Web 不会调用”就反向要求 Contract 兼容。

## 已审查但不建立 CR 的差异

| 候选差异 | 固定 Contract 现状 | 最终分类 | 不建立 CR 的原因 |
|---|---|---|---|
| Student 小于 60 分钟时调用 cancel、清零并允许当日重开 | `completeExerciseSession` + `submitExerciseRecord` 可表达“完成后 0 分钟 Record”；Contract 没有 cancel | `CLIENT_DEFECT` + `LEGACY_MIGRATION` | 新 Contract 正确；修复对象是客户端流程 |
| Student 先建立 Record Draft 再 submit | `submitExerciseRecord` 是原子提交，默认 VALID | `LEGACY_MIGRATION` | 不恢复 Draft/submit 双阶段 |
| 入班待教师审核、拒绝、补正、重提 | `previewCourseInvitation` + `joinCourseByInvitation` / `registerStudentAndJoinCourse` 已表达直接入班 | `UI_PRODUCT_FINDING` + `LEGACY_MIGRATION` | 当前权威没有入班审批 |
| Student 自助输入耐力跑用时并预估成绩 | `getOwnEnduranceOutcome` 只读权威结果；教师使用 `confirmEnduranceMeasurement` | `UI_PRODUCT_FINDING` + `LEGACY_MIGRATION` | 自助预估不是当前产品 Use Case |
| Student Grades 依赖 `absent`、免测评分、旧综合 score DTO | `EnduranceOutcome` 使用 `UNRECORDED / MEASURED / EXEMPT`，免测不产生分数；最终成绩独立 | `UI_PRODUCT_FINDING` + `LEGACY_MIGRATION` | 旧 ViewModel 不能反推新 enum/字段 |
| Teacher 重新计算旧综合分并批量发布 | `publishFinalGrade` 直接填写 signed int32 + 50 字备注，并保留历史 | `LEGACY_MIGRATION` + `UI_PRODUCT_FINDING` | 不恢复旧 score-recalculate 模型 |
| 删除教师账号前必须交接/无课程 | `deleteTeacherAccount` 明确不转移、不改写责任教师 | `CLIENT_DEFECT` | Contract 与已确认 P4-DECISION-05 一致 |
| Teacher/Admin 通知中心和 Teacher Dashboard 当前缺页 | `getTeacherDashboard` 与 3 个通知 operation 已存在 | `UI_PRODUCT_FINDING` | 页面缺失不等于 Contract 缺失 |
| Teacher Dashboard “需要关注的打卡记录” | 业务未定义判定集合；`TeacherDashboard` 没有该字段 | `NEEDS_BUSINESS_DECISION` | 必须先补业务决定，不能猜测字段或查询 |
| Portal 找回密码私自要求至少 12 位 | `resetPassword` / `changeOwnPassword` 只保证非空；业务只明确教师初始密码与分管理员初始密码规则 | `NEEDS_BUSINESS_DECISION` | 个人密码统一强度未确认；不能由 UI 或 Contract 自行决定 |
| Account deletion 文案声称撤销 push-device links | 当前闭集只有站内通知，不包含外部 Push/device token | `UI_PRODUCT_FINDING` | 属于产品文案，不新增 Contract 字段 |

## CR 门禁

只有在以下任一条件满足后才可新建 CR：

1. NBD-01 的“需关注 Record”口径已经写入四份业务权威之一，且现有 Record query / Dashboard projection 确实无法表达；
2. NBD-02 的个人密码强度、错误语义和适用角色已经被业务/安全权威确认，且固定 request/error catalog 无法表达；
3. 后续 strict consumer test 使用**固定 1.1 wire schema**复现真实 request/response/status/error/权限缺口，而不是仅复现旧客户端不兼容。

在此之前不得修改 OpenAPI、Version、SHA，也不得建立兼容旧 DTO 的私有字段或 fallback。
