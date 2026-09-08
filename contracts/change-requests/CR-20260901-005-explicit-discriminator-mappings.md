# CR-20260901-005：Explicit Discriminator Mappings

- 状态：`IMPLEMENTED`（2026-09-08 已接受修复落实于本步DRAFT；Phase6及Phase7.0消费验收分别待执行）
- 当前路线：新版 Phase 5「新 API Contract / OpenAPI」；消费验证按第7节分阶段验收。原 Phase 5 Final Gate / Phase 6.0 Backend Foundation 为历史编号。
- 来源：Phase 5 Final Gate 对 Phase 5G-B discriminator finding 的独立复核
- 提交人：Phase 5 Final Gate Review
- Contract 当前版本：`1.2.0-contract` / `RC`
- Contract 当前 SHA-256：`667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a`
- 本步目标版本：`1.2.1-contract.phase5-step02.1 / DRAFT`；最终新RC在新版Phase5第六步统一确定。必须使用不同于旧RC的Version/SHA，禁止沿用旧身份覆盖。
- 业务权威与决定编号：不新增业务决定；保持既有 `applicationType`、`action`、`targetMode` wire closed-set 语义

## 1. 变更原因与 Use Case

下述原始缺陷、提案与2026-09-01审批记录保留为历史依据；其中“PROPOSED”“接受前”和旧阶段编号按第7节最新接受记录理解。

当前 OpenAPI 在三处 `oneOf` 上声明了 discriminator，但没有声明 explicit `mapping`：

| Schema / property | 当前 wire const | 当前隐式 schema 名 |
|---|---|---|
| `CreateStudentApplicationRequest.applicationType` | `EXEMPTION` / `CERTIFICATION` | `CreateExemptionApplicationRequest` / `CreateCertificationApplicationRequest` |
| `ReviseEnduranceRuleTableRequest.change.action` | `ADD` / `UPDATE` / `DELETE` | `AddEnduranceRuleIntervalChange` / `UpdateEnduranceRuleIntervalChange` / `DeleteEnduranceRuleIntervalChange` |
| `SwitchSystemModeRequest.targetMode` | `MAINTENANCE` / `NORMAL` | `EnterMaintenanceRequest` / `ReturnNormalRequest` |

OpenAPI 3.1 discriminator 的隐式映射键来自 schema 名；当 wire 值不是 schema 名时，需要 explicit mapping 才能稳定选择对应分支。当前三组 wire const 与隐式键均不一致。

该缺口已经产生可复现的下游差异：

1. `openapi-typescript 7.13.0` 把上述 branch discriminator 生成成 schema-name literal，例如 `CreateCertificationApplicationRequest.applicationType = "CreateCertificationApplicationRequest"`，而不是 wire `CERTIFICATION`；另外两组 union 同样生成 schema-name literal。
2. Phase 5G-B 的 `CreateCertificationApplicationWireRequest` 只在 Student affected validation adapter 内显式覆盖 `CERTIFICATION`，可以证明该测试链路的 wire JSON 正确，但不能修复根 Contract，也不覆盖另外两组 union 或未来 Backend/codegen。
3. 当前 Android generator 对部分 branch const 生成了可用模型，但运行时同时报告 OpenAPI 3.1 / `oneOf` 处理警告。不同生成器结果不一致，不能作为未来 Backend adapter 的稳定基线。
4. JSON Schema `oneOf + const` 实例验证仍可通过，因为 discriminator 不是 JSON Schema 断言；这不能证明 OpenAPI discriminator/codegen interoperability 正确。

因此，该 finding 不能继续证明为纯 `CLIENT_DEFECT / TOOLING_LIMITATION`。它不表示当前 Web wire fixture 已发生 silent data corruption，但会使 Contract 驱动的客户端或 Backend 生成物得到与 wire 不一致的类型，满足 Phase 5 Final Gate 的阻塞条件。

## 2. 建议的最小 Contract 修改

本 CR 只提议为现有 discriminator 增加 explicit mapping，不改变任何 wire 值、业务状态、operation 或 payload 字段：

```yaml
CreateStudentApplicationRequest:
  discriminator:
    propertyName: applicationType
    mapping:
      EXEMPTION: '#/components/schemas/CreateExemptionApplicationRequest'
      CERTIFICATION: '#/components/schemas/CreateCertificationApplicationRequest'

ReviseEnduranceRuleTableRequest:
  properties:
    change:
      discriminator:
        propertyName: action
        mapping:
          ADD: '#/components/schemas/AddEnduranceRuleIntervalChange'
          UPDATE: '#/components/schemas/UpdateEnduranceRuleIntervalChange'
          DELETE: '#/components/schemas/DeleteEnduranceRuleIntervalChange'

SwitchSystemModeRequest:
  discriminator:
    propertyName: targetMode
    mapping:
      MAINTENANCE: '#/components/schemas/EnterMaintenanceRequest'
      NORMAL: '#/components/schemas/ReturnNormalRequest'
```

以上仅是 `PROPOSED` 的最小修复候选。未经独立 Contract review 接受，不得修改 OpenAPI、metadata、Version 或 SHA。

## 3. API 影响

| 项目 | 变更 |
|---|---|
| Method / Path | 无新增、删除或路径变化 |
| operationId | 无变化；影响现有 student application create、endurance rule revision、system mode switch request typing |
| 角色 / 管理员权限 / resource scope | 无变化 |
| RequestDTO wire | 无字段、required/nullability 或合法值变化；只显式绑定既有 const 到既有 branch schema |
| ResponseDTO | 无变化 |
| Error code / HTTP status | 无变化 |
| 分页 / 时间 / null | 无变化 |
| 上传 | 无变化 |
| 幂等 / 并发 | 无变化 |
| 认证 / 安全 | 无变化 |
| OpenAPI metadata | 接受后增加 explicit discriminator mapping；Version/SHA 必须随独立 Contract consolidation 更新 |

## 4. 兼容性与下游

- Wire 兼容性：**非破坏性**；合法 JSON 仍使用 `EXEMPTION/CERTIFICATION`、`ADD/UPDATE/DELETE`、`MAINTENANCE/NORMAL`。
- Generated source 兼容性：**可能变化**；错误的 schema-name literal 应变为既有 wire literal，因此所有下游必须重新生成和重新编译。
- Android：重生成 binding，复验三组 union 的序列化/反序列化与非法值拒绝；不得因当前一组生成成功而跳过其余两组。
- 学生 Web：重生成 binding，确认认证创建不再需要用私有类型覆盖生成 discriminator；wire adapter 可继续承担边界校验，但不得与 generated type 冲突。
- 教师/管理员 Web：复验 endurance revision 与 system mode switch 的 wire literal 和 generated types。
- Backend / Contract Adapter：使用固定新 Version/SHA 生成或手写 adapter；三组 discriminator 必须按 wire 值穷尽映射并 fail closed。
- Domain / 数据库：无新业务值、表、列、约束或 mapper 设计；现有 closed set 不变。
- Mock / fixture：补充三组 request 的 generated-type + JSON wire round-trip fixture，不得以手写私有字段掩盖 generated type 错误。

## 5. 迁移、回滚与验证

1. 独立 Contract review 先确认本 CR；在接受前保持 `1.2.0-contract` 与当前 SHA 原样冻结。
2. 接受后由独立 Contract consolidation 增加三组 mapping，提升 Version，确定性重生成 OpenAPI/catalog/metadata，并生成新 SHA。
3. 新增 discriminator integrity gate：每个 branch 的 wire const 必须精确命中 explicit mapping key，mapping target 必须是同一 `oneOf` branch，禁止漏项、多项、schema-name fallback。
4. 重跑 OpenAPI parse、Contract verify、RC readiness、Redocly lint、operationId/ref/schema/error exact-set、strict UTF-8/JSON、deterministic generation 和 `git diff --check`。
5. 至少用 Android generator、`openapi-typescript` 和 Backend 计划采用的生成/映射方案分别验证三组 union；序列化必须输出既有 wire const，反序列化必须选择正确 branch，未知值必须拒绝。
6. 回滚必须整体回到旧 Contract/version/bindings；不得只移除客户端 adapter 或只更新生成物。

## 6. 审批记录

- 2026-09-01：Phase 5G-B 将 application discriminator 生成结果记录为 `CLIENT_DEFECT-5GB-02`，由 Student wire adapter 隔离，并要求后续解决或确认。
- 2026-09-01：Phase 5 Final Gate 独立扫描当前 OpenAPI 的全部 discriminator，确认相同模式共有三组；现场 `openapi-typescript --check` 与 affected tests 通过，但 generated declarations 仍使用 schema-name literal。
- 2026-09-01：Phase 5 Final Gate 结论为 `PROPOSED / BLOCKING`。本记录不等于接受或实施，OpenAPI、metadata、Version、SHA 和客户端/Backend 均未修改。

## 7. 2026-09-08 接受与新版路线对齐

### 7.1 真实决定来源及分工

本轮用户在当前项目对话中依次确认：第一项按建议从源修复并核对七个对应关系、无额外变更及实际生成结果；第二项采用所述Android包装模型与校验方案；后端按新版Phase7.0验证，不单独阻断Phase5/6。随后对齐用户兼任Contract Owner与Reviewer、Codex执行/验证/整改，并明确“好的，开始继续完成第二步”。本段归档用户的实际接受与执行授权，不表示用户亲自运行了测试，也不代签其他人的审查。

- Contract Owner / Reviewer：用户本人；执行与验证：Codex。
- 陈昊此前“待审查”为历史状态，没有将其写成审查通过。
- 接受对象为三处最小源补丁，SHA-256：`9574cec5e6bb5b3fb4e0279e71bf71e51777fb9d73419527a7a5ca1466fe0511`。
- 原审查实验为 `0.0.0-cr005-review.1 / DRAFT`，SHA-256：`7558d01afb7dbb1380a0ecafaa0a8632bba8b5dced018e77a6335e2e027bcc72`。该实验身份保留，不改写历史证据。
- 本轮在工作分支实施为独立DRAFT版本；只有三处mapping及版本、状态、接受CR列表等治理元数据变化。不修改业务字段、值、接口、权限或规则。

### 7.2 验收分工与仍须执行的门禁

| 验收项 | 执行阶段 / 责任 | 必须留下的证据与门禁 |
|---|---|---|
| 三处协议修复 | Phase5第二步；Codex执行、用户接收 | 实际源补丁一致；七种映射、分支const/required/null/引用一致；新DRAFT确定性生成；结构、类型及正反例验证 |
| 最终RC | Phase5第六～七步；Contract Owner / Reviewer | 完整Phase5范围、新Version/SHA、verify/lint/readiness及最终Review；本步DRAFT不代替最终RC |
| Android/Web验证轨 | Phase6A/6B/6C；各端Owner与Reviewer入场落实 | 固定同一最终Version/SHA，生成、序列化、未知值拒绝、Mapper/Mock及受影响构建；阻塞协议CR关闭后才通过6C |
| BE-CR005-COMPAT | Phase7.0；Backend Owner执行、对应Reviewer复核，具体人员在入场落实；用户作为总负责人跟踪 | 选定真实技术栈后，先用其生成/映射方案验证冻结协议；七合法分支和非法输入拒绝、往返及内部命令映射有证据。未通过不得关闭7.0或进入7.1及后续业务切片 |
| 正式客户端网络迁移 | Phase8；对应客户端Owner | 按已可用后端切片迁移正式绑定并验证真实调用；不能用Phase5探针或Phase6 Mock代替 |

BE-CR005-COMPAT当前为 `NOT_RUN / SCHEDULED_PHASE_7_0`。保留其测试要求和追溯关系，不能记PASS或隐去；不为通过该项临时选择后端技术栈。依据为新版Phase6任务书“Backend技术栈确定后，再对所选生成/消费工具验证冻结协议兼容性”及Phase7的7.0“先验证所选工具兼容冻结Contract”。本节按用户确认的新版路线落实原第5.5条，保留其他验证要求，不把旧编号直接套用到新版阶段。

如后端兼容失败：工具/适配器问题在对应后端任务整改；确为Contract缺陷则返回Phase5走CR、升版、重新分发并让受影响端重验。真实协议缺陷继续阻塞其适用阶段，不能借后端延期绕过。

### 7.3 Android方案边界

接受使用固定7.24.0生成器、14个相关wrapper模型及其余182个原模板模型，并由同协议驱动闭集字段/判别值guard的方案进行本阶段验证。生成文件不手改，源、模板、组合清单和工具版本可追溯。guard不等于完整JSON Schema验证器；正式客户端集成和更广的输入约束仍须Phase6/8按各自范围验证。

旧失败记录保留；本轮结果必须来自实际已修改候选。当前[第二步验证入口](../validation/step02_discriminators/README.md)与[Phase5交接](../../docs/rebuild/handoffs/new-req-phase-5.md)负责记录实施身份和后续结果。`IMPLEMENTED`只表示本步协议修复已落实，不表示整个Phase5、客户端或后端验收完成。

### 7.4 本步实施结果

- 当前候选：`1.2.1-contract.phase5-step02.1 / DRAFT`；OpenAPI SHA-256：`1df0e8a1b50b3b4c0cfa128064e8da714f949c761eec9aae9e9e64179d374b27`。
- 实际源patch与被接受的SHA一致，其他业务源不变；两次独立构建与工作区OpenAPI/catalog/metadata三产物字节相同。治理元数据新增本CR，版本与状态已区分旧RC。
- 结构verify及lint通过；JSON Schema新旧各59/59，39项映射破坏检查全部检出；TypeScript七合法/28非法类型断言及七次往返通过；Kotlin196模型编译通过，JavaScript和Kotlin/JVM各59/59、七次往返通过。
- RC readiness实际退出1，唯一原因是当前DRAFT不可发布；本步不将其记为PASS，不放宽门禁。第六步新RC须重验。
- 工作基线仍是`974587c3778a53803a7959ea0f64677581e239f4`，当前候选尚未commit/push，不冒充已发布版本。完整结果见[本步机器记录](../validation/step02_discriminators/implementation-result.json)。
- 新版Phase5第二步本地范围完成；Phase5整体仍IN_PROGRESS，Phase6/7后续验收和最终阶段接收没有提前发生。
