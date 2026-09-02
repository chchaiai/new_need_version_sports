# CR-20260831-004：统一邀请码预览终止状态与错误通道

- 状态：`ACCEPTED`
- 提交人：Phase 5A Android Contract CR 全量续审
- Contract 当前版本：`1.0.0-contract` / `RC` / `ff15441b84f0729626a49c6898ea4896e80321b8e873a933768a509fd4c8478f`
- Contract 落地版本：`1.1.0-contract` / `RC` / `1d538483f96b95d777cc4dd02526b78a214bd663e036ea5a6c77f43dfa38d99d`
- 业务权威与决定编号：[学生端业务流程](../../docs/business/10-student-flow.md) 第 5.2、6.1 节；[总业务流程](../../docs/business/00-overview.md) 第 9 节
- Android 审计分类：`LOCAL`

## 变更原因与 Use Case

学生扫码或手工输入邀请码后，需要在不建立 Enrollment 的前提下看到课程、责任教师、学期和邀请状态，并在失效、撤销、课程关闭或非当前学期时得到确定的不可加入页面。Android 与 Web 必须对同一个邀请码状态采用同一结果通道。

当前 `previewCourseInvitation` 同时声明：

- `200 CourseInvitationPreview`，DTO 的 `status` 闭集包含 `ACTIVE / EXPIRED / REVOKED / COURSE_CLOSED / NOT_CURRENT`；
- operation description 说明返回安全预览和状态；
- `422 ErrorEnvelope(code=INVITATION_INVALID)`；error catalog 又把 `INVITATION_INVALID` 定义为 invitation “expired, revoked, closed, or outside the current semester”。

因此 `EXPIRED / REVOKED / COURSE_CLOSED / NOT_CURRENT` 四种情况既可以是 `200` DTO 内容态，也可以是 `422` 错误态。`ACTIVE` 时 `course` 仍被 schema 允许为 null，也没有状态级 payload 不变量。严格 Mock 无法确定终止状态页面应消费 DTO 还是 ErrorEnvelope，客户端若同时兼容两套行为会形成 RC 外的私有兼容逻辑。

本 CR 不新增邀请状态、不改变直接入班或同学期唯一课程规则，只要求每个已有状态只占用一个公开通道。

## 旧边界门禁复核

- 对应的新 Contract operation 是否存在：是，`previewCourseInvitation`、`joinCourseByInvitation` 和 `registerStudentAndJoinCourse` 已存在；旧 join-capability 步骤不要求保留。
- 新 Contract 是否完整支持页面/Use Case：ACTIVE 预览及加入成功路径完整，但四种已知终止状态在 200 DTO 与 422 ErrorEnvelope 中重复建模，ACTIVE 的 course payload 不变量也未冻结。
- 分类理由：缺口来自当前 RC 对同一终止状态的双通道语义，不来自旧 preview DTO；因此终止预览为 `PROPOSED CR`，其余加入路径归 `LEGACY_MIGRATION`。

## API 影响

| 项目 | 变更 |
|---|---|
| Method / Path | `GET /api/v1/course-invitations/{invitationCode}` |
| operationId | 保持 `previewCourseInvitation` |
| 角色 / 管理员权限 / resource scope | 保持 `ANONYMOUS, STUDENT` / 无管理员权限 / `PRESENTED_INVITATION_CODE` / `NORMAL_REQUIRED` |
| RequestDTO | 无 body；path 中的邀请码规则不变 |
| ResponseDTO | 为 `CourseInvitationPreview.status` 建立状态级 payload 不变量。建议已识别 invitation 的五种状态统一返回 200；`ACTIVE` 必须带 non-null `course` 和有效 `expiresAt`，终止状态的 course/expiresAt 暴露边界由 Contract 明确 |
| Error code / HTTP status | 建议将 `INVITATION_INVALID` 保留给无法解析、未知或不允许安全投影的 code，并重写 catalog description；若 review 选择全部终止状态走 422，则应从成功 DTO 删除不可达状态。无论选择哪种方案，同一状态不得同时存在两种通道 |
| 分页 / 时间 / null | 无分页；明确 `course`、`expiresAt` 与 status 的 null 关系；instant 继续为 UTC `Z` |
| 上传 | 无影响 |
| 幂等 / 并发 | 只读 operation；重复预览返回当前权威状态，不建立 Enrollment |
| 认证 / 安全 | 继续只暴露安全的课程、教师、学期摘要；不得通过错误差异暴露其他成员或内部 invitation id/digest |

## 兼容性与下游

- 破坏性：ACTIVE 成功路径可保持非破坏；终止/未知邀请码路径属于行为性破坏，严格客户端必须重新加载。
- Android：扫码与手输共用同一状态映射；只实现 Contract 选定通道，不把 422 吞成 DTO，也不为 ACTIVE 合成课程。
- 学生 Web：与 Android 使用同一状态和错误映射；不得把旧 adapter 行为作为第二兼容通道。
- 教师/管理员 Web：教师创建/撤销邀请的 mutation 不变；可回归验证生成二维码后的学生预览。
- Backend / Contract Adapter：识别 invitation、读取当前状态并只序列化一个通道；终止状态不得同时抛 error 和返回 DTO。
- Domain 映射：仍使用已有 invitation/course/semester 状态，不新增审批或等待状态。
- 数据库查询/约束：现有 invitation digest、expiry、revocation、Course/current semester 关系静态可支持；无需 schema 变化。
- Mock / fixture：分别覆盖 ACTIVE、EXPIRED、REVOKED、COURSE_CLOSED、NOT_CURRENT、未知 code、维护和依赖错误；每个终止状态只匹配一个 response。
- Staging：`NOT EXECUTED`；新版本、Backend 与 Android/学生 Web 加载同一 SHA 后，才可用非生产邀请码逐状态验证唯一响应通道；本 `PROPOSED` CR 不授权进入 Staging。

## 迁移、回滚与验证

1. 独立 Contract review 确认终止状态与未知 code 的唯一通道；本 CR 为 `PROPOSED` 时不改 Contract 或客户端。
2. 接受后同步修改确定性 source、DTO/response/error catalog 描述、coverage 与验证断言。
3. 提升 Contract 版本并生成新 SHA；禁止原地覆盖 `1.0.0-contract`。
4. 增加 operation-level Contract test，逐状态断言唯一 HTTP status/schema/error code，并验证 ACTIVE 不允许 `course=null`。
5. Android 与学生 Web 加载同一版本，使用同一批扫码/手输内容、终止、未知和错误 fixtures；Backend conformance 后再做真实邀请 E2E。
6. 回滚必须整体恢复旧 Contract/Backend/客户端组合，不保留双通道兼容分支。

## 审批记录

- 2026-08-31：Phase 5A Android CR 续审发现 DTO 状态闭集与 `INVITATION_INVALID` catalog 对四种终止状态重复建模，提交为 `PROPOSED`。
- 业务决定：不需要新增业务状态；只统一现有预览语义。
- Contract review：`ACCEPTED`（Phase 5C，2026-09-01）；已识别邀请码的五种状态统一返回 `200 CourseInvitationPreview` 且安全课程/到期时间非空，未知、畸形或不可安全投影的 code 才返回 `422 INVITATION_INVALID`。
- Android / 学生 Web / Backend 确认：`PENDING`。
