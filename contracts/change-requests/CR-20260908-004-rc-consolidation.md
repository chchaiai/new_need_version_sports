# CR-20260908-004：最终候选统一与生成运行门禁

用户授权第六步；Owner/Reviewer仍为用户，Codex执行/自检。用户对版本策略明确回复“确认按此版本策略”：采用 `1.3.0-contract / RC`，沿用仓库版本递增方式，公开路径仍为 `/api/v1`，但**不兼容旧协议**。不把实施授权和版本决定冒充完成成果的最终Review。第七步接收、GitHub操作和发布仍未执行。

F06-01：第五步实际草稿/原图保留协议已更新，但build_contract.py的全局ROSTER_SOURCE说明仍写“解析后丢弃源文件”，且遗漏纸图与确认流程；旧allocateRosterImport描述也有相同残留。与已接受名单设计（H §14，GAP-H08）及当前业务正文冲突。本步从生成源同步既有保留/确认规则，引用CR-20260908-003，不增加保存期限或新业务决定；新增定向门禁防回退。

F06-02：第三步三组新增union的基础Kotlin模板生成interface，编译通过不代表可以Gson反序列化。第六步延伸已接受的Generator7.24.0 wrapper组合方案，并对真实生成模型运行分支、required/null/闭集/未知字段/往返检查；不手写替代DTO。新增JSON Schema JVM验证依赖仅放隔离验证目录，不直接选定正式Android或Backend技术栈。

F06-03：实际编译/往返暴露工具问题：数字枚举模板用字符串比较；Gson默认把数字/布尔枚举写成字符串；nullable scalar生成空对象，nullable object副本丢失嵌套null；wrapper跳过注册适配器，省略字段在写回时变成null。修复位于生成配置推导、两个有上游/本地SHA的模板、通用schema/标量枚举/字段存在性适配层。未编辑生成DTO，未把数字改为字符串，未把可省略字段改为必填，未放宽null、enum或unknown-field规则。nullable引用使用原具名生成模型；内联nullable标量的闭集、范围等仍由完整Schema边界检查，不能只靠Kotlin基本类型。

依赖和模板依据：[Kotlin generator](https://openapi-generator.tech/docs/generators/kotlin/)、[自定义配置与schemaMappings](https://openapi-generator.tech/docs/customization/)、[模板覆写](https://openapi-generator.tech/docs/templating/)、[Harrel JSON Schema](https://github.com/harrel56/json-schema)。实际选项、模板和哈希以固定7.24.0 JAR及[模板清单](../validation/step06_final/template-manifest.json)为准；没有把新依赖写入正式Android或Backend工程。

修改范围为源/脚本/协议、必要CR/coverage/README、contracts/validation/step06_final与既有STATUS/handoff；业务/架构输入、产品客户端/Backend/DB/部署、旧仓库只读。本步无新增业务决定、operation、schema或错误码；修正同一协议内的描述冲突，并明确版本兼容性。保留原源文件与历史候选快照。第2～5步请求/响应/语义变化继续由各自CR解释。

候选身份见[metadata](../contract-metadata.json)，最终同SHA验证见[结果](../validation/step06_final/result.json)，全部21项处置见[disposition](../validation/step06_final/disposition.json)。源提交仍为未提交工作区，基线 `974587c3778a53803a7959ea0f64677581e239f4`；不伪造候选source commit。发布前必须在第七步由用户Review、提交并核验实际提交和分发身份。用户可决定接收；Codex没有登记人类Review通过。

后续：Phase6把最终同SHA模型/序列化与Mock放入实际Android/Web验证轨，并完成6C；本步JVM探针不是Android应用。Backend在Phase7.0完成选型兼容、CertificationKind及Domain/Database设计对齐，未通过不得进入7.1；实际授权、校历、数据来源、并发、事务、OCR质量、通知/缓存/恢复与E2E仍由Phase7～9执行。不能把本CR的工具修复称作产品零Bug保证。

最终同SHA结果：`1.3.0-contract / RC / 5c87eeb9bca39585cea2e3c80c60d58813b4367e1a60b161ed8c7f82af4a19ed`；F06-01～03技术整改CLOSED_SELF_VERIFIED，开放技术Finding为0。Python/JS/JVM各992例通过，159合法实际模型往返，324 Kotlin编译、24非法TS断言、143结构破坏和723有限模型通过；完整生成/verify/lint/readiness成功。该结果是Codex实际自检，不是人工Review签字或Phase5 DONE。
