# CR-20260831-003：为学生 Dashboard 提供稳定的本人资料投影

- 状态：`ACCEPTED`
- 提交人：Phase 5A Android Contract CR 全量续审
- Contract 当前版本：`1.0.0-contract` / `RC` / `ff15441b84f0729626a49c6898ea4896e80321b8e873a933768a509fd4c8478f`
- Contract 落地版本：`1.1.0-contract` / `RC` / `1d538483f96b95d777cc4dd02526b78a214bd663e036ea5a6c77f43dfa38d99d`
- 业务权威与决定编号：[学生端业务流程](../../docs/business/10-student-flow.md) 第 5、6 节；[总业务流程](../../docs/business/00-overview.md) 第 9 节
- Android 审计分类：`BLOCKING`

## 变更原因与 Use Case

Android 的已认证根工作区、本人页、账号详情页和课程邀请确认页需要显示或预填 Backend 权威的姓名、学号、性别、年级、学院/专业/行政班和学生状态。上述字段已经存在于 Contract 的 `StudentSummary`，不是 Android 私有字段；学生注册请求和管理员只读学生资料也使用同一组业务事实。

当前稳定的已认证入口无法保证取得该投影：

- `SessionTokenPair.actor` 与 `getCurrentActor → CurrentActor` 只有通用账号字段；没有 `studentNumber / gender / gradeYear / college / major / administrativeClass / studentStatus`；
- `StudentDashboard` 声称组合当前正式账号、课程和进度，但只直接提供 `actor` 与单独的 `studentStatus`；
- `StudentSummary` 只通过可空的 `StudentDashboard.progress.student` 间接出现；当学生为合法 `PENDING` 状态时，`course` 与 `progress` 可以同时为 null，正是本人资料仍需显示、也可能再次加入课程的场景；
- 从 Record、申请或反馈列表中反向取第一条 `student` 不可靠：这些列表都允许为空，也会把无关业务查询变成本人资料依赖。

因此 Android 若要渲染 `PENDING` 学生本人资料，只能保留旧 workspace、依赖本地注册输入、使用空字符串，或为 Dashboard 增加私有字段，均违反本阶段边界。该缺口还会导致 Android 与学生 Web 对“本人资料来自哪里”产生不同理解。

本 CR 不增加新的学生资料字段，也不授权学生编辑资料；它只把已有 `StudentSummary` 放到一个对 ACTIVE 与 PENDING 都稳定可取的本人读取投影中。

## 旧边界门禁复核

- 对应的新 Contract operation 是否存在：是，`getStudentDashboard` 与 `getCurrentActor` 已存在；不要求恢复旧 workspace/profile DTO。
- 新 Contract 是否完整支持页面/Use Case：通用 actor/email/status 完整，但合法 PENDING 状态下没有稳定位置返回 Contract 已定义的完整本人 `StudentSummary`。
- 分类理由：姓名、学号、性别、年级、学院、专业和行政班是业务权威要求且已存在于新 Contract 的正式摘要，不是从旧 DTO 抄来的兼容字段；因此稳定读取投影缺口是 `PROPOSED CR`。学生资料编辑 mutation 不在本 CR 内，也不因旧空壳而新增。

## API 影响

| 项目 | 变更 |
|---|---|
| Method / Path | 建议最小变更为 `GET /api/v1/student/dashboard`；若 Contract review 选择独立本人资料 operation，必须给出等价的稳定读取边界 |
| operationId | 建议保持 `getStudentDashboard`；不要求新增 mutation |
| 角色 / 管理员权限 / resource scope | 保持 `STUDENT` / 无管理员权限 / `SELF` / `NORMAL_REQUIRED` |
| RequestDTO | 无变化 |
| ResponseDTO | 建议给 `StudentDashboard` 增加 required、non-null `student: StudentSummary`，ACTIVE 与 PENDING 均返回；既有 `studentStatus` 暂时保留时必须与 `student.studentStatus` 一致，`progress.student` 非 null 时也必须指向同一本人事实 |
| Error code / HTTP status | 无新增业务错误；保持现有 200 与统一认证/权限/维护/限流/依赖/内部错误 |
| 分页 / 时间 / null | 无分页；本人 `student` 不随 course/progress 空态变成 null；字段时间语义无变化 |
| 上传 | 无影响 |
| 幂等 / 并发 | 只读 operation；`generatedAt` 继续标记聚合投影时间，不新增客户端版本猜测 |
| 认证 / 安全 | 只返回当前学生本人已有的 `StudentSummary`；不暴露其他学生、凭据、内部 subject、历史登录标识或管理员字段 |

## 兼容性与下游

- 破坏性：建议方案是 response 字段新增，对宽松消费者可非破坏；但 RC 严格生成客户端必须重新加载新版本，不能静默覆盖当前 schema。
- Android：根工作区、本人页、账号详情和再次加入课程预填统一从 Contract 本人投影映射；不得从本地缓存或任意业务列表补造缺失资料。`admissionYear/currentAcademicYear` 等非 Contract 业务字段不得借本 CR 混入 DTO。
- 学生 Web：使用同一字段作为本人资料来源；不得继续从旧 adapter 的 profile 私有结构推导。
- 教师/管理员 Web：不消费学生 Dashboard；既有授权学生摘要 DTO 不变。
- Backend / Contract Adapter：从当前学生 Profile read model 组装现有 `StudentSummary`，ACTIVE/PENDING 均返回；不要把 Enrollment 是否 ACTIVE 当作本人资料是否存在的条件。
- Domain 映射：不新增 Domain 状态；`ACTIVE/PENDING` 仍只描述当前课程成员关系。
- 数据库查询/约束：Phase 3 的 account/profile、student status 与 Enrollment 关系静态可支持该投影；无需新业务表或 mutation。
- Mock / fixture：至少覆盖 ACTIVE+course/progress 与 PENDING+course null+progress null 两组；两组都必须有完整 `student`，且不含额外字段。
- Staging：`NOT EXECUTED`；新版本、Backend 与 Android/学生 Web 加载同一 SHA 后，才可使用非生产测试账号验证 ACTIVE/PENDING 本人范围和跨端字段一致性；本 `PROPOSED` CR 不授权进入 Staging。

## 迁移、回滚与验证

1. 独立 Contract review 确认最小读取形状；本 CR 为 `PROPOSED` 时不修改 OpenAPI、Android 或 Backend。
2. 接受后更新确定性 Contract source、Dashboard schema、coverage、验证断言与生成物。
3. 提升 Contract 版本并生成新 SHA；旧 `1.0.0-contract` 保持可识别。
4. 增加 Contract test，证明 PENDING fixture 在 `course=null / progress=null` 时仍提供完整本人 `StudentSummary`，并验证重复 status 投影一致。
5. Android 与学生 Web 加载同一版本后再做本人页和再次加入课程的内容/空/错误 Mock；Backend conformance 验证资料范围与 PENDING 查询。
6. 若回滚，整体回到旧 Contract/Backend/客户端组合；客户端不得保留本地兜底字段作为兼容层。

## 审批记录

- 2026-08-31：Phase 5A Android CR 续审确认 `StudentSummary` 已定义但没有对 ACTIVE/PENDING 都稳定的本人读取位置，提交为 `PROPOSED`。
- 业务决定：不新增业务字段、不开放资料编辑；只复用已有本人资料事实。
- Contract review：`ACCEPTED`（Phase 5C，2026-09-01）；`StudentDashboard.student` 为 required/non-null `StudentSummary`，ACTIVE/PENDING 均返回，并与重复状态/进度投影保持同一本人事实。
- Android / 学生 Web / Backend 确认：`PENDING`。
