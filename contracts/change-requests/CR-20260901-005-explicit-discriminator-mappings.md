# CR-20260901-005：Explicit Discriminator Mappings

- 状态：`PROPOSED`
- 阻塞级别：`BLOCKING`（Phase 5 Final Gate / Phase 6.0 Backend Foundation）
- 来源：Phase 5 Final Gate 对 Phase 5G-B discriminator finding 的独立复核
- 提交人：Phase 5 Final Gate Review
- Contract 当前版本：`1.2.0-contract` / `RC`
- Contract 当前 SHA-256：`667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a`
- Contract 目标版本：`TBD`；接受后必须生成不同于当前基线的新 Version / SHA，禁止原地覆盖
- 业务权威与决定编号：不新增业务决定；保持既有 `applicationType`、`action`、`targetMode` wire closed-set 语义

## 1. 变更原因与 Use Case

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
