# CR-20260901-003：Certification Kind Round-trip

- 状态：`ACCEPTED`
- 来源编号：`CR-5DA-001`
- 初始记录：[Phase 5D-A Android Full Contract Surface Audit](../../docs/rebuild/handoffs/phase-5d-a-android-full-contract-surface-audit.md#cr-5da-001certification-kind-missing-from-request-and-response)
- 提交人：Phase 5C.2-B Android CR Independent Review
- Contract 当前版本：`1.1.0-contract` / `RC`
- Contract 当前 SHA-256：`1d538483f96b95d777cc4dd02526b78a214bd663e036ea5a6c77f43dfa38d99d`
- Contract 落地版本：`1.2.0-contract` / `RC` / `667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a`
- 业务权威与决定：[总业务流程](../../docs/business/00-overview.md) `P2-MVP-01`、`P3-LAUNCH-01`、`P4-DECISION-02`；[学生端业务流程](../../docs/business/10-student-flow.md) 第 9.4 节；[教师端业务流程](../../docs/business/20-teacher-flow.md) 第 10.2 节

## 1. 变更原因与 Use Case

已接受业务把校队认证和学生社团认证作为学生可分别选择、提交，且由责任教师核对并在后续申请详情中稳定识别的两类正式认证。两类认证共享证明材料、审核状态和认可学时规则，但不是同一个不可区分的业务值。

当前 `ApplicationType` 只能区分 `EXEMPTION / CERTIFICATION`。`CertificationDetails` 又只有 `organizationOrTeamName`、`validFrom`、`validTo`，因此：

1. `createStudentApplication` 无法提交 `SCHOOL_TEAM / STUDENT_CLUB`；
2. `StudentApplication` 及其列表、详情、补充和教师决定响应无法恢复原分类；
3. 名称不能可靠推断分类，使用名称、旧 DTO 或客户端私有字段回填都会丢失或改写业务含义；
4. 现有 schema 因 `additionalProperties: false` 会明确拒绝客户端自行发送 `certificationKind`。

缺口来自当前公共 Contract 自身，不依赖旧 Android 字段形状。Android 当前 UI 的两个选择和提交/回显需求只用于证明真实消费面；旧 runtime 的 `ApplicationSubtype` 仍属于 Legacy Migration Evidence，不是字段命名或协议结构的权威。

## 2. 接受的协议修改

1. 新增复用 schema：

   ```yaml
   CertificationKind:
     type: string
     enum:
       - SCHOOL_TEAM
       - STUDENT_CLUB
   ```

2. 在 `CertificationDetails` 新增：

   ```yaml
   certificationKind:
     $ref: '#/components/schemas/CertificationKind'
   ```

3. `certificationKind` 必须是 `required / non-null`。不得使用 optional、nullable、自由字符串、名称推断或 unknown fallback。
4. `CertificationDetails` 继续由创建请求和持久化响应共用，保证同一闭集值 request → persistence → response 无损 round-trip。
5. 不给 `ApplicationType` 增加 `SCHOOL_TEAM / STUDENT_CLUB`；该 enum 继续只区分申请大类，认证子类属于 `CertificationDetails`。
6. 不增加按认证子类筛选的 query parameter；现有业务没有要求服务端列表筛选必须按该子类进行。

## 3. API 影响

| 项目 | 变更 |
|---|---|
| Method / Path | 不新增或删除 path；创建入口仍为 `POST /api/v1/student/applications`，其余为既有申请读写 operation |
| operationId | Request：`createStudentApplication`；Response：`createStudentApplication`, `supplementStudentApplication`, `listOwnApplications`, `getOwnApplication`, `listCourseApplications`, `getCourseApplication`, `decideStudentApplication` |
| 角色 / 权限 / scope | 保持现有 Student self/active-enrollment 与 responsible-teacher scope；无管理员能力 |
| RequestDTO | `CreateCertificationApplicationRequest.certification` 经共享 schema 新增 required/non-null `certificationKind` |
| ResponseDTO | `StudentApplication.certification` 在非 null 时必须带同一 required/non-null `certificationKind`；page 和 mutation response 传递该语义 |
| Error code / HTTP status | 不变；不新增 error code，不改变 200/201 或现有错误 status |
| 分页 / 时间 / null | 分页和日期语义不变；`StudentApplication.certification` 对 EXEMPTION 仍可为 null，CertificationDetails 内的 kind 不可为 null |
| 上传 | 不变；JPEG/PNG/WebP、总计最多 3 张、单张 10 MB 规则不变 |
| 幂等 / 并发 | 不变；kind 属于规范化创建命令和幂等重放结果的一部分 |
| 认证 / 安全 | 不变；不引入秘密、内部 ID 或额外身份数据 |
| 新 operation | 无 |

## 4. 兼容性与下游

- 破坏性：**是**。现有认证创建 request 没有该 required 字段；旧客户端请求会失效。响应新增 required 字段也要求严格 codegen、fixture 和 mapper 重新加载新版本。不得静默覆盖 `1.1.0-contract`。
- Android：重新生成锁定 Contract binding；把校队/社团选择映射到新 enum；重验创建、列表、详情、补充材料、Profile 回显和未知 enum fail-closed。不得继续依赖旧 `ApplicationSubtype`。
- 学生 Web：如提供认证申请或申请详情，使用同一 enum；不得按组织名称猜测。
- 教师 Web：申请列表、详情、决定和认可学时页面稳定显示原分类；不改变审核/学时规则。
- Backend / Contract Adapter：创建时验证并映射 closed enum；所有申请 projection 原样回传，不从名称或证据推断。
- Domain：当前 Phase 3 只建模 `EXEMPTION/CERTIFICATION` 与通用 certification detail，未显式建模认证 kind。Backend 初始化前必须给 certification value object / application detail 增加闭集分类。
- 数据库：当前 `certification_application_detail` 只设计名称和有效期，**尚不能持久化该分类**。后续独立 Domain/Database alignment 必须增加等价的非空 enum/check 列并纳入创建事务、查询和约束测试；本 CR 不修改数据库设计。
- 既有数据：当前仓库只有设计，没有已验收 Backend/数据库 runtime 数据。如果后续发现已有认证行，不能从名称自动回填；必须先停止迁移并取得明确、可审计的数据迁移方案。

## 5. 迁移、回滚与验证

1. Final Contract Consolidation 从确定性 Contract source 增加 `CertificationKind` 和 required field，提升 Version/SHA，并重新生成 OpenAPI/catalog/metadata。
2. 重跑 verify、OpenAPI lint、RC readiness、引用完整性和 Draft 2020-12 实例验证：两个合法值通过，缺字段、null、未知值和额外字段拒绝。
3. 在 Backend 实现前完成 Domain/Database design alignment；数据库约束和 mapper 必须证明 round-trip，不得以 text/name 推断。
4. Backend → Android/学生 Web/教师 Web 按同一新 Version/SHA 顺序加载；不保留旧/新 request fallback。
5. 回滚必须整体回到旧 Contract/Backend/客户端组合；不能只回滚一端或保留客户端私有 kind。

## 6. 审批记录

- 2026-09-01：Phase 5D-A 以 `CR-5DA-001` 嵌入式提案记录缺口，未建立独立 CR 文件。
- 2026-09-01：Phase 5C.2-B 独立评审确认 Phase 2/角色业务、Android 真实消费面、当前 Schema 和 round-trip 信息损失；结论 `ACCEPTED`。
- 2026-09-01：Phase 5C.2 Final Contract Consolidation 已新增闭集 `CertificationKind` 与 required/non-null `CertificationDetails.certificationKind`；两类 request/response/round-trip 合法 fixture 与五类非法 fixture 专项断言均通过，落地版本与 SHA 见本文件头部。
- Domain/Database alignment 与下游重载仍未实施；本次落地不代表 Backend、数据库或客户端已验收。
