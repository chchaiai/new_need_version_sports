# CR-005 第二步：已实施DRAFT与可复现验证

> 本文为第二步固定候选的历史证据。第三步已继续修改工作区，当前身份见[第三步结果](../step03_workflow/result.json)。本文中“当前/停止”等措辞均指当时第二步；旧的固定SHA复跑须使用`T03/step02-baseline/contracts`，不能拿第三步字节冒充第二步输入。`run_checks.py`只读回归入口可对新候选复用，完整`prepare_candidate.py/reproduce.py`的第二步精确源断言不可直接套用。

2026-09-08；新版Phase5「新 API Contract / OpenAPI」第二步已完成本地实施与验证。用户兼任Contract Owner和Reviewer，已确认三处源修复、Android方案及后端Phase7.0验收安排；Codex执行和验证。当前停止，第三步未开始。用户的方案接受不等于其亲自运行测试，陈昊此前“待审查”保留为历史，不登记为通过。

## 当前身份与实际范围

- 基线提交：`974587c3778a53803a7959ea0f64677581e239f4`；工作分支：`codex/phase5-contract-v81`。本次修改尚未提交，基线提交不包含本次候选，不能冒充候选的发布提交。
- 旧输入：`1.2.0-contract / RC`，SHA-256：`667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a`。旧字节保留于固定Git提交及外部baseline快照。
- 当前工作候选：`1.2.1-contract.phase5-step02.1 / DRAFT`，SHA-256：`1df0e8a1b50b3b4c0cfa128064e8da714f949c761eec9aae9e9e64179d374b27`。
- 已接受并实际应用的源补丁SHA-256：`9574cec5e6bb5b3fb4e0279e71bf71e51777fb9d73419527a7a5ca1466fe0511`。
- 此前隔离实验`0.0.0-cr005-review.1 / DRAFT`的SHA为`7558d01afb7dbb1380a0ecafaa0a8632bba8b5dced018e77a6335e2e027bcc72`；其旧材料继续保存在外部T02及T02_completion中，不改写成当前运行证据。

本步DRAFT只用于审查和验证，尚未覆盖新版Phase5剩余需求，不能作为最终RC、正式客户端或Backend实现输入分发。最终RC及最终版本策略在第六～七步统一落实。

| 判别字段 | 固定wire值与原有分支 |
|---|---|
| applicationType | EXEMPTION → CreateExemptionApplicationRequest；CERTIFICATION → CreateCertificationApplicationRequest |
| change.action | ADD → AddEnduranceRuleIntervalChange；UPDATE → UpdateEnduranceRuleIntervalChange；DELETE → DeleteEnduranceRuleIntervalChange |
| targetMode | MAINTENANCE → EnterMaintenanceRequest；NORMAL → ReturnNormalRequest |

已从applications.py/services.py修改三处mapping；build_contract.py仅修改候选Version、DRAFT状态和accepted CR列表。完整语义比较只允许上述三处mapping、三个身份字段及CR-005治理列表项变化。既有wire值、字段、required/nullability、操作、业务规则均不变，规模仍109 paths / 121 operations / 193 schemas / 66 errors。

## 本轮实际结果

[机器可读结果](implementation-result.json)记录当前候选与后续门禁。外部资料包`07_phase5_execution/T02_implementation/verification-01/`保留全部命令、cwd、退出码、生成配置、输入和逐项结果。

| 检查 | 实际结果与边界 |
|---|---|
| 实际源与已接受patch一致 | PASS；不是运行时另加补丁掩盖工作区未修复 |
| 独立重建两次 | OpenAPI/catalog/metadata均与工作区字节一致，PASS |
| verify_contract.py | PASS；原断言全部保留，并接入mapping完整性检查 |
| 映射检查及故意破坏 | 三组七分支通过；39项变体全部检出 |
| JSON Schema | 新旧各59/59，同一七合法、52非法输入；仅证明这些样例及精确语义比较覆盖范围 |
| TypeScript | 实际候选生成类型，七合法、28非法类型断言、七次JSON往返通过 |
| JavaScript / Ajv2020 | 59/59、七次往返通过；Node探针，不是浏览器产品集成 |
| Kotlin / JVM | 196模型编译通过；三组请求59/59、七次往返；不是196模型全部行为的测试 |
| Redocly2.51.2 | exit 0；原配置、规则保持，REDOCLY_TELEMETRY=off |
| RC readiness | exit 1，明确因DRAFT阻止发布；EXPECTED_BLOCKED，不是PASS，未放宽规则 |

本次复现入口16个外部命令中15个exit 0，readiness为预期exit 1；另有两次独立候选构建exit 0。消费者直接读取工作区的openapi.yaml，已先证明其与两次独立构建一致，全部结果绑定当前完整SHA。

早期真实失败保留：原Kotlin模板七分支联合赋值失败；旧新196模型逐字相同；全量wrapper产生26项编译错误；限定wrapper后初次42/49，未知字段漏拦。没有删除或反写历史失败。

## Android方案及后端责任

采用固定OpenAPI Generator7.24.0：196个原jvm-okhttp4模型中，14个相关模型使用jvm-retrofit2 wrapper输出替换，其余182个保持原模板。相关依赖模型也在固定清单中。所有模型由脚本生成，没有手改DTO，没有更改正式客户端网络库或绑定。model-manifest.json记录逐文件来源与SHA。

ClosedFieldGuardFactory读取同一协议的字段集合与discriminator映射，在生成Gson adapter前拒绝未知字段和非法分支。它不是完整JSON Schema验证器；正式应用的格式、数值约束及其他模型行为仍需在对应阶段测试。Phase6验证轨必须复核受影响客户端类型、Mapper/序列化/Mock和构建；正式网络链路迁移仍在Phase8。

后端待办固定为`BE-CR005-COMPAT / NOT_RUN / SCHEDULED_PHASE_7_0`。Phase7.0确定真实技术栈后，Backend Owner与Reviewer用其实际生成/映射方案验证冻结协议，至少覆盖三组七合法、非法/未知类型拒绝、必要的往返与内部命令映射。未通过不得关闭7.0或进入7.1及后续业务切片。人员在Phase7入场落实，由用户总负责人跟踪。

该项按用户确认及新版Phase6/7任务书安排，不单独阻断Phase5/6，也不记后端通过。工具问题在后端整改；协议缺陷返回Phase5走CR、升版和受影响端重验。真实协议缺陷仍阻塞适用阶段。[CR第7节](../../change-requests/CR-20260901-005-explicit-discriminator-mappings.md#7-2026-09-08-接受与新版路线对齐)保留原要求与新阶段的对应。

## 复现方法

使用Python3.12.14、PyYAML6.0.3、jsonschema4.26.0、referencing0.37.0；Node24.14.1、Java21.0.10、OpenAPI Generator7.24.0。依赖装在仓库外，输出目录必须位于仓库外且尚不存在。

```powershell
& $python -B -X utf8 "$repo/contracts/validation/step02_discriminators/reproduce.py" --repo $repo --baseline-contracts $oldContracts --tools $toolchain --output $freshOutput
```

原机器的`$oldContracts`为`start4/07_phase5_execution/T02_implementation/baseline/contracts`；`$toolchain`为`start4/07_phase5_execution/T02_completion/toolchain.local.json`。交付包分别提供旧baseline、当前workspace、工具示例配置、固定依赖清单与完整日志，移动到新机器后修改本机路径，不照抄历史命令中的绝对路径。

prepare_candidate.py只复制实际生成源和build脚本后重建；不添加mapping，不替换版本。它验证旧基线SHA、当前候选SHA、已接受源patchSHA、其他源未变、build变更精确、完整语义差异、两次构建与工作区三产物一致；任一不符即停止。后续Phase5源变化后，不能拿本步固定候选的通过结果冒充新候选，必须更新对应任务及其验证证据。

Node核心工具固定@redocly/cli2.51.2、openapi-typescript7.13.0、TypeScript5.9.3；其锁文件在交付包tooling/core。Ajv8.17.1、ajv-formats3.0.1使用本目录[package.json](package.json)与[lock](package-lock.json)，复制两文件到外部工具目录后运行npm ci --ignore-scripts --no-audit --no-fund。JVM依赖坐标及SHA见交付包tooling/jvm-artifacts.json；入口先核对工具字节与包版本，再执行测试。

check_discriminators.py既被verify_contract.py调用，也用于39个变体测试。该完整性门禁专门覆盖当前三组；未来新增联合类型需要扩展清单和测试。fixtures.json及run_checks.py构成共享案例，runtime_web.cjs与Kotlin/Java探针使用同一runtime-input.json。

当前没有产品Mock/TODO/空接口新增，未执行真实Backend、数据库、上传/时钟/恢复、正式客户端接入或E2E；这些由对应阶段验收。未commit/push/merge/部署。当前第二步本地工作已完成，第三步等待用户确认。

参考：[OpenAPI discriminator](https://spec.openapis.org/oas/v3.1.0.html#discriminator-object)、[Kotlin generator](https://openapi-generator.tech/docs/generators/kotlin/)、[Ajv JSON Schema](https://ajv.js.org/json-schema.html)。工具文档不代替本轮固定版本的实际结果。
